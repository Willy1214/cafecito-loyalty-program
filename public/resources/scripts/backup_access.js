document.addEventListener("DOMContentLoaded", () => {
  const btnBackups = document.querySelector("#btnBackups");
  const keyModal = new bootstrap.Modal(document.getElementById("masterKeyModal"));

  btnBackups.addEventListener("click", (e) => {
    e.preventDefault();
    
    // Mostrar nuestro diálogo personalizado en lugar del modal de Bootstrap
    showCustomKeyDialog();
  });

  async function showCustomKeyDialog() {
    // Usar nuestro inputDialog personalizado
    const masterKey = await inputDialog(
      "🔐 Ingresa tu clave maestra",
      "Introduce la clave de seguridad",
      ""
    );
    
    // Si el usuario canceló o cerró el diálogo
    if (masterKey === null) {
      console.log("Acceso cancelado por el usuario");
      return;
    }
    
    // Si la clave está vacía
    if (!masterKey.trim()) {
      await showErrorDialog("La clave no puede estar vacía.");
      return;
    }
    
    // Mostrar diálogo de carga mientras verificamos
    const loadingDialog = await showLoadingDialog("Verificando clave...");
    
    try {
      const res = await fetch("/api/backup/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: masterKey.trim() })
      });

      loadingDialog.close();
      
      if (res.ok) {
        // Mostrar confirmación de éxito
        const proceed = await confirmDialog(
          "✅ Clave verificada correctamente\n\n¿Deseas acceder a la sección de backups?",
          {
            yesText: "Acceder ahora",
            noText: "Cancelar",
            yesColor: "#28a745",
            title: "Acceso autorizado"
          }
        );
        
        if (proceed) {
          window.location.href = "backup.html";
        }
      } else {
        await showErrorDialog(
          "❌ Clave incorrecta\n\nVerifica que la clave ingresada sea la correcta e inténtalo nuevamente.",
          "Error de autenticación"
        );
      }
    } catch (err) {
      loadingDialog.close();
      await showErrorDialog(
        "⚠️ Error de conexión\n\nNo se pudo verificar la clave. Por favor, revisa tu conexión a internet e inténtalo nuevamente.",
        "Error de conexión"
      );
    }
  }

  // ===============================
  // 🌀 Loading Dialog Personalizado
  // ===============================
  function showLoadingDialog(message = "Procesando...") {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "rgba(0,0,0,0.6)";
      overlay.style.backdropFilter = "blur(4px)";
      overlay.style.zIndex = "10000";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.animation = "fadeIn 0.3s ease";

      const box = document.createElement("div");
      box.style.background = "white";
      box.style.padding = "30px";
      box.style.borderRadius = "12px";
      box.style.width = "300px";
      box.style.boxShadow = "0 10px 30px rgba(0,0,0,0.3)";
      box.style.textAlign = "center";
      box.style.fontFamily = "Arial, sans-serif";
      box.style.animation = "slideIn 0.3s ease";

      // Spinner
      const spinner = document.createElement("div");
      spinner.style.width = "50px";
      spinner.style.height = "50px";
      spinner.style.margin = "0 auto 20px";
      spinner.style.border = "4px solid #f3f3f3";
      spinner.style.borderTop = "4px solid #3498db";
      spinner.style.borderRadius = "50%";
      spinner.style.animation = "spin 1s linear infinite";

      // Texto
      const text = document.createElement("p");
      text.textContent = message;
      text.style.margin = "0";
      text.style.color = "#333";
      text.style.fontSize = "16px";
      text.style.fontWeight = "500";

      // Agregar animación de spinner si no existe
      if (!document.getElementById("spinner-animation")) {
        const style = document.createElement("style");
        style.id = "spinner-animation";
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }

      box.appendChild(spinner);
      box.appendChild(text);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      // Retornar objeto con método para cerrar
      resolve({
        close: () => {
          overlay.style.animation = "fadeOut 0.3s ease";
          setTimeout(() => overlay.remove(), 250);
        }
      });
    });
  }

  // ===============================
  // ❌ Error Dialog Personalizado
  // ===============================
  async function showErrorDialog(message, title = "Error") {
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.background = "rgba(0,0,0,0.5)";
      overlay.style.backdropFilter = "blur(3px)";
      overlay.style.zIndex = "10000";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.animation = "fadeIn 0.3s ease";

      const box = document.createElement("div");
      box.style.background = "white";
      box.style.padding = "25px";
      box.style.borderRadius = "12px";
      box.style.width = "350px";
      box.style.boxShadow = "0 8px 25px rgba(0,0,0,0.2)";
      box.style.textAlign = "center";
      box.style.fontFamily = "Arial, sans-serif";
      box.style.animation = "slideIn 0.3s ease";

      // Icono de error
      const icon = document.createElement("div");
      icon.style.fontSize = "48px";
      icon.style.marginBottom = "15px";
      icon.textContent = "❌";
      icon.style.color = "#dc3545";

      // Título
      const titleEl = document.createElement("h3");
      titleEl.textContent = title;
      titleEl.style.margin = "0 0 10px 0";
      titleEl.style.color = "#dc3545";
      titleEl.style.fontSize = "20px";
      titleEl.style.fontWeight = "600";

      // Mensaje
      const messageEl = document.createElement("p");
      messageEl.textContent = message;
      messageEl.style.margin = "0 0 25px 0";
      messageEl.style.color = "#555";
      messageEl.style.fontSize = "15px";
      messageEl.style.lineHeight = "1.5";
      messageEl.style.whiteSpace = "pre-line";

      // Botón OK
      const okBtn = document.createElement("button");
      okBtn.textContent = "Entendido";
      okBtn.style.background = "#dc3545";
      okBtn.style.color = "white";
      okBtn.style.border = "none";
      okBtn.style.padding = "10px 25px";
      okBtn.style.borderRadius = "8px";
      okBtn.style.cursor = "pointer";
      okBtn.style.fontWeight = "bold";
      okBtn.style.transition = "all 0.3s ease";

      // Efecto hover
      okBtn.onmouseenter = () => {
        okBtn.style.background = "#c82333";
        okBtn.style.transform = "translateY(-2px)";
      };
      
      okBtn.onmouseleave = () => {
        okBtn.style.background = "#dc3545";
        okBtn.style.transform = "translateY(0)";
      };

      // Evento de cierre
      const closeDialog = () => {
        overlay.style.animation = "fadeOut 0.3s ease";
        box.style.animation = "slideOut 0.3s ease";
        
        setTimeout(() => {
          overlay.remove();
          resolve();
        }, 250);
      };

      okBtn.onclick = closeDialog;
      overlay.onclick = (e) => {
        if (e.target === overlay) closeDialog();
      };

      // Evento de teclado
      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape" || e.key === "Enter") {
          closeDialog();
        }
      });

      box.appendChild(icon);
      box.appendChild(titleEl);
      box.appendChild(messageEl);
      box.appendChild(okBtn);
      overlay.appendChild(box);
      document.body.appendChild(overlay);

      // Enfocar el botón
      setTimeout(() => okBtn.focus(), 100);
    });
  }

  // Si aún quieres mantener el modal de Bootstrap como opción alternativa
  // puedes agregar esta función para compatibilidad
  function setupBootstrapModalFallback() {
    const verifyKeyBtn = document.getElementById("verifyKeyBtn");
    if (verifyKeyBtn) {
      verifyKeyBtn.addEventListener("click", async () => {
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
            window.location.href = "backup.html";
          } else {
            error.textContent = "Clave incorrecta.";
          }
        } catch (err) {
          error.textContent = "Error de conexión.";
        }
      });
    }
  }
  
  // Opcional: Configurar fallback
  setupBootstrapModalFallback();
});