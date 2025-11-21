// ===============================
// 💳 Webhook Square — sistema de puntos robusto (categoría “Bebidas”)
// ===============================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../database/db");
const squareClient = require("../config/squareClient");
require("dotenv").config();

// ===============================
// 🔥 Funciones anti-duplicado (AGREGADAS)
// ===============================
function ordenYaProcesada(orderId) {
  const row = db.prepare("SELECT id FROM ordenes WHERE id = ?").get(orderId);
  return !!row;
}

function registrarOrdenProcesada(orderId) {
  db.prepare(`
    INSERT INTO ordenes (id, fecha)
    VALUES (?, datetime('now'))
  `).run(orderId);
}

router.post(
  "/webhook",
  express.raw({ type: "*/*" }),
  async (req, res) => {
    try {
      // ===============================
      // 1️⃣ Validar firma HMAC
      // ===============================
      const signature = req.headers["x-square-hmacsha256-signature"];
      const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

      const endpointUrl =
        "https://cafecito-loyalty-program-production.up.railway.app/api/square/webhook";

      if (!signature || !webhookSignatureKey) {
        console.error("⚠️ Faltan datos de firma o clave");
        return res.status(401).send("Faltan credenciales");
      }

      const rawBody = req.body.toString();
      const hmac = crypto.createHmac("sha256", webhookSignatureKey);
      hmac.update(endpointUrl + rawBody);
      const hash = hmac.digest("base64");

      if (hash !== signature) {
        console.error("❌ Firma inválida");
        return res.status(401).send("Firma inválida");
      }

      // ===============================
      // 2️⃣ Parsear evento y evitar duplicados
      // ===============================
      const event = JSON.parse(rawBody);
      const eventId = event.id;

      console.log(`📩 Evento recibido: ${event.type}`);

      const yaExiste = db
        .prepare("SELECT 1 FROM eventos WHERE id = ?")
        .get(eventId);

      if (yaExiste) {
        console.warn(`⚠️ Evento duplicado ignorado (${eventId})`);
        return res.status(200).send("Evento ya procesado");
      }

      db.prepare(
        "INSERT INTO eventos (id, tipo, fecha) VALUES (?, ?, ?)"
      ).run(eventId, event.type, new Date().toISOString());

      // ===============================
      // 3️⃣ Filtrar eventos relevantes
      // ===============================
      const eventosEsperados = [
        "payment.created",
        "customer.created",
        "customer.updated",
        "customer.deleted",
      ];

      if (!eventosEsperados.includes(event.type)) {
        console.log(`ℹ️ Evento ${event.type} ignorado.`);
        return res.status(200).send("Evento ignorado");
      }

      // ===============================
      // 4️⃣ Procesar pago creado
      // ===============================
      if (event.type === "payment.created") {
        const payment = event.data.object.payment;
        const customerIdSquare = payment.customer_id;
        const orderId = payment.order_id;

        if (!orderId) {
          console.warn("⚠️ El pago no incluye order_id");
          return res.status(200).send("OK sin order_id");
        }

        // ============================================
        // 🚫 ANTI-DUPLICADO POR order_id (AGREGADO)
        // ============================================
        if (ordenYaProcesada(orderId)) {
          console.warn(`🚫 Orden ${orderId} ya procesada, ignorando puntos.`);
          return res.status(200).send("Orden duplicada ignorada");
        }

        const { ordersApi, catalogApi } = squareClient;

        try {
          const orderResponse = await ordersApi.retrieveOrder(orderId);
          const order = orderResponse.result.order;

          if (order.state && order.state !== "COMPLETED") {
            console.warn(
              `⚠️ Orden en estado ${order.state}, no se otorgan puntos.`
            );
            return res.status(200).send("Orden no completada");
          }

          if (!order.lineItems || order.lineItems.length === 0) {
            console.warn("⚠️ Orden sin productos.");
            return res.status(200).send("Orden vacía");
          }

          // ===============================
          // FUNCION PARA BUSCAR CATEGORÍA
          // ===============================
          async function findCategoryName(catalogId, itemName = "", depth = 0) {
            if (!catalogId || depth > 6) return "Sin categoría";

            try {
              const response =
                await catalogApi.retrieveCatalogObject(catalogId, true);
              const obj = response.result.object;

              if (!obj) return "Sin categoría";

              if (obj.type === "CATEGORY" && obj.categoryData?.name)
                return obj.categoryData.name;

              if (obj.type === "ITEM" && obj.itemData) {
                if (
                  Array.isArray(obj.itemData.categories) &&
                  obj.itemData.categories.length > 0
                ) {
                  const catId = obj.itemData.categories[0].id;
                  if (catId) {
                    const catResp = await catalogApi.retrieveCatalogObject(catId);
                    return catResp.result.object?.categoryData?.name;
                  }
                }

                if (obj.itemData.categoryId) {
                  return await findCategoryName(
                    obj.itemData.categoryId,
                    itemName,
                    depth + 1
                  );
                }
              }

              if (
                obj.type === "ITEM_VARIATION" &&
                obj.itemVariationData?.itemId
              ) {
                return await findCategoryName(
                  obj.itemVariationData.itemId,
                  itemName,
                  depth + 1
                );
              }

              if (itemName) {
                const n = itemName.toLowerCase();
                if (
                  /\b(chai|smothie|smothi|café|cafe|americano|latte|capuchino|cappuccino|espresso|té|te|tea|smoothie|jugo|zumo|milkshake|batido|frapp)\b/.test(
                    n
                  )
                ) {
                  return "Bebidas (detectada por nombre)";
                }
              }

              return "Sin categoría";
            } catch {
              return "Sin categoría";
            }
          }

          // ===============================
          // ⭐ SUMAR puntos solo a bebidas
          // ===============================
          let puntosAgregados = 0;

          const cliente = db
            .prepare("SELECT id FROM clientes WHERE square_id = ?")
            .get(customerIdSquare);

          if (!cliente) {
            console.warn("⚠️ Cliente no registrado");
            return res.status(200).send("Cliente no encontrado");
          }

          for (const item of order.lineItems) {
            if (item.itemType && item.itemType !== "ITEM") continue;

            const quantity = parseInt(item.quantity || "1");

            const category = await findCategoryName(
              item.catalogObjectId,
              item.name
            );

            const normalized = (category || "").toLowerCase();

            const esBebida = /\bbebidas?\b/.test(normalized);

            if (esBebida) {
              db.prepare(
                "UPDATE clientes SET puntos = puntos + ? WHERE id = ?"
              ).run(quantity, cliente.id);

              puntosAgregados += quantity;

              db.prepare(
                "INSERT INTO transacciones (cliente_id, fecha, puntos, motivo) VALUES (?, ?, ?, ?)"
              ).run(
                cliente.id,
                new Date().toISOString(),
                quantity,
                `Compra de ${item.name} x${quantity}`
              );

              console.log(`🥤 +${quantity} puntos por ${item.name}`);
            }
          }

          // ==================================================
          // 🧩 MARCAR ORDEN COMO PROCESADA (AGREGADO AQUÍ)
          // ==================================================
          registrarOrdenProcesada(orderId);

          console.log("✅ Total agregados:", puntosAgregados);

          req.app.get("sendUpdate")({
            type: "square_update",
            event: event.type,
          });
        } catch (err) {
          console.error("❌ Error procesando orden:", err);
        }
      }

      // ===============================
      // 5️⃣ CUSTOMER SYNC
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
          db.prepare(
            "UPDATE clientes SET nombre = ?, email = ? WHERE square_id = ?"
          ).run(nombre, email, squareId);

          console.log(`🔁 Cliente actualizado (${nombre})`);
        } else {
          db.prepare(
            "INSERT INTO clientes (nombre, email, square_id, puntos) VALUES (?, ?, ?, 0)"
          ).run(nombre, email, squareId);

          console.log(`🆕 Cliente sincronizado (${nombre})`);
          req.app.get("sendUpdate")({
            type: "square_update",
            event: event.type,
          });
        }
      }

      if (event.type === "customer.deleted") {
        const customer = event.data.object.customer;
        const squareId = customer.id;

        const cliente = db
          .prepare("SELECT id FROM clientes WHERE square_id = ?")
          .get(squareId);

        if (cliente) {
          db.prepare("DELETE FROM transacciones WHERE cliente_id = ?").run(
            cliente.id
          );
          db.prepare("DELETE FROM clientes WHERE square_id = ?").run(squareId);

          console.log(`🗑️ Cliente eliminado localmente (${squareId})`);
          req.app.get("sendUpdate")({
            type: "square_update",
            event: event.type,
          });
        }
      }

      return res.status(200).send("OK");
    } catch (err) {
      console.error("❌ Error general:", err);
      return res.status(500).send("Error interno");
    }
  }
);

module.exports = router;
