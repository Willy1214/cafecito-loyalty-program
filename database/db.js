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
      // Limpiar tablas
      db.prepare("DELETE FROM clientes").run();
      db.prepare("DELETE FROM transacciones").run();
      db.prepare("DELETE FROM eventos").run();

      // Verificar si la tabla está vacía
      const { cnt } = db.prepare("SELECT COUNT(*) AS cnt FROM clientes").get();
      if (cnt === 0) {
        console.log("🧹 Reiniciando secuencia de AUTOINCREMENT manualmente...");

        // Fuerza un reinicio completo del contador usando VACUUM
        db.prepare("DELETE FROM sqlite_sequence WHERE name='clientes'").run();
        db.prepare("DELETE FROM sqlite_sequence WHERE name='transacciones'").run();
        db.prepare("DELETE FROM sqlite_sequence WHERE name='usuarios'").run();

        // Reajustar manualmente el contador (solo para asegurar compatibilidad)
        db.prepare("UPDATE sqlite_sequence SET seq = 0 WHERE name='clientes'").run();
        db.prepare("UPDATE sqlite_sequence SET seq = 0 WHERE name='transacciones'").run();
        db.prepare("UPDATE sqlite_sequence SET seq = 0 WHERE name='usuarios'").run();

        // SQLite solo aplica los cambios de secuencia al ejecutar VACUUM
        db.prepare("VACUUM").run();

        console.log("✅ Secuencia de IDs reiniciada correctamente a 1.");
      } else {
        console.log("⚙️ Clientes con registros — no se reinicia secuencia.");
      }
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
