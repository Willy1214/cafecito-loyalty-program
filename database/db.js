// ===============================
// 🗄️ CONFIGURACIÓN DE LA BASE DE DATOS (better-sqlite3)
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
// 🧱 CREACIÓN DE TABLAS (si no existen)
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
      -- ⚠️ Nota: square_id se agregará dinámicamente si no existe
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

// ===============================
// 🩺 VERIFICAR Y AGREGAR COLUMNAS FALTANTES
// ===============================
const ensureColumnExists = (tableName, columnName, columnType) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some(col => col.name === columnName);

  if (!exists) {
    db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType};`).run();
    console.log(`✅ Columna '${columnName}' agregada a la tabla '${tableName}'.`);
  } else {
    console.log(`⚙️ Columna '${columnName}' ya existe en '${tableName}'.`);
  }
};

// Ejecutar funciones
createTables();
ensureColumnExists("clientes", "square_id", "TEXT");

// ===============================
// ✅ EXPORTAR INSTANCIA DE BASE DE DATOS
// ===============================
module.exports = db;
