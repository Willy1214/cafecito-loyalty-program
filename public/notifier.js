function notify(message, type = "info") {
  const colors = {
    info: "#0d6efd",
    success: "#198754",
    warning: "#ffc107",
    danger: "#dc3545"
  };

  const box = document.createElement("div");
  box.className = "custom-toast";
  box.textContent = message;

  box.style.position = "fixed";
  box.style.bottom = "20px";
  box.style.right = "20px";
  box.style.padding = "12px 18px";
  box.style.background = colors[type] || colors.info;
  box.style.color = "white";
  box.style.borderRadius = "10px";
  box.style.fontSize = "15px";
  box.style.fontWeight = "500";
  box.style.boxShadow = "0 4px 15px rgba(0,0,0,.25)";
  box.style.opacity = "0";
  box.style.transition = "opacity 0.4s ease";
  box.style.zIndex = "9999";

  document.body.appendChild(box);

  setTimeout(() => {
    box.style.opacity = "1";
  }, 50);

  setTimeout(() => {
    box.style.opacity = "0";
    setTimeout(() => box.remove(), 400);
  }, 3500);
}
