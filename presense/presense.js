import * as presenseKitsRepository from "../src/data/presenseKitsRepository.js";
import * as presenseDispositivosRepository from "../src/data/presenseDispositivosRepository.js";

// ---- Catálogos (desde el backend) ----
let KITS = [];
let DISPOSITIVOS = [];

const kitsList = document.getElementById("kitsList");
const dispositivosList = document.getElementById("dispositivosList");
const resultadoWrap = document.getElementById("resultadoWrap");

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

// Convierte el valor de un <input type="date"> (yyyy-mm-dd) a "DD/MM/AAAA".
function formatearFecha(fechaISO) {
  if (!fechaISO) return "";
  const [anio, mes, dia] = fechaISO.split("-");
  return `${dia}/${mes}/${anio}`;
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
  const partes = [];
  let hayKitSeleccionado = false;

  document.querySelectorAll(".kit-check").forEach((chk) => {
    if (!chk.checked) return;
    hayKitSeleccionado = true;
    const idx = parseInt(chk.dataset.idx, 10);
    const kit = KITS[idx];
    const cant = parseFloat(chk.closest(".presense-kit-row").querySelector(".kit-cant").value) || 1;
    totalSinIva += kit.valorSinIva * cant;
    totalConIva += kit.valorConIva * cant;
    totalMensual += kit.mensual * cant;
    partes.push(`${cant} ${kit.nombre}`);
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

    totalMensual += d.mensual * cant;

    if (!hayKitSeleccionado || ampliacionAparte) {
      totalSinIva += d.valorSinIva * cant;
      totalConIva += d.valorConIva * cant;
      partes.push(`${cant} ${d.nombre}` + (hayKitSeleccionado ? " (ampliación aparte)" : ""));
    } else {
      partes.push(`${cant} ${d.nombre} (solo RMR)`);
    }
  });

  const mensualidadVigente = parseFloat(document.getElementById("mensualidadVigente").value) || 0;
  totalMensual += mensualidadVigente;

  return { totalSinIva, totalConIva, totalMensual, dispositivosTexto: partes.join(" + ") };
}

document.getElementById("generar").addEventListener("click", () => {
  const { totalSinIva, totalConIva, totalMensual, dispositivosTexto } = calcular();
  const formaPago = document.getElementById("formaPago").value;
  const cuotas = document.getElementById("cuotasFinanciamiento").value;
  const textoUpfrontCon =
    formaPago === "unico"
      ? `${formatoMoneda(totalConIva)} abonado en 1 pago`
      : `${formatoMoneda(totalConIva)} en ${cuotas} cuotas`;

  document.getElementById("outNro").textContent = document.getElementById("nroInst").value;
  document.getElementById("outZona").textContent = document.getElementById("zona").value;
  document.getElementById("outFecha").textContent = formatearFecha(
    document.getElementById("fecha").value,
  );
  document.getElementById("outUpfrontSin").textContent = formatoMoneda(totalSinIva);
  document.getElementById("outUpfrontCon").textContent = textoUpfrontCon;
  document.getElementById("outAbono").textContent = formatoMoneda(totalMensual);
  document.getElementById("outDispositivos").textContent = dispositivosTexto;

  resultadoWrap.classList.remove("oculto");
  resultadoWrap.scrollIntoView({ behavior: "smooth" });
});

document.getElementById("volver").addEventListener("click", () => {
  resultadoWrap.classList.add("oculto");
});

// El HTML que se copia va pegado directo en el cuerpo de un mail de Outlook,
// que no lee style.css ni sabe nada del tema claro/oscuro de la app - por
// eso acá sí van estilos inline con los colores de marca hardcodeados
// (#ED002F / #262626 / #8A8C8E), a diferencia de la vista previa en pantalla
// de arriba, que usa las clases y variables de tema de style.css.
document.getElementById("copiarHtml").addEventListener("click", async () => {
  const html = `
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:collapse;font-family:Arial,sans-serif;border:1px solid #c7c9cb;">
    <tr><td colspan="2" style="padding:14px 18px;border-bottom:3px solid #ED002F;">
      <span style="font-size:11px;letter-spacing:0.04em;color:#AB192D;font-weight:bold;">VERISURE ARGENTINA</span><br>
      <span style="font-size:16px;color:#262626;">Cambio de tecnología · VF a PreSense</span>
    </td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Nro de instalación</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${document.getElementById("outNro").textContent}</td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Zona</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${document.getElementById("outZona").textContent}</td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Fecha solicitada</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${document.getElementById("outFecha").textContent}</td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Upfront sin IVA</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${document.getElementById("outUpfrontSin").textContent}</td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Upfront con IVA</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${document.getElementById("outUpfrontCon").textContent}</td></tr>
    <tr><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;color:#8A8C8E;font-size:14px;">Abono mensual total</td><td style="padding:9px 18px;border-bottom:1px solid #f0f1f1;text-align:right;font-size:14px;">${document.getElementById("outAbono").textContent}</td></tr>
    <tr><td style="padding:9px 18px;color:#8A8C8E;font-size:14px;">Dispositivos</td><td style="padding:9px 18px;text-align:right;font-size:14px;">${document.getElementById("outDispositivos").textContent}</td></tr>
    <tr><td colspan="2" style="padding:12px 18px;background:#f0f1f1;border-left:3px solid #ED002F;">
      <span style="font-size:13px;font-weight:bold;display:block;">El cambio de tecnología ya se encuentra abonado.</span>
      <span style="font-size:13px;">Se adjunta comprobante de pago correspondiente.</span>
    </td></tr>
  </table>`;

  const btn = document.getElementById("copiarHtml");
  const original = btn.textContent;

  try {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      const blob = new Blob([html], { type: "text/html" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]);
      btn.textContent = "Copiado ✓";
      setTimeout(() => (btn.textContent = original), 1800);
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
        btn.textContent = "Copiado ✓";
        setTimeout(() => (btn.textContent = original), 1800);
      } else {
        throw new Error("execCommand falló");
      }
    } catch {
      alert(
        "No se pudo copiar automáticamente. Hacé clic dentro del cuadro de arriba, seleccioná todo (Ctrl+A) y copiá (Ctrl+C).",
      );
    }
  }
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
}

init();
