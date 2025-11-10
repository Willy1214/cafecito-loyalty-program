// ===============================
// 🗄️ CONFIGURACIÓN DE LA BASE DE DATOS (better-sqlite3)
// ===============================
const Database = require("better-sqlite3");
const path = require("path");

const dbPath = process.env.DB_PATH || path.resolve(__dirname, "fidelidad.db");

let db;
try {
  db = new Database(dbPath);
  console.log(`✅ Base de datos conectada en: ${dbPath}`);
} catch (err) {
  console.error("❌ Error al conectar la base de datos:", err.message);
  process.exit(1);
}

// ===============================
// 🧱 CREACIÓN / ACTUALIZACIÓN DE TABLAS
// ===============================
const createTables = () => {
  // 🧩 Usuarios
  db.prepare(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'cliente'
    )
  `).run();

  // 🧩 Clientes
  db.prepare(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      puntos INTEGER DEFAULT 0,
      nivel TEXT DEFAULT 'Bronce'
    )
  `).run();

  // 🧩 Transacciones
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

  // 🧩 Eventos (para evitar procesar duplicados)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS eventos (
      id TEXT PRIMARY KEY,
      tipo TEXT,
      fecha TEXT
    )
  `).run();

  console.log("📦 Tablas verificadas o creadas correctamente.");
};

// ===============================
// 🩺 VERIFICAR Y AGREGAR COLUMNAS FALTANTES
// ===============================
const ensureColumnExists = (tableName, columnName, columnType) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some((col) => col.name === columnName);

  if (!exists) {
    try {
      db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`).run();
      console.log(`🆕 Columna '${columnName}' agregada a la tabla '${tableName}'.`);
    } catch (err) {
      console.error(`❌ Error al agregar columna '${columnName}' a '${tableName}':`, err.message);
    }
  } else {
    console.log(`⚙️ Columna '${columnName}' ya existe en '${tableName}'.`);
  }
};

// ===============================
// 🧼 LIMPIEZA Y RESET EN ENTORNOS DE DESARROLLO
// ===============================
const resetIfSandbox = () => {
  const isDevOrRailway =
    !process.env.NODE_ENV ||
    process.env.NODE_ENV === "development" ||
    process.env.RAILWAY_ENVIRONMENT === "sandbox" ||
    process.env.RAILWAY_PROJECT_NAME?.toLowerCase()?.includes("dev");

  if (isDevOrRailway) {
    try {
      // Borramos todos los registros (opcional, puedes comentar si no quieres vaciar datos)
      db.prepare("DELETE FROM clientes").run();
      db.prepare("DELETE FROM transacciones").run();
      db.prepare("DELETE FROM eventos").run();

      // Reiniciamos el contador de AUTOINCREMENT
      db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('clientes', 'transacciones', 'usuarios')").run();

      console.log("🧹 Base de datos limpia y secuencias reiniciadas (modo desarrollo).");
    } catch (err) {
      console.warn("⚠️ No se pudo reiniciar la base de datos:", err.message);
    }
  } else {
    console.log("🏭 Modo producción detectado — no se reinician secuencias.");
  }
};

// ===============================
// 🚀 EJECUCIÓN
// ===============================
createTables();
ensureColumnExists("clientes", "email", "TEXT");
ensureColumnExists("clientes", "square_id", "TEXT");
resetIfSandbox();

console.log("✅ Base de datos lista y estructurada.");
module.exports = db;
