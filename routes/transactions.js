// ==================================
// ROUTES: TRANSACTIONS (historial de puntos)
// ==================================
const express = require("express");
const router = express.Router();
const db = require("../database/db");

// ==========================
// 📋 Obtener TODAS las transacciones
// ==========================
router.get("/", (req, res) => {
  const query = `
    SELECT 
      t.id,
      c.nombre AS cliente_nombre,
      t.fecha,
      t.puntos,
      t.motivo
    FROM transacciones t
    JOIN clientes c ON t.cliente_id = c.id
    ORDER BY t.fecha DESC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener transacciones:", err.message);
      return res.status(500).json({ error: "Error al obtener transacciones." });
    }
    res.json(rows);
  });
});

// ==========================
// 📄 Obtener transacciones por cliente
// ==========================
router.get("/cliente/:id", (req, res) => {
  const clienteId = req.params.id;

  const query = `
    SELECT 
      t.id,
      t.fecha,
      t.puntos,
      t.motivo
    FROM transacciones t
    WHERE t.cliente_id = ?
    ORDER BY t.fecha DESC
  `;

  db.all(query, [clienteId], (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener transacciones del cliente:", err.message);
      return res.status(500).json({ error: "Error al obtener transacciones del cliente." });
    }
    res.json(rows);
  });
});

// ==========================
// 💰 Obtener total de puntos por cliente
// ==========================
router.get("/cliente/:id/total", (req, res) => {
  const clienteId = req.params.id;

  const query = `
    SELECT SUM(puntos) AS total_puntos
    FROM transacciones
    WHERE cliente_id = ?
  `;

  db.get(query, [clienteId], (err, row) => {
    if (err) {
      console.error("❌ Error al calcular total de puntos:", err.message);
      return res.status(500).json({ error: "Error al calcular total de puntos." });
    }
    res.json({ total_puntos: row.total_puntos || 0 });
  });
});

module.exports = router;
