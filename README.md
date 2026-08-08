# Encuesta integral de experiencia YAAVS

Formulario web tipo **Fillout** (una pregunta a la vez, animaciones, lógica condicional) conectado a **Google Sheets**.

## Arrancar en local

```bash
cd "/Users/LBARRADAS/Desktop/Formulario 3"
npm install
npm start
```

Abre http://localhost:3000

**Panel de respuestas (una por una):** http://localhost:3000/panel

Sin endpoint configurado, las respuestas se guardan en `localStorage` (modo demo).

## Deploy en Hostinger (Node.js)

En **Revisa los ajustes de compilación**:

| Campo | Valor |
|---|---|
| Preajuste del marco | Otro |
| Rama | `main` (o `principal`) |
| Versión de Node | 22.x |
| Directorio raíz | `./` |
| Comando de instalación | `npm install` |
| Comando de compilación | *(vacío)* |
| Archivo / comando de inicio | `npm start` o `server.js` |

Luego pulsa **Implementar**.
El sitio quedará en tu dominio `.hostingersite.com`.

Formulario: `https://gray-manatee-704328.hostingersite.com/`  
Panel: `https://gray-manatee-704328.hostingersite.com/panel`

## Conectar Google Sheets

Ya está conectado. Las respuestas caen en:

https://docs.google.com/spreadsheets/d/1SH-Zc_67UMjNnp2JVrqyBxbGMoBre9Za_qb3FxpLUBM/edit

Config: `public/config.js` (`mode: "google-forms"`).

Cada envío también se guarda en el servidor para el **panel** (`/panel`), donde puedes revisar las respuestas una por una con Anterior / Siguiente.
## Qué incluye el formulario

- Clave YAAVSER
- NPS 0–10 + motivo condicional (detractor / pasivo / promotor)
- Atención del ejecutivo (1–5)
- Mesa de Control (sí/no → matriz → mejoras si hay notas ≤ 3)
- RecargaKlic (sí/no → experiencia → mejora si ≤ 3)
- Material POP (sí/no → satisfacción → mejora si ≤ 3)
- Rentabilidad, antigüedad y comentario final opcional
- Envío a Sheets + honeypot anti-bot

## Desplegar

La carpeta `public/` es estática: súbela a Hostinger, Netlify, Vercel o GitHub Pages.
