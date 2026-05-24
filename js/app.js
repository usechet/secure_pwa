// SecureNote PWA - app.js
// Actividad 2: Validacion y saneamiento de formularios

"use strict";

// Escapa caracteres HTML para prevenir XSS al renderizar en el DOM
function sanitizeText(raw) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(raw)));
  return div.innerHTML;
}

// Patron permitido para el titulo
const TITLE_PATTERN = /^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñüÜ\s\-_.,:!?]+$/;

// Valida el titulo del formulario
function validateTitle(value) {
  if (!value.trim())              return "El título es obligatorio.";
  if (value.trim().length < 2)    return "El título debe tener al menos 2 caracteres.";
  if (value.length > 60)          return "El título no puede superar 60 caracteres.";
  if (!TITLE_PATTERN.test(value)) return "El título contiene caracteres no permitidos.";
  return "";
}

// Valida el contenido del formulario
function validateContent(value) {
  if (!value.trim())           return "El contenido es obligatorio.";
  if (value.trim().length < 3) return "El contenido debe tener al menos 3 caracteres.";
  if (value.length > 500)      return "El contenido no puede superar 500 caracteres.";
  return "";
}

// Referencias al DOM
const titleInput     = document.getElementById("note-title");
const contentInput   = document.getElementById("note-content");
const tagSelect      = document.getElementById("note-tag");
const titleError     = document.getElementById("title-error");
const contentError   = document.getElementById("content-error");
const titleCounter   = document.getElementById("title-counter");
const contentCounter = document.getElementById("content-counter");
const btnSave        = document.getElementById("btn-save");
const btnClear       = document.getElementById("btn-clear");
const btnClearAll    = document.getElementById("btn-clear-all");
const notesList      = document.getElementById("notes-list");
const emptyMsg       = document.getElementById("empty-msg");
const formFeedback   = document.getElementById("form-feedback");
const protocolLabel  = document.getElementById("protocol-label");
const httpsBadge     = document.getElementById("https-badge");

// Actualiza el contador de caracteres de un campo
function updateCounter(input, counterEl, max) {
  const len = input.value.length;
  counterEl.textContent = `${len} / ${max}`;
  counterEl.className = "char-counter";
  if (len >= max)            counterEl.classList.add("at-limit");
  else if (len >= max * 0.8) counterEl.classList.add("near-limit");
}

// Valida y actualiza contador al escribir en el titulo
titleInput.addEventListener("input", () => {
  updateCounter(titleInput, titleCounter, 60);
  showFieldError(titleInput, titleError, validateTitle(titleInput.value));
});

// Valida y actualiza contador al escribir en el contenido
contentInput.addEventListener("input", () => {
  updateCounter(contentInput, contentCounter, 500);
  showFieldError(contentInput, contentError, validateContent(contentInput.value));
});

// Muestra u oculta el mensaje de error de un campo
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

// Lista de notas en memoria
let notes = [];

// Carga las notas desde localStorage
function loadNotes() {
  try {
    const raw = localStorage.getItem("securenote_notes");
    notes = raw ? JSON.parse(raw) : [];
  } catch { notes = []; }
}

// Guarda las notas en localStorage
function saveNotes() {
  localStorage.setItem("securenote_notes", JSON.stringify(notes));
}

// Renderiza las notas en el DOM aplicando sanitizeText para prevenir XSS
function renderNotes() {
  notesList.querySelectorAll(".note-item").forEach(el => el.remove());

  if (notes.length === 0) {
    emptyMsg.style.display = "";
    return;
  }
  emptyMsg.style.display = "none";

  notes.slice().reverse().forEach(note => {
    const item = document.createElement("div");
    item.className = "note-item";
    item.setAttribute("role", "article");

    // sanitizeText() se aplica aqui al insertar en el DOM, no al guardar
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

// Guarda una nota nueva tras validar los campos
btnSave.addEventListener("click", () => {
  const titleErr   = validateTitle(titleInput.value);
  const contentErr = validateContent(contentInput.value);

  showFieldError(titleInput,   titleError,   titleErr);
  showFieldError(contentInput, contentError, contentErr);

  if (titleErr || contentErr) {
    showFeedback("Corrige los errores antes de guardar.", "err");
    return;
  }

  // Se guarda el texto plano; sanitizeText se aplica solo al renderizar
  const note = {
    id:      crypto.randomUUID(),
    title:   titleInput.value.trim(),
    content: contentInput.value.trim(),
    tag:     tagSelect.value,
    date:    new Date().toLocaleString("es-CO"),
  };

  notes.push(note);
  saveNotes();
  renderNotes();
  clearForm();
  showFeedback("✓ Nota guardada correctamente.", "ok");
});

// Elimina la nota cuyo id coincide con el boton pulsado
notesList.addEventListener("click", e => {
  const btn = e.target.closest(".btn-del");
  if (!btn) return;
  notes = notes.filter(n => n.id !== btn.dataset.id);
  saveNotes();
  renderNotes();
});

// Borra todas las notas tras confirmacion del usuario
btnClearAll.addEventListener("click", () => {
  if (!notes.length) return;
  if (!confirm("¿Borrar todas las notas? Esta acción no se puede deshacer.")) return;
  notes = [];
  saveNotes();
  renderNotes();
});

// Resetea todos los campos del formulario
function clearForm() {
  titleInput.value   = "";
  contentInput.value = "";
  tagSelect.value    = "general";
  titleInput.classList.remove("valid", "invalid");
  contentInput.classList.remove("valid", "invalid");
  titleError.textContent     = "";
  contentError.textContent   = "";
  titleCounter.textContent   = "0 / 60";
  contentCounter.textContent = "0 / 500";
  titleCounter.className     = "char-counter";
  contentCounter.className   = "char-counter";
}

btnClear.addEventListener("click", () => {
  clearForm();
  formFeedback.textContent = "";
  formFeedback.className   = "feedback";
});

// Muestra un mensaje de feedback temporal en el formulario
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

// Actividad 1 y 4: detecta si la app corre bajo HTTPS y actualiza el panel
function checkProtocol() {
  const chkHttps = document.getElementById("chk-https");
  if (location.protocol === "https:") {
    protocolLabel.textContent = "HTTPS";
    httpsBadge.classList.remove("insecure");
    markCheck(chkHttps, true, "Certificado SSL/TLS activo – conexión cifrada");
  } else {
    protocolLabel.textContent = "HTTP ⚠";
    httpsBadge.classList.add("insecure");
    markCheck(chkHttps, false, "Sin HTTPS – abre desde un servidor con SSL/TLS");
  }
}

// Actividad 1: registra el Service Worker para habilitar la PWA offline
// El SW solo funciona en HTTPS o localhost
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

// Actualiza el icono y detalle de un item en el panel de seguridad
function markCheck(liEl, ok, detail) {
  if (!liEl) return;
  const icon  = liEl.querySelector(".check-icon");
  const small = liEl.querySelector("small");
  icon.textContent = ok ? "✅" : "❌";
  if (detail) small.textContent = detail;
  liEl.classList.toggle("ok",   ok);
  liEl.classList.toggle("fail", !ok);
}

// Inicializacion
(function init() {
  loadNotes();
  renderNotes();
  checkProtocol();
  registerSW();
})();
