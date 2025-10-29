// ==================================
// RUTAS DE CLIENTES
// ==================================
const express = require("express");
const router = express.Router();
const db = require("../database/db");

// ==========================
// Registrar nuevo cliente
// ==========================
router.post("/register", (req, res) => {
  const { nombre } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: "Falta el nombre del cliente." });
  }

  const query = `INSERT INTO clientes (nombre) VALUES (?)`;
  db.run(query, [nombre], function (err) {
    if (err) {
      console.error("❌ Error al registrar cliente:", err.message);
      return res.status(500).json({ error: "Error al registrar cliente." });
    }
    res.json({
      mensaje: "✅ Cliente registrado correctamente",
      id: this.lastID,
    });
  });
});

// ==========================
// Obtener lista de clientes
// ==========================
router.get("/", (req, res) => {
  const query = `SELECT * FROM clientes ORDER BY id DESC`;
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error("❌ Error al obtener clientes:", err.message);
      return res.status(500).json({ error: "Error al obtener clientes." });
    }
    res.json(rows);
  });
});

// ==========================
// Actualizar puntos de cliente
// ==========================
router.put("/:id/puntos", (req, res) => {
  const { id } = req.params;
  const { puntos, motivo } = req.body;

  if (typeof puntos !== "number") {
    return res.status(400).json({ error: "El valor de puntos debe ser numérico." });
  }

  // Registrar la transacción primero
  const fecha = new Date().toISOString();
  db.run(
    `INSERT INTO transacciones (cliente_id, fecha, puntos, motivo) VALUES (?, ?, ?, ?)`,
    [id, fecha, puntos, motivo || "Ajuste manual"],
    function (err) {
      if (err) {
        console.error("❌ Error al registrar transacción:", err.message);
        return res.status(500).json({ error: "Error al registrar transacción." });
      }

      // Actualizar el saldo de puntos en la tabla clientes
      db.run(
        `UPDATE clientes SET puntos = puntos + ? WHERE id = ?`,
        [puntos, id],
        function (err) {
          if (err) {
            console.error("❌ Error al actualizar puntos:", err.message);
            return res.status(500).json({ error: "Error al actualizar puntos." });
          }
          res.json({ mensaje: "✅ Puntos actualizados correctamente" });
        }
      );
    }
  );
});

// ==========================
// ❌ Eliminar cliente por ID
// ==========================
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  // Primero eliminar transacciones asociadas
  const deleteTransactions = `DELETE FROM transacciones WHERE cliente_id = ?`;
  db.run(deleteTransactions, [id], function (err) {
    if (err) {
      console.error("❌ Error eliminando transacciones:", err.message);
      return res.status(500).json({ error: "Error al eliminar transacciones." });
    }

    // Luego eliminar el cliente
    const deleteClient = `DELETE FROM clientes WHERE id = ?`;
    db.run(deleteClient, [id], function (err2) {
      if (err2) {
        console.error("❌ Error eliminando cliente:", err2.message);
        return res.status(500).json({ error: "Error al eliminar cliente." });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: "Cliente no encontrado." });
      }

      res.json({ mensaje: "🗑️ Cliente eliminado correctamente." });
    });
  });
});


module.exports = router;
