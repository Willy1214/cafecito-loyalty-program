// ======================================================
//  Input Dialog  — Ajustar puntos + Motivo
// ======================================================
window.inputDialog = function (message, placeholder = "", defaultValue = "") {
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
    overlay.style.animation = "fadeIn 0.3s ease";

    // Crear tarjeta
    const box = document.createElement("div");
    box.style.background = "white";
    box.style.padding = "25px";
    box.style.borderRadius = "12px";
    box.style.width = "350px";
    box.style.boxShadow = "0 8px 25px rgba(0,0,0,0.2)";
    box.style.textAlign = "center";
    box.style.fontFamily = "Arial";
    box.style.animation = "slideIn 0.3s ease";

    // Título/mensaje
    const title = document.createElement("h3");
    title.textContent = message;
    title.style.marginTop = "0";
    title.style.marginBottom = "15px";
    title.style.color = "#333";
    title.style.fontSize = "18px";

    // Campo de entrada
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder;
    input.value = defaultValue;
    input.style.width = "100%";
    input.style.padding = "12px";
    input.style.marginBottom = "20px";
    input.style.border = "1px solid #ddd";
    input.style.borderRadius = "8px";
    input.style.fontSize = "14px";
    input.style.boxSizing = "border-box";
    input.style.outline = "none";
    input.style.transition = "border-color 0.3s";
    
    // Estilo al enfocar
    input.addEventListener("focus", () => {
      input.style.borderColor = "#4a90e2";
      input.style.boxShadow = "0 0 0 3px rgba(74, 144, 226, 0.2)";
    });
    
    input.addEventListener("blur", () => {
      input.style.borderColor = "#ddd";
      input.style.boxShadow = "none";
    });

    // Contenedor para botones
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "flex-end";
    buttonContainer.style.gap = "10px";

    // Botón aceptar
    const acceptBtn = document.createElement("button");
    acceptBtn.textContent = "Aceptar";
    acceptBtn.style.background = "#28a745";
    acceptBtn.style.color = "white";
    acceptBtn.style.border = "none";
    acceptBtn.style.padding = "10px 18px";
    acceptBtn.style.borderRadius = "8px";
    acceptBtn.style.cursor = "pointer";
    acceptBtn.style.fontWeight = "bold";
    acceptBtn.style.transition = "background 0.3s";

    // Botón cancelar
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancelar";
    cancelBtn.style.background = "#6c757d";
    cancelBtn.style.color = "white";
    cancelBtn.style.border = "none";
    cancelBtn.style.padding = "10px 18px";
    cancelBtn.style.borderRadius = "8px";
    cancelBtn.style.cursor = "pointer";
    cancelBtn.style.transition = "background 0.3s";

    // Efectos hover
    acceptBtn.onmouseenter = () => acceptBtn.style.background = "#218838";
    acceptBtn.onmouseleave = () => acceptBtn.style.background = "#28a745";
    
    cancelBtn.onmouseenter = () => cancelBtn.style.background = "#5a6268";
    cancelBtn.onmouseleave = () => cancelBtn.style.background = "#6c757d";

    // Función para cerrar
    const closeDialog = (value = null) => {
      // Animación de salida
      overlay.style.animation = "fadeOut 0.3s ease";
      box.style.animation = "slideOut 0.3s ease";
      
      setTimeout(() => {
        overlay.remove();
        resolve(value);
      }, 250);
    };

    // Eventos del teclado
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        closeDialog(input.value);
      } else if (e.key === "Escape") {
        closeDialog(null);
      }
    });

    // Eventos de botones
    acceptBtn.onclick = () => closeDialog(input.value);
    cancelBtn.onclick = () => closeDialog(null);

    // Cerrar al hacer clic fuera
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        closeDialog(null);
      }
    };

    // Construir estructura
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(acceptBtn);
    
    box.appendChild(title);
    box.appendChild(input);
    box.appendChild(buttonContainer);
    overlay.appendChild(box);
    
    // Agregar estilos de animación
    const style = document.createElement("style");
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
    document.body.appendChild(overlay);
    
    // Enfocar automáticamente el campo de entrada
    setTimeout(() => input.focus(), 100);
  });
};

// ======================================================
//  Input Dialog  — Ajustar puntos + Motivo
// ======================================================
window.adjustPointsDialog = function () {
  return new Promise((resolve) => {
    // Fondo
    const overlay = document.createElement("div");
    overlay.style = `
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.4);
      backdrop-filter: blur(3px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn .25s ease;
    `;

    // Caja
    const box = document.createElement("div");
    box.style = `
      background: #fff;
      width: 360px;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
      animation: slideIn .3s ease;
      font-family: Arial;
      text-align: center;
    `;

    // Título
    const title = document.createElement("h3");
    title.innerText = "Ajustar puntos";
    title.style.marginBottom = "15px";

    // Contenedor de puntos
    const pointBox = document.createElement("div");
    pointBox.style = `
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    `;

    // Botón -
    const minusBtn = document.createElement("button");
    minusBtn.innerText = "−";
    minusBtn.style = `
      width: 40px; height: 40px;
      border: none; border-radius: 8px;
      background: #dc3545; color: white;
      font-size: 22px; cursor: pointer;
      font-weight: bold;
    `;

    // Input de cantidad
    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.value = 1;
    qtyInput.style = `
      width: 70px; text-align: center;
      padding: 10px;
      font-size: 18px;
      border: 1px solid #ddd;
      border-radius: 8px;
    `;

    // Botón +
    const plusBtn = document.createElement("button");
    plusBtn.innerText = "+";
    plusBtn.style = `
      width: 40px; height: 40px;
      border: none; border-radius: 8px;
      background: #28a745; color: white;
      font-size: 22px; cursor: pointer;
      font-weight: bold;
    `;

    // Motivo
    const motivo = document.createElement("input");
    motivo.placeholder = "Motivo del ajuste";
    motivo.style = `
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 8px;
      margin-bottom: 20px;
    `;

    // Botones inferiores
    const btns = document.createElement("div");
    btns.style = `
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    `;

    const cancel = document.createElement("button");
    cancel.innerText = "Cancelar";
    cancel.style = `
      padding: 10px 18px;
      border-radius: 8px;
      border: none;
      background: #6c757d;
      color: white;
      cursor: pointer;
    `;

    const ok = document.createElement("button");
    ok.innerText = "Aceptar";
    ok.style = `
      padding: 10px 18px;
      border-radius: 8px;
      border: none;
      background: #007bff;
      color: white;
      cursor: pointer;
      font-weight: bold;
    `;

    // Funciones
    minusBtn.onclick = () => qtyInput.value = Number(qtyInput.value) - 1;
    plusBtn.onclick = () => qtyInput.value = Number(qtyInput.value) + 1;

    const close = (data = null) => {
      overlay.style.animation = "fadeOut .25s ease";
      box.style.animation = "slideOut .25s ease";
      setTimeout(() => {
        overlay.remove();
        resolve(data);
      }, 250);
    };

    cancel.onclick = () => close(null);

    ok.onclick = () => {
      const val = Number(qtyInput.value);
      const mot = motivo.value.trim();

      if (isNaN(val) || val === 0) {
        alert("La cantidad debe ser un número distinto de cero.");
        return;
      }
      if (!mot) {
        alert("Debes ingresar un motivo.");
        return;
      }

      close({ puntos: val, motivo: mot });
    };

    // Construcción
    pointBox.append(minusBtn, qtyInput, plusBtn);
    btns.append(cancel, ok);
    box.append(title, pointBox, motivo, btns);
    overlay.append(box);
    document.body.append(overlay);
  });
};
