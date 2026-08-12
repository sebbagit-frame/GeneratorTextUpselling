import * as devicesRepository from "../src/data/devicesRepository.js";
import * as operatorsRepository from "../src/data/operatorsRepository.js";

// ==================== DISPOSITIVOS ====================

const selLinea = document.getElementById("admLinea");
const formDispositivo = document.getElementById("formDispositivo");
const dispEditId = document.getElementById("dispEditId");
const dispNombre = document.getElementById("dispNombre");
const dispAlto = document.getElementById("dispAlto");
const dispMedio = document.getElementById("dispMedio");
const dispBajo = document.getElementById("dispBajo");
const dispFinanciado = document.getElementById("dispFinanciado");
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
  dispSubmitBtn.textContent = "Guardar cambios";
  dispCancelarBtn.classList.remove("oculto");
}

function renderDispositivos() {
  const linea = selLinea.value;
  const lista = devicesRepository.getAll(linea);
  tablaDispositivosBody.innerHTML = "";

  lista.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.nombre}</td>
      <td>${item.valorAlto ?? "-"}</td>
      <td>${item.valorMedio ?? "-"}</td>
      <td>${item.valorBajo ?? "-"}</td>
      <td>${item.valorFinanciado ?? "-"}</td>
      <td>
        <button type="button" class="editar">Editar</button>
        <button type="button" class="eliminar quitar">Eliminar</button>
      </td>
    `;
    tr.querySelector(".editar").addEventListener("click", () =>
      cargarDispositivoEnForm(item),
    );
    tr.querySelector(".eliminar").addEventListener("click", () => {
      if (!confirm(`¿Eliminar "${item.nombre}"?`)) return;
      devicesRepository.remove(linea, item.id);
      renderDispositivos();
    });
    tablaDispositivosBody.appendChild(tr);
  });
}

formDispositivo.addEventListener("submit", (e) => {
  e.preventDefault();
  const linea = selLinea.value;
  const datos = {
    nombre: dispNombre.value.trim(),
    valorAlto: parseValorOpcional(dispAlto.value),
    valorMedio: parseValorOpcional(dispMedio.value),
    valorBajo: parseValorOpcional(dispBajo.value),
    valorFinanciado: parseValorOpcional(dispFinanciado.value),
  };

  if (!datos.nombre) {
    alert("El nombre es obligatorio.");
    return;
  }

  if (dispEditId.value) {
    devicesRepository.update(linea, dispEditId.value, datos);
  } else {
    devicesRepository.add(linea, datos);
  }

  limpiarFormDispositivo();
  renderDispositivos();
});

dispCancelarBtn.addEventListener("click", limpiarFormDispositivo);

selLinea.addEventListener("change", () => {
  limpiarFormDispositivo();
  renderDispositivos();
});

renderDispositivos();

// ==================== OPERADORES ====================

const formOperador = document.getElementById("formOperador");
const opEditMatriculaOriginal = document.getElementById(
  "opEditMatriculaOriginal",
);
const opNombre = document.getElementById("opNombre");
const opMatricula = document.getElementById("opMatricula");
const opSubmitBtn = document.getElementById("opSubmitBtn");
const opCancelarBtn = document.getElementById("opCancelarBtn");
const tablaOperadoresBody = document.querySelector("#tablaOperadores tbody");

function limpiarFormOperador() {
  opEditMatriculaOriginal.value = "";
  formOperador.reset();
  opSubmitBtn.textContent = "Agregar operador";
  opCancelarBtn.classList.add("oculto");
}

function cargarOperadorEnForm(op) {
  opEditMatriculaOriginal.value = op.matricula;
  opNombre.value = op.nombre;
  opMatricula.value = op.matricula;
  opSubmitBtn.textContent = "Guardar cambios";
  opCancelarBtn.classList.remove("oculto");
}

function renderOperadores() {
  const lista = operatorsRepository.getAll();
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
    tr.querySelector(".eliminar").addEventListener("click", () => {
      if (!confirm(`¿Eliminar a "${op.nombre}"?`)) return;
      operatorsRepository.remove(op.matricula);
      renderOperadores();
    });
    tablaOperadoresBody.appendChild(tr);
  });
}

formOperador.addEventListener("submit", (e) => {
  e.preventDefault();
  const nombre = opNombre.value.trim();
  const matricula = opMatricula.value.trim();

  if (!nombre || !matricula) {
    alert("Nombre y matrícula son obligatorios.");
    return;
  }

  try {
    if (opEditMatriculaOriginal.value) {
      operatorsRepository.update(opEditMatriculaOriginal.value, {
        nombre,
        matricula,
      });
    } else {
      operatorsRepository.add({ nombre, matricula });
    }
    limpiarFormOperador();
    renderOperadores();
  } catch (err) {
    alert(err.message);
  }
});

opCancelarBtn.addEventListener("click", limpiarFormOperador);

renderOperadores();
