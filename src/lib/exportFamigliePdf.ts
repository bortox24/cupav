import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { IscrizioneFamiglia } from '@/hooks/useFamiglie';
import {
  buildRigheEsploso,
  calcolaNotti,
  calcolaTotaleEsploso,
  formatEuro,
  type TariffaFamiglia,
} from './tariffeFamiglie';

const ORANGE = [234, 88, 12] as [number, number, number];
const DARK = [40, 40, 40] as [number, number, number];
const MUTED = [120, 120, 120] as [number, number, number];
const LIGHT = [255, 247, 237] as [number, number, number];

function nFigli(i: IscrizioneFamiglia): number {
  const fromBool =
    (i.figlio_1_over10 ? 1 : 0) +
    (i.figlio_2_over10 ? 1 : 0) +
    (i.figlio_3_over10 ? 1 : 0);
  return Math.max(0, i.num_figli_over10 ?? 0) || fromBool;
}

function totPersone(i: IscrizioneFamiglia): number {
  return i.num_adulti + nFigli(i) + i.num_4_10_anni + i.num_0_3_anni;
}

function fmtDate(d: string): string {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('CUPAV - Turno Famiglie 2026', 40, h - 20);
    doc.text(`Pagina ${i} di ${pageCount}`, w - 40, h - 20, { align: 'right' });
  }
}

export function exportFamigliePdf(
  items: IscrizioneFamiglia[],
  tariffeDefault: TariffaFamiglia[] | null | undefined,
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;

  const sorted = [...items].sort((a, b) =>
    `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, 'it'),
  );

  const totFamiglie = sorted.length;
  const totPers = sorted.reduce((s, i) => s + totPersone(i), 0);
  const totAnimali = sorted.reduce((s, i) => s + i.num_animali, 0);
  const totaleComplessivo = sorted.reduce((s, i) => {
    const notti = calcolaNotti(i.data_inizio, i.data_fine);
    const righe = buildRigheEsploso(i, tariffeDefault, i.prezzi_partecipanti);
    return s + (i.importo_totale_calcolato ?? calcolaTotaleEsploso(righe, notti));
  }, 0);

  // Header
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageW, 80, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setCharSpace(0);
  doc.text('Turno Famiglie - CUPAV 2026', margin, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Report generato il ${oggi}`, margin, 60);

  // Fascia riepilogo KPI
  let y = 95;
  const kpis: [string, string][] = [
    ['Famiglie', String(totFamiglie)],
    ['Persone', String(totPers)],
    ['Animali', String(totAnimali)],
    ['Totale da incassare', formatEuro(totaleComplessivo).replace(/\u00a0/g, ' ')],
  ];
  const boxGap = 8;
  const boxW = (pageW - margin * 2 - boxGap * 3) / 4;
  kpis.forEach(([label, value], i) => {
    const x = margin + i * (boxW + boxGap);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, boxW, 44, 6, 6, 'F');
    doc.setCharSpace(0);
    doc.setTextColor(...ORANGE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(i === 3 ? 11 : 14);
    doc.text(value, x + boxW / 2, y + 22, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label, x + boxW / 2, y + 35, { align: 'center' });
  });

  y += 60;

  sorted.forEach((it, idx) => {
    const notti = calcolaNotti(it.data_inizio, it.data_fine);
    const righe = buildRigheEsploso(it, tariffeDefault, it.prezzi_partecipanti);
    const totaleFam = it.importo_totale_calcolato ?? calcolaTotaleEsploso(righe, notti);

    // Stima altezza sezione (intestazione + tabella)
    const rowsCount = righe.length + 1; // + totale
    const estH = 70 + rowsCount * 18 + 30;
    if (y + estH > pageH - 40) {
      doc.addPage();
      y = 50;
    }

    // Intestazione famiglia
    doc.setFillColor(...LIGHT);
    doc.roundedRect(margin, y, pageW - margin * 2, 52, 6, 6, 'F');
    doc.setTextColor(...ORANGE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setCharSpace(0);
    doc.text(`${it.cognome} ${it.nome}`, margin + 12, y + 20);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setCharSpace(0);
    doc.text(
      `Residente a ${it.residente_a}  |  ${fmtDate(it.data_inizio)} - ${fmtDate(it.data_fine)}  |  ${notti} notti`,
      margin + 12,
      y + 36,
    );

    // Composizione (destra)
    const compParts: string[] = [
      `Adulti: ${it.num_adulti}`,
      `Figli >10: ${nFigli(it)}`,
      `4-10: ${it.num_4_10_anni}`,
      `0-3: ${it.num_0_3_anni}`,
    ];
    if (it.num_animali > 0) compParts.push(`Animali: ${it.num_animali}`);
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.setCharSpace(0);
    doc.text(compParts.join('  |  '), pageW - margin - 12, y + 20, { align: 'right' });

    y += 60;

    // Tabella partecipanti
    const body = righe.map(r => [
      r.label.replace(/–/g, '-'),
      { content: formatEuro(r.prezzoGiorno), styles: { halign: 'right' as const } },
      { content: String(notti), styles: { halign: 'center' as const } },
      { content: formatEuro((Number(r.prezzoGiorno) || 0) * notti), styles: { halign: 'right' as const, fontStyle: 'bold' as const } },
    ]);

    autoTable(doc, {
      startY: y,
      head: [['Partecipante', 'Quota/notte', 'Notti', 'Totale']],
      body,
      foot: [[
        { content: 'Totale famiglia', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: formatEuro(totaleFam), styles: { halign: 'right', fontStyle: 'bold' } },
      ]],
      headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: 'bold', fontSize: 9 },
      footStyles: { fillColor: LIGHT, textColor: DARK, fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 90, halign: 'right' },
        2: { cellWidth: 50, halign: 'center' },
        3: { cellWidth: 90, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });

    // @ts-expect-error – lastAutoTable esiste a runtime
    y = (doc.lastAutoTable?.finalY ?? y) + 18;

    if (idx < sorted.length - 1) {
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, y - 8, pageW - margin, y - 8);
    }
  });

  drawFooter(doc);

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`turno-famiglie-${dateStr}.pdf`);
}
