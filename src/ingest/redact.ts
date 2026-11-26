/**
 * Quita datos personales del texto de una notificación antes de guardarlo.
 * Conserva los números que usa el cálculo (tarifa, km, minutos).
 * No intenta detectar nombres: ese caso se cubre con el registro manual y consentido.
 */
export function redactNotificationText(raw: string): string {
  return raw
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[correo]')
    .replace(/(?:\+?57[\s.-]*)?(?:\(?\d{3}\)?[\s.-]*)\d{3}[\s.-]*\d{4}\b/g, '[teléfono]')
    .replace(/\b[A-Z]{3}\s?\d{2,3}\b|\b[A-Z]{2}\d{3}[A-Z]{2}\b/g, '[placa]')
    .replace(/\b\d{8,}\b/g, '[número]');
}
