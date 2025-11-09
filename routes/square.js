// ===============================
// 💳 Webhook de Square: puntos por “Bebidas”, subcategorías y Favoritos + registro de transacciones + sync de clientes
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
        "https://cafecito-loyalty-program-production.up.railway.app/api/square/webhook"; // ⚠️ Cambia si tu endpoint cambia

      // ===============================
      // 1️⃣ Validar firma del Webhook
      // ===============================
      if (!signature || !webhookSignatureKey) {
        console.error("⚠️ Faltan datos de firma o clave de Square");
        return res.status(401).send("Faltan credenciales");
      }

      const rawBody = req.body.toString();
      const hmac = crypto.createHmac("sha256", webhookSignatureKey);
      hmac.update(endpointUrl + rawBody);
      const hash = hmac.digest("base64");

      if (hash !== signature) {
        console.error("❌ Firma inválida — posible petición no autorizada");
        return res.status(401).send("Firma inválida");
      }

      // ===============================
      // 2️⃣ Procesar evento
      // ===============================
      const event = JSON.parse(rawBody);
      console.log(`📩 Evento recibido: ${event.type}`);

      // ===============================
      // 🧾 EVENTO: Pago completado
      // ===============================
      if (event.type === "payment.created") {
        const payment = event.data.object.payment;
        const customerIdSquare = payment.customer_id;
        const orderId = payment.order_id;

        if (!orderId) {
          console.warn("⚠️ El pago no incluye un order_id, no se puede procesar productos.");
          return res.status(200).send("OK sin order_id");
        }

        const { ordersApi, catalogApi } = squareClient;

        try {
          const orderResponse = await ordersApi.retrieveOrder(orderId);
          const order = orderResponse.result.order;
          console.log("🧩 Detalles de la orden recibida desde Square:");
          console.log(JSON.stringify(order, null, 2));


          if (!order || !order.lineItems) {
            console.warn("⚠️ Orden sin productos asociados.");
            return res.status(200).send("OK sin productos");
          }

          let puntosAgregados = 0;

          for (const item of order.lineItems) {
            const catalogId = item.catalogObjectId;
            if (!catalogId) continue;

            const catalogItemResponse = await catalogApi.retrieveCatalogObject(catalogId);
            const catalogItem = catalogItemResponse.result.object;

            if (!catalogItem || !catalogItem.itemData) continue;

            const categoryId = catalogItem.itemData.categoryId;
            if (!categoryId) continue;

            const categoryResponse = await catalogApi.retrieveCatalogObject(categoryId);
            const categoryName = categoryResponse.result.object.categoryData.name;

            console.log(`📦 Producto: ${item.name} | Categoría: ${categoryName}`);

            // ✅ Detectar categorías elegibles (bebidas y subcategorías)
            const categoriasElegibles = /(bebidas|calientes|frapp[eé]s?|refrescantes|favoritos)/i;

            if (categoriasElegibles.test(categoryName)) {
              const cliente = db
                .prepare("SELECT id FROM clientes WHERE square_id = ?")
                .get(customerIdSquare);

              if (cliente) {
                // 1️⃣ Actualizar puntos
                db.prepare("UPDATE clientes SET puntos = puntos + 1 WHERE id = ?").run(cliente.id);

                // 2️⃣ Registrar transacción
                const fecha = new Date().toISOString();
                db.prepare(`
                  INSERT INTO transacciones (cliente_id, fecha, puntos, motivo)
                  VALUES (?, ?, ?, ?)
                `).run(cliente.id, fecha, 1, `Compra de ${item.name} (${categoryName})`);

                puntosAgregados++;
                console.log(`🥤 +1 punto agregado y transacción registrada para cliente ${cliente.id}`);
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

      // ===============================
      // 🧍 EVENTOS: Cliente creado / actualizado
      // ===============================
      if (event.type === "customer.created" || event.type === "customer.updated") {
        const customer = event.data.object.customer;
        const squareId = customer.id;
        const nombre = customer.given_name || "Sin nombre";
        const email = customer.email_address || null;

        const existente = db
          .prepare("SELECT id FROM clientes WHERE square_id = ?")
          .get(squareId);

        if (existente) {
          db.prepare("UPDATE clientes SET nombre = ?, email = ? WHERE square_id = ?")
            .run(nombre, email, squareId);
          console.log(`🔁 Cliente actualizado (${nombre})`);
        } else {
          db.prepare(
            "INSERT INTO clientes (nombre, email, square_id, puntos) VALUES (?, ?, ?, 0)"
          ).run(nombre, email, squareId);
          console.log(`🆕 Cliente nuevo sincronizado (${nombre})`);
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
