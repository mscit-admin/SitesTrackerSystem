// Minimal, correct CSV encode/parse (RFC-4180-ish): quotes fields containing
// comma/quote/newline, doubles embedded quotes. UTF-8 (Arabic) safe.

export function csvEscape(field: string): string {
  const s = field ?? "";
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: string[][]): string {
  // BOM so Excel opens UTF-8 (Arabic) correctly
  return "﻿" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n") + "\r\n";
}

export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const s = text.replace(/^﻿/, ""); // strip BOM
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      out.push(row); row = [];
    } else if (c === "\r") {
      // handle \r\n and lone \r
      if (s[i + 1] === "\n") i++;
      row.push(field); field = "";
      out.push(row); row = [];
    } else field += c;
  }
  // trailing field/row
  if (field !== "" || row.length) { row.push(field); out.push(row); }
  return out.filter((r) => r.length && !(r.length === 1 && r[0] === ""));
}
