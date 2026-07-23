import type { IscrizioneFamiglia, PrezzoPartecipante, TipoPartecipante } from '@/hooks/useFamiglie';

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

/** Notti trascorse in campeggio = giorni - 1 (min 0). Usato come moltiplicatore per il calcolo tariffe famiglie. */
export function calcolaNotti(dataInizio?: string | null, dataFine?: string | null): number {
  const g = calcolaGiorni(dataInizio, dataFine);
  return g > 0 ? g - 1 : 0;
}

type IscrizioneCalc = Pick<
  IscrizioneFamiglia,
  | 'data_inizio' | 'data_fine'
  | 'num_adulti' | 'num_4_10_anni' | 'num_0_3_anni'
  | 'figlio_1_over10' | 'figlio_2_over10' | 'figlio_3_over10'
> & { num_figli_over10?: number | null };

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

  // Figli >10: nuova fonte di verità è num_figli_over10. Fallback ai 3 boolean per record legacy.
  const nFigliFromBool =
    (iscrizione.figlio_1_over10 ? 1 : 0) +
    (iscrizione.figlio_2_over10 ? 1 : 0) +
    (iscrizione.figlio_3_over10 ? 1 : 0);
  const nFigli = Math.max(0, iscrizione.num_figli_over10 ?? 0) || nFigliFromBool;

  if (nFigli >= 1) push('1° figlio >10 anni', 1, tariffa.figlio_1_over10);
  if (nFigli >= 2) push('2° figlio >10 anni', 1, tariffa.figlio_2_over10);
  if (nFigli >= 3) {
    const extra = nFigli - 2; // 3°, 4°, 5°… tutti tariffa 3°
    push(extra === 1 ? '3° figlio >10 anni' : `Figli >10 anni dal 3° (${extra})`, extra, tariffa.figlio_3_over10);
  }

  push('Bambini 4–10 anni', iscrizione.num_4_10_anni, tariffa.eta_4_10);
  if (iscrizione.num_0_3_anni > 0) push('Bambini 0–3 anni (gratis)', iscrizione.num_0_3_anni, tariffa.eta_0_3);

  const totale = righe.reduce((s, r) => s + r.subtotale, 0);
  return { giorni, totale, righe };
}

export function formatEuro(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

// ---------- Nuovo modello: esploso per singolo partecipante ----------

export interface RigaPartecipante {
  tipo: TipoPartecipante;
  indice: number;      // 1-based
  label: string;       // es. "Adulto 1", "2° figlio >10 anni"
  prezzoGiorno: number;
}

export interface RisultatoEsploso {
  giorni: number;
  righe: RigaPartecipante[];
  totale: number;
}

function labelPer(tipo: TipoPartecipante, indice: number): string {
  switch (tipo) {
    case 'adulto': return `Adulto ${indice}`;
    case 'figlio_over10': {
      const suff = indice === 1 ? '1°' : indice === 2 ? '2°' : indice === 3 ? '3°' : `${indice}°`;
      return `${suff} figlio >10 anni`;
    }
    case 'eta_4_10': return `Bambino 4–10 anni #${indice}`;
    case 'eta_0_3': return `Bambino 0–3 anni #${indice}`;
  }
}

function defaultPrezzo(tipo: TipoPartecipante, indice: number, tariffa: TariffaFamiglia | null | undefined): number {
  if (!tariffa) return 0;
  switch (tipo) {
    case 'adulto': return Number(tariffa.adulto) || 0;
    case 'figlio_over10':
      if (indice === 1) return Number(tariffa.figlio_1_over10) || 0;
      if (indice === 2) return Number(tariffa.figlio_2_over10) || 0;
      return Number(tariffa.figlio_3_over10) || 0;
    case 'eta_4_10': return Number(tariffa.eta_4_10) || 0;
    case 'eta_0_3': return Number(tariffa.eta_0_3) || 0;
  }
}

type EspIscrizione = Pick<
  IscrizioneFamiglia,
  'data_inizio' | 'data_fine' | 'num_adulti' | 'num_4_10_anni' | 'num_0_3_anni'
  | 'figlio_1_over10' | 'figlio_2_over10' | 'figlio_3_over10'
> & { num_figli_over10?: number | null };

/**
 * Costruisce le righe (una per partecipante) usando i prezzi salvati quando esistono,
 * altrimenti i prezzi di default dalla tariffa "categoria 1" (o la prima disponibile).
 */
export function buildRigheEsploso(
  iscrizione: EspIscrizione,
  tariffeDefault: TariffaFamiglia[] | null | undefined,
  prezziSalvati: PrezzoPartecipante[] | null | undefined,
): RigaPartecipante[] {
  const nFigliBool =
    (iscrizione.figlio_1_over10 ? 1 : 0) +
    (iscrizione.figlio_2_over10 ? 1 : 0) +
    (iscrizione.figlio_3_over10 ? 1 : 0);
  const nFigli = Math.max(0, iscrizione.num_figli_over10 ?? 0) || nFigliBool;

  const tariffaDef = (tariffeDefault && tariffeDefault.length > 0)
    ? (tariffeDefault.find(t => t.categoria === 1) ?? tariffeDefault[0])
    : null;

  const saved = new Map<string, number>();
  (prezziSalvati ?? []).forEach(p => {
    saved.set(`${p.tipo}|${p.indice}`, Number(p.prezzo_giorno) || 0);
  });

  const righe: RigaPartecipante[] = [];
  const pushGroup = (tipo: TipoPartecipante, count: number) => {
    for (let i = 1; i <= count; i++) {
      const key = `${tipo}|${i}`;
      const prezzo = saved.has(key) ? (saved.get(key) as number) : defaultPrezzo(tipo, i, tariffaDef);
      righe.push({ tipo, indice: i, label: labelPer(tipo, i), prezzoGiorno: prezzo });
    }
  };

  pushGroup('adulto', Math.max(0, iscrizione.num_adulti));
  pushGroup('figlio_over10', nFigli);
  pushGroup('eta_4_10', Math.max(0, iscrizione.num_4_10_anni));
  pushGroup('eta_0_3', Math.max(0, iscrizione.num_0_3_anni));

  return righe;
}

export function calcolaTotaleEsploso(righe: RigaPartecipante[], giorni: number): number {
  if (giorni <= 0) return 0;
  return righe.reduce((s, r) => s + (Number(r.prezzoGiorno) || 0) * giorni, 0);
}

export function righeToPrezziPartecipanti(righe: RigaPartecipante[]): PrezzoPartecipante[] {
  return righe.map(r => ({ tipo: r.tipo, indice: r.indice, prezzo_giorno: Number(r.prezzoGiorno) || 0 }));
}
