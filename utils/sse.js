// utils/sse.js
let _sendUpdate = null;

function setSendUpdate(fn) {
  _sendUpdate = fn;
}

function sendUpdate(data) {
  try {
    if (typeof _sendUpdate === "function") {
      _sendUpdate(data);
    } else {
      console.warn("⚠️ sendUpdate no inicializado aún.");
    }
  } catch (err) {
    console.warn("⚠️ Error enviando SSE:", err.message || err);
  }
}

module.exports = {
  setSendUpdate,
  sendUpdate,
};
