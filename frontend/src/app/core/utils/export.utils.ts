/**
 * Utilidades para exportación de datos (CSV / Excel) optimizadas para Microsoft Excel en Windows.
 * Resuelve:
 * 1. Codificación UTF-8 con BOM (\uFEFF) para evitar caracteres corruptos (ej. CategorÃ­a -> Categoría).
 * 2. Delimitador punto y coma (;) nativo de Windows en español (Guatemala / es-GT y Latinoamérica).
 * 3. Escapado seguro de comillas y caracteres especiales en celdas.
 * 4. Saltos de línea CRLF (\r\n) requeridos por el motor de Excel.
 * 5. Descarga mediante Blob con URLs temporales seguras.
 */

export interface ExportCsvOptions {
  filename: string;
  headers: string[];
  rows: (string | number | undefined | null)[][];
  delimiter?: string;
}

export function exportToCsv(options: ExportCsvOptions): void {
  const { filename, headers, rows, delimiter = ';' } = options;

  const escapeCell = (val: string | number | undefined | null): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map(escapeCell).join(delimiter);
  const dataLines = rows.map(r => r.map(escapeCell).join(delimiter));
  const csvBody = [headerLine, ...dataLines].join('\r\n');

  // \uFEFF es el Byte Order Mark (BOM) UTF-8 que le indica a Excel
  // que el archivo está codificado en UTF-8 y no en ANSI (Windows-1252).
  const blob = new Blob(['\uFEFF' + csvBody], {
    type: 'text/csv;charset=utf-8;'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
