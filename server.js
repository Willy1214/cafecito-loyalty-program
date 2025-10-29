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
// 🧩 Middlewares
// ===============================
app.use(cors({
  origin: "*", // Puedes restringir esto a tu dominio si quieres más seguridad
}));
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
const userRoutes = require("./routes/users");
const customerRoutes = require("./routes/customers");
const transactionRoutes = require("./routes/transactions");

app.use("/api/users", userRoutes); // pública
app.use("/api/customers", verifyToken, customerRoutes); // protegida
app.use("/api/transactions", verifyToken, transactionRoutes); // protegida

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
// 🚀 Iniciar servidor
// ===============================
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en el puerto ${PORT}`);
});
