import { API_BASE_URL } from "./apiConfig.js";
import { getAuthHeader } from "./authHeader.js";

// Todas las lecturas/escrituras de dispositivos van contra el backend. Ya no
// hay localStorage ni catálogos hardcodeados acá: la fuente de verdad es la
// API.

// Arma un Error enriquecido con el status HTTP, para que quien llama pueda
// distinguir un 401 (token vencido) de cualquier otro fallo.
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

export async function getAll(linea) {
  return fetchJson(
    `${API_BASE_URL}/dispositivos?linea=${encodeURIComponent(linea)}`,
  );
}

export async function add(linea, dispositivo) {
  return fetchJson(`${API_BASE_URL}/dispositivos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ linea, ...dispositivo }),
  });
}

export async function update(linea, id, cambios) {
  return fetchJson(`${API_BASE_URL}/dispositivos/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    },
    body: JSON.stringify({ linea, ...cambios }),
  });
}

export async function remove(linea, id) {
  return fetchJson(`${API_BASE_URL}/dispositivos/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeader(),
  });
}
