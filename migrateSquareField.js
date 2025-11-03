// migrateSquareField.js
const db = require("./database/db");

try {
  // Verifica si ya existe la columna 'square_id'
  const columns = db.prepare("PRAGMA table_info(clientes)").all();
  const exists = columns.some(c => c.name === "square_id");

  if (!exists) {
    db.prepare("ALTER TABLE clientes ADD COLUMN square_id TEXT").run();
    console.log("✅ Columna 'square_id' agregada correctamente.");
  } else {
    console.log("⚠️ La columna 'square_id' ya existe.");
  }

  process.exit(0);
} catch (err) {
  console.error("❌ Error al migrar:", err);
  process.exit(1);
}
