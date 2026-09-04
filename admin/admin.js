import * as devicesRepository from "../src/data/devicesRepository.js";
import * as operatorsRepository from "../src/data/operatorsRepository.js";
import * as campanasRepository from "../src/data/campanasRepository.js";
import { API_BASE_URL } from "../src/data/apiConfig.js";
import { getToken, setToken, clearToken } from "../src/data/authHeader.js";

// ==================== SESIÓN / LOGIN ====================

const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");
const formLogin = document.getElementById("formLogin");
const loginUsuario = document.getElementById("loginUsuario");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

function mostrarLogin(mensaje) {
  clearToken();
  adminView.classList.add("oculto");
  loginView.classList.remove("oculto");
  if (mensaje) {
    loginError.textContent = mensaje;
    loginError.classList.remove("oculto");
  } else {
    loginError.classList.add("oculto");
  }
}

async function mostrarAdmin() {
  loginView.classList.add("oculto");
  adminView.classList.remove("oculto");
  await renderDispositivos();
  await renderOperadores();
  await renderCampanas();
}

// Envuelve las llamadas a los repositorios: si el error viene de un 401
// (token vencido o inválido), fuerza el logout y muestra el mensaje de
// sesión expirada; cualquier otro error se re-lanza para que lo maneje
// quien llamó (típicamente un alert puntual).
async function conManejoDeAuth(fn) {
  try {
    return await fn();
  } catch (err) {
    if (err.status === 401) {
      mostrarLogin("Tu sesión expiró, iniciá sesión de nuevo");
      return undefined;
    }
    throw err;
  }
}

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.classList.add("oculto");

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario: loginUsuario.value.trim(),
        password: loginPassword.value,
      }),
    });
  } catch {
    loginError.textContent =
      "No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.";
    loginError.classList.remove("oculto");
    return;
  }

  if (!res.ok) {
    loginError.textContent = "Usuario o contraseña incorrectos";
    loginError.classList.remove("oculto");
    return;
  }

  const data = await res.json();
  setToken(data.token);
  formLogin.reset();
  await mostrarAdmin();
});

logoutBtn.addEventListener("click", () => {
  mostrarLogin();
});

// ==================== DISPOSITIVOS ====================

const selLinea = document.getElementById("admLinea");
const formDispositivo = document.getElementById("formDispositivo");
const dispEditId = document.getElementById("dispEditId");
const dispNombre = document.getElementById("dispNombre");
const dispAlto = document.getElementById("dispAlto");
const dispMedio = document.getElementById("dispMedio");
const dispBajo = document.getElementById("dispBajo");
const dispFinanciado = document.getElementById("dispFinanciado");
const dispPromoCincuenta = document.getElementById("dispPromoCincuenta");
const dispMensual = document.getElementById("dispMensual");
const dispRmr3dias = document.getElementById("dispRmr3dias");
const dispRmr7dias = document.getElementById("dispRmr7dias");
const dispRmr14dias = document.getElementById("dispRmr14dias");
const dispRmr30dias = document.getElementById("dispRmr30dias");
const dispTipoPlan = document.getElementById("dispTipoPlan");
const dispSubmitBtn = document.getElementById("dispSubmitBtn");
const dispCancelarBtn = document.getElementById("dispCancelarBtn");
const tablaDispositivosBody = document.querySelector("#tablaDispositivos tbody");

function parseValorOpcional(valor) {
  if (valor === "" || valor === null || valor === undefined) return null;
  const num = parseFloat(valor);
  return Number.isNaN(num) ? null : num;
}

function limpiarFormDispositivo() {
  dispEditId.value = "";
  formDispositivo.reset();
  dispSubmitBtn.textContent = "Agregar dispositivo";
  dispCancelarBtn.classList.add("oculto");
}

function cargarDispositivoEnForm(item) {
  dispEditId.value = item.id;
  dispNombre.value = item.nombre;
  dispAlto.value = item.valorAlto ?? "";
  dispMedio.value = item.valorMedio ?? "";
  dispBajo.value = item.valorBajo ?? "";
  dispFinanciado.value = item.valorFinanciado ?? "";
  dispPromoCincuenta.value = item.valorPromoCincuenta ?? "";
  dispMensual.value = item.mensual ?? "";
  dispRmr3dias.value = item.rmr3dias ?? "";
  dispRmr7dias.value = item.rmr7dias ?? "";
  dispRmr14dias.value = item.rmr14dias ?? "";
  dispRmr30dias.value = item.rmr30dias ?? "";
  dispTipoPlan.value = item.tipoPlan ?? "";
  dispSubmitBtn.textContent = "Guardar cambios";
  dispCancelarBtn.classList.remove("oculto");
}

async function renderDispositivos() {
  const linea = selLinea.value;

  let lista;
  try {
    lista = await devicesRepository.getAll(linea);
  } catch (err) {
    alert(err.message);
    return;
  }

  tablaDispositivosBody.innerHTML = "";

  lista.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>${item.valorAlto ?? "-"}</td>
      <td>${item.valorMedio ?? "-"}</td>
      <td>${item.valorBajo ?? "-"}</td>
      <td>${item.valorFinanciado ?? "-"}</td>
      <td>${item.valorPromoCincuenta ?? "-"}</td>
      <td>${item.mensual ?? "-"}</td>
      <td>${item.rmr3dias ?? "-"}</td>
      <td>${item.rmr7dias ?? "-"}</td>
      <td>${item.rmr14dias ?? "-"}</td>
      <td>${item.rmr30dias ?? "-"}</td>
      <td>${item.tipoPlan ?? "-"}</td>
      <td>
        <button type="button" class="editar">Editar</button>
        <button type="button" class="eliminar quitar">Eliminar</button>
      </td>
    `;
    tr.querySelector(".editar").addEventListener("click", () =>
      cargarDispositivoEnForm(item),
    );
    tr.querySelector(".eliminar").addEventListener("click", async () => {
      if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
      try {
        await conManejoDeAuth(() => devicesRepository.remove(linea, item.id));
      } catch (err) {
        alert(err.message);
        return;
      }
      await renderDispositivos();
    });
    tablaDispositivosBody.appendChild(tr);
  });
}

formDispositivo.addEventListener("submit", async (e) => {
  e.preventDefault();
  const linea = selLinea.value;
  const datos = {
    nombre: dispNombre.value.trim(),
    valorAlto: parseValorOpcional(dispAlto.value),
    valorMedio: parseValorOpcional(dispMedio.value),
    valorBajo: parseValorOpcional(dispBajo.value),
    valorFinanciado: parseValorOpcional(dispFinanciado.value),
    valorPromoCincuenta: parseValorOpcional(dispPromoCincuenta.value),
    mensual: parseValorOpcional(dispMensual.value),
    rmr3dias: parseValorOpcional(dispRmr3dias.value),
    rmr7dias: parseValorOpcional(dispRmr7dias.value),
    rmr14dias: parseValorOpcional(dispRmr14dias.value),
    rmr30dias: parseValorOpcional(dispRmr30dias.value),
    tipoPlan: dispTipoPlan.value || null,
  };

  if (!datos.nombre) {
    alert("El nombre es obligatorio.");
    return;
  }

  try {
    if (dispEditId.value) {
      await conManejoDeAuth(() =>
        devicesRepository.update(linea, dispEditId.value, datos),
      );
    } else {
      await conManejoDeAuth(() => devicesRepository.add(linea, datos));
    }
  } catch (err) {
    alert(err.message);
    return;
  }

  limpiarFormDispositivo();
  await renderDispositivos();
});

dispCancelarBtn.addEventListener("click", limpiarFormDispositivo);

selLinea.addEventListener("change", async () => {
  limpiarFormDispositivo();
  await renderDispositivos();
});

// ==================== OPERADORES ====================

const formOperador = document.getElementById("formOperador");
const opEditId = document.getElementById("opEditId");
const opNombre = document.getElementById("opNombre");
const opMatricula = document.getElementById("opMatricula");
const opSubmitBtn = document.getElementById("opSubmitBtn");
const opCancelarBtn = document.getElementById("opCancelarBtn");
const tablaOperadoresBody = document.querySelector("#tablaOperadores tbody");

function limpiarFormOperador() {
  opEditId.value = "";
  formOperador.reset();
  opSubmitBtn.textContent = "Agregar operador";
  opCancelarBtn.classList.add("oculto");
}

function cargarOperadorEnForm(op) {
  opEditId.value = op.id;
  opNombre.value = op.nombre;
  opMatricula.value = op.matricula;
  opSubmitBtn.textContent = "Guardar cambios";
  opCancelarBtn.classList.remove("oculto");
}

async function renderOperadores() {
  let lista;
  try {
    lista = await operatorsRepository.getAll();
  } catch (err) {
    alert(err.message);
    return;
  }

  tablaOperadoresBody.innerHTML = "";

  lista.forEach((op) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${op.nombre}</td>
      <td>${op.matricula}</td>
      <td>
        <button type="button" class="editar">Editar</button>
        <button type="button" class="eliminar quitar">Eliminar</button>
      </td>
    `;
    tr.querySelector(".editar").addEventListener("click", () =>
      cargarOperadorEnForm(op),
    );
    tr.querySelector(".eliminar").addEventListener("click", async () => {
      if (!confirm(`¿Eliminar a "${op.nombre}"?`)) return;
      try {
        await conManejoDeAuth(() => operatorsRepository.remove(op.id));
      } catch (err) {
        alert(err.message);
        return;
      }
      await renderOperadores();
    });
    tablaOperadoresBody.appendChild(tr);
  });
}

formOperador.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = opNombre.value.trim();
  const matricula = opMatricula.value.trim();

  if (!nombre || !matricula) {
    alert("Nombre y matrícula son obligatorios.");
    return;
  }

  try {
    if (opEditId.value) {
      await conManejoDeAuth(() =>
        operatorsRepository.update(opEditId.value, { nombre, matricula }),
      );
    } else {
      await conManejoDeAuth(() =>
        operatorsRepository.add({ nombre, matricula }),
      );
    }
    limpiarFormOperador();
    await renderOperadores();
  } catch (err) {
    alert(err.message);
  }
});

opCancelarBtn.addEventListener("click", limpiarFormOperador);

// ==================== CAMPAÑAS ====================

const campCarteraFiltro = document.getElementById("campCarteraFiltro");
const formCampana = document.getElementById("formCampana");
const campEditId = document.getElementById("campEditId");
const campNombre = document.getElementById("campNombre");
const campCartera = document.getElementById("campCartera");
const campTextoApertura = document.getElementById("campTextoApertura");
const campSubmitBtn = document.getElementById("campSubmitBtn");
const campCancelarBtn = document.getElementById("campCancelarBtn");
const tablaCampanasBody = document.querySelector("#tablaCampanas tbody");

function limpiarFormCampana() {
  campEditId.value = "";
  formCampana.reset();
  campSubmitBtn.textContent = "Agregar campaña";
  campCancelarBtn.classList.add("oculto");
}

function cargarCampanaEnForm(campana) {
  campEditId.value = campana.id;
  campNombre.value = campana.nombre;
  campCartera.value = campana.cartera;
  campTextoApertura.value = campana.textoApertura;
  campSubmitBtn.textContent = "Guardar cambios";
  campCancelarBtn.classList.remove("oculto");
}

async function renderCampanas() {
  const cartera = campCarteraFiltro.value;

  let lista;
  try {
    lista = await campanasRepository.getAll(cartera);
  } catch (err) {
    alert(err.message);
    return;
  }

  tablaCampanasBody.innerHTML = "";

  lista.forEach((campana) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${campana.nombre}</td>
      <td>${campana.cartera}</td>
      <td class="td-truncate" title="${campana.textoApertura}">${campana.textoApertura}</td>
      <td>
        <button type="button" class="editar">Editar</button>
        <button type="button" class="eliminar quitar">Eliminar</button>
      </td>
    `;
    tr.querySelector(".editar").addEventListener("click", () =>
      cargarCampanaEnForm(campana),
    );
    tr.querySelector(".eliminar").addEventListener("click", async () => {
      if (!confirm(`¿Eliminar "${campana.nombre}"?`)) return;
      try {
        await conManejoDeAuth(() => campanasRepository.remove(campana.id));
      } catch (err) {
        alert(err.message);
        return;
      }
      await renderCampanas();
    });
    tablaCampanasBody.appendChild(tr);
  });
}

formCampana.addEventListener("submit", async (e) => {
  e.preventDefault();
  const datos = {
    nombre: campNombre.value.trim(),
    cartera: campCartera.value,
    textoApertura: campTextoApertura.value.trim(),
  };

  if (!datos.nombre || !datos.textoApertura) {
    alert("Nombre y texto de apertura son obligatorios.");
    return;
  }

  try {
    if (campEditId.value) {
      await conManejoDeAuth(() =>
        campanasRepository.update(campEditId.value, datos),
      );
    } else {
      await conManejoDeAuth(() => campanasRepository.add(datos));
    }
  } catch (err) {
    alert(err.message);
    return;
  }

  limpiarFormCampana();
  await renderCampanas();
});

campCancelarBtn.addEventListener("click", limpiarFormCampana);

campCarteraFiltro.addEventListener("change", async () => {
  limpiarFormCampana();
  await renderCampanas();
});

// ==================== INICIO ====================

if (getToken()) {
  mostrarAdmin();
} else {
  mostrarLogin();
}
