// resources/scripts/backup-access.js
document.addEventListener("DOMContentLoaded", () => {
  const backupBtn = document.getElementById("backupAccessBtn");
  if (!backupBtn) return;

  backupBtn.addEventListener("click", async (event) => {
    event.preventDefault(); // no navegar todavía

    const key = prompt("🔐 Ingresa la clave maestra para acceder a Backups:");
    if (!key) {
      // canceló o vacío
      return;
    }

    // Construir URL base (usa la misma lógica que usas en otros scripts)
    const API_BASE = window.API_BASE || (
      window.location.hostname.includes("localhost")
        ? "http://localhost:3000"
        : window.location.origin // si frontend y backend están juntos, esto apunta al mismo host
    );

    try {
      const res = await fetch(`${API_BASE}/api/backup/verify-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });

      if (!res.ok) {
        // posible 401 o 400
        const err = await res.json().catch(()=>({error: "Clave inválida"}));
        alert("❌ Clave incorrecta: " + (err.error || "Intenta de nuevo"));
        return;
      }

      // ok -> permitir entrada
      window.location.href = "backup.html";
    } catch (err) {
      console.error("Error verificando clave:", err);
      alert("Error conectando con el servidor. Intenta de nuevo.");
    }
  });
});
