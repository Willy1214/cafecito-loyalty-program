// ===============================
// 💳 Webhook de Square
// ===============================
const express = require("express");
const router = express.Router();
const db = require("../config/db"); // tu conexión a SQLite
require("dotenv").config();

// Recibir eventos desde Square
router.post("/webhook", async (req, res) => {
  try {
    const event = req.body;

    // 1️⃣ Verifica tipo de evento
    if (event.type === "payment.created") {
      const payment = event.data.object.payment;

      // 2️⃣ Verifica si es una bebida
      if (payment.note && payment.note.toLowerCase().includes("bebida")) {
        console.log("🥤 Pago detectado:", payment.note);

        // ⚙️ Lógica temporal: asignar cliente fijo o buscarlo por email si existiera
        const clienteId = 1; // TODO: más adelante lo vinculamos con cliente real

        // 3️⃣ Actualizar puntos en la BD
        const stmt = db.prepare("UPDATE clientes SET puntos = puntos + 1 WHERE id = ?");
        stmt.run(clienteId);

        console.log(`✅ +1 punto agregado al cliente ID ${clienteId}`);
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Error procesando webhook:", err);
    res.status(500).send("Error interno");
  }
});

module.exports = router;
