// =======================
// 🌐 Detectar entorno (local o producción)
// =======================
const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const API_BASE = isLocal
  ? "http://localhost:3000/api/customers"
  : "https://cafecito-loyalty-program-production.up.railway.app/api/customers";

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

// =======================
// 🚪 Cerrar sesión
// =======================
function logout() {
  if (confirm("¿Seguro que deseas cerrar sesión?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const container = document.querySelector(".container");
  if (container) {
    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Cerrar sesión";
    logoutBtn.className = "btn btn-danger btn-sm float-end";
    logoutBtn.onclick = logout;
    container.prepend(logoutBtn);
  }
});

// =======================
// ➕ Registrar nuevo cliente
// =======================
document.getElementById("addBtn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  if (!name) return alert("Por favor ingresa un nombre.");

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ nombre: name }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error al registrar cliente.");
      return;
    }

    alert(data.mensaje || "✅ Cliente agregado correctamente.");
    document.getElementById("name").value = "";
    loadCustomers();

  } catch (err) {
    console.error("❌ Error al registrar cliente:", err);
    alert("Error al registrar el cliente (problema de conexión).");
  }
});

// =======================
// 📋 Cargar lista de clientes
// =======================
async function loadCustomers() {
  try {
    const res = await fetch(API_BASE, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await res.json();
    const table = document.getElementById("customerTable");

    // ⚠️ Token expirado
    if (res.status === 401 || res.status === 403) {
      alert("Tu sesión ha expirado. Inicia sesión nuevamente.");
      logout();
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      table.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Sin clientes registrados aún.</td></tr>`;
      return;
    }

    table.innerHTML = data.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.nombre}</td>
        <td>${c.puntos}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="addPoints(${c.id})">+1 pts</button>
          <button class="btn btn-sm btn-secondary" onclick="viewTransactions(${c.id})">📜 Ver historial</button>
          <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id}, '${c.nombre}')">🗑️ Eliminar</button>
        </td>
      </tr>
    `).join("");

  } catch (err) {
    console.error("❌ Error al cargar clientes:", err);
    alert("Error al cargar la lista de clientes.");
  }
}

// =======================
// 💰 Sumar puntos
// =======================
async function addPoints(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}/puntos`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ puntos: 1, motivo: "Bonus" }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error al sumar puntos.");
      return;
    }

    loadCustomers();
  } catch (err) {
    console.error("❌ Error al sumar puntos:", err);
    alert("No se pudieron agregar los puntos.");
  }
}

// =======================
// 📜 Ver historial
// =======================
function viewTransactions(id) {
  localStorage.setItem("clienteId", id);
  window.location.href = "transactions.html";
}

// =======================
// 🗑️ Eliminar cliente
// =======================
async function deleteCustomer(id, nombre) {
  const confirmDelete = confirm(`⚠️ ¿Seguro que deseas eliminar a "${nombre}"? Esta acción no se puede deshacer.`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error al eliminar cliente.");
      return;
    }

    alert(data.mensaje || "🗑️ Cliente eliminado correctamente.");
    loadCustomers();

  } catch (err) {
    console.error("❌ Error al eliminar cliente:", err);
    alert("Error de conexión al eliminar cliente.");
  }
}

// =======================
// 🚀 Cargar clientes al iniciar
// =======================
loadCustomers();
