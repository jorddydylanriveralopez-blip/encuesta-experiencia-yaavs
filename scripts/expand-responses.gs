/**
 * Expande el campo "payload" en columnas legibles.
 *
 * UNA VEZ:
 *   1) Guardar
 *   2) Run → expandAllExistingRows (autorizar)
 *   3) Run → installFormSubmitTrigger (para filas nuevas)
 *
 * Nada se oculta: si una pregunta no aplica, se escribe "No aplica".
 */

var HEADERS = [
  "Timestamp",
  "Clave YAAVSER",
  "NPS",
  "Motivo",
  "Ejecutivo (1-5)",
  "Frecuencia visita ejecutivo",
  "¿Usó Mesa de Control?",
  "Soporte recibido (1-5)",
  "Tiempo de espera (1-5)",
  "Resolución de dudas (1-5)",
  "Amabilidad y empatía (1-5)",
  "Conocimiento y claridad (1-5)",
  "Trato recibido (1-5)",
  "Mejoras Mesa de Control",
  "Método de recarga",
  "¿Usó RecargaKlic?",
  "Experiencia RecargaKlic",
  "Mejora RecargaKlic",
  "¿Usó POP?",
  "Satisfacción POP (1-5)",
  "Mejora POP",
  "Productos YAAVS",
  "Otro distribuidor",
  "Qué ofrece la competencia",
  "Ganancias (1-5)",
  "Mejora general",
  "Payload completo",
];

var NA = "No aplica";

function onFormSubmit(e) {
  try {
    var sheet = e.range.getSheet();
    expandFromFormRow_(sheet, e.range.getRow());
  } catch (err) {
    console.error(err);
  }
}

/** Ejecutar una vez para convertir TODAS las filas existentes. */
function expandAllExistingRows() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName("Form Responses 1") || ss.getSheets()[0];
  var dest = ensureExpandedSheet_();
  var last = source.getLastRow();
  if (last < 2) {
    SpreadsheetApp.getUi().alert("No hay respuestas todavía en Form Responses 1.");
    return;
  }

  dest.clearContents();
  dest.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  dest.setFrozenRows(1);

  var rows = [];
  for (var row = 2; row <= last; row++) {
    var ts = source.getRange(row, 1).getValue();
    var raw = String(source.getRange(row, 2).getValue() || "");
    rows.push(rowFromParsed_(ts, parsePayload_(raw), raw));
  }
  if (rows.length) {
    dest.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }
  dest.autoResizeColumns(1, Math.min(HEADERS.length, 12));
}

/** Ejecutar una vez para que cada envío nuevo se expanda solo. */
function installFormSubmitTrigger() {
  var ss = SpreadsheetApp.getActive();
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "onFormSubmit") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("onFormSubmit").forSpreadsheet(ss).onFormSubmit().create();
}

function ensureExpandedSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Respuestas NPS");
  if (!sheet) {
    sheet = ss.insertSheet("Respuestas NPS");
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function expandFromFormRow_(sourceSheet, row) {
  var dest = ensureExpandedSheet_();
  if (dest.getLastRow() === 0) {
    dest.appendRow(HEADERS);
    dest.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    dest.setFrozenRows(1);
  }
  var ts = sourceSheet.getRange(row, 1).getValue();
  var raw = String(sourceSheet.getRange(row, 2).getValue() || "");
  dest.appendRow(rowFromParsed_(ts, parsePayload_(raw), raw));
}

function show_(v) {
  if (v === null || v === undefined) return NA;
  var s = String(v).trim();
  return s === "" ? NA : s;
}

function rowFromParsed_(ts, p, raw) {
  var mesaSi = String(p.mesaUso || "").toLowerCase().indexOf("sí") >= 0 ||
    String(p.mesaUso || "").toLowerCase().indexOf("si") >= 0;
  var popSi = String(p.popUso || "").toLowerCase().indexOf("sí") >= 0 ||
    String(p.popUso || "").toLowerCase().indexOf("si") >= 0;

  return [
    ts || new Date(),
    show_(p.clave),
    show_(p.nps),
    show_(p.motivo),
    show_(p.ejecutivo),
    show_(p.visitaEjecutivo),
    show_(p.mesaUso),
    mesaSi ? show_(p.mesa_soporte) : NA,
    mesaSi ? show_(p.mesa_espera) : NA,
    mesaSi ? show_(p.mesa_resolucion) : NA,
    mesaSi ? show_(p.mesa_amabilidad) : NA,
    mesaSi ? show_(p.mesa_conocimiento) : NA,
    mesaSi ? show_(p.mesa_trato) : NA,
    mesaSi ? show_(p.mesaMejoras) : NA,
    show_(p.recargaMetodo),
    show_(p.recargaUso),
    show_(p.recargaExp),
    show_(p.recargaMejora),
    show_(p.popUso),
    popSi ? show_(p.popSat) : NA,
    popSi ? show_(p.popMejora) : NA,
    show_(p.productosYaavs),
    show_(p.distribuidores),
    show_(p.competencia),
    show_(p.rentabilidad),
    show_(p.mejoraGeneral),
    raw || NA,
  ];
}

function parsePayload_(raw) {
  var text = String(raw || "").trim();
  if (!text) return {};

  if (text.charAt(0) === "{") {
    try {
      return JSON.parse(text);
    } catch (err) {}
  }

  var jsonIdx = text.lastIndexOf("JSON:");
  if (jsonIdx >= 0) {
    var maybe = text.slice(jsonIdx + 5).trim();
    try {
      return JSON.parse(maybe);
    } catch (err) {}
  }

  var map = {
    Clave: "clave",
    NPS: "nps",
    Motivo: "motivo",
    Ejecutivo: "ejecutivo",
    "Visita ejecutivo": "visitaEjecutivo",
    "Mesa uso": "mesaUso",
    "Mesa soporte": "mesa_soporte",
    "Mesa espera": "mesa_espera",
    "Mesa resolución": "mesa_resolucion",
    "Mesa amabilidad": "mesa_amabilidad",
    "Mesa conocimiento": "mesa_conocimiento",
    "Mesa trato": "mesa_trato",
    "Mesa mejoras": "mesaMejoras",
    "Método recarga": "recargaMetodo",
    "RecargaKlic uso": "recargaUso",
    "RecargaKlic exp": "recargaExp",
    "RecargaKlic mejora": "recargaMejora",
    "POP uso": "popUso",
    "POP sat": "popSat",
    "POP mejora": "popMejora",
    "Productos YAAVS": "productosYaavs",
    Distribuidores: "distribuidores",
    Competencia: "competencia",
    Ganancias: "rentabilidad",
    Rentabilidad: "rentabilidad",
    Antigüedad: "antiguedad",
    "Mejora general": "mejoraGeneral",
  };
  var out = {};
  text.split(/\n/).forEach(function (line) {
    var i = line.indexOf(":");
    if (i < 0) return;
    var key = line.slice(0, i).trim();
    var val = line.slice(i + 1).trim();
    if (map[key]) out[map[key]] = val;
  });
  return out;
}

/**
 * API JSON para el panel de resultados en vivo.
 * Deploy → Nueva implementación → Aplicación web
 * Ejecutar como: Yo | Quién tiene acceso: Cualquiera
 */
function doGet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var source = ss.getSheetByName("Form Responses 1") || ss.getSheets()[0];
  var last = source.getLastRow();
  var responses = [];

  for (var row = 2; row <= last; row++) {
    var ts = source.getRange(row, 1).getValue();
    var raw = String(source.getRange(row, 2).getValue() || "");
    if (!String(raw).trim()) continue;
    var p = parsePayload_(raw);
    // Saltar filas de prueba cortas sin NPS
    if (!p.nps && !p.clave && String(raw).indexOf("Clave:") < 0 && String(raw).charAt(0) !== "{") {
      continue;
    }
    var iso = ts instanceof Date ? ts.toISOString() : String(ts || new Date().toISOString());
    responses.push({
      id: "sheet_" + row + "_" + String(p.clave || row),
      receivedAt: iso,
      timestamp: iso,
      clave: p.clave || "",
      nps: p.nps || "",
      motivo: p.motivo || "",
      productosYaavs: p.productosYaavs || "",
      visitaEjecutivo: p.visitaEjecutivo || "",
      ejecutivo: p.ejecutivo || "",
      mesaUso: p.mesaUso || "",
      mesa_soporte: p.mesa_soporte || "",
      mesa_espera: p.mesa_espera || "",
      mesa_resolucion: p.mesa_resolucion || "",
      mesa_amabilidad: p.mesa_amabilidad || "",
      mesa_conocimiento: p.mesa_conocimiento || "",
      mesa_trato: p.mesa_trato || "",
      mesaMejoras: p.mesaMejoras || "",
      recargaMetodo: p.recargaMetodo || "",
      recargaUso: p.recargaUso || "",
      recargaExp: p.recargaExp || "",
      recargaMejora: p.recargaMejora || "",
      popUso: p.popUso || "",
      popSat: p.popSat || "",
      popMejora: p.popMejora || "",
      distribuidores: p.distribuidores || "",
      competencia: p.competencia || "",
      rentabilidad: p.rentabilidad || "",
      antiguedad: p.antiguedad || "",
      mejoraGeneral: p.mejoraGeneral || "",
    });
  }

  responses.reverse();
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, count: responses.length, responses: responses })
  ).setMimeType(ContentService.MimeType.JSON);
}
