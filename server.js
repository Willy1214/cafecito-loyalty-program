// ===============================
// 🌐 SERVIDOR PRINCIPAL
// ===============================
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const { WebSocketServer } = require("ws"); 
const { setSendUpdate } = require("./utils/sse");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// 🚨 NO MÁS VALOR POR DEFECTO
if (!process.env.JWT_SECRET) {
  console.error("❌ ERROR: No se encontró JWT_SECRET en las variables de entorno.");
  process.exit(1);
}

const SECRET_KEY = process.env.JWT_SECRET;

// DEBUG (elimina esto después)
console.log("🔐 JWT_SECRET cargado:", SECRET_KEY);

// ===============================
// 🧩 Rutas (importar antes del JSON parser)
// ===============================
const squareWebhook = require("./routes/square");
const userRoutes = require("./routes/users");
const customerRoutes = require("./routes/customers");
const transactionRoutes = require("./routes/transactions");
const backupRoutes = require("./routes/backup");
const { router: syncRoutes, syncClientes } = require("./routes/syncCustomers");

// ===============================
// 🪝 Webhook antes del JSON parser
// ===============================
app.use("/api/square", squareWebhook);

app.use(cors({ origin: "*" }));
app.use(express.json());
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
app.use("/api/users", userRoutes);
app.use("/api/customers", verifyToken, customerRoutes);
app.use("/api/transactions", verifyToken, transactionRoutes);
app.use("/api/backup", backupRoutes);
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
// 🚀 Iniciar servidor + sincronización
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
