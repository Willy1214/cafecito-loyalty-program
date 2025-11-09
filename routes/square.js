// ===============================
// 💳 Webhook de Square con detección de categoría “Bebidas” + registro de transacciones
// ===============================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../database/db");
const squareClient = require("../config/squareClient");
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
      const endpointUrl =
        "https://cafecito-loyalty-program-production.up.railway.app/api/square/webhook"; // ⚠️ tu endpoint exacto

      console.log("📩 Webhook recibido en el servidor Square");
      console.log("🔑 Signature Header:", signature);
      console.log(
        "🔑 Webhook Signature Key (desde env):",
        webhookSignatureKey ? "[CARGADA ✅]" : "[❌ VACÍA]"
      );

      // 1️⃣ Validar datos base
      if (!signature || !webhookSignatureKey) {
        console.error("⚠️ Faltan datos de firma o clave de Square");
        return res.status(401).send("Faltan credenciales");
      }

      const rawBody = req.body.toString();

      // 2️⃣ Crear hash usando la fórmula oficial de Square: HMAC_SHA256(endpointUrl + rawBody)
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
        const customerIdSquare = payment.customer_id;
        const orderId = payment.order_id;

        console.log("💳 Pago recibido. ID de orden:", orderId);
        console.log("👤 Cliente Square ID:", customerIdSquare);

        if (!orderId) {
          console.warn("⚠️ El pago no incluye un order_id, no se puede procesar productos.");
          return res.status(200).send("OK sin order_id");
        }

        const { ordersApi, catalogApi } = squareClient;

        try {
          // 🧾 Obtener detalles de la orden
          const orderResponse = await ordersApi.retrieveOrder(orderId);
          const order = orderResponse.result.order;

          if (!order || !order.lineItems) {
            console.warn("⚠️ Orden sin productos asociados.");
            return res.status(200).send("OK sin productos");
          }

          let puntosAgregados = 0;

          for (const item of order.lineItems) {
            const catalogId = item.catalogObjectId;
            if (!catalogId) continue;

            // Obtener detalles del producto en el catálogo
            const catalogItemResponse = await catalogApi.retrieveCatalogObject(catalogId);
            const catalogItem = catalogItemResponse.result.object;

            if (!catalogItem || !catalogItem.itemData) continue;

            const categoryId = catalogItem.itemData.categoryId;
            if (!categoryId) continue;

            // Obtener la categoría del producto
            const categoryResponse = await catalogApi.retrieveCatalogObject(categoryId);
            const categoryName = categoryResponse.result.object.categoryData.name;

            console.log(`📦 Producto: ${item.name} | Categoría: ${categoryName}`);

            // ✅ Si la categoría contiene “Bebidas”, sumamos punto y registramos transacción
            if (/bebidas/i.test(categoryName)) {
              const cliente = db
                .prepare("SELECT id FROM clientes WHERE square_id = ?")
                .get(customerIdSquare);

              if (cliente) {
                // 🔹 1️⃣ Actualizar puntos
                db.prepare("UPDATE clientes SET puntos = puntos + 1 WHERE id = ?").run(cliente.id);

                // 🔹 2️⃣ Registrar transacción
                const fecha = new Date().toISOString();
                db.prepare(`
                  INSERT INTO transacciones (cliente_id, fecha, puntos, motivo)
                  VALUES (?, ?, ?, ?)
                `).run(
                  cliente.id,
                  fecha,
                  1,
                  `Compra de ${item.name} (${categoryName})`
                );

                puntosAgregados++;
                console.log(
                  `🥤 +1 punto agregado y transacción registrada para cliente ${cliente.id}`
                );
              } else {
                console.warn("⚠️ Cliente no encontrado en la base de datos con ese square_id");
              }
            }
          }

          if (puntosAgregados > 0) {
            console.log(`✅ Total de puntos agregados: ${puntosAgregados}`);
          } else {
            console.log("ℹ️ Ningún producto elegible para puntos.");
          }
        } catch (squareErr) {
          console.error("❌ Error al obtener detalles del pedido:", squareErr);
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
