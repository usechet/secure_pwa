# SecureNote PWA – Documentación del Taller

**Electiva III – PWA · UPTC · Escuela de Ingeniería de Sistemas**

---

## Descripción

**SecureNote** es una Progressive Web App sencilla que permite gestionar notas personales.  
Su propósito principal es demostrar la implementación de las cuatro actividades de seguridad del taller.

---

## Estructura del proyecto

```
pwa-segura/
├── index.html        ← App principal + cabeceras de seguridad
├── sw.js             ← Service Worker (caché offline + seguridad fetch)
├── manifest.json     ← Manifiesto PWA
├── css/
│   └── styles.css    ← Estilos (cargado desde 'self')
├── js/
│   └── app.js        ← Lógica: validación, sanitización, CRUD notas
└── icons/
    ├── icon-192.png
    └── icon-512.png
```
## Cómo ejecutar localmente

```bash
npx serve .
```
