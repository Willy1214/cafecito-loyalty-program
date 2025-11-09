// ===============================
// CONFIGURACIÓN DE LA BASE DE DATOS (better-sqlite3)
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
// CREACIÓN / ACTUALIZACIÓN DE TABLAS
// ===============================
const createTables = () => {
  // Tabla de usuarios
  db.prepare(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'cliente'
    )
  `).run();

  // Tabla de clientes
  db.prepare(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT,
      square_id TEXT UNIQUE,
      puntos INTEGER DEFAULT 0,
      nivel TEXT DEFAULT 'Bronce'
    )
  `).run();

  // 🔄 Asegurar columnas nuevas si la tabla ya existía
  try {
    db.prepare("ALTER TABLE clientes ADD COLUMN email TEXT").run();
    console.log("🆕 Columna 'email' agregada a clientes");
  } catch {}
  try {
    db.prepare("ALTER TABLE clientes ADD COLUMN square_id TEXT UNIQUE").run();
    console.log("🆕 Columna 'square_id' agregada a clientes");
  } catch {}

  // Tabla de transacciones
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

  console.log("📦 Tablas verificadas o actualizadas correctamente.");
};

createTables();
module.exports = db;
