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
// 🔐 Verificar Clave Maestra
// ===============================
router.post("/verify-key", express.json(), (req, res) => {
  const MASTER_KEY = process.env.JWT_SECRET;
  const { key } = req.body;

  if (!key) {
    return res.status(400).json({ error: "Clave requerida." });
  }

  if (key !== MASTER_KEY) {
    return res.status(401).json({ error: "Clave incorrecta." });
  }

  res.json({ ok: true });
});

// ===============================
// 📤 DOWNLOAD (backup)
// ===============================
router.get("/download", (req, res) => {
  if (!fs.existsSync(dbPath)) {
    return res.status(404).json({ error: "No existe la base de datos." });
  }

  const now = new Date();
  const fecha = now.toISOString().replace(/T/, "_").replace(/:/g, "-").replace(/\..+/, "");
  const filename = `backup-fidelidad-${fecha}.db`;

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/octet-stream");

  fs.createReadStream(dbPath).pipe(res);
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

router.post("/restore", upload.single("dbfile"), (req, res) => {
  const uploaded = path.join(backupsDir, "restore.db");

  const SECRET_KEY = process.env.MASTER_BACKUP_KEY || "Cafecito2025Secret";

  if (req.body.restoreKey !== SECRET_KEY) {
    return res.status(403).json({ error: "Clave de restauración inválida." });
  }

  if (!fs.existsSync(uploaded)) {
    return res.status(400).json({ error: "No se subió archivo." });
  }

  try {
    fs.copyFileSync(uploaded, dbPath);
    res.json({ ok: true, message: "Base de datos restaurada correctamente." });
  } catch (err) {
    console.error("❌ Error restaurando DB:", err);
    res.status(500).json({ error: "Error restaurando la base de datos." });
  }
});

module.exports = router;
