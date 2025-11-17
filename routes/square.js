// ===============================
// 💳 Webhook Square — sistema de puntos robusto
// ===============================
const express = require("express");
const crypto = require("crypto");
const router = express.Router();
const db = require("../database/db");
const squareClient = require("../config/squareClient");
require("dotenv").config();

// =========================================
// 🔎 Buscar categoría real de un producto
// =========================================
async function findCategoryName(catalogId, fallbackName = "") {
  try {
    const { catalogApi } = squareClient;

    const response = await catalogApi.retrieveCatalogObject(catalogId, false);
    const product = response.result.object;

    if (!product) return fallbackName || "Sin categoría";

    if (!product.itemData || !product.itemData.categoryId)
      return fallbackName || "Sin categoría";

    const categoryId = product.itemData.categoryId;

    const categoryRes = await catalogApi.retrieveCatalogObject(categoryId, false);
    const categoryObj = categoryRes.result.object;

    return categoryObj?.categoryData?.name || "Sin categoría";
  } catch (err) {
    console.error("⚠️ Error obteniendo categoría:", err.message);
    return fallbackName || "Sin categoría";
  }
}

// ===============================
// 📌 Webhook
// ===============================
router.post("/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  try {
    // ===============================
    // 1️⃣ Validar firma
    // ===============================
    const signature = req.headers["x-square-hmacsha256-signature"];
    const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

    const endpointUrl =
      "https://cafecito-loyalty-program-production.up.railway.app/api/square/webhook";

    if (!signature || !secret) {
      console.error("⚠️ Faltan datos de firma/clave");
      return res.status(401).send("Credenciales faltantes");
    }

    const rawBody = req.body.toString();
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(endpointUrl + rawBody);
    const expected = hmac.digest("base64");

    if (expected !== signature) {
      console.error("❌ Firma inválida");
      return res.status(401).send("Firma inválida");
    }

    // ===============================
    // 2️⃣ Parseo + evitar duplicados
    // ===============================
    const event = JSON.parse(rawBody);
    const eventId = event.id;

    console.log(`📩 Evento recibido: ${event.type}`);

    const exists = db.prepare("SELECT 1 FROM eventos WHERE id = ?").get(eventId);
    if (exists) {
      console.warn(`⚠️ Evento duplicado ignorado`);
      return res.status(200).send("OK");
    }

    db.prepare("INSERT INTO eventos (id, tipo, fecha) VALUES (?, ?, ?)").run(
      eventId,
      event.type,
      new Date().toISOString()
    );

    const relevantes = [
      "payment.created",
      "customer.created",
      "customer.updated",
      "customer.deleted",
    ];

    if (!relevantes.includes(event.type)) {
      console.log(`ℹ️ Evento ignorado`);
      return res.status(200).send("OK");
    }

    // ===============================
    // 4️⃣ Procesar pago
    // ===============================
    if (event.type === "payment.created") {
      const payment = event.data.object.payment;

      const customerId = payment.customer_id;
      const orderId = payment.order_id;

      if (!orderId) {
        console.log("⚠️ Pago sin order_id");
        return res.status(200).send("OK");
      }

      const { ordersApi } = squareClient;

      try {
        const orderRes = await ordersApi.retrieveOrder(orderId);
        const order = orderRes.result.order;

        if (order.state !== "COMPLETED") {
          console.log("⚠️ Orden no completada");
          return res.status(200).send("OK");
        }

        if (!order.lineItems) {
          console.log("⚠️ Orden sin productos");
          return res.status(200).send("OK");
        }

        let puntosTotal = 0;

        const cliente = db
          .prepare("SELECT id FROM clientes WHERE square_id = ?")
          .get(customerId);

        if (!cliente) {
          console.log("⚠️ Cliente no está registrado aún");
          return res.status(200).send("OK");
        }

        for (const item of order.lineItems) {
          if (item.itemType !== "ITEM") continue;

          const catalogId = item.catalogObjectId;
          const quantity = parseInt(item.quantity || "1");

          const categoryName = await findCategoryName(
            catalogId,
            item.name || "Sin categoría"
          );

          const normalized = categoryName.toLowerCase().trim();
          const elegible = /\bbebidas?\b|\bfavoritos?\b/.test(normalized);

          if (!elegible) continue;

          db.prepare("UPDATE clientes SET puntos = puntos + ? WHERE id = ?").run(
            quantity,
            cliente.id
          );

          db.prepare(
            `
            INSERT INTO transacciones (cliente_id, fecha, puntos, motivo)
            VALUES (?, ?, ?, ?)
          `
          ).run(
            cliente.id,
            new Date().toISOString(),
            quantity,
            `Compra: ${item.name} (${categoryName}) x${quantity}`
          );

          puntosTotal += quantity;
        }

        console.log(`🎁 Puntos agregados: ${puntosTotal}`);
      } catch (err) {
        console.error("❌ Error en payment.created:", err.message);
      }
    }

    // ===============================
    // 5️⃣ Crear / actualizar cliente
    // ===============================
    if (event.type === "customer.created" || event.type === "customer.updated") {
      const c = event.data.object.customer;

      const existing = db
        .prepare("SELECT id FROM clientes WHERE square_id = ?")
        .get(c.id);

      if (existing) {
        db.prepare(
          "UPDATE clientes SET nombre = ?, email = ? WHERE square_id = ?"
        ).run(c.given_name, c.email_address, c.id);

        console.log(`🔁 Cliente actualizado: ${c.given_name}`);
      } else {
        db.prepare(
          "INSERT INTO clientes (nombre, email, square_id, puntos) VALUES (?, ?, ?, 0)"
        ).run(c.given_name, c.email_address, c.id);

        console.log(`🆕 Cliente creado: ${c.given_name}`);
      }
    }

    // ===============================
    // 🗑️ Borrar cliente
    // ===============================
    if (event.type === "customer.deleted") {
      const c = event.data.object.customer;

      const cliente = db
        .prepare("SELECT id FROM clientes WHERE square_id = ?")
        .get(c.id);

      if (cliente) {
        db.prepare("DELETE FROM transacciones WHERE cliente_id = ?").run(
          cliente.id
        );
        db.prepare("DELETE FROM clientes WHERE square_id = ?").run(c.id);

        console.log(`🗑️ Cliente eliminado: ${c.id}`);
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("❌ Error general del webhook:", err.message);
    res.status(500).send("Error interno");
  }
});

module.exports = router;
