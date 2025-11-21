// ==================================
// RUTAS DE USUARIOS (registro y login)
// ==================================
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../database/db");

const router = express.Router();
const SECRET_KEY = process.env.JWT_SECRET || "Willy123"; // 🔐 usa variable de entorno en producción

// ==========================
// REGISTRO DE USUARIO
// ==========================
router.post("/register", (req, res) => {
  try {
    const { nombre, email, password } = req.body;

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    // Verificar si el email ya existe
    const existingUser = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);
    if (existingUser) {
      return res.status(400).json({ error: "El email ya está registrado." });
    }

    // Encriptar la contraseña
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insertar nuevo usuario
    const stmt = db.prepare("INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)");
    const result = stmt.run(nombre, email, hashedPassword);

    res.json({
      mensaje: "✅ Usuario registrado correctamente",
      id: result.lastInsertRowid,
    });
  } catch (err) {
    console.error("❌ Error al registrar usuario:", err.message);
    res.status(500).json({ error: "Error al registrar usuario." });
  }
});

// ==========================
// LOGIN DE USUARIO
// ==========================
router.post("/login", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Faltan credenciales." });
    }

    const user = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);

    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado." });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Contraseña incorrecta." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, rol: user.rol },
      SECRET_KEY,
      { expiresIn: "2h" }
    );

    res.json({
      mensaje: "✅ Login exitoso",
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
      },
    });
  } catch (err) {
    console.error("❌ Error en el login:", err.message);
    res.status(500).json({ error: "Error en el servidor." });
  }
});

// ==========================
// CREAR ADMIN CON CLAVE MAESTRA
// ==========================
router.post("/create-admin", (req, res) => {
  try {
    const { nombre, email, password, masterKey } = req.body;
    const MASTER_KEY = process.env.MASTER_KEY || "CafecitoMaster123"; // 🔐 cámbiala en producción

    if (masterKey !== MASTER_KEY) {
      return res.status(403).json({ error: "Clave maestra incorrecta." });
    }

    if (!nombre || !email || !password) {
      return res.status(400).json({ error: "Faltan datos obligatorios." });
    }

    const existing = db.prepare("SELECT * FROM usuarios WHERE email = ?").get(email);
    if (existing) {
      return res.status(400).json({ error: "El usuario ya existe." });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(
      "INSERT INTO usuarios (nombre, email, password, rol) VALUES (?, ?, ?, ?)"
    );
    const result = stmt.run(nombre, email, hashed, "admin");

    res.json({
      mensaje: "✅ Usuario administrador creado correctamente",
      id: result.lastInsertRowid,
    });
  } catch (err) {
    console.error("❌ Error al crear admin:", err.message);
    res.status(500).json({ error: "Error en el servidor." });
  }
});


module.exports = router;
