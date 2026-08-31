import * as devicesRepository from "./src/data/devicesRepository.js";
import * as operatorsRepository from "./src/data/operatorsRepository.js";

// ---- OPERADORES (desde el backend) ----
let OPERADORES = [];

const selOperador = document.getElementById("operador");

// Cargar cuotas 3 a 12
const selCuotas = document.getElementById("cuotas");
const opcionesCuotas = [3, 6, 12];

opcionesCuotas.forEach((cuota) => {
  const opt = document.createElement("option");
  opt.value = cuota;
  opt.textContent = cuota + " cuotas";
  selCuotas.appendChild(opt);
});

// Mostrar/ocultar cuotas según tipo de pago
document.getElementById("tipoPago").addEventListener("change", (e) => {
  document
    .getElementById("cuotasWrap")
    .classList.toggle("oculto", e.target.value !== "financiado");
});

function formatoMoneda(num) {
  return num.toLocaleString("es-AR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---- Dispositivos múltiples ----
let contadorDispositivo = 0;
const wrap = document.getElementById("dispositivosWrap");

// Niveles de precio disponibles en los catálogos
const NIVELES = [
  { value: "Alto", campo: "valorAlto" },
  { value: "Medio", campo: "valorMedio" },
  { value: "Bajo", campo: "valorBajo" },
  { value: "Financiado", campo: "valorFinanciado" },
  { value: "Promo 50%", campo: "valorPromoCincuenta" },
];

// Presense solo maneja dos niveles: Alto y Bajo. Su "Bajo" no vive en
// valorBajo (queda null en el catálogo) sino en valorFinanciado, porque
// ese mismo precio es el que se usa tanto al contado como financiado.
const NIVELES_PRESENSE = [
  { value: "Alto", campo: "valorAlto" },
  { value: "Bajo", campo: "valorFinanciado" },
];

// Cache simple en memoria de los catálogos ya traídos del backend, para no
// re-pedir por fetch cada vez que se cambia de nivel o se agrega una fila
// con la misma línea.
const catalogoCache = {};

async function obtenerCatalogo(linea) {
  const lineaNorm = linea === "presense" ? "presense" : "verisure";
  if (catalogoCache[lineaNorm]) return catalogoCache[lineaNorm];

  const catalogo = await devicesRepository.getAll(lineaNorm);
  catalogoCache[lineaNorm] = catalogo;
  return catalogo;
}

function obtenerNiveles(linea) {
  return linea === "presense" ? NIVELES_PRESENSE : NIVELES;
}

// Habilita/deshabilita los controles principales mientras hay un fetch en
// curso, como estado de carga simple.
function setCargando(cargando) {
  selOperador.disabled = cargando;
  document
    .querySelectorAll(".disp-linea, .disp-dispositivo, .disp-nivel")
    .forEach((el) => {
      el.disabled = cargando;
    });
}

function agregarDispositivo() {
  contadorDispositivo++;
  const id = contadorDispositivo;
  const div = document.createElement("div");
  div.className = "dispositivo-item";
  div.dataset.id = id;
  div.innerHTML = `
    <button type="button" class="quitar" onclick="quitarDispositivo(${id})">x</button>
    <label>Línea</label>
    <select class="disp-linea" onchange="onCambioLinea(${id})">
      <option value="verisure">Verifast</option>
      <option value="presense">Presense</option>
    </select>
    <label>Dispositivo</label>
    <select class="disp-dispositivo" onchange="onCambioSeleccion(${id})"></select>
    <label>Nivel de precio</label>
    <select class="disp-nivel" onchange="onCambioSeleccion(${id})">
      <option value="Alto">Alto</option>
      <option value="Medio">Medio</option>
      <option value="Bajo">Bajo</option>
      <option value="Financiado">Financiado</option>
      <option value="Promo 50%">Promo 50%</option>
    </select>
    <div class="disp-aviso oculto">No disponible para esta línea</div>
    <div class="disp-plazo-wrap oculto">
      <label>Plazo de grabación</label>
      <select class="disp-plazo" onchange="calcularIva(${id})">
        <option value="3">3 días</option>
        <option value="7">7 días</option>
        <option value="14">14 días</option>
        <option value="30">30 días</option>
      </select>
    </div>
    <div class="row">
      <div>
        <label>Cantidad</label>
        <input class="disp-cantidad" type="number" value="1" min="1" oninput="calcularIva(${id})">
      </div>
      <div>
        <label>Valor con IVA (unitario)</label>
        <input class="disp-valor-coniva" type="number" placeholder="0" oninput="calcularIva(${id})">
      </div>
      <div>
        <label>Total sin IVA (auto)</label>
        <input class="disp-total-siniva" type="text" readonly>
      </div>
      <div>
        <label>Total con IVA (auto)</label>
        <input class="disp-total-coniva" type="text" readonly>
      </div>
    </div>
    <label>Adicional en la cuota (RMR)</label>
    <input class="disp-adicional" type="number" placeholder="0">
    <label style="display:flex;align-items:center;gap:8px;margin-top:10px">
      <input type="checkbox" class="disp-cobrado" style="width:auto">
      Ya abonado (no cobrar esta ampliación)
    </label>
  `;
  wrap.appendChild(div);
  return onCambioLinea(id);
}

function quitarDispositivo(id) {
  const el = wrap.querySelector(`[data-id="${id}"]`);
  if (el) el.remove();
}

// Repuebla los selects de dispositivo y nivel según la línea elegida
async function onCambioLinea(id) {
  const el = wrap.querySelector(`[data-id="${id}"]`);
  const linea = el.querySelector(".disp-linea").value;
  const selDispositivo = el.querySelector(".disp-dispositivo");
  const selNivel = el.querySelector(".disp-nivel");

  let catalogo;
  try {
    setCargando(true);
    catalogo = await obtenerCatalogo(linea);
  } catch (err) {
    alert(err.message);
    return;
  } finally {
    setCargando(false);
  }

  selDispositivo.innerHTML = "";
  catalogo.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.nombre;
    selDispositivo.appendChild(opt);
  });

  selNivel.innerHTML = "";
  obtenerNiveles(linea).forEach((nivel) => {
    const opt = document.createElement("option");
    opt.value = nivel.value;
    opt.textContent = nivel.value;
    selNivel.appendChild(opt);
  });

  await onCambioSeleccion(id);
}

// Obtiene el item de catálogo elegido en la fila (línea + dispositivo)
async function obtenerItemCatalogo(el) {
  const linea = el.querySelector(".disp-linea").value;
  const dispositivoId = el.querySelector(".disp-dispositivo").value;
  const catalogo = await obtenerCatalogo(linea);
  return catalogo.find((item) => String(item.id) === dispositivoId);
}

// Al elegir dispositivo o nivel: autocompleta el valor con IVA, o
// muestra el aviso de "no disponible" si el nivel es null en el catálogo
async function onCambioSeleccion(id) {
  const el = wrap.querySelector(`[data-id="${id}"]`);
  const linea = el.querySelector(".disp-linea").value;
  const item = await obtenerItemCatalogo(el);
  const nivel = el.querySelector(".disp-nivel").value;
  const nivelInfo = obtenerNiveles(linea).find((n) => n.value === nivel);
  const inputValor = el.querySelector(".disp-valor-coniva");
  const aviso = el.querySelector(".disp-aviso");

  const valorSinIva = item ? item[nivelInfo.campo] : null;

  if (valorSinIva === null || valorSinIva === undefined) {
    inputValor.value = "";
    inputValor.disabled = true;
    aviso.classList.remove("oculto");
  } else {
    inputValor.disabled = false;
    aviso.classList.add("oculto");
    inputValor.value = (valorSinIva * 1.21).toFixed(2);
  }

  // Autocompleta el adicional en la cuota (RMR) desde el catálogo.
  // A diferencia del valor con IVA, el campo nunca se deshabilita: el
  // operador puede cargar un adicional manual aunque el catálogo no
  // tenga uno predefinido para este dispositivo.
  const inputAdicional = el.querySelector(".disp-adicional");
  const plazoWrap = el.querySelector(".disp-plazo-wrap");

  if (item && item.tipoPlan) {
    // Cámaras Arlo: el RMR no se carga a mano, se elige un plazo de
    // grabación y se autocompleta según el plan del dispositivo. Se guarda
    // todo en el dataset para que calcularIva() lo pueda leer de forma
    // síncrona, sin volver a resolver el catálogo.
    plazoWrap.classList.remove("oculto");
    inputAdicional.readOnly = true;
    el.dataset.tipoPlan = item.tipoPlan;
    el.dataset.rmr3dias = item.rmr3dias ?? "";
    el.dataset.rmr7dias = item.rmr7dias ?? "";
    el.dataset.rmr14dias = item.rmr14dias ?? "";
    el.dataset.rmr30dias = item.rmr30dias ?? "";
  } else {
    plazoWrap.classList.add("oculto");
    inputAdicional.readOnly = false;
    delete el.dataset.tipoPlan;
    delete el.dataset.rmr3dias;
    delete el.dataset.rmr7dias;
    delete el.dataset.rmr14dias;
    delete el.dataset.rmr30dias;
    inputAdicional.value = item && item.mensual != null ? item.mensual : "";
  }

  calcularIva(id);
}

function calcularIva(id) {
  const el = wrap.querySelector(`[data-id="${id}"]`);

  // Si el dispositivo es una cámara Arlo (tiene tipoPlan), el adicional en
  // la cuota se recalcula según el plazo de grabación elegido, antes de
  // seguir con los cálculos de totales de siempre.
  if (el.dataset.tipoPlan) {
    const plazo = el.querySelector(".disp-plazo").value;
    const rmr = el.dataset[`rmr${plazo}dias`];
    el.querySelector(".disp-adicional").value = rmr || "";
  }

  const inputValor = el.querySelector(".disp-valor-coniva");

  if (inputValor.disabled) {
    el.querySelector(".disp-total-siniva").value = "";
    el.querySelector(".disp-total-coniva").value = "";
    return;
  }

  const valConIva = parseFloat(inputValor.value) || 0;
  const cant = parseFloat(el.querySelector(".disp-cantidad").value) || 1;
  const totalConIva = valConIva * cant;
  const totalSinIva = totalConIva / 1.21;
  el.querySelector(".disp-total-siniva").value = formatoMoneda(totalSinIva);
  el.querySelector(".disp-total-coniva").value = formatoMoneda(totalConIva);
}

async function generar() {
  const items = wrap.querySelectorAll(".dispositivo-item");

  // Validar que ningún dispositivo tenga el valor deshabilitado o vacío
  // (nivel no disponible para la línea elegida)
  for (const el of items) {
    const inputValor = el.querySelector(".disp-valor-coniva");
    if (inputValor.disabled || inputValor.value === "") {
      const item = await obtenerItemCatalogo(el);
      const nombre = item ? item.nombre : "seleccionado";
      const nivel = el.querySelector(".disp-nivel").value;
      alert(
        `El dispositivo ${nombre} no tiene valor disponible para el nivel ${nivel} seleccionado. Elegí otro nivel.`,
      );
      return;
    }
  }

  const cartera = document.getElementById("cartera").value;
  const prefijo = cartera === "OUT" ? "AR_UPSELLING_OUT:" : "AR_UPSELLING:";
  const tipoPago = document.getElementById("tipoPago").value;
  const cuotas = document.getElementById("cuotas").value;
  const operador = OPERADORES[selOperador.value];

  // Frase de tipo de pago: es la misma para todos los bloques (tipoPago es
  // un select global), se calcula una sola vez antes del loop.
  let fraseTipoPago;
  if (tipoPago === "transferencia") {
    fraseTipoPago = "Todo en 1 pago con transferencia.";
  } else if (tipoPago === "tarjeta") {
    fraseTipoPago = "Todo en 1 pago con TC Visa/MasterCard.";
  } else {
    fraseTipoPago = `Todo en ${cuotas} cuotas con tarjeta de crédito visa/MasterCard Bancaria.`;
  }

  const bloques = [];

  for (const [index, el] of items.entries()) {
    const item = await obtenerItemCatalogo(el);
    const nombre = item ? item.nombre : "";
    const cantidad = parseInt(el.querySelector(".disp-cantidad").value) || 1;
    const valConIva =
      parseFloat(el.querySelector(".disp-valor-coniva").value) || 0;
    const adicional =
      parseFloat(el.querySelector(".disp-adicional").value) || 0;

    const totalConIva = valConIva * cantidad;
    const totalSinIva = totalConIva / 1.21;
    const adicionalItem = adicional * cantidad;

    // Adicional (RMR) + plan de las cámaras Arlo, ahora por dispositivo en
    // vez de acumulado en un total global.
    let parteAdicional = `Adicional en la cuota: $${formatoMoneda(adicionalItem)}`;
    if (el.dataset.tipoPlan) {
      const plazo = el.querySelector(".disp-plazo").value;
      parteAdicional += `. Plan ${el.dataset.tipoPlan} ${plazo} días`;
    }

    let bloque = `Ampliación ${cantidad} ${nombre} monto sin iva: $${formatoMoneda(totalSinIva)} monto con iva: $${formatoMoneda(totalConIva)} (${parteAdicional}). ${fraseTipoPago}`;

    // El cierre con el operador/matrícula se pega solo al último dispositivo.
    if (index === items.length - 1) {
      bloque += ` TT recibirá al técnico en el domicilio.-${operador.nombre} -Mtr_ ${operador.matricula}.`;
    }

    if (el.querySelector(".disp-cobrado").checked) {
      bloque = `***NO COBRAR AMPLIACIÓN YA ABONADA***${bloque}***NO COBRAR AMPLIACIÓN YA ABONADA***`;
    }

    bloques.push(bloque);
  }

  const texto = `${prefijo} ${bloques.join(" // ")}`;

  document.getElementById("resultado").textContent = texto;
}

function copiar() {
  const texto = document.getElementById("resultado").textContent;
  navigator.clipboard.writeText(texto).then(() => alert("Copiado al portapapeles"));
}

// Al ser módulo (import), estas funciones ya no quedan en el scope
// global: se exponen para que los onclick del HTML puedan invocarlas.
window.agregarDispositivo = agregarDispositivo;
window.quitarDispositivo = quitarDispositivo;
window.onCambioLinea = onCambioLinea;
window.onCambioSeleccion = onCambioSeleccion;
window.calcularIva = calcularIva;
window.generar = generar;
window.copiar = copiar;

// ---- Carga inicial ----
async function init() {
  setCargando(true);
  try {
    OPERADORES = await operatorsRepository.getAll();
  } catch (err) {
    alert(err.message);
    OPERADORES = [];
  }

  selOperador.innerHTML = "";
  OPERADORES.forEach((op, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${op.nombre} - Mtr ${op.matricula}`;
    selOperador.appendChild(opt);
  });
  setCargando(false);

  // Cargar el primer dispositivo por defecto
  await agregarDispositivo();
}

init();
