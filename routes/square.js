// ===============================
// 💳 Webhook de Square: puntos por “Bebidas”, subcategorías y “Favoritos”
// ===============================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../database/db");
const squareClient = require("../config/squareClient");
require("dotenv").config();

router.post(
  "/webhook",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    try {
      const signature = req.headers["x-square-hmacsha256-signature"];
      const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
      const endpointUrl =
        "https://cafecito-loyalty-program-production.up.railway.app/api/square/webhook";

      // 1️⃣ Validar firma
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

      const event = JSON.parse(rawBody);
      console.log(`📩 Evento recibido: ${event.type}`);

      // 🧾 Pago creado
      if (event.type === "payment.created") {
        const payment = event.data.object.payment;
        const customerIdSquare = payment.customer_id;
        const orderId = payment.order_id;

        if (!orderId) {
          console.warn("⚠️ El pago no incluye order_id");
          return res.status(200).send("OK sin order_id");
        }

        const { ordersApi, catalogApi } = squareClient;

        try {
          const orderResponse = await ordersApi.retrieveOrder(orderId);
          const order = orderResponse.result.order;

          if (!order?.lineItems) {
            console.warn("⚠️ Orden sin productos asociados.");
            return res.status(200).send("OK sin productos");
          }

          console.log("🧩 Detalles de la orden:");
          console.log(
            JSON.stringify(order, (key, value) =>
              typeof value === "bigint" ? value.toString() : value,
            2)
          );

          let puntosAgregados = 0;

          for (const item of order.lineItems) {
            const catalogId = item.catalogObjectId;
            if (!catalogId) continue;

            let catalogItemResponse;
            try {
              catalogItemResponse = await catalogApi.retrieveCatalogObject(catalogId, true);
            } catch (err) {
              console.warn(`⚠️ No se pudo obtener el objeto del catálogo: ${catalogId}`, err);
              continue;
            }

            let catalogItem = catalogItemResponse.result.object;

            // 🧩 Si es una variación, obtener el item padre
            if (catalogItem.type === "ITEM_VARIATION") {
              const parentId = catalogItem.itemVariationData?.itemId;
              if (parentId) {
                try {
                  const parentResponse = await catalogApi.retrieveCatalogObject(parentId);
                  catalogItem = parentResponse.result.object;
                } catch (err) {
                  console.warn(`⚠️ No se pudo obtener el producto padre (${parentId})`, err);
                  continue;
                }
              }
            }

            if (!catalogItem?.itemData) {
              console.warn(`⚠️ El producto "${item.name}" no tiene itemData válido.`);
              continue;
            }

            // 🔍 Obtener categoría del item
            let categoryName = "Sin categoría";
            const categoryId = catalogItem.itemData.categoryId;

            if (categoryId) {
              try {
                const categoryResponse = await catalogApi.retrieveCatalogObject(categoryId);
                categoryName = categoryResponse.result.object?.categoryData?.name || "Sin categoría";
              } catch (err) {
                console.warn(`⚠️ No se pudo obtener la categoría para ${item.name}`, err);
              }
            }

            const normalizedName = categoryName.toLowerCase().trim();
            console.log(`📦 Producto: ${item.name} | Categoría detectada: ${normalizedName}`);

            const esElegible = /\bbebidas?\b|\bfavoritos?\b|\bcalientes?\b|\brefrescantes?\b/.test(normalizedName);

            if (esElegible) {
              const cliente = db
                .prepare("SELECT id FROM clientes WHERE square_id = ?")
                .get(customerIdSquare);

              if (cliente) {
                db.prepare("UPDATE clientes SET puntos = puntos + 1 WHERE id = ?").run(cliente.id);

                const fecha = new Date().toISOString();
                db.prepare(`
                  INSERT INTO transacciones (cliente_id, fecha, puntos, motivo)
                  VALUES (?, ?, ?, ?)
                `).run(cliente.id, fecha, 1, `Compra de ${item.name} (${categoryName})`);

                puntosAgregados++;
                console.log(`🥤 +1 punto agregado a cliente ${cliente.id}`);
              } else {
                console.warn("⚠️ Cliente no encontrado en la base de datos.");
              }
            }
          }

          if (puntosAgregados > 0) {
            console.log(`✅ Total de puntos agregados: ${puntosAgregados}`);
          } else {
            console.log("ℹ️ Ningún producto elegible para puntos.");
          }
        } catch (err) {
          console.error("❌ Error al procesar la orden:", err);
        }
      }

      // 🧍‍♂️ Cliente creado/actualizado
      if (event.type === "customer.created" || event.type === "customer.updated") {
        const customer = event.data.object.customer;
        const squareId = customer.id;
        const nombre = customer.given_name || "Sin nombre";
        const email = customer.email_address || null;

        const existente = db.prepare("SELECT id FROM clientes WHERE square_id = ?").get(squareId);

        if (existente) {
          db.prepare("UPDATE clientes SET nombre = ?, email = ? WHERE square_id = ?")
            .run(nombre, email, squareId);
          console.log(`🔁 Cliente actualizado (${nombre})`);
        } else {
          db.prepare(
            "INSERT INTO clientes (nombre, email, square_id, puntos) VALUES (?, ?, ?, 0)"
          ).run(nombre, email, squareId);
          console.log(`🆕 Cliente sincronizado (${nombre})`);
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


