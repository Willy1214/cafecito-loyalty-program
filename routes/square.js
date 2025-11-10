// ===============================
// 💳 Webhook Square — sistema de puntos robusto (categoría “Bebidas”, subcategorías, “Favoritos”)
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
    const endpointUrl =
      "https://cafecito-loyalty-program-production.up.railway.app/api/square/webhook";

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
    // 2️⃣ Parsear evento y evitar duplicados
    // ===============================
    const event = JSON.parse(rawBody);
    const eventId = event.id;
    console.log(`📩 Evento recibido: ${event.type}`);

    const yaExiste = db.prepare("SELECT 1 FROM eventos WHERE id = ?").get(eventId);
    if (yaExiste) {
      console.warn(`⚠️ Evento duplicado ignorado (${eventId})`);
      return res.status(200).send("Evento ya procesado");
    }

    db.prepare("INSERT INTO eventos (id, tipo, fecha) VALUES (?, ?, ?)").run(
      eventId,
      event.type,
      new Date().toISOString()
    );

    // ===============================
    // 3️⃣ Filtrar eventos relevantes
    // ===============================
    const eventosEsperados = ["payment.created", "customer.created", "customer.updated"];

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

      const { ordersApi, catalogApi } = squareClient;

      try {
        const orderResponse = await ordersApi.retrieveOrder(orderId);
        const order = orderResponse.result.order;

        // 💰 Validaciones de estado y consistencia
        if (order.state && order.state !== "COMPLETED") {
          console.warn(`⚠️ Orden en estado ${order.state}, no se otorgan puntos.`);
          return res.status(200).send("Orden no completada");
        }

        if (!order.lineItems || order.lineItems.length === 0) {
          console.warn("⚠️ Orden sin productos asociados.");
          return res.status(200).send("Orden vacía");
        }

        if (order.totalMoney?.amount === "0") {
          console.warn("⚠️ Orden con total $0, no se otorgan puntos.");
          return res.status(200).send("Orden sin monto");
        }

        // 💳 Validar que el monto del pago coincida con el total de la orden
        const montoPago = parseInt(payment.amount_money?.amount || "0", 10);
        const montoOrden = parseInt(order.totalMoney?.amount || "0", 10);

        if (montoPago !== montoOrden) {
          console.warn(`⚠️ Monto inconsistente: pago ${montoPago} ≠ orden ${montoOrden}`);
          return res.status(200).send("Monto no coincide, puntos no otorgados");
        }

        // 🧾 Log seguro con BigInt manejado
        try {
          const safeOrder = JSON.parse(
            JSON.stringify(order, (key, value) =>
              typeof value === "bigint" ? value.toString() : value
            )
          );
          console.log("🧩 Detalles de la orden:", JSON.stringify(safeOrder, null, 2));
        } catch (logErr) {
          console.warn("⚠️ No se pudo imprimir la orden completa:", logErr.message);
        }

        // ===============================
        // 🧠 Función para detectar categoría
        // ===============================
        async function findCategoryName(catalogId, depth = 0) {
          if (!catalogId || depth > 5) return "Sin categoría";

          try {
            const response = await catalogApi.retrieveCatalogObject(catalogId, true);
            const obj = response.result.object;

            if (obj.type === "CATEGORY" && obj.categoryData?.name) {
              return obj.categoryData.name;
            }

            if (obj.type === "ITEM" && obj.itemData?.categoryId) {
              return await findCategoryName(obj.itemData.categoryId, depth + 1);
            }

            if (obj.type === "ITEM_VARIATION" && obj.itemVariationData?.itemId) {
              return await findCategoryName(obj.itemVariationData.itemId, depth + 1);
            }

            if (obj.customAttributeValues) {
              const catAttr = Object.values(obj.customAttributeValues).find((v) =>
                v?.name?.toLowerCase()?.includes("categoría")
              );
              if (catAttr?.stringValue) return catAttr.stringValue;
            }

            return "Sin categoría";
          } catch (err) {
            console.warn(`⚠️ Error buscando categoría (${catalogId}): ${err.message}`);
            return "Sin categoría";
          }
        }

        // ===============================
        // 🎯 Procesar productos y otorgar puntos
        // ===============================
        let puntosAgregados = 0;

        for (const item of order.lineItems) {
          const catalogId = item.catalogObjectId;
          if (!catalogId) continue;

          const categoryName = await findCategoryName(catalogId);
          const normalizedName = categoryName.toLowerCase().trim();

          console.log(`📦 Producto: ${item.name} | Categoría detectada: ${normalizedName}`);

          const esElegible =
            /\bbebidas?\b|\bfavoritos?\b|\bcalientes?\b|\brefrescantes?\b/.test(
              normalizedName
            );

          const cliente = db
            .prepare("SELECT id FROM clientes WHERE square_id = ?")
            .get(customerIdSquare);

          if (!cliente) {
            console.warn("⚠️ Cliente no registrado, no se otorgan puntos.");
            return res.status(200).send("Cliente no encontrado");
          }

          if (esElegible) {
            db.prepare("UPDATE clientes SET puntos = puntos + 1 WHERE id = ?").run(cliente.id);

            const fecha = new Date().toISOString();
            db.prepare(`
              INSERT INTO transacciones (cliente_id, fecha, puntos, motivo)
              VALUES (?, ?, ?, ?)
            `).run(cliente.id, fecha, 1, `Compra de ${item.name} (${categoryName})`);

            puntosAgregados++;
            console.log(`🥤 +1 punto agregado a cliente ${cliente.id}`);
          }
        }

        if (puntosAgregados > 0) {
          console.log(`✅ Total de puntos agregados: ${puntosAgregados}`);
        } else {
          console.log("ℹ️ Ningún producto elegible para puntos.");
        }
      } catch (err) {
        console.error("❌ Error al procesar la orden:", err.message);
      }
    }

    // ===============================
    // 5️⃣ Sincronización de cliente (crear / actualizar)
    // ===============================
    if (event.type === "customer.created" || event.type === "customer.updated") {
      const customer = event.data.object.customer;
      const squareId = customer.id;
      const nombre = customer.given_name || "Sin nombre";
      const email = customer.email_address || null;

      const existente = db.prepare("SELECT id FROM clientes WHERE square_id = ?").get(squareId);

      if (existente) {
        db.prepare("UPDATE clientes SET nombre = ?, email = ? WHERE square_id = ?").run(
          nombre,
          email,
          squareId
        );
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
    console.error("❌ Error procesando webhook:", err.message);
    res.status(500).send("Error interno");
  }
});

module.exports = router;
