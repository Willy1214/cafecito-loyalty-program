// database/db.js
// ===============================
// 🗄️ CONFIGURACIÓN DE LA BASE DE DATOS (better-sqlite3)
// ===============================
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

// ===============================
// Configuración de entorno
// ===============================
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, "fidelidad.db");

const isDevelopment = () => {
  const railwayEnv = (process.env.RAILWAY_ENVIRONMENT_NAME || "").toLowerCase();
  return (
    !process.env.NODE_ENV ||
    process.env.NODE_ENV === "development" ||
    railwayEnv === "sandbox" ||
    railwayEnv === "preview" ||
    process.env.RAILWAY_PROJECT_NAME?.toLowerCase()?.includes("dev")
  );
};

// ===============================
// Manejo del archivo de base de datos
// ===============================
const handleDatabaseFile = () => {
  if (isDevelopment()) {
    try {
      if (fs.existsSync(DB_PATH)) {
        fs.unlinkSync(DB_PATH);
        console.log("🧹 (sandbox/dev) Archivo de base de datos eliminado.");
      } else {
        console.log("📂 (sandbox/dev) Se creará una nueva base de datos.");
      }
    } catch (err) {
      console.warn("⚠️ No se pudo eliminar el archivo DB:", err.message);
    }
  } else {
    console.log("🏭 Producción - Base de datos persistente.");
  }
};

// ===============================
// Conexión a la base de datos
// ===============================
const connectDatabase = () => {
  try {
    handleDatabaseFile();
    const db = new Database(DB_PATH);
    console.log(`✅ Base de datos conectada en: ${DB_PATH}`);
    return db;
  } catch (err) {
    console.error("❌ Error al conectar la base de datos:", err.message);
    process.exit(1);
  }
};

// ===============================
// Definición de tablas
// ===============================
const TABLE_SCHEMAS = {
  usuarios: `
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'cliente'
    )
  `,
  
  clientes: `
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      puntos INTEGER DEFAULT 0,
      nivel TEXT DEFAULT 'Bronce',
      email TEXT,
      square_id TEXT UNIQUE
    )
  `,
  
  transacciones: `
    CREATE TABLE IF NOT EXISTS transacciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      usuario_id INTEGER,        -- ← NUEVO: ID del usuario que realizó la transacción
      fecha TEXT,
      puntos INTEGER,
      motivo TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)  -- ← NUEVA relación
    )
  `,
  
  eventos: `
    CREATE TABLE IF NOT EXISTS eventos (
      id TEXT PRIMARY KEY,
      tipo TEXT,
      fecha TEXT
    )
  `,
  
  ordenes: `
    CREATE TABLE IF NOT EXISTS ordenes (
      id TEXT PRIMARY KEY,
      fecha TEXT
    )
  `
};

// ===============================
// Columnas adicionales requeridas
// ===============================
const REQUIRED_COLUMNS = [
  { table: 'clientes', column: 'email', type: 'TEXT' },
  { table: 'clientes', column: 'square_id', type: 'TEXT UNIQUE' },
  { table: 'transacciones', column: 'usuario_id', type: 'INTEGER' }  // ← NUEVO
];

// ===============================
// Inicialización de tablas
// ===============================
const initializeTables = (db) => {
  console.log("📦 Creando/verificando tablas...");
  
  // Crear tablas principales
  Object.entries(TABLE_SCHEMAS).forEach(([tableName, schema]) => {
    db.prepare(schema).run();
  });
  
  // Agregar columnas faltantes
  REQUIRED_COLUMNS.forEach(({ table, column, type }) => {
    ensureColumnExists(db, table, column, type);
  });
  
  console.log("✅ Tablas inicializadas correctamente.");
};

// ===============================
// Verificar/agregar columnas
// ===============================
const ensureColumnExists = (db, tableName, columnName, columnType) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const exists = columns.some(col => col.name === columnName);

  if (!exists) {
    try {
      db.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`).run();
      console.log(`🆕 Columna '${columnName}' agregada a '${tableName}'.`);
    } catch (err) {
      console.error(`❌ Error agregando columna '${columnName}' a '${tableName}':`, err.message);
    }
  }
};

// ===============================
// Funciones anti-duplicados para webhook
// ===============================
const createAntiDuplicateFunctions = (db) => ({
  ordenYaProcesada: (orderId) => {
    const row = db.prepare("SELECT id FROM ordenes WHERE id = ?").get(orderId);
    return !!row;
  },
  
  registrarOrdenProcesada: (orderId) => {
    db.prepare(`
      INSERT INTO ordenes (id, fecha)
      VALUES (?, datetime('now'))
    `).run(orderId);
  }
});

// ===============================
// Verificación inicial
// ===============================
const verifyInitialData = (db) => {
  try {
    const count = db.prepare("SELECT COUNT(*) AS cnt FROM clientes").get()?.cnt || 0;
    console.log(`🔎 Clientes en tabla: ${count}`);
  } catch (err) {
    console.log("ℹ️ Tabla de clientes aún no tiene datos.");
  }
};

// ===============================
// Verificar datos de usuario demo
// ===============================
const createDemoUserIfNeeded = (db) => {
  try {
    const userCount = db.prepare("SELECT COUNT(*) as cnt FROM usuarios").get()?.cnt || 0;
    
    if (userCount === 0) {
      console.log("👤 No hay usuarios. Creando usuario demo...");
      
      // Crear usuario administrador demo
      const demoPassword = require('crypto').createHash('sha256').update('admin123').digest('hex');
      
      db.prepare(`
        INSERT INTO usuarios (nombre, email, password, rol)
        VALUES (?, ?, ?, ?)
      `).run(
        'Administrador Demo',
        'admin@demo.com',
        demoPassword,
        'admin'
      );
      
      console.log("✅ Usuario demo creado: admin@demo.com / admin123");
    }
  } catch (err) {
    console.log("⚠️ No se pudo crear usuario demo:", err.message);
  }
};

// ===============================
// Inicialización principal
// ===============================
const db = connectDatabase();
initializeTables(db);
verifyInitialData(db);
createDemoUserIfNeeded(db);  // ← NUEVO: Crear usuario demo si no existe

const { ordenYaProcesada, registrarOrdenProcesada } = createAntiDuplicateFunctions(db);

console.log("✅ Base de datos completamente inicializada.");

// ===============================
// Exportaciones
// ===============================
module.exports = {
  db,
  ordenYaProcesada,
  registrarOrdenProcesada
};