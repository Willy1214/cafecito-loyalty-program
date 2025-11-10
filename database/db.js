// ===============================
// 🗄️ CONFIGURACIÓN DE LA BASE DE DATOS (better-sqlite3)
// ===============================
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

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
      nivel TEXT DEFAULT 'Bronce'
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

  console.log("📦 Tablas verificadas o creadas correctamente.");
};

// ===============================
// 🩺 VERIFICAR Y AGREGAR COLUMNAS FALTANTES
// ===============================
const ensureColumnExists = (tableName, columnName, columnType) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some(col => col.name === columnName);

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
// 🧼 LIMPIEZA Y RESET EN ENTORNOS DE DESARROLLO / SANDBOX
// ===============================
const resetIfSandbox = () => {
  const railwayEnv = process.env.RAILWAY_ENVIRONMENT_NAME?.toLowerCase();
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
        console.log("🧹 Archivo de base de datos eliminado (modo sandbox/dev).");
      } else {
        console.log("📂 No había base de datos previa, se creará una nueva.");
      }

      db = new Database(dbPath);
      createTables();
      ensureColumnExists("clientes", "email", "TEXT");
      ensureColumnExists("clientes", "square_id", "TEXT");

      console.log("✅ Nueva base creada desde cero con secuencia reiniciada (id=1).");
    } catch (err) {
      console.error("❌ Error al reiniciar base en sandbox/dev:", err.message);
    }
  } else {
    console.log("🏭 Modo producción detectado — la base de datos no se reinicia.");
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
