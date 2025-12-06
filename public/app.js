// =======================
// 🌐 Detectar entorno (local o producción)
// =======================
const isLocal =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const API_BASE = isLocal
  ? "http://localhost:3000/api/customers"
  : "https://cafecito-loyalty-program.onrender.com/api/customers";

const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

// =======================
// 🌐 SSE: Actualizar cuando Square mande evento
// =======================
const evtSource = new EventSource(
  `${window.API_BASE.replace("/api/customers", "")}/events`
);

evtSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("🔔 Evento SSE recibido:", data);

  notify("Actualizando clientes...", "info");
  loadCustomers();
};

// =======================
// 🚪 Cerrar sesión
// =======================
async function logout() {
  const ok = await confirmDialog("¿Seguro que deseas cerrar sesión?");
  if (!ok) return;

  notify("Sesión cerrada correctamente", "warning");
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  window.location.href = "login.html";
}
// ⭐ Conectar el botón
document.getElementById("logoutBtn").addEventListener("click", logout);



// =======================
// 👉 Lista global que usaremos para filtrar
// =======================
let customers = []; 

// =======================
// ➕ Registrar nuevo cliente
// =======================
document.getElementById("addBtn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  if (!name) return notify("Por favor ingresa un nombre.", "error");
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nombre: name }),
    });

    const data = await res.json();

    if (!res.ok) {
      notify(data.error || "Error al registrar cliente.", "error");
      return;
    }

    notify(data.mensaje || "Cliente agregado correctamente.", "success");
    document.getElementById("name").value = "";
    loadCustomers();
  } catch (err) {
    console.error("❌ Error al registrar cliente:", err);
    notify("Problema de conexión al registrar cliente.", "error");
  }
});

// =======================
// 📋 Cargar lista de clientes
// =======================
async function loadCustomers() {
  try {
    const res = await fetch(API_BASE, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (res.status === 401 || res.status === 403) {
      notify("Tu sesión ha expirado. Inicia sesión nuevamente.", "warning");
      logout();
      return;
    }

    customers = Array.isArray(data) ? data : [];
    renderCustomers(customers);
  } catch (err) {
    console.error("❌ Error al cargar clientes:", err);
    notify("Error al cargar la lista de clientes.", "error");
  }
}

// =======================
// Renderizar tabla (con soporte para filtrados)
// =======================
function renderCustomers(list) {
  const table = document.getElementById("customerTable");
  if (!list || list.length === 0) {
    table.innerHTML = `
      <tr><td colspan="4" class="text-center text-muted">No se encontraron clientes.</td></tr>`;
    return;
  }

  table.innerHTML = list
    .map(
      (c) => `
    <tr>
      <td>${c.id}</td>
      <td>${c.nombre}</td>
      <td>${c.puntos}</td>
      <td>
        <button class="btn btn-sm btn-success" onclick="addPoints(${c.id})">Modificar puntos</button>
        <button class="btn btn-sm btn-warning" onclick="redeemPoints(${c.id}, ${c.puntos})">🎁 Canjear</button>
        <button class="btn btn-sm btn-secondary" onclick="viewTransactions(${c.id})">📜 Ver historial</button>
        <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id}, '${c.nombre}')">🗑️ Eliminar</button>
      </td>
    </tr>`
    )
    .join("");
}

// =======================
// 🔎 Filtro en tiempo real
// =======================
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("searchInput");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const text = searchInput.value.toLowerCase().trim();

      const filtered = customers.filter(
        (c) =>
          c.nombre.toLowerCase().includes(text) ||
          String(c.id).includes(text)
      );

      renderCustomers(filtered);
    });
  }
});

// =======================
// 💰 Modificar puntos
// =======================
async function addPoints(id) {
  try {
    const data = await adjustPointsDialog();
    if (!data) return; // cancelado

    const { puntos, motivo } = data;

    const res = await fetch(`${API_BASE}/${id}/puntos`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ puntos, motivo }),
    });

    const json = await res.json();

    if (!res.ok) {
      notify(json.error || "Error al modificar puntos.", "error");
      return;
    }

    notify("Puntos actualizados ✔️", "success");
    loadCustomers();

  } catch (err) {
    console.error(err);
    notify("No se pudo actualizar.", "error");
  }
}



// =======================
// 🎁 Canjear puntos
// =======================
async function redeemPoints(id, puntosActuales) {
  if (puntosActuales < 10)
    return notify("El cliente no tiene suficientes puntos (mínimo 10).", "error");

  const producto = await inputDialog(
    "Introduce el postre a canjear:",  // Mensaje
    "",                 // Placeholder (opcional)
    ""                                // Valor por defecto (opcional)
  );

  if (!producto || producto.trim() === "") {
    notify("Debes ingresar un nombre de producto.", "error");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/${id}/puntos`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ puntos: -10, motivo: `Canje por ${producto}` }),
    });

    const data = await res.json();

    if (!res.ok)
      return notify(data.error || "Error al registrar el canje.", "error");

    notify(`🎉 Canje registrado: "${producto}" (-10 pts)`, "success");
    loadCustomers();
  } catch (err) {
    console.error("❌ Error al canjear puntos:", err);
    notify("Error de conexión.", "error");
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
  const confirmDelete = await confirmDialog(`¿Seguro que deseas eliminar a "${nombre}"?`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();

    if (!res.ok) return notify(data.error || "Error al eliminar cliente.", "error");

    notify("Cliente eliminado correctamente.", "success");
    loadCustomers();
  } catch (err) {
    console.error("❌ Error al eliminar cliente:", err);
    notify("Error al eliminar cliente.", "error");
  }
}

// =======================
//  Cargar clientes al iniciar
// =======================
loadCustomers();
