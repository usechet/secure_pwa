# SecureNote PWA – Documentación del Taller

**Electiva I/II – PWA · UPTC · Escuela de Ingeniería de Sistemas**

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

---

## Actividad 1 – Certificados digitales (HTTPS / SSL-TLS)

**Archivo:** `index.html`, `sw.js`

La app detecta en tiempo real si está corriendo bajo HTTPS y lo refleja
en el panel de estado de seguridad.

### Cómo desplegarla con HTTPS

**Opción A – Netlify Drop (recomendada para el taller)**
1. Comprimir toda la carpeta `pwa-segura/` en un ZIP.
2. Ir a [netlify.com/drop](https://app.netlify.com/drop) y arrastrar el ZIP.
3. Netlify asigna automáticamente un dominio con certificado SSL/TLS gratuito (Let's Encrypt).

**Opción B – GitHub Pages**
1. Subir la carpeta a un repositorio público de GitHub.
2. Activar *Settings → Pages → Branch: main / root*.
3. El sitio queda en `https://<usuario>.github.io/<repo>/`.

**Opción C – Servidor local con certificado autofirmado**
```bash
# Instalar mkcert
mkcert -install
mkcert localhost

# Servir con Node (paquete serve)
npx serve -s . --ssl-cert localhost.pem --ssl-key localhost-key.pem
```

> ⚠️ El Service Worker **solo funciona en HTTPS o localhost**; esto es
> una medida de seguridad del navegador que obliga a usar SSL/TLS.

---

## Actividad 2 – Validación y saneamiento de formularios

**Archivo:** `js/app.js` (funciones `sanitizeText`, `validateTitle`, `validateContent`)

### Validación de campos

| Campo    | Reglas aplicadas                                      |
|----------|-------------------------------------------------------|
| Título   | Requerido · 2-60 caracteres · solo letras, números y `. , - _ : ! ?` |
| Contenido| Requerido · 3-500 caracteres                          |

- Los atributos HTML (`required`, `maxlength`, `pattern`) proveen una
  primera capa de validación nativa del navegador.
- JavaScript aplica una segunda capa con mensajes de error accesibles
  (`aria-live="polite"`) y marcado visual de campo válido/inválido.

### Saneamiento (sanitización) anti-XSS

```js
function sanitizeText(raw) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(raw)));
  return div.innerHTML;  // El navegador escapa < > " & etc.
}
```

Todos los datos del usuario pasan por `sanitizeText()` **antes** de:
- Guardarse en `localStorage`.
- Renderizarse en el DOM vía `innerHTML`.

**Prueba del saneamiento** – ingresa este texto en cualquier campo:
```
<script>alert('XSS')</script>
```
La nota se guardará y mostrará el texto literal, nunca ejecutará el script.

---

## Actividad 3 – Content Security Policy (CSP)

**Archivo:** `index.html` (meta `http-equiv="Content-Security-Policy"`)

```html
<meta http-equiv="Content-Security-Policy"
      content="
        default-src 'self';
        script-src  'self'
                    'sha256-l6q0N5EYKyorKz2AuPKXNFZ/m26d6vHUDJvwn3oN5Ws='
                    'strict-dynamic';
        style-src   'self' https://fonts.googleapis.com;
        font-src    'self' https://fonts.gstatic.com;
        img-src     'self' data:;
        connect-src 'self';
        object-src  'none';
        frame-ancestors 'none';
        base-uri    'self';
        form-action 'self';
        upgrade-insecure-requests;
      " />
```

### Explicación de cada directiva

| Directiva | Valor | Qué controla |
|-----------|-------|--------------|
| `default-src` | `'self'` | Valor por defecto: solo recursos del mismo origen |
| `script-src` | `'self'` + hash + `'strict-dynamic'` | Scripts propios; hash autoriza el inline exacto; strict-dynamic permite scripts cargados dinámicamente por scripts de confianza |
| `style-src` | `'self'` + Google Fonts | CSS propio + fuentes externas específicas |
| `font-src` | `'self'` + gstatic | Descarga de archivos de fuente |
| `img-src` | `'self' data:` | Imágenes propias y data URIs (íconos inline) |
| `connect-src` | `'self'` | Fetch, XHR, WebSocket solo al mismo origen |
| `object-src` | `'none'` | **Bloquea** `<object>`, `<embed>`, `<applet>` |
| `frame-ancestors` | `'none'` | Bloquea embeber la app en iframes (anti-clickjacking) |
| `base-uri` | `'self'` | Evita inyección de `<base href>` |
| `form-action` | `'self'` | Formularios solo envían datos al mismo origen |
| `upgrade-insecure-requests` | — | Convierte recursos HTTP en HTTPS automáticamente |

### Hash para scripts inline

El hash `sha256-l6q0N5EYKyorKz2AuPKXNFZ/m26d6vHUDJvwn3oN5Ws=` en
`script-src` es la huella SHA-256 del bloque `<script>` inline
(si existiera). Solo ese script exacto puede ejecutarse; cualquier
variación tendría un hash diferente y el navegador lo bloqueará.

**Cómo generar el hash de un inline script:**
```bash
echo -n 'console.log("hola");' | openssl dgst -sha256 -binary | base64
```

### Políticas basadas en esquemas/ubicación

- `upgrade-insecure-requests` aplica una política basada en **esquema**
  (`http:` → `https:`).
- `connect-src 'self'` aplica una política basada en **ubicación/origen**.

### strict-dynamic

`'strict-dynamic'` permite que scripts ya autorizados (por hash o nonce)
puedan cargar scripts adicionales sin necesidad de listarlos
individualmente, facilitando el uso de cargadores de módulos.

---

## Actividad 4 – HTTP Obligatorio (HTTPS forzado)

Se implementaron **tres mecanismos**:

### a) HSTS vía meta tag

```html
<meta http-equiv="Strict-Transport-Security"
      content="max-age=31536000; includeSubDomains; preload" />
```

- `max-age=31536000` → El navegador fuerza HTTPS durante 1 año.
- `includeSubDomains` → Aplica también a todos los subdominios.
- `preload` → Permite incluir el dominio en la lista precargada de HSTS de los navegadores.

### b) CSP `upgrade-insecure-requests`

La directiva CSP `upgrade-insecure-requests` hace que el navegador
convierta automáticamente cualquier recurso HTTP en HTTPS antes de
solicitarlo, sin necesidad de modificar el HTML.

### c) Cabecera del servidor (Nginx / Apache)

En producción, la cabecera HSTS se configura en el servidor web:

**Nginx:**
```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
```

**Apache (`.htaccess`):**
```apache
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

# Redirigir HTTP → HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

---

## Cabeceras de seguridad adicionales implementadas

| Cabecera | Valor | Protege contra |
|----------|-------|----------------|
| `X-Content-Type-Options` | `nosniff` | MIME sniffing attacks |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Filtración de URLs en el Referer |

---

## Cómo ejecutar localmente

```bash
# Opción 1: Python (más simple)
cd pwa-segura
python3 -m http.server 8080
# Abrir: http://localhost:8080
# (Service Worker solo activo en localhost o HTTPS)

# Opción 2: Node
npx serve .
```

---

## Capturas de pantalla sugeridas para el informe

1. **App en HTTPS** → panel verde "HTTPS" en el header + check ✅ en el panel de seguridad.
2. **Service Worker** → DevTools → Application → Service Workers → estado "activated and is running".
3. **CSP en acción** → DevTools → Console → intenta inyectar un script externo y ver el error CSP.
4. **Validación de formulario** → campo con error (borde rojo + mensaje).
5. **Sanitización XSS** → nota guardada con `<script>alert()</script>` mostrado como texto literal.
6. **HSTS** → DevTools → Network → cabecera `Strict-Transport-Security` en la respuesta del servidor.
