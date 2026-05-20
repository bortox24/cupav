import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send, Square, Check, XCircle, Clock, Users, Filter, ArrowLeft, ArrowRight, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RagazzoCompleto } from '@/hooks/useRagazzi';
import { buildEmailHtml } from '@/lib/comunicazioneEmailTemplate';

const CURRENT_YEAR = 2026;
const TURNI_OPTIONS = [
  '4^ Elementare', '5^ Elementare',
  '1^ Media', '2^ Media', '3^ Media',
  'Turno famiglie',
];
const SEND_INTERVAL = 30;

type Step = 'message' | 'preview' | 'filters' | 'sending';
type SendStatus = 'pending' | 'sending' | 'sent' | 'error';

interface QueueItem {
  ragazzo: RagazzoCompleto;
  status: SendStatus;
  errorMsg?: string;
}

interface WebhookOption {
  id: string;
  webhook_url: string;
  descrizione: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ragazzi: RagazzoCompleto[];
}

export function InvioMassivoDialog({ open, onOpenChange, ragazzi }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('message');

  // Step 1 — message
  const [titolo, setTitolo] = useState('');
  const [testo, setTesto] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');

  // Step 3 — filters
  const [selectedTurni, setSelectedTurni] = useState<string[]>([]);
  const [filtroNumero, setFiltroNumero] = useState<'tutti' | 'con_numero' | 'senza_numero'>('tutti');
  const [webhooks, setWebhooks] = useState<WebhookOption[]>([]);
  const [selectedWebhookId, setSelectedWebhookId] = useState('');
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);

  // Step 4 — sending
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [, setCurrentIndex] = useState(0);
  const abortRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sentCount = queue.filter(q => q.status === 'sent').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const totalCount = queue.length;

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
      abortRef.current = true;
      if (countdownRef.current) clearInterval(countdownRef.current);
      setSending(false);
      setQueue([]);
      setCurrentIndex(0);
      setCountdown(0);
      setStep('message');
      setTitolo('');
      setTesto('');
      setCtaLabel('');
      setCtaUrl('');
      setSelectedTurni([]);
      setFiltroNumero('tutti');
      setSelectedWebhookId('');
    }
  }, [open]);

  const filteredRagazzi = ragazzi.filter(r => {
    if (r.archiviato) return false;
    if (selectedTurni.length > 0) {
      const hasTurno = r.iscrizioni.some(
        i => i.anno === CURRENT_YEAR && selectedTurni.includes(i.turno)
      );
      if (!hasTurno) return false;
    }
    if (filtroNumero === 'con_numero' && r.numero == null) return false;
    if (filtroNumero === 'senza_numero' && r.numero != null) return false;
    return true;
  });

  const toggleTurno = (turno: string) => {
    setSelectedTurni(prev =>
      prev.includes(turno) ? prev.filter(t => t !== turno) : [...prev, turno]
    );
  };

  const selectedWebhook = webhooks.find(w => w.id === selectedWebhookId);

  const ctaUrlTrim = ctaUrl.trim();
  const ctaLabelTrim = ctaLabel.trim();
  const ctaValidUrl = /^https?:\/\//i.test(ctaUrlTrim);
  const ctaPartial = (ctaLabelTrim.length > 0) !== (ctaUrlTrim.length > 0);
  const ctaInvalidUrl = ctaUrlTrim.length > 0 && !ctaValidUrl;
  const ctaOk = !ctaPartial && !ctaInvalidUrl;

  const previewHtml = buildEmailHtml(titolo, testo, 'Mario Rossi', ctaLabelTrim, ctaUrlTrim);

  const startSending = useCallback(async () => {
    if (!selectedWebhook || !user || !profile) return;

    const items: QueueItem[] = filteredRagazzi.map(r => ({
      ragazzo: r,
      status: 'pending' as SendStatus,
    }));
    setQueue(items);
    setSending(true);
    abortRef.current = false;
    setCurrentIndex(0);

    const webhookUrl = selectedWebhook.webhook_url;
    const webhookDesc = selectedWebhook.descrizione || 'webhook';

    for (let i = 0; i < items.length; i++) {
      if (abortRef.current) break;
      setCurrentIndex(i);
      setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'sending' } : q));

      const ragazzo = items[i].ragazzo;
      const genitoreNome = ragazzo.genitori?.[0]?.nome_cognome || 'Genitore';
      const htmlContent = buildEmailHtml(titolo, testo, genitoreNome);

      let successo = false;
      let errorMsg = '';
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titolo,
            testo,
            html: htmlContent,
            html_content: htmlContent,
            ragazzo_id: ragazzo.id,
            full_name: ragazzo.full_name,
            data_nascita: ragazzo.data_nascita,
            residente_altavilla: ragazzo.residente_altavilla,
            genitori: ragazzo.genitori,
            iscrizioni: ragazzo.iscrizioni,
            numero: ragazzo.numero,
          }),
        });
        successo = res.ok;
        if (!successo) errorMsg = `HTTP ${res.status}`;
      } catch (err: any) {
        errorMsg = err?.message || 'Errore di rete';
      }

      setQueue(prev => prev.map((q, idx) =>
        idx === i ? { ...q, status: successo ? 'sent' : 'error', errorMsg } : q
      ));

      const dettaglioTesto = testo.length > 150 ? `${testo.slice(0, 150)}…` : testo;
      await supabase.from('anagrafica_invio_logs' as any).insert({
        ragazzo_id: ragazzo.id,
        inviato_da: user.id,
        inviato_da_nome: profile.full_name || profile.email,
        successo,
        tipo: 'invio_massivo',
        dettaglio: `Webhook: ${webhookDesc} — Titolo: ${titolo} — ${dettaglioTesto}${errorMsg ? ` — ${errorMsg}` : ''}`,
      });

      if (i < items.length - 1 && !abortRef.current) {
        setCountdown(SEND_INTERVAL);
        await new Promise<void>(resolve => {
          let remaining = SEND_INTERVAL;
          countdownRef.current = setInterval(() => {
            remaining--;
            setCountdown(remaining);
            if (remaining <= 0 || abortRef.current) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              resolve();
            }
          }, 1000);
        });
      }
    }

    setSending(false);
    setCountdown(0);
    queryClient.invalidateQueries({ queryKey: ['ragazzi'] });
    if (!abortRef.current) {
      toast.success('Invio massivo completato!');
    } else {
      toast.info('Invio massivo interrotto');
    }
  }, [filteredRagazzi, selectedWebhook, user, profile, queryClient, titolo, testo]);

  const stopSending = () => {
    abortRef.current = true;
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const goNext = () => {
    if (step === 'message') setStep('preview');
    else if (step === 'preview') setStep('filters');
    else if (step === 'filters') {
      setStep('sending');
      startSending();
    }
  };

  const goBack = () => {
    if (step === 'preview') setStep('message');
    else if (step === 'filters') setStep('preview');
  };

  const stepLabels: Record<Step, string> = {
    message: '1. Messaggio',
    preview: '2. Anteprima',
    filters: '3. Destinatari',
    sending: '4. Invio',
  };

  const steps: Step[] = ['message', 'preview', 'filters', 'sending'];
  const currentStepIndex = steps.indexOf(step);

  const canGoNext =
    (step === 'message' && titolo.trim().length > 0 && testo.trim().length > 0) ||
    (step === 'preview') ||
    (step === 'filters' && selectedWebhookId && filteredRagazzi.length > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (sending) stopSending();
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Invio Massivo Comunicazioni
          </DialogTitle>
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

        <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
          {step === 'message' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Titolo</Label>
                <Input
                  value={titolo}
                  onChange={(e) => setTitolo(e.target.value)}
                  placeholder="Es. Aggiornamento iscrizione 2026"
                  maxLength={120}
                />
              </div>
              <div className="space-y-2">
                <Label>Testo della comunicazione</Label>
                <Textarea
                  value={testo}
                  onChange={(e) => setTesto(e.target.value)}
                  placeholder="Incolla qui il testo del messaggio…"
                  rows={12}
                  maxLength={5000}
                  className="resize-y min-h-[240px]"
                />
                <p className="text-xs text-muted-foreground">{testo.length}/5000 caratteri</p>
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
                <iframe
                  title="Anteprima email"
                  srcDoc={previewHtml}
                  className="w-full"
                  style={{ height: '55vh', border: 'none', background: '#f4f4f4' }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Il nome del genitore verrà personalizzato per ogni destinatario.
              </p>
            </div>
          )}

          {step === 'filters' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Filter className="h-4 w-4" /> Filtri destinatari
                </h3>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Turni (anno {CURRENT_YEAR})</p>
                  <div className="flex flex-wrap gap-2">
                    {TURNI_OPTIONS.map(turno => (
                      <label key={turno} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox
                          checked={selectedTurni.includes(turno)}
                          onCheckedChange={() => toggleTurno(turno)}
                        />
                        {turno}
                      </label>
                    ))}
                  </div>
                  {selectedTurni.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Nessun filtro = tutti i turni</p>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Numero assegnato</p>
                  <Select value={filtroNumero} onValueChange={(v: any) => setFiltroNumero(v)}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un webhook..." />
                    </SelectTrigger>
                    <SelectContent>
                      {webhooks.map(w => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.descrizione || w.webhook_url}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Separator />

              {filteredRagazzi.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Anteprima ({filteredRagazzi.length} ragazzi)</h3>
                  <ScrollArea className="h-[180px] rounded-md border">
                    <div className="p-2 space-y-1">
                      {filteredRagazzi.map(r => {
                        const turno = r.iscrizioni.find(i => i.anno === CURRENT_YEAR)?.turno;
                        return (
                          <div key={r.id} className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50">
                            <span className="font-medium">{r.full_name}</span>
                            <div className="flex items-center gap-2">
                              {r.numero != null && (
                                <Badge variant="outline" className="text-xs">#{r.numero}</Badge>
                              )}
                              {turno && (
                                <Badge variant="secondary" className="text-xs">{turno}</Badge>
                              )}
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

          {step === 'sending' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Inviato {sentCount + errorCount} / {totalCount}</span>
                  <span className="text-muted-foreground">{sentCount} riusciti, {errorCount} errori</span>
                </div>
                <Progress value={totalCount > 0 ? ((sentCount + errorCount) / totalCount) * 100 : 0} />
              </div>

              {sending && countdown > 0 && (
                <div className="flex items-center justify-center gap-2 rounded-lg bg-muted/50 py-3">
                  <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />
                  <span className="text-sm text-muted-foreground">
                    Prossimo invio tra <span className="font-bold text-foreground">{countdown}s</span>
                  </span>
                </div>
              )}

              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-2 space-y-1">
                  {queue.map((item) => (
                    <div
                      key={item.ragazzo.id}
                      className={`flex items-center justify-between text-sm py-1.5 px-2 rounded ${
                        item.status === 'sending' ? 'bg-primary/10' : ''
                      }`}
                    >
                      <span className={item.status === 'sending' ? 'font-semibold' : ''}>
                        {item.ragazzo.full_name}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.status === 'pending' && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Clock className="h-3 w-3" /> In attesa
                          </Badge>
                        )}
                        {item.status === 'sending' && (
                          <Badge className="text-xs gap-1 bg-primary">
                            <Loader2 className="h-3 w-3 animate-spin" /> In invio
                          </Badge>
                        )}
                        {item.status === 'sent' && (
                          <Badge className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-600">
                            <Check className="h-3 w-3" /> Inviato
                          </Badge>
                        )}
                        {item.status === 'error' && (
                          <Badge variant="destructive" className="text-xs gap-1">
                            <XCircle className="h-3 w-3" /> Errore
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex gap-2">
                {sending ? (
                  <Button variant="destructive" onClick={stopSending} className="w-full gap-2">
                    <Square className="h-4 w-4" /> Interrompi
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                    Chiudi
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {step !== 'sending' && (
          <>
            <Separator />
            <div className="flex justify-between gap-2 pt-1">
              <Button
                variant="outline"
                onClick={goBack}
                disabled={step === 'message'}
                className="gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" /> Indietro
              </Button>
              <Button
                onClick={goNext}
                disabled={!canGoNext}
                className="gap-1.5"
              >
                {step === 'filters' ? (
                  <>
                    <Send className="h-4 w-4" /> Avvia invio ({filteredRagazzi.length})
                  </>
                ) : (
                  <>
                    Avanti <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
