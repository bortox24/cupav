import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { parseAllergie, type FestaCampeggio } from '@/hooks/useFestaCampeggio';
import { supabase } from '@/integrations/supabase/client';
import fallbackLogo from '@/assets/logo-cupav.png';

const FUCHSIA = [192, 38, 211] as [number, number, number];
const PURPLE = [147, 51, 234] as [number, number, number];
const DARK = [40, 40, 40] as [number, number, number];
const MUTED = [120, 120, 120] as [number, number, number];
const LIGHT = [253, 244, 255] as [number, number, number];

function totalPersone(i: FestaCampeggio) {
  return i.num_adulti + i.num_ragazzi + i.num_staff;
}

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

export async function exportFestaCampeggioPdf(items: FestaCampeggio[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;

  const sorted = [...items].sort((a, b) => `${a.cognome} ${a.nome}`.localeCompare(`${b.cognome} ${b.nome}`, 'it'));
  const totIscr = sorted.length;
  const totAdulti = sorted.reduce((s, i) => s + i.num_adulti, 0);
  const totRagazzi = sorted.reduce((s, i) => s + i.num_ragazzi, 0);
  const totStaff = sorted.reduce((s, i) => s + i.num_staff, 0);
  const totPers = totAdulti + totRagazzi + totStaff;
  const totContributo = sorted.reduce((s, i) => s + i.contributo, 0);
  const totIncassato = sorted.filter(i => i.pagato).reduce((s, i) => s + i.contributo, 0);
  const totDaIncassare = totContributo - totIncassato;
  const totPagati = sorted.filter(i => i.pagato).length;
  const totArrivati = sorted.filter(i => i.arrivato).length;
  const persArrivate = sorted.filter(i => i.arrivato).reduce((s, i) => s + totalPersone(i), 0);
  const allergieAgg = new Map<string, number>();
  sorted.forEach(i => parseAllergie(i.allergie).forEach(r => {
    const key = r.nome.trim();
    allergieAgg.set(key, (allergieAgg.get(key) || 0) + r.quantita);
  }));
  const totAllergici = [...allergieAgg.values()].reduce((s, v) => s + v, 0);

  const logo = await loadLogo();

  // Header
  doc.setFillColor(...FUCHSIA);
  doc.rect(0, 0, pageW, 90, 'F');
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', pageW - margin - 58, 16, 58, 58, undefined, 'FAST');
    } catch { /* ignore */ }
  }
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Festa Campeggio 2026', margin, 45);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const oggi = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Report generato il ${oggi}`, margin, 65);

  // KPI Cards
  let y = 120;
  const drawCards = (cards: { label: string; value: string }[], top: number) => {
    const cardW = (pageW - margin * 2 - 24) / 4;
    cards.forEach((c, idx) => {
      const x = margin + idx * (cardW + 8);
      doc.setFillColor(...LIGHT);
      doc.roundedRect(x, top, cardW, 70, 8, 8, 'F');
      doc.setTextColor(...PURPLE);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(c.value, x + cardW / 2, top + 32, { align: 'center' });
      doc.setTextColor(...MUTED);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(c.label, x + cardW / 2, top + 52, { align: 'center' });
    });
  };

  drawCards([
    { label: 'Persone previste', value: String(totPers) },
    { label: 'Persone arrivate', value: String(persArrivate) },
  ], y);

  y += 80;

  drawCards([
    { label: 'Totale previsto', value: `${totContributo}\u20AC` },
    { label: 'Totale incassato', value: `${totIncassato}\u20AC` },
    { label: 'Da incassare', value: `${totDaIncassare}\u20AC` },
  ], y);

  y += 100;



  // Fasce
  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Suddivisione partecipanti', margin, y);
  y += 18;
  const fasce = [
    { label: 'Adulti', val: totAdulti },
    { label: 'Ragazzi', val: totRagazzi },
    { label: 'Staff', val: totStaff },
  ];
  const maxFascia = Math.max(1, ...fasce.map(f => f.val));
  fasce.forEach((f, i) => {
    const by = y + i * 24;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(f.label, margin, by + 10);
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(margin + 90, by, 260, 16, 3, 3, 'F');
    const w = (f.val / maxFascia) * 260;
    doc.setFillColor(...FUCHSIA);
    if (w > 0) doc.roundedRect(margin + 90, by, Math.max(w, 1), 16, 3, 3, 'F');
    doc.setTextColor(...DARK);
    doc.text(`${f.val}`, margin + 360, by + 10);
  });

  y += fasce.length * 24 + 24;

  // Table
  doc.setTextColor(...DARK);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Elenco adesioni', margin, y);
  y += 22;

  autoTable(doc, {
    startY: y,
    head: [['Cognome Nome', 'Ad.', 'Rag.', 'Staff', 'Tot.', 'Previsto', 'Incassato', 'Stato']],
    body: sorted.map(i => [
      `${i.cognome} ${i.nome}`,
      i.num_adulti,
      i.num_ragazzi,
      i.num_staff,
      totalPersone(i),
      `${i.contributo}\u20AC`,
      i.pagato ? `${i.contributo}\u20AC` : '0\u20AC',
      i.pagato ? 'Pagato' : i.arrivato ? 'Arrivato' : 'Da arrivare',
    ]),
    foot: [[
      { content: 'TOTALI', styles: { halign: 'left', fontStyle: 'bold' } },
      { content: String(totAdulti), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(totRagazzi), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(totStaff), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: String(totPers), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: `${totContributo}\u20AC`, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: `${totIncassato}\u20AC`, styles: { halign: 'center', fontStyle: 'bold' } },
      { content: `Arriv. ${totArrivati} / Pag. ${totPagati}`, styles: { halign: 'center', fontStyle: 'bold' } },
    ]],
    headStyles: { fillColor: FUCHSIA, textColor: 255, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: LIGHT, textColor: DARK, fontStyle: 'bold', fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    columnStyles: {
      0: { cellWidth: 116, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 32 },
      3: { halign: 'center', cellWidth: 34 },
      4: { halign: 'center', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 52 },
      6: { halign: 'center', cellWidth: 54 },
      7: { halign: 'center', cellWidth: 67 },
    },

    margin: { left: margin, right: margin },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text('CUPAV — Festa Campeggio 2026', margin, h - 20);
    doc.text(`Pagina ${i} di ${pageCount}`, pageW - margin, h - 20, { align: 'right' });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`festa-campeggio-${dateStr}.pdf`);
}
