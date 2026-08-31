// Helper compartido para armar el header de autorización en los fetch a
// endpoints protegidos del admin. Nadie más debe leer el token de
// localStorage directamente: todo pasa por acá.

export const ADMIN_TOKEN_KEY = "generatorups_admin_token";

export function getToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

// Devuelve el objeto de headers listo para mergear en un fetch. Si no hay
// token guardado, devuelve un objeto vacío (el fetch va a fallar con 401,
// que es responsabilidad de quien llama manejar).
export function getAuthHeader() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
