(() => {
  const root = document.getElementById("panelRoot");

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
    index: 0,
    error: null,
  };

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function showValue(v) {
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

  function formatWhen(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "Sin fecha";
      return d.toLocaleString("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch (_) {
      return "Sin fecha";
    }
  }

  function renderEmpty() {
    root.innerHTML = `
      <div class="empty">
        <p><strong>Aún no hay respuestas en el panel.</strong></p>
        <p>Cuando alguien complete el cuestionario, aparecerán aquí una por una.</p>
        <p style="margin-top:1.2rem"><a class="link-form" href="./">Abrir cuestionario</a></p>
      </div>
    `;
  }

  function renderError(msg) {
    root.innerHTML = `
      <div class="empty">
        <p><strong>No se pudieron cargar las respuestas.</strong></p>
        <p>${escapeHtml(msg)}</p>
      </div>
    `;
  }

  function renderCurrent() {
    const total = state.responses.length;
    if (!total) return renderEmpty();

    const r = state.responses[state.index];
    const tier = npsTier(r.nps);
    const when = formatWhen(r.receivedAt || r.timestamp);
    const clave = showValue(r.clave);

    const fields = LABELS.map(([key, label]) => {
      const v = showValue(r[key]);
      return `
        <div class="field">
          <div class="field-label">${escapeHtml(label)}</div>
          <div class="field-value${v.na ? " na" : ""}">${escapeHtml(v.text)}</div>
        </div>
      `;
    }).join("");

    root.innerHTML = `
      <div class="panel-meta">
        <div class="counter">Respuesta ${state.index + 1} de ${total}</div>
        <div class="nps-badge ${tier.cls}">NPS ${escapeHtml(String(r.nps ?? "—"))} · ${tier.label}</div>
        <div class="when">${escapeHtml(when)}</div>
      </div>

      <div class="hero-line">
        <h1>${clave.na ? "Sin clave" : escapeHtml(clave.text)}</h1>
        <p>Revisa esta respuesta completa. Usa las flechas o los botones para pasar a la siguiente.</p>
      </div>

      <div class="fields">${fields}</div>

      <div class="nav">
        <button type="button" class="btn btn-ghost" id="btnPrev" ${state.index <= 0 ? "disabled" : ""}>← Anterior</button>
        <button type="button" class="btn btn-primary" id="btnNext" ${state.index >= total - 1 ? "disabled" : ""}>Siguiente →</button>
      </div>
      <p class="hint">Atajos: ← → en el teclado</p>
    `;

    document.getElementById("btnPrev")?.addEventListener("click", () => {
      if (state.index > 0) {
        state.index -= 1;
        renderCurrent();
      }
    });
    document.getElementById("btnNext")?.addEventListener("click", () => {
      if (state.index < total - 1) {
        state.index += 1;
        renderCurrent();
      }
    });
  }

  async function load() {
    try {
      const res = await fetch("/api/responses", { cache: "no-store" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      state.responses = Array.isArray(data.responses) ? data.responses : [];
      state.index = 0;
      renderCurrent();
    } catch (err) {
      renderError(err.message || String(err));
    }
  }

  document.addEventListener("keydown", (e) => {
    if (!state.responses.length) return;
    if (e.key === "ArrowLeft" && state.index > 0) {
      state.index -= 1;
      renderCurrent();
    }
    if (e.key === "ArrowRight" && state.index < state.responses.length - 1) {
      state.index += 1;
      renderCurrent();
    }
  });

  load();
})();
