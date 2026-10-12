/** 표를 CSV 파일로 내려받는다. 엑셀이 한글을 읽도록 BOM 을 붙인다. */
export function downloadCsv(filename: string, rows: (string | number | null)[][]) {
  const escape = (value: string | number | null) => {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const csv = rows.map((row) => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
