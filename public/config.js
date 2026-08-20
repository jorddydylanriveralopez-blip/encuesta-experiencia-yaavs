/**
 * Conexión a Google Sheets vía Google Forms (formResponse).
 * Las respuestas caen en la hoja vinculada automáticamente.
 */
window.YAAVS_NPS_CONFIG = {
  mode: "google-forms",
  // Formulario → hoja: Encuesta NPS YAAVS (Respuestas)
  formAction:
    "https://docs.google.com/forms/d/e/1FAIpQLScAq6WIN6N-5ZoF_B2YxmE6mjodCPpLfcz5ANC7y7m7ep1c4A/formResponse",
  entryId: "entry.63463373",
  sheetUrl:
    "https://docs.google.com/spreadsheets/d/1SH-Zc_67UMjNnp2JVrqyBxbGMoBre9Za_qb3FxpLUBM/edit",
  sheetName: "Form Responses 1",
  // Pruebas temporales: permitir varias respuestas con la misma clave/navegador.
  allowRetake: true,
};
