// ===============================
// 💳 Webhook de Square
// ===============================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../database/db");
require("dotenv").config();

// 👇 Middleware especial SOLO para esta ruta (raw body)
router.post(
  "/webhook",
  express.raw({ type: "*/*" }), // evita que express lo parsee
  async (req, res) => {
    try {
      const signature = req.headers["x-square-hmacsha256-signature"];
      const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
/*
      if (!signature || !webhookSignatureKey) {
        console.error("⚠️ Faltan datos de firma o clave de Square");
        return res.status(401).send("Faltan credenciales");
      }
*/
      const rawBody = req.body.toString();

      // 🔐 Verificar firma HMAC
      const hmac = crypto.createHmac("sha256", webhookSignatureKey);
      hmac.update(rawBody);
      const hash = hmac.digest("base64");

      if (hash !== signature) {
        console.error("❌ Firma inválida — posible petición no autorizada");
        return res.status(401).send("Firma inválida");
      }

      // ✅ Firma válida, procesamos el evento
      const event = JSON.parse(rawBody);
      console.log("📩 Webhook recibido:", event.type);

      if (event.type === "payment.created") {
        const payment = event.data.object.payment;
        console.log("💳 Pago recibido:", payment.note || "(sin nota)");

        if (payment.note && payment.note.toLowerCase().includes("bebida")) {
          const clienteId = 1; // temporal
          const stmt = db.prepare("UPDATE clientes SET puntos = puntos + 1 WHERE id = ?");
          stmt.run(clienteId);
          console.log(`🥤 Punto agregado al cliente ${clienteId}`);
        }
      }

      res.status(200).send("OK");
    } catch (err) {
      console.error("❌ Error procesando webhook:", err);
      res.status(500).send("Error interno");
    }
  }
);

module.exports = router;
