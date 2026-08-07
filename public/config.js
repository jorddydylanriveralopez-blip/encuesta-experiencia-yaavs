/**
 * Conexión a Google Sheets vía Apps Script.
 *
 * 1. Crea un Google Sheet nuevo.
 * 2. Extensiones → Apps Script → pega scripts/nps-apps-script.gs
 * 3. Implementar → Nueva implementación → Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquiera
 * 4. Copia la URL …/macros/s/…/exec y pégala abajo en `endpoint`.
 */
window.YAAVS_NPS_CONFIG = {
  endpoint: "",
  sheetName: "Respuestas NPS",
};
