document.addEventListener("DOMContentLoaded", () => {
  const btnBackups = document.querySelector("#btnBackups");
  const keyModal = new bootstrap.Modal(document.getElementById("masterKeyModal"));

  btnBackups.addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("masterKeyInput").value = "";
    document.getElementById("keyError").textContent = "";
    keyModal.show();
  });

  document.getElementById("verifyKeyBtn").addEventListener("click", async () => {
    const key = document.getElementById("masterKeyInput").value.trim();
    const error = document.getElementById("keyError");

    if (!key) {
      error.textContent = "La clave no puede estar vacía.";
      return;
    }

    try {
      const res = await fetch("/api/backup/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key })
      });

      if (res.ok) {
        // Acceso concedido
        window.location.href = "backup.html";
      } else {
        error.textContent = "Clave incorrecta.";
      }
    } catch (err) {
      error.textContent = "Error de conexión.";
    }
  });
});
