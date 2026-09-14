# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A vanilla HTML/CSS/JS frontend (no framework, no bundler, no `package.json`) for generating standardized Verisure Argentina sales/upselling "speeches" (scripted text blocks agents paste into internal tools) and copy-paste HTML snippets for email. It is a pure static site of ES modules that talks to a separate backend repo (`generatorups-backend`, not in this repo) for all catalog data.

## Running / developing

There is no build step, package manager, linter, or test suite in this repo — it's static files served as-is.

- **Serve locally**: the pages use `<script type="module">`, which browsers block from `file://` (CORS). Serve the folder over HTTP, e.g. `npx serve .` or `python -m http.server`, then open `index.html`.
- **No build/lint/test commands exist.** Don't look for or invent npm scripts.
- **Backend dependency**: all dynamic data (device catalogs, operators, campaigns, turnos horarios, PreSense kits/devices) comes from a live API at `src/data/apiConfig.js` (`API_BASE_URL`, currently `https://generatorups-backend.onrender.com/api`). Without that backend reachable, every select/list in the UI comes back empty and an `alert()` fires. There's no mock/offline mode.

## Pages (three independent entry points sharing CSS/theme)

- **`index.html` + `main.js`** — main "Ampliación / Upselling" generator. Lets an agent add one or more devices (Verisure "Verifast" line or "Presense" line), pick a price level, payment type, operator, campaign, visit date/turno, and generates two text blocks: "Resultado Mantenimiento" (internal, prefixed `AR_UPSELLING:` / `AR_UPSELLING_OUT:` per cartera) and "Resultado ComLog" (customer-facing speech built from the campaign's `textoApertura`).
- **`presense/index.html` + `presense/presense.js`** — "Cambio de Tecnología" (VF→PreSense) generator. Lets an agent pick PreSense kits and/or individual devices, computes upfront/monthly totals, and generates (a) an HTML `<table>` cuadro meant to be pasted into an Outlook email body, and (b) a ComLog speech text.
- **`admin/index.html` + `admin/admin.js`** — CRUD admin panel for every catalog used above (devices per línea, operators, campaigns, turnos horarios, PreSense kits + their composición sub-items, PreSense devices). Gated behind a login form; see Auth below.

All three load `src/theme.js` as a module for the light/dark toggle (`data-theme` on `<body>`, persisted to `localStorage["generatorups_theme"]`) and share `style.css` (CSS custom properties per theme, `:root` vs `[data-theme="dark"]`).

## Data layer (`src/data/*Repository.js`)

Every resource has its own repository file (`devicesRepository.js`, `operatorsRepository.js`, `campanasRepository.js`, `turnosHorariosRepository.js`, `presenseKitsRepository.js`, `presenseDispositivosRepository.js`, `presenseKitComposicionRepository.js`). They all **duplicate the same pattern** rather than sharing a base module:

- A local `errorConStatus(mensaje, status)` that builds an `Error` carrying `.status`.
- A local `fetchJson(url, options)` wrapper: network failures become a generic "no se pudo conectar" error (`status: null`), non-OK responses try to read a JSON `{ message }` body and throw with the HTTP status attached, `204` returns `null`.
- `getAll` / `add` / `update` / `remove` functions hitting `${API_BASE_URL}/<resource>` with `getAuthHeader()` merged into write requests.

When adding a new backend resource, copy this same shape rather than trying to find a shared helper — there isn't one (each file is independently copy-pasted, including error handling and comments).

`authHeader.js` is the single place that reads/writes the admin bearer token (`localStorage["generatorups_admin_token"]`); nothing else should touch that key directly. `admin.js` wraps every authenticated repository call in `conManejoDeAuth()`, which force-logs-out and shows "session expired" on a `401`, and re-throws everything else for a local `alert()`.

## Domain logic worth knowing before touching `main.js` / `presense.js`

- **Price levels** (`main.js` `NIVELES`): Alto/Medio/Bajo/Financiado/"Promo 50%" map to catalog fields `valorAlto`/`valorMedio`/`valorBajo`/`valorFinanciado`/`valorPromoCincuenta`. A `null` value for the selected level means "not available for this line" and disables the price input with a visible warning.
- **PreSense is special-cased** (`NIVELES_PRESENSE`): it only exposes Alto/Bajo, and its "Bajo" is read from `valorFinanciado` in the catalog (not `valorBajo`, which stays null for that line) — the same price is used whether paid upfront or financed.
- **Arlo cameras** (catalog items with `tipoPlan` set: `SMART`/`CVR`) don't use a manual "adicional" (RMR) field — instead the row shows a "plazo de grabación" select (3/7/14/30 días) and the RMR autofills from `rmr3dias`/`rmr7dias`/`rmr14dias`/`rmr30dias` on the catalog item.
- **IVA math** differs by page: `main.js` stores catalog prices without IVA and always multiplies by `1.21` to get "valor con IVA"; the PreSense catalog (kits and devices) stores `valorSinIva`/`valorConIva` as independent fields set directly in the admin, with no `*1.21` derivation.
- **"Ya abonado" / "cobrado" markers**: in `main.js`, if *some* (not all) devices in a request are marked "ya abonado", that block alone gets wrapped in `***NO COBRAR AMPLIACIÓN YA ABONADA***`; if *all* devices are marked, the marker wraps the entire generated message once instead.
- **PreSense kit vs. device upfront**: when a kit is selected, its devices' monthly RMR is always added, but their upfront (con/sin IVA) is only added if the operator checks "Ampliación Aparte Dispositivo" for that row — otherwise the kit's own upfront already covers it. Kit "composición" (the list of devices a kit expands to, fetched per-kit and cached in `composicionPorKitId`) is what replaces the generic kit name with itemized device lines in the generated speech.
- **Copying to Outlook**: `presense.js`'s "Copiar cuadro para el mail" builds a second, hand-styled HTML table with hardcoded brand colors (`#ED002F`/`#262626`/`#8A8C8E`) — separate from the on-screen preview markup/CSS — because the pasted destination (Outlook) won't load `style.css` or respect the light/dark theme. It uses the `ClipboardItem`/`text/html` clipboard API with a `document.execCommand("copy")` fallback for older browsers.




## Language & Communication
- Respond and communicate always in Spanish.
- Keep inline code comments and variable names in English if that is the project's convention.