// ===============================
// 🌟 Confirm Dialog Personalizado (Mejorado)
// ===============================
window.confirmDialog = function (message, options = {}) {
  return new Promise((resolve) => {
    // Configuración con opciones personalizables
    const config = {
      yesText: options.yesText || "Sí, continuar",
      noText: options.noText || "Cancelar",
      yesColor: options.yesColor || "#28a745",
      noColor: options.noColor || "#dc3545",
      title: options.title || null,
      width: options.width || "320px"
    };

    // Crear fondo con animación
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
    overlay.style.animation = "fadeIn 0.3s ease";

    // Crear tarjeta
    const box = document.createElement("div");
    box.style.background = "white";
    box.style.padding = "25px";
    box.style.borderRadius = "12px";
    box.style.width = config.width;
    box.style.boxShadow = "0 8px 25px rgba(0,0,0,0.2)";
    box.style.textAlign = "center";
    box.style.fontFamily = "Arial, sans-serif";
    box.style.animation = "slideIn 0.3s ease";

    // Icono opcional
    const icon = document.createElement("div");
    icon.style.fontSize = "42px";
    icon.style.marginBottom = "15px";
    icon.textContent = "❓";
    
    // Título opcional
    let titleElement = null;
    if (config.title) {
      titleElement = document.createElement("h3");
      titleElement.textContent = config.title;
      titleElement.style.marginTop = "0";
      titleElement.style.marginBottom = "10px";
      titleElement.style.color = "#333";
      titleElement.style.fontSize = "18px";
      titleElement.style.fontWeight = "600";
    }

    // Texto del mensaje
    const p = document.createElement("p");
    p.textContent = message;
    p.style.marginBottom = "25px";
    p.style.fontSize = "16px";
    p.style.color = "#555";
    p.style.lineHeight = "1.5";

    // Contenedor para botones
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = config.title ? "space-between" : "flex-end";
    buttonContainer.style.gap = "10px";
    buttonContainer.style.marginTop = "5px";

    // Botón cancelar (NO)
    const noBtn = document.createElement("button");
    noBtn.textContent = config.noText;
    noBtn.style.background = config.noColor;
    noBtn.style.color = "white";
    noBtn.style.border = "none";
    noBtn.style.padding = "10px 18px";
    noBtn.style.borderRadius = "8px";
    noBtn.style.cursor = "pointer";
    noBtn.style.fontWeight = "500";
    noBtn.style.transition = "all 0.3s ease";
    noBtn.style.flex = config.title ? "1" : "none";

    // Botón confirmar (SÍ)
    const yesBtn = document.createElement("button");
    yesBtn.textContent = config.yesText;
    yesBtn.style.background = config.yesColor;
    yesBtn.style.color = "white";
    yesBtn.style.border = "none";
    yesBtn.style.padding = "10px 18px";
    yesBtn.style.borderRadius = "8px";
    yesBtn.style.cursor = "pointer";
    yesBtn.style.fontWeight = "bold";
    yesBtn.style.transition = "all 0.3s ease";
    yesBtn.style.flex = config.title ? "1" : "none";

    // Efectos hover
    yesBtn.onmouseenter = () => {
      yesBtn.style.background = darkenColor(config.yesColor, 10);
      yesBtn.style.transform = "translateY(-2px)";
      yesBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    };
    
    yesBtn.onmouseleave = () => {
      yesBtn.style.background = config.yesColor;
      yesBtn.style.transform = "translateY(0)";
      yesBtn.style.boxShadow = "none";
    };
    
    noBtn.onmouseenter = () => {
      noBtn.style.background = darkenColor(config.noColor, 10);
      noBtn.style.transform = "translateY(-2px)";
      noBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    };
    
    noBtn.onmouseleave = () => {
      noBtn.style.background = config.noColor;
      noBtn.style.transform = "translateY(0)";
      noBtn.style.boxShadow = "none";
    };

    // Función para oscurecer color (para efectos hover)
    function darkenColor(color, percent) {
      const num = parseInt(color.slice(1), 16);
      const amt = Math.round(2.55 * percent);
      const R = (num >> 16) - amt;
      const G = (num >> 8 & 0x00FF) - amt;
      const B = (num & 0x0000FF) - amt;
      
      return "#" + (
        0x1000000 + 
        (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
        (B < 255 ? B < 1 ? 0 : B : 255)
      ).toString(16).slice(1);
    }

    // Función para cerrar con animación
    const closeDialog = (value) => {
      overlay.style.animation = "fadeOut 0.3s ease";
      box.style.animation = "slideOut 0.3s ease";
      
      setTimeout(() => {
        overlay.remove();
        resolve(value);
      }, 250);
    };

    // Eventos de teclado
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDialog(false);
      } else if (e.key === "Enter") {
        closeDialog(true);
      }
    });

    // Eventos de botones
    yesBtn.onclick = () => closeDialog(true);
    noBtn.onclick = () => closeDialog(false);

    // Cerrar al hacer clic fuera del cuadro
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeDialog(false);
      }
    };

    // Construir estructura
    if (config.title) {
      box.appendChild(titleElement);
    } else {
      box.appendChild(icon);
    }
    
    box.appendChild(p);
    buttonContainer.appendChild(noBtn);
    buttonContainer.appendChild(yesBtn);
    box.appendChild(buttonContainer);
    overlay.appendChild(box);

    // Agregar estilos de animación si no existen
    if (!document.getElementById("dialog-animations")) {
      const style = document.createElement("style");
      style.id = "dialog-animations";
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideIn {
          from { transform: translateY(-20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(-20px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(overlay);
    
    // Enfocar el botón "Sí" por defecto para navegación por teclado
    setTimeout(() => yesBtn.focus(), 100);
  });
};

// ===============================
// 📱 Versión responsiva opcional
// ===============================
window.confirmDialog.responsive = function(message, options = {}) {
  const defaultOptions = {
    ...options,
    width: window.innerWidth < 500 ? "90vw" : (options.width || "320px")
  };
  
  return window.confirmDialog(message, defaultOptions);
};