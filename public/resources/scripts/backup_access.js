document.addEventListener("DOMContentLoaded", () => {
  const btnBackups = document.querySelector("#btnBackups");

  btnBackups.addEventListener("click", async (e) => {
    e.preventDefault();
    
    // Pedir clave maestra
    const masterKey = await showInputDialog(
      "🔐 Clave maestra",
      "Ingresa tu clave de seguridad:",
      ""
    );
    
    if (masterKey === null || !masterKey.trim()) {
      return; // Usuario canceló o clave vacía
    }
    
    // Mostrar loading
    const loading = showLoading("Verificando clave...");
    
    try {
      const res = await fetch("/api/backup/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: masterKey.trim() })
      });
      
      hideLoading(loading);
      
      if (res.ok) {
        // Clave correcta, redirigir
        window.location.href = "backup.html";
      } else {
        await showError("Clave incorrecta", "Verifica la clave e inténtalo nuevamente.");
      }
    } catch (err) {
      hideLoading(loading);
      await showError("Error de conexión", "Revisa tu conexión a internet.");
    }
  });

  // ===============================
  // 🌀 Loading simple
  // ===============================
  function showLoading(message = "Cargando...") {
    const div = document.createElement("div");
    div.className = "modal fade show d-block";
    div.style.background = "rgba(0,0,0,0.5)";
    div.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body text-center py-4">
            <div class="spinner-border text-primary mb-3"></div>
            <p class="mb-0">${message}</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(div);
    document.body.style.overflow = "hidden";
    return div;
  }
  
  function hideLoading(loader) {
    if (loader && loader.parentNode) {
      loader.remove();
    }
    document.body.style.overflow = "";
  }

  // ===============================
  // ❌ Error simple
  // ===============================
  async function showError(title = "Error", message = "") {
    return new Promise((resolve) => {
      const modalId = 'error-modal-' + Date.now();
      const modalHTML = `
        <div class="modal fade" id="${modalId}">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title text-danger">${title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <p>${message}</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-danger" data-bs-dismiss="modal">OK</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      const div = document.createElement("div");
      div.innerHTML = modalHTML;
      document.body.appendChild(div);
      
      const modal = new bootstrap.Modal(div.firstChild);
      modal.show();
      
      div.firstChild.addEventListener("hidden.bs.modal", () => {
        div.remove();
        resolve();
      });
    });
  }

  // ===============================
  // 🔐 Input Dialog simple
  // ===============================
  async function showInputDialog(title, message, defaultValue = "") {
    return new Promise((resolve) => {
      const modalId = 'input-modal-' + Date.now();
      const modalHTML = `
        <div class="modal fade" id="${modalId}">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">${title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <p>${message}</p>
                <input type="password" class="form-control" id="input-field" value="${defaultValue}" placeholder="Escribe aquí...">
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
                <button type="button" class="btn btn-primary" id="submit-btn">Aceptar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      const div = document.createElement("div");
      div.innerHTML = modalHTML;
      document.body.appendChild(div);
      
      const modal = new bootstrap.Modal(div.firstChild);
      modal.show();
      
      const inputField = div.querySelector("#input-field");
      const submitBtn = div.querySelector("#submit-btn");
      
      submitBtn.addEventListener("click", () => {
        modal.hide();
        resolve(inputField.value);
      });
      
      inputField.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          submitBtn.click();
        }
      });
      
      div.firstChild.addEventListener("hidden.bs.modal", () => {
        if (!div.firstChild.dataset.submitted) {
          resolve(null);
        }
        div.remove();
      });
      
      submitBtn.addEventListener("click", () => {
        div.firstChild.dataset.submitted = true;
      });
      
      // Enfocar automáticamente
      setTimeout(() => inputField.focus(), 100);
    });
  }

  // ===============================
  // ✅ Confirm Dialog simple
  // ===============================
  async function showConfirm(message, options = {}) {
    return new Promise((resolve) => {
      const { 
        title = "Confirmar", 
        yesText = "Sí", 
        noText = "No" 
      } = options;
      
      const modalId = 'confirm-modal-' + Date.now();
      const modalHTML = `
        <div class="modal fade" id="${modalId}">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">${title}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div class="modal-body">
                <p>${message}</p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" id="no-btn">${noText}</button>
                <button type="button" class="btn btn-primary" id="yes-btn">${yesText}</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      const div = document.createElement("div");
      div.innerHTML = modalHTML;
      document.body.appendChild(div);
      
      const modal = new bootstrap.Modal(div.firstChild);
      modal.show();
      
      let result = false;
      
      div.querySelector("#yes-btn").addEventListener("click", () => {
        result = true;
        modal.hide();
      });
      
      div.querySelector("#no-btn").addEventListener("click", () => {
        result = false;
        modal.hide();
      });
      
      div.firstChild.addEventListener("hidden.bs.modal", () => {
        div.remove();
        resolve(result);
      });
    });
  }

  // Exportar funciones globalmente (opcional)
  window.showError = showError;
  window.showInputDialog = showInputDialog;
  window.showConfirm = showConfirm;
});