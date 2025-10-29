// =======================
// 🔐 Verificar sesión activa
// =======================
const token = localStorage.getItem("token");

if (!token) {
  window.location.href = "login.html";
}

// =======================
// 📦 API base
// =======================
const apiURL = "https://cafecito-loyalty-program-production.up.railway.app/login.html";

// =======================
// 🚪 Botón de cerrar sesión
// =======================
function logout() {
  if (confirm("¿Seguro que deseas cerrar sesión?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
  }
}

// Agregar botón al DOM al cargar
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
// ➕ Agregar cliente
// =======================
document.getElementById("addBtn").addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  if (!name) return alert("Please enter a name.");

  try {
    const res = await fetch(`${apiURL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ nombre: name }),
    });

    const data = await res.json();
    alert(data.mensaje || "Cliente agregado.");
    loadCustomers();
  } catch (err) {
    console.error("❌ Error al registrar cliente:", err);
    alert("Error al registrar el cliente.");
  }
});

// =======================
// 📋 Cargar lista de clientes
// =======================
async function loadCustomers() {
  try {
    const res = await fetch(apiURL, {
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const customers = await res.json();
    const table = document.getElementById("customerTable");

    if (customers.length === 0) {
      table.innerHTML = `<tr><td colspan="4" class="text-center text-muted">Sin clientes registrados aún.</td></tr>`;
      return;
    }

    table.innerHTML = customers
      .map(
        (c) => `
      <tr>
        <td>${c.id}</td>
        <td>${c.nombre}</td>
        <td>${c.puntos}</td>
       <td>
            <button class="btn btn-sm btn-success" onclick="addPoints(${c.id})">+10 pts</button>
            <button class="btn btn-sm btn-secondary" onclick="viewTransactions(${c.id})">📜 Ver historial</button>
            <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id}, '${c.nombre}')">🗑️ Eliminar</button>
        </td>


      </tr>
    `
      )
      .join("");
  } catch (err) {
    console.error("❌ Error al cargar clientes:", err);
  }
}

// =======================
// 💰 Sumar puntos
// =======================
async function addPoints(id) {
  try {
    await fetch(`${apiURL}/${id}/puntos`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ puntos: 10, motivo: "Bonus" }),
    });
    loadCustomers();
  } catch (err) {
    console.error("❌ Error al sumar puntos:", err);
  }
}

// =======================
// 📜 Ver historial de transacciones
// =======================
function viewTransactions(id) {
  localStorage.setItem("clienteId", id);
  window.location.href = "transactions.html";
}

// =======================
//  Eliminar cliente
// =======================
async function deleteCustomer(id, nombre) {
  const confirmDelete = confirm(`⚠️ ¿Seguro que deseas eliminar a "${nombre}"? Esta acción no se puede deshacer.`);
  if (!confirmDelete) return;

  try {
    const res = await fetch(`${apiURL}/${id}`, {
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

    alert(data.mensaje || "Cliente eliminado.");
    loadCustomers();

  } catch (err) {
    console.error("❌ Error al eliminar cliente:", err);
    alert("Error al intentar eliminar el cliente.");
  }
}


// =======================
// 🚀 Cargar clientes al iniciar
// =======================
loadCustomers();
