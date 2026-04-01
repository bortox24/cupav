import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2, Send, Square, Check, XCircle, Clock, Users, Filter, ArrowLeft, ArrowRight, Wand2, Eye, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { RagazzoCompleto } from '@/hooks/useRagazzi';

const CURRENT_YEAR = new Date().getFullYear();
const TURNI_OPTIONS = [
  '4^ Elementare', '5^ Elementare',
  '1^ Media', '2^ Media', '3^ Media',
  'Turno famiglie',
];
const SEND_INTERVAL = 30;

type Step = 'message' | 'ai_generation' | 'filters' | 'sending';
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

const DYNAMIC_FIELDS = [
  { label: 'Nome Ragazzo', tag: '{{nome_ragazzo}}', example: 'Marco Rossi' },
  { label: 'Nome Breve', tag: '{{nome_ragazzo_breve}}', example: 'Marco' },
  { label: 'Nome Genitore', tag: '{{nome_genitore}}', example: 'Giuseppe Rossi' },
  { label: 'Turno', tag: '{{turno}}', example: '1^ Media' },
  { label: 'Numero', tag: '{{numero}}', example: '42' },
];

export function InvioMassivoDialog({ open, onOpenChange, ragazzi }: Props) {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Wizard
  const [step, setStep] = useState<Step>('message');

  // Step 1 — message
  const [userPrompt, setUserPrompt] = useState('');

  // Step 2 — AI generation
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [generating, setGenerating] = useState(false);
  const [modifications, setModifications] = useState('');

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
  const [currentIndex, setCurrentIndex] = useState(0);
  const abortRef = useRef(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sentCount = queue.filter(q => q.status === 'sent').length;
  const errorCount = queue.filter(q => q.status === 'error').length;
  const totalCount = queue.length;

  // Load webhooks when reaching step 3
  useEffect(() => {
    if (step !== 'filters') return;
    setLoadingWebhooks(true);
    supabase.from('webhook_config').select('*').then(({ data }) => {
      setWebhooks((data as any[]) || []);
      setLoadingWebhooks(false);
    });
  }, [step]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      abortRef.current = true;
      if (countdownRef.current) clearInterval(countdownRef.current);
      setSending(false);
      setQueue([]);
      setCurrentIndex(0);
      setCountdown(0);
      setStep('message');
      setUserPrompt('');
      setGeneratedHtml('');
      setModifications('');
      setSelectedTurni([]);
      setFiltroNumero('tutti');
      setSelectedWebhookId('');
    }
  }, [open]);

  // Filter logic
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

  // --- AI Generation ---
  const generateEmail = useCallback(async (isRegenerate = false) => {
    setGenerating(true);
    try {
      const body: any = {};
      if (isRegenerate && generatedHtml) {
        body.prompt = userPrompt;
        body.previousHtml = generatedHtml;
        body.modifications = modifications || 'Rigenera con le stesse indicazioni';
      } else {
        body.prompt = userPrompt;
      }

      const { data, error } = await supabase.functions.invoke('generate-email-html', { body });

      if (error) throw new Error(error.message || 'Errore generazione');
      if (data?.error) throw new Error(data.error);

      setGeneratedHtml(data.html);
      setModifications('');
      if (isRegenerate) toast.success('Email rigenerata');
    } catch (err: any) {
      toast.error(err?.message || 'Errore nella generazione');
    } finally {
      setGenerating(false);
    }
  }, [userPrompt, generatedHtml, modifications]);

  // --- Placeholder replacement ---
  const replaceePlaceholders = (html: string, ragazzo: RagazzoCompleto): string => {
    const nomeCompleto = ragazzo.full_name || '';
    const nomeBreve = nomeCompleto.split(' ')[0] || '';
    const nomeGenitore = ragazzo.genitori?.[0]?.nome_cognome || '';
    const turno = ragazzo.iscrizioni.find(i => i.anno === CURRENT_YEAR)?.turno || '';
    const numero = ragazzo.numero != null ? String(ragazzo.numero) : '';

    return html
      .replace(/\{\{nome_ragazzo\}\}/g, nomeCompleto)
      .replace(/\{\{nome_ragazzo_breve\}\}/g, nomeBreve)
      .replace(/\{\{nome_genitore\}\}/g, nomeGenitore)
      .replace(/\{\{turno\}\}/g, turno)
      .replace(/\{\{numero\}\}/g, numero);
  };

  // --- Sending ---
  const buildPayload = (ragazzo: RagazzoCompleto) => ({
    ragazzo_id: ragazzo.id,
    full_name: ragazzo.full_name,
    data_nascita: ragazzo.data_nascita,
    residente_altavilla: ragazzo.residente_altavilla,
    ha_allergie: ragazzo.ha_allergie,
    allergie_dettaglio: ragazzo.allergie_dettaglio,
    patologie_dettaglio: ragazzo.patologie_dettaglio,
    genitori: ragazzo.genitori,
    iscrizioni: ragazzo.iscrizioni,
    farmaco_1_nome: ragazzo.farmaco_1_nome,
    farmaco_1_posologia: ragazzo.farmaco_1_posologia,
    farmaco_2_nome: ragazzo.farmaco_2_nome,
    farmaco_2_posologia: ragazzo.farmaco_2_posologia,
    farmaco_3_nome: ragazzo.farmaco_3_nome,
    farmaco_3_posologia: ragazzo.farmaco_3_posologia,
    numero: ragazzo.numero,
    html_content: replaceePlaceholders(generatedHtml, ragazzo),
  });

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

      let successo = false;
      let errorMsg = '';
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload(items[i].ragazzo)),
        });
        successo = res.ok;
        if (!successo) errorMsg = `HTTP ${res.status}`;
      } catch (err: any) {
        errorMsg = err?.message || 'Errore di rete';
      }

      setQueue(prev => prev.map((q, idx) =>
        idx === i ? { ...q, status: successo ? 'sent' : 'error', errorMsg } : q
      ));

      await supabase.from('anagrafica_invio_logs' as any).insert({
        ragazzo_id: items[i].ragazzo.id,
        inviato_da: user.id,
        inviato_da_nome: profile.full_name || profile.email,
        successo,
        tipo: 'invio_massivo',
        dettaglio: `Webhook: ${webhookDesc}${errorMsg ? ` — ${errorMsg}` : ''}`,
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
  }, [filteredRagazzi, selectedWebhook, user, profile, queryClient, generatedHtml]);

  const stopSending = () => {
    abortRef.current = true;
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  // --- Navigation ---
  const goNext = () => {
    if (step === 'message') {
      setStep('ai_generation');
      if (!generatedHtml) generateEmail();
    } else if (step === 'ai_generation') {
      setStep('filters');
    } else if (step === 'filters') {
      setStep('sending');
      startSending();
    }
  };

  const goBack = () => {
    if (step === 'ai_generation') setStep('message');
    else if (step === 'filters') setStep('ai_generation');
  };

  const stepLabels: Record<Step, string> = {
    message: '1. Messaggio',
    ai_generation: '2. Genera Email',
    filters: '3. Destinatari',
    sending: '4. Invio',
  };

  const steps: Step[] = ['message', 'ai_generation', 'filters', 'sending'];
  const currentStepIndex = steps.indexOf(step);

  const canGoNext =
    (step === 'message' && userPrompt.trim().length > 10) ||
    (step === 'ai_generation' && generatedHtml && !generating) ||
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

        {/* Stepper */}
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
          {/* STEP 1: Message */}
          {step === 'message' && (() => {
            const dynamicFields = [
              { label: 'Nome Ragazzo', tag: '{{nome_ragazzo}}', example: 'Marco Rossi' },
              { label: 'Nome Breve', tag: '{{nome_ragazzo_breve}}', example: 'Marco' },
              { label: 'Nome Genitore', tag: '{{nome_genitore}}', example: 'Giuseppe Rossi' },
              { label: 'Turno', tag: '{{turno}}', example: '1^ Media' },
              { label: 'Numero', tag: '{{numero}}', example: '42' },
            ];

            const textareaRef = document.getElementById('invio-massivo-textarea') as HTMLTextAreaElement | null;

            const insertTag = (tag: string) => {
              const el = document.getElementById('invio-massivo-textarea') as HTMLTextAreaElement | null;
              if (!el) return;
              const start = el.selectionStart ?? userPrompt.length;
              const end = el.selectionEnd ?? start;
              const newValue = userPrompt.slice(0, start) + tag + userPrompt.slice(end);
              setUserPrompt(newValue);
              requestAnimationFrame(() => {
                el.focus();
                const pos = start + tag.length;
                el.setSelectionRange(pos, pos);
              });
            };

            return (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Descrivi il messaggio da inviare</h3>
                <p className="text-xs text-muted-foreground">
                  Scrivi cosa vuoi comunicare, eventuali dettagli da includere o escludere. L'AI genererà l'email HTML.
                </p>
                <Textarea
                  id="invio-massivo-textarea"
                  value={userPrompt}
                  onChange={e => setUserPrompt(e.target.value)}
                  placeholder="Es: Comunicare ai genitori che il campeggio inizia il 15 luglio, portare sacco a pelo e crema solare. Non menzionare i costi..."
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground italic">
                  Minimo 10 caratteri per procedere
                </p>
                <div className="rounded-lg bg-muted/50 border border-border p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground">📌 Campi dinamici — clicca per inserire nel messaggio</p>
                  <p className="text-xs text-muted-foreground">
                    Puoi menzionarli nel testo e l'AI li userà nell'email. Verranno sostituiti con i dati reali di ogni ragazzo.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {dynamicFields.map(f => (
                      <button
                        key={f.tag}
                        type="button"
                        onClick={() => insertTag(f.tag)}
                        className="flex flex-col items-start rounded-md border border-border bg-background px-3 py-1.5 text-left hover:bg-accent hover:border-primary/40 transition-colors cursor-pointer"
                      >
                        <span className="text-xs font-semibold text-foreground">{f.label}</span>
                        <span className="text-[10px] text-muted-foreground">es: {f.example}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* STEP 2: AI Generation */}
          {step === 'ai_generation' && (
            <div className="space-y-4">
              {generating && (
                <div className="flex items-center justify-center gap-2 py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Generazione email in corso...</span>
                </div>
              )}

              {!generating && generatedHtml && (
                <>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Anteprima Email</h3>
                  </div>
                  <div className="border rounded-lg overflow-hidden bg-white">
                    <ScrollArea className="h-[350px]">
                      <div
                        className="p-4"
                        dangerouslySetInnerHTML={{ __html: generatedHtml }}
                      />
                    </ScrollArea>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Modifiche (opzionale)</h3>
                    <Textarea
                      value={modifications}
                      onChange={e => setModifications(e.target.value)}
                      placeholder="Es: Aggiungi un paragrafo sulle regole anti-COVID, cambia il colore del titolo..."
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateEmail(true)}
                        disabled={generating}
                        className="gap-1.5"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        {modifications.trim() ? 'Applica modifiche' : 'Rigenera'}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {!generating && !generatedHtml && (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground mb-3">Generazione non riuscita</p>
                  <Button onClick={() => generateEmail()} className="gap-1.5">
                    <Wand2 className="h-4 w-4" /> Riprova
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Filters */}
          {step === 'filters' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Filter className="h-4 w-4" /> Filtri destinatari
                </h3>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground font-medium">Turni</p>
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

          {/* STEP 4: Sending */}
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

        {/* Navigation buttons */}
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
