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
    { key: "contacto", label: "Facilidad para contactar" },
    { key: "tiempo", label: "Tiempo de respuesta" },
    { key: "primerContacto", label: "Resolución en el primer contacto" },
    { key: "atencion", label: "Atención y claridad del agente" },
  ];

  const MOTIVO_RAZONES = [
    "Atención del ejecutivo",
    "Mesa de Control",
    "RecargaKlic / activación de chips",
    "Material POP",
    "Ganancias, comisiones o incentivos",
    "Productos y surtido",
    "Otro",
  ];

  const MESA_MEJORAS = [
    "Tiempos de respuesta",
    "Resolución de dudas o problemas",
    "Conocimiento y claridad del agente",
    "Amabilidad y empatía",
    "Seguimiento de solicitudes",
    "Calidad general del servicio",
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

  const RECARGA_MEJORAS = [
    "Facilidad de uso",
    "Rapidez de la aplicación",
    "Disponibilidad y estabilidad",
    "Claridad de la información",
    "Proceso para realizar recargas",
    "Otro",
  ];

  const RECARGA_METODOS = [
    "App de RecargaKlic",
    "Bot de WhatsApp (Alphabot)",
    "RecargaKlic Web",
    "Mesa de control",
  ];

  const VISITA_EJECUTIVO = [
    "Dos o más veces por semana",
    "Una vez por semana",
    "Una vez cada 15 días",
    "Una vez al mes",
    "Con menor frecuencia",
    "No he recibido visitas de mi ejecutivo",
  ];

  const PRODUCTOS_YAAVS = [
    "Chips multimarca",
    "Portabilidades",
    "eSIM",
    "Liberaciones",
    "Internet inalámbrico (MIFI Bait)",
    "Tiempo aire",
    "Planes de renta BAIT POSPAGO",
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

  const SCALE_GANANCIAS = [
    { value: 1, label: "Nada atractiva" },
    { value: 2, label: "Poco atractiva" },
    { value: 3, label: "Regular" },
    { value: 4, label: "Atractiva" },
    { value: 5, label: "Muy atractiva" },
  ];

  const SUBMIT_COUNT_KEY = "yaavs_nps_submit_count_v2";
  const SUBMIT_LOCK_LEGACY = "yaavs_nps_submitted_v1";
  const MAX_SUBMISSIONS = 99;

  function readCookie(name) {
    try {
      const m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : "";
    } catch (_) {
      return "";
    }
  }

  function getSubmitCount() {
    try {
      const raw = localStorage.getItem(SUBMIT_COUNT_KEY) || sessionStorage.getItem(SUBMIT_COUNT_KEY);
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0) return Math.min(n, MAX_SUBMISSIONS);
    } catch (_) {}
    const cookieCount = Number(readCookie(SUBMIT_COUNT_KEY));
    if (Number.isFinite(cookieCount) && cookieCount >= 0) return Math.min(cookieCount, MAX_SUBMISSIONS);
    // Migración del candado viejo (1 envío) → cuenta 1 (aún pueden hacer la 2ª).
    try {
      if (localStorage.getItem(SUBMIT_LOCK_LEGACY) === "1" || sessionStorage.getItem(SUBMIT_LOCK_LEGACY) === "1") {
        return 1;
      }
    } catch (_) {}
    if (readCookie(SUBMIT_LOCK_LEGACY) === "1") return 1;
    return 0;
  }

  function hasReachedLimit() {
    return getSubmitCount() >= MAX_SUBMISSIONS;
  }

  function canSubmitAgain() {
    return getSubmitCount() < MAX_SUBMISSIONS;
  }

  function markSubmitted() {
    const next = Math.min(getSubmitCount() + 1, MAX_SUBMISSIONS);
    const at = new Date().toISOString();
    try {
      localStorage.setItem(SUBMIT_COUNT_KEY, String(next));
      localStorage.setItem(`${SUBMIT_COUNT_KEY}_at`, at);
      sessionStorage.setItem(SUBMIT_COUNT_KEY, String(next));
      // Limpia candado legacy para no bloquear la 2ª vez.
      localStorage.removeItem(SUBMIT_LOCK_LEGACY);
      sessionStorage.removeItem(SUBMIT_LOCK_LEGACY);
    } catch (_) {}
    try {
      document.cookie = `${SUBMIT_COUNT_KEY}=${next}; Max-Age=31536000; Path=/; SameSite=Lax`;
      document.cookie = `${SUBMIT_LOCK_LEGACY}=; Max-Age=0; Path=/; SameSite=Lax`;
    } catch (_) {}
    return next;
  }

  function blankAnswers() {
    return {
      clave: "",
      nps: null,
      motivo: null,
      motivoOtro: "",
      productosYaavs: [],
      visitaEjecutivo: null,
      ejecutivo: null,
      mesaUso: null,
      mesaMatrix: {},
      mesaMejoras: [],
      recargaMetodo: null,
      recargaUso: null,
      recargaExp: null,
      recargaMejora: null,
      popUso: null,
      popSat: null,
      popMejora: null,
      rentabilidad: null,
      distribuidores: "",
      competencia: "",
      mejoraGeneral: "",
      website: "",
    };
  }

  function newSubmissionId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }

  function normalizeClave(raw) {
    return String(raw || "")
      .trim()
      .replace(/\s+/g, "")
      .toUpperCase();
  }

  function isValidClave(raw) {
    return /^[A-Z0-9][A-Z0-9._-]{3,24}$/.test(normalizeClave(raw));
  }

  function resetAnswers() {
    Object.assign(state.answers, blankAnswers());
    state._lastError = null;
    state.submitting = false;
  }

  function confirmSecondAttempt() {
    return window.confirm(
      "¿Seguro que quieres contestar el cuestionario una segunda vez?\n\nSolo puedes hacerlo 2 veces. Úsalo si te equivocaste en la primera respuesta."
    );
  }

  const state = {
    stepId: "welcome",
    submitting: false,
    submittedOnce: false,
    submissionId: newSubmissionId(),
    navDir: 1,
    answers: blankAnswers(),
  };

  function hasOtherDistribuidor() {
    const v = String(state.answers.distribuidores || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return v.length > 0 && v !== "ninguno";
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
      { id: "motivo", kind: "choice", section: "Recomendación y experiencia" },
      { id: "productosYaavs", kind: "productos", section: "Productos" },
      { id: "visitaEjecutivo", kind: "choice", section: "Ejecutivo comercial" },
      { id: "ejecutivo", kind: "scale", section: "Ejecutivo comercial" },
      { id: "mesaUso", kind: "yesno", section: "Mesa de Control" },
    ];

    if (a.mesaUso === "Sí") {
      steps.push({ id: "mesaMatrix", kind: "matrix", section: "Mesa de Control" });
      if (mesaNeedsImprove()) {
        steps.push({ id: "mesaMejoras", kind: "checks", section: "Mesa de Control" });
      }
    }

    steps.push(
      { id: "recargaMetodo", kind: "choice", section: "RecargaKlic" },
      { id: "recargaUso", kind: "yesno", section: "RecargaKlic" }
    );
    if (a.recargaUso === "Sí") {
      steps.push({ id: "recargaExp", kind: "scale", section: "RecargaKlic" });
      if (typeof a.recargaExp === "number" && a.recargaExp <= 3) {
        steps.push({ id: "recargaMejora", kind: "choice", section: "RecargaKlic" });
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
      { id: "rentabilidad", kind: "scale", section: "Ganancias y fidelización" },
      { id: "distribuidores", kind: "distribuidores", section: "Ganancias y fidelización" }
    );
    if (hasOtherDistribuidor()) {
      steps.push({ id: "competencia", kind: "competencia", section: "Ganancias y fidelización" });
    }
    steps.push(
      { id: "mejoraGeneral", kind: "long", section: "Cierre" },
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
        return isValidClave(a.clave);
      case "nps":
        return typeof a.nps === "number";
      case "motivo":
        if (a.motivo === "Otro") return a.motivoOtro.trim().length > 0 && a.motivoOtro.length <= 300;
        return !!a.motivo;
      case "productosYaavs":
        return a.productosYaavs.length >= 1;
      case "visitaEjecutivo":
        return !!a.visitaEjecutivo;
      case "ejecutivo":
        return typeof a.ejecutivo === "number";
      case "mesaUso":
        return a.mesaUso === "Sí" || a.mesaUso === "No";
      case "mesaMatrix":
        return MATRIX_ROWS.every((r) => typeof a.mesaMatrix[r.key] === "number");
      case "mesaMejoras":
        return a.mesaMejoras.length >= 1 && a.mesaMejoras.length <= 2;
      case "recargaMetodo":
        return !!a.recargaMetodo;
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
      case "distribuidores":
        return a.distribuidores.trim().length > 0 && a.distribuidores.length <= 150;
      case "competencia":
        return a.competencia.trim().length > 0 && a.competencia.length <= 500;
      case "mejoraGeneral":
        return a.mejoraGeneral.length <= 700;
      default:
        return true;
    }
  }

  async function go(delta) {
    const steps = getVisibleSteps();
    const i = currentIndex();
    const next = steps[i + delta];
    if (!next) return;
    if (delta > 0 && !canContinue(state.stepId)) {
      showToast("Completa este paso para continuar");
      return;
    }
    state.navDir = delta >= 0 ? 1 : -1;
    if (delta > 0 && state.stepId === "clave") {
      const clave = normalizeClave(state.answers.clave);
      state.answers.clave = clave;
      try {
        const res = await fetch(`/api/clave-status?clave=${encodeURIComponent(clave)}`, { cache: "no-store" });
        const data = await res.json();
        if (data && data.recentWarning) {
          const ok = window.confirm(
            "Ya hay una respuesta reciente con esta clave. Si es una corrección o una respuesta nueva legítima, puedes continuar."
          );
          if (!ok) return;
        }
      } catch (_) {}
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
          canContinue(state.stepId) && !state.submitting ? "" : "disabled"
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
    if (window.matchMedia("(pointer: fine)").matches) {
      root.addEventListener("pointermove", (e) => {
        const r = root.getBoundingClientRect();
        root.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        root.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    }
  }

  function pulseSelected(btn) {
    btn.classList.remove("is-burst");
    void btn.offsetWidth;
    btn.classList.add("is-burst");
  }

  function refreshNext(root) {
    const btn = root.querySelector("[data-action='next'], [data-action='submit']");
    if (btn) btn.disabled = !canContinue(state.stepId);
  }

  function renderWelcome() {
    return el(`
      <section class="card welcome step">
        <div class="kicker"><span class="kicker-dot"></span> Encuesta de experiencia</div>
        <h1>En YAAVS queremos seguir ayudándote a hacer crecer tu <span class="accent">negocio</span></h1>
        <p class="lead">
          Responder esta encuesta te tomará menos de 3 minutos. Tu opinión nos permitirá mejorar
          la atención, nuestras herramientas y los beneficios que te ofrecemos.
        </p>
        <p class="lead" style="margin-top:0.55rem">Responde únicamente con base en tu experiencia reciente.</p>
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
        <p class="question-help">Sin espacios. Se convertirá a mayúsculas. Ejemplo: 23CL04682</p>
        <input class="field" id="clave" type="text" autocomplete="off" maxlength="25"
          placeholder="Ej. 23CL04682" value="${escapeAttr(state.answers.clave)}" />
        <input class="hp" name="website" id="website" tabindex="-1" autocomplete="off"
          style="position:absolute;left:-9999px;opacity:0;height:0;width:0" value="${escapeAttr(
            state.answers.website
          )}" aria-hidden="true" />
        ${actionsHtml()}
      </section>
    `);
    const input = root.querySelector("#clave");
    input.addEventListener("input", () => {
      state.answers.clave = normalizeClave(input.value);
      if (input.value !== state.answers.clave) input.value = state.answers.clave;
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
        <h2 class="question-title">En una escala de 0 a 10, ¿qué tan probable es que recomiendes YAAVS a otro negocio como el tuyo?</h2>
        <p class="question-help">0 — Nada probable · 10 — Totalmente probable</p>
        <div class="nps-grid">${buttons}</div>
        <div class="nps-labels"><span>0 — Nada probable</span><span>10 — Totalmente probable</span></div>
        ${actionsHtml()}
      </section>
    `);

    root.querySelectorAll("[data-nps]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers.nps = Number(btn.dataset.nps);
        root.querySelectorAll("[data-nps]").forEach((b) => b.classList.remove("is-selected", "is-burst"));
        btn.classList.add("is-selected");
        pulseSelected(btn);
        refreshNext(root);
      });
    });
    return root;
  }

  function renderMotivo() {
    const extra =
      state.answers.motivo === "Otro"
        ? `<textarea class="field" id="motivoOtro" maxlength="300" placeholder="Cuéntanos la razón…">${escapeHtml(
            state.answers.motivoOtro
          )}</textarea>
        <div class="char-count"><span id="motivoOtroCount">${state.answers.motivoOtro.length}</span>/300</div>`
        : "";
    const root = el(`
      <section class="card step">
        <span class="section-tag">Sección 1 · Motivo</span>
        <h2 class="question-title">¿Cuál es la principal razón de tu calificación?</h2>
        <p class="question-help">Obligatoria para promotores, pasivos y detractores.</p>
        ${renderChoiceOptionsHtml("motivo", MOTIVO_RAZONES)}
        ${extra}
        ${actionsHtml()}
      </section>
    `);
    bindChoice(root, "motivo", () => render());
    const ta = root.querySelector("#motivoOtro");
    if (ta) {
      ta.addEventListener("input", () => {
        state.answers.motivoOtro = ta.value;
        const count = root.querySelector("#motivoOtroCount");
        if (count) count.textContent = String(ta.value.length);
        refreshNext(root);
      });
      setTimeout(() => ta.focus(), 50);
    }
    return root;
  }

  function renderChoiceOptionsHtml(key, options) {
    return `<div class="choices">${options
      .map((o) => {
        const selected = state.answers[key] === o ? "is-selected" : "";
        return `<button type="button" class="choice ${selected}" data-val="${escapeAttr(o)}">
          <span class="mark"></span><span>${escapeHtml(o)}</span>
        </button>`;
      })
      .join("")}</div>`;
  }

  function bindChoice(root, key, onChange) {
    root.querySelectorAll("[data-val]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.answers[key] = btn.dataset.val;
        if (key === "motivo" && btn.dataset.val !== "Otro") state.answers.motivoOtro = "";
        if (onChange) onChange();
        else {
          root.querySelectorAll("[data-val]").forEach((b) => b.classList.remove("is-selected"));
          btn.classList.add("is-selected");
          pulseSelected(btn);
          refreshNext(root);
        }
      });
    });
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
        pulseSelected(btn);
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
        pulseSelected(btn);
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
        <h2 class="question-title">Pensando en tu atención más reciente, ¿cómo calificarías los siguientes aspectos de nuestra Mesa de Control?</h2>
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
        pulseSelected(btn);
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
          pulseSelected(btn);
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
        pulseSelected(btn);
        refreshNext(root);
      });
    });
    return root;
  }

  function renderProductChecks() {
    const options = PRODUCTOS_YAAVS.map((o) => {
      const selected = state.answers.productosYaavs.includes(o) ? "is-selected" : "";
      return `<button type="button" class="check ${selected}" data-val="${escapeAttr(o)}">
        <span class="mark"></span><span>${escapeHtml(o)}</span>
      </button>`;
    }).join("");

    const root = el(`
      <section class="card step">
        <span class="section-tag">Sección 1 · Productos y servicios</span>
        <h2 class="question-title">¿Qué productos y servicios comercializas de YAAVS actualmente?</h2>
        <p class="question-help">Selecciona todos los productos y servicios que comercializas actualmente.</p>
        <div class="choices">${options}</div>
        ${actionsHtml()}
      </section>
    `);

    root.querySelectorAll("[data-val]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const val = btn.dataset.val;
        const list = state.answers.productosYaavs;
        const i = list.indexOf(val);
        if (i >= 0) {
          list.splice(i, 1);
          btn.classList.remove("is-selected");
        } else {
          list.push(val);
          btn.classList.add("is-selected");
          pulseSelected(btn);
        }
        refreshNext(root);
      });
    });
    return root;
  }

  function renderDistribuidores() {
    const root = el(`
      <section class="card step">
        <span class="section-tag">Sección 6 · Ganancias y fidelización</span>
        <h2 class="question-title">Aparte de YAAVS, ¿con qué otro distribuidor de chips trabajas actualmente?</h2>
        <p class="question-help">Escribe el nombre del distribuidor. Si no trabajas con otro, escribe “Ninguno”.</p>
        <input class="field" id="distribuidores" type="text" autocomplete="off" maxlength="150"
          placeholder="Ej. Nombre del distribuidor o Ninguno" value="${escapeAttr(state.answers.distribuidores)}" />
        <div class="char-count"><span id="distCount">${state.answers.distribuidores.length}</span>/150</div>
        ${actionsHtml()}
      </section>
    `);
    const input = root.querySelector("#distribuidores");
    const count = root.querySelector("#distCount");
    input.addEventListener("input", () => {
      state.answers.distribuidores = input.value;
      count.textContent = String(input.value.length);
      if (!hasOtherDistribuidor()) state.answers.competencia = "";
      refreshNext(root);
    });
    setTimeout(() => input.focus(), 50);
    return root;
  }

  function renderCompetencia() {
    const root = el(`
      <section class="card step">
        <span class="section-tag">Sección 6 · Ganancias y fidelización</span>
        <h2 class="question-title">¿Qué consideras que ofrece la competencia que YAAVS no?</h2>
        <p class="question-help">Menciona productos, servicios, beneficios, promociones o condiciones comerciales. Máximo 500 caracteres.</p>
        <textarea class="field" id="competencia" maxlength="500" placeholder="Cuéntanos qué ves en otros distribuidores…">${escapeHtml(
          state.answers.competencia
        )}</textarea>
        <div class="char-count"><span id="competenciaCount">${state.answers.competencia.length}</span>/500</div>
        ${actionsHtml()}
      </section>
    `);
    const ta = root.querySelector("#competencia");
    const count = root.querySelector("#competenciaCount");
    ta.addEventListener("input", () => {
      state.answers.competencia = ta.value;
      count.textContent = String(ta.value.length);
      refreshNext(root);
    });
    setTimeout(() => ta.focus(), 50);
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

    const count = getSubmitCount();
    const canRetry = count < MAX_SUBMISSIONS;
    return el(`
      <section class="card success step">
        <div class="success-icon">✓</div>
        <h2 class="question-title">¡Gracias por compartir tu experiencia!</h2>
        <p class="lead">Tus respuestas ya quedaron registradas. En YAAVS las usamos para mejorar lo que más importa para tu negocio.</p>
        ${
          canRetry
            ? `<p class="lead" style="margin-top:0.75rem">Si te equivocaste, puedes contestar <strong>una segunda vez</strong>.</p>
        <div class="actions" style="justify-content:center">
          <button type="button" class="btn btn-ghost" data-action="second-attempt">Contestar una segunda vez</button>
        </div>`
            : `<p class="lead" style="margin-top:0.75rem">Ya usaste tus 2 intentos desde este dispositivo.</p>`
        }
      </section>
    `);
  }

  function renderAlreadySubmitted() {
    return el(`
      <section class="card success step">
        <div class="success-icon">✓</div>
        <h2 class="question-title">Ya respondiste esta encuesta</h2>
        <p class="lead">
          Gracias. Desde este navegador ya se enviaron las 2 respuestas permitidas
          y no se puede volver a contestar.
        </p>
      </section>
    `);
  }

  function visibleValue(v, { shown = true } = {}) {
    if (!shown) return "No aplica";
    if (v === null || v === undefined) return "Sin respuesta";
    if (Array.isArray(v)) return v.length ? v.join(" | ") : "Sin respuesta";
    const s = String(v).trim();
    return s === "" ? "Sin respuesta" : s;
  }

  function buildPayload() {
    const a = state.answers;
    const mesaSi = a.mesaUso === "Sí";
    const recargaSi = a.recargaUso === "Sí";
    const popSi = a.popUso === "Sí";
    const otherDist = hasOtherDistribuidor();
    const mesaNeeds = mesaSi && mesaNeedsImprove();
    const recargaNeeds = recargaSi && typeof a.recargaExp === "number" && a.recargaExp <= 3;
    const popNeeds = popSi && typeof a.popSat === "number" && a.popSat <= 3;
    const motivo = a.motivo === "Otro" ? `Otro: ${a.motivoOtro.trim()}` : a.motivo;

    return {
      timestamp: new Date().toISOString(),
      submissionId: state.submissionId,
      id: state.submissionId,
      clave: normalizeClave(a.clave),
      nps: a.nps,
      motivo: visibleValue(motivo),
      motivoOtro: a.motivo === "Otro" ? a.motivoOtro.trim() : "No aplica",
      productosYaavs: visibleValue(a.productosYaavs),
      visitaEjecutivo: visibleValue(a.visitaEjecutivo),
      ejecutivo: visibleValue(a.ejecutivo),
      mesaUso: visibleValue(a.mesaUso),
      mesa_contacto: visibleValue(a.mesaMatrix.contacto, { shown: mesaSi }),
      mesa_tiempo: visibleValue(a.mesaMatrix.tiempo, { shown: mesaSi }),
      mesa_primerContacto: visibleValue(a.mesaMatrix.primerContacto, { shown: mesaSi }),
      mesa_atencion: visibleValue(a.mesaMatrix.atencion, { shown: mesaSi }),
      mesaMejoras: visibleValue(a.mesaMejoras, { shown: mesaNeeds }),
      recargaMetodo: visibleValue(a.recargaMetodo),
      recargaUso: visibleValue(a.recargaUso),
      recargaExp: visibleValue(a.recargaExp, { shown: recargaSi }),
      recargaMejora: visibleValue(a.recargaMejora, { shown: recargaNeeds }),
      popUso: visibleValue(a.popUso),
      popSat: visibleValue(a.popSat, { shown: popSi }),
      popMejora: visibleValue(a.popMejora, { shown: popNeeds }),
      rentabilidad: visibleValue(a.rentabilidad),
      distribuidores: visibleValue(a.distribuidores),
      competencia: visibleValue(a.competencia, { shown: otherDist }),
      mejoraGeneral: a.mejoraGeneral.trim() || "Sin respuesta",
      website: a.website,
      sheetName: cfg.sheetName || "Respuestas NPS",
    };
  }

  function formatPayloadForSheet(payload) {
    return [
      `Clave: ${payload.clave}`,
      `NPS: ${payload.nps}`,
      `Motivo: ${payload.motivo}`,
      `Motivo otro: ${payload.motivoOtro}`,
      `Productos YAAVS: ${payload.productosYaavs}`,
      `Visita ejecutivo: ${payload.visitaEjecutivo}`,
      `Ejecutivo: ${payload.ejecutivo}`,
      `Mesa uso: ${payload.mesaUso}`,
      `Mesa contacto: ${payload.mesa_contacto}`,
      `Mesa tiempo: ${payload.mesa_tiempo}`,
      `Mesa primer contacto: ${payload.mesa_primerContacto}`,
      `Mesa atención: ${payload.mesa_atencion}`,
      `Mesa mejoras: ${payload.mesaMejoras}`,
      `Método recarga: ${payload.recargaMetodo}`,
      `RecargaKlic uso: ${payload.recargaUso}`,
      `RecargaKlic exp: ${payload.recargaExp}`,
      `RecargaKlic mejora: ${payload.recargaMejora}`,
      `POP uso: ${payload.popUso}`,
      `POP sat: ${payload.popSat}`,
      `POP mejora: ${payload.popMejora}`,
      `Ganancias: ${payload.rentabilidad}`,
      `Distribuidores: ${payload.distribuidores}`,
      `Competencia: ${payload.competencia}`,
      `Mejora general: ${payload.mejoraGeneral}`,
      `Submission ID: ${payload.submissionId}`,
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
    if (state.submitting || state.submittedOnce) return;
    if (!canContinue("mejoraGeneral")) return;
    const sentKey = `yaavs_nps_sent_${state.submissionId}`;
    try {
      if (sessionStorage.getItem(sentKey) === "1") {
        state.submittedOnce = true;
        state.stepId = "done";
        render();
        return;
      }
    } catch (_) {}

    state.submitting = true;
    render();

    const payload = buildPayload();
    const mode = String(cfg.mode || "").trim();
    const endpoint = String(cfg.endpoint || "").trim();

    try {
      const panelRes = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const errJson = await panelRes.json().catch(() => ({}));
      if (!panelRes.ok) {
        throw new Error(errJson.error || "No se pudo guardar en el panel de resultados");
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

      try {
        sessionStorage.setItem(sentKey, "1");
      } catch (_) {}
      markSubmitted();
      state.submittedOnce = true;
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
      case "productosYaavs":
        node = renderProductChecks();
        break;
      case "visitaEjecutivo":
        node = renderChoice({
          section: "Sección 2 · Ejecutivo comercial",
          title: "¿Con qué frecuencia te visita tu ejecutivo de ventas?",
          key: "visitaEjecutivo",
          options: VISITA_EJECUTIVO,
        });
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
      case "recargaMetodo":
        node = renderChoice({
          section: "Sección 4 · App RecargaKlic",
          title: "¿Cuál es el medio por el cual activas tus CHIPS?",
          help: "Selecciona el medio que utilizas principalmente para activar tus chips.",
          key: "recargaMetodo",
          options: RECARGA_METODOS,
        });
        break;
      case "recargaUso":
        node = renderYesNo({
          section: "Sección 4 · App RecargaKlic",
          title: "En los últimos 6 meses, ¿has utilizado la app RecargaKlic?",
          key: "recargaUso",
        });
        break;
      case "recargaExp":
        node = renderScale({
          section: "Sección 4 · App RecargaKlic",
          title: "¿Cómo calificarías tu experiencia general con la app RecargaKlic?",
          key: "recargaExp",
          options: SCALE_5,
        });
        break;
      case "recargaMejora":
        node = renderChoice({
          section: "Sección 4 · App RecargaKlic",
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
          title: "¿Qué tan satisfecho estás con el material POP que se ha colocado en tu negocio?",
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
          section: "Sección 6 · Ganancias y fidelización",
          title:
            "Considerando comisiones, incentivos y esfuerzo de venta, ¿qué tan atractiva es la rentabilidad que obtienes con YAAVS?",
          key: "rentabilidad",
          options: SCALE_GANANCIAS,
        });
        break;
      case "distribuidores":
        node = renderDistribuidores();
        break;
      case "competencia":
        node = renderCompetencia();
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
    if (state.navDir < 0) node.classList.add("is-back");
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
    const secondAttempt = node.querySelector("[data-action='second-attempt']");
    if (secondAttempt) {
      secondAttempt.addEventListener("click", () => {
        if (!canSubmitAgain()) {
          state.stepId = "already";
          render();
          return;
        }
        if (!confirmSecondAttempt()) return;
        resetAnswers();
        state.submissionId = newSubmissionId();
        state.submittedOnce = false;
        state.stepId = "welcome";
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
