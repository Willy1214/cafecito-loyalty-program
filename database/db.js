// ===============================
// CONFIGURACIÓN DE LA BASE DE DATOS (better-sqlite3)
// ===============================
const Database = require("better-sqlite3");
const path = require("path");

// Usa una variable de entorno para la base de datos si estás en Railway
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
// CREACIÓN DE TABLAS (si no existen)
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

  console.log("📦 Tablas verificadas o creadas correctamente.");
};

// Ejecutar creación de tablas
createTables();

// Exportar la instancia de la base de datos
module.exports = db;
