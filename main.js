import * as devicesRepository from "./src/data/devicesRepository.js";
import * as operatorsRepository from "./src/data/operatorsRepository.js";

// ---- OPERADORES (desde localStorage, editable desde /admin) ----
      const OPERADORES = operatorsRepository.getAll();

      // Cargar operadores
      const selOperador = document.getElementById("operador");
      OPERADORES.forEach((op, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = `${op.nombre} - Mtr ${op.matricula}`;
        selOperador.appendChild(opt);
      });

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
      ];

      // Presense solo maneja dos niveles: Alto y Bajo. Su "Bajo" no vive en
      // valorBajo (queda null en el catálogo) sino en valorFinanciado, porque
      // ese mismo precio es el que se usa tanto al contado como financiado.
      const NIVELES_PRESENSE = [
        { value: "Alto", campo: "valorAlto" },
        { value: "Bajo", campo: "valorFinanciado" },
      ];

      function obtenerCatalogo(linea) {
        return devicesRepository.getAll(linea === "presense" ? "presense" : "verisure");
      }

      function obtenerNiveles(linea) {
        return linea === "presense" ? NIVELES_PRESENSE : NIVELES;
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
    </select>
    <div class="disp-aviso oculto">No disponible para esta línea</div>
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
  `;
        wrap.appendChild(div);
        onCambioLinea(id);
      }

      function quitarDispositivo(id) {
        const el = wrap.querySelector(`[data-id="${id}"]`);
        if (el) el.remove();
      }

      // Repuebla los selects de dispositivo y nivel según la línea elegida
      function onCambioLinea(id) {
        const el = wrap.querySelector(`[data-id="${id}"]`);
        const linea = el.querySelector(".disp-linea").value;
        const catalogo = obtenerCatalogo(linea);
        const selDispositivo = el.querySelector(".disp-dispositivo");
        const selNivel = el.querySelector(".disp-nivel");

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

        onCambioSeleccion(id);
      }

      // Obtiene el item de catálogo elegido en la fila (línea + dispositivo)
      function obtenerItemCatalogo(el) {
        const linea = el.querySelector(".disp-linea").value;
        const dispositivoId = el.querySelector(".disp-dispositivo").value;
        return obtenerCatalogo(linea).find((item) => item.id === dispositivoId);
      }

      // Al elegir dispositivo o nivel: autocompleta el valor con IVA, o
      // muestra el aviso de "no disponible" si el nivel es null en el catálogo
      function onCambioSeleccion(id) {
        const el = wrap.querySelector(`[data-id="${id}"]`);
        const linea = el.querySelector(".disp-linea").value;
        const item = obtenerItemCatalogo(el);
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
        inputAdicional.value = item && item.mensual != null ? item.mensual : "";

        calcularIva(id);
      }

      function calcularIva(id) {
        const el = wrap.querySelector(`[data-id="${id}"]`);
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

      // Cargar el primer dispositivo por defecto
      agregarDispositivo();

      function generar() {
        const items = wrap.querySelectorAll(".dispositivo-item");

        // Validar que ningún dispositivo tenga el valor deshabilitado o vacío
        // (nivel no disponible para la línea elegida)
        for (const el of items) {
          const inputValor = el.querySelector(".disp-valor-coniva");
          if (inputValor.disabled || inputValor.value === "") {
            const item = obtenerItemCatalogo(el);
            const nombre = item ? item.nombre : "seleccionado";
            const nivel = el.querySelector(".disp-nivel").value;
            alert(
              `El dispositivo ${nombre} no tiene valor disponible para el nivel ${nivel} seleccionado. Elegí otro nivel.`,
            );
            return;
          }
        }

        const bloques = [];
        let sumaAdicional = 0;

        items.forEach((el) => {
          const item = obtenerItemCatalogo(el);
          const nombre = item ? item.nombre : "";
          const cantidad = parseInt(el.querySelector(".disp-cantidad").value) || 1;
          const valConIva =
            parseFloat(el.querySelector(".disp-valor-coniva").value) || 0;
          const adicional =
            parseFloat(el.querySelector(".disp-adicional").value) || 0;

          const totalConIva = valConIva * cantidad;
          const totalSinIva = totalConIva / 1.21;

          bloques.push(
            `Ampliación ${cantidad} ${nombre} monto sin iva: ${formatoMoneda(totalSinIva)} monto con iva: ${formatoMoneda(totalConIva)}`,
          );
          sumaAdicional += adicional * cantidad;
        });

        const dispositivosTexto = bloques.join(" / ");
        const adicional = formatoMoneda(sumaAdicional);

        const cartera = document.getElementById("cartera").value;
        const prefijo =
          cartera === "OUT" ? "AR_UPSELLING_OUT:" : "AR_UPSELLING:";
        const tipoPago = document.getElementById("tipoPago").value;
        const cuotas = document.getElementById("cuotas").value;
        const operador = OPERADORES[selOperador.value];
        const cobrado = document.getElementById("cobrado").checked;

        let texto = "";

        if (tipoPago === "transferencia") {
          texto = `${prefijo} ${dispositivosTexto} (Adicional en la cuota: $${adicional}). Todo en 1 pago con transferencia. TT recibirá al técnico en el domicilio.-${operador.nombre} -Mtr_ ${operador.matricula}.`;
        } else if (tipoPago === "tarjeta") {
          texto = `${prefijo} ${dispositivosTexto} (Adicional en la cuota: $${adicional}). Todo en 1 pago con TC Visa/MasterCard. TT recibirá al técnico en el domicilio.-${operador.nombre} -Mtr_ ${operador.matricula}.`;
        } else {
          texto = `${prefijo} ${dispositivosTexto} (Adicional en la cuota: $${adicional}). Todo en ${cuotas} cuotas con tarjeta de crédito visa/MasterCard Bancaria. TT recibirá al técnico en el domicilio.-${operador.nombre} -Mtr_ ${operador.matricula}.`;
        }

        if (cobrado) {
          texto = `***NO COBRAR AMPLIACIÓN YA ABONADA*** COLOCAR ESTE IMPORTE EN EL PARTE DIGITAL${texto}***NO COBRAR AMPLIACIÓN YA ABONADA***`;
        }

        document.getElementById("resultado").textContent = texto;
      }

      function copiar() {
        const texto = document.getElementById("resultado").textContent;
        navigator.clipboard
          .writeText(texto)
          .then(() => alert("Copiado al portapapeles"));
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