const fs = require("fs");
const path = require("path");
const { normalizeClave } = require("./nps-core");

const DEFAULT_FILE = path.join(__dirname, "..", "data", "allowed-claves.json");

let cache = {
  loadedAt: 0,
  file: "",
  set: new Set(),
  count: 0,
};

function loadAllowedClaves(file = DEFAULT_FILE) {
  const abs = path.resolve(file);
  let mtime = 0;
  try {
    mtime = fs.statSync(abs).mtimeMs;
  } catch (_) {
    cache = { loadedAt: Date.now(), file: abs, set: new Set(), count: 0 };
    return cache;
  }
  if (cache.file === abs && cache.loadedAt && cache.loadedAt >= mtime) return cache;

  try {
    const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
    const list = Array.isArray(raw) ? raw : Array.isArray(raw.claves) ? raw.claves : [];
    const set = new Set(
      list
        .map((c) => normalizeClave(c))
        .filter(Boolean)
    );
    cache = { loadedAt: mtime || Date.now(), file: abs, set, count: set.size };
  } catch (_) {
    cache = { loadedAt: Date.now(), file: abs, set: new Set(), count: 0 };
  }
  return cache;
}

function isAllowedClave(raw, file = DEFAULT_FILE) {
  const clave = normalizeClave(raw);
  if (!clave) return false;
  const { set } = loadAllowedClaves(file);
  if (!set.size) return false;
  return set.has(clave);
}

function allowedCount(file = DEFAULT_FILE) {
  return loadAllowedClaves(file).count;
}

module.exports = {
  loadAllowedClaves,
  isAllowedClave,
  allowedCount,
  DEFAULT_FILE,
};
