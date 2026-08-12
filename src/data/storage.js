// Wrapper genérico sobre localStorage. Nadie más en el proyecto debe tocar
// localStorage directamente: todo pasa por acá, así el día de mañana se
// puede reemplazar por una API real cambiando solo este archivo.

export function getItem(key, fallback) {
  const raw = localStorage.getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
