// ===============================
// 💳 Webhook de Square (con verificación de firma)
// ===============================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../database/db");
require("dotenv").config();

const WEBHOOK_SIGNATURE_KEY = process.env.WEBHOOK_SIGNATURE_KEY;

// ✅ Middleware para procesar el body sin que se pierdan los datos sin procesar
router.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

// 🧠 Función para verificar la firma del webhook
function isValidSquareSignature(req) {
  const signature = req.headers["x-square-signature"];
  const body = req.rawBody;

  if (!signature || !WEBHOOK_SIGNATURE_KEY) {
    console.error("⚠️ Falta firma o clave del webhook");
    return false;
  }

  const hash = crypto
    .createHmac("sha1", WEBHOOK_SIGNATURE_KEY)
    .update(body)
    .digest("base64");

  return hash === signature;
}

// 📨 Ruta para recibir webhooks
router.post("/webhook", async (req, res) => {
  try {
    // 1️⃣ Verificar firma
    if (!isValidSquareSignature(req)) {
      console.error("❌ Firma inválida o clave ausente");
      return res.status(401).send("Invalid signature");
    }

    const event = req.body;

    // 2️⃣ Procesar evento
    if (event.type === "payment.created") {
      const payment = event.data.object.payment;

      if (payment.note && payment.note.toLowerCase().includes("bebida")) {
        console.log("🥤 Pago detectado:", payment.note);

        // Cliente de ejemplo (más adelante lo vinculamos por ID o correo)
        const clienteId = 1;

        const stmt = db.prepare(
          "UPDATE clientes SET puntos = puntos + 1 WHERE id = ?"
        );
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
