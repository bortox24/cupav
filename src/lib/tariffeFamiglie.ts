import type { IscrizioneFamiglia } from '@/hooks/useFamiglie';

export interface TariffaFamiglia {
  categoria: number;
  descrizione: string;
  adulto: number;
  figlio_1_over10: number;
  figlio_2_over10: number;
  figlio_3_over10: number;
  eta_4_10: number;
  eta_0_3: number;
  updated_at?: string;
  updated_by?: string | null;
}

export interface RigaCalcolo {
  voce: string;
  persone: number;
  prezzoGiorno: number;
  giorni: number;
  subtotale: number;
}

export interface RisultatoCalcolo {
  giorni: number;
  totale: number;
  righe: RigaCalcolo[];
}

export function calcolaGiorni(dataInizio?: string | null, dataFine?: string | null): number {
  if (!dataInizio || !dataFine) return 0;
  const a = new Date(dataInizio);
  const b = new Date(dataFine);
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return 0;
  const ms = b.getTime() - a.getTime();
  const days = Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? days : 0;
}

type IscrizioneCalc = Pick<
  IscrizioneFamiglia,
  | 'data_inizio' | 'data_fine'
  | 'num_adulti' | 'num_4_10_anni' | 'num_0_3_anni'
  | 'figlio_1_over10' | 'figlio_2_over10' | 'figlio_3_over10'
>;

export function calcolaTotaleFamiglia(
  iscrizione: IscrizioneCalc,
  tariffa: TariffaFamiglia | null | undefined,
): RisultatoCalcolo {
  const giorni = calcolaGiorni(iscrizione.data_inizio, iscrizione.data_fine);
  const righe: RigaCalcolo[] = [];

  if (!tariffa || giorni === 0) {
    return { giorni, totale: 0, righe };
  }

  const push = (voce: string, persone: number, prezzo: number) => {
    if (persone <= 0 || prezzo < 0) return;
    righe.push({ voce, persone, prezzoGiorno: prezzo, giorni, subtotale: persone * prezzo * giorni });
  };

  push('Adulti', iscrizione.num_adulti, tariffa.adulto);
  if (iscrizione.figlio_1_over10) push('1° figlio >10 anni', 1, tariffa.figlio_1_over10);
  if (iscrizione.figlio_2_over10) push('2° figlio >10 anni', 1, tariffa.figlio_2_over10);
  if (iscrizione.figlio_3_over10) push('3° figlio >10 anni', 1, tariffa.figlio_3_over10);
  push('Bambini 4–10 anni', iscrizione.num_4_10_anni, tariffa.eta_4_10);
  if (iscrizione.num_0_3_anni > 0) push('Bambini 0–3 anni (gratis)', iscrizione.num_0_3_anni, tariffa.eta_0_3);

  const totale = righe.reduce((s, r) => s + r.subtotale, 0);
  return { giorni, totale, righe };
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}
