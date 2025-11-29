// routes/backup.js
// ===============================
// 📦 RUTAS DE BACKUP Y RESTORE DE SQLITE
// ===============================

const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");

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
// 📤 DOWNLOAD (backup)
// ===============================
router.get("/download", (req, res) => {
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: "No existe la base de datos." });
  }

  const now = new Date();
  const fecha = now
    .toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "-")
    .replace(/\..+/, "");

  const filename = `backup-fidelidad-${fecha}.db`;

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/octet-stream");

  const fileStream = fs.createReadStream(dbPath);
  fileStream.pipe(res);
});

// ===============================
// 📥 RESTORE (subir backup) — Con clave secreta
// ===============================
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, backupsDir),
    filename: (req, file, cb) => cb(null, "restore.db")
  })
});

router.post("/restore", upload.single("dbfile"), (req, res) => {
  const uploaded = path.join(backupsDir, "restore.db");

  // 🔐 Clave secreta (cámbiala si quieres)
  const SECRET_KEY = "Cafecito2025Secret";

  if (req.body.restoreKey !== SECRET_KEY) {
    return res.status(403).json({ error: "Clave de restauración inválida." });
  }

  if (!fs.existsSync(uploaded)) {
    return res.status(400).json({ error: "No se subió archivo." });
  }

  try {
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
