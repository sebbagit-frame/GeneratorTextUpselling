import { getItem, setItem } from "./storage.js";
import {
  CATALOGO_DISPOSITIVOS,
  CATALOGO_DISPOSITIVOS_PRESENSE,
} from "./catalogoDispositivos.js";

const KEYS = {
  verisure: "generatorups_dispositivos_verisure",
  presense: "generatorups_dispositivos_presense",
};

const SEEDS = {
  verisure: CATALOGO_DISPOSITIVOS,
  presense: CATALOGO_DISPOSITIVOS_PRESENSE,
};

function keyDe(linea) {
  const key = KEYS[linea];
  if (!key) throw new Error(`Línea de dispositivos desconocida: ${linea}`);
  return key;
}

// Slug del nombre + timestamp, para no depender de que el admin tipee un id
function generarId(nombre) {
  const slug = (nombre || "dispositivo")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${slug}_${Date.now()}`;
}

// Lee el catálogo de una línea desde localStorage. La primera vez que se
// pide una línea sin datos guardados, siembra con el catálogo hardcodeado
// y lo persiste, para que las siguientes lecturas ya vengan de ahí.
export function getAll(linea) {
  const key = keyDe(linea);
  const guardado = getItem(key, null);
  if (guardado !== null) return guardado;

  const seed = SEEDS[linea];
  setItem(key, seed);
  return seed;
}

export function add(linea, dispositivo) {
  const lista = getAll(linea);
  const nuevo = {
    id: dispositivo.id || generarId(dispositivo.nombre),
    nombre: dispositivo.nombre,
    valorAlto: dispositivo.valorAlto ?? null,
    valorMedio: dispositivo.valorMedio ?? null,
    valorBajo: dispositivo.valorBajo ?? null,
    valorFinanciado: dispositivo.valorFinanciado ?? null,
  };

  setItem(keyDe(linea), [...lista, nuevo]);
  return nuevo;
}

export function update(linea, id, cambios) {
  const lista = getAll(linea);
  const actualizada = lista.map((item) =>
    item.id === id ? { ...item, ...cambios } : item,
  );
  setItem(keyDe(linea), actualizada);
}

export function remove(linea, id) {
  const lista = getAll(linea);
  setItem(
    keyDe(linea),
    lista.filter((item) => item.id !== id),
  );
}
