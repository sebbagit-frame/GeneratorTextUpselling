import { getItem, setItem } from "./storage.js";

const KEY = "generatorups_operadores";

// Seed inicial: la lista fija que antes vivía hardcodeada en main.js
const SEED = [
  { nombre: "Sebastián Mastrángelo", matricula: "Q77833" },
  { nombre: "Delfina Panfili", matricula: "314922" },
  { nombre: "Mariana Raziel", matricula: "333127" },
];

export function getAll() {
  const guardado = getItem(KEY, null);
  if (guardado !== null) return guardado;

  setItem(KEY, SEED);
  return SEED;
}

export function add(operador) {
  const lista = getAll();
  if (lista.some((op) => op.matricula === operador.matricula)) {
    throw new Error(
      `Ya existe un operador con la matrícula ${operador.matricula}.`,
    );
  }

  setItem(KEY, [...lista, operador]);
  return operador;
}

// La matrícula es editable (se puede corregir un typo), pero no puede
// quedar duplicada contra otro operador existente.
export function update(matricula, cambios) {
  const lista = getAll();
  const actual = lista.find((op) => op.matricula === matricula);
  if (!actual) {
    throw new Error(`No existe un operador con la matrícula ${matricula}.`);
  }

  const nuevaMatricula = cambios.matricula ?? matricula;
  const chocaConOtro = lista.some(
    (op) => op.matricula !== matricula && op.matricula === nuevaMatricula,
  );
  if (chocaConOtro) {
    throw new Error(
      `Ya existe un operador con la matrícula ${nuevaMatricula}.`,
    );
  }

  const actualizada = lista.map((op) =>
    op.matricula === matricula ? { ...op, ...cambios } : op,
  );
  setItem(KEY, actualizada);
}

export function remove(matricula) {
  const lista = getAll();
  setItem(
    KEY,
    lista.filter((op) => op.matricula !== matricula),
  );
}
