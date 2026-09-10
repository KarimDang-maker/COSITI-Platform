import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], fileName: string, sheetName = 'Données') {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  } catch (err) {
    console.error('Erreur lors de l\'export Excel:', err);
    // Fallback simple CSV si souci
    exportToCsv(data, fileName);
  }
}

export function exportToCsv(data: any[], fileName: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((obj) =>
    headers
      .map((header) => {
        const val = obj[header] === undefined || obj[header] === null ? '' : String(obj[header]);
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(';')
  );
  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
