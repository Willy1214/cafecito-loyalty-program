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
    const eventosEsperados = ["payment.created", "customer.created", "customer.updated", "customer.deleted" ];

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
        // Algunos payloads usan snake_case o camelCase; chequeamos ambos campos de amount_money / amountMoney
        const montoPago =
          parseInt(payment.amount_money?.amount || payment.amountMoney?.amount || "0", 10);
        const montoOrden = parseInt(order.totalMoney?.amount || "0", 10);

        if (montoPago !== montoOrden) {
          console.warn(`⚠️ Monto inconsistente: pago ${montoPago} ≠ orden ${montoOrden}`);
          return res.status(200).send("Monto no coincide, puntos no otorgados");
        }

        // 🧾 Log seguro con BigInt manejado
        try {
          const safeOrder = JSON.parse(
            JSON.stringify(order, (key, value) => (typeof value === "bigint" ? value.toString() : value))
          );
          console.log("🧩 Detalles de la orden:", JSON.stringify(safeOrder, null, 2));
        } catch (logErr) {
          console.warn("⚠️ No se pudo imprimir la orden completa:", logErr.message);
        }

        // ===============================
        // 🧠 Función para detectar categoría (mejorada)
        // - soporta: itemData.categories[], itemData.categoryId, reporting_category, variation->item
        // - fallback por nombre (solo palabras relacionadas con bebidas)
        // ===============================
        async function findCategoryName(catalogId, itemName = "", depth = 0) {
          if (!catalogId || depth > 6) return "Sin categoría";

          try {
            const response = await catalogApi.retrieveCatalogObject(catalogId, true);
            const obj = response.result.object;

            if (!obj) return "Sin categoría";

            // Si ya es una categoría
            if (obj.type === "CATEGORY" && obj.categoryData?.name) {
              return obj.categoryData.name;
            }

            // Si es ITEM, primero revisar itemData.categories[] (nuevo), luego categoryId (viejo)
            if (obj.type === "ITEM" && obj.itemData) {
              // 1) itemData.categories[] es la forma moderna
              if (Array.isArray(obj.itemData.categories) && obj.itemData.categories.length > 0) {
                const catId = obj.itemData.categories[0].id;
                if (catId) {
                  try {
                    const catResp = await catalogApi.retrieveCatalogObject(catId);
                    const catName = catResp.result.object?.categoryData?.name;
                    if (catName) return catName;
                  } catch (e) {
                    /* seguir buscando */
                  }
                }
              }

              // 2) reporting_category (algunas exportaciones usan reporting_category)
              const repCatId =
                obj.itemData.reporting_category?.id || obj.itemData.reportingCategory?.id;
              if (repCatId) {
                try {
                  const repResp = await catalogApi.retrieveCatalogObject(repCatId);
                  const repName = repResp.result.object?.categoryData?.name;
                  if (repName) return repName;
                } catch (e) {
                  /* seguir buscando */
                }
              }

              // 3) categoryId (legacy)
              if (obj.itemData.categoryId) {
                return await findCategoryName(obj.itemData.categoryId, itemName, depth + 1);
              }
            }

            // Si es una variación, subir al item padre
            if (obj.type === "ITEM_VARIATION" && obj.itemVariationData?.itemId) {
              return await findCategoryName(obj.itemVariationData.itemId, itemName, depth + 1);
            }

            // Buscar en custom attributes por si alguien puso la categoria manualmente
            if (obj.customAttributeValues) {
              const catAttr = Object.values(obj.customAttributeValues).find((v) =>
                (v?.name || "").toLowerCase().includes("categor")
              );
              if (catAttr?.stringValue) return catAttr.stringValue;
            }

            // FALLBACK: intentar inferir por nombre del item (solo bebidas)
            if (itemName) {
              const n = itemName.toLowerCase();
              if (/\b(café|cafe|americano|latte|capuchino|cappuccino|espresso|té|te|tea|smoothie|jugo|zum[oó]|milkshake|batido|frapp[eé]?)\b/.test(n)) {
                return "Bebidas (detectada por nombre)";
              }
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
          // Saltar líneas que no son items (ej: DISCOUNT, FEE, etc.)
          if (item.itemType && item.itemType !== "ITEM") {
            console.log(`ℹ️ Línea ignorada (no es ITEM): ${item.name} / type=${item.itemType}`);
            continue;
          }

          const catalogId = item.catalogObjectId;
          // Si no trae catalogId, intentamos fallback por nombre directo
          if (!catalogId) {
            console.log(`ℹ️ Item sin catalogObjectId: ${item.name}`);
            // fallback por nombre
            const maybeByName = await findCategoryName(null, item.name || "");
            if (/\bbebidas?\b|\bfavoritos?\b|\bcalientes?\b|\brefrescantes?\b/.test(maybeByName.toLowerCase())) {
              // buscar cliente y sumar punto
              const cliente = db.prepare("SELECT id FROM clientes WHERE square_id = ?").get(customerIdSquare);
              if (!cliente) {
                console.warn("⚠️ Cliente no registrado, no se otorgan puntos.");
                return res.status(200).send("Cliente no encontrado");
              }
              db.prepare("UPDATE clientes SET puntos = puntos + 1 WHERE id = ?").run(cliente.id);
              const fecha = new Date().toISOString();
              db.prepare(
                `INSERT INTO transacciones (cliente_id, fecha, puntos, motivo) VALUES (?, ?, ?, ?)`
              ).run(cliente.id, fecha, 1, `Compra de ${item.name} (detectada por nombre)`);
              puntosAgregados++;
              console.log(`🥤 +1 punto (fallback nombre) agregado a cliente ${cliente.id}`);
            }
            continue;
          }

          // Busca la categoría, pasando el nombre del item para fallback por nombre dentro de la función
          const categoryName = await findCategoryName(catalogId, item.name || "");
          const normalizedName = (categoryName || "Sin categoría").toLowerCase().trim();

          console.log(`📦 Producto: ${item.name} | Categoría detectada: ${normalizedName}`);

          const esElegible =
            /\bbebidas?\b|\bfavoritos?\b|\bcalientes?\b|\brefrescantes?\b/.test(normalizedName);

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
            db.prepare(
              `
              INSERT INTO transacciones (cliente_id, fecha, puntos, motivo)
              VALUES (?, ?, ?, ?)
            `
            ).run(cliente.id, fecha, 1, `Compra de ${item.name} (${categoryName})`);

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
        console.error("❌ Error al procesar la orden:", err.message || err);
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
        // 🗑️ Eliminar cliente cuando se borra en Square
    if (event.type === "customer.deleted") {
      const customer = event.data.object.customer;
      const squareId = customer.id;

      try {
        const cliente = db.prepare("SELECT id FROM clientes WHERE square_id = ?").get(squareId);

        if (!cliente) {
          console.log(`ℹ️ Cliente con Square ID ${squareId} no existe localmente, nada que eliminar.`);
          return res.status(200).send("Cliente ya no existe localmente");
        }

        // 🧹 Eliminar transacciones asociadas
        db.prepare("DELETE FROM transacciones WHERE cliente_id = ?").run(cliente.id);

        // 🧹 Eliminar cliente local
        db.prepare("DELETE FROM clientes WHERE square_id = ?").run(squareId);

        console.log(`🗑️ Cliente eliminado localmente (${squareId}) tras eliminación en Square`);
      } catch (err) {
        console.error("❌ Error eliminando cliente por webhook:", err.message);
      }
    }

    res.status(200).send("OK ✅");
  } catch (err) {
    console.error("❌ Error procesando webhook:", err.message || err);
    res.status(500).send("Error interno");
  }
});

module.exports = router;
