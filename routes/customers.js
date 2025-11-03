// ==================================
// RUTAS DE CLIENTES (better-sqlite3 + Square Sync)
// ==================================
const express = require("express");
const router = express.Router();
const db = require("../database/db");
const squareClient = require("../config/squareClient"); // 👈 conexión a Square

// ==========================
// Registrar nuevo cliente
// ==========================
router.post("/register", async (req, res) => {
  try {
    const { nombre, email } = req.body;

    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "Falta el nombre del cliente." });
    }

    // 🧠 1️⃣ Crear cliente en Square primero
    const { customersApi } = squareClient;
    let squareId = null;

    try {
      const response = await customersApi.createCustomer({
        givenName: nombre.trim(),
        emailAddress: email || undefined,
      });
      squareId = response.result.customer.id;
      console.log(`✅ Cliente creado en Square: ${nombre} (${squareId})`);
    } catch (squareErr) {
      console.error("⚠️ Error creando cliente en Square:", squareErr.message);
      // Continuamos sin Square, pero avisamos
    }

    // 💾 2️⃣ Guardar cliente en la base de datos local
    const stmt = db.prepare("INSERT INTO clientes (nombre, square_id) VALUES (?, ?)");
    const result = stmt.run(nombre.trim(), squareId);

    res.json({
      mensaje: "✅ Cliente registrado correctamente",
      id: result.lastInsertRowid,
      square_id: squareId,
    });
  } catch (err) {
    console.error("❌ Error al registrar cliente:", err.message);
    res.status(500).json({ error: "Error al registrar cliente." });
  }
});

// ==========================
// Obtener lista de clientes
// ==========================
router.get("/", (req, res) => {
  try {
    const clientes = db.prepare("SELECT * FROM clientes ORDER BY id DESC").all();
    res.json(clientes);
  } catch (err) {
    console.error("❌ Error al obtener clientes:", err.message);
    res.status(500).json({ error: "Error al obtener clientes." });
  }
});

// ==========================
// Actualizar puntos de cliente
// ==========================
router.put("/:id/puntos", (req, res) => {
  try {
    const { id } = req.params;
    const { puntos, motivo } = req.body;

    if (typeof puntos !== "number") {
      return res.status(400).json({ error: "El valor de puntos debe ser numérico." });
    }

    const fecha = new Date().toISOString();

    // Registrar transacción
    const insertTrans = db.prepare(`
      INSERT INTO transacciones (cliente_id, fecha, puntos, motivo)
      VALUES (?, ?, ?, ?)
    `);
    insertTrans.run(id, fecha, puntos, motivo || "Ajuste manual");

    // Actualizar puntos del cliente
    const updateClient = db.prepare(`
      UPDATE clientes SET puntos = puntos + ? WHERE id = ?
    `);
    const result = updateClient.run(puntos, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Cliente no encontrado." });
    }

    res.json({ mensaje: "✅ Puntos actualizados correctamente" });
  } catch (err) {
    console.error("❌ Error al actualizar puntos:", err.message);
    res.status(500).json({ error: "Error al actualizar puntos." });
  }
});

// ==========================
// ❌ Eliminar cliente por ID
// ==========================
router.delete("/:id", (req, res) => {
  try {
    const { id } = req.params;

    const deleteTrans = db.prepare("DELETE FROM transacciones WHERE cliente_id = ?");
    deleteTrans.run(id);

    const deleteClient = db.prepare("DELETE FROM clientes WHERE id = ?");
    const result = deleteClient.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Cliente no encontrado." });
    }

    res.json({ mensaje: "🗑️ Cliente y sus transacciones eliminados correctamente." });
  } catch (err) {
    console.error("❌ Error eliminando cliente:", err.message);
    res.status(500).json({ error: "Error eliminando cliente." });
  }
});

module.exports = router;
