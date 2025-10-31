// ==================================
// RUTA: Webhook de Square
// ==================================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
require("dotenv").config();

router.post("/webhook", express.json({ type: "*/*" }), (req, res) => {
  try {
    const signature = req.headers["x-square-hmacsha256-signature"];
    const body = JSON.stringify(req.body);
    const webhookSecret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    // ✅ Verificar firma de Square
    const hmac = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("base64");

    if (hmac !== signature) {
      console.warn("❌ Firma de Square no válida");
      return res.status(401).send("Firma no válida");
    }

    // 📦 Procesar evento
    const eventType = req.body.type;
    console.log(`📬 Evento recibido de Square: ${eventType}`);

    // Aquí podrías filtrar:
    // if (eventType === "payment.created") { ... }
    // if (eventType === "payment.updated") { ... }

    res.status(200).send("✅ Evento recibido correctamente");
  } catch (err) {
    console.error("❌ Error procesando webhook:", err.message);
    res.status(500).send("Error interno del servidor");
  }
});

module.exports = router;
