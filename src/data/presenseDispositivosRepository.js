import { API_BASE_URL } from "./apiConfig.js";
import { getAuthHeader } from "./authHeader.js";

// Todas las lecturas/escrituras de dispositivos PreSense van contra el
// backend, sin localStorage ni catálogos hardcodeados.

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
  return fetchJson(`${API_BASE_URL}/presense-dispositivos`);
}

export async function add(dispositivo) {
  return fetchJson(`${API_BASE_URL}/presense-dispositivos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(dispositivo),
  });
}

export async function update(id, cambios) {
  return fetchJson(`${API_BASE_URL}/presense-dispositivos/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify(cambios),
  });
}

export async function remove(id) {
  return fetchJson(`${API_BASE_URL}/presense-dispositivos/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
}
