(() => {
  const POLL_MS = 3000;
  const kpisEl = document.getElementById("kpis");
  const cardsGrid = document.getElementById("cardsGrid");
  const listCount = document.getElementById("listCount");
  const liveStatus = document.getElementById("liveStatus");
  const detailDialog = document.getElementById("detailDialog");
  const dialogKicker = document.getElementById("dialogKicker");
  const dialogTitle = document.getElementById("dialogTitle");
  const dialogWhen = document.getElementById("dialogWhen");
  const dialogFields = document.getElementById("dialogFields");

  const filterSearch = document.getElementById("filterSearch");
  const filterSegment = document.getElementById("filterSegment");
  const filterMesa = document.getElementById("filterMesa");
  const filterFrom = document.getElementById("filterFrom");
  const filterTo = document.getElementById("filterTo");
  const btnClearFilters = document.getElementById("btnClearFilters");
  const btnExportCsv = document.getElementById("btnExportCsv");

  const LABELS = [
    ["clave", "Clave YAAVSER"],
    ["nps", "NPS (0–10)"],
    ["motivo", "Motivo"],
    ["ejecutivo", "Calificación del ejecutivo"],
    ["mesaUso", "¿Usó Mesa de Control?"],
    ["mesa_soporte", "Soporte recibido"],
    ["mesa_espera", "Tiempo de espera"],
    ["mesa_resolucion", "Resolución de dudas"],
    ["mesa_amabilidad", "Amabilidad y empatía"],
    ["mesa_conocimiento", "Conocimiento del agente"],
    ["mesa_trato", "Trato recibido"],
    ["mesaMejoras", "Mejoras Mesa de Control"],
    ["recargaUso", "¿Usó RecargaKlic?"],
    ["recargaExp", "Experiencia RecargaKlic"],
    ["recargaMejora", "Mejora RecargaKlic"],
    ["popUso", "¿Usó material POP?"],
    ["popSat", "Satisfacción POP"],
    ["popMejora", "Mejora POP"],
    ["rentabilidad", "Rentabilidad"],
    ["antiguedad", "Antigüedad"],
    ["mejoraGeneral", "Mejora general"],
  ];

  const state = {
    responses: [],
    filtered: [],
    lastCount: 0,
    charts: {
      dist: null,
      segments: null,
      avgPie: null,
    },
  };

  const avgFill = document.getElementById("avgFill");
  const avgValue = document.getElementById("avgValue");
  const avgHint = document.getElementById("avgHint");
  const cssAvgPie = document.getElementById("cssAvgPie");
  const cssAvgPieLegend = document.getElementById("cssAvgPieLegend");
  const cssDistBars = document.getElementById("cssDistBars");
  const cssSegments = document.getElementById("cssSegments");
  const chartNpsDistEl = document.getElementById("chartNpsDist");
  const chartSegmentsEl = document.getElementById("chartSegments");
  const chartAvgPieEl = document.getElementById("chartAvgPie");

  const chartColors = {
    navy: "#0f2440",
    cyan: "#2563b5",
    good: "#0d8a5a",
    warn: "#c47a00",
    bad: "#c0392b",
    muted: "#5a738c",
  };

  function npsBarColor(score) {
    if (score >= 9) return chartColors.good;
    if (score >= 7) return chartColors.warn;
    return chartColors.bad;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function val(v) {
    const s = String(v ?? "").trim();
    if (!s || s === "No aplica") return { text: "No aplica", na: true };
    return { text: s, na: false };
  }

  function npsTier(nps) {
    const n = Number(nps);
    if (!Number.isFinite(n)) return { label: "Sin NPS", cls: "passive", key: "passive" };
    if (n >= 9) return { label: "Promotor", cls: "promoter", key: "promoter" };
    if (n >= 7) return { label: "Pasivo", cls: "passive", key: "passive" };
    return { label: "Detractor", cls: "detractor", key: "detractor" };
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

  function isYes(v) {
    return String(v || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .startsWith("s");
  }

  function computeStats(list) {
    const scores = list.map((r) => Number(r.nps)).filter((n) => Number.isFinite(n));
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    let promoters = 0;
    let passives = 0;
    let detractors = 0;
    scores.forEach((n) => {
      if (n >= 9) promoters += 1;
      else if (n >= 7) passives += 1;
      else detractors += 1;
    });
    const totalScored = scores.length || 1;
    const npsScore = ((promoters - detractors) / totalScored) * 100;
    const mesa = list.filter((r) => isYes(r.mesaUso)).length;

    const dist = Array.from({ length: 11 }, () => 0);
    scores.forEach((n) => {
      const i = Math.max(0, Math.min(10, Math.round(n)));
      dist[i] += 1;
    });

    // Promedio acumulado en orden cronológico (cómo se va “llenando”).
    const chronological = [...list]
      .map((r) => ({
        nps: Number(r.nps),
        t: new Date(r.receivedAt || r.timestamp || 0).getTime(),
      }))
      .filter((x) => Number.isFinite(x.nps))
      .sort((a, b) => a.t - b.t);
    const trendLabels = [];
    const trendValues = [];
    let running = 0;
    chronological.forEach((item, idx) => {
      running += item.nps;
      trendLabels.push(String(idx + 1));
      trendValues.push(Number((running / (idx + 1)).toFixed(2)));
    });

    return {
      total: list.length,
      avg,
      promoters,
      passives,
      detractors,
      npsScore,
      mesa,
      dist,
      scoresCount: scores.length,
      trendLabels,
      trendValues,
    };
  }

  function ensureCharts() {
    if (typeof Chart === "undefined") return false;
    if (!state.charts.dist && chartNpsDistEl) {
      state.charts.dist = new Chart(chartNpsDistEl, {
        type: "bar",
        data: {
          labels: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
          datasets: [
            {
              label: "Respuestas",
              data: Array(11).fill(0),
              backgroundColor: Array.from({ length: 11 }, (_, i) => npsBarColor(i)),
              borderRadius: 8,
              borderSkipped: false,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 450 },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.parsed.y} respuesta${ctx.parsed.y === 1 ? "" : "s"}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: chartColors.muted, font: { weight: "600" } },
            },
            y: {
              beginAtZero: true,
              ticks: { stepSize: 1, color: chartColors.muted, precision: 0 },
              grid: { color: "rgba(15,36,64,0.08)" },
            },
          },
        },
      });
    }

    if (!state.charts.segments && chartSegmentsEl) {
      state.charts.segments = new Chart(chartSegmentsEl, {
        type: "doughnut",
        data: {
          labels: ["Promotores", "Pasivos", "Detractores"],
          datasets: [
            {
              data: [0, 0, 0],
              backgroundColor: [chartColors.good, chartColors.warn, chartColors.bad],
              borderWidth: 0,
              hoverOffset: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "62%",
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 12, font: { weight: "600" }, color: chartColors.navy },
            },
          },
        },
      });
    }

    if (!state.charts.avgPie && chartAvgPieEl) {
      state.charts.avgPie = new Chart(chartAvgPieEl, {
        type: "pie",
        data: {
          labels: ["Promotores", "Pasivos", "Detractores"],
          datasets: [
            {
              data: [0, 0, 0],
              backgroundColor: [chartColors.good, chartColors.warn, chartColors.bad],
              borderWidth: 2,
              borderColor: "#ffffff",
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: { boxWidth: 12, font: { weight: "600" }, color: chartColors.navy },
            },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0) || 1;
                  const value = ctx.parsed || 0;
                  const pct = Math.round((value / total) * 100);
                  return ` ${value} · ${pct}%`;
                },
              },
            },
          },
        },
      });
      if (cssAvgPie) cssAvgPie.hidden = true;
      if (cssAvgPieLegend) cssAvgPieLegend.hidden = true;
    }
    return true;
  }

  function renderAvgPieCss(stats) {
    const parts = [
      { label: "Promotores", value: stats.promoters, color: chartColors.good },
      { label: "Pasivos", value: stats.passives, color: chartColors.warn },
      { label: "Detractores", value: stats.detractors, color: chartColors.bad },
    ];
    const total = parts.reduce((sum, p) => sum + p.value, 0);

    if (cssAvgPie) {
      if (!total) {
        cssAvgPie.style.background = "rgba(15, 36, 64, 0.08)";
      } else {
        let start = 0;
        const stops = parts
          .filter((p) => p.value > 0)
          .map((p) => {
            const deg = (p.value / total) * 360;
            const from = start;
            const to = start + deg;
            start = to;
            return `${p.color} ${from}deg ${to}deg`;
          });
        cssAvgPie.style.background = `conic-gradient(${stops.join(", ")})`;
      }
    }

    if (cssAvgPieLegend) {
      const denom = Math.max(1, total);
      cssAvgPieLegend.innerHTML = parts
        .map((p) => {
          const pct = total ? Math.round((p.value / denom) * 100) : 0;
          return `<li><span class="css-pie-swatch" style="background:${p.color}"></span>${p.label} · ${p.value} (${pct}%)</li>`;
        })
        .join("");
    }
  }

  function renderCssCharts(stats) {
    renderAvgPieCss(stats);

    if (cssDistBars) {
      const max = Math.max(1, ...stats.dist);
      cssDistBars.innerHTML = stats.dist
        .map((count, i) => {
          const pct = Math.max(4, Math.round((count / max) * 100));
          return `<div class="css-bar">
            <span class="css-bar-count">${count}</span>
            <div class="css-bar-track" style="height:${pct}%;background:${npsBarColor(i)}"></div>
            <span class="css-bar-label">${i}</span>
          </div>`;
        })
        .join("");
    }

    if (cssSegments) {
      const total = Math.max(1, stats.promoters + stats.passives + stats.detractors);
      const rows = [
        ["Promotores", stats.promoters, "is-promoter"],
        ["Pasivos", stats.passives, "is-passive"],
        ["Detractores", stats.detractors, "is-detractor"],
      ];
      cssSegments.innerHTML = rows
        .map(([label, value, cls]) => {
          const pct = Math.round((value / total) * 100);
          return `<div class="css-seg">
            <div class="css-seg-top"><span>${label}</span><span>${value} · ${pct}%</span></div>
            <div class="css-seg-track"><div class="css-seg-fill ${cls}" style="width:${pct}%"></div></div>
          </div>`;
        })
        .join("");
    }
  }

  function renderCharts(stats) {
    const pct = stats.avg == null ? 0 : Math.max(0, Math.min(100, (stats.avg / 10) * 100));
    if (avgFill) avgFill.style.width = `${pct}%`;
    if (avgValue) avgValue.textContent = stats.avg == null ? "—" : stats.avg.toFixed(1);
    if (avgHint) {
      avgHint.textContent = stats.scoresCount
        ? `Con ${stats.scoresCount} calificación${stats.scoresCount === 1 ? "" : "es"}`
        : "Sin datos aún";
    }

    renderCssCharts(stats);

    if (!ensureCharts()) return;

    if (state.charts.dist) {
      state.charts.dist.data.datasets[0].data = stats.dist;
      state.charts.dist.update();
    }
    if (state.charts.segments) {
      state.charts.segments.data.datasets[0].data = [stats.promoters, stats.passives, stats.detractors];
      state.charts.segments.update();
    }
    if (state.charts.avgPie) {
      state.charts.avgPie.data.datasets[0].data = [stats.promoters, stats.passives, stats.detractors];
      state.charts.avgPie.update();
    }
  }

  function applyFilters() {
    const q = String(filterSearch.value || "")
      .trim()
      .toLowerCase();
    const segment = filterSegment.value;
    const mesa = filterMesa.value;
    const from = filterFrom.value ? new Date(`${filterFrom.value}T00:00:00`) : null;
    const to = filterTo.value ? new Date(`${filterTo.value}T23:59:59`) : null;

    state.filtered = state.responses.filter((r) => {
      const tier = npsTier(r.nps);
      if (segment !== "all" && tier.key !== segment) return false;

      if (mesa === "si" && !isYes(r.mesaUso)) return false;
      if (mesa === "no" && isYes(r.mesaUso)) return false;

      const ts = new Date(r.receivedAt || r.timestamp || 0);
      if (from && (!Number.isNaN(from.getTime()) && (Number.isNaN(ts.getTime()) || ts < from))) return false;
      if (to && (!Number.isNaN(to.getTime()) && (Number.isNaN(ts.getTime()) || ts > to))) return false;

      if (!q) return true;
      const hay = [r.clave, r.motivo, r.antiguedad, r.mejoraGeneral, r.nps]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ");
      return hay.includes(q);
    });
  }

  function renderKpis(stats) {
    kpisEl.innerHTML = `
      <div class="kpi">
        <div class="kpi-label">Respuestas</div>
        <div class="kpi-value">${stats.total}</div>
        <div class="kpi-sub">Filtradas</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">NPS promedio</div>
        <div class="kpi-value">${stats.avg == null ? "—" : stats.avg.toFixed(1)}</div>
        <div class="kpi-sub">Escala 0–10</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Índice NPS</div>
        <div class="kpi-value">${stats.total ? Math.round(stats.npsScore) : "—"}</div>
        <div class="kpi-sub">Promotores − detractores</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Usaron Mesa</div>
        <div class="kpi-value">${stats.mesa}</div>
        <div class="kpi-sub">De ${stats.total} respuestas</div>
      </div>
    `;
  }

  function openDetail(r) {
    const tier = npsTier(r.nps);
    const clave = val(r.clave);
    dialogKicker.textContent = `NPS ${r.nps ?? "—"} · ${tier.label}`;
    dialogTitle.textContent = clave.na ? "Sin clave" : clave.text;
    dialogWhen.textContent = when(r.receivedAt || r.timestamp);
    dialogFields.innerHTML = LABELS.map(([key, label]) => {
      const v = val(r[key]);
      return `
        <div class="field">
          <div class="field-label">${esc(label)}</div>
          <div class="field-value${v.na ? " na" : ""}">${esc(v.text)}</div>
        </div>
      `;
    }).join("");
    if (typeof detailDialog.showModal === "function") detailDialog.showModal();
  }

  function downloadOneCsv(r) {
    const headers = LABELS.map(([, label]) => label);
    const row = LABELS.map(([key]) => csvEscape(String(r[key] ?? "")));
    const csv = `${headers.join(",")}\n${row.join(",")}\n`;
    triggerDownload(csv, `respuesta-${String(r.clave || r.id || "nps").replace(/\s+/g, "_")}.csv`);
  }

  function downloadAllCsv() {
    const list = state.filtered;
    if (!list.length) return;
    const headers = ["Fecha", ...LABELS.map(([, label]) => label)];
    const lines = list.map((r) => {
      const cells = [csvEscape(when(r.receivedAt || r.timestamp)), ...LABELS.map(([key]) => csvEscape(String(r[key] ?? "")))];
      return cells.join(",");
    });
    const csv = `${headers.join(",")}\n${lines.join("\n")}\n`;
    triggerDownload(csv, `resultados-nps-yaavs.csv`);
  }

  function csvEscape(s) {
    const t = String(s ?? "").replace(/"/g, '""');
    return /[",\n]/.test(t) ? `"${t}"` : t;
  }

  function triggerDownload(text, filename) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderCards() {
    const list = state.filtered;
    listCount.textContent = String(list.length);

    if (!list.length) {
      cardsGrid.innerHTML = `
        <div class="empty-state">
          <strong>No hay respuestas con estos filtros.</strong><br />
          Ajusta la búsqueda o espera a que lleguen nuevas respuestas.
        </div>
      `;
      return;
    }

    cardsGrid.innerHTML = list
      .map((r, idx) => {
        const tier = npsTier(r.nps);
        const clave = val(r.clave);
        const motivo = val(r.motivo);
        const title = clave.na ? "Sin clave" : clave.text;
        const motivoText = motivo.na ? "Sin motivo" : motivo.text;
        const services = [
          isYes(r.mesaUso) ? "Mesa" : null,
          isYes(r.recargaUso) ? "RecargaKlic" : null,
          isYes(r.popUso) ? "POP" : null,
        ]
          .filter(Boolean)
          .join(" · ");

        return `
          <article class="response-card" data-idx="${idx}">
            <div class="card-media" data-tier="${tier.cls}">
              <span class="card-badge ${tier.cls}">${esc(tier.label)}</span>
              <div class="card-nps">${esc(String(r.nps ?? "—"))}</div>
            </div>
            <div class="card-body">
              <h3 class="card-title">${esc(title)}</h3>
              <p class="card-meta">${esc(motivoText.slice(0, 90))}${motivoText.length > 90 ? "…" : ""}</p>
              <p class="card-meta">${esc(services || "Sin servicios marcados")}</p>
              <p class="card-date">${esc(shortDate(r.receivedAt || r.timestamp))}</p>
              <div class="card-actions">
                <button type="button" data-action="detail" data-idx="${idx}">Ver detalle</button>
                <button type="button" data-action="csv" data-idx="${idx}">CSV</button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderAll() {
    applyFilters();
    const stats = computeStats(state.filtered);
    renderKpis(stats);
    renderCharts(stats);
    renderCards();
  }

  async function refresh() {
    try {
      const res = await fetch("/api/responses?ts=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const list = Array.isArray(data.responses) ? data.responses : [];
      const grew = list.length > state.lastCount;
      state.responses = list;
      state.lastCount = list.length;

      const now = new Date().toLocaleTimeString("es-MX", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      liveStatus.textContent = `En vivo · ${list.length} respuesta${list.length === 1 ? "" : "s"}${
        grew ? " · nueva" : ""
      } · ${now}`;
      renderAll();
    } catch (_) {
      liveStatus.textContent = "Sin conexión · reintentando…";
    }
  }

  cardsGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const r = state.filtered[idx];
    if (!r) return;
    if (btn.dataset.action === "detail") openDetail(r);
    if (btn.dataset.action === "csv") downloadOneCsv(r);
  });

  [filterSearch, filterSegment, filterMesa, filterFrom, filterTo].forEach((el) => {
    el.addEventListener("input", renderAll);
    el.addEventListener("change", renderAll);
  });

  btnClearFilters.addEventListener("click", () => {
    filterSearch.value = "";
    filterSegment.value = "all";
    filterMesa.value = "all";
    filterFrom.value = "";
    filterTo.value = "";
    renderAll();
  });

  btnExportCsv.addEventListener("click", downloadAllCsv);

  refresh();
  setInterval(refresh, POLL_MS);
})();
