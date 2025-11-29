// backup-access.js
document.addEventListener("DOMContentLoaded", () => {
  const backupBtn = document.getElementById("backupAccessBtn");

  if (!backupBtn) return;

  backupBtn.addEventListener("click", (event) => {
    event.preventDefault(); // Evita ir a backup.html sin validar

    const userKey = prompt("🔐 Ingresa la clave maestra para acceder a Backups:");

    if (!userKey) return;

    // Clave que tienes en variables de entorno del servidor
    const ALLOWED_KEY = process.env.MASTER_KEY;

    if (userKey === ALLOWED_KEY) {
      window.location.href = "backup.html";
    } else {
      alert("❌ Clave incorrecta. Acceso denegado.");
    }
  });
});
