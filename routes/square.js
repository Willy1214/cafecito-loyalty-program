// ===============================
// 💳 Webhook de Square
// ===============================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../database/db");
require("dotenv").config();

// ==========================================
// 🔒 RUTA: Webhook de Square
// ==========================================
router.post(
  "/webhook",
  express.raw({ type: "*/*" }), // evita que express lo parsee (NECESARIO)
  async (req, res) => {
    try {
      const signature = req.headers["x-square-hmacsha256-signature"];
      const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
      const endpointUrl = "https://cafecito-loyalty-program-production.up.railway.app/api/square/webhook"; // ⚠️ tu endpoint exacto

      console.log("📩 Webhook recibido en el servidor Square");
      console.log("🔑 Signature Header:", signature);
      console.log("🔑 Webhook Signature Key (desde env):", webhookSignatureKey ? "[CARGADA ✅]" : "[❌ VACÍA]");

      // 1️⃣ Validar datos base
      if (!signature || !webhookSignatureKey) {
        console.error("⚠️ Faltan datos de firma o clave de Square");
        return res.status(401).send("Faltan credenciales");
      }

      const rawBody = req.body.toString();

      // 2️⃣ Crear hash usando la fórmula oficial de Square:
      // HMAC_SHA256(endpointUrl + rawBody)
      const hmac = crypto.createHmac("sha256", webhookSignatureKey);
      hmac.update(endpointUrl + rawBody);
      const hash = hmac.digest("base64");

      console.log("🧾 Raw Body usado en hash:", rawBody);
      console.log("🔗 URL usada en hash:", endpointUrl);
      console.log("🔐 Hash generado localmente:", hash);
      console.log("📦 Firma recibida de Square:", signature);

      // 3️⃣ Verificar coincidencia
      if (hash !== signature) {
        console.error("❌ Firma inválida — posible petición no autorizada");
        return res.status(401).send("Firma inválida");
      }

      // ✅ Firma válida: procesar evento
      const event = JSON.parse(rawBody);
      console.log("📩 Evento recibido:", event.type);

      if (event.type === "payment.created") {
        const payment = event.data.object.payment;
        console.log("💳 Pago recibido:", payment.note || "(sin nota)");

        // Si fue una bebida, sumamos punto
        if (payment.note && payment.note.toLowerCase().includes("bebida")) {
          const clienteId = 1; // temporal
          const stmt = db.prepare("UPDATE clientes SET puntos = puntos + 1 WHERE id = ?");
          stmt.run(clienteId);
          console.log(`🥤 Punto agregado al cliente ${clienteId}`);
        }
      }

      res.status(200).send("OK ✅");
    } catch (err) {
      console.error("❌ Error procesando webhook:", err);
      res.status(500).send("Error interno");
    }
  }
);

module.exports = router;
