import type { FormField, FormResponse } from '@/hooks/useForms';
import type { GenericRecipient } from '@/components/InvioMassivoGenericDialog';

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

/** Costruisce i destinatari per l'invio massivo dalle risposte di un modulo */
export function buildFormRecipients(
  schema: FormField[],
  responses: FormResponse[],
): GenericRecipient[] {
  const emailField = findEmailField(schema);
  const nameFields = findNameFields(schema);

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

    acc.push({
      id: r.id,
      full_name: fullName,
      badges: [{ label: String(email).trim(), variant: 'outline' }],
      tags: {},
    });
    return acc;
  }, []);
}
