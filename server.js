// ===============================
// 🌐 SERVIDOR PRINCIPAL
// ===============================
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const { WebSocketServer } = require("ws");
const fs = require("fs");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const { setSendUpdate } = require("./utils/sse");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "Willy123";

// ===============================
// 🧩 Rutas (importar antes del JSON parser)
// ===============================
const squareWebhook = require("./routes/square"); // Webhook SIN JSON parser
const userRoutes = require("./routes/users");
const customerRoutes = require("./routes/customers");
const transactionRoutes = require("./routes/transactions");
const { router: syncRoutes, syncClientes } = require("./routes/syncCustomers");

// ===============================
// 🪝 Webhook de Square (antes de express.json())
// ===============================
app.use("/api/square", squareWebhook);

// ===============================
// 🧩 Middlewares globales
// ===============================
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
// 🔐 Middleware para admins
// ===============================
function verifyAdmin(req, res, next) {
  if (!req.user || req.user.rol !== "admin") {
    return res.status(403).json({ error: "Solo un administrador puede realizar esta acción." });
  }
  next();
}

// ===============================
// 📦 BACKUP & RESTORE DE SQLITE
// ===============================
app.get("/backup-db", verifyToken, verifyAdmin, (req, res) => {
  const dbPath = path.join(__dirname, "database", "fidelidad.db");

  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: "No se encontró la base de datos." });
  }

  res.download(dbPath, "fidelidad-backup.db", (err) => {
    if (err) console.error("❌ Error al enviar backup:", err);
  });
});

app.post("/restore-db", verifyToken, verifyAdmin, upload.single("dbfile"), (req, res) => {
  const dbPath = path.join(__dirname, "database", "fidelidad.db");

  if (!req.file) {
    return res.status(400).json({ error: "No se subió ningún archivo." });
  }

  fs.rename(req.file.path, dbPath, (err) => {
    if (err) {
      console.error("❌ Error restaurando DB:", err);
      return res.status(500).json({ error: "Error restaurando base de datos." });
    }

    res.json({ mensaje: "Base de datos restaurada correctamente 🎉" });
  });
});

// ===============================
// 🔊 Server-Sent Events (SSE)
// ===============================
const sseClients = new Set();

app.get("/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.flushHeaders?.();
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  const client = { id: Date.now() + Math.random(), res };
  sseClients.add(client);

  req.on("close", () => {
    sseClients.delete(client);
  });
});

// Broadcast global
setSendUpdate((data) => {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  for (const c of sseClients) {
    try {
      c.res.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(c);
    }
  }
});

// ===============================
// 🛠️ Rutas principales
// ===============================
app.use("/api/users", userRoutes); // pública
app.use("/api/customers", verifyToken, customerRoutes);
app.use("/api/transactions", verifyToken, transactionRoutes);
app.use("/api/customers", syncRoutes);

// ===============================
// 🏠 Ruta raíz
// ===============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// ===============================
// ❌ catch-all 404
// ===============================
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// ===============================
// 🚀 Iniciar servidor + sincronización
// ===============================
(async () => {
  console.log("🔄 Sincronizando clientes iniciales desde Square...");
  try {
    await syncClientes();
    console.log("✅ Sincronización inicial completada.");
  } catch (err) {
    console.error("❌ Error durante la sincronización:", err.message);
  }

  app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
  });
})();
