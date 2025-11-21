// database/db.js
// ===============================
// 🗄️ CONFIGURACIÓN DE LA BASE DE DATOS (better-sqlite3)
// ===============================
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const dbPath = process.env.DB_PATH || path.resolve(__dirname, "fidelidad.db");

// -------------------------------
// Detectar entorno (Railway friendly)
// -------------------------------
const railwayEnv = (process.env.RAILWAY_ENVIRONMENT_NAME || "").toLowerCase();
const isDevOrSandbox =
  !process.env.NODE_ENV ||
  process.env.NODE_ENV === "development" ||
  railwayEnv === "sandbox" ||
  railwayEnv === "preview" ||
  process.env.RAILWAY_PROJECT_NAME?.toLowerCase()?.includes("dev");

if (isDevOrSandbox) {
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log("🧹 (sandbox/dev) Archivo de base de datos eliminado antes de abrir conexión.");
    } else {
      console.log("📂 (sandbox/dev) No existía base previa, se creará una nueva.");
    }
  } catch (err) {
    console.warn("⚠️ (sandbox/dev) No se pudo eliminar el archivo DB antes de abrir:", err.message);
  }
} else {
  console.log("🏭 Producción detectada — no se eliminará el archivo DB.");
}

// ===============================
// Abrir conexión
// ===============================
let db;
try {
  db = new Database(dbPath);
  console.log(`✅ Base de datos conectada en: ${dbPath}`);
} catch (err) {
  console.error("❌ Error al conectar la base de datos:", err.message);
  process.exit(1);
}

// ===============================
// CREACIÓN / ACTUALIZACIÓN DE TABLAS
// ===============================
const createTables = () => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'cliente'
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      puntos INTEGER DEFAULT 0,
      nivel TEXT DEFAULT 'Bronce',
      email TEXT,
      square_id TEXT UNIQUE
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS transacciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      fecha TEXT,
      puntos INTEGER,
      motivo TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS eventos (
      id TEXT PRIMARY KEY,
      tipo TEXT,
      fecha TEXT
    )
  `).run();

  // 🔥 TABLA NUEVA — evita duplicados por order_id
  db.prepare(`
    CREATE TABLE IF NOT EXISTS ordenes (
      id TEXT PRIMARY KEY,
      fecha TEXT
    )
  `).run();

  console.log("📦 Tablas verificadas o creadas correctamente.");
};

// ===============================
// Agregar columnas faltantes
// ===============================
const ensureColumnExists = (tableName, columnName, columnType) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some(col => col.name === columnName);

  if (!exists) {
    try {
      db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`).run();
      console.log(`🆕 Columna '${columnName}' agregada a '${tableName}'.`);
    } catch (err) {
      console.error(`❌ Error agregando columna '${columnName}' a '${tableName}':`, err.message);
    }
  }
};

// ===============================
// Inicialización
// ===============================
createTables();

ensureColumnExists("clientes", "email", "TEXT");
ensureColumnExists("clientes", "square_id", "TEXT UNIQUE");

try {
  const cnt = db.prepare("SELECT COUNT(*) AS cnt FROM clientes").get()?.cnt || 0;
  console.log(`🔎 Clientes en tabla: ${cnt}`);
} catch {}

console.log("✅ Base de datos lista.");


// ======================================================
// 🚀 FUNCIONES ANTI-DUPLICADOS PARA EL WEBHOOK
// ======================================================

// Verifica si un order_id ya fue procesado
function ordenYaProcesada(orderId) {
  const row = db.prepare("SELECT id FROM ordenes WHERE id = ?").get(orderId);
  return !!row; // true si existe
}

// Marca una orden como procesada
function registrarOrdenProcesada(orderId) {
  db.prepare(`
    INSERT INTO ordenes (id, fecha)
    VALUES (?, datetime('now'))
  `).run(orderId);
}


// ======================================================
// EXPORTS
// ======================================================
module.exports = {
  db,
  ordenYaProcesada,
  registrarOrdenProcesada
};
