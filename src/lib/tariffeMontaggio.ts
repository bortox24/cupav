// Tariffe Montaggio Campeggio (fisse, non configurabili)
// Tariffa per NOTTE.
// Disponibili 4 giorni: sab 30/05, dom 31/05, lun 01/06, mar 02/06.
// num_notti = max(0, giorni_selezionati.length - 1)
// → chi seleziona solo il sabato paga 0€ (0 notti).

export type GiornoMontaggio = 'sab_30_05' | 'dom_31_05' | 'lun_01_06' | 'mar_02_06';

export const GIORNI_MONTAGGIO: { value: GiornoMontaggio; label: string; short: string }[] = [
  { value: 'sab_30_05', label: 'Sabato 30 maggio',   short: 'Sab 30/05' },
  { value: 'dom_31_05', label: 'Domenica 31 maggio', short: 'Dom 31/05' },
  { value: 'lun_01_06', label: 'Lunedì 1 giugno',    short: 'Lun 01/06' },
  { value: 'mar_02_06', label: 'Martedì 2 giugno',   short: 'Mar 02/06' },
];

export const TARIFFA_MONTAGGIO = {
  adulto: 20,
  figlio_1_over10: 15,
  figlio_2_over10: 13,
  figlio_3_over10: 10, // 3° e successivi
  eta_4_10: 10,
  eta_0_3: 0,
} as const;

export interface PartecipantiMontaggio {
  num_adulti: number;
  num_figli_over10: number;
  num_4_10_anni: number;
  num_0_3_anni: number;
}

export interface RigaCalcolo {
  voce: string;
  persone: number;
  prezzoNotte: number;
  notti: number;
  subtotale: number;
}

export interface CalcoloMontaggio {
  notti: number;
  righe: RigaCalcolo[];
  totalePerNotte: number;
  totale: number;
}

export function calcolaNotti(giorni: GiornoMontaggio[] | string[]): number {
  return Math.max(0, (giorni?.length ?? 0) - 1);
}

export function calcolaTotaleMontaggio(
  partecipanti: PartecipantiMontaggio,
  giorni: GiornoMontaggio[] | string[]
): CalcoloMontaggio {
  const notti = calcolaNotti(giorni);
  const righe: RigaCalcolo[] = [];
  const push = (voce: string, persone: number, prezzoNotte: number) => {
    if (persone > 0) righe.push({ voce, persone, prezzoNotte, notti, subtotale: persone * prezzoNotte * notti });
  };

  push('Adulti', partecipanti.num_adulti, TARIFFA_MONTAGGIO.adulto);

  const nFigli = Math.max(0, partecipanti.num_figli_over10 ?? 0);
  if (nFigli >= 1) push('1° figlio >10 anni', 1, TARIFFA_MONTAGGIO.figlio_1_over10);
  if (nFigli >= 2) push('2° figlio >10 anni', 1, TARIFFA_MONTAGGIO.figlio_2_over10);
  if (nFigli >= 3) {
    const extra = nFigli - 2;
    push(`Figli >10 anni dal 3° (${extra})`, extra, TARIFFA_MONTAGGIO.figlio_3_over10);
  }

  push('Bambini 4–10 anni', partecipanti.num_4_10_anni, TARIFFA_MONTAGGIO.eta_4_10);
  push('Bambini 0–3 anni (gratis)', partecipanti.num_0_3_anni, TARIFFA_MONTAGGIO.eta_0_3);

  const totalePerNotte = righe.reduce((s, r) => s + r.persone * r.prezzoNotte, 0);
  const totale = righe.reduce((s, r) => s + r.subtotale, 0);
  return { notti, righe, totalePerNotte, totale };
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}
