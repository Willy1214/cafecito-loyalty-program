// ==================================
// RUTAS DE USUARIOS (registro y login)
// ==================================
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database/db");

const router = express.Router();
const SECRET_KEY = "Willy123"; // ⚠️ cámbiala en producción

// ==========================
// REGISTRO DE USUARIO
// ==========================
router.post("/register", (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: "Faltan datos obligatorios." });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const query = `INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)`;
  db.run(query, [nombre, email, hashedPassword], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(400).json({ error: "El email ya está registrado." });
      }
      return res.status(500).json({ error: "Error al registrar usuario." });
    }
    res.json({ mensaje: "✅ Usuario registrado correctamente", id: this.lastID });
  });
});

// ==========================
// LOGIN DE USUARIO
// ==========================
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Faltan credenciales." });
  }

  const query = `SELECT * FROM usuarios WHERE email = ?`;
  db.get(query, [email], (err, user) => {
    if (err) return res.status(500).json({ error: "Error en el servidor." });
    if (!user) return res.status(401).json({ error: "Usuario no encontrado." });

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
  });
});

module.exports = router;
