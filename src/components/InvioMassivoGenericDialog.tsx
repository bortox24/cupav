import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send, Check, Users, Filter, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { buildEmailHtml } from '@/lib/comunicazioneEmailTemplate';
import { useInvioMassivoJob } from '@/hooks/useInvioMassivoJob';
import { InvioMassivoMonitorDialog } from '@/components/InvioMassivoMonitorDialog';

type Step = 'message' | 'preview' | 'filters';

export interface FilterGroup {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  /** single-select (Select with "Tutti"); otherwise multi checkbox */
  single?: boolean;
  allLabel?: string;
}

export interface GenericRecipient {
  id: string;
  full_name: string;
  badges?: { label: string; variant?: 'outline' | 'secondary' }[];
  /** valori per ogni gruppo di filtro, es. { ruoli: ['cuoco'], turni: ['1^ Media'] } */
  tags: Record<string, string[]>;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entityType: 'animatori' | 'montaggio' | 'festa';
  recipients: GenericRecipient[];
  filterGroups: FilterGroup[];
  recipientsLabel: string;
  /** mostra checkbox per selezionare/deselezionare singoli destinatari */
  allowIndividualSelection?: boolean;
}

export function InvioMassivoGenericDialog({
  open, onOpenChange, entityType, recipients, filterGroups, recipientsLabel,
  allowIndividualSelection = false,
}: Props) {
  const { activeJob } = useInvioMassivoJob();
  const [showMonitor, setShowMonitor] = useState(false);

  const [step, setStep] = useState<Step>('message');
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [excluded, setExcluded] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && activeJob) {
      setShowMonitor(true);
      onOpenChange(false);
    }
  }, [open, activeJob, onOpenChange]);

  useEffect(() => {
    if (!open) {
      setStep('message');
      setTitolo(''); setTesto(''); setCtaLabel(''); setCtaUrl('');
      setSelections({});
      setExcluded([]);
      setSubmitting(false);
    }
  }, [open]);

  const matched = recipients.filter(r => {
    for (const g of filterGroups) {
      const sel = selections[g.key] || [];
      if (sel.length === 0) continue;
      const tags = r.tags[g.key] || [];
      if (!tags.some(t => sel.includes(t))) return false;
    }
    return true;
  });

  const filtered = allowIndividualSelection
    ? matched.filter(r => !excluded.includes(r.id))
    : matched;

  const toggleRecipient = (id: string) =>
    setExcluded(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const selectAll = () => setExcluded(p => p.filter(id => !matched.some(m => m.id === id)));
  const deselectAll = () =>
    setExcluded(p => Array.from(new Set([...p, ...matched.map(m => m.id)])));


  const toggleValue = (key: string, value: string) =>
    setSelections(p => {
      const cur = p[key] || [];
      return { ...p, [key]: cur.includes(value) ? cur.filter(x => x !== value) : [...cur, value] };
    });

  const setSingle = (key: string, value: string) =>
    setSelections(p => ({ ...p, [key]: value === '__all__' ? [] : [value] }));

  const ctaUrlTrim = ctaUrl.trim();
  const ctaLabelTrim = ctaLabel.trim();
  const ctaValidUrl = /^https?:\/\//i.test(ctaUrlTrim);
  const ctaPartial = (ctaLabelTrim.length > 0) !== (ctaUrlTrim.length > 0);
  const ctaInvalidUrl = ctaUrlTrim.length > 0 && !ctaValidUrl;
  const ctaOk = !ctaPartial && !ctaInvalidUrl;

  const previewHtml = buildEmailHtml(titolo, testo, 'Mario Rossi', ctaLabelTrim, ctaUrlTrim);

  const handleStart = async () => {
    if (filtered.length === 0) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invio-massivo-runner', {
        body: {
          action: 'start',
          entity_type: entityType,
          titolo: titolo.trim(),
          testo,
          ctaLabel: ctaLabelTrim,
          ctaUrl: ctaUrlTrim,
          recipient_ids: filtered.map(r => r.id),
          filtri: selections,
        },
      });
      if (error) {
        const ctx = (error as any)?.context;
        let msg = error.message;
        try {
          const body = ctx && typeof ctx.json === 'function' ? await ctx.json() : null;
          if (body?.error) msg = body.error;
          if (body?.existing_job_id) {
            toast.info('Hai già un invio in corso');
            setShowMonitor(true);
            onOpenChange(false);
            return;
          }
        } catch {}
        toast.error(msg);
        return;
      }
      toast.success('Invio avviato in background');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || 'Errore');
    } finally {
      setSubmitting(false);
    }
  };

  const steps: Step[] = ['message', 'preview', 'filters'];
  const currentStepIndex = steps.indexOf(step);
  const stepLabels: Record<Step, string> = {
    message: '1. Messaggio', preview: '2. Anteprima', filters: '3. Destinatari',
  };

  const canGoNext =
    (step === 'message' && titolo.trim().length > 0 && testo.trim().length > 0 && ctaOk) ||
    (step === 'preview') ||
    (step === 'filters' && filtered.length > 0);

  const goNext = () => {
    if (step === 'message') setStep('preview');
    else if (step === 'preview') setStep('filters');
    else if (step === 'filters') handleStart();
  };
  const goBack = () => {
    if (step === 'preview') setStep('message');
    else if (step === 'filters') setStep('preview');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-none border-0 p-4 sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-3xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-lg sm:border sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" /> Invio Massivo Comunicazioni
            </DialogTitle>
            <DialogDescription>
              Le comunicazioni vengono inviate in background dal server. Puoi chiudere questa finestra e anche il browser: l'invio continua.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-1 mb-2">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center justify-center rounded-full h-7 w-7 text-xs font-bold shrink-0 ${
                  i < currentStepIndex ? 'bg-primary text-primary-foreground' :
                  i === currentStepIndex ? 'bg-primary text-primary-foreground ring-2 ring-primary/30' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`text-xs truncate hidden sm:inline ${i === currentStepIndex ? 'font-semibold' : 'text-muted-foreground'}`}>
                  {stepLabels[s].split('. ')[1]}
                </span>
                {i < steps.length - 1 && <div className={`h-px flex-1 ${i < currentStepIndex ? 'bg-primary' : 'bg-border'}`} />}
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-4">
            {step === 'message' && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Titolo</Label>
                  <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Aggiornamento 2026" maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label>Testo della comunicazione</Label>
                  <Textarea
                    value={testo}
                    onChange={(e) => setTesto(e.target.value)}
                    placeholder="Incolla qui il testo del messaggio…"
                    rows={12}
                    maxLength={5000}
                    className="resize-y min-h-[240px] select-text touch-auto overscroll-contain [-webkit-touch-callout:default] [-webkit-user-select:text] [user-select:text]"
                    onPointerDownCapture={(e) => e.stopPropagation()}
                    onTouchStartCapture={(e) => e.stopPropagation()}
                    onMouseDownCapture={(e) => e.stopPropagation()}
                  />
                  <p className="text-xs text-muted-foreground">{testo.length}/5000 caratteri</p>
                </div>

                <div className="space-y-3 rounded-lg border border-dashed p-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Pulsante a fine email (opzionale)</Label>
                    <p className="text-xs text-muted-foreground">
                      Aggiungi un pulsante cliccabile in fondo al messaggio. Compila entrambi i campi o lascia entrambi vuoti.
                    </p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Etichetta pulsante</Label>
                      <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Es. Conferma" maxLength={40} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Link pulsante</Label>
                      <Input type="url" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." />
                    </div>
                  </div>
                  {ctaPartial && <p className="text-xs text-destructive">Compila sia l'etichetta che il link, oppure lascia entrambi vuoti.</p>}
                  {ctaInvalidUrl && <p className="text-xs text-destructive">Il link deve iniziare con http:// o https://</p>}
                </div>

                <p className="text-xs text-muted-foreground italic">
                  Il testo verrà inserito automaticamente nel layout email CUPAV standard.
                </p>
              </div>
            )}

            {step === 'preview' && (
              <div className="space-y-2 py-2">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Anteprima Email</h3>
                </div>
                <div className="rounded-lg overflow-hidden border bg-white">
                  <iframe title="Anteprima email" srcDoc={previewHtml} className="w-full" style={{ height: '55vh', border: 'none', background: '#f4f4f4' }} />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Il nome del destinatario verrà personalizzato per ognuno.
                </p>
              </div>
            )}

            {step === 'filters' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5"><Filter className="h-4 w-4" /> Filtri destinatari</h3>

                  {filterGroups.map(g => (
                    <div key={g.key} className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">{g.label}</p>
                      {g.single ? (
                        <Select
                          value={(selections[g.key]?.[0]) ?? '__all__'}
                          onValueChange={(v) => setSingle(g.key, v)}
                        >
                          <SelectTrigger className="w-[260px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__all__">{g.allLabel || 'Tutti'}</SelectItem>
                            {g.options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {g.options.map(o => (
                              <label key={o.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                                <Checkbox checked={(selections[g.key] || []).includes(o.value)} onCheckedChange={() => toggleValue(g.key, o.value)} />
                                {o.label}
                              </label>
                            ))}
                          </div>
                          {(selections[g.key] || []).length === 0 && <p className="text-xs text-muted-foreground italic">Nessun filtro = tutti</p>}
                        </>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm text-primary">
                      <span className="font-bold text-lg mr-1">{filtered.length}</span>
                      {recipientsLabel} {allowIndividualSelection ? 'selezionati' : 'corrispondono ai filtri'}
                    </span>
                  </div>
                </div>

                <Separator />

                {matched.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">
                        {allowIndividualSelection ? 'Destinatari selezionati' : 'Anteprima destinatari'}
                      </h3>
                      {allowIndividualSelection && (
                        <div className="flex gap-1">
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>Seleziona tutti</Button>
                          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={deselectAll}>Deseleziona tutti</Button>
                        </div>
                      )}
                    </div>
                    <ScrollArea className="h-[180px] rounded-md border">
                      <div className="p-2 space-y-1">
                        {matched.map(r => (
                          <div key={r.id} className="flex items-center justify-between gap-2 text-sm py-1 px-2 rounded hover:bg-muted/50">
                            <div className="flex items-center gap-2 min-w-0">
                              {allowIndividualSelection && (
                                <Checkbox
                                  checked={!excluded.includes(r.id)}
                                  onCheckedChange={() => toggleRecipient(r.id)}
                                />
                              )}
                              <span className="font-medium truncate">{r.full_name}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {(r.badges || []).map((b, i) => (
                                <Badge key={i} variant={b.variant || 'secondary'} className="text-xs">{b.label}</Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />
          <div className="flex justify-between gap-2 pt-1">
            <Button variant="outline" onClick={goBack} disabled={step === 'message' || submitting} className="gap-1.5">
              <ArrowLeft className="h-4 w-4" /> Indietro
            </Button>
            <Button onClick={goNext} disabled={!canGoNext || submitting} className="gap-1.5">
              {step === 'filters' ? (
                <>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Avvia invio ({filtered.length})</>
              ) : (
                <>Avanti <ArrowRight className="h-4 w-4" /></>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {activeJob && (
        <InvioMassivoMonitorDialog
          open={showMonitor}
          onOpenChange={setShowMonitor}
          jobId={activeJob.id}
        />
      )}
    </>
  );
}

export default InvioMassivoGenericDialog;
