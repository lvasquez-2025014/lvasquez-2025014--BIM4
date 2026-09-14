/**
 * Utilidades de manejo de fechas blindadas contra desfases de zona horaria (UTC vs Local).
 */

/**
 * Convierte cualquier fecha (string YYYY-MM-DD, ISO o Date) en un objeto Date
 * fijado a las 12:00:00 (mediodía) en la hora local del usuario.
 * Esto evita al 100% que zonas horarias negativas (ej. Guatemala UTC-6)
 * resten un día al interpretar fechas que vienen en formato UTC o solo fecha.
 */
export function parseLocalDate(input: string | Date | undefined | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const str = String(input).trim();
  const datePart = str.includes('T') ? str.split('T')[0] : str;
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day, 12, 0, 0);
    }
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Devuelve la fecha local de hoy en formato YYYY-MM-DD compatible con <input type="date">.
 * NO usa .toISOString() para no adelantar al día siguiente durante la tarde/noche.
 */
export function getLocalTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convierte un Date o string a YYYY-MM-DD local para inputs de fecha.
 */
export function toLocalDateInputString(input: string | Date | undefined | null): string {
  if (!input) return getLocalTodayString();
  const d = parseLocalDate(input);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formato legible para tablas y listas en español sin desfase de día (ej: "07 sept 2026").
 */
export function formatDisplayDate(input: string | Date | undefined | null): string {
  if (!input) return '-';
  const d = parseLocalDate(input);
  return d.toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
}

/**
 * Comprueba si una fecha es futura (posterior al día de hoy en hora local).
 */
export function isFutureDate(input: string | Date | undefined | null): boolean {
  if (!input) return false;
  const inputStr = toLocalDateInputString(input);
  const todayStr = getLocalTodayString();
  return inputStr > todayStr;
}
