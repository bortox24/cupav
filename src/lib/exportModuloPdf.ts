import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { FormField, FormResponse } from '@/hooks/useForms';
import { supabase } from '@/integrations/supabase/client';
import fallbackLogo from '@/assets/logo-cupav.png';

const PRIMARY: [number, number, number] = [21, 128, 61];
const DARK: [number, number, number] = [40, 40, 40];
const MUTED: [number, number, number] = [120, 120, 120];
const LIGHT: [number, number, number] = [240, 253, 244];

async function loadLogo(): Promise<string | null> {
  const candidates: string[] = [];
  try {
    const { data } = await supabase.storage.from('branding').list('', { search: 'logo' });
    if (data && data.length > 0) {
      candidates.push(supabase.storage.from('branding').getPublicUrl('logo.png').data.publicUrl);
    }
  } catch { /* ignore */ }
  candidates.push(fallbackLogo);

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch { /* try next */ }
  }
  return null;
}

function normalize(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Sì' : 'No';
  if (Array.isArray(value)) return value.map((v) => normalize(v)).filter(Boolean).join(', ');
  return String(value);
}

function cellValue(field: FormField, value: unknown): string {
  const str = normalize(value);
  if (!str) return '-';
  if (field.type === 'date') {
    const d = new Date(str);
    if (!isNaN(d.getTime())) return format(d, 'dd/MM/yyyy');
  }
  return str;
}

interface Distribution {
  label: string;
  total: number;
  entries: { value: string; count: number }[];
}

function buildDistributions(schema: FormField[], responses: FormResponse[]): Distribution[] {
  const out: Distribution[] = [];
  schema.forEach((field) => {
    if (!['select', 'radio', 'checkbox'].includes(field.type)) return;
    const map = new Map<string, number>();
    let total = 0;
    responses.forEach((r) => {
      const data = r.data as Record<string, unknown>;
      const raw = data[field.name];
      const value = normalize(raw);
      if (!value) return;
      map.set(value, (map.get(value) || 0) + 1);
      total++;
    });
    if (total > 0) {
      out.push({
        label: field.label,
        total,
        entries: [...map.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count),
      });
    }
  });
  return out;
}

export async function exportModuloRispostePdf(
  formName: string,
  slug: string,
  schema: FormField[],
  responses: FormResponse[],
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;

  const logo = await loadLogo();

  // Header
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pageW, 76, 'F');
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', pageW - margin - 50, 13, 50, 50, undefined, 'FAST');
    } catch { /* ignore */ }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(formName, margin, 34, { maxWidth: pageW - margin * 2 - 70 });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(
    `${responses.length} rispost${responses.length === 1 ? 'a' : 'e'}  ·  Generato il ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })}`,
    margin,
    56,
  );

  let y = 76 + 24;

  const distributions = buildDistributions(schema, responses);

  // Charts (horizontal bars)
  if (distributions.length > 0) {
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Grafici delle risposte', margin, y);
    y += 18;

    const chartW = pageW - margin * 2;
    const labelW = 150;
    const barMaxW = chartW - labelW - 70;

    distributions.forEach((dist) => {
      const blockH = 26 + dist.entries.length * 18 + 10;
      if (y + blockH > pageH - margin) {
        doc.addPage();
        y = margin;
      }

      doc.setFillColor(...LIGHT);
      doc.roundedRect(margin, y - 12, chartW, blockH, 6, 6, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...DARK);
      doc.text(dist.label, margin + 10, y + 2, { maxWidth: chartW - 100 });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.setFontSize(8);
      doc.text(`${dist.total} risposte`, margin + chartW - 10, y + 2, { align: 'right' });

      let by = y + 18;
      const max = Math.max(...dist.entries.map((e) => e.count));
      dist.entries.forEach((entry) => {
        doc.setFontSize(8);
        doc.setTextColor(...DARK);
        doc.text(entry.value.length > 34 ? `${entry.value.slice(0, 33)}…` : entry.value, margin + 10, by + 8, {
          maxWidth: labelW - 14,
        });

        const w = max > 0 ? Math.max(2, (entry.count / max) * barMaxW) : 2;
        doc.setFillColor(226, 232, 240);
        doc.roundedRect(margin + labelW, by, barMaxW, 11, 3, 3, 'F');
        doc.setFillColor(...PRIMARY);
        doc.roundedRect(margin + labelW, by, w, 11, 3, 3, 'F');

        doc.setTextColor(...MUTED);
        doc.text(
          `${entry.count} (${Math.round((entry.count / dist.total) * 100)}%)`,
          margin + labelW + barMaxW + 8,
          by + 8,
        );
        by += 18;
      });

      y += blockH + 12;
    });
  }

  // Responses table
  if (y + 80 > pageH - margin) {
    doc.addPage();
    y = margin;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text('Tutte le risposte', margin, y);
  y += 10;

  const head = [['#', 'Data', ...schema.map((f) => f.label)]];
  const body = responses.map((response, index) => {
    const data = response.data as Record<string, unknown>;
    return [
      String(index + 1),
      format(new Date(response.created_at), 'dd/MM/yy HH:mm', { locale: it }),
      ...schema.map((field) => cellValue(field, data[field.name])),
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: y + 8,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 3, overflow: 'linebreak', textColor: DARK, valign: 'middle' },
    headStyles: { fillColor: PRIMARY, textColor: [255, 255, 255], fontSize: 7.5, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 56 },
    },
    didDrawPage: () => {
      const page = doc.getNumberOfPages();
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...MUTED);
      doc.text(`CUPAV · ${formName} · pag. ${page}`, pageW - margin, pageH - 14, { align: 'right' });
    },
  });

  doc.save(`${slug}-risposte-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
