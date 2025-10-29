// ===============================
// SERVIDOR PRINCIPAL
// ===============================
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");
require("dotenv").config(); // 📦 Carga variables de entorno (.env)

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || "Willy123"; // 🔐 Usa variable de entorno si existe

// ===============================
// Middlewares
// ===============================
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // 📁 Archivos del frontend

// ===============================
// Middleware de autenticación
// ===============================
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) {
    return res.status(403).json({ error: "Acceso denegado. Falta token." });
  }

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ Token inválido:", err.message);
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
}

// ===============================
// Rutas principales
// ===============================
const userRoutes = require("./routes/users");
const customerRoutes = require("./routes/customers");
const transactionRoutes = require("./routes/transactions");

app.use("/api/users", userRoutes); // pública
app.use("/api/customers", verifyToken, customerRoutes); // protegida
app.use("/api/transactions", verifyToken, transactionRoutes); // protegida

// ===============================
// Ruta raíz (fallback para frontend)
// ===============================
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ===============================
// Servidor activo
// ===============================
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});
