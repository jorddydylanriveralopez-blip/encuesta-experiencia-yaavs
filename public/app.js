(() => {
  const cfg = window.YAAVS_NPS_CONFIG || {};
  const app = document.getElementById("app");
  const progressWrap = document.getElementById("progressWrap");
  const progressFill = document.getElementById("progressFill");
  const progressBar = document.getElementById("progressBar");
  const progressLabel = document.getElementById("progressLabel");
  const progressPct = document.getElementById("progressPct");
  const toast = document.getElementById("toast");

  const MATRIX_ROWS = [
    { key: "soporte", label: "Soporte recibido" },
    { key: "espera", label: "Tiempo de espera para ser atendido" },
    { key: "resolucion", label: "Resolución de dudas o problemas" },
    { key: "amabilidad", label: "Amabilidad y empatía del agente" },
    { key: "conocimiento", label: "Conocimiento y claridad del agente" },
    { key: "trato", label: "Trato recibido durante la interacción" },
  ];

  const MESA_MEJORAS = [
    "Tiempos de respuesta",
    "Resolución de dudas o problemas",
    "Conocimiento y claridad del agente",
    "Amabilidad y empatía",
    "Seguimiento de solicitudes",
    "Calidad general del servicio",
  ];

  const RECARGA_MEJORAS = [
    "Facilidad de uso",
    "Rapidez de la aplicación",
    "Disponibilidad y estabilidad",
    "Claridad de la información",
    "Proceso para realizar recargas",
    "Otro",
  ];

  const POP_MEJORAS = [
    "Calidad y durabilidad",
    "Diseño y contenido",
    "Cantidad de materiales",
    "Tiempo de entrega",
    "Utilidad para promocionar mi negocio",
    "Instalación o rotulación",
    "Otro",
  ];

  const ANTIGUEDAD = [
    "Menos de 3 meses",
    "De 3 a 6 meses",
    "De 7 a 12 meses",
    "Más de 1 y hasta 2 años",
    "Más de 2 años",
  ];

  const SCALE_5 = [
    { value: 1, label: "Pésima" },
    { value: 2, label: "Mala" },
    { value: 3, label: "Regular" },
    { value: 4, label: "Buena" },
    { value: 5, label: "Excelente" },
  ];

  const SCALE_SAT = [
    { value: 1, label: "Nada satisfecho" },
    { value: 2, label: "Poco satisfecho" },
    { value: 3, label: "Moderadamente satisfecho" },
    { value: 4, label: "Satisfecho" },
    { value: 5, label: "Muy satisfecho" },
  ];

  const SCALE_RENT = [
    { value: 1, label: "Nada rentable" },
    { value: 2, label: "Poco rentable" },
    { value: 3, label: "Moderadamente rentable" },
    { value: 4, label: "Rentable" },
    { value: 5, label: "Muy rentable" },
  ];

  const SUBMIT_LOCK_KEY = "yaavs_nps_submitted_v1";

  function readCookie(name) {
    try {
      const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : "";
    } catch (_) {
      return "";
    }
  }

  function hasAlreadySubmitted() {
    try {
      if (localStorage.getItem(SUBMIT_LOCK_KEY) === "1") return true;
      if (sessionStorage.getItem(SUBMIT_LOCK_KEY) === "1") return true;
    } catch (_) {}
    return readCookie(SUBMIT_LOCK_KEY) === "1";
  }

  function markSubmitted() {
    const at = new Date().toISOString();
    try {
      localStorage.setItem(SUBMIT_LOCK_KEY, "1");
      localStorage.setItem(`${SUBMIT_LOCK_KEY}_at`, at);
      sessionStorage.setItem(SUBMIT_LOCK_KEY, "1");
    } catch (_) {}
    try {
      // 1 año — refuerzo por si limpian solo localStorage
      document.cookie = `${SUBMIT_LOCK_KEY}=1; Max-Age=31536000; Path=/; SameSite=Lax`;
    } catch (_) {}
  }

  const state = {
    stepId: window.__YAAVS_NPS_LOCKED__ || hasAlreadySubmitted() ? "already" : "welcome",
    submitting: false,
    answers: {
      clave: "",
      nps: null,
      motivo: "",
      ejecutivo: null,
      mesaUso: null,
      mesaMatrix: {},
      mesaMejoras: [],
      recargaUso: null,
      recargaExp: null,
      recargaMejora: null,
      popUso: null,
      popSat: null,
      popMejora: null,
      rentabilidad: null,
      antiguedad: null,
      mejoraGeneral: "",
      website: "",
    },
  };

  function motivoPrompt(nps) {
    if (nps <= 6) {
      return "¿Cuál es la principal razón de tu calificación y qué tendría que mejorar YAAVS?";
    }
    if (nps <= 8) {
      return "¿Qué tendría que mejorar YAAVS para obtener una calificación de 9 o 10?";
    }
    return "¿Qué es lo que más valoras de trabajar con YAAVS?";
  }

  function mesaNeedsImprove() {
    return MATRIX_ROWS.some((row) => {
      const v = state.answers.mesaMatrix[row.key];
      return typeof v === "number" && v <= 3;
    });
  }

  function getVisibleSteps() {
    const a = state.answers;
    const steps = [
      { id: "welcome", kind: "welcome" },
      { id: "clave", kind: "clave", section: "Identificación" },
      { id: "nps", kind: "nps", section: "Recomendación y experiencia" },
      { id: "motivo", kind: "motivo", section: "Recomendación y experiencia" },
      { id: "ejecutivo", kind: "scale", section: "Ejecutivo comercial" },
      { id: "mesaUso", kind: "yesno", section: "Mesa de Control" },
    ];

    if (a.mesaUso === "Sí") {
      steps.push({ id: "mesaMatrix", kind: "matrix", section: "Mesa de Control" });
      if (mesaNeedsImprove()) {
        steps.push({ id: "mesaMejoras", kind: "checks", section: "Mesa de Control" });
      }
    }

    steps.push({ id: "recargaUso", kind: "yesno", section: "App RecargaKlic" });
    if (a.recargaUso === "Sí") {
      steps.push({ id: "recargaExp", kind: "scale", section: "App RecargaKlic" });
      if (typeof a.recargaExp === "number" && a.recargaExp <= 3) {
        steps.push({ id: "recargaMejora", kind: "choice", section: "App RecargaKlic" });
      }
    }

    steps.push({ id: "popUso", kind: "yesno", section: "Material POP" });
    if (a.popUso === "Sí") {
      steps.push({ id: "popSat", kind: "scale", section: "Material POP" });
      if (typeof a.popSat === "number" && a.popSat <= 3) {
        steps.push({ id: "popMejora", kind: "choice", section: "Material POP" });
      }
    }

    steps.push(
      { id: "rentabilidad", kind: "scale", section: "Rentabilidad y fidelización" },
      { id: "antiguedad", kind: "choice", section: "Rentabilidad y fidelización" },
      { id: "mejoraGeneral", kind: "long", section: "Rentabilidad y fidelización" },
      { id: "done", kind: "done" }
    );

    return steps;
  }

  function currentIndex() {
    return getVisibleSteps().findIndex((s) => s.id === state.stepId);
  }

  function updateProgress() {
    const steps = getVisibleSteps().filter((s) => s.id !== "welcome" && s.id !== "done");
    const idx = steps.findIndex((s) => s.id === state.stepId);
    const show = state.stepId !== "welcome" && state.stepId !== "done" && state.stepId !== "already";
    progressWrap.hidden = !show;
    if (!show) return;

    const total = Math.max(steps.length, 1);
    const current = Math.max(idx + 1, 1);
    const pct = Math.round((current / total) * 100);
    progressFill.style.width = `${pct}%`;
    progressBar.setAttribute("aria-valuenow", String(pct));
    progressLabel.textContent = `Paso ${current} de ${total}`;
    progressPct.textContent = `${pct}%`;
  }

  function showToast(msg) {
    toast.hidden = false;
    toast.textContent = msg;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 2800);
  }

  function npsTone(n) {
    if (n <= 6) return "bad";
    if (n <= 8) return "mid";
    return "good";
  }

  function canContinue(stepId) {
    const a = state.answers;
    switch (stepId) {
      case "welcome":
        return true;
      case "clave":
        return a.clave.trim().length >= 3;
      case "nps":
        return typeof a.nps === "number";
      case "motivo":
        return a.motivo.trim().length > 0 && a.motivo.length <= 500;
      case "ejecutivo":
        return typeof a.ejecutivo === "number";
      case "mesaUso":
        return a.mesaUso === "Sí" || a.mesaUso === "No";
      case "mesaMatrix":
        return MATRIX_ROWS.every((r) => typeof a.mesaMatrix[r.key] === "number");
      case "mesaMejoras":
        return a.mesaMejoras.length >= 1 && a.mesaMejoras.length <= 2;
      case "recargaUso":
        return a.recargaUso === "Sí" || a.recargaUso === "No";
      case "recargaExp":
        return typeof a.recargaExp === "number";
      case "recargaMejora":
        return !!a.recargaMejora;
      case "popUso":
        return a.popUso === "Sí" || a.popUso === "No";
      case "popSat":
        return typeof a.popSat === "number";
      case "popMejora":
        return !!a.popMejora;
      case "rentabilidad":
        return typeof a.rentabilidad === "number";
      case "antiguedad":
        return !!a.antiguedad;
      case "mejoraGeneral":
        return a.mejoraGeneral.trim().length > 0 && a.mejoraGeneral.length <= 700;
      default:
        return true;
    }
  }

  function go(delta) {
    const steps = getVisibleSteps();
    const i = currentIndex();
    const next = steps[i + delta];
    if (!next) return;
    if (delta > 0 && !canContinue(state.stepId)) {
      showToast("Completa este paso para continuar");
      return;
    }
    state.stepId = next.id;
    render();
  }

  function el(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function actionsHtml({ primary = "Continuar", back = true, submit = false } = {}) {
    return `
      <div class="actions">
        ${back ? `<button type="button" class="btn btn-ghost" data-action="back">Atrás</button>` : ""}
        <button type="button" class="btn btn-primary" data-action="${submit ? "submit" : "next"}" ${
          canContinue(state.stepId) ? "" : "disabled"
        }>
          ${primary}
        </button>
        <span class="hint-enter">Pulsa <kbd>Enter</kbd></span>
      </div>
    `;
  }

  function bindCommon(root) {
    root.querySelectorAll("[data-action='back']").forEach((b) => b.addEventListener("click", () => go(-1)));
    root.querySelectorAll("[data-action='next']").forEach((b) => b.addEventListener("click", () => go(1)));
    root.querySelectorAll("[data-action='submit']").forEach((b) =>
      b.addEventListener("click", () => submitForm())
    );
  }

  function refreshNext(root) {
    const btn = root.querySelector("[data-action='next'], [data-action='submit']");
    if (btn) btn.disabled = !canContinue(state.stepId);
  }

  function renderWelcome() {
    return el(`
      <section class="card welcome step">
        <div class="kicker"><span class="kicker-dot"></span> Encuesta de experiencia</div>
        <h1>YAAVS quiere seguir ayudándote a crecer</h1>
        <p class="lead">
          Responder toma menos de 3 minutos. Tu opinión nos permite mejorar la atención,
          las herramientas y los beneficios que te ofrecemos.
        </p>
        <div class="meta-pills">
          <span class="pill">≈ 3 minutos</span>
          <span class="pill">Respuestas confidenciales</span>
          <span class="pill">Experiencia reciente</span>
        </div>
        ${actionsHtml({ primary: "Empezar", back: false })}
      </section>
    `);
  }

  function renderClave() {
    const root = el(`
      <section class="card step">
        <span class="section-tag">Identificación</span>
        <h2 class="question-title">¿Cuál es tu clave YAAVSER?</h2>
        <p class="question-help">Escribe tu clave YAAVSER completa.</p>
        <input class="field" id="clave" type="text" autocomplete="off" maxlength="80"
          placeholder="Ej. YAAVSER-12345" value="${escapeAttr(state.answers.clave)}" />
        <input class="hp" name="website" id="website" tabindex="-1" autocomplete="off"
          style="position:absolute;left:-9999px;opacity:0;height:0;width:0" value="${escapeAttr(
            state.answers.website
          )}" aria-hidden="true" />
        ${actionsHtml()}
      </section>
    `);
    const input = root.querySelector("#clave");
    input.addEventListener("input", () => {
      state.answers.clave = input.value;
      refreshNext(root);
    });
    root.querySelector("#website").addEventListener("input", (e) => {
      state.answers.website = e.target.value;
    });
    setTimeout(() => input.focus(), 50);
    return root;
  }

  function renderNps() {
    const buttons = Array.from({ length: 11 }, (_, n) => {
      const selected = state.answers.nps === n ? "is-selected" : "";
      return `<button type="button" class="nps-btn ${selected}" data-nps="${n}" data-tone="${npsTone(
        n
      )}">${n}</button>`;
    }).join("");

    const root = el(`
      <section class="card step">
        <span class="section-tag">Sección 1 · Recomendación</span>
        <h2 class="question-title">¿Qué tan probable es que recomiendes YAAVS a otro negocio como el tuyo?</h2>
        <p class="question-help">Escala de 0 a 10, según tu experiencia reciente.</p>
        <div class="nps-grid">${buttons}</div>
        <div class="nps-labels"><span>0 — Nada probable</span><span>10 — Totalmente probable</span></div>
        ${actionsHtml()}
      </section>
    `);

    root.querySelectorAll("[data-nps]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers.nps = Number(btn.dataset.nps);
        root.querySelectorAll("[data-nps]").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        refreshNext(root);
      });
    });
    return root;
  }

  function renderMotivo() {
    const nps = state.answers.nps ?? 0;
    const root = el(`
      <section class="card step">
        <span class="section-tag">Sección 1 · Motivo</span>
        <h2 class="question-title">${escapeHtml(motivoPrompt(nps))}</h2>
        <p class="question-help">Máximo 500 caracteres.</p>
        <textarea class="field" id="motivo" maxlength="500" placeholder="Cuéntanos con tus palabras…">${escapeHtml(
          state.answers.motivo
        )}</textarea>
        <div class="char-count"><span id="motivoCount">${state.answers.motivo.length}</span>/500</div>
        ${actionsHtml()}
      </section>
    `);
    const ta = root.querySelector("#motivo");
    const count = root.querySelector("#motivoCount");
    ta.addEventListener("input", () => {
      state.answers.motivo = ta.value;
      count.textContent = String(ta.value.length);
      refreshNext(root);
    });
    setTimeout(() => ta.focus(), 50);
    return root;
  }

  function renderScale({ section, title, help, key, options }) {
    const buttons = options
      .map((o) => {
        const selected = state.answers[key] === o.value ? "is-selected" : "";
        return `<button type="button" class="scale-btn ${selected}" data-val="${o.value}">
          <span class="num">${o.value}</span>
          <span class="lbl">${escapeHtml(o.label)}</span>
        </button>`;
      })
      .join("");

    const root = el(`
      <section class="card step">
        <span class="section-tag">${escapeHtml(section)}</span>
        <h2 class="question-title">${escapeHtml(title)}</h2>
        ${help ? `<p class="question-help">${escapeHtml(help)}</p>` : ""}
        <div class="scale-row">${buttons}</div>
        ${actionsHtml()}
      </section>
    `);

    root.querySelectorAll("[data-val]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers[key] = Number(btn.dataset.val);
        root.querySelectorAll("[data-val]").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        refreshNext(root);
      });
    });
    return root;
  }

  function renderYesNo({ section, title, help, key }) {
    const opts = ["Sí", "No"]
      .map((o) => {
        const selected = state.answers[key] === o ? "is-selected" : "";
        return `<button type="button" class="choice ${selected}" data-val="${o}">
          <span class="mark"></span><span>${o}</span>
        </button>`;
      })
      .join("");

    const root = el(`
      <section class="card step">
        <span class="section-tag">${escapeHtml(section)}</span>
        <h2 class="question-title">${escapeHtml(title)}</h2>
        ${help ? `<p class="question-help">${escapeHtml(help)}</p>` : ""}
        <div class="choices">${opts}</div>
        ${actionsHtml()}
      </section>
    `);

    root.querySelectorAll("[data-val]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers[key] = btn.dataset.val;
        root.querySelectorAll("[data-val]").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        refreshNext(root);
      });
    });
    return root;
  }

  function renderMatrix() {
    const rows = MATRIX_ROWS.map((row) => {
      const current = state.answers.mesaMatrix[row.key];
      const btns = [1, 2, 3, 4, 5]
        .map(
          (n) =>
            `<button type="button" class="${current === n ? "is-selected" : ""}" data-row="${
              row.key
            }" data-val="${n}">${n}</button>`
        )
        .join("");
      return `<div class="matrix-row">
        <div class="matrix-label">${escapeHtml(row.label)}</div>
        <div class="matrix-scale">${btns}</div>
      </div>`;
    }).join("");

    const root = el(`
      <section class="card step">
        <span class="section-tag">Sección 3 · Mesa de Control</span>
        <h2 class="question-title">Pensando en tu atención más reciente, ¿cómo calificarías estos aspectos?</h2>
        <p class="question-help">1 — Pésimo · 5 — Excelente</p>
        <div class="matrix">${rows}</div>
        <div class="matrix-legend">
          <span>1 Pésimo</span><span>2 Malo</span><span>3 Regular</span><span>4 Bueno</span><span>5 Excelente</span>
        </div>
        ${actionsHtml()}
      </section>
    `);

    root.querySelectorAll("[data-row]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.row;
        state.answers.mesaMatrix[key] = Number(btn.dataset.val);
        root.querySelectorAll(`[data-row="${key}"]`).forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        refreshNext(root);
      });
    });
    return root;
  }

  function renderChecks() {
    const options = MESA_MEJORAS.map((o) => {
      const selected = state.answers.mesaMejoras.includes(o) ? "is-selected" : "";
      return `<button type="button" class="check ${selected}" data-val="${escapeAttr(o)}">
        <span class="mark"></span><span>${escapeHtml(o)}</span>
      </button>`;
    }).join("");

    const root = el(`
      <section class="card step">
        <span class="section-tag">Sección 3 · Mejoras</span>
        <h2 class="question-title">¿Qué aspectos de nuestra Mesa de Control deberíamos mejorar?</h2>
        <p class="question-help">Selecciona hasta dos opciones.</p>
        <div class="choices">${options}</div>
        ${actionsHtml()}
      </section>
    `);

    root.querySelectorAll("[data-val]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.val;
        const list = state.answers.mesaMejoras;
        const i = list.indexOf(val);
        if (i >= 0) {
          list.splice(i, 1);
          btn.classList.remove("is-selected");
        } else {
          if (list.length >= 2) {
            showToast("Solo puedes elegir hasta 2 opciones");
            return;
          }
          list.push(val);
          btn.classList.add("is-selected");
        }
        refreshNext(root);
      });
    });
    return root;
  }

  function renderChoice({ section, title, help, key, options }) {
    const opts = options
      .map((o) => {
        const selected = state.answers[key] === o ? "is-selected" : "";
        return `<button type="button" class="choice ${selected}" data-val="${escapeAttr(o)}">
          <span class="mark"></span><span>${escapeHtml(o)}</span>
        </button>`;
      })
      .join("");

    const root = el(`
      <section class="card step">
        <span class="section-tag">${escapeHtml(section)}</span>
        <h2 class="question-title">${escapeHtml(title)}</h2>
        ${help ? `<p class="question-help">${escapeHtml(help)}</p>` : ""}
        <div class="choices">${opts}</div>
        ${actionsHtml()}
      </section>
    `);

    root.querySelectorAll("[data-val]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers[key] = btn.dataset.val;
        root.querySelectorAll("[data-val]").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
        refreshNext(root);
      });
    });
    return root;
  }

  function renderLong() {
    const root = el(`
      <section class="card step">
        <span class="section-tag">Sección 6 · Cierre</span>
        <h2 class="question-title">En general, ¿qué podríamos mejorar en YAAVS para ayudarte a hacer crecer tu negocio?</h2>
        <p class="question-help">Opcional · máximo 700 caracteres.</p>
        <textarea class="field" id="mejora" maxlength="700" placeholder="Ideas, fricciones o lo que te gustaría ver…">${escapeHtml(
          state.answers.mejoraGeneral
        )}</textarea>
        <div class="char-count"><span id="mejoraCount">${state.answers.mejoraGeneral.length}</span>/700</div>
        ${actionsHtml({ primary: state.submitting ? "Enviando…" : "Enviar respuestas", submit: true })}
      </section>
    `);
    const ta = root.querySelector("#mejora");
    const count = root.querySelector("#mejoraCount");
    ta.addEventListener("input", () => {
      state.answers.mejoraGeneral = ta.value;
      count.textContent = String(ta.value.length);
      refreshNext(root);
    });
    return root;
  }

  function renderDone(ok, errorMsg) {
    if (!ok) {
      return el(`
        <section class="card success step">
          <div class="success-icon">!</div>
          <h2 class="question-title">No se pudo guardar</h2>
          <p class="lead">${escapeHtml(errorMsg || "Revisa la conexión a Google Sheets e intenta de nuevo.")}</p>
          <div class="actions" style="justify-content:center">
            <button type="button" class="btn btn-primary" data-action="retry">Reintentar envío</button>
            <button type="button" class="btn btn-ghost" data-action="back-edit">Volver a editar</button>
          </div>
        </section>
      `);
    }

    return el(`
      <section class="card success step">
        <div class="success-icon">✓</div>
        <h2 class="question-title">¡Gracias por compartir tu experiencia!</h2>
        <p class="lead">Tus respuestas ya quedaron registradas. En YAAVS las usamos para mejorar lo que más importa para tu negocio.</p>
        <p class="lead" style="margin-top:0.75rem">Esta encuesta solo se puede contestar una vez desde este dispositivo.</p>
      </section>
    `);
  }

  function renderAlreadySubmitted() {
    return el(`
      <section class="card success step">
        <div class="success-icon">✓</div>
        <h2 class="question-title">Ya respondiste esta encuesta</h2>
        <p class="lead">
          Gracias. Desde este navegador ya se envió una respuesta y no se puede volver a contestar
          para no duplicar resultados.
        </p>
      </section>
    `);
  }

  function visibleValue(v) {
    if (v === null || v === undefined) return "No aplica";
    const s = String(v).trim();
    return s === "" ? "No aplica" : s;
  }

  function buildPayload() {
    const a = state.answers;
    const mesaSi = a.mesaUso === "Sí";
    const recargaSi = a.recargaUso === "Sí";
    const popSi = a.popUso === "Sí";

    return {
      timestamp: new Date().toISOString(),
      clave: a.clave.trim(),
      nps: a.nps,
      motivo: a.motivo.trim(),
      ejecutivo: a.ejecutivo,
      mesaUso: a.mesaUso,
      mesa_soporte: mesaSi ? a.mesaMatrix.soporte : "No aplica",
      mesa_espera: mesaSi ? a.mesaMatrix.espera : "No aplica",
      mesa_resolucion: mesaSi ? a.mesaMatrix.resolucion : "No aplica",
      mesa_amabilidad: mesaSi ? a.mesaMatrix.amabilidad : "No aplica",
      mesa_conocimiento: mesaSi ? a.mesaMatrix.conocimiento : "No aplica",
      mesa_trato: mesaSi ? a.mesaMatrix.trato : "No aplica",
      mesaMejoras: mesaSi ? a.mesaMejoras.join(" | ") || "No aplica" : "No aplica",
      recargaUso: a.recargaUso,
      recargaExp: recargaSi ? a.recargaExp ?? "No aplica" : "No aplica",
      recargaMejora: recargaSi ? a.recargaMejora ?? "No aplica" : "No aplica",
      popUso: a.popUso,
      popSat: popSi ? a.popSat ?? "No aplica" : "No aplica",
      popMejora: popSi ? a.popMejora ?? "No aplica" : "No aplica",
      rentabilidad: a.rentabilidad,
      antiguedad: a.antiguedad,
      mejoraGeneral: a.mejoraGeneral.trim(),
      website: a.website,
      sheetName: cfg.sheetName || "Respuestas NPS",
    };
  }

  function formatPayloadForSheet(payload) {
    return [
      `Clave: ${visibleValue(payload.clave)}`,
      `NPS: ${visibleValue(payload.nps)}`,
      `Motivo: ${visibleValue(payload.motivo)}`,
      `Ejecutivo: ${visibleValue(payload.ejecutivo)}`,
      `Mesa uso: ${visibleValue(payload.mesaUso)}`,
      `Mesa soporte: ${visibleValue(payload.mesa_soporte)}`,
      `Mesa espera: ${visibleValue(payload.mesa_espera)}`,
      `Mesa resolución: ${visibleValue(payload.mesa_resolucion)}`,
      `Mesa amabilidad: ${visibleValue(payload.mesa_amabilidad)}`,
      `Mesa conocimiento: ${visibleValue(payload.mesa_conocimiento)}`,
      `Mesa trato: ${visibleValue(payload.mesa_trato)}`,
      `Mesa mejoras: ${visibleValue(payload.mesaMejoras)}`,
      `RecargaKlic uso: ${visibleValue(payload.recargaUso)}`,
      `RecargaKlic exp: ${visibleValue(payload.recargaExp)}`,
      `RecargaKlic mejora: ${visibleValue(payload.recargaMejora)}`,
      `POP uso: ${visibleValue(payload.popUso)}`,
      `POP sat: ${visibleValue(payload.popSat)}`,
      `POP mejora: ${visibleValue(payload.popMejora)}`,
      `Rentabilidad: ${visibleValue(payload.rentabilidad)}`,
      `Antigüedad: ${visibleValue(payload.antiguedad)}`,
      `Mejora general: ${visibleValue(payload.mejoraGeneral)}`,
      `JSON: ${JSON.stringify(payload)}`,
    ].join("\n");
  }

  async function submitToGoogleForms(payload) {
    const action = String(cfg.formAction || "").trim();
    const entryId = String(cfg.entryId || "").trim();
    if (!action || !entryId) throw new Error("Falta configuración de Google Forms");

    const body = new URLSearchParams();
    body.set(entryId, formatPayloadForSheet(payload));

    // Google Forms no expone CORS; no-cors alcanza para registrar la respuesta.
    await fetch(action, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  }

  async function submitForm() {
    if (hasAlreadySubmitted()) {
      state.stepId = "already";
      render();
      return;
    }
    if (!canContinue("mejoraGeneral") || state.submitting) return;
    state.submitting = true;
    render();

    const payload = buildPayload();
    const mode = String(cfg.mode || "").trim();
    const endpoint = String(cfg.endpoint || "").trim();

    try {
      // Primero al panel (tiempo real), luego a Sheets.
      const panelRes = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (panelRes.status === 409) {
        markSubmitted();
        state.submitting = false;
        state.stepId = "already";
        state._lastError = null;
        render();
        return;
      }
      if (!panelRes.ok) {
        throw new Error("No se pudo guardar en el panel de resultados");
      }

      if (mode === "google-forms" || cfg.formAction) {
        await submitToGoogleForms(payload);
      } else if (endpoint) {
        const res = await fetch(endpoint, {
          method: "POST",
          redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
        });

        if (!res.ok && res.type !== "opaque") {
          let message = "No se pudo guardar en Sheets";
          try {
            const json = await res.json();
            if (json && json.error) message = json.error;
          } catch (_) {}
          throw new Error(message);
        }
      }

      markSubmitted();
      state.submitting = false;
      state.stepId = "done";
      state._lastError = null;
      render();
    } catch (err) {
      state.submitting = false;
      state.stepId = "done";
      state._lastError = err && err.message ? err.message : String(err);
      render();
    }
  }

  function render() {
    updateProgress();
    const id = state.stepId;
    let node;

    switch (id) {
      case "already":
        node = renderAlreadySubmitted();
        break;
      case "welcome":
        node = renderWelcome();
        break;
      case "clave":
        node = renderClave();
        break;
      case "nps":
        node = renderNps();
        break;
      case "motivo":
        node = renderMotivo();
        break;
      case "ejecutivo":
        node = renderScale({
          section: "Sección 2 · Ejecutivo comercial",
          title: "¿Cómo calificarías la atención que recibes de tu ejecutivo comercial?",
          key: "ejecutivo",
          options: SCALE_5,
        });
        break;
      case "mesaUso":
        node = renderYesNo({
          section: "Sección 3 · Mesa de Control",
          title: "En los últimos 6 meses, ¿has solicitado apoyo a nuestra Mesa de Control?",
          key: "mesaUso",
        });
        break;
      case "mesaMatrix":
        node = renderMatrix();
        break;
      case "mesaMejoras":
        node = renderChecks();
        break;
      case "recargaUso":
        node = renderYesNo({
          section: "Sección 4 · RecargaKlic",
          title: "En los últimos 6 meses, ¿has utilizado la app RecargaKlic?",
          key: "recargaUso",
        });
        break;
      case "recargaExp":
        node = renderScale({
          section: "Sección 4 · RecargaKlic",
          title: "¿Cómo calificarías tu experiencia general con la app RecargaKlic?",
          key: "recargaExp",
          options: SCALE_5,
        });
        break;
      case "recargaMejora":
        node = renderChoice({
          section: "Sección 4 · RecargaKlic",
          title: "¿Qué aspecto de RecargaKlic deberíamos mejorar principalmente?",
          key: "recargaMejora",
          options: RECARGA_MEJORAS,
        });
        break;
      case "popUso":
        node = renderYesNo({
          section: "Sección 5 · Material POP",
          title:
            "En los últimos 6 meses, ¿has recibido material POP, promocionales o rotulación YAAVS para tu negocio?",
          key: "popUso",
        });
        break;
      case "popSat":
        node = renderScale({
          section: "Sección 5 · Material POP",
          title:
            "¿Qué tan satisfecho estás con el material POP, los promocionales y la rotulación YAAVS de tu negocio?",
          key: "popSat",
          options: SCALE_SAT,
        });
        break;
      case "popMejora":
        node = renderChoice({
          section: "Sección 5 · Material POP",
          title: "¿Qué aspecto deberíamos mejorar principalmente?",
          key: "popMejora",
          options: POP_MEJORAS,
        });
        break;
      case "rentabilidad":
        node = renderScale({
          section: "Sección 6 · Rentabilidad",
          title: "¿Cómo consideras la rentabilidad que obtienes al trabajar con YAAVS?",
          key: "rentabilidad",
          options: SCALE_RENT,
        });
        break;
      case "antiguedad":
        node = renderChoice({
          section: "Sección 6 · Fidelización",
          title: "¿Desde cuándo trabajas con YAAVS?",
          key: "antiguedad",
          options: ANTIGUEDAD,
        });
        break;
      case "mejoraGeneral":
        node = renderLong();
        break;
      case "done":
        node = renderDone(!state._lastError, state._lastError);
        break;
      default:
        node = renderWelcome();
    }

    app.replaceChildren(node);
    bindCommon(node);

    const retry = node.querySelector("[data-action='retry']");
    if (retry) {
      retry.addEventListener("click", () => {
        state.stepId = "mejoraGeneral";
        state._lastError = null;
        submitForm();
      });
    }
    const backEdit = node.querySelector("[data-action='back-edit']");
    if (backEdit) {
      backEdit.addEventListener("click", () => {
        state.stepId = "mejoraGeneral";
        state._lastError = null;
        render();
      });
    }
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeAttr(str) {
    return escapeHtml(str).replace(/'/g, "&#39;");
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "TEXTAREA") return;
    if (state.stepId === "done") return;
    e.preventDefault();
    if (state.stepId === "mejoraGeneral") submitForm();
    else go(1);
  });

  render();
})();
