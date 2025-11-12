// ===============================
// 🌐 SERVIDOR PRINCIPAL
// ===============================
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "Willy123"; // ⚠️ Usa variable de entorno en producción

// ===============================
// 🧩 Rutas (importar antes de middlewares que parsean JSON)
// ===============================
const squareWebhook = require("./routes/square"); // ⚠️ Cargar antes del JSON parser
const userRoutes = require("./routes/users");
const customerRoutes = require("./routes/customers");
const transactionRoutes = require("./routes/transactions");
const { router: syncRoutes, syncClientes } = require("./routes/syncCustomers");

// ===============================
// 🪝 Ruta especial: Webhook de Square
// (Debe ir antes del express.json())
// ===============================
app.use("/api/square", squareWebhook);

// ===============================
// 🧩 Middlewares globales
// ===============================
app.use(cors({ origin: "*" }));
app.use(express.json()); // ⚠️ Ahora sí, después del webhook
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// 🔒 Middleware de autenticación
// ===============================
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(403).json({ error: "Acceso denegado. Falta token." });

  const token = authHeader.replace("Bearer ", "");

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
}

// ===============================
// 🛠️ Rutas principales
// ===============================
app.use("/api/users", userRoutes); // pública
app.use("/api/customers", verifyToken, customerRoutes); // protegida
app.use("/api/transactions", verifyToken, transactionRoutes); // protegida
app.use("/api/customers", syncRoutes);

// ===============================
// ⚠️ Ruta por defecto
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// ===============================
// 🚀 Iniciar servidor + sincronización automática
// ===============================
(async () => {
  console.log("🔄 Sincronizando clientes existentes desde Square...");
  try {
    await syncClientes();
    console.log("✅ Sincronización inicial completada.");
  } catch (err) {
    console.error("❌ Error durante la sincronización inicial:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
  });
})();
