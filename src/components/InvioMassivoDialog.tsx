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
import type { RagazzoCompleto } from '@/hooks/useRagazzi';
import { buildEmailHtml } from '@/lib/comunicazioneEmailTemplate';
import { useInvioMassivoJob } from '@/hooks/useInvioMassivoJob';
import { InvioMassivoMonitorDialog } from '@/components/InvioMassivoMonitorDialog';

const CURRENT_YEAR = 2026;
const TURNI_OPTIONS = [
  '4^ Elementare', '5^ Elementare',
  '1^ Media', '2^ Media', '3^ Media',
  'Turno famiglie',
];

type Step = 'message' | 'preview' | 'filters';

interface WebhookOption { id: string; webhook_url: string; descrizione: string | null }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ragazzi: RagazzoCompleto[];
}

export function InvioMassivoDialog({ open, onOpenChange, ragazzi }: Props) {
  const { activeJob } = useInvioMassivoJob();
  const [showMonitor, setShowMonitor] = useState(false);

  const [step, setStep] = useState<Step>('message');
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  const [selectedTurni, setSelectedTurni] = useState<string[]>([]);
  const [filtroNumero, setFiltroNumero] = useState<'tutti' | 'con_numero' | 'senza_numero'>('tutti');
  const [webhooks, setWebhooks] = useState<WebhookOption[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState('');
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Se c'è un job attivo e l'utente apre il dialog, mostra direttamente il monitor
  useEffect(() => {
    if (open && activeJob) {
      setShowMonitor(true);
      onOpenChange(false);
    }
  }, [open, activeJob, onOpenChange]);

  useEffect(() => {
    if (step !== 'filters') return;
    setLoadingWebhooks(true);
    supabase.from('webhook_config').select('*').then(({ data }) => {
      setWebhooks((data as any[]) || []);
      setLoadingWebhooks(false);
    });
  }, [step]);

  useEffect(() => {
    if (!open) {
      setStep('message');
      setTitolo(''); setTesto(''); setCtaLabel(''); setCtaUrl('');
      setSelectedTurni([]); setFiltroNumero('tutti'); setSelectedWebhookId('');
      setDryRun(false); setSubmitting(false);
    }
  }, [open]);

  const filteredRagazzi = ragazzi.filter(r => {
    if (r.archiviato) return false;
    if (selectedTurni.length > 0) {
      const hasTurno = r.iscrizioni.some(i => i.anno === CURRENT_YEAR && selectedTurni.includes(i.turno));
      if (!hasTurno) return false;
    }
    if (filtroNumero === 'con_numero' && r.numero == null) return false;
    if (filtroNumero === 'senza_numero' && r.numero != null) return false;
    return true;
  });

  const toggleTurno = (t: string) => setSelectedTurni(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const ctaUrlTrim = ctaUrl.trim();
  const ctaLabelTrim = ctaLabel.trim();
  const ctaValidUrl = /^https?:\/\//i.test(ctaUrlTrim);
  const ctaPartial = (ctaLabelTrim.length > 0) !== (ctaUrlTrim.length > 0);
  const ctaInvalidUrl = ctaUrlTrim.length > 0 && !ctaValidUrl;
  const ctaOk = !ctaPartial && !ctaInvalidUrl;

  const previewHtml = buildEmailHtml(titolo, testo, 'Mario Rossi', ctaLabelTrim, ctaUrlTrim);

  const handleStart = async () => {
    if (!selectedWebhookId || filteredRagazzi.length === 0) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('invio-massivo-runner', {
        body: {
          action: 'start',
          titolo: titolo.trim(),
          testo,
          ctaLabel: ctaLabelTrim,
          ctaUrl: ctaUrlTrim,
          webhook_id: selectedWebhookId,
          ragazzi_ids: filteredRagazzi.map(r => r.id),
          filtri: { turni: selectedTurni, filtroNumero },
          dry_run: dryRun,
        },
      });
      if (error) {
        // Edge runtime returns body in error.context for non-2xx
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
      toast.success(dryRun ? 'Test (dry-run) avviato' : 'Invio avviato in background');
      onOpenChange(false);
      // banner appears automatically via realtime
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
    (step === 'filters' && !!selectedWebhookId && filteredRagazzi.length > 0);

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
                  <Input value={titolo} onChange={(e) => setTitolo(e.target.value)} placeholder="Es. Aggiornamento iscrizione 2026" maxLength={120} />
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
                      <Input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} placeholder="Es. Iscriviti ora" maxLength={40} />
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
                  Il nome del genitore verrà personalizzato per ogni destinatario.
                </p>
              </div>
            )}

            {step === 'filters' && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-1.5"><Filter className="h-4 w-4" /> Filtri destinatari</h3>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Turni (anno {CURRENT_YEAR})</p>
                    <div className="flex flex-wrap gap-2">
                      {TURNI_OPTIONS.map(turno => (
                        <label key={turno} className="flex items-center gap-1.5 text-sm cursor-pointer">
                          <Checkbox checked={selectedTurni.includes(turno)} onCheckedChange={() => toggleTurno(turno)} />
                          {turno}
                        </label>
                      ))}
                    </div>
                    {selectedTurni.length === 0 && <p className="text-xs text-muted-foreground italic">Nessun filtro = tutti i turni</p>}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium">Numero assegnato</p>
                    <Select value={filtroNumero} onValueChange={(v: any) => setFiltroNumero(v)}>
                      <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tutti">Tutti</SelectItem>
                        <SelectItem value="con_numero">Solo con numero</SelectItem>
                        <SelectItem value="senza_numero">Solo senza numero</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3 py-2">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-sm text-primary">
                      <span className="font-bold text-lg mr-1">{filteredRagazzi.length}</span>
                      ragazzi corrispondono ai filtri
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Webhook</h3>
                  {loadingWebhooks ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : webhooks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nessun webhook configurato</p>
                  ) : (
                    <Select value={selectedWebhookId} onValueChange={setSelectedWebhookId}>
                      <SelectTrigger><SelectValue placeholder="Seleziona un webhook..." /></SelectTrigger>
                      <SelectContent>
                        {webhooks.map(w => <SelectItem key={w.id} value={w.id}>{w.descrizione || w.webhook_url}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <Separator />

                <label className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 cursor-pointer">
                  <Checkbox checked={dryRun} onCheckedChange={(v) => setDryRun(!!v)} className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Modalità test (dry-run)
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Simula l'intero processo senza chiamare il webhook: nessuna email reale viene inviata. Utile per verificare destinatari, filtri e funzionamento. L'intervallo viene ridotto a 2s.
                    </p>
                  </div>
                </label>

                {filteredRagazzi.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Anteprima destinatari</h3>
                    <ScrollArea className="h-[180px] rounded-md border">
                      <div className="p-2 space-y-1">
                        {filteredRagazzi.map(r => {
                          const turno = r.iscrizioni.find(i => i.anno === CURRENT_YEAR)?.turno;
                          return (
                            <div key={r.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                              <span className="font-medium">{r.full_name}</span>
                              <div className="flex items-center gap-2">
                                {r.numero != null && <Badge variant="outline" className="text-xs">#{r.numero}</Badge>}
                                {turno && <Badge variant="secondary" className="text-xs">{turno}</Badge>}
                              </div>
                            </div>
                          );
                        })}
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
                  {dryRun ? `Avvia test (${filteredRagazzi.length})` : `Avvia invio (${filteredRagazzi.length})`}</>
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

// Default export removed in favor of named export above; keep both for backwards compat
export default InvioMassivoDialog;
