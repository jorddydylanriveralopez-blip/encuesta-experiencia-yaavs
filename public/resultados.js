(() => {
  const POLL_MS = 4000;
  const kpisEl = document.getElementById("kpis");
  const metaStrip = document.getElementById("metaStrip");
  const cardsGrid = document.getElementById("cardsGrid");
  const listCount = document.getElementById("listCount");
  const liveStatus = document.getElementById("liveStatus");
  const analysisGrid = document.getElementById("analysisGrid");
  const casesTable = document.getElementById("casesTable");
  const detailDialog = document.getElementById("detailDialog");
  const dialogKicker = document.getElementById("dialogKicker");
  const dialogTitle = document.getElementById("dialogTitle");
  const dialogWhen = document.getElementById("dialogWhen");
  const dialogFields = document.getElementById("dialogFields");
  const filterSearch = document.getElementById("filterSearch");
  const filterSegment = document.getElementById("filterSegment");
  const filterMesa = document.getElementById("filterMesa");
  const filterRecarga = document.getElementById("filterRecarga");
  const filterMetodo = document.getElementById("filterMetodo");
  const filterProducto = document.getElementById("filterProducto");
  const filterVisita = document.getElementById("filterVisita");
  const filterFrom = document.getElementById("filterFrom");
  const filterTo = document.getElementById("filterTo");
  const btnClearFilters = document.getElementById("btnClearFilters");
  const btnExportCsv = document.getElementById("btnExportCsv");
  const btnLogout = document.getElementById("btnLogout");
  const avgFill = document.getElementById("avgFill");
  const avgValue = document.getElementById("avgValue");
  const avgHint = document.getElementById("avgHint");
  const trendHint = document.getElementById("trendHint");
  const cssAvgPie = document.getElementById("cssAvgPie");
  const cssAvgPieLegend = document.getElementById("cssAvgPieLegend");
  const cssMetodoPie = document.getElementById("cssMetodoPie");
  const cssMetodoPieLegend = document.getElementById("cssMetodoPieLegend");
  const cssDistBars = document.getElementById("cssDistBars");
  const cssSegments = document.getElementById("cssSegments");
  const chartAvgPieEl = document.getElementById("chartAvgPie");
  const chartMetodoPieEl = document.getElementById("chartMetodoPie");
  const chartTrendEl = document.getElementById("chartTrend");

  const LABELS = [
    ["claveMasked", "Clave YAAVSER"],
    ["nps", "Calificación NPS (0–10)"],
    ["productosYaavs", "Productos y servicios YAAVS"],
    ["visitaEjecutivo", "Frecuencia de visita del ejecutivo"],
    ["ejecutivo", "Calificación del ejecutivo"],
    ["mesaUso", "¿Usó Mesa de Control?"],
    ["mesa_soporte", "Mesa · Soporte recibido"],
    ["mesa_espera", "Mesa · Tiempo de espera"],
    ["mesa_resolucion", "Mesa · Resolución de dudas o problemas"],
    ["mesa_amabilidad", "Mesa · Amabilidad y empatía"],
    ["mesa_conocimiento", "Mesa · Conocimiento y claridad"],
    ["mesa_trato", "Mesa · Trato recibido"],
    ["mesaMejoras", "Mejoras Mesa de Control"],
    ["recargaMetodo", "Medio de activación de chips"],
    ["recargaUso", "¿Usó RecargaKlic?"],
    ["recargaExp", "Experiencia RecargaKlic"],
    ["recargaMejora", "Mejora RecargaKlic"],
    ["popUso", "¿Recibió material de publicidad?"],
    ["popSat", "Satisfacción con material de publicidad"],
    ["popMejora", "Mejora material de publicidad"],
    ["rentabilidad", "Ganancias con YAAVS"],
    ["distribuidores", "Otro distribuidor de chips"],
    ["competencia", "Qué ofrece la competencia"],
    ["mejoraGeneral", "Mejora general"],
  ];

  const ATTRS = [
    ["ejecutivo", "Ejecutivo"],
    ["mesa_soporte", "Soporte"],
    ["mesa_espera", "Tiempo de espera"],
    ["mesa_resolucion", "Resolución"],
    ["mesa_amabilidad", "Amabilidad"],
    ["mesa_conocimiento", "Conocimiento"],
    ["mesa_trato", "Trato"],
    ["recargaExp", "RecargaKlic"],
    ["popSat", "Publicidad"],
    ["rentabilidad", "Ganancias"],
  ];

  const RECARGA_METODO_LABELS = [
    "App de RecargaKlic",
    "Bot de WhatsApp (Alphabot)",
    "RecargaKlic Web",
    "Mesa de control",
  ];
  const RECARGA_METODO_SHORT = ["RecargaKlic", "WhatsApp", "Web", "Mesa de control"];
  const RECARGA_METODO_COLORS = ["#2563b5", "#0d8a5a", "#c47a00", "#6b4f9a"];
  const STOP = new Set("el la los las un una de del y o a en que se por para con no es al lo su sus mi me te".split(" "));

  const chartColors = { navy: "#0f2440", cyan: "#2563b5", good: "#0d8a5a", warn: "#c47a00", bad: "#c0392b", muted: "#5a738c" };

  const state = {
    responses: [],
    filtered: [],
    cases: {},
    excluded: 0,
    lastCount: 0,
    charts: { avgPie: null, metodoPie: null, trend: null },
  };

  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function isMissing(v) {
    const s = String(v ?? "").trim().toLowerCase();
    return !s || s === "no aplica" || s === "sin respuesta" || s === "n/a" || s === "na";
  }

  function num(v) {
    if (isMissing(v)) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function avgNums(values) {
    const xs = values.filter((n) => n != null && Number.isFinite(n));
    if (!xs.length) return null;
    return xs.reduce((a, b) => a + b, 0) / xs.length;
  }

  function maskClave(raw) {
    const s = String(raw || "").replace(/\s+/g, "").toUpperCase();
    if (!s) return "XXXX";
    if (s.length <= 4) return `${s.slice(0, 1)}XXX`;
    if (s.length <= 8) return `${s.slice(0, 2)}-XXXX-${s.slice(-2)}`;
    return `${s.slice(0, 4)}-XXXX-${s.slice(-4)}`;
  }

  function val(v) {
    const s = String(v ?? "").trim();
    if (!s || s === "No aplica") return { text: "No aplica", na: true };
    if (s === "Sin respuesta") return { text: "Sin respuesta", na: true };
    return { text: s, na: false };
  }

  function npsTier(nps) {
    const n = num(nps);
    if (n == null) return { label: "Sin NPS", cls: "passive", key: "none" };
    if (n >= 9) return { label: "Promotor", cls: "promoter", key: "promoter" };
    if (n >= 7) return { label: "Pasivo", cls: "passive", key: "passive" };
    return { label: "Detractor", cls: "detractor", key: "detractor" };
  }

  function isYes(v) {
    return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").startsWith("s");
  }

  function when(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "Sin fecha";
      return d.toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });
    } catch (_) {
      return "Sin fecha";
    }
  }

  function shortDate(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "Sin fecha";
      return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
    } catch (_) {
      return "Sin fecha";
    }
  }

  function weekKey(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((tmp - yearStart) / 86400000 + 1) / 7);
    return `${tmp.getUTCFullYear()}-S${String(week).padStart(2, "0")}`;
  }

  function fingerprint(r) {
    return [String(r.clave || "").toUpperCase(), r.nps, r.productosYaavs].join("|").toLowerCase();
  }

  function decorate(list) {
    const seen = new Map();
    return list.map((r) => {
      const fp = fingerprint(r);
      const prev = seen.get(fp) || 0;
      seen.set(fp, prev + 1);
      return {
        ...r,
        claveMasked: maskClave(r.clave),
        possibleDuplicate: prev > 0,
        isTest: Boolean(r.isTest),
      };
    });
  }

  function computeStats(list) {
    const scores = list.map((r) => num(r.nps)).filter((n) => n != null);
    const avg = avgNums(scores);
    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    scores.forEach((n) => {
      if (n >= 9) promoters += 1;
      else if (n >= 7) passives += 1;
      else detractors += 1;
    });
    const n = scores.length;
    const npsIndex = n ? (promoters / n - detractors / n) * 100 : null;
    const dist = Array.from({ length: 11 }, () => 0);
    scores.forEach((score) => {
      dist[Math.max(0, Math.min(10, Math.round(score)))] += 1;
    });
    const metodoCounts = RECARGA_METODO_LABELS.map(() => 0);
    list.forEach((r) => {
      const raw = String(r.recargaMetodo || "").trim().toLowerCase();
      if (!raw || raw === "no aplica" || raw === "sin respuesta") return;
      let idx = -1;
      if (raw.includes("whatsapp") || raw.includes("alphabot")) idx = 1;
      else if (raw.includes("web")) idx = 2;
      else if (raw.includes("mesa")) idx = 3;
      else if (raw.includes("recarga") || raw.includes("klic")) idx = 0;
      if (idx >= 0) metodoCounts[idx] += 1;
    });

    const weeks = new Map();
    list.forEach((r) => {
      const nps = num(r.nps);
      const key = weekKey(r.receivedAt || r.timestamp);
      if (nps == null || !key) return;
      if (!weeks.has(key)) weeks.set(key, []);
      weeks.get(key).push(nps);
    });
    const trendLabels = [...weeks.keys()].sort();
    const trendValues = trendLabels.map((k) => {
      const xs = weeks.get(k);
      const p = xs.filter((x) => x >= 9).length;
      const d = xs.filter((x) => x <= 6).length;
      return { nps: ((p - d) / xs.length) * 100, n: xs.length };
    });

    const now = Date.now();
    const weekMs = 7 * 24 * 3600 * 1000;
    const cur = list.filter((r) => now - Date.parse(r.receivedAt || r.timestamp || 0) <= weekMs);
    const prev = list.filter((r) => {
      const t = Date.parse(r.receivedAt || r.timestamp || 0);
      return now - t > weekMs && now - t <= weekMs * 2;
    });
    const curNps = computeStats.npsOnly(cur);
    const prevNps = computeStats.npsOnly(prev);

    const times = list.map((r) => Date.parse(r.receivedAt || r.timestamp || 0)).filter(Number.isFinite);
    const periodFrom = times.length ? new Date(Math.min(...times)) : null;
    const periodTo = times.length ? new Date(Math.max(...times)) : null;

    return {
      total: list.length,
      avg,
      promoters,
      passives,
      detractors,
      npsIndex,
      scoresCount: n,
      dist,
      metodoCounts,
      trendLabels,
      trendValues,
      curNps,
      prevNps,
      periodFrom,
      periodTo,
    };
  }
  computeStats.npsOnly = (list) => {
    const scores = list.map((r) => num(r.nps)).filter((n) => n != null);
    const n = scores.length;
    if (!n) return { nps: null, n: 0 };
    const p = scores.filter((x) => x >= 9).length;
    const d = scores.filter((x) => x <= 6).length;
    return { nps: (p / n - d / n) * 100, n };
  };

  function ensureCharts() {
    if (typeof Chart === "undefined") return false;
    if (!state.charts.avgPie && chartAvgPieEl) {
      state.charts.avgPie = new Chart(chartAvgPieEl, {
        type: "pie",
        data: {
          labels: ["Promotores", "Pasivos", "Detractores"],
          datasets: [{ data: [0, 0, 0], backgroundColor: [chartColors.good, chartColors.warn, chartColors.bad], borderWidth: 2, borderColor: "#fff" }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      });
      if (cssAvgPie) cssAvgPie.hidden = true;
    }
    if (!state.charts.metodoPie && chartMetodoPieEl) {
      state.charts.metodoPie = new Chart(chartMetodoPieEl, {
        type: "pie",
        data: {
          labels: RECARGA_METODO_LABELS,
          datasets: [{ data: [0, 0, 0, 0], backgroundColor: RECARGA_METODO_COLORS, borderWidth: 2, borderColor: "#fff" }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
      });
      if (cssMetodoPie) cssMetodoPie.hidden = true;
    }
    if (!state.charts.trend && chartTrendEl) {
      state.charts.trend = new Chart(chartTrendEl, {
        type: "line",
        data: {
          labels: [],
          datasets: [{
            label: "Índice NPS",
            data: [],
            borderColor: chartColors.cyan,
            backgroundColor: "rgba(37,99,181,0.12)",
            fill: true,
            tension: 0.3,
            pointRadius: 4,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: (ctx) => {
                  const n = (state.charts.trend._ns || [])[ctx.dataIndex];
                  return `n = ${n || 0}`;
                },
              },
            },
          },
          scales: {
            y: { suggestedMin: -100, suggestedMax: 100, ticks: { color: chartColors.muted } },
            x: { ticks: { color: chartColors.muted } },
          },
        },
      });
    }
    return true;
  }

  function paintCssPie(el, legendEl, parts, short) {
    const total = parts.reduce((s, p) => s + p.value, 0);
    if (el && !el.hidden) {
      if (!total) el.style.background = "rgba(15,36,64,0.08)";
      else {
        let start = 0;
        const stops = parts.filter((p) => p.value > 0).map((p) => {
          const deg = (p.value / total) * 360;
          const from = start;
          start += deg;
          return `${p.color} ${from}deg ${start}deg`;
        });
        el.style.background = `conic-gradient(${stops.join(", ")})`;
      }
    }
    if (legendEl) {
      legendEl.hidden = false;
      legendEl.innerHTML = parts
        .map((p, i) => {
          const pct = total ? Math.round((p.value / total) * 100) : 0;
          const label = short && RECARGA_METODO_SHORT[i] ? RECARGA_METODO_SHORT[i] : p.label;
          return `<li><span class="css-pie-swatch" style="background:${p.color}"></span><span>${label}</span><span class="css-pie-count">${p.value} · ${pct}%</span></li>`;
        })
        .join("");
    }
  }

  function renderCssCharts(stats) {
    paintCssPie(cssAvgPie, cssAvgPieLegend, [
      { label: "Promotores", value: stats.promoters, color: chartColors.good },
      { label: "Pasivos", value: stats.passives, color: chartColors.warn },
      { label: "Detractores", value: stats.detractors, color: chartColors.bad },
    ]);
    paintCssPie(
      cssMetodoPie,
      cssMetodoPieLegend,
      RECARGA_METODO_LABELS.map((label, i) => ({ label, value: stats.metodoCounts[i] || 0, color: RECARGA_METODO_COLORS[i] })),
      true
    );
    if (cssDistBars) {
      const max = Math.max(1, ...stats.dist);
      cssDistBars.innerHTML = stats.dist
        .map((count, i) => {
          const pct = Math.max(4, Math.round((count / max) * 100));
          const color = i >= 9 ? chartColors.good : i >= 7 ? chartColors.warn : chartColors.bad;
          return `<div class="css-bar"><span class="css-bar-count">${count}</span><div class="css-bar-track" style="height:${pct}%;background:${color}"></div><span class="css-bar-label">${i}</span></div>`;
        })
        .join("");
    }
    if (cssSegments) {
      const total = Math.max(1, stats.promoters + stats.passives + stats.detractors);
      cssSegments.innerHTML = [
        ["Promotores", stats.promoters, "is-promoter"],
        ["Pasivos", stats.passives, "is-passive"],
        ["Detractores", stats.detractors, "is-detractor"],
      ]
        .map(([label, value, cls]) => {
          const pct = Math.round((value / total) * 100);
          return `<div class="css-seg"><div class="css-seg-top"><span>${label}</span><span>${value} · ${pct}%</span></div><div class="css-seg-track"><div class="css-seg-fill ${cls}" style="width:${pct}%"></div></div></div>`;
        })
        .join("");
    }
  }

  function applyFilters() {
    const q = String(filterSearch.value || "").trim().toLowerCase();
    const from = filterFrom.value ? new Date(`${filterFrom.value}T00:00:00`) : null;
    const to = filterTo.value ? new Date(`${filterTo.value}T23:59:59`) : null;
    state.filtered = state.responses.filter((r) => {
      const tier = npsTier(r.nps);
      if (filterSegment.value !== "all" && tier.key !== filterSegment.value) return false;
      if (filterMesa.value === "si" && !isYes(r.mesaUso)) return false;
      if (filterMesa.value === "no" && isYes(r.mesaUso)) return false;
      if (filterRecarga.value === "si" && !isYes(r.recargaUso)) return false;
      if (filterRecarga.value === "no" && isYes(r.recargaUso)) return false;
      if (filterMetodo.value !== "all" && String(r.recargaMetodo || "") !== filterMetodo.value) return false;
      if (filterProducto.value !== "all" && !String(r.productosYaavs || "").includes(filterProducto.value)) return false;
      if (filterVisita.value !== "all" && String(r.visitaEjecutivo || "") !== filterVisita.value) return false;
      const ts = new Date(r.receivedAt || r.timestamp || 0);
      if (from && (Number.isNaN(ts.getTime()) || ts < from)) return false;
      if (to && (Number.isNaN(ts.getTime()) || ts > to)) return false;
      if (!q) return true;
      return [r.productosYaavs, r.recargaMetodo, r.nps, r.mejoraGeneral].join(" ").toLowerCase().includes(q);
    });
  }

  function renderMeta(stats) {
    const from = stats.periodFrom ? shortDate(stats.periodFrom.toISOString()) : "—";
    const to = stats.periodTo ? shortDate(stats.periodTo.toISOString()) : "—";
    const delta = stats.prevNps.nps == null || stats.curNps.nps == null ? "—" : `${(stats.curNps.nps - stats.prevNps.nps).toFixed(0)} pts vs semana previa`;
    metaStrip.innerHTML = `
      <div><strong>Periodo analizado</strong><span>${from} → ${to}</span></div>
      <div><strong>Última actualización</strong><span>${new Date().toLocaleString("es-MX", { dateStyle: "short", timeStyle: "medium" })}</span></div>
      <div><strong>Excluidos</strong><span>${state.excluded} por duplicado o prueba</span></div>
      <div><strong>Tendencia 7 días</strong><span>${delta} · n=${stats.curNps.n}</span></div>
    `;
  }

  function renderKpis(stats) {
    const nps = stats.npsIndex == null ? "—" : Math.round(stats.npsIndex);
    kpisEl.innerHTML = `
      <div class="kpi"><div class="kpi-label">Índice NPS</div><div class="kpi-value">${nps}</div><div class="kpi-sub">% promotores − % detractores</div></div>
      <div class="kpi"><div class="kpi-label">Calificación promedio</div><div class="kpi-value">${stats.avg == null ? "—" : stats.avg.toFixed(1)}</div><div class="kpi-sub">Escala 0–10</div></div>
      <div class="kpi"><div class="kpi-label">Respuestas válidas</div><div class="kpi-value">${stats.scoresCount}</div><div class="kpi-sub">De ${stats.total} filtradas</div></div>
      <div class="kpi"><div class="kpi-label">Promotores / pasivos / detractores</div><div class="kpi-value">${stats.promoters} / ${stats.passives} / ${stats.detractors}</div><div class="kpi-sub">9–10 · 7–8 · 0–6</div></div>
    `;
  }

  function renderCharts(stats) {
    const pct = stats.avg == null ? 0 : Math.max(0, Math.min(100, (stats.avg / 10) * 100));
    if (avgFill) avgFill.style.width = `${pct}%`;
    if (avgValue) avgValue.textContent = stats.avg == null ? "—" : stats.avg.toFixed(1);
    if (avgHint) avgHint.textContent = stats.scoresCount ? `n = ${stats.scoresCount}` : "Sin datos aún";
    if (trendHint) {
      const cur = stats.curNps.nps == null ? "—" : Math.round(stats.curNps.nps);
      const prev = stats.prevNps.nps == null ? "—" : Math.round(stats.prevNps.nps);
      trendHint.textContent = `Últimos 7 días: ${cur} (n=${stats.curNps.n}) · Semana previa: ${prev} (n=${stats.prevNps.n})`;
    }
    renderCssCharts(stats);
    if (!ensureCharts()) return;
    if (state.charts.avgPie) {
      state.charts.avgPie.data.datasets[0].data = [stats.promoters, stats.passives, stats.detractors];
      state.charts.avgPie.update();
    }
    if (state.charts.metodoPie) {
      state.charts.metodoPie.data.datasets[0].data = stats.metodoCounts;
      state.charts.metodoPie.update();
    }
    if (state.charts.trend) {
      state.charts.trend.data.labels = stats.trendLabels;
      state.charts.trend.data.datasets[0].data = stats.trendValues.map((x) => Number(x.nps.toFixed(1)));
      state.charts.trend._ns = stats.trendValues.map((x) => x.n);
      state.charts.trend.update();
    }
  }

  function topCounts(items, limit = 4) {
    const map = new Map();
    items.forEach((x) => {
      const s = String(x || "").trim();
      if (isMissing(s)) return;
      map.set(s, (map.get(s) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  }

  function topics(list) {
    const map = new Map();
    list.forEach((r) => {
      `${r.mejoraGeneral || ""} ${r.competencia || ""}`.toLowerCase().replace(/[^a-záéíóúñü0-9\s]/g, " ").split(/\s+/).forEach((w) => {
        if (w.length < 4 || STOP.has(w)) return;
        map.set(w, (map.get(w) || 0) + 1);
      });
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }

  function renderAnalysis(list) {
    const bySeg = { promoter: [], passive: [], detractor: [] };
    list.forEach((r) => {
      const k = npsTier(r.nps).key;
      if (bySeg[k]) bySeg[k].push(r);
    });
    const attrRows = ATTRS.map(([key, label]) => {
      const all = avgNums(list.map((r) => num(r[key])));
      const p = avgNums(bySeg.promoter.map((r) => num(r[key])));
      const a = avgNums(bySeg.passive.map((r) => num(r[key])));
      const d = avgNums(bySeg.detractor.map((r) => num(r[key])));
      const fmt = (v) => (v == null ? "—" : v.toFixed(1));
      return `<tr><th>${esc(label)}</th><td>${fmt(all)}</td><td>${fmt(p)}</td><td>${fmt(a)}</td><td>${fmt(d)}</td></tr>`;
    }).join("");
    const topProd = (arr) =>
      topCounts(arr.flatMap((r) => String(r.productosYaavs || "").split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean)))
        .map(([k, n]) => `${k} (${n})`)
        .join(" · ") || "Sin datos";
    const tops = topics(list).map(([k, n]) => `${k} (${n})`).join(" · ") || "Sin comentarios suficientes";
    analysisGrid.innerHTML = `
      <article class="chart-card"><h3>Promedio por atributo</h3>
        <div class="table-wrap"><table class="mini-table"><thead><tr><th>Atributo</th><th>Todos</th><th>Prom.</th><th>Pasivos</th><th>Detr.</th></tr></thead><tbody>${attrRows}</tbody></table></div>
      </article>
      <article class="chart-card"><h3>Productos más mencionados</h3>
        <p><strong>Promotores:</strong> ${esc(topProd(bySeg.promoter))}</p>
        <p><strong>Pasivos:</strong> ${esc(topProd(bySeg.passive))}</p>
        <p><strong>Detractores:</strong> ${esc(topProd(bySeg.detractor))}</p>
        <p class="chart-sub">Temas en comentarios: ${esc(tops)}</p>
      </article>
    `;
  }

  function renderCases(list) {
    const rows = list.filter((r) => ["detractor", "passive"].includes(npsTier(r.nps).key));
    if (!rows.length) {
      casesTable.innerHTML = `<p class="chart-sub">No hay pasivos ni detractores en el filtro actual.</p>`;
      return;
    }
    casesTable.innerHTML = `
      <div class="table-wrap"><table class="mini-table cases-table">
        <thead><tr><th>Clave</th><th>NPS</th><th>Responsable</th><th>Estatus</th><th>Seguimiento</th><th>Acción</th><th>Compromiso</th></tr></thead>
        <tbody>
          ${rows
            .map((r) => {
              const c = state.cases[r.id] || {};
              return `<tr data-id="${esc(r.id)}">
                <td>${esc(r.claveMasked)}</td>
                <td>${esc(r.nps)}</td>
                <td><input data-field="responsable" value="${esc(c.responsable || "")}" /></td>
                <td>
                  <select data-field="status">
                    <option value="pendiente"${c.status === "pendiente" || !c.status ? " selected" : ""}>Pendiente</option>
                    <option value="en_seguimiento"${c.status === "en_seguimiento" ? " selected" : ""}>En seguimiento</option>
                    <option value="cerrado"${c.status === "cerrado" ? " selected" : ""}>Cerrado</option>
                  </select>
                </td>
                <td><input type="date" data-field="followUpDate" value="${esc(c.followUpDate || "")}" /></td>
                <td><input data-field="action" value="${esc(c.action || "")}" /></td>
                <td><input type="date" data-field="commitmentDate" value="${esc(c.commitmentDate || "")}" /></td>
              </tr>`;
            })
            .join("")}
        </tbody>
      </table></div>
    `;
  }

  function openDetail(r) {
    const tier = npsTier(r.nps);
    dialogKicker.textContent = `NPS ${r.nps ?? "—"} · ${tier.label}`;
    dialogTitle.textContent = r.claveMasked;
    dialogWhen.textContent = when(r.receivedAt || r.timestamp);
    dialogFields.innerHTML = LABELS.map(([key, label]) => {
      const v = val(key === "claveMasked" ? r.claveMasked : r[key]);
      if (v.na && (v.text === "No aplica" || v.text === "Sin respuesta")) {
        if (["mesaMejoras", "recargaMejora", "popMejora", "competencia", "mejoraGeneral"].includes(key) && v.text === "No aplica") {
          return "";
        }
      }
      return `<div class="field"><div class="field-label">${esc(label)}</div><div class="field-value${v.na ? " na" : ""}">${esc(v.text)}</div></div>`;
    }).join("");
    if (typeof detailDialog.showModal === "function") detailDialog.showModal();
  }

  function csvEscape(v) {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  function downloadAllCsv() {
    const list = state.filtered;
    if (!list.length) return;
    const headers = ["Fecha", ...LABELS.map(([, label]) => label), "Posible duplicado"];
    const lines = [headers.join(",")];
    list.forEach((r) => {
      const cells = [
        csvEscape(when(r.receivedAt || r.timestamp)),
        ...LABELS.map(([key]) => csvEscape(key === "claveMasked" ? r.claveMasked : r[key])),
        r.possibleDuplicate ? "sí" : "no",
      ];
      lines.push(cells.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nps-yaavs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderCards() {
    const list = state.filtered;
    listCount.textContent = String(list.length);
    if (!list.length) {
      cardsGrid.innerHTML = `<div class="empty-state"><strong>No hay respuestas con estos filtros.</strong></div>`;
      return;
    }
    cardsGrid.innerHTML = list
      .map((r, idx) => {
        const tier = npsTier(r.nps);
        const badges = [
          r.possibleDuplicate ? `<span class="tag-warn">Posible duplicado</span>` : "",
          r.isTest ? `<span class="tag-warn">Prueba</span>` : "",
        ].join("");
        return `
          <article class="response-card" data-idx="${idx}">
            <div class="card-media" data-tier="${tier.cls}">
              <span class="card-badge ${tier.cls}">${esc(tier.label)}</span>
              <div class="card-nps">${esc(String(r.nps ?? "—"))}</div>
            </div>
            <div class="card-body">
              <h3 class="card-title">${esc(r.claveMasked)}</h3>
              <p class="card-meta">${esc(String(r.productosYaavs || "Sin productos").slice(0, 70))}</p>
              <p class="card-meta">${badges}</p>
              <p class="card-date">${esc(shortDate(r.receivedAt || r.timestamp))}</p>
              <div class="card-actions">
                <button type="button" data-action="detail" data-idx="${idx}">Ver detalle</button>
              </div>
            </div>
          </article>`;
      })
      .join("");
  }

  function renderAll() {
    applyFilters();
    const stats = computeStats(state.filtered);
    renderMeta(stats);
    renderKpis(stats);
    renderCharts(stats);
    renderAnalysis(state.filtered);
    renderCases(state.filtered);
    renderCards();
  }

  async function refresh() {
    try {
      const res = await fetch("/api/responses?ts=" + Date.now(), { cache: "no-store" });
      if (res.status === 401) {
        location.href = "/resultados/login";
        return;
      }
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const list = decorate(Array.isArray(data.responses) ? data.responses : []);
      state.responses = list;
      state.cases = data.cases || {};
      state.excluded = Number(data.excluded || 0);
      state.lastCount = list.length;
      liveStatus.textContent = `En vivo · ${list.length} válida${list.length === 1 ? "" : "s"} · ${new Date().toLocaleTimeString("es-MX")}`;
      renderAll();
    } catch (_) {
      liveStatus.textContent = "Sin conexión · reintentando…";
    }
  }

  async function saveCase(id, row) {
    const body = {};
    row.querySelectorAll("[data-field]").forEach((el) => {
      body[el.dataset.field] = el.value;
    });
    await fetch(`/api/cases/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    state.cases[id] = { ...(state.cases[id] || {}), ...body };
  }

  cardsGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='detail']");
    if (!btn) return;
    openDetail(state.filtered[Number(btn.dataset.idx)]);
  });

  casesTable.addEventListener("change", (e) => {
    const row = e.target.closest("tr[data-id]");
    if (!row) return;
    saveCase(row.dataset.id, row);
  });

  [filterSearch, filterSegment, filterMesa, filterRecarga, filterMetodo, filterProducto, filterVisita, filterFrom, filterTo].forEach((el) => {
    el.addEventListener("input", renderAll);
    el.addEventListener("change", renderAll);
  });

  btnClearFilters.addEventListener("click", () => {
    filterSearch.value = "";
    [filterSegment, filterMesa, filterRecarga, filterMetodo, filterProducto, filterVisita].forEach((el) => {
      el.value = "all";
    });
    filterFrom.value = "";
    filterTo.value = "";
    renderAll();
  });

  btnExportCsv.addEventListener("click", downloadAllCsv);
  btnLogout.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/resultados/login";
  });

  refresh();
  setInterval(refresh, POLL_MS);
})();
