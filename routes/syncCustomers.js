// ===============================
// 🔄 Sincronizar clientes de Square con base local
// ===============================
const express = require("express");
const router = express.Router();
const db = require("../database/db");
const squareClient = require("../config/squareClient");

// 👉 Función que realiza la sincronización (reutilizable)
async function syncClientes() {
  const { customersApi } = squareClient;

  const response = await customersApi.listCustomers();
  const clientesSquare = response.result.customers || [];

  let nuevos = 0;
  let actualizados = 0;

  for (const c of clientesSquare) {
    const nombre = c.givenName || "Sin nombre";
    const email = c.emailAddress || null;
    const squareId = c.id;

    const cliente = db
      .prepare("SELECT id FROM clientes WHERE square_id = ?")
      .get(squareId);

    if (cliente) {
      db.prepare("UPDATE clientes SET nombre = ?, email = ? WHERE square_id = ?")
        .run(nombre, email, squareId);
      actualizados++;
    } else {
      db.prepare(
        "INSERT INTO clientes (nombre, email, square_id, puntos) VALUES (?, ?, ?, 0)"
      ).run(nombre, email, squareId);
      nuevos++;
    }
  }

  console.log(`✅ Sync: ${nuevos} nuevos, ${actualizados} actualizados.`);
  return { nuevos, actualizados, total: clientesSquare.length };
}

// Ruta manual (por si quieres hacer sync manual desde el navegador o Postman)
router.get("/sync", async (req, res) => {
  try {
    const resultado = await syncClientes();
    res.json({ mensaje: "✅ Sincronización completada", ...resultado });
  } catch (err) {
    console.error("❌ Error al sincronizar clientes:", err.message);
    res.status(500).json({ error: "Error al sincronizar clientes." });
  }
});

module.exports = { router, syncClientes };
