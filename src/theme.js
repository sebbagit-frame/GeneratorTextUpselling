// Toggle de tema claro/oscuro, compartido entre index.html y admin/index.html.
// Preferencia explícita en localStorage; sin usar prefers-color-scheme.

const THEME_KEY = "generatorups_theme";
const ICONOS = { light: "🌙", dark: "☀️" };

function aplicarTheme(theme) {
  document.body.dataset.theme = theme;
  const boton = document.getElementById("themeToggle");
  if (boton) boton.textContent = ICONOS[theme];
}

const themeGuardado = localStorage.getItem(THEME_KEY) || "light";
aplicarTheme(themeGuardado);

document.getElementById("themeToggle")?.addEventListener("click", () => {
  const actual = document.body.dataset.theme === "dark" ? "dark" : "light";
  const nuevo = actual === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, nuevo);
  aplicarTheme(nuevo);
});
