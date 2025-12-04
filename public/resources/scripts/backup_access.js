document.addEventListener("DOMContentLoaded", () => {
  const btnBackups = document.querySelector("#btnBackups");

  btnBackups.addEventListener("click", (e) => {
    e.preventDefault();
    showCustomKeyDialog();
  });

  async function showCustomKeyDialog() {
    // Usar nuestro inputDialog personalizado
    const masterKey = await inputDialog(
      "🔐 Ingresa tu clave maestra",
      "Introduce la clave de seguridad",
      ""
    );
    
    if (masterKey === null) {
      console.log("Acceso cancelado por el usuario");
      return;
    }
    
    if (!masterKey.trim()) {
      await showBootstrapErrorDialog("La clave no puede estar vacía.");
      return;
    }
    
    const loadingDialog = showBootstrapLoadingDialog("Verificando clave...");
    
    try {
      const res = await fetch("/api/backup/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: masterKey.trim() })
      });

      hideBootstrapLoadingDialog(loadingDialog);
      
      if (res.ok) {
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
        await showBootstrapErrorDialog(
          "❌ Clave incorrecta<br><br>Verifica que la clave ingresada sea la correcta e inténtalo nuevamente.",
          "Error de autenticación"
        );
      }
    } catch (err) {
      hideBootstrapLoadingDialog(loadingDialog);
      await showBootstrapErrorDialog(
        "⚠️ Error de conexión<br><br>No se pudo verificar la clave. Por favor, revisa tu conexión a internet e inténtalo nuevamente.",
        "Error de conexión"
      );
    }
  }

  // ===============================
  // 🌀 Loading Dialog con Bootstrap
  // ===============================
  function showBootstrapLoadingDialog(message = "Procesando...") {
    // Crear overlay
    const overlay = document.createElement("div");
    overlay.className = "modal-backdrop fade show";
    overlay.style.zIndex = "1040";
    
    // Crear modal
    const modal = document.createElement("div");
    modal.className = "modal fade show d-block";
    modal.style.zIndex = "1050";
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("role", "dialog");
    
    // Crear diálogo con responsive classes
    const modalDialog = document.createElement("div");
    modalDialog.className = "modal-dialog modal-dialog-centered";
    
    // Crear contenido
    const modalContent = document.createElement("div");
    modalContent.className = "modal-content border-0 shadow-lg";
    
    // Crear body
    const modalBody = document.createElement("div");
    modalBody.className = "modal-body text-center p-4 p-md-5";
    
    // Spinner de Bootstrap
    const spinner = document.createElement("div");
    spinner.className = "spinner-border text-primary mb-3";
    spinner.style.width = "3rem";
    spinner.style.height = "3rem";
    spinner.setAttribute("role", "status");
    
    const spinnerText = document.createElement("span");
    spinnerText.className = "visually-hidden";
    spinnerText.textContent = "Cargando...";
    spinner.appendChild(spinnerText);
    
    // Mensaje
    const messageEl = document.createElement("p");
    messageEl.className = "mb-0 fs-5 fw-medium text-dark";
    messageEl.textContent = message;
    
    // Para móviles, ajustar tamaño del texto
    if (window.innerWidth < 768) {
      messageEl.className = "mb-0 fs-6 fw-medium text-dark";
    }
    
    // Ensamblar
    modalBody.appendChild(spinner);
    modalBody.appendChild(messageEl);
    modalContent.appendChild(modalBody);
    modalDialog.appendChild(modalContent);
    modal.appendChild(modalDialog);
    
    // Agregar al DOM
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // Prevenir scroll
    document.body.style.overflow = "hidden";
    
    // Retornar objeto con referencia para cerrar
    return { overlay, modal };
  }
  
  function hideBootstrapLoadingDialog(dialog) {
    if (!dialog) return;
    
    // Remover con animación
    if (dialog.overlay) {
      dialog.overlay.classList.remove('show');
      setTimeout(() => {
        if (dialog.overlay.parentNode) {
          dialog.overlay.remove();
        }
      }, 150);
    }
    
    if (dialog.modal) {
      dialog.modal.classList.remove('show');
      setTimeout(() => {
        if (dialog.modal.parentNode) {
          dialog.modal.remove();
        }
      }, 150);
    }
    
    // Restaurar scroll
    document.body.style.overflow = "";
  }

  // ===============================
  // ❌ Error Dialog con Bootstrap
  // ===============================
  async function showBootstrapErrorDialog(message, title = "Error") {
    return new Promise((resolve) => {
      // Crear modal dinámico con Bootstrap
      const modalId = 'error-modal-' + Date.now();
      
      const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
              <div class="modal-header border-0 pb-0">
                <div class="w-100 text-center">
                  <div class="mb-3">
                    <i class="bi bi-exclamation-triangle-fill text-danger" style="font-size: 3rem;"></i>
                  </div>
                  <h5 class="modal-title fs-4 text-danger fw-bold">${title}</h5>
                </div>
                <button type="button" class="btn-close position-absolute top-0 end-0 m-3" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-center pt-0 px-4 px-md-5">
                <p class="text-muted fs-5 mb-4">${message}</p>
              </div>
              <div class="modal-footer border-0 justify-content-center pt-0 pb-4 px-4 px-md-5">
                <button type="button" class="btn btn-danger btn-lg px-4 px-md-5 fw-semibold" data-bs-dismiss="modal">
                  ${window.innerWidth < 768 ? 'OK' : 'Entendido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Crear y agregar al DOM
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = modalHTML;
      const modalElement = tempDiv.firstChild;
      document.body.appendChild(modalElement);
      
      // Inicializar modal de Bootstrap
      const errorModal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: true
      });
      
      // Mostrar modal
      errorModal.show();
      
      // Configurar eventos
      modalElement.addEventListener('hidden.bs.modal', () => {
        // Limpiar del DOM después de cerrar
        setTimeout(() => {
          if (modalElement.parentNode) {
            modalElement.remove();
          }
          resolve();
        }, 300);
      });
      
      // Manejar tecla Enter y Escape
      const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          errorModal.hide();
        }
      };
      
      modalElement.addEventListener('keydown', handleKeyDown);
      
      // Enfocar el botón para accesibilidad
      setTimeout(() => {
        const btn = modalElement.querySelector('.btn');
        if (btn) btn.focus();
      }, 100);
    });
  }

  // ===============================
  // ✅ Confirm Dialog con Bootstrap
  // ===============================
  async function showBootstrapConfirmDialog(message, options = {}) {
    return new Promise((resolve) => {
      const modalId = 'confirm-modal-' + Date.now();
      const {
        title = 'Confirmación',
        yesText = 'Sí',
        noText = 'No',
        yesColor = '#28a745'
      } = options;
      
      const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
              <div class="modal-header border-0 pb-0">
                <div class="w-100 text-center">
                  <div class="mb-3">
                    <i class="bi bi-question-circle-fill text-primary" style="font-size: 3rem;"></i>
                  </div>
                  <h5 class="modal-title fs-4 text-dark fw-bold">${title}</h5>
                </div>
                <button type="button" class="btn-close position-absolute top-0 end-0 m-3" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-center pt-0 px-4 px-md-5">
                <p class="text-muted fs-5 mb-4">${message.replace(/\n/g, '<br>')}</p>
              </div>
              <div class="modal-footer border-0 justify-content-center gap-3 pt-0 pb-4 px-4 px-md-5">
                <button type="button" class="btn btn-outline-secondary btn-lg px-4 px-md-5 fw-semibold" id="confirm-no-btn" data-bs-dismiss="modal">
                  ${noText}
                </button>
                <button type="button" class="btn btn-lg px-4 px-md-5 fw-semibold text-white" id="confirm-yes-btn" style="background-color: ${yesColor}; border-color: ${yesColor};" data-bs-dismiss="modal">
                  ${yesText}
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Crear y agregar al DOM
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = modalHTML;
      const modalElement = tempDiv.firstChild;
      document.body.appendChild(modalElement);
      
      // Inicializar modal
      const confirmModal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: true
      });
      
      // Mostrar modal
      confirmModal.show();
      
      // Configurar botones
      const yesBtn = modalElement.querySelector('#confirm-yes-btn');
      const noBtn = modalElement.querySelector('#confirm-no-btn');
      
      let result = false;
      
      const handleYes = () => {
        result = true;
        confirmModal.hide();
      };
      
      const handleNo = () => {
        result = false;
        confirmModal.hide();
      };
      
      yesBtn.addEventListener('click', handleYes);
      noBtn.addEventListener('click', handleNo);
      
      // Manejar teclado
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          handleNo();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          handleYes();
        }
      };
      
      modalElement.addEventListener('keydown', handleKeyDown);
      
      // Cuando se cierra el modal
      modalElement.addEventListener('hidden.bs.modal', () => {
        // Limpiar event listeners
        yesBtn.removeEventListener('click', handleYes);
        noBtn.removeEventListener('click', handleNo);
        modalElement.removeEventListener('keydown', handleKeyDown);
        
        // Limpiar del DOM
        setTimeout(() => {
          if (modalElement.parentNode) {
            modalElement.remove();
          }
          resolve(result);
        }, 300);
      });
      
      // Enfocar el botón de "No" por defecto (mejor UX)
      setTimeout(() => noBtn.focus(), 100);
    });
  }

  // ===============================
  // 🔐 Input Dialog con Bootstrap
  // ===============================
  async function showBootstrapInputDialog(title, message, defaultValue = '') {
    return new Promise((resolve) => {
      const modalId = 'input-modal-' + Date.now();
      
      const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content border-0 shadow-lg">
              <div class="modal-header border-0">
                <h5 class="modal-title fs-4 text-dark fw-bold w-100 text-center">${title}</h5>
                <button type="button" class="btn-close position-absolute top-0 end-0 m-3" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body px-4 px-md-5">
                <p class="text-muted mb-3">${message}</p>
                <div class="form-floating">
                  <input type="password" class="form-control form-control-lg" id="input-dialog-field" placeholder="Ingresa tu clave" value="${defaultValue}">
                  <label for="input-dialog-field">Clave maestra</label>
                </div>
                <div class="form-text mt-2">
                  <i class="bi bi-shield-lock me-1"></i>Esta clave es necesaria para acceder a los backups
                </div>
              </div>
              <div class="modal-footer border-0 justify-content-center gap-3 pt-0 pb-4 px-4 px-md-5">
                <button type="button" class="btn btn-outline-secondary btn-lg px-4 px-md-5 fw-semibold" data-bs-dismiss="modal">
                  Cancelar
                </button>
                <button type="button" class="btn btn-primary btn-lg px-4 px-md-5 fw-semibold" id="input-submit-btn">
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Crear y agregar al DOM
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = modalHTML;
      const modalElement = tempDiv.firstChild;
      document.body.appendChild(modalElement);
      
      // Inicializar modal
      const inputModal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: true
      });
      
      // Mostrar modal
      inputModal.show();
      
      // Elementos del DOM
      const inputField = modalElement.querySelector('#input-dialog-field');
      const submitBtn = modalElement.querySelector('#input-submit-btn');
      
      // Función para enviar resultado
      const submitResult = () => {
        const value = inputField.value.trim();
        inputModal.hide();
        resolve(value);
      };
      
      const cancelDialog = () => {
        inputModal.hide();
        resolve(null);
      };
      
      // Configurar eventos
      submitBtn.addEventListener('click', submitResult);
      
      inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submitResult();
        }
      });
      
      // Cuando se cierra el modal
      modalElement.addEventListener('hidden.bs.modal', () => {
        // Si se cerró sin hacer clic en continuar, devolver null
        if (!modalElement.dataset.submitted) {
          resolve(null);
        }
        
        // Limpiar del DOM
        setTimeout(() => {
          if (modalElement.parentNode) {
            modalElement.remove();
          }
        }, 300);
      });
      
      // Marcar cuando se envía
      submitBtn.addEventListener('click', () => {
        modalElement.dataset.submitted = 'true';
      });
      
      // Enfocar el input automáticamente
      setTimeout(() => {
        inputField.focus();
        inputField.select();
      }, 100);
    });
  }

  // Reemplazar las funciones originales por las de Bootstrap
  window.inputDialog = showBootstrapInputDialog;
  window.confirmDialog = showBootstrapConfirmDialog;
  window.showErrorDialog = showBootstrapErrorDialog;
});