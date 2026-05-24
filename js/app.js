// SecureNote PWA - app.js
// Actividad 2: Validacion y saneamiento de formularios

"use strict";

// Espera a que el DOM este completamente cargado antes de ejecutar
document.addEventListener("DOMContentLoaded", function () {

  // Referencias al DOM
  var titleInput     = document.getElementById("note-title");
  var contentInput   = document.getElementById("note-content");
  var tagSelect      = document.getElementById("note-tag");
  var titleError     = document.getElementById("title-error");
  var contentError   = document.getElementById("content-error");
  var titleCounter   = document.getElementById("title-counter");
  var contentCounter = document.getElementById("content-counter");
  var btnSave        = document.getElementById("btn-save");
  var btnClear       = document.getElementById("btn-clear");
  var btnClearAll    = document.getElementById("btn-clear-all");
  var notesList      = document.getElementById("notes-list");
  var emptyMsg       = document.getElementById("empty-msg");
  var formFeedback   = document.getElementById("form-feedback");
  var protocolLabel  = document.getElementById("protocol-label");
  var httpsBadge     = document.getElementById("https-badge");

  // Lista de notas en memoria
  var notes = [];
  var feedbackTimer = null;

  // Patron de caracteres permitidos en el titulo
  var TITLE_PATTERN = /^[A-Za-z0-9ÁÉÍÓÚáéíóúÑñüÜ\s\-_.,:!?]+$/;

  // Escapa caracteres HTML para prevenir XSS al renderizar en el DOM
  function sanitizeText(raw) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(String(raw)));
    return div.innerHTML;
  }

  // Valida el titulo
  function validateTitle(value) {
    if (!value.trim())              return "El título es obligatorio.";
    if (value.trim().length < 2)    return "El título debe tener al menos 2 caracteres.";
    if (value.length > 60)          return "El título no puede superar 60 caracteres.";
    if (!TITLE_PATTERN.test(value)) return "El título contiene caracteres no permitidos.";
    return "";
  }

  // Valida el contenido
  function validateContent(value) {
    if (!value.trim())           return "El contenido es obligatorio.";
    if (value.trim().length < 3) return "El contenido debe tener al menos 3 caracteres.";
    if (value.length > 500)      return "El contenido no puede superar 500 caracteres.";
    return "";
  }

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

  // Actualiza el contador de caracteres
  function updateCounter(input, counterEl, max) {
    var len = input.value.length;
    counterEl.textContent = len + " / " + max;
    counterEl.className = "char-counter";
    if (len >= max)            counterEl.classList.add("at-limit");
    else if (len >= max * 0.8) counterEl.classList.add("near-limit");
  }

  // Muestra mensaje de feedback temporal
  function showFeedback(msg, type) {
    formFeedback.textContent = msg;
    formFeedback.className = "feedback " + type;
    clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(function () {
      formFeedback.textContent = "";
      formFeedback.className = "feedback";
    }, 3500);
  }

  // Carga las notas desde localStorage
  function loadNotes() {
    try {
      var raw = localStorage.getItem("securenote_notes");
      notes = raw ? JSON.parse(raw) : [];
    } catch (e) {
      notes = [];
    }
  }

  // Guarda las notas en localStorage
  function saveNotes() {
    try {
      localStorage.setItem("securenote_notes", JSON.stringify(notes));
    } catch (e) {
      showFeedback("Error al guardar: " + e.message, "err");
    }
  }

  // Renderiza las notas en el DOM aplicando sanitizeText para prevenir XSS
  function renderNotes() {
    notesList.querySelectorAll(".note-item").forEach(function (el) { el.remove(); });

    if (notes.length === 0) {
      emptyMsg.style.display = "";
      return;
    }
    emptyMsg.style.display = "none";

    notes.slice().reverse().forEach(function (note) {
      var item = document.createElement("div");
      item.className = "note-item";
      item.setAttribute("role", "article");

      // sanitizeText se aplica al insertar en el DOM, no al guardar
      item.innerHTML =
        '<div class="note-body">' +
          '<div class="note-header">' +
            '<span class="note-title-text">' + sanitizeText(note.title) + '</span>' +
            '<span class="note-tag tag-' + sanitizeText(note.tag) + '">' + sanitizeText(note.tag) + '</span>' +
          '</div>' +
          '<p class="note-content-text">' + sanitizeText(note.content) + '</p>' +
          '<p class="note-date">' + sanitizeText(note.date) + '</p>' +
        '</div>' +
        '<button class="btn-del" data-id="' + sanitizeText(note.id) + '" aria-label="Eliminar nota">✕</button>';

      notesList.appendChild(item);
    });
  }

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

  // Listener: validacion en tiempo real del titulo
  titleInput.addEventListener("input", function () {
    updateCounter(titleInput, titleCounter, 60);
    showFieldError(titleInput, titleError, validateTitle(titleInput.value));
  });

  // Listener: validacion en tiempo real del contenido
  contentInput.addEventListener("input", function () {
    updateCounter(contentInput, contentCounter, 500);
    showFieldError(contentInput, contentError, validateContent(contentInput.value));
  });

  // Listener: guardar nota
  btnSave.addEventListener("click", function () {
    var titleErr   = validateTitle(titleInput.value);
    var contentErr = validateContent(contentInput.value);

    showFieldError(titleInput,   titleError,   titleErr);
    showFieldError(contentInput, contentError, contentErr);

    if (titleErr || contentErr) {
      showFeedback("Corrige los errores antes de guardar.", "err");
      return;
    }

    // Texto plano al guardar; sanitizeText solo al renderizar
    var note = {
      id:      crypto.randomUUID(),
      title:   titleInput.value.trim(),
      content: contentInput.value.trim(),
      tag:     tagSelect.value,
      date:    new Date().toLocaleString("es-CO")
    };

    notes.push(note);
    saveNotes();
    renderNotes();
    clearForm();
    showFeedback("✓ Nota guardada correctamente.", "ok");
  });

  // Listener: eliminar nota individual
  notesList.addEventListener("click", function (e) {
    var btn = e.target.closest(".btn-del");
    if (!btn) return;
    notes = notes.filter(function (n) { return n.id !== btn.dataset.id; });
    saveNotes();
    renderNotes();
  });

  // Listener: borrar todas las notas
  btnClearAll.addEventListener("click", function () {
    if (!notes.length) return;
    if (!confirm("¿Borrar todas las notas? Esta acción no se puede deshacer.")) return;
    notes = [];
    saveNotes();
    renderNotes();
  });

  // Listener: limpiar formulario
  btnClear.addEventListener("click", function () {
    clearForm();
    formFeedback.textContent = "";
    formFeedback.className   = "feedback";
  });

  // Actualiza un item del panel de seguridad
  function markCheck(id, ok, detail) {
    var liEl = document.getElementById(id);
    if (!liEl) return;
    var icon  = liEl.querySelector(".check-icon");
    var small = liEl.querySelector("small");
    icon.textContent = ok ? "✅" : "❌";
    if (detail) small.textContent = detail;
    liEl.classList.toggle("ok",   ok);
    liEl.classList.toggle("fail", !ok);
  }

  // Actividad 1 y 4: detecta si la app corre bajo HTTPS
  function checkProtocol() {
    if (location.protocol === "https:") {
      protocolLabel.textContent = "HTTPS";
      httpsBadge.classList.remove("insecure");
      markCheck("chk-https", true, "Certificado SSL/TLS activo – conexión cifrada");
    } else {
      protocolLabel.textContent = "HTTP ⚠";
      httpsBadge.classList.add("insecure");
      markCheck("chk-https", false, "Sin HTTPS – abre desde un servidor con SSL/TLS");
    }
  }

  // Actividad 1: registra el Service Worker (solo funciona en HTTPS o localhost)
  function registerSW() {
    if (!("serviceWorker" in navigator)) {
      markCheck("chk-sw", false, "Service Workers no soportados en este navegador");
      return;
    }
    navigator.serviceWorker.register("./sw.js").then(function (reg) {
      var state = reg.active ? "activo" : "instalando…";
      markCheck("chk-sw", true, "Service Worker registrado (" + state + ")");
    }).catch(function (err) {
      markCheck("chk-sw", false, "Error al registrar SW: " + err.message);
    });
  }

  // Inicializacion
  loadNotes();
  renderNotes();
  checkProtocol();
  registerSW();

}); // fin DOMContentLoaded
