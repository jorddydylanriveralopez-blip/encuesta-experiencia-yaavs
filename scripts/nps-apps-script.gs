/**
 * Google Apps Script — Encuesta NPS YAAVS → Google Sheets
 *
 * Setup:
 * 1. Crea un Google Sheet (o usa uno existente).
 * 2. Extensiones → Apps Script → pega este código completo.
 * 3. Guardar → Implementar → Nueva implementación → Aplicación web
 *    - Ejecutar como: Yo
 *    - Quién tiene acceso: Cualquiera
 * 4. Copia la URL /exec y pégala en public/config.js → endpoint
 *
 * Si actualizas el código después, crea una NUEVA versión en Implementar.
 */

var DEFAULT_SHEET = "Respuestas NPS";

function doOptions() {
  return json_({ ok: true });
}

function doGet() {
  return json_({ ok: true, service: "yaavs-nps-survey" });
}

function doPost(e) {
  try {
    var data = parseBody_(e);

    // Honeypot
    if (String(data.website || data.hp_url || "").trim()) {
      return json_({ ok: true });
    }

    var clave = String(data.clave || "").trim();
    if (!clave) {
      return json_({ ok: false, error: "Falta la clave YAAVSER" });
    }

    var sheetName = String(data.sheetName || DEFAULT_SHEET).trim() || DEFAULT_SHEET;
    var sheet = getOrCreateSheet_(sheetName);

    sheet.appendRow([
      new Date(),
      clave,
      data.nps,
      data.motivo || "",
      data.ejecutivo,
      data.visitaEjecutivo || "",
      data.mesaUso || "",
      data.mesa_soporte || "",
      data.mesa_espera || "",
      data.mesa_resolucion || "",
      data.mesa_amabilidad || "",
      data.mesa_conocimiento || "",
      data.mesa_trato || "",
      data.mesaMejoras || "",
      data.recargaMetodo || "",
      data.recargaUso || "",
      data.recargaExp || "",
      data.recargaMejora || "",
      data.popUso || "",
      data.popSat || "",
      data.popMejora || "",
      data.productosYaavs || "",
      data.distribuidores || "",
      data.competencia || "",
      data.rentabilidad,
      data.mejoraGeneral || "",
      data.oportunidadesNegocio || "",
    ]);

    return json_({ ok: true });
  } catch (err) {
    return json_({
      ok: false,
      error: String(err && err.message ? err.message : err),
    });
  }
}

function parseBody_(e) {
  if (!e) return {};
  if (e.parameter && Object.keys(e.parameter).length) return e.parameter;
  var raw = (e.postData && e.postData.contents) || "";
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    return {};
  }
}

function getOrCreateSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow([
      "Timestamp",
      "Clave YAAVSER",
      "NPS",
      "Motivo",
      "Ejecutivo (1-5)",
      "Visita ejecutivo",
      "Mesa uso",
      "Mesa: Soporte",
      "Mesa: Espera",
      "Mesa: Resolución",
      "Mesa: Amabilidad",
      "Mesa: Conocimiento",
      "Mesa: Trato",
      "Mesa mejoras",
      "Método recarga",
      "RecargaKlic uso",
      "RecargaKlic exp",
      "RecargaKlic mejora",
      "POP uso",
      "POP satisfacción",
      "POP mejora",
      "Productos YAAVS",
      "Distribuidores",
      "Competencia",
      "Ganancias",
      "Mejora general",
      "Oportunidades de negocio",
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 27).setFontWeight("bold");
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
