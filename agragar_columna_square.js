// add_square_column.js
const db = require("./database/db");

try {
  db.prepare("ALTER TABLE clientes ADD COLUMN square_id TEXT;").run();
  console.log("✅ Columna 'square_id' agregada correctamente.");
} catch (err) {
  if (err.message.includes("duplicate column name")) {
    console.log("⚠️ La columna 'square_id' ya existe, todo bien.");
  } else {
    console.error("❌ Error agregando columna:", err.message);
  }
}
