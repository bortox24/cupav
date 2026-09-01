import type { FormField, FormResponse } from '@/hooks/useForms';
import type { GenericRecipient, FilterGroup } from '@/components/InvioMassivoGenericDialog';

const norm = (s: string) => (s || '').toLowerCase();

/** Trova il campo email dello schema: prima per type, poi per nome/label */
export function findEmailField(schema: FormField[]): FormField | null {
  return (
    schema.find(f => f.type === 'email') ||
    schema.find(f => norm(f.name).includes('email') || norm(f.label).includes('email')) ||
    schema.find(f => norm(f.name).includes('mail') || norm(f.label).includes('mail')) ||
    null
  );
}

/** Campi che compongono il nome del destinatario (cognome + nome se presenti) */
export function findNameFields(schema: FormField[]): FormField[] {
  const match = (f: FormField, key: string) =>
    norm(f.name).includes(key) || norm(f.label).includes(key);
  const cognome = schema.filter(f => match(f, 'cognome'));
  const nome = schema.filter(f => match(f, 'nome') && !match(f, 'cognome'));
  return [...cognome, ...nome];
}

const isEmail = (v: unknown) => typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Normalizza un valore in etichette-tag */
const toTags = (v: unknown): string[] => {
  if (v === null || v === undefined || v === '') return [];
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean);
  if (typeof v === 'boolean') return [v ? 'Sì' : 'No'];
  return [String(v).trim()].filter(Boolean);
};

/** Campi del modulo utilizzabili come filtro (select, radio, checkbox) */
export function findFilterableFields(schema: FormField[]): FormField[] {
  return schema.filter(f => f.type === 'select' || f.type === 'radio' || f.type === 'checkbox');
}

/** Costruisce i gruppi di filtro dalle risposte effettive */
export function buildFormFilterGroups(
  schema: FormField[],
  responses: FormResponse[],
): FilterGroup[] {
  return findFilterableFields(schema).reduce<FilterGroup[]>((acc, f) => {
    const values = new Set<string>();
    responses.forEach(r => {
      const data = (r.data || {}) as Record<string, unknown>;
      toTags(data[f.name]).forEach(t => values.add(t));
    });
    if (f.type === 'checkbox') {
      ['Sì', 'No'].forEach(v => values.add(v));
    } else {
      (f.options || []).forEach(o => values.add(String(o).trim()));
    }
    const options = Array.from(values).filter(Boolean).sort((a, b) => a.localeCompare(b, 'it'));
    if (options.length === 0) return acc;
    acc.push({
      key: f.name,
      label: f.label,
      options: options.map(v => ({ value: v, label: v })),
    });
    return acc;
  }, []);
}

/** Costruisce i destinatari per l'invio massivo dalle risposte di un modulo */
export function buildFormRecipients(
  schema: FormField[],
  responses: FormResponse[],
): GenericRecipient[] {
  const emailField = findEmailField(schema);
  const nameFields = findNameFields(schema);
  const filterFields = findFilterableFields(schema);

  return responses.reduce<GenericRecipient[]>((acc, r) => {
    const data = (r.data || {}) as Record<string, unknown>;
    let email = emailField ? data[emailField.name] : undefined;
    if (!isEmail(email)) {
      email = Object.values(data).find(v => isEmail(v));
    }
    if (!isEmail(email)) return acc;

    const nameParts = nameFields
      .map(f => String(data[f.name] ?? '').trim())
      .filter(Boolean);
    const fullName = nameParts.join(' ') || String(email).trim();

    const tags: Record<string, string[]> = {};
    filterFields.forEach(f => {
      const t = f.type === 'checkbox' ? toTags(!!data[f.name]) : toTags(data[f.name]);
      tags[f.name] = t;
    });

    acc.push({
      id: r.id,
      full_name: fullName,
      badges: [{ label: String(email).trim(), variant: 'outline' }],
      tags,
    });
    return acc;
  }, []);
}

