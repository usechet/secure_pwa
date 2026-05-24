"use strict";

 // 1.  SANITIZACIÓN – Prevención de XSS
function sanitizeText(raw) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(raw)));
  return div.innerHTML;
}

// 2.  VALIDACIÓN DE CAMPOS

const TITLE_PATTERN = /^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñüÜ\s\-_.,:!?]+$/;

function validateTitle(value) {
  if (!value.trim())              return "El título es obligatorio.";
  if (value.trim().length < 2)    return "El título debe tener al menos 2 caracteres.";
  if (value.length > 60)          return "El título no puede superar 60 caracteres.";
  if (!TITLE_PATTERN.test(value)) return "El título contiene caracteres no permitidos.";
  return "";
}

function validateContent(value) {
  if (!value.trim())           return "El contenido es obligatorio.";
  if (value.trim().length < 3) return "El contenido debe tener al menos 3 caracteres.";
  if (value.length > 500)      return "El contenido no puede superar 500 caracteres.";
  return "";
}

// 3.  REFERENCIAS AL DOM

const titleInput    = document.getElementById("note-title");
const contentInput  = document.getElementById("note-content");
const tagSelect     = document.getElementById("note-tag");
const titleError    = document.getElementById("title-error");
const contentError  = document.getElementById("content-error");
const titleCounter  = document.getElementById("title-counter");
const contentCounter= document.getElementById("content-counter");
const btnSave       = document.getElementById("btn-save");
const btnClear      = document.getElementById("btn-clear");
const btnClearAll   = document.getElementById("btn-clear-all");
const notesList     = document.getElementById("notes-list");
const emptyMsg      = document.getElementById("empty-msg");
const formFeedback  = document.getElementById("form-feedback");
const protocolLabel = document.getElementById("protocol-label");
const httpsBadge    = document.getElementById("https-badge");


// 4.  CONTADORES DE CARACTERES EN TIEMPO REAL
function updateCounter(input, counterEl, max) {
  const len = input.value.length;
  counterEl.textContent = `${len} / ${max}`;
  counterEl.className = "char-counter";
  if (len >= max)         counterEl.classList.add("at-limit");
  else if (len >= max * 0.8) counterEl.classList.add("near-limit");
}

titleInput.addEventListener("input", () => {
  updateCounter(titleInput, titleCounter, 60);
  const err = validateTitle(titleInput.value);
  showFieldError(titleInput, titleError, err);
});

contentInput.addEventListener("input", () => {
  updateCounter(contentInput, contentCounter, 500);
  const err = validateContent(contentInput.value);
  showFieldError(contentInput, contentError, err);
});

function showFieldError(input, errorEl, msg) {
  errorEl.textContent = msg;
  if (msg) {
    input.classList.add("invalid");
    input.classList.remove("valid");
  } else if (input.value.trim()) {
    input.classList.remove("invalid");
    input.classList.add("valid");
  }
}

// 5.  NOTAS – CRUD básico con localStorage
let notes = [];

function loadNotes() {
  try {
    const raw = localStorage.getItem("securenote_notes");
    notes = raw ? JSON.parse(raw) : [];
  } catch { notes = []; }
}

function saveNotes() {
  localStorage.setItem("securenote_notes", JSON.stringify(notes));
}

function renderNotes() {
  const items = notesList.querySelectorAll(".note-item");
  items.forEach(el => el.remove());

  if (notes.length === 0) {
    emptyMsg.style.display = "";
    return;
  }
  emptyMsg.style.display = "none";

  notes.slice().reverse().forEach(note => {
    const item = document.createElement("div");
    item.className = "note-item";
    item.setAttribute("role", "article");

    item.innerHTML = `
      <div class="note-body">
        <div class="note-header">
          <span class="note-title-text">${sanitizeText(note.title)}</span>
          <span class="note-tag tag-${sanitizeText(note.tag)}">${sanitizeText(note.tag)}</span>
        </div>
        <p class="note-content-text">${sanitizeText(note.content)}</p>
        <p class="note-date">${sanitizeText(note.date)}</p>
      </div>
      <button class="btn-del" data-id="${sanitizeText(note.id)}" aria-label="Eliminar nota ${sanitizeText(note.title)}">✕</button>
    `;
    notesList.appendChild(item);
  });
}


// 6.  GUARDAR NOTA
btnSave.addEventListener("click", () => {
  // (a) Validar
  const titleErr   = validateTitle(titleInput.value);
  const contentErr = validateContent(contentInput.value);

  showFieldError(titleInput,   titleError,   titleErr);
  showFieldError(contentInput, contentError, contentErr);

  if (titleErr || contentErr) {
    showFeedback("Corrige los errores antes de guardar.", "err");
    return;
  }

  // (b) Sanear antes de almacenar
  const safeTitle   = sanitizeText(titleInput.value.trim());
  const safeContent = sanitizeText(contentInput.value.trim());
  const safeTag     = sanitizeText(tagSelect.value);

  const note = {
    id:      crypto.randomUUID(),   // ID criptográficamente seguro
    title:   safeTitle,
    content: safeContent,
    tag:     safeTag,
    date:    new Date().toLocaleString("es-CO"),
  };

  notes.push(note);
  saveNotes();
  renderNotes();
  clearForm();
  showFeedback("✓ Nota guardada correctamente.", "ok");
});


// 7.  ELIMINAR NOTA

notesList.addEventListener("click", e => {
  const btn = e.target.closest(".btn-del");
  if (!btn) return;
  const id = btn.dataset.id;
  notes = notes.filter(n => n.id !== id);
  saveNotes();
  renderNotes();
});

// 8.  BORRAR TODO

btnClearAll.addEventListener("click", () => {
  if (!notes.length) return;
  if (!confirm("¿Borrar todas las notas? Esta acción no se puede deshacer.")) return;
  notes = [];
  saveNotes();
  renderNotes();
});


//9.  LIMPIAR FORMULARIO
function clearForm() {
  titleInput.value   = "";
  contentInput.value = "";
  tagSelect.value    = "general";
  titleInput.classList.remove("valid", "invalid");
  contentInput.classList.remove("valid", "invalid");
  titleError.textContent   = "";
  contentError.textContent = "";
  titleCounter.textContent   = "0 / 60";
  contentCounter.textContent = "0 / 500";
  titleCounter.className   = "char-counter";
  contentCounter.className = "char-counter";
}

btnClear.addEventListener("click", () => {
  clearForm();
  formFeedback.textContent = "";
  formFeedback.className   = "feedback";
});

// 10. FEEDBACK TEMPORAL
let feedbackTimer;
function showFeedback(msg, type) {
  formFeedback.textContent = msg;
  formFeedback.className   = `feedback ${type}`;
  clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    formFeedback.textContent = "";
    formFeedback.className   = "feedback";
  }, 3500);
}

function checkProtocol() {
  const chkHttps = document.getElementById("chk-https");
  if (location.protocol === "https:") {
    protocolLabel.textContent = "HTTPS";
    httpsBadge.classList.remove("insecure");
    markCheck(chkHttps, true,  "Certificado SSL/TLS activo – conexión cifrada");
  } else {
    protocolLabel.textContent = "HTTP ⚠";
    httpsBadge.classList.add("insecure");
    markCheck(chkHttps, false, "Sin HTTPS – abre desde un servidor con SSL/TLS");
  }
}

async function registerSW() {
  const chkSw = document.getElementById("chk-sw");
  if (!("serviceWorker" in navigator)) {
    markCheck(chkSw, false, "Service Workers no soportados en este navegador");
    return;
  }
  try {
    const reg = await navigator.serviceWorker.register("./sw.js");
    const state = reg.active ? "activo" : "instalando…";
    markCheck(chkSw, true, `Service Worker registrado (${state})`);
  } catch (err) {
    markCheck(chkSw, false, `Error al registrar SW: ${err.message}`);
  }
}

function markCheck(liEl, ok, detail) {
  if (!liEl) return;
  const icon   = liEl.querySelector(".check-icon");
  const small  = liEl.querySelector("small");
  icon.textContent  = ok ? "✅" : "❌";
  if (detail) small.textContent = detail;
  liEl.classList.toggle("ok",   ok);
  liEl.classList.toggle("fail", !ok);
}

(function init() {
  loadNotes();
  renderNotes();
  checkProtocol();
  registerSW();
})();
