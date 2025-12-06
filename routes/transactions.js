// ==================================
// ROUTES: TRANSACTIONS (historial de puntos)
// ==================================
const express = require("express");
const router = express.Router();
const database = require("../database/db");
const db = database.db;

// ==========================
// 📋 Obtener TODAS las transacciones
// ==========================
router.get("/", (req, res) => {
  try {
    const query = `
      SELECT 
        t.id,
        t.cliente_id,
        t.usuario_id,
        c.nombre AS cliente_nombre,
        u.nombre AS usuario_nombre,
        t.fecha,
        t.puntos,
        t.motivo
      FROM transacciones t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      ORDER BY t.fecha DESC
    `;
    const transacciones = db.prepare(query).all();
    res.json(transacciones);
  } catch (err) {
    console.error("❌ Error al obtener transacciones:", err.message);
    res.status(500).json({ error: "Error al obtener transacciones." });
  }
});

// ==========================
// 📄 Obtener transacciones por cliente
// ==========================
router.get("/cliente/:id", (req, res) => {
  try {
    const clienteId = req.params.id;

    const query = `
      SELECT 
        t.id,
        t.cliente_id,
        t.usuario_id,
        c.nombre AS cliente_nombre,
        u.nombre AS usuario_nombre,
        t.fecha,
        t.puntos,
        t.motivo
      FROM transacciones t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.cliente_id = ?
      ORDER BY t.fecha DESC
    `;

    const transacciones = db.prepare(query).all(clienteId);
    res.json(transacciones);
  } catch (err) {
    console.error("❌ Error al obtener transacciones del cliente:", err.message);
    res.status(500).json({ error: "Error al obtener transacciones del cliente." });
  }
});

// ==========================
// 💰 Obtener total de puntos por cliente
// ==========================
router.get("/cliente/:id/total", (req, res) => {
  try {
    const clienteId = req.params.id;

    const query = `
      SELECT IFNULL(SUM(puntos), 0) AS total_puntos
      FROM transacciones
      WHERE cliente_id = ?
    `;

    const result = db.prepare(query).get(clienteId);
    res.json({ total_puntos: result.total_puntos });
  } catch (err) {
    console.error("❌ Error al calcular total de puntos:", err.message);
    res.status(500).json({ error: "Error al calcular total de puntos." });
  }
});

module.exports = router;