// ===============================
// 🌐 SERVIDOR PRINCIPAL
// ===============================
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
const { createServer } = require("http"); // ← IMPORTANTE: Para WebSocket
const { WebSocketServer } = require("ws"); 
const { setSendUpdate, addClient } = require("./utils/sse"); // ← Importar addClient
require("dotenv").config();

const app = express();
const server = createServer(app); // ← Crear servidor HTTP
const PORT = process.env.PORT || 3000;

// 🚨 NO MÁS VALOR POR DEFECTO
if (!process.env.JWT_SECRET) {
  console.error("❌ ERROR: No se encontró JWT_SECRET en las variables de entorno.");
  process.exit(1);
}

const SECRET_KEY = process.env.JWT_SECRET;

// ===============================
// 🎯 CONFIGURAR WEBSOCKET SERVER
// ===============================
const wss = new WebSocketServer({ server });

// Configurar función para enviar actualizaciones vía WebSocket
const sendUpdateViaWS = (data) => {
  console.log('📢 Enviando a WebSockets:', data.type || 'update');
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      try {
        client.send(JSON.stringify(data));
      } catch (err) {
        console.warn('⚠️ Error enviando a WebSocket:', err.message);
      }
    }
  });
};

// Configurar sendUpdate en utils/sse
setSendUpdate(sendUpdateViaWS);

// Eventos WebSocket
wss.on('connection', (ws) => {
  console.log('🔌 Nuevo cliente WebSocket conectado');
  
  // Enviar mensaje de bienvenida
  ws.send(JSON.stringify({ 
    type: 'connected', 
    message: 'Conectado al servidor WebSocket',
    time: new Date().toISOString() 
  }));
  
  ws.on('error', (err) => {
    console.error('WebSocket error:', err);
  });
  
  ws.on('close', () => {
    console.log('🔌 Cliente WebSocket desconectado');
  });
});

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
// 📡 RUTA SSE (Event Source) - Para navegadores que no soportan WebSocket
// ===============================
app.get("/events", (req, res) => {
  console.log('📡 Nuevo cliente SSE (HTTP) conectado');
  addClient(res);
});

// ===============================
// 🧪 RUTA DE PRUEBA SSE
// ===============================
app.post("/api/test-sse", (req, res) => {
  console.log('🧪 Activando prueba SSE/WebSocket');
  
  // Enviar evento de prueba
  sendUpdateViaWS({
    type: 'test',
    message: 'Mensaje de prueba del servidor',
    timestamp: new Date().toISOString(),
    action: 'refresh'
  });
  
  res.json({ 
    success: true, 
    message: 'Evento de prueba enviado',
    clientCount: wss.clients.size
  });
});

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

  server.listen(PORT, () => { // ← Cambiado de app.listen a server.listen
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📡 WebSocket listo en ws://localhost:${PORT}`);
    console.log(`📡 SSE listo en http://localhost:${PORT}/events`);
    console.log(`👥 Clientes WebSocket conectados: ${wss.clients.size}`);
  });
})();