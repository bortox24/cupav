import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Send,
  Users as UsersIcon, Plus, Trash2, Mail, Facebook, Phone, Hammer,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCustomLogo } from "@/hooks/useCustomLogo";
import {
  GIORNI_MONTAGGIO, GiornoMontaggio,
  TARIFFA_MONTAGGIO, calcolaTotaleMontaggio, formatEuro,
} from "@/lib/tariffeMontaggio";

const capitalizeWords = (s: string) =>
  s.toLowerCase().replace(/(^|[\s'’\-])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase());

type Recapito = { nome: string; telefono: string };

export default function IscrizioneMontaggio() {
  const { toast } = useToast();
  const logoUrl = useCustomLogo();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Tab 1
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [residenteA, setResidenteA] = useState("");
  const [via, setVia] = useState("");
  const [recapiti, setRecapiti] = useState<Recapito[]>([{ nome: "", telefono: "" }]);

  // Tab 2
  const [giorni, setGiorni] = useState<GiornoMontaggio[]>([]);
  const [numAdulti, setNumAdulti] = useState(0);
  const [figliOver10, setFigliOver10] = useState(0);
  const [num410, setNum410] = useState(0);
  const [num03, setNum03] = useState(0);

  // Tab 3
  const [tariffaAccettata, setTariffaAccettata] = useState(false);
  const [firmaData] = useState<Date>(new Date());

  const totalSteps = 3;
  const progressPercent = (currentStep / totalSteps) * 100;
  const stepLabels = ["Informazioni personali", "Partecipazione", "Conferma e firma"];
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const calcolo = useMemo(
    () => calcolaTotaleMontaggio(
      { num_adulti: numAdulti, num_figli_over10: figliOver10, num_4_10_anni: num410, num_0_3_anni: num03 },
      giorni,
    ),
    [numAdulti, figliOver10, num410, num03, giorni],
  );

  const updateRecapito = (idx: number, field: keyof Recapito, val: string) => {
    setRecapiti(prev => prev.map((r, i) => i === idx ? { ...r, [field]: field === "nome" ? capitalizeWords(val) : val } : r));
  };
  const addRecapito = () => setRecapiti(prev => [...prev, { nome: "", telefono: "" }]);
  const removeRecapito = (idx: number) => setRecapiti(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const toggleGiorno = (g: GiornoMontaggio) => {
    setGiorni(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const validateStep1 = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email)) { toast({ title: "Email non valida", variant: "destructive" }); return false; }
    if (!nome.trim() || !cognome.trim()) { toast({ title: "Nome e cognome obbligatori", variant: "destructive" }); return false; }
    if (!residenteA.trim() || !via.trim()) { toast({ title: "Residenza e via obbligatorie", variant: "destructive" }); return false; }
    if (!recapiti[0].nome.trim() || !recapiti[0].telefono.trim()) {
      toast({ title: "Almeno un recapito (nome + telefono) è obbligatorio", variant: "destructive" }); return false;
    }
    for (let i = 1; i < recapiti.length; i++) {
      const r = recapiti[i];
      if ((r.nome.trim() && !r.telefono.trim()) || (!r.nome.trim() && r.telefono.trim())) {
        toast({ title: `Recapito #${i + 1}: compila sia nome che telefono o rimuovilo`, variant: "destructive" });
        return false;
      }
    }
    return true;
  };

  const validateStep2 = () => {
    if (giorni.length === 0) { toast({ title: "Seleziona almeno un giorno", variant: "destructive" }); return false; }
    if ((numAdulti + figliOver10 + num410 + num03) < 1) { toast({ title: "Indica almeno un partecipante", variant: "destructive" }); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!tariffaAccettata) { toast({ title: "Devi accettare la quota giornaliera", variant: "destructive" }); return false; }
    return true;
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep(s => s + 1);
    scrollToTop();
  };
  const prevStep = () => { setCurrentStep(s => Math.max(1, s - 1)); scrollToTop(); };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setSubmitting(true);
    try {
      const payload = {
        email: email.trim(),
        nome: capitalizeWords(nome.trim()),
        cognome: capitalizeWords(cognome.trim()),
        residente_a: residenteA.trim(),
        via: via.trim(),
        recapiti_telefonici: recapiti.filter(r => r.nome.trim() && r.telefono.trim()),
        giorni_selezionati: giorni,
        num_adulti: numAdulti,
        num_figli_over10: Math.max(0, figliOver10 || 0),
        num_4_10_anni: num410,
        num_0_3_anni: num03,
        num_notti: calcolo.notti,
        importo_totale_calcolato: calcolo.totale,
        tariffa_accettata: tariffaAccettata,
        firma_data: format(firmaData, "yyyy-MM-dd"),
        firma_nome_cognome: `${capitalizeWords(nome.trim())} ${capitalizeWords(cognome.trim())}`,
      };
      const { error } = await supabase.from("iscrizioni_montaggio" as any).insert(payload as any);
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Errore durante l'invio", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center shadow-xl rounded-2xl">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Grazie per la tua iscrizione!</h2>
            <p className="text-muted-foreground">
              Hai inviato la richiesta per il <strong>Montaggio Campeggio</strong>.<br />
              Ti contatteremo noi dello staff a breve.
            </p>
            <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold text-foreground">Per qualsiasi informazione</p>
              <p className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4 text-amber-600" />
                <a href="mailto:cupavdirettivo@gmail.com" className="text-primary underline">cupavdirettivo@gmail.com</a>
              </p>
              <p className="flex items-center justify-center gap-2 text-muted-foreground">
                <Facebook className="h-4 w-4 text-amber-600" />
                CUPAV Campeggio Unità Pastorale Altavilla Valmarana
              </p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">Invia un'altra iscrizione</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-background to-background">
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 text-white py-6 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-3 sm:flex-row sm:text-left sm:gap-4">
          <img src={logoUrl} alt="CUPAV" className="h-20 w-20 sm:h-14 sm:w-14 rounded-xl bg-white/20 p-1" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase">ISCRIZIONE MONTAGGIO CAMPEGGIO</h1>
            <p className="text-white/90 text-sm">CUPAV — Campeggio Unità Pastorale Altavilla Valmarana</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex justify-between mb-2 gap-2">
          {stepLabels.map((label, i) => (
            <div key={i} className={cn("text-xs font-medium transition-colors text-center",
              currentStep > i + 1 ? "text-amber-600" : currentStep === i + 1 ? "text-primary font-bold" : "text-muted-foreground")}>
              {i + 1}. {label}
            </div>
          ))}
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">📧 Email per le comunicazioni</CardTitle></CardHeader>
              <CardContent>
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@esempio.it" />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">👤 Il sottoscritto/a</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(capitalizeWords(e.target.value))} /></div>
                  <div><Label>Cognome *</Label><Input value={cognome} onChange={e => setCognome(capitalizeWords(e.target.value))} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Residente a (Comune) *</Label><Input value={residenteA} onChange={e => setResidenteA(capitalizeWords(e.target.value))} /></div>
                  <div><Label>Via e numero civico *</Label><Input value={via} onChange={e => setVia(capitalizeWords(e.target.value))} placeholder="Es. Via Roma 12" /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" />Recapiti telefonici</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {recapiti.map((r, i) => (
                  <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end bg-muted/30 rounded-xl p-3">
                    <div>
                      <Label className="text-xs">Nome {i === 0 ? "*" : "(opzionale)"}</Label>
                      <Input value={r.nome} onChange={e => updateRecapito(i, "nome", e.target.value)} placeholder="Es. Michele Rossi" />
                    </div>
                    <div>
                      <Label className="text-xs">Telefono {i === 0 ? "*" : "(opzionale)"}</Label>
                      <Input value={r.telefono} onChange={e => updateRecapito(i, "telefono", e.target.value)} placeholder="Es. 333 1234567" />
                    </div>
                    {i > 0 && (
                      <Button type="button" variant="outline" size="icon" onClick={() => removeRecapito(i)} className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addRecapito} className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Aggiungi recapito
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Hammer className="h-4 w-4" />Giorni di partecipazione *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="rounded-xl border-2 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300 font-medium animate-border-blink-red">
                  <p>
                    📌 Seleziona i giorni in cui sarai al campeggio per il montaggio. Il prezzo viene calcolato sulle <strong>notti</strong> trascorse.
                  </p>
                  <p className="mt-2">
                    ⚠️ Chi viene <strong>solo il sabato</strong> per montare il campeggio <strong>non paga nulla</strong> (0 notti). Il pasto di mezzogiorno è gratuito.
                  </p>
                </div>
                {GIORNI_MONTAGGIO.map(g => (
                  <label
                    key={g.value}
                    htmlFor={`giorno-${g.value}`}
                    className={cn(
                      "flex items-center gap-3 rounded-xl p-3 cursor-pointer border-2 transition-all",
                      giorni.includes(g.value)
                        ? "bg-amber-50 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700"
                        : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                    )}
                  >
                    <Checkbox
                      id={`giorno-${g.value}`}
                      checked={giorni.includes(g.value)}
                      onCheckedChange={() => toggleGiorno(g.value)}
                    />
                    <span className="font-semibold text-foreground flex-1">{g.label}</span>
                  </label>
                ))}
                <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-sm flex justify-between items-center mt-2">
                  <span className="text-muted-foreground">Notti calcolate:</span>
                  <span className="font-bold text-amber-700 dark:text-amber-300 text-lg">{calcolo.notti}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><UsersIcon className="h-4 w-4" />Persone partecipanti *</CardTitle>
                <p className="text-xs text-muted-foreground mt-1 text-[#ff0000]">Indica quante persone partecipano per ciascuna fascia d'età.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
                    <Label className="text-sm font-semibold">👶 Bambini 0–3 anni</Label>
                    <p className="text-[11px] text-muted-foreground">Gratis</p>
                    <Input type="number" min={0} value={num03} onChange={e => setNum03(Math.max(0, parseInt(e.target.value) || 0))} className="bg-background" />
                  </div>
                  <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
                    <Label className="text-sm font-semibold">🧒 Bambini 4–10 anni</Label>
                    <p className="text-[11px] text-muted-foreground">{formatEuro(TARIFFA_MONTAGGIO.eta_4_10)}/notte</p>
                    <Input type="number" min={0} value={num410} onChange={e => setNum410(Math.max(0, parseInt(e.target.value) || 0))} className="bg-background" />
                  </div>
                </div>
                <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
                  <Label className="text-sm font-semibold">🧑 Figli oltre i 10 anni</Label>
                  <p className="text-[11px] text-muted-foreground">1°: {formatEuro(TARIFFA_MONTAGGIO.figlio_1_over10)} · 2°: {formatEuro(TARIFFA_MONTAGGIO.figlio_2_over10)} · 3° e successivi: {formatEuro(TARIFFA_MONTAGGIO.figlio_3_over10)} (per notte)</p>
                  <Input type="number" min={0} value={figliOver10} onChange={e => setFigliOver10(Math.max(0, parseInt(e.target.value) || 0))} className="bg-background" />
                </div>
                <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
                  <Label className="text-sm font-semibold">🧑‍🦱 Adulti (dai 18 anni)</Label>
                  <p className="text-[11px] text-muted-foreground">{formatEuro(TARIFFA_MONTAGGIO.adulto)}/notte</p>
                  <Input type="number" min={0} value={numAdulti} onChange={e => setNumAdulti(Math.max(0, parseInt(e.target.value) || 0))} className="bg-background" />
                </div>

                {calcolo.righe.length > 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-3 text-sm space-y-1">
                    <div className="font-semibold text-foreground mb-1">Anteprima costo</div>
                    <div className="text-xs text-muted-foreground">Per notte: <strong className="text-foreground">{formatEuro(calcolo.totalePerNotte)}</strong> × {calcolo.notti} notti</div>
                    <div className="text-base font-bold text-amber-700 dark:text-amber-300 pt-1 border-t border-amber-200/60 dark:border-amber-900/40 mt-1">
                      Totale: {formatEuro(calcolo.totale)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">💶 Quota giornaliera a persona (per notte)</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ul className="space-y-1">
                  <li>• Adulto: <strong>{formatEuro(TARIFFA_MONTAGGIO.adulto)}</strong></li>
                  <li>• 1° figlio &gt;10 anni: <strong>{formatEuro(TARIFFA_MONTAGGIO.figlio_1_over10)}</strong></li>
                  <li>• 2° figlio &gt;10 anni: <strong>{formatEuro(TARIFFA_MONTAGGIO.figlio_2_over10)}</strong></li>
                  <li>• 3° figlio &gt;10 anni e successivi: <strong>{formatEuro(TARIFFA_MONTAGGIO.figlio_3_over10)}</strong></li>
                  <li>• Bambini 4–10 anni: <strong>{formatEuro(TARIFFA_MONTAGGIO.eta_4_10)}</strong></li>
                  <li>• Bambini 0–3 anni: <strong>GRATIS</strong></li>
                </ul>
                <p className="text-xs text-muted-foreground italic pt-2">Chi sale solo il sabato per montare il campeggio paga 0€ (0 notti). Pasto di mezzogiorno gratuito.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">📋 Riepilogo</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>Giorni: <strong>{giorni.length > 0 ? giorni.map(g => GIORNI_MONTAGGIO.find(x => x.value === g)?.short).join(', ') : '—'}</strong></p>
                <p>Notti: <strong>{calcolo.notti}</strong></p>
                {calcolo.righe.length > 0 && (
                  <div className="text-xs space-y-0.5 pl-2 text-muted-foreground border-l-2 border-amber-300 dark:border-amber-700 my-2">
                    {calcolo.righe.map((r, i) => (
                      <p key={i}>• {r.voce}: {r.persone} × {formatEuro(r.prezzoNotte)} × {r.notti}n = <strong className="text-foreground">{formatEuro(r.subtotale)}</strong></p>
                    ))}
                  </div>
                )}
                <p className="text-base font-bold text-amber-700 dark:text-amber-300 pt-1 border-t mt-2">
                  Totale dovuto: {formatEuro(calcolo.totale)}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">✍️ Firma</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 bg-muted/40 rounded-xl p-3">
                  <Checkbox id="acc-tar" checked={tariffaAccettata} onCheckedChange={(v) => setTariffaAccettata(!!v)} className="mt-1" />
                  <Label htmlFor="acc-tar" className="font-normal cursor-pointer text-sm">
                    Ho letto e accetto la quota giornaliera per notte indicata qui sopra. *
                  </Label>
                </div>
                <div>
                  <Label>Data</Label>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/40 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{format(firmaData, "dd/MM/yyyy", { locale: it })}</span>
                    <span className="text-xs text-muted-foreground ml-auto">(data odierna)</span>
                  </div>
                </div>
                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Firma per iscrizione</p>
                  <p className="text-base font-semibold text-foreground mt-1 italic">
                    {nome && cognome ? `${capitalizeWords(nome)} ${capitalizeWords(cognome)}` : <span className="text-muted-foreground italic">Compila nome e cognome nel primo step</span>}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-between mt-6 gap-3">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1 || submitting}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Indietro
          </Button>
          {currentStep < totalSteps ? (
            <Button onClick={nextStep}>Avanti <ChevronRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-amber-600 hover:bg-amber-700">
              <Send className="h-4 w-4 mr-2" /> {submitting ? "Invio in corso..." : "Invia iscrizione"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
