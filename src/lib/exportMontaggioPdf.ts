import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GIORNI_MONTAGGIO, formatEuro } from './tariffeMontaggio';
import type { IscrizioneMontaggio } from '@/hooks/useIscrizioniMontaggio';

const AMBER = [245, 158, 11] as [number, number, number];
const ORANGE = [234, 88, 12] as [number, number, number];
const DARK = [40, 40, 40] as [number, number, number];
const MUTED = [120, 120, 120] as [number, number, number];
const LIGHT = [255, 247, 237] as [number, number, number];

function totPersone(i: IscrizioneMontaggio) {
  return i.num_adulti + (i.num_figli_over10 ?? 0) + i.num_4_10_anni + i.num_0_3_anni;
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('CUPAV — Montaggio Campeggio 2026', 40, h - 20);
    doc.text(`Pagina ${i} di ${pageCount}`, w - 40, h - 20, { align: 'right' });
  }
}

export function exportMontaggioPdf(items: IscrizioneMontaggio[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  // Aggregati
  const sorted = [...items].sort((a, b) =>
    `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, 'it'),
  );
  const totIscr = sorted.length;
  const totAdulti = sorted.reduce((s, i) => s + i.num_adulti, 0);
  const totFigli10 = sorted.reduce((s, i) => s + (i.num_figli_over10 ?? 0), 0);
  const tot410 = sorted.reduce((s, i) => s + i.num_4_10_anni, 0);
  const tot03 = sorted.reduce((s, i) => s + i.num_0_3_anni, 0);
  const totPers = totAdulti + totFigli10 + tot410 + tot03;
  const totImporto = sorted.reduce((s, i) => s + (i.importo_totale_calcolato ?? 0), 0);

  // Per giorno: split per fascia
  const perGiorno: Record<string, { adulti: number; figli10: number; b410: number; b03: number; tot: number }> = {};
  for (const g of GIORNI_MONTAGGIO) perGiorno[g.value] = { adulti: 0, figli10: 0, b410: 0, b03: 0, tot: 0 };
  for (const it of sorted) {
    for (const g of it.giorni_selezionati ?? []) {
      if (!perGiorno[g]) continue;
      perGiorno[g].adulti += it.num_adulti;
      perGiorno[g].figli10 += it.num_figli_over10 ?? 0;
      perGiorno[g].b410 += it.num_4_10_anni;
      perGiorno[g].b03 += it.num_0_3_anni;
      perGiorno[g].tot += totPersone(it);
    }
  }

  // === PAGINA 1 — Riepilogo ===
  // Header arancione
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, pageW, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Montaggio Campeggio 2026', margin, 45);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Report generato il ${oggi}`, margin, 65);

  let y = 120;

  // 3 card riepilogo
  const cardW = (pageW - margin * 2 - 20) / 3;
  const cards = [
    { label: 'Iscrizioni', value: String(totIscr) },
    { label: 'Persone totali', value: String(totPers) },
    { label: 'Totale da versare', value: formatEuro(totImporto) },
  ];
  cards.forEach((c, idx) => {
    const x = margin + idx * (cardW + 10);
    doc.setFillColor(...LIGHT);
    doc.roundedRect(x, y, cardW, 70, 8, 8, 'F');
    doc.setTextColor(...ORANGE);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(c.value, x + cardW / 2, y + 35, { align: 'center' });
    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(c.label, x + cardW / 2, y + 55, { align: 'center' });
  });

  y += 100;

  // Grafico barre orizzontali — fasce d'età
  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Suddivisione per fascia d\'età', margin, y);
  y += 18;

  const fasce = [
    { label: 'Adulti', val: totAdulti },
    { label: 'Figli > 10 anni', val: totFigli10 },
    { label: 'Bambini 4–10 anni', val: tot410 },
    { label: 'Bambini 0–3 anni', val: tot03 },
  ];
  const maxFascia = Math.max(1, ...fasce.map(f => f.val));
  const barAreaX = margin + 110;
  const barAreaW = pageW - margin - barAreaX - 80;
  fasce.forEach((f, i) => {
    const by = y + i * 26;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(f.label, margin, by + 12);
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(barAreaX, by, barAreaW, 16, 3, 3, 'F');
    const w = (f.val / maxFascia) * barAreaW;
    doc.setFillColor(...AMBER);
    doc.roundedRect(barAreaX, by, Math.max(w, 1), 16, 3, 3, 'F');
    const pct = totPers > 0 ? Math.round((f.val / totPers) * 100) : 0;
    doc.setTextColor(...DARK);
    doc.text(`${f.val}  (${pct}%)`, barAreaX + barAreaW + 6, by + 12);
  });
  y += fasce.length * 26 + 20;

  // Grafico barre verticali — presenze per giornata
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Presenze per giornata', margin, y);
  y += 14;

  const chartTop = y + 10;
  const chartH = 130;
  const chartBottom = chartTop + chartH;
  const giorni = GIORNI_MONTAGGIO;
  const maxGiorno = Math.max(1, ...giorni.map(g => perGiorno[g.value].tot));
  const colW = (pageW - margin * 2) / giorni.length;
  // Asse base
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, chartBottom, pageW - margin, chartBottom);
  giorni.forEach((g, i) => {
    const v = perGiorno[g.value].tot;
    const bw = colW * 0.5;
    const bx = margin + i * colW + (colW - bw) / 2;
    const bh = (v / maxGiorno) * (chartH - 20);
    const by = chartBottom - bh;
    doc.setFillColor(...ORANGE);
    doc.roundedRect(bx, by, bw, bh, 3, 3, 'F');
    doc.setTextColor(...DARK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(String(v), bx + bw / 2, by - 4, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(g.short, margin + i * colW + colW / 2, chartBottom + 14, { align: 'center' });
  });

  // === PAGINA 2 — Dettaglio giornaliero ===
  doc.addPage();
  doc.setTextColor(...DARK);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Dettaglio giornaliero', margin, 50);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text('Suddivisione presenze per fascia d\'età in ogni giornata', margin, 66);

  autoTable(doc, {
    startY: 80,
    head: [['Giorno', 'Adulti', 'Figli > 10', '4–10 anni', '0–3 anni', 'Totale']],
    body: giorni.map(g => {
      const p = perGiorno[g.value];
      return [g.label, p.adulti, p.figli10, p.b410, p.b03, { content: String(p.tot), styles: { fontStyle: 'bold' } }];
    }),
    foot: [[
      'TOTALE COMPLESSIVO',
      totAdulti,
      totFigli10,
      tot410,
      tot03,
      { content: String(totAdulti + totFigli10 + tot410 + tot03), styles: { fontStyle: 'bold' } },
    ]],
    headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: 'bold' },
    footStyles: { fillColor: LIGHT, textColor: DARK, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 140 },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
    },
    styles: { fontSize: 10, cellPadding: 8 },
    margin: { left: margin, right: margin },
  });

  // === PAGINE ELENCO ===
  doc.addPage();
  doc.setTextColor(...DARK);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Elenco iscritti', margin, 50);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MUTED);
  doc.text(`${totIscr} iscrizioni — ordinate per cognome`, margin, 66);

  autoTable(doc, {
    startY: 80,
    head: [['Cognome Nome', 'Residenza', 'Giorni', 'Ad.', '>10', '4–10', '0–3', 'Tot.', 'Notti', 'Importo']],
    body: sorted.map(it => [
      `${it.cognome} ${it.nome}`,
      it.residente_a,
      (it.giorni_selezionati ?? []).map(g => GIORNI_MONTAGGIO.find(x => x.value === g)?.short ?? g).join(', '),
      it.num_adulti,
      it.num_figli_over10 ?? 0,
      it.num_4_10_anni,
      it.num_0_3_anni,
      { content: String(totPersone(it)), styles: { fontStyle: 'bold' } },
      it.num_notti,
      { content: formatEuro(it.importo_totale_calcolato ?? 0), styles: { fontStyle: 'bold', halign: 'right' } },
    ]),
    foot: [[
      { content: 'TOTALI', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
      totAdulti,
      totFigli10,
      tot410,
      tot03,
      { content: String(totPers), styles: { fontStyle: 'bold' } },
      '',
      { content: formatEuro(totImporto), styles: { fontStyle: 'bold', halign: 'right' } },
    ]],
    headStyles: { fillColor: ORANGE, textColor: 255, fontStyle: 'bold', fontSize: 9 },
    footStyles: { fillColor: LIGHT, textColor: DARK, fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 5, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 70 },
      2: { cellWidth: 105 },
      3: { halign: 'center', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 28 },
      5: { halign: 'center', cellWidth: 32 },
      6: { halign: 'center', cellWidth: 28 },
      7: { halign: 'center', cellWidth: 30 },
      8: { halign: 'center', cellWidth: 32 },
      9: { halign: 'right', cellWidth: 60 },
    },
    margin: { left: margin, right: margin },
  });

  drawFooter(doc);

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`montaggio-campeggio-${dateStr}.pdf`);
}
