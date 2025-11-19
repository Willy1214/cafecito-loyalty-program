// ===============================
// 🌟 Confirm Dialog Personalizado
// ===============================
window.confirmDialog = function (message) {
  return new Promise((resolve) => {
    // Crear fondo
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.4)";
    overlay.style.backdropFilter = "blur(3px)";
    overlay.style.zIndex = "9999";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";

    // Crear tarjeta
    const box = document.createElement("div");
    box.style.background = "white";
    box.style.padding = "25px";
    box.style.borderRadius = "12px";
    box.style.width = "320px";
    box.style.boxShadow = "0 8px 25px rgba(0,0,0,0.2)";
    box.style.textAlign = "center";
    box.style.fontFamily = "Arial";

    // Texto
    const p = document.createElement("p");
    p.textContent = message;
    p.style.marginBottom = "20px";
    p.style.fontSize = "16px";

    // Botón confirmar
    const yesBtn = document.createElement("button");
    yesBtn.textContent = "Sí, continuar";
    yesBtn.style.background = "#28a745";
    yesBtn.style.color = "white";
    yesBtn.style.border = "none";
    yesBtn.style.padding = "10px 18px";
    yesBtn.style.borderRadius = "8px";
    yesBtn.style.marginRight = "10px";
    yesBtn.style.cursor = "pointer";

    // Botón cancelar
    const noBtn = document.createElement("button");
    noBtn.textContent = "Cancelar";
    noBtn.style.background = "#dc3545";
    noBtn.style.color = "white";
    noBtn.style.border = "none";
    noBtn.style.padding = "10px 18px";
    noBtn.style.borderRadius = "8px";
    noBtn.style.cursor = "pointer";

    yesBtn.onclick = () => {
      overlay.remove();
      resolve(true);
    };

    noBtn.onclick = () => {
      overlay.remove();
      resolve(false);
    };

    box.appendChild(p);
    box.appendChild(yesBtn);
    box.appendChild(noBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
};
