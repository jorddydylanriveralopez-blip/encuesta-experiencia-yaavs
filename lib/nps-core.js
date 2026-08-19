const crypto = require("crypto");

const TEST_RE =
  /PRUEBA-CODEX-20260819|LIVE_TEST|USUARIO_VE_TODO|VISIBLE_|HELLO_SHEETS|TEST_ROW|prueba completa visible|respuesta completa de|^PRUEBA\b|^TEST\b/i;

const NA = "No aplica";
const SIN = "Sin respuesta";

function isBlank(v) {
  if (v === null || v === undefined) return true;
  const s = String(v).trim();
  return !s;
}

function isNaValue(v) {
  const s = String(v || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return s === "no aplica" || s === "n/a" || s === "na";
}

function isMissingValue(v) {
  if (isBlank(v) || isNaValue(v)) return true;
  const s = String(v).trim().toLowerCase();
  return s === "sin respuesta";
}

function numericOrNull(v) {
  if (isMissingValue(v)) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeClave(raw) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase();
}

function isValidClave(raw) {
  const clave = normalizeClave(raw);
  return /^[A-Z0-9][A-Z0-9._-]{3,24}$/.test(clave);
}

function maskClave(raw) {
  const s = normalizeClave(raw);
  if (!s) return "XXXX";
  if (s.length <= 4) return `${s.slice(0, 1)}XXX`;
  if (s.length <= 8) return `${s.slice(0, 2)}-XXXX-${s.slice(-2)}`;
  return `${s.slice(0, 4)}-XXXX-${s.slice(-4)}`;
}

function isTestRecord(r) {
  const blob = [
    r.clave,
    r.motivo,
    r.mejoraGeneral,
    r.competencia,
    r.distribuidores,
    r.id,
    r.submissionId,
  ]
    .map((x) => String(x || ""))
    .join(" ");
  return TEST_RE.test(blob) || TEST_RE.test(normalizeClave(r.clave));
}

function npsTier(nps) {
  const n = numericOrNull(nps);
  if (n == null) return { label: "Sin NPS", key: "none", cls: "passive" };
  if (n >= 9) return { label: "Promotor", key: "promoter", cls: "promoter" };
  if (n >= 7) return { label: "Pasivo", key: "passive", cls: "passive" };
  return { label: "Detractor", key: "detractor", cls: "detractor" };
}

function computeNpsIndex(scores) {
  const valid = scores.filter((n) => Number.isFinite(n));
  if (!valid.length) return { promoters: 0, passives: 0, detractors: 0, avg: null, npsIndex: null, n: 0 };
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  valid.forEach((n) => {
    if (n >= 9) promoters += 1;
    else if (n >= 7) passives += 1;
    else detractors += 1;
  });
  const n = valid.length;
  const avg = valid.reduce((a, b) => a + b, 0) / n;
  const npsIndex = (promoters / n - detractors / n) * 100;
  return { promoters, passives, detractors, avg, npsIndex, n };
}

function fingerprint(r) {
  return [
    normalizeClave(r.clave),
    r.nps,
    r.motivo,
    r.productosYaavs,
    r.mesaUso,
    r.recargaUso,
    r.popUso,
  ]
    .map((x) => String(x ?? "").trim().toLowerCase())
    .join("|");
}

function duplicateKey(r) {
  if (r.submissionId) return `sub:${r.submissionId}`;
  const t = Date.parse(r.receivedAt || r.timestamp || 0);
  const bucket = Number.isFinite(t) ? Math.floor(t / 120000) : 0;
  return `fp:${fingerprint(r)}:${bucket}`;
}

function dedupeResponses(list) {
  const map = new Map();
  list.forEach((item) => {
    const key = duplicateKey(item);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, item);
      return;
    }
    const ta = Date.parse(item.receivedAt || item.timestamp || 0) || 0;
    const tb = Date.parse(prev.receivedAt || prev.timestamp || 0) || 0;
    if (ta >= tb) map.set(key, item);
  });
  return Array.from(map.values());
}

function newId(prefix = "r") {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

module.exports = {
  TEST_RE,
  NA,
  SIN,
  isBlank,
  isNaValue,
  isMissingValue,
  numericOrNull,
  normalizeClave,
  isValidClave,
  maskClave,
  isTestRecord,
  npsTier,
  computeNpsIndex,
  fingerprint,
  duplicateKey,
  dedupeResponses,
  newId,
};
