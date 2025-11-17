// ===============================
// 💳 Webhook Square — sistema de puntos completo
// ===============================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../database/db");
const squareClient = require("../config/squareClient");
require("dotenv").config();

router.post("/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    // ===============================
    // 1️⃣ Validar firma HMAC
    // ===============================
    const signature = req.headers["x-square-hmacsha256-signature"];
    const webhookSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    // IMPORTANTE: usa tu URL real del webhook
    const endpointUrl = process.env.SQUARE_WEBHOOK_URL;

    if (!signature || !webhookSignatureKey) {
      console.error("⚠️ Faltan datos de firma");
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

    const dup = db.prepare("SELECT 1 FROM eventos WHERE id = ?").get(eventId);
    if (dup) {
      console.warn(`⚠️ Evento duplicado ignorado`);
      return res.status(200).send("Duplicado");
    }

    db.prepare("INSERT INTO eventos (id, tipo, fecha) VALUES (?, ?, ?)").run(
      eventId,
      event.type,
      new Date().toISOString()
    );

    console.log(`📩 Evento recibido: ${event.type}`);

    const eventosValidos = [
      "payment.created",
      "customer.created",
      "customer.updated",
      "customer.deleted",
    ];

    if (!eventosValidos.includes(event.type)) {
      return res.status(200).send("Evento ignorado");
    }

    // ===============================
    // 3️⃣ Procesar pago creado
    // ===============================
    if (event.type === "payment.created") {
      const payment = event.data.object.payment;
      const customerIdSquare = payment.customer_id;
      const orderId = payment.order_id;

      if (!orderId) return res.status(200).send("Sin order_id");

      const { ordersApi, catalogApi } = squareClient;

      try {
        const orderResponse = await ordersApi.retrieveOrder(orderId);
        const order = orderResponse.result.order;

        if (order.state !== "COMPLETED") {
          return res.status(200).send("Orden no completada");
        }

        if (!order.lineItems || order.lineItems.length === 0) {
          return res.status(200).send("Orden vacía");
        }

        const montoPago = parseInt(payment.amount_money.amount, 10);
        const montoOrden = parseInt(order.totalMoney.amount, 10);

        if (montoPago !== montoOrden) {
          return res.status(200).send("Monto inconsistente");
        }

        // =========================
        // Función para buscar categoría
        // =========================
        async function findCategoryName(catalogId, itemName = "", depth = 0) {
          if (!catalogId || depth > 5) return "Sin categoría";

          try {
            const response = await catalogApi.retrieveCatalogObject(catalogId, true);
            const obj = response.result.object;

            if (obj.type === "CATEGORY") return obj.categoryData.name;

            if (obj.type === "ITEM" && obj.itemData) {
              if (Array.isArray(obj.itemData.categories)) {
                const catId = obj.itemData.categories[0].id;
                const catResp = await catalogApi.retrieveCatalogObject(catId);
                return catResp.result.object.categoryData.name;
              }

              if (obj.itemData.categoryId) {
                return await findCategoryName(obj.itemData.categoryId, itemName, depth + 1);
              }
            }

            if (obj.type === "ITEM_VARIATION") {
              return await findCategoryName(obj.itemVariationData.itemId, itemName, depth + 1);
            }

            // Fallback por nombre
            if (itemName.toLowerCase().match(/\b(cafe|latte|capuchino|té|tea|frappe|jugo)\b/)) {
              return "Bebidas (por nombre)";
            }

            return "Sin categoría";
          } catch {
            return "Sin categoría";
          }
        }

        // ===============================
        // 🎯 Procesar productos para sumar puntos
        // ===============================
        let puntosAgregados = 0;

        for (const item of order.lineItems) {
          const quantity = parseInt(item.quantity || "1", 10);

          const catalogId = item.catalogObjectId;
          const category = await findCategoryName(catalogId, item.name);

          const categoriaValida = /bebida|favorito|caliente|refrescante/i.test(category);

          const cliente = db
            .prepare("SELECT id FROM clientes WHERE square_id = ?")
            .get(customerIdSquare);

          if (!cliente) continue;

          if (categoriaValida) {
            db.prepare("UPDATE clientes SET puntos = puntos + ? WHERE id = ?").run(
              quantity,
              cliente.id
            );

            db.prepare(
              `INSERT INTO transacciones (cliente_id, fecha, puntos, motivo)
               VALUES (?, ?, ?, ?)`
            ).run(
              cliente.id,
              new Date().toISOString(),
              quantity,
              `Compra de ${item.name} x${quantity} (${category})`
            );

            puntosAgregados += quantity;
          }
        }

        console.log(`🥤 Total puntos agregados: ${puntosAgregados}`);
      } catch (err) {
        console.error("Error procesando orden:", err.message);
      }
    }

    // ===============================
    // 4️⃣ Sincronización de clientes
    // ===============================
    if (event.type === "customer.created" || event.type === "customer.updated") {
      const c = event.data.object.customer;

      const existe = db.prepare("SELECT id FROM clientes WHERE square_id = ?").get(c.id);

      if (existe) {
        db.prepare("UPDATE clientes SET nombre=?, email=? WHERE square_id=?").run(
          c.given_name || "Sin nombre",
          c.email_address || null,
          c.id
        );
      } else {
        db.prepare(
          "INSERT INTO clientes (nombre, email, square_id, puntos) VALUES (?, ?, ?, 0)"
        ).run(c.given_name || "Sin nombre", c.email_address || null, c.id);
      }
    }

    // ===============================
    // 5️⃣ Eliminar cliente cuando se elimina en Square
    // ===============================
    if (event.type === "customer.deleted") {
      const c = event.data.object.customer;

      const cliente = db.prepare("SELECT id FROM clientes WHERE square_id = ?").get(c.id);
      if (!cliente) return res.status(200).send("Ya no existe");

      db.prepare("DELETE FROM transacciones WHERE cliente_id = ?").run(cliente.id);
      db.prepare("DELETE FROM clientes WHERE square_id = ?").run(c.id);
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Error general:", err.message);
    res.status(500).send("Error interno");
  }
});

module.exports = router;
