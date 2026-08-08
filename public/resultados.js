(() => {
  const POLL_MS = 3000;
  const kpisEl = document.getElementById("kpis");
  const detailEl = document.getElementById("detailCard");
  const statsEl = document.getElementById("statsCard");
  const liveStatus = document.getElementById("liveStatus");

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

  const MESA_ASPECTS = [
    ["mesa_soporte", "Soporte recibido"],
    ["mesa_espera", "Tiempo de espera"],
    ["mesa_resolucion", "Resolución de dudas"],
    ["mesa_amabilidad", "Amabilidad y empatía"],
    ["mesa_conocimiento", "Conocimiento del agente"],
    ["mesa_trato", "Trato recibido"],
  ];

  const state = {
    responses: [],
    index: 0,
    lastCount: 0,
    stickToLatest: true,
  };

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
    if (!Number.isFinite(n)) return { label: "Sin NPS", cls: "passive" };
    if (n >= 9) return { label: "Promotor", cls: "promoter" };
    if (n >= 7) return { label: "Pasivo", cls: "passive" };
    return { label: "Detractor", cls: "detractor" };
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

  function avgNumeric(list, key) {
    const nums = list
      .map((r) => Number(r[key]))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
    if (!nums.length) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
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

    const countYes = (key) => list.filter((r) => String(r[key] || "").toLowerCase().startsWith("s")).length;

    const mesaAspects = MESA_ASPECTS.map(([key, label]) => ({
      key,
      label,
      avg: avgNumeric(list, key),
    }));

    return {
      total: list.length,
      avg,
      promoters,
      passives,
      detractors,
      npsScore,
      mesa: countYes("mesaUso"),
      recarga: countYes("recargaUso"),
      pop: countYes("popUso"),
      mesaAspects,
    };
  }

  function bar(label, count, total) {
    const pct = total ? Math.round((count / total) * 100) : 0;
    return `
      <div class="bar-row">
        <span>${esc(label)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <strong>${count}</strong>
      </div>
    `;
  }

  function scoreBar(label, avg) {
    if (avg == null) {
      return `
        <div class="bar-row bar-row-score">
          <span>${esc(label)}</span>
          <div class="bar-track"><div class="bar-fill" style="width:0%"></div></div>
          <strong class="muted-num">—</strong>
        </div>
      `;
    }
    const pct = Math.max(0, Math.min(100, Math.round((avg / 5) * 100)));
    return `
      <div class="bar-row bar-row-score">
        <span>${esc(label)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <strong>${avg.toFixed(1)}</strong>
      </div>
    `;
  }

  function renderKpis(stats) {
    kpisEl.innerHTML = `
      <div class="kpi">
        <div class="kpi-label">Respuestas</div>
        <div class="kpi-value">${stats.total}</div>
        <div class="kpi-sub">En tiempo real</div>
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

  function renderStats(stats) {
    const t = stats.total || 1;
    const mesaBars = (stats.mesaAspects || []).map((a) => scoreBar(a.label, a.avg)).join("");
    statsEl.innerHTML = `
      <h2>Resumen por pregunta</h2>
      <div class="stat-block">
        <h3>Segmento NPS</h3>
        ${bar("Promotores", stats.promoters, t)}
        ${bar("Pasivos", stats.passives, t)}
        ${bar("Detractores", stats.detractors, t)}
      </div>
      <div class="stat-block">
        <h3>Uso de servicios</h3>
        ${bar("Mesa de Control", stats.mesa, t)}
        ${bar("RecargaKlic", stats.recarga, t)}
        ${bar("Material POP", stats.pop, t)}
      </div>
      <div class="stat-block">
        <h3>Mesa de Control · promedio 1–5</h3>
        ${mesaBars || `<p class="muted" style="margin:0;font-size:0.85rem">Sin calificaciones aún.</p>`}
      </div>
      <p class="muted" style="margin:0;font-size:0.85rem">Se actualiza solo cada pocos segundos.</p>
    `;
  }

  function renderDetail() {
    const list = state.responses;
    if (!list.length) {
      detailEl.innerHTML = `
        <p class="muted"><strong>Aún no hay respuestas.</strong></p>
        <p class="muted">En cuanto alguien complete el cuestionario, verás aquí cada respuesta una por una, en vivo.</p>
      `;
      return;
    }

    const r = list[state.index];
    const tier = npsTier(r.nps);
    const clave = val(r.clave);
    const fields = LABELS.map(([key, label]) => {
      const v = val(r[key]);
      return `
        <div class="field">
          <div class="field-label">${esc(label)}</div>
          <div class="field-value${v.na ? " na" : ""}">${esc(v.text)}</div>
        </div>
      `;
    }).join("");

    detailEl.innerHTML = `
      <div class="detail-head">
        <div class="counter">Respuesta ${state.index + 1} de ${list.length}</div>
        <div class="badge ${tier.cls}">NPS ${esc(String(r.nps ?? "—"))} · ${tier.label}</div>
      </div>
      <h2 class="detail-title">${clave.na ? "Sin clave" : esc(clave.text)}</h2>
      <p class="detail-when">${esc(when(r.receivedAt || r.timestamp))}</p>
      <div class="fields">${fields}</div>
      <div class="nav">
        <button type="button" class="btn btn-ghost" id="btnPrev" ${state.index <= 0 ? "disabled" : ""}>← Anterior</button>
        <button type="button" class="btn btn-primary" id="btnNext" ${state.index >= list.length - 1 ? "disabled" : ""}>Siguiente →</button>
      </div>
    `;

    document.getElementById("btnPrev")?.addEventListener("click", () => {
      state.stickToLatest = false;
      if (state.index > 0) {
        state.index -= 1;
        renderDetail();
      }
    });
    document.getElementById("btnNext")?.addEventListener("click", () => {
      state.stickToLatest = state.index + 1 >= list.length - 1;
      if (state.index < list.length - 1) {
        state.index += 1;
        renderDetail();
      }
    });
  }

  function renderAll(flash) {
    const stats = computeStats(state.responses);
    renderKpis(stats);
    renderStats(stats);
    renderDetail();
    if (flash) {
      detailEl.classList.remove("flash");
      void detailEl.offsetWidth;
      detailEl.classList.add("flash");
    }
  }

  async function refresh() {
    try {
      const res = await fetch("/api/responses?ts=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const list = Array.isArray(data.responses) ? data.responses : [];
      const grew = list.length > state.lastCount;
      const prevId = state.responses[state.index]?.id;

      state.responses = list;
      if (!list.length) {
        state.index = 0;
      } else if (state.stickToLatest || grew) {
        state.index = 0; // newest first
        state.stickToLatest = true;
      } else {
        const idx = list.findIndex((r) => r.id === prevId);
        state.index = idx >= 0 ? idx : 0;
      }

      const now = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      liveStatus.textContent = `En vivo · ${list.length} respuesta${list.length === 1 ? "" : "s"} · ${now}`;
      renderAll(grew && list.length > state.lastCount);
      state.lastCount = list.length;
    } catch (err) {
      liveStatus.textContent = "Sin conexión · reintentando…";
    }
  }

  document.addEventListener("keydown", (e) => {
    if (!state.responses.length) return;
    if (e.key === "ArrowLeft" && state.index > 0) {
      state.stickToLatest = false;
      state.index -= 1;
      renderDetail();
    }
    if (e.key === "ArrowRight" && state.index < state.responses.length - 1) {
      state.index += 1;
      state.stickToLatest = state.index >= state.responses.length - 1;
      renderDetail();
    }
  });

  refresh();
  setInterval(refresh, POLL_MS);
})();
