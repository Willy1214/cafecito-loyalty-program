// utils/ordenesCache.js
// Cache en memoria para marcar ordenes procesadas durante la ejecución
const ordenesProcesadas = new Set();

module.exports = {
  has(orderId) {
    return ordenesProcesadas.has(orderId);
  },
  add(orderId) {
    ordenesProcesadas.add(orderId);
  },
  remove(orderId) {
    ordenesProcesadas.delete(orderId);
  },
  clear() {
    ordenesProcesadas.clear();
  },
};
