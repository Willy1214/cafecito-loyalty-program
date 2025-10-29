// ===============================
// CONFIGURACIÓN DE LA BASE DE DATOS
// ===============================

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta donde se guardará el archivo de la base de datos
const dbPath = path.resolve(__dirname, 'fidelidad.db');

// Crear (o abrir si ya existe) la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error al conectar la base de datos:', err.message);
  } else {
    console.log('✅ Base de datos conectada en', dbPath);
  }
});

// Crear tablas si no existen
db.serialize(() => {
  // Tabla de usuarios
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      rol TEXT DEFAULT 'cliente'
    )
  `);

  // Tabla de clientes
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      puntos INTEGER DEFAULT 0,
      nivel TEXT DEFAULT 'Bronce'
    )
  `);

  // Tabla de transacciones
  db.run(`
    CREATE TABLE IF NOT EXISTS transacciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER,
      fecha TEXT,
      puntos INTEGER,
      motivo TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )
  `);
});

module.exports = db;
