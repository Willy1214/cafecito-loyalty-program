// ===============================
// SERVIDOR PRINCIPAL
// ===============================
const express = require("express");
const cors = require("cors");
const path = require("path");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = 3000;
const SECRET_KEY = "Willy123"; // ⚠️ debe coincidir con users.js

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ===============================
// Middleware de autenticación
// ===============================
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token)
    return res.status(403).json({ error: "Acceso denegado. Falta token." });

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), SECRET_KEY);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido o expirado." });
  }
}

// ===============================
// Rutas
// ===============================
const userRoutes = require("./routes/users");
const customerRoutes = require("./routes/customers");
const transactionRoutes = require("./routes/transactions");

app.use("/api/users", userRoutes); // pública
app.use("/api/customers", verifyToken, customerRoutes); // protegida
app.use("/api/transactions", verifyToken, transactionRoutes); // protegida

// ===============================
// Servidor activo
// ===============================
app.listen(PORT, () =>
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`)
);
