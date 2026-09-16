import * as devicesRepository from "./src/data/devicesRepository.js";
import * as operatorsRepository from "./src/data/operatorsRepository.js";
import * as campanasRepository from "./src/data/campanasRepository.js";
import * as turnosHorariosRepository from "./src/data/turnosHorariosRepository.js";

// ---- OPERADORES (desde el backend) ----
let OPERADORES = [];

// ---- CAMPAÑAS (desde el backend, dependen de la cartera elegida) ----
let CAMPANAS = [];
const campanasCache = {};

// ---- TURNOS HORARIOS (desde el backend, configurables desde el admin) ----
let TURNOS = [];

const selOperador = document.getElementById("operador");
const selCampana = document.getElementById("campana");
const selCartera = document.getElementById("cartera");
const selTurnoHorario = document.getElementById("turnoHorario");

// Cargar cuotas 3 a 12
const selCuotas = document.getElementById("cuotas");
const opcionesCuotas = [3, 6, 12];

agregarPlaceholder(selCuotas);

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
  limpiarErrorCampo(e.target);
});

// Ni bien el operador corrige un campo global, se le saca el error de
// encima - no hace falta esperar a un nuevo intento de "Generar Speech".
selCartera.addEventListener("change", (e) => limpiarErrorCampo(e.target));
selCuotas.addEventListener("change", (e) => limpiarErrorCampo(e.target));
selOperador.addEventListener("change", (e) => limpiarErrorCampo(e.target));
selCampana.addEventListener("change", (e) => limpiarErrorCampo(e.target));
selTurnoHorario.addEventListener("change", (e) => limpiarErrorCampo(e.target));
document.getElementById("fechaVisita").addEventListener("input", (e) => {
  if (e.target.value) limpiarErrorCampo(e.target);
});

// Repuebla el select de Campaña según la cartera elegida (mismo patrón que
// Línea→Dispositivo).
async function cargarCampanas() {
  const cartera = selCartera.value;

  selCampana.innerHTML = "";

  // Sin cartera elegida todavía (arranca en placeholder) no hay nada que
  // pedirle al backend - se deja el select en su propio placeholder hasta
  // que el operador elija una cartera real.
  if (!cartera) {
    CAMPANAS = [];
    agregarPlaceholder(selCampana);
    return;
  }

  if (!campanasCache[cartera]) {
    try {
      campanasCache[cartera] = await campanasRepository.getAll(cartera);
    } catch (err) {
      alert(err.message);
      campanasCache[cartera] = [];
    }
  }

  CAMPANAS = campanasCache[cartera];
  agregarPlaceholder(selCampana);
  CAMPANAS.forEach((campana, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = campana.nombre;
    selCampana.appendChild(opt);
  });
}

selCartera.addEventListener("change", cargarCampanas);

// Carga los turnos horarios configurados desde el admin y puebla el select.
// No depende de ningún otro campo (a diferencia de Campaña), así que se
// carga una sola vez en init().
async function cargarTurnosHorarios() {
  try {
    TURNOS = await turnosHorariosRepository.getAll();
  } catch (err) {
    alert(err.message);
    TURNOS = [];
  }

  selTurnoHorario.innerHTML = "";
  agregarPlaceholder(selTurnoHorario);
  TURNOS.forEach((turno) => {
    const opt = document.createElement("option");
    opt.value = turno.id;
    opt.textContent = `${turno.horaInicio} - ${turno.horaFin}`;
    selTurnoHorario.appendChild(opt);
  });
}

// Inserta la opción placeholder "Seleccionar..." como primer hijo de un
// select, sin que quede seleccionable de nuevo una vez elegida otra opción
// (que el operador siempre arranque en blanco, en vez de autoseleccionar
// el primer ítem real).
function agregarPlaceholder(select, texto = "Seleccionar...") {
  const opt = document.createElement("option");
  opt.value = "";
  opt.textContent = texto;
  opt.disabled = true;
  opt.selected = true;
  select.appendChild(opt);
}

// ==================== VALIDACIÓN INLINE DE CAMPOS OBLIGATORIOS ====================
// Mismo patrón que presense.js: el mensaje de error se inserta como
// hermano del propio campo, y se reutiliza si ya existe en vez de
// duplicarlo en cada intento.

function obtenerMensajeError(referencia) {
  let msg = referencia.nextElementSibling;
  if (!msg || !msg.classList.contains("mensaje-error-campo")) {
    msg = document.createElement("span");
    msg.className = "mensaje-error-campo oculto";
    referencia.insertAdjacentElement("afterend", msg);
  }
  return msg;
}

function mostrarErrorEn(referencia, mensaje) {
  const msg = obtenerMensajeError(referencia);
  msg.textContent = mensaje;
  msg.classList.remove("oculto");
}

function limpiarErrorEn(referencia) {
  const msg = referencia.nextElementSibling;
  if (msg && msg.classList.contains("mensaje-error-campo")) {
    msg.classList.add("oculto");
  }
}

function mostrarErrorCampo(el, mensaje) {
  el.classList.add("campo-error");
  mostrarErrorEn(el, mensaje);
}

function limpiarErrorCampo(el) {
  el.classList.remove("campo-error");
  limpiarErrorEn(el);
}

function formatoMoneda(num) {
  const truncado = Math.trunc(num);
  return truncado.toLocaleString("es-AR");
}

// Convierte el valor de un <input type="date"> (yyyy-mm-dd) a "DD/MM" para
// mostrar en el speech de ComLog. Si no se completó, devuelve "-".
function formatearFecha(fechaISO) {
  if (!fechaISO) return "-";
  const [, mm, dd] = fechaISO.split("-");
  return `${dd}/${mm}`;
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

// Agrupa el catálogo por dispositivoBase (o por nombre, si no tiene base)
// para el select "Dispositivo": cada familia aparece una sola vez, con su
// fila individual (packLabel null) y sus variantes de pack aparte, para
// que "¿Es Pack?"/"Pack" puedan elegir entre ellas sin listar cada
// variante como una opción de dispositivo suelta.
function agruparCatalogoPorDispositivo(catalogo) {
  const grupos = new Map();
  catalogo.forEach((item) => {
    const key = item.dispositivoBase || item.nombre;
    let grupo = grupos.get(key);
    if (!grupo) {
      grupo = {
        key,
        label: item.dispositivoBase || item.nombre,
        individual: null,
        variantesPack: [],
      };
      grupos.set(key, grupo);
    }
    if (item.packLabel) {
      grupo.variantesPack.push(item);
    } else {
      grupo.individual = item;
    }
  });
  return Array.from(grupos.values());
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
      <option value="" disabled selected>Seleccionar...</option>
      <option value="verisure">Verifast</option>
      <option value="presense">Presense</option>
    </select>
    <label>Dispositivo</label>
    <select class="disp-dispositivo" onchange="onCambioDispositivo(${id})">
      <option value="" disabled selected>Elegí primero una línea</option>
    </select>
    <div class="disp-espack-wrap oculto">
      <label>¿Es Pack?</label>
      <select class="disp-es-pack" onchange="onCambioEsPack(${id})">
        <option value="no">No</option>
        <option value="si">Sí</option>
      </select>
    </div>
    <div class="disp-pack-wrap oculto">
      <label>Pack</label>
      <select class="disp-pack" onchange="onCambioSeleccion(${id})">
        <option value="" disabled selected>Seleccionar...</option>
      </select>
    </div>
    <label>Nivel de precio</label>
    <select class="disp-nivel" onchange="onCambioSeleccion(${id})">
      <option value="" disabled selected>Elegí primero una línea</option>
    </select>
    <div class="disp-aviso oculto">No disponible para esta línea</div>
    <div class="disp-plazo-wrap oculto">
      <label>Plazo de grabación</label>
      <select class="disp-plazo" onchange="calcularIva(${id})">
        <option value="" disabled selected>Seleccionar...</option>
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
      <div class="oculto">
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
    <small class="texto-ayuda">En caso de sumar cantidad del mismo dispositivo, se suma automáticamente al generar el speech.</small>
    <label style="display:flex;align-items:center;gap:8px;margin-top:10px">
      <input type="checkbox" class="disp-cobrado" style="width:auto">
      Ya abonado (no cobrar esta ampliación)
    </label>
  `;
  wrap.appendChild(div);
  // A diferencia de antes, ya no se dispara onCambioLinea() automáticamente
  // acá: Dispositivo y Nivel arrancan en su propio placeholder hasta que el
  // operador elija una Línea real (ver onCambioLinea()). Sí hace falta
  // recalcular la visibilidad de Fecha/Turno de visita, por si esta fila
  // nueva cambia si hay o no un único dispositivo cargado.
  return actualizarVisibilidadVisita();
}

function quitarDispositivo(id) {
  const el = wrap.querySelector(`[data-id="${id}"]`);
  if (el) el.remove();
  actualizarVisibilidadVisita();
}

// Repuebla los selects de dispositivo y nivel según la línea elegida.
// Ambos arrancan de nuevo en su propio placeholder (no autoseleccionan el
// primer ítem real) - el operador tiene que elegirlos a propósito.
async function onCambioLinea(id) {
  const el = wrap.querySelector(`[data-id="${id}"]`);
  const selLinea = el.querySelector(".disp-linea");
  const linea = selLinea.value;
  const selDispositivo = el.querySelector(".disp-dispositivo");
  const selNivel = el.querySelector(".disp-nivel");

  limpiarErrorCampo(selLinea);

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
  agregarPlaceholder(selDispositivo);
  agruparCatalogoPorDispositivo(catalogo).forEach((grupo) => {
    const opt = document.createElement("option");
    opt.value = grupo.key;
    opt.textContent = grupo.label;
    selDispositivo.appendChild(opt);
  });

  selNivel.innerHTML = "";
  agregarPlaceholder(selNivel);
  obtenerNiveles(linea).forEach((nivel) => {
    const opt = document.createElement("option");
    opt.value = nivel.value;
    opt.textContent = nivel.value;
    selNivel.appendChild(opt);
  });

  // Dispositivo volvió a su placeholder: onCambioDispositivo() se encarga
  // de ocultar/limpiar "¿Es Pack?"/"Pack" y de disparar onCambioSeleccion().
  await onCambioDispositivo(id);
}

// Repuebla "¿Es Pack?"/"Pack" según el grupo de dispositivo elegido, y
// resuelve/recalcula todo lo demás a través de onCambioSeleccion(). "¿Es
// Pack?" solo se muestra si ese grupo tiene alguna variante de pack
// cargada en el catálogo; si no, queda oculto y fijo en "No".
async function onCambioDispositivo(id) {
  const el = wrap.querySelector(`[data-id="${id}"]`);
  const linea = el.querySelector(".disp-linea").value;
  const dispositivoKey = el.querySelector(".disp-dispositivo").value;
  const wrapEsPack = el.querySelector(".disp-espack-wrap");
  const selEsPack = el.querySelector(".disp-es-pack");
  const wrapPack = el.querySelector(".disp-pack-wrap");
  const selPack = el.querySelector(".disp-pack");

  limpiarErrorCampo(el.querySelector(".disp-dispositivo"));

  const catalogo = await obtenerCatalogo(linea);
  const grupo = agruparCatalogoPorDispositivo(catalogo).find(
    (g) => g.key === dispositivoKey,
  );
  const tienePack = !!(grupo && grupo.variantesPack.length > 0);

  wrapEsPack.classList.toggle("oculto", !tienePack);
  selEsPack.value = "no";
  wrapPack.classList.add("oculto");
  selPack.innerHTML = "";
  agregarPlaceholder(selPack);

  await onCambioSeleccion(id);
}

// Repuebla "Pack" con las variantes del grupo elegido cuando "¿Es Pack?"
// pasa a "Sí", o lo oculta/limpia si vuelve a "No".
async function onCambioEsPack(id) {
  const el = wrap.querySelector(`[data-id="${id}"]`);
  const linea = el.querySelector(".disp-linea").value;
  const dispositivoKey = el.querySelector(".disp-dispositivo").value;
  const wrapPack = el.querySelector(".disp-pack-wrap");
  const selPack = el.querySelector(".disp-pack");
  const esPack = el.querySelector(".disp-es-pack").value === "si";

  selPack.innerHTML = "";
  agregarPlaceholder(selPack);

  if (esPack) {
    const catalogo = await obtenerCatalogo(linea);
    const grupo = agruparCatalogoPorDispositivo(catalogo).find(
      (g) => g.key === dispositivoKey,
    );
    (grupo ? grupo.variantesPack : []).forEach((item) => {
      const opt = document.createElement("option");
      opt.value = item.packLabel;
      opt.textContent = item.packLabel;
      selPack.appendChild(opt);
    });
    wrapPack.classList.remove("oculto");
  } else {
    wrapPack.classList.add("oculto");
  }

  await onCambioSeleccion(id);
}

// Obtiene el item de catálogo elegido en la fila (línea + dispositivo,
// resuelto por grupo + "¿Es Pack?"/"Pack" - ver agruparCatalogoPorDispositivo()).
async function obtenerItemCatalogo(el) {
  const linea = el.querySelector(".disp-linea").value;
  const dispositivoKey = el.querySelector(".disp-dispositivo").value;
  if (!dispositivoKey) return undefined;

  const catalogo = await obtenerCatalogo(linea);
  const grupo = agruparCatalogoPorDispositivo(catalogo).find(
    (g) => g.key === dispositivoKey,
  );
  if (!grupo) return undefined;

  const esPack = el.querySelector(".disp-es-pack").value === "si";
  if (!esPack) return grupo.individual || undefined;

  const packLabel = el.querySelector(".disp-pack").value;
  if (!packLabel) return undefined;
  return grupo.variantesPack.find((item) => item.packLabel === packLabel);
}

// Al elegir dispositivo o nivel: autocompleta el valor con IVA, o
// muestra el aviso de "no disponible" si el nivel es null en el catálogo
async function onCambioSeleccion(id) {
  const el = wrap.querySelector(`[data-id="${id}"]`);
  const linea = el.querySelector(".disp-linea").value;
  const selDispositivo = el.querySelector(".disp-dispositivo");
  const selNivel = el.querySelector(".disp-nivel");
  const item = await obtenerItemCatalogo(el);
  const nivel = selNivel.value;
  const nivelInfo = obtenerNiveles(linea).find((n) => n.value === nivel);
  const inputValor = el.querySelector(".disp-valor-coniva");
  const aviso = el.querySelector(".disp-aviso");

  limpiarErrorCampo(selDispositivo);
  limpiarErrorCampo(selNivel);
  limpiarErrorCampo(el.querySelector(".disp-pack"));

  // Puede dispararse con el Nivel todavía en placeholder (recién se eligió
  // Dispositivo) - se trata igual que "no disponible" hasta que se elija
  // también un nivel real, sin intentar leer nivelInfo.campo si no existe.
  const valorSinIva = item && nivelInfo ? item[nivelInfo.campo] : null;

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
  await actualizarVisibilidadVisita();
}

function calcularIva(id) {
  const el = wrap.querySelector(`[data-id="${id}"]`);

  // Si el dispositivo es una cámara Arlo (tiene tipoPlan), el adicional en
  // la cuota se recalcula según el plazo de grabación elegido, antes de
  // seguir con los cálculos de totales de siempre.
  if (el.dataset.tipoPlan) {
    const selPlazo = el.querySelector(".disp-plazo");
    limpiarErrorCampo(selPlazo);
    const plazo = selPlazo.value;
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

// Dispositivos que, cuando son el ÚNICO agregado a la operación, disparan
// el caso especial de generarDispositivoSinVisita() en vez del flujo
// genérico de generar() - se envían por correo, sin visita técnica.
// "Pack de Llaves" (Verisure) es el único que conserva su texto histórico
// ("Pack x3 llaves" en Mantenimiento, "Pack x3 Llaves" en ComLog); el resto
// usa su nombre real de catálogo.
const DISPOSITIVOS_SIN_VISITA = new Set([
  "Pack de Llaves",
  "Mando a Distancia",
  "Mando a Distancia DUO",
  "Pack de Llaves (Presense)",
  "Control Remoto (Presense)",
  "Control Remoto X2",
]);

// Fecha de visita / Turno de visita no aplican por defecto a los
// dispositivos de DISPOSITIVOS_SIN_VISITA (se envían por correo, sin visita
// técnica): se ocultan mientras ese sea el único dispositivo cargado, salvo
// que el operador tilde "Ya tiene visita" (ver su listener más abajo). Ese
// checkbox solo tiene sentido para esos 6 dispositivos, así que se muestra
// únicamente en ese caso. Se llama cada vez que puede cambiar el único
// dispositivo de la lista (elegir línea/dispositivo, o quitar una fila) -
// ver onCambioSeleccion() y quitarDispositivo() - y siempre resetea el
// checkbox a no marcado, para no arrastrar el estado de un dispositivo
// anterior.
let esDispositivoSinVisita = false;

async function actualizarVisibilidadVisita() {
  const items = wrap.querySelectorAll(".dispositivo-item");
  let esSinVisita = false;

  if (items.length === 1) {
    const item = await obtenerItemCatalogo(items[0]);
    const nombreReal = item ? item.nombre.trim() : "";
    esSinVisita = DISPOSITIVOS_SIN_VISITA.has(nombreReal);
  }

  esDispositivoSinVisita = esSinVisita;
  document.getElementById("yaTieneVisita").checked = false;
  document.getElementById("filaYaTieneVisita").classList.toggle("oculto", !esSinVisita);
  refrescarFilaVisita();
}

// Fuente única de verdad para la visibilidad de #filaVisita: "No se pactó
// visita" tiene PRIORIDAD sobre todo lo demás (incluido "Ya tiene visita",
// caso límite si ambos quedaran marcados a la vez) y la oculta siempre que
// esté tildado. Si no está tildado, se vuelve al comportamiento previo:
// oculta para los 6 dispositivos especiales salvo que "Ya tiene visita"
// esté marcado.
function refrescarFilaVisita() {
  const noSePactoVisita = document.getElementById("noSePactoVisita").checked;
  const yaTieneVisita = document.getElementById("yaTieneVisita").checked;
  const visible = !noSePactoVisita && (!esDispositivoSinVisita || yaTieneVisita);
  document.getElementById("filaVisita").classList.toggle("oculto", !visible);
}

document.getElementById("yaTieneVisita").addEventListener("change", refrescarFilaVisita);
document.getElementById("noSePactoVisita").addEventListener("change", refrescarFilaVisita);

// Caso especial: alguno de DISPOSITIVOS_SIN_VISITA como ÚNICO dispositivo de
// la operación (ver el chequeo en generar()). Usa un formato de speech
// completamente distinto al genérico, sin loop de bloques, sin agrupación
// de ComLog y sin cierre de operador/matrícula ni "Se pacta visita" (se
// envía por correo, no se pauta visita técnica). Si el dispositivo se
// combina con otro, este caso no se activa y se usa el flujo genérico de
// siempre. usarTextoLlaves es true solo para "Pack de Llaves" (Verisure),
// que conserva su texto fijo histórico en vez del nombre real.
async function generarDispositivoSinVisita(
  el,
  { prefijo, tipoPago, cuotas, fraseTipoPago, nombreReal, usarTextoLlaves },
) {
  const cantidad = parseInt(el.querySelector(".disp-cantidad").value) || 1;
  const valConIva = parseFloat(el.querySelector(".disp-valor-coniva").value) || 0;
  const totalConIva = valConIva * cantidad;
  const totalSinIva = totalConIva / 1.21;
  const cobrado = el.querySelector(".disp-cobrado").checked;

  // Texto legible del medio de pago elegido, usado tanto en el cierre de
  // Mantenimiento ("Ya abonado ...") como en la aclaración de cobro del
  // ComLog, más abajo.
  let tipoPagoTexto;
  if (tipoPago === "transferencia") {
    tipoPagoTexto = "transferencia";
  } else if (tipoPago === "tarjeta") {
    tipoPagoTexto = "tarjeta de crédito Visa/MasterCard";
  } else {
    tipoPagoTexto = `${cuotas} cuotas`;
  }

  // ---- Mantenimiento ----
  // A diferencia del flujo genérico (que envuelve el bloque entre
  // ***NO COBRAR AMPLIACIÓN YA ABONADA***), acá "Ya abonado" va como cierre
  // del texto, aclarando el medio de pago.
  const nombreMantenimiento = usarTextoLlaves ? "Pack x3 llaves" : nombreReal;
  let texto = `${prefijo} Ampliación ${cantidad} ${nombreMantenimiento} valor sin iva: $${formatoMoneda(totalSinIva)} valor con iva: $${formatoMoneda(totalConIva)} ${fraseTipoPago}`;
  if (cobrado) {
    texto += ` Ya abonado ${tipoPagoTexto}.`;
  }
  document.getElementById("resultado").textContent = texto;

  // ---- ComLog ----
  // La apertura depende de si la campaña elegida es de llamada entrante o
  // saliente; "saliente" (o cualquier otro nombre que no matchee) usa el
  // mismo texto por defecto. Solo Pack de Llaves menciona "de llaves": para
  // el resto de los dispositivos queda genérica.
  const campana = CAMPANAS[selCampana.value];
  const nombreCampana = campana ? campana.nombre.toLowerCase() : "";
  const esEntrante = nombreCampana.includes("entrante");
  const apertura = usarTextoLlaves
    ? esEntrante
      ? "Recibo llamado con TT por ampliación de llaves"
      : "Me comunico con TT por ampliación de llaves"
    : esEntrante
      ? "Recibo llamado con TT por ampliación"
      : "Me comunico con TT por ampliación";

  const aclaracionCobro = cobrado
    ? `Ya fue abonado, medio de pago: ${tipoPagoTexto}`
    : `Se cobra en línea, medio de pago: ${tipoPagoTexto}`;

  const comentarios =
    document.getElementById("comentariosAdicionales").value || "-";

  // Si el operador tildó "Ya tiene visita", se agrega una línea extra con
  // fecha/turno (mismos campos de #filaVisita, que en ese caso vuelve a
  // estar visible). El Mantenimiento no se ve afectado por este checkbox.
  // "No se pactó visita" tiene prioridad: si está tildado, se suprime esta
  // línea aunque "Ya tiene visita" también lo esté.
  let lineaVisita = "";
  const noSePactoVisitaSinVisita = document.getElementById("noSePactoVisita").checked;
  if (!noSePactoVisitaSinVisita && document.getElementById("yaTieneVisita").checked) {
    const fechaFormateada = formatearFecha(
      document.getElementById("fechaVisita").value,
    );
    const turnoSeleccionado = TURNOS.find(
      (t) => String(t.id) === selTurnoHorario.value,
    );
    const horaDesde = turnoSeleccionado ? turnoSeleccionado.horaInicio : "-";
    const horaHasta = turnoSeleccionado ? turnoSeleccionado.horaFin : "-";
    lineaVisita = `\n Se coordina visita para: ${fechaFormateada} entre ${horaDesde}-${horaHasta} hs.`;
  }

  const nombreComLog = usarTextoLlaves ? "Pack x3 Llaves" : nombreReal;
  // "Se envía por correo." solo aplica cuando no se coordinó una visita
  // (lineaVisita vacía): si "Ya tiene visita" agregó esa línea, no
  // corresponde decir que se envía por correo.
  const textoComLog = `${prefijo} ${apertura}. Se informa ${cantidad} ${nombreComLog}. Se indica valor final $${formatoMoneda(totalConIva)} 1 pago. Cliente acepta. ${aclaracionCobro}.${lineaVisita ? "" : " Se envía por correo."}${lineaVisita}\n \n Comentarios adicionales: ${comentarios}`;

  document.getElementById("resultadoComLog").textContent = textoComLog;
}

// Valida los campos obligatorios antes de generar. Mismo criterio que ya
// usa presense.js: en vez de alert(), resalta cada campo inválido con
// borde rojo + mensaje debajo (mostrarErrorCampo/limpiarErrorCampo) y hace
// scroll suave al primero. Los checkboxes quedan afuera a propósito - son
// opcionales. Fecha/Turno de visita solo se validan si #filaVisita está
// visible (puede estar oculta por "No se pactó visita" o por ser uno de
// los 6 dispositivos especiales sin "Ya tiene visita" tildado).
function validarCamposMain() {
  let primerCampoInvalido = null;
  const marcar = (el, mensaje) => {
    mostrarErrorCampo(el, mensaje);
    if (!primerCampoInvalido) primerCampoInvalido = el;
  };

  wrap.querySelectorAll(".dispositivo-item").forEach((el) => {
    const selLinea = el.querySelector(".disp-linea");
    if (selLinea.value) {
      limpiarErrorCampo(selLinea);
    } else {
      marcar(selLinea, "Elegí una línea.");
    }

    const selDispositivo = el.querySelector(".disp-dispositivo");
    if (selDispositivo.value) {
      limpiarErrorCampo(selDispositivo);
    } else {
      marcar(selDispositivo, "Elegí un dispositivo.");
    }

    const selNivel = el.querySelector(".disp-nivel");
    if (selNivel.value) {
      limpiarErrorCampo(selNivel);
    } else {
      marcar(selNivel, "Elegí un nivel de precio.");
    }

    const esPackVisible = !el
      .querySelector(".disp-espack-wrap")
      .classList.contains("oculto");
    const esPack = el.querySelector(".disp-es-pack").value === "si";
    const selPack = el.querySelector(".disp-pack");
    if (!esPackVisible || !esPack) {
      limpiarErrorCampo(selPack);
    } else if (selPack.value) {
      limpiarErrorCampo(selPack);
    } else {
      marcar(selPack, "Elegí un pack.");
    }

    const plazoVisible = !el
      .querySelector(".disp-plazo-wrap")
      .classList.contains("oculto");
    const selPlazo = el.querySelector(".disp-plazo");
    if (!plazoVisible) {
      limpiarErrorCampo(selPlazo);
    } else if (selPlazo.value) {
      limpiarErrorCampo(selPlazo);
    } else {
      marcar(selPlazo, "Elegí un plazo de grabación.");
    }
  });

  const cartera = document.getElementById("cartera");
  if (cartera.value) {
    limpiarErrorCampo(cartera);
  } else {
    marcar(cartera, "Elegí una cartera.");
  }

  const tipoPago = document.getElementById("tipoPago");
  if (tipoPago.value) {
    limpiarErrorCampo(tipoPago);
  } else {
    marcar(tipoPago, "Elegí un tipo de pago.");
  }

  if (tipoPago.value !== "financiado") {
    limpiarErrorCampo(selCuotas);
  } else if (selCuotas.value) {
    limpiarErrorCampo(selCuotas);
  } else {
    marcar(selCuotas, "Elegí la cantidad de cuotas.");
  }

  if (selOperador.value) {
    limpiarErrorCampo(selOperador);
  } else {
    marcar(selOperador, "Elegí un operador.");
  }

  if (selCampana.value) {
    limpiarErrorCampo(selCampana);
  } else {
    marcar(selCampana, "Elegí una campaña.");
  }

  const filaVisitaVisible = !document
    .getElementById("filaVisita")
    .classList.contains("oculto");
  const fechaVisita = document.getElementById("fechaVisita");
  if (!filaVisitaVisible) {
    limpiarErrorCampo(fechaVisita);
    limpiarErrorCampo(selTurnoHorario);
  } else {
    if (fechaVisita.value) {
      limpiarErrorCampo(fechaVisita);
    } else {
      marcar(fechaVisita, "Este campo es obligatorio.");
    }

    if (selTurnoHorario.value) {
      limpiarErrorCampo(selTurnoHorario);
    } else {
      marcar(selTurnoHorario, "Elegí un turno.");
    }
  }

  if (primerCampoInvalido) {
    primerCampoInvalido.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

async function generar() {
  if (!validarCamposMain()) return;

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

  // Caso especial: alguno de DISPOSITIVOS_SIN_VISITA como único dispositivo
  // de la operación (ver generarDispositivoSinVisita()). Si se cumple,
  // reemplaza TODO el flujo genérico de abajo para ambos textos.
  if (items.length === 1) {
    const item = await obtenerItemCatalogo(items[0]);
    const nombreReal = item ? item.nombre.trim() : "";
    if (DISPOSITIVOS_SIN_VISITA.has(nombreReal)) {
      await generarDispositivoSinVisita(items[0], {
        prefijo,
        tipoPago,
        cuotas,
        fraseTipoPago,
        nombreReal,
        usarTextoLlaves: nombreReal === "Pack de Llaves",
      });
      return;
    }
  }

  const bloques = [];

  // Si TODOS los dispositivos están marcados como abonados, el marcador va
  // una sola vez envolviendo todo el cuerpo del mensaje al final (no por
  // bloque individual, para no repetirlo pegado entre dispositivos).
  const todosCobrados = Array.from(items).every(
    (el) => el.querySelector(".disp-cobrado").checked,
  );
  const algunCobrado = Array.from(items).some(
    (el) => el.querySelector(".disp-cobrado").checked,
  );

  // ---- ComLog: se arma en paralelo al texto de Mantenimiento, agrupando
  // los dispositivos por nombre (no por fila). ----
  const gruposComLog = new Map();

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

    // Acumula por nombre de dispositivo + estado abonado para el speech de
    // ComLog (que agrupa filas repetidas). Se agrupa también por "abonado"
    // para que una fila abonada y otra no del mismo dispositivo no se
    // mezclen en una sola línea ambigua.
    const cobrado = el.querySelector(".disp-cobrado").checked;
    const claveGrupo = `${nombre}||${cobrado}`;
    const grupo = gruposComLog.get(claveGrupo) || {
      nombre,
      abonado: cobrado,
      cantidad: 0,
      sumaConIva: 0,
      sumaAdicional: 0,
    };
    grupo.cantidad += cantidad;
    grupo.sumaConIva += totalConIva;
    grupo.sumaAdicional += adicionalItem;
    gruposComLog.set(claveGrupo, grupo);

    // Adicional (RMR) + plan de las cámaras Arlo, ahora por dispositivo en
    // vez de acumulado en un total global.
    let parteAdicional = `Adicional en la cuota: $${formatoMoneda(adicionalItem)}`;
    if (el.dataset.tipoPlan) {
      const plazo = el.querySelector(".disp-plazo").value;
      parteAdicional += `. Plan ${el.dataset.tipoPlan} ${plazo} días`;
    }

    let bloque = `Ampliación ${cantidad} ${nombre} monto sin IVA: $${formatoMoneda(totalSinIva)} monto con IVA: $${formatoMoneda(totalConIva)} (${parteAdicional}). ${fraseTipoPago}`;

    // El cierre con el operador/matrícula se pega solo al último dispositivo.
    if (index === items.length - 1) {
      bloque += ` TT recibirá al técnico en el domicilio.-Mtr_ ${operador.matricula}.`;
    }

    if (cobrado && !todosCobrados) {
      bloque = `***NO COBRAR AMPLIACIÓN YA ABONADA***  ${bloque}***NO COBRAR AMPLIACIÓN YA ABONADA***`;
    } else if (!cobrado && algunCobrado) {
      // Caso mixto: este dispositivo no está abonado, pero algún otro sí -
      // se aclara que este en particular se abona en el momento de la
      // visita, sin el marcador de asteriscos (ese es solo para los que ya
      // están pagos).
      bloque = `AMPLIACIÓN POR ABONAR EN EL MOMENTO DE LA VISITA: ${bloque}`;
    }

    bloques.push(bloque);
  }

  let cuerpo = bloques.join(" // ");
  if (todosCobrados) {
    cuerpo = `***NO COBRAR AMPLIACIÓN YA ABONADA***(COLOCAR ESTE IMPORTE EN EL PARTE DIGITAL) ${cuerpo}***NO COBRAR AMPLIACIÓN YA ABONADA***`;
  }
  const texto = `${prefijo} ${cuerpo}`;

  document.getElementById("resultado").textContent = texto;

  // ---- Armado del texto de ComLog ----
  const campana = CAMPANAS[selCampana.value];
  // El sufijo ", Ya abonado" por línea se omite cuando todosCobrados es
  // true: en ese caso la info ya queda cubierta una sola vez por "TODO ya
  // abonado" en el cierre, más abajo, y repetirla por dispositivo sería
  // duplicar el mismo dato.
  const lineasDispositivos = Array.from(gruposComLog.values())
    .map(
      (grupo) =>
        `Ampliación de ${grupo.cantidad} ${grupo.nombre} valor final: $${formatoMoneda(grupo.sumaConIva)} adicional mensual: $${formatoMoneda(grupo.sumaAdicional)}${grupo.abonado && !todosCobrados ? ", Ya abonado" : ""}`,
    )
    .join("\n ");

  const fechaFormateada = formatearFecha(
    document.getElementById("fechaVisita").value,
  );
  const turnoSeleccionado = TURNOS.find(
    (t) => String(t.id) === selTurnoHorario.value,
  );
  const horaDesde = turnoSeleccionado ? turnoSeleccionado.horaInicio : "-";
  const horaHasta = turnoSeleccionado ? turnoSeleccionado.horaFin : "-";
  const comentarios =
    document.getElementById("comentariosAdicionales").value || "-";

  // "No se pactó visita" tiene prioridad: reemplaza toda la línea de fecha
  // y turno, conservando la mención de abonado si corresponde (es info de
  // pago, independiente de si hubo visita o no).
  const noSePactoVisitaGenerico = document.getElementById("noSePactoVisita").checked;
  const lineaVisitaGenerico = noSePactoVisitaGenerico
    ? `No se pactó visita${todosCobrados ? ", TODO ya abonado" : ""}.`
    : `Se pacta visita para el día ${fechaFormateada} entre ${horaDesde}-${horaHasta} hs${todosCobrados ? ", TODO ya abonado" : ""}.`;

  const textoComLog = campana
    ? `${prefijo} ${campana.textoApertura}\n \n ${lineasDispositivos}\n ${fraseTipoPago}\n ${lineaVisitaGenerico}\n \n Comentarios adicionales: ${comentarios}`
    : "-";

  document.getElementById("resultadoComLog").textContent = textoComLog;
}

function copiar() {
  const texto = document.getElementById("resultado").textContent;
  navigator.clipboard.writeText(texto).then(() => alert("Copiado al portapapeles"));
}

function copiarComLog() {
  const texto = document.getElementById("resultadoComLog").textContent;
  navigator.clipboard.writeText(texto).then(() => alert("Copiado al portapapeles"));
}

function restablecer() {
  location.reload();
}

// Al ser módulo (import), estas funciones ya no quedan en el scope
// global: se exponen para que los onclick del HTML puedan invocarlas.
window.agregarDispositivo = agregarDispositivo;
window.quitarDispositivo = quitarDispositivo;
window.onCambioLinea = onCambioLinea;
window.onCambioDispositivo = onCambioDispositivo;
window.onCambioEsPack = onCambioEsPack;
window.onCambioSeleccion = onCambioSeleccion;
window.calcularIva = calcularIva;
window.generar = generar;
window.copiar = copiar;
window.copiarComLog = copiarComLog;
window.restablecer = restablecer;

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
  agregarPlaceholder(selOperador);
  OPERADORES.forEach((op, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = `${op.nombre} - Mtr ${op.matricula}`;
    selOperador.appendChild(opt);
  });
  setCargando(false);

  await cargarCampanas();
  await cargarTurnosHorarios();

  // Cargar el primer dispositivo por defecto
  await agregarDispositivo();
}

init();
