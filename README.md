# Encuesta integral de experiencia YAAVS

Formulario web tipo **Fillout** (una pregunta a la vez, animaciones, lógica condicional) conectado a **Google Sheets**.

## Arrancar en local

```bash
cd "/Users/LBARRADAS/Desktop/Formulario 3"
npm install
npm start
```

Abre http://localhost:3000

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

## Conectar Google Sheets

1. Crea un [Google Sheet](https://sheets.google.com) nuevo (ej. `Encuesta NPS YAAVS`).
2. **Extensiones → Apps Script**.
3. Borra el código por defecto y pega todo el contenido de `scripts/nps-apps-script.gs`.
4. Guarda el proyecto.
5. **Implementar → Nueva implementación → Tipo: Aplicación web**
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquiera**
6. Copia la URL que termina en `/exec`.
7. Pégala en `public/config.js`:

```js
window.YAAVS_NPS_CONFIG = {
  endpoint: "https://script.google.com/macros/s/XXXX/exec",
  sheetName: "Respuestas NPS",
};
```

8. Recarga el formulario y envía una prueba. Debe aparecer una fila en la hoja **Respuestas NPS**.

Si editas el Apps Script después, vuelve a **Implementar → Administrar implementaciones → Editar → Nueva versión**.

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
