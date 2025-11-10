const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.resolve(__dirname, "database/fidelidad.db");
const db = new Database(dbPath);

console.log("🧹 Conectado a:", dbPath);

try {
  db.prepare("DELETE FROM clientes").run();
  db.prepare("DELETE FROM transacciones").run();
  db.prepare("DELETE FROM eventos").run();

  db.prepare("DELETE FROM sqlite_sequence WHERE name='clientes'").run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name='transacciones'").run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name='usuarios'").run();

  console.log("✅ Tablas vaciadas y secuencias reiniciadas a 1.");
} catch (err) {
  console.error("❌ Error durante el reinicio:", err.message);
}

db.close();