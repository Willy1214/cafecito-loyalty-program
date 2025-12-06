// utils/sse.js - VERSIÓN MEJORADA
let _sendUpdate = null;
let clients = [];

// Configurar función de envío
function setSendUpdate(fn) {
  _sendUpdate = fn;
  console.log('✅ sendUpdate configurado correctamente');
}

// Enviar actualización a todos los clientes
function sendUpdate(data) {
  try {
    if (typeof _sendUpdate === "function") {
      _sendUpdate(data);
      console.log('📢 SSE enviado:', data.type || 'update');
    } else {
      console.warn("⚠️ sendUpdate no inicializado aún.");
      // Fallback: enviar a clients directamente si existen
      if (clients.length > 0) {
        broadcastToClients(data);
      }
    }
  } catch (err) {
    console.warn("⚠️ Error enviando SSE:", err.message || err);
  }
}

// Función para broadcast a clientes conectados
function broadcastToClients(data) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try {
      if (client && !client.destroyed) {
        client.write(message);
      }
    } catch (err) {
      console.warn('⚠️ Error enviando a cliente:', err.message);
    }
  });
}

// Agregar cliente a la lista
function addClient(res) {
  clients.push(res);
  console.log(`📡 Cliente SSE agregado. Total: ${clients.length}`);
  
  // Configurar headers SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Enviar mensaje de conexión
  res.write(`data: ${JSON.stringify({ type: 'connected', time: Date.now() })}\n\n`);
  
  // Mantener conexión con ping
  const pingInterval = setInterval(() => {
    if (!res.destroyed) {
      res.write(`data: ${JSON.stringify({ type: 'ping', time: Date.now() })}\n\n`);
    }
  }, 30000);
  
  // Limpiar al desconectar
  res.on('close', () => {
    clearInterval(pingInterval);
    const index = clients.indexOf(res);
    if (index > -1) {
      clients.splice(index, 1);
    }
    console.log(`📡 Cliente SSE desconectado. Restantes: ${clients.length}`);
  });
}

module.exports = {
  setSendUpdate,
  sendUpdate,
  addClient,
  broadcastToClients,
  getClientCount: () => clients.length
};