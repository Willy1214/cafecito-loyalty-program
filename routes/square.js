// ===============================
// 💳 Webhook de Square
// ===============================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../config/db");
require("dotenv").config();

// Middleware para capturar el "raw body" del request
router.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString(); // guardamos el cuerpo crudo antes de parsearlo
    },
  })
);

function isValidSquareSignature(req) {
  try {
    const signature = req.headers["x-square-hmacsha256-signature"];
    const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    if (!signature || !webhookSignatureKey) {
      console.error("⚠️ Faltan datos de firma o clave de Square");
      return false;
    }

    const body = req.rawBody; // usamos el body crudo
    const hmac = crypto.createHmac("sha256", webhookSignatureKey);
    hmac.update(body);
    const hash = hmac.digest("base64");

    return hash === signature;
  } catch (err) {
    console.error("❌ Error verificando firma:", err);
    return false;
  }
}

router.post("/webhook", async (req, res) => {
  try {
    // ✅ Verificar firma
    if (!isValidSquareSignature(req)) {
      console.error("❌ Firma inválida — posible petición no autorizada");
      return res.status(401).send("Firma inválida");
    }

    const event = req.body;
    console.log("📩 Webhook recibido:", event.type);

    if (event.type === "payment.created") {
      const payment = event.data.object.payment;
      console.log("💳 Pago recibido:", payment.note || "(sin nota)");

      // Si el pago fue por una bebida, suma un punto
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
});

module.exports = router;
