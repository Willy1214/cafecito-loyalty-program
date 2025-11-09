// ===============================
// 🔄 Sincronizar clientes de Square con base local
// ===============================
const express = require("express");
const router = express.Router();
const db = require("../database/db");
const squareClient = require("../config/squareClient");

// Ruta para sincronizar clientes
router.get("/sync", async (req, res) => {
  try {
    const { customersApi } = squareClient;

    const response = await customersApi.listCustomers();
    const clientesSquare = response.result.customers || [];

    let nuevos = 0;
    let actualizados = 0;

    for (const c of clientesSquare) {
      const nombre = c.givenName || "Sin nombre";
      const email = c.emailAddress || null;
      const squareId = c.id;

      // Verificar si ya existe en la base local
      const cliente = db
        .prepare("SELECT id FROM clientes WHERE square_id = ?")
        .get(squareId);

      if (cliente) {
        // Actualizar datos existentes
        db.prepare(
          "UPDATE clientes SET nombre = ?, email = ? WHERE square_id = ?"
        ).run(nombre, email, squareId);
        actualizados++;
      } else {
        // Insertar nuevo cliente
        db.prepare(
          "INSERT INTO clientes (nombre, email, square_id, puntos) VALUES (?, ?, ?, 0)"
        ).run(nombre, email, squareId);
        nuevos++;
      }
    }

    res.json({
      mensaje: "✅ Sincronización completada",
      nuevos,
      actualizados,
      total: clientesSquare.length,
    });
  } catch (err) {
    console.error("❌ Error al sincronizar clientes:", err.message);
    res.status(500).json({ error: "Error al sincronizar clientes." });
  }
});

module.exports = router;
