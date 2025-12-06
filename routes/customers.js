// ==================================
// RUTAS DE CLIENTES (better-sqlite3 + Square Sync)
// ==================================
const express = require("express");
const router = express.Router();
const database = require("../database/db");
const db = database.db;
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
// Actualizar puntos de cliente (sumar o restar) - CON USUARIO_ID
// ==========================
router.put("/:id/puntos", (req, res) => {
  try {
    const { id } = req.params;
    const { puntos, motivo } = req.body;

    // 🔐 OBTENER USUARIO EN SESIÓN
    const usuarioId = req.user?.id;
    
    if (!usuarioId) {
      return res.status(401).json({ error: "Usuario no autenticado." });
    }

    if (typeof puntos !== "number") {
      return res.status(400).json({ error: "El valor de puntos debe ser numérico." });
    }

    // 🧠 Verificar si el cliente existe
    const cliente = db.prepare("SELECT * FROM clientes WHERE id = ?").get(id);
    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado." });
    }

    // ⚠️ Si es una resta (canje), validar que tenga puntos suficientes
    if (puntos < 0 && cliente.puntos < Math.abs(puntos)) {
      return res.status(400).json({ error: "El cliente no tiene suficientes puntos para canjear." });
    }

    const fecha = new Date().toISOString();

    // 💾 Registrar transacción CON usuario_id
    db.prepare(`
      INSERT INTO transacciones (cliente_id, usuario_id, fecha, puntos, motivo)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, usuarioId, fecha, puntos, motivo || (puntos > 0 ? "Bonus" : "Canje de producto"));

    // 🔁 Actualizar puntos del cliente
    db.prepare(`
      UPDATE clientes SET puntos = puntos + ? WHERE id = ?
    `).run(puntos, id);

    res.json({
      mensaje: puntos > 0
        ? "✅ Puntos agregados correctamente."
        : "🎁 Canje registrado correctamente.",
    });

  } catch (err) {
    console.error("❌ Error al actualizar puntos:", err.message);
    res.status(500).json({ error: "Error al actualizar puntos." });
  }
});

// ==========================
// ❌ Eliminar cliente por ID (sincronizado con Square)
// ==========================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 Buscar el cliente localmente para obtener su square_id
    const cliente = db.prepare("SELECT square_id FROM clientes WHERE id = ?").get(id);

    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado." });
    }

    // 🚮 Intentar eliminar en Square (si tiene square_id)
    if (cliente.square_id) {
      const { customersApi } = squareClient;
      try {
        await customersApi.deleteCustomer(cliente.square_id);
        console.log(`🗑️ Cliente eliminado en Square (${cliente.square_id})`);
      } catch (squareErr) {
        console.warn("⚠️ No se pudo eliminar en Square:", squareErr.message);
      }
    }

    // 🧹 Eliminar transacciones asociadas
    db.prepare("DELETE FROM transacciones WHERE cliente_id = ?").run(id);

    // 🧹 Eliminar cliente local
    const result = db.prepare("DELETE FROM clientes WHERE id = ?").run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Cliente no encontrado." });
    }

    res.json({ mensaje: "🗑️ Cliente eliminado localmente y en Square (si aplicaba)." });
  } catch (err) {
    console.error("❌ Error eliminando cliente:", err.message);
    res.status(500).json({ error: "Error eliminando cliente." });
  }
});

// ==========================
// 🆕 Sincronizar puntos con Square (si aplica)
// ==========================
router.post("/:id/sync-square", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener datos del cliente
    const cliente = db.prepare("SELECT * FROM clientes WHERE id = ?").get(id);
    
    if (!cliente) {
      return res.status(404).json({ error: "Cliente no encontrado." });
    }

    // Solo sincronizar si tiene square_id
    if (!cliente.square_id) {
      return res.json({ 
        mensaje: "Cliente no tiene ID de Square, no se requiere sincronización." 
      });
    }

    const { customersApi } = squareClient;
    
    // Actualizar notas del cliente en Square con los puntos actuales
    try {
      await customersApi.updateCustomer(cliente.square_id, {
        note: `Puntos de fidelidad: ${cliente.puntos}`,
        version: await getCustomerVersion(cliente.square_id)
      });
      
      console.log(`🔄 Puntos sincronizados con Square para ${cliente.nombre}: ${cliente.puntos}`);
      
      res.json({ 
        mensaje: `Puntos sincronizados con Square: ${cliente.puntos} puntos`,
        success: true 
      });
      
    } catch (squareErr) {
      console.error("❌ Error sincronizando con Square:", squareErr.message);
      res.status(500).json({ error: "Error al sincronizar con Square." });
    }

  } catch (err) {
    console.error("❌ Error en sync-square:", err.message);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ==========================
// 🆕 Función auxiliar para obtener versión del cliente en Square
// ==========================
async function getCustomerVersion(squareId) {
  try {
    const { customersApi } = squareClient;
    const response = await customersApi.retrieveCustomer(squareId);
    return response.result.customer.version;
  } catch (err) {
    console.error("❌ Error obteniendo versión del cliente:", err.message);
    return 0; // Valor por defecto
  }
}

module.exports = router;