import * as presenseKitsRepository from "../src/data/presenseKitsRepository.js";
import * as presenseDispositivosRepository from "../src/data/presenseDispositivosRepository.js";
import * as presenseKitComposicionRepository from "../src/data/presenseKitComposicionRepository.js";
import * as campanasRepository from "../src/data/campanasRepository.js";

// ---- Catálogos (desde el backend) ----
let KITS = [];
let DISPOSITIVOS = [];

// ---- Campañas para el speech ComLog (dependen de la cartera elegida) ----
let CAMPANAS_PS = [];
const campanasPsCache = {};

// Composición de cada kit (qué dispositivos incluye), cacheada por kitId a
// medida que se van tildando kits en el formulario.
const composicionPorKitId = {};

// Tope de kits que se pueden combinar en una misma venta (ver renderKits()).
const MAX_KITS_SELECCIONABLES = 2;

const kitsList = document.getElementById("kitsList");
const dispositivosList = document.getElementById("dispositivosList");
const resultadosWrap = document.querySelector(".presense-resultados");
const volverBtn = document.getElementById("volver");

// Redondea a 2 decimales y solo los muestra si no son ",00" - mismo criterio
// que el generador de referencia (los precios PreSense casi siempre son
// enteros, pero algunos kits vienen con centavos).
function formatoMoneda(num) {
  const redondeado = Math.round(num * 100) / 100;
  if (redondeado % 1 === 0) {
    return "$" + redondeado.toLocaleString("es-AR");
  }
  return (
    "$" +
    redondeado.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// Fragmento de "adicional mensual" para una línea del ComLog: si el monto
// es 0 (o null, que al multiplicarse por cantidad da 0 igual), se aclara
// "Sin adicional mensual" en vez de mostrar "adicional mensual: $0".
function sufijoAdicionalMensual(monto) {
  return monto > 0
    ? ` adicional mensual: ${formatoMoneda(monto)}`
    : ". Sin adicional mensual";
}

// Convierte el valor de un <input type="date"> (yyyy-mm-dd) a "DD/MM/AAAA".
function formatearFecha(fechaISO) {
  if (!fechaISO) return "";
  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
}

// Igual que formatearFecha, pero sin el año - formato que ya usa el ComLog
// del generador principal para esta misma línea del speech.
function formatearFechaCorta(fechaISO) {
  if (!fechaISO) return "-";
  const [, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}`;
}

// Repuebla el select de Campaña (para el speech ComLog) según la cartera
// elegida, mismo patrón que ya usa el generador principal.
async function cargarCampanasPresense() {
  const cartera = document.getElementById("psCartera").value;

  if (!campanasPsCache[cartera]) {
    try {
      campanasPsCache[cartera] = await campanasRepository.getAll(cartera);
    } catch (err) {
      alert(err.message);
      campanasPsCache[cartera] = [];
    }
  }

  CAMPANAS_PS = campanasPsCache[cartera];
  const selCampana = document.getElementById("psCampana");
  selCampana.innerHTML = "";
  CAMPANAS_PS.forEach((campana, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = campana.nombre;
    selCampana.appendChild(opt);
  });
}

document.getElementById("psCartera").addEventListener("change", cargarCampanasPresense);

// Pide (y cachea) la composición de un kit la primera vez que se necesita.
async function obtenerComposicion(kitId) {
  if (!composicionPorKitId[kitId]) {
    try {
      composicionPorKitId[kitId] = await presenseKitComposicionRepository.getByKitId(kitId);
    } catch (err) {
      alert(err.message);
      composicionPorKitId[kitId] = [];
    }
  }
  return composicionPorKitId[kitId];
}

function renderKits() {
  kitsList.innerHTML = "";
  KITS.forEach((kit, i) => {
    const row = document.createElement("div");
    row.className = "presense-kit-row";
    row.innerHTML = `
      <input type="checkbox" class="kit-check" data-idx="${i}">
      <span class="presense-kit-nombre">${kit.nombre} — ${formatoMoneda(kit.valorConIva)}</span>
      <input type="text" class="presense-cant kit-cant" value="1">
    `;
    // Al tildar el kit, se precarga su composición para tenerla lista y
    // poder usarla de forma síncrona al armar el cuadro en calcular(). Como
    // mucho se pueden combinar 2 kits a la vez: si ya hay 2 tildados, se
    // bloquea el tercero y se avisa junto al título "Kits".
    row.querySelector(".kit-check").addEventListener("change", (e) => {
      if (!e.target.checked) return;

      const tildados = document.querySelectorAll(".kit-check:checked");
      if (tildados.length > MAX_KITS_SELECCIONABLES) {
        e.target.checked = false;
        mostrarErrorEn(labelKits, `Podés seleccionar como máximo ${MAX_KITS_SELECCIONABLES} kits.`);
        return;
      }

      obtenerComposicion(kit.id);
      limpiarErrorEn(labelKits);
    });
    kitsList.appendChild(row);
  });
}

function opcionesDispositivos() {
  return DISPOSITIVOS.map(
    (d, i) => `<option value="${i}">${d.nombre} — ${formatoMoneda(d.valorConIva)}</option>`,
  ).join("");
}

function nuevaFilaDispositivo() {
  const item = document.createElement("div");
  item.className = "presense-disp-item";
  item.innerHTML = `
    <div class="presense-disp-row">
      <select class="disp-select">${opcionesDispositivos()}</select>
      <input type="text" class="presense-cant disp-cant" placeholder="1" value="1">
      <button type="button" class="secundario btn-eliminar">Quitar</button>
    </div>
    <label class="presense-disp-ampliacion-label">
      <input type="checkbox" class="presense-disp-ampliacion-aparte">
      Ampliación Aparte Dispositivo
    </label>
  `;
  item.querySelector(".btn-eliminar").addEventListener("click", () => item.remove());
  dispositivosList.appendChild(item);
  limpiarErrorEn(labelKits);
}

document.getElementById("addDisp").addEventListener("click", () => nuevaFilaDispositivo());

document.getElementById("formaPago").addEventListener("change", (e) => {
  document
    .getElementById("filaCuotas")
    .classList.toggle("oculto", e.target.value !== "cuotas");
});

function calcular() {
  let totalSinIva = 0;
  let totalConIva = 0;
  let totalMensual = 0;
  let hayKitSeleccionado = false;

  // Lista de dispositivos para el cuadro/mail, agrupando por nombre (kit +
  // adicionales) en vez de listar cada origen por separado. Un dispositivo
  // adicional marcado "Ampliación Aparte" NUNCA se combina con un item de
  // la composición del kit que tenga el mismo nombre (es una venta aparte,
  // tiene que quedar visible como entrada propia) - pero sin el texto
  // "(ampliación aparte)", como cualquier otro item de la lista.
  const itemsDispositivos = [];
  const indicePorNombre = new Map();
  const nombresDeComposicion = new Set();

  function agregarItemDispositivo(nombre, cantidad, forzarNuevaEntrada = false) {
    if (!forzarNuevaEntrada && indicePorNombre.has(nombre)) {
      itemsDispositivos[indicePorNombre.get(nombre)].cantidad += cantidad;
      return;
    }
    itemsDispositivos.push({ nombre, cantidad });
    if (!forzarNuevaEntrada) {
      indicePorNombre.set(nombre, itemsDispositivos.length - 1);
    }
  }

  // Info estructurada de kits/dispositivos, para que el speech ComLog arme
  // sus propias líneas reutilizando estos valores ya calculados, sin volver
  // a leer el DOM ni recalcular nada.
  const kitsInfo = [];
  const dispositivosInfo = [];

  document.querySelectorAll(".kit-check").forEach((chk) => {
    if (!chk.checked) return;
    hayKitSeleccionado = true;
    const idx = parseInt(chk.dataset.idx, 10);
    const kit = KITS[idx];
    const cant = parseFloat(chk.closest(".presense-kit-row").querySelector(".kit-cant").value) || 1;
    totalSinIva += kit.valorSinIva * cant;
    totalConIva += kit.valorConIva * cant;
    totalMensual += kit.mensual * cant;

    kitsInfo.push({
      nombre: kit.nombre,
      cantidad: cant,
      valorConIvaTotal: kit.valorConIva * cant,
      mensualTotal: kit.mensual * cant,
    });

    // El nombre genérico del kit se reemplaza por el desglose de los
    // dispositivos que lo componen (si ya se cargó su composición). Cada
    // item de la composición escala con la cantidad de kits vendidos.
    const composicion = composicionPorKitId[kit.id] || [];
    if (composicion.length > 0) {
      composicion.forEach((item) => {
        agregarItemDispositivo(item.nombreItem, item.cantidad * cant);
        nombresDeComposicion.add(item.nombreItem);
      });
    } else {
      agregarItemDispositivo(kit.nombre, cant);
      nombresDeComposicion.add(kit.nombre);
    }
  });

  // Cuando hay un kit seleccionado, su upfront ya incluye los dispositivos
  // agregados por defecto: el mensual (RMR) de cada uno SIEMPRE se suma,
  // pero su upfront (valor con/sin IVA) solo se suma si el operador lo marca
  // como "Ampliación Aparte" (una venta prácticamente independiente del
  // combo). Sin kit seleccionado, cada dispositivo suma todo como siempre.
  document.querySelectorAll(".presense-disp-item").forEach((item) => {
    const idx = parseInt(item.querySelector(".disp-select").value, 10);
    const cant = parseFloat(item.querySelector(".disp-cant").value) || 0;
    if (cant <= 0) return;
    const d = DISPOSITIVOS[idx];
    const ampliacionAparte = item.querySelector(".presense-disp-ampliacion-aparte").checked;
    const tieneUpfrontPropio = !hayKitSeleccionado || ampliacionAparte;

    totalMensual += d.mensual * cant;

    dispositivosInfo.push({
      nombre: d.nombre,
      cantidad: cant,
      tieneUpfrontPropio,
      valorConIvaTotal: d.valorConIva * cant,
      mensualTotal: d.mensual * cant,
    });

    if (tieneUpfrontPropio) {
      totalSinIva += d.valorSinIva * cant;
      totalConIva += d.valorConIva * cant;
    }

    // "Ampliación Aparte" con el mismo nombre que un item de la
    // composición del kit no se combina: queda como entrada propia (sin
    // el texto "(ampliación aparte)", pero separada en la lista).
    const noCombinar = ampliacionAparte && nombresDeComposicion.has(d.nombre);
    agregarItemDispositivo(d.nombre, cant, noCombinar);
  });

  // Suma de RMR (kit + dispositivos) ANTES de sumar la mensualidad vigente
  // del cliente - la usa el speech ComLog, que no incluye ese campo.
  const totalRMR = kitsInfo.reduce((acc, k) => acc + k.mensualTotal, 0) +
    dispositivosInfo.reduce((acc, d) => acc + d.mensualTotal, 0);

  const mensualidadVigente = parseFloat(document.getElementById("mensualidadVigente").value) || 0;
  totalMensual += mensualidadVigente;

  return {
    totalSinIva,
    totalConIva,
    totalMensual,
    dispositivosTexto: itemsDispositivos
      .map((i) => `${i.cantidad} ${i.nombre}`)
      .join(" + "),
    kitsInfo,
    dispositivosInfo,
    totalRMR,
  };
}

// Arma el speech ComLog reutilizando la info estructurada que ya calculó
// calcular() para el cuadro - no vuelve a leer el DOM de kits/dispositivos
// ni recalcula ningún valor.
function generarSpeechPresense(resultadoCalculo) {
  const { kitsInfo, dispositivosInfo, totalRMR } = resultadoCalculo;

  const cartera = document.getElementById("psCartera").value;
  const prefijo = cartera === "OUT" ? "AR_UPSELLING_OUT:" : "AR_UPSELLING:";
  const campana = CAMPANAS_PS[document.getElementById("psCampana").value];

  const formaPago = document.getElementById("formaPago").value;
  const cuotas = document.getElementById("cuotasFinanciamiento").value;
  const fraseTipoPago =
    formaPago === "unico"
      ? "Todo en 1 pago."
      : `Todo en ${cuotas} cuotas con tarjeta de crédito visa/MasterCard Bancaria.`;

  const lineas = [];
  kitsInfo.forEach((kit) => {
    lineas.push(
      `Ampliación de ${kit.cantidad} ${kit.nombre} valor final: ${formatoMoneda(kit.valorConIvaTotal)}${sufijoAdicionalMensual(kit.mensualTotal)}`,
    );
  });
  dispositivosInfo.forEach((d) => {
    if (d.tieneUpfrontPropio) {
      lineas.push(
        `Ampliación de ${d.cantidad} ${d.nombre} valor final: ${formatoMoneda(d.valorConIvaTotal)}${sufijoAdicionalMensual(d.mensualTotal)}`,
      );
    } else {
      lineas.push(`${d.cantidad} ${d.nombre}`);
    }
  });

  const fechaFormateada = formatearFechaCorta(document.getElementById("fecha").value);
  const fueAbonado = document.getElementById("fueAbonado").checked;

  const textoSpeech = campana
    ? `${prefijo} ${campana.textoApertura}\n\n${lineas.join("\n")}\n${fraseTipoPago}\nFecha disponible del cliente: ${fechaFormateada}${fueAbonado ? ", Ya abonado" : ""}.\n\nTotal RMR: ${formatoMoneda(totalRMR)}`
    : "-";

  document.getElementById("outSpeechComLog").textContent = textoSpeech;
}

// ==================== VALIDACIÓN INLINE DE CAMPOS OBLIGATORIOS ====================
// El mensaje de error se inserta como hermano del propio campo (o del label,
// para el caso de Kits/Dispositivos que no es un campo puntual), y se
// reutiliza si ya existe en vez de duplicarlo en cada intento.

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

// Campo puntual (input/select): además del mensaje, resalta el borde.
function mostrarErrorCampo(el, mensaje) {
  el.classList.add("campo-error");
  mostrarErrorEn(el, mensaje);
}

function limpiarErrorCampo(el) {
  el.classList.remove("campo-error");
  limpiarErrorEn(el);
}

const labelKits = document.getElementById("labelKits");

// Valida los campos obligatorios antes de generar. En vez de un alert(),
// resalta cada campo inválido con borde rojo + mensaje debajo (ver
// mostrarErrorCampo/mostrarErrorEn) y hace scroll al primero. El checkbox
// "¿Fue abonado?" y el de "Ampliación Aparte Dispositivo" de cada fila
// quedan afuera a propósito: son opcionales.
function validarCamposPresense() {
  let primerCampoInvalido = null;
  const marcar = (el, mensaje) => {
    mostrarErrorCampo(el, mensaje);
    if (!primerCampoInvalido) primerCampoInvalido = el;
  };

  const nroInst = document.getElementById("nroInst");
  if (nroInst.value.trim()) {
    limpiarErrorCampo(nroInst);
  } else {
    marcar(nroInst, "Este campo es obligatorio.");
  }

  const zona = document.getElementById("zona");
  if (zona.value.trim()) {
    limpiarErrorCampo(zona);
  } else {
    marcar(zona, "Este campo es obligatorio.");
  }

  const fecha = document.getElementById("fecha");
  if (fecha.value) {
    limpiarErrorCampo(fecha);
  } else {
    marcar(fecha, "Este campo es obligatorio.");
  }

  const formaPagoEl = document.getElementById("formaPago");
  if (formaPagoEl.value) {
    limpiarErrorCampo(formaPagoEl);
  } else {
    marcar(formaPagoEl, "Elegí una forma de pago.");
  }

  const cuotasEl = document.getElementById("cuotasFinanciamiento");
  if (formaPagoEl.value === "cuotas" && !cuotasEl.value) {
    marcar(cuotasEl, "Elegí la cantidad de cuotas.");
  } else {
    limpiarErrorCampo(cuotasEl);
  }

  // El input arranca vacío ("") por defecto: hay que diferenciar eso de que
  // el operador haya tipeado 0 a propósito.
  const mensualidadVigente = document.getElementById("mensualidadVigente");
  if (mensualidadVigente.value === "") {
    marcar(mensualidadVigente, "Este campo es obligatorio (podés ingresar 0).");
  } else {
    limpiarErrorCampo(mensualidadVigente);
  }

  const psCartera = document.getElementById("psCartera");
  if (psCartera.value) {
    limpiarErrorCampo(psCartera);
  } else {
    marcar(psCartera, "Elegí una cartera.");
  }

  const psCampana = document.getElementById("psCampana");
  if (psCampana.value) {
    limpiarErrorCampo(psCampana);
  } else {
    marcar(psCampana, "Elegí una campaña.");
  }

  const hayKitTildado = document.querySelector(".kit-check:checked");
  const hayDispositivoAgregado = dispositivosList.children.length > 0;
  if (hayKitTildado || hayDispositivoAgregado) {
    limpiarErrorEn(labelKits);
  } else {
    mostrarErrorEn(labelKits, "Agregá al menos un kit o un dispositivo.");
    if (!primerCampoInvalido) primerCampoInvalido = labelKits;
  }

  if (primerCampoInvalido) {
    primerCampoInvalido.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

// Ni bien el operador corrige un campo puntual, se le saca el error de
// encima - no hace falta esperar a un nuevo intento de "Generar".
document.getElementById("nroInst").addEventListener("input", (e) => {
  if (e.target.value.trim()) limpiarErrorCampo(e.target);
});
document.getElementById("zona").addEventListener("input", (e) => {
  if (e.target.value.trim()) limpiarErrorCampo(e.target);
});
document.getElementById("fecha").addEventListener("input", (e) => {
  if (e.target.value) limpiarErrorCampo(e.target);
});
document.getElementById("formaPago").addEventListener("change", (e) => {
  if (e.target.value) limpiarErrorCampo(e.target);
});
document.getElementById("cuotasFinanciamiento").addEventListener("change", (e) => {
  if (e.target.value) limpiarErrorCampo(e.target);
});
document.getElementById("mensualidadVigente").addEventListener("input", (e) => {
  if (e.target.value !== "") limpiarErrorCampo(e.target);
});
document.getElementById("psCartera").addEventListener("change", (e) => {
  if (e.target.value) limpiarErrorCampo(e.target);
});
document.getElementById("psCampana").addEventListener("change", (e) => {
  if (e.target.value) limpiarErrorCampo(e.target);
});

document.getElementById("generar").addEventListener("click", () => {
  if (!validarCamposPresense()) return;

  const resultadoCalculo = calcular();
  const { totalSinIva, totalConIva, totalMensual, dispositivosTexto } = resultadoCalculo;
  const formaPago = document.getElementById("formaPago").value;
  const cuotas = document.getElementById("cuotasFinanciamiento").value;
  const textoUpfrontCon =
    formaPago === "unico"
      ? `${formatoMoneda(totalConIva)} abonado en 1 pago`
      : `${formatoMoneda(totalConIva)} en ${cuotas} cuotas`;

  // Datos del cuadro, para pasarle directo a generarCuerpoMail() - ya no
  // hay una vista previa del cuadro en pantalla, así que no se pisan nodos
  // ocultos del DOM como antes.
  const datosCuadro = {
    nro: document.getElementById("nroInst").value,
    zona: document.getElementById("zona").value,
    fecha: formatearFecha(document.getElementById("fecha").value),
    upfrontSin: formatoMoneda(totalSinIva),
    upfrontCon: textoUpfrontCon,
    abono: formatoMoneda(totalMensual),
    dispositivosTexto,
    fueAbonado: document.getElementById("fueAbonado").checked,
  };

  generarSpeechPresense(resultadoCalculo);
  generarCuerpoMail(datosCuadro);

  document.getElementById("resultadoSpeechWrap").classList.remove("oculto");
  document.getElementById("resultadoCuerpoMailWrap").classList.remove("oculto");
  volverBtn.classList.remove("oculto");
  resultadosWrap.scrollIntoView({ behavior: "smooth" });
});

volverBtn.addEventListener("click", () => {
  document.getElementById("resultadoSpeechWrap").classList.add("oculto");
  document.getElementById("resultadoCuerpoMailWrap").classList.add("oculto");
  volverBtn.classList.add("oculto");
});

// El HTML del cuadro va embebido en el cuerpo de mail para pegar directo en
// Outlook (ver generarCuerpoMail()), que no lee style.css ni sabe nada del
// tema claro/oscuro de la app - por eso acá van estilos inline con los
// colores de marca hardcodeados (#ED002F / #262626 / #8A8C8E). Recibe los
// datos ya formateados en vez de leerlos del DOM: no hay una vista previa
// propia del cuadro en pantalla, solo se usa embebido.
function generarHtmlCuadro(datos) {
  const { nro, zona, fecha, upfrontSin, upfrontCon, abono, dispositivosTexto, fueAbonado } = datos;

  const filaAviso = fueAbonado
    ? `<span style="font-size:13px;font-weight:bold;color:#1a7f37;display:block;">EL CAMBIO DE TECNOLOGÍA YA SE ENCUENTRA ABONADO.</span>
      <span style="font-size:13px;">Se adjunta comprobante de pago correspondiente.</span>`
    : `<span style="font-size:13px;font-weight:bold;">El cambio de tecnología no está abonado.</span>`;

  return `
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:Arial,sans-serif;border:1px solid #c7c9cb;">
    <tr><td colspan="2" style="padding:14px 18px;border-bottom:3px solid #ED002F;">
      <span style="font-size:11px;letter-spacing:0.04em;color:#AB192D;font-weight:bold;">VERISURE ARGENTINA</span><br>
      <span style="font-size:16px;color:#262626;">Cambio de tecnología · VF a PreSense</span>
    </td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Nro de instalación</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${nro}</td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Zona</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${zona}</td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Fecha solicitada</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${fecha}</td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Upfront sin IVA</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${upfrontSin}</td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Upfront con IVA</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${upfrontCon}</td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Abono mensual total</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${abono}</td></tr>
    <tr><td style="padding:9px 18px;color:#8A8C8E;font-size:14px;">Dispositivos</td><td style="padding:9px 18px;text-align:right;font-size:14px;">${dispositivosTexto}</td></tr>
    <tr><td colspan="2" style="padding:12px 18px;background:#f0f1f1;border-left:3px solid #ED002F;">
      ${filaAviso}
    </td></tr>
  </table>`;
}

// Arma el cuerpo de mail fijo (saludo + cuadro embebido + cierre), listo
// para pegar directo en Outlook. El cuadro se inserta como el HTML real
// (no como texto), reutilizando generarHtmlCuadro() sin volver a armarlo.
// La línea del comprobante de pago se omite entera (no se reemplaza) si el
// cambio de tecnología no fue abonado.
function generarCuerpoMail(datosCuadro) {
  const cuadroHtml = generarHtmlCuadro(datosCuadro);

  document.getElementById("outCuerpoMail").innerHTML = `
    <p>Buenas tardes equipo, espero se encuentren bien.</p>
    <p>En comunicación con el titular, aceptó el cambio de tecnología de VF a PreSense. Adjunto detalle:</p>
    ${cuadroHtml}
    <p>Sumamos al equipo de Field para que nos dé prioridad en la instalación.</p>
    <p>Esto tiene que ser volcado, no cambia ningún dato de SBN. Se conserva el mismo titular.</p>
    <p>Por favor mantenernos al tanto de la instalación.</p>
    <p>Saludos.</p>
  `;
}

// Copia HTML (no texto plano) al portapapeles, para que al pegar en un
// editor de mail como Outlook se vea formateado. Compartida entre el botón
// del cuadro y el del cuerpo de mail completo.
async function copiarHtmlAlPortapapeles(html, boton) {
  const original = boton.textContent;

  try {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      const blob = new Blob([html], { type: "text/html" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
      boton.textContent = "Copiado ✓";
      setTimeout(() => (boton.textContent = original), 1800);
      return;
    }
    throw new Error("Clipboard API no disponible");
  } catch {
    try {
      const temp = document.createElement("div");
      temp.setAttribute("contenteditable", "true");
      temp.style.position = "fixed";
      temp.style.left = "-9999px";
      temp.innerHTML = html;
      document.body.appendChild(temp);

      const range = document.createRange();
      range.selectNodeContents(temp);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      const ok = document.execCommand("copy");
      sel.removeAllRanges();
      document.body.removeChild(temp);

      if (ok) {
        boton.textContent = "Copiado ✓";
        setTimeout(() => (boton.textContent = original), 1800);
      } else {
        throw new Error("execCommand falló");
      }
    } catch {
      alert(
        "No se pudo copiar automáticamente. Hacé clic dentro del cuadro de arriba, seleccioná todo (Ctrl+A) y copiá (Ctrl+C).",
      );
    }
  }
}

document.getElementById("copiarCuerpoMail").addEventListener("click", () => {
  const html = document.getElementById("outCuerpoMail").innerHTML;
  copiarHtmlAlPortapapeles(html, document.getElementById("copiarCuerpoMail"));
});

document.getElementById("copiarSpeechComLog").addEventListener("click", () => {
  const texto = document.getElementById("outSpeechComLog").textContent;
  navigator.clipboard.writeText(texto).then(() => alert("Copiado al portapapeles"));
});

// ---- Carga inicial ----
async function init() {
  try {
    KITS = await presenseKitsRepository.getAll();
  } catch (err) {
    alert(err.message);
    KITS = [];
  }

  try {
    DISPOSITIVOS = await presenseDispositivosRepository.getAll();
  } catch (err) {
    alert(err.message);
    DISPOSITIVOS = [];
  }

  renderKits();
  nuevaFilaDispositivo();
  await cargarCampanasPresense();
}

init();
