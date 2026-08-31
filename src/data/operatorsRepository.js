import { API_BASE_URL } from "./apiConfig.js";
import { getAuthHeader } from "./authHeader.js";

// Todas las lecturas/escrituras de operadores van contra el backend. Ya no
// hay localStorage ni seed hardcodeado acá.

function errorConStatus(mensaje, status) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

async function fetchJson(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw errorConStatus(
      "No se pudo conectar con el servidor. Verificá tu conexión e intentá de nuevo.",
      null,
    );
  }

  if (!res.ok) {
    // El backend valida matrícula duplicada devolviendo 409.
    if (res.status === 409) {
      throw errorConStatus("Ya existe un operador con esa matrícula", 409);
    }

    let mensaje = `Error del servidor (${res.status}).`;
    try {
      const body = await res.json();
      if (body && body.message) mensaje = body.message;
    } catch {
      // sin body JSON, se usa el mensaje genérico
    }
    throw errorConStatus(mensaje, res.status);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function getAll() {
  return fetchJson(`${API_BASE_URL}/operadores`);
}

export async function add(operador) {
  return fetchJson(`${API_BASE_URL}/operadores`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(operador),
  });
}

// El operador se identifica por su id (asignado por el backend), no por la
// matrícula: la matrícula es un campo editable más.
export async function update(id, cambios) {
  return fetchJson(`${API_BASE_URL}/operadores/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(cambios),
  });
}

export async function remove(id) {
  return fetchJson(`${API_BASE_URL}/operadores/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
}
