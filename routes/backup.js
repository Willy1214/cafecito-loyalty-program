// routes/backup.js
// ===============================
// 📦 RUTAS DE BACKUP Y RESTORE DE SQLITE
// ===============================

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const jwt = require("jsonwebtoken");

// Path real de tu base
const dbPath = path.resolve(__dirname, "../database/fidelidad.db");

// Carpeta donde se guardarán backups subidos
const backupsDir = path.resolve(__dirname, "../backups");

// Crear carpeta automáticamente si no existe
if (!fs.existsSync(backupsDir)) {
  fs.mkdirSync(backupsDir);
  console.log("📁 Carpeta 'backups' creada automáticamente.");
}

// ===============================
// 🔒 Middleware para verificar JWT
// (opción A que elegiste)
// ===============================
function verifyToken(req, res, next) {
  const header = req.headers["authorization"];
  if (!header) return res.status(403).json({ error: "Falta token" });

  const token = header.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "Willy123");
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token inválido" });
  }
}

// ===============================
// 📤 DOWNLOAD (backup) — Versión robusta
// ===============================
router.get("/download", verifyToken, (req, res) => {
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: "No existe la base de datos." });
  }

  const now = new Date();

  // 🔥 Formato seguro que RESPETA la fecha siempre
  const fecha = now.toISOString().replace(/T/, "_").replace(/:/g, "-").replace(/\..+/, "");
  // Ejemplo: 2025-11-28_18-52-41

  const filename = `backup-fidelidad-${fecha}.db`;

  // 🛑 IMPORTANTE: poner headers manualmente (algunos navegadores lo requieren)
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/octet-stream");

  const fileStream = fs.createReadStream(dbPath);
  fileStream.pipe(res);
});


// ===============================
// 📥 RESTORE (subir backup)
// ===============================
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, backupsDir),
    filename: (req, file, cb) => cb(null, "restore.db")
  })
});

router.post("/restore", verifyToken, upload.single("dbfile"), (req, res) => {
  const uploaded = path.join(backupsDir, "restore.db");

  if (!fs.existsSync(uploaded)) {
    return res.status(400).json({ error: "No se subió archivo." });
  }

  try {
    // Reemplazar DB actual con la subida
    fs.copyFileSync(uploaded, dbPath);

    res.json({
      ok: true,
      message: "Base de datos restaurada correctamente."
    });
  } catch (err) {
    console.error("❌ Error restaurando DB:", err);
    res.status(500).json({ error: "Error restaurando la base de datos." });
  }
});

module.exports = router;
