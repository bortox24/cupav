import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import {
  CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Send,
  Users as UsersIcon, Plus, Trash2, Mail, Facebook, Phone, Tent,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCustomLogo } from "@/hooks/useCustomLogo";

// Capitalizes first letter of every word, lowercases the rest
const capitalizeWords = (s: string) =>
  s.toLowerCase().replace(/(^|[\s'’\-])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase());

type Recapito = { nome: string; telefono: string };
type TipoPeriodo = "" | "7_giorni" | "10_giorni" | "15_giorni" | "personalizzato";

const PERIODO_DEFAULTS: Record<Exclude<TipoPeriodo, "" | "personalizzato">, { inizio: string; fine: string; label: string }> = {
  "7_giorni":  { inizio: "2026-08-08", fine: "2026-08-15", label: "7 giorni intero periodo — dal 08/08 al 15/08" },
  "10_giorni": { inizio: "2026-08-08", fine: "2026-08-19", label: "10 giorni intero periodo — dal 08/08 al 19/08" },
  "15_giorni": { inizio: "2026-08-08", fine: "2026-08-22", label: "15 giorni intero periodo — dal 08/08 al 22/08" },
};

const MIN_PERS_DATE = new Date(2026, 7, 8);  // Aug 8 2026
const MAX_PERS_DATE = new Date(2026, 7, 22); // Aug 22 2026

function PeriodoDatePicker({ value, onChange, label, disabled }: { value: Date | undefined; onChange: (d: Date | undefined) => void; label: string; disabled?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" disabled={disabled} className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd/MM/yyyy", { locale: it }) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          defaultMonth={value || MIN_PERS_DATE}
          locale={it}
          disabled={(d) => d < MIN_PERS_DATE || d > MAX_PERS_DATE}
          className="p-3 pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export default function IscrizioneFamiglie() {
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
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>("");
  const [persInizio, setPersInizio] = useState<Date>();
  const [persFine, setPersFine] = useState<Date>();
  const [numAdulti, setNumAdulti] = useState<number>(0);
  const [figlio1, setFiglio1] = useState(false);
  const [figlio2, setFiglio2] = useState(false);
  const [figlio3, setFiglio3] = useState(false);
  const [num410, setNum410] = useState<number>(0);
  const [num03, setNum03] = useState<number>(0);
  const [numAnimali, setNumAnimali] = useState<number>(0);

  // Tab 3
  const [accettaRegolamento, setAccettaRegolamento] = useState(false);
  const [acconto, setAcconto] = useState<string>("");
  const [firmaData, setFirmaData] = useState<Date>(new Date());

  const totalSteps = 3;
  const progressPercent = (currentStep / totalSteps) * 100;

  const stepLabels = ["Informazioni personali", "Iscrizione e partecipanti", "Regolamento e firma"];

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const updateRecapito = (idx: number, field: keyof Recapito, val: string) => {
    setRecapiti(prev => prev.map((r, i) => i === idx ? { ...r, [field]: field === "nome" ? capitalizeWords(val) : val } : r));
  };
  const addRecapito = () => setRecapiti(prev => [...prev, { nome: "", telefono: "" }]);
  const removeRecapito = (idx: number) => setRecapiti(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  const validateStep1 = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) { toast({ title: "Email obbligatoria", variant: "destructive" }); return false; }
    if (!emailRegex.test(email)) { toast({ title: "Email non valida", variant: "destructive" }); return false; }
    if (!nome.trim()) { toast({ title: "Nome obbligatorio", variant: "destructive" }); return false; }
    if (!cognome.trim()) { toast({ title: "Cognome obbligatorio", variant: "destructive" }); return false; }
    if (!residenteA.trim()) { toast({ title: "Comune di residenza obbligatorio", variant: "destructive" }); return false; }
    if (!via.trim()) { toast({ title: "Via/indirizzo obbligatorio", variant: "destructive" }); return false; }
    if (!recapiti[0].nome.trim() || !recapiti[0].telefono.trim()) {
      toast({ title: "Almeno un recapito (nome + telefono) è obbligatorio", variant: "destructive" }); return false;
    }
    // Optional extra recapiti must be complete if started
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
    if (!tipoPeriodo) { toast({ title: "Seleziona un periodo di iscrizione", variant: "destructive" }); return false; }
    if (tipoPeriodo === "personalizzato") {
      if (!persInizio || !persFine) { toast({ title: "Inserisci le date personalizzate (dal/al)", variant: "destructive" }); return false; }
      if (persFine < persInizio) { toast({ title: "La data finale deve essere successiva a quella iniziale", variant: "destructive" }); return false; }
    }
    const totalePartecipanti = numAdulti + (figlio1 ? 1 : 0) + (figlio2 ? 1 : 0) + (figlio3 ? 1 : 0) + num410 + num03;
    if (totalePartecipanti < 1) { toast({ title: "Indica almeno un partecipante", variant: "destructive" }); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!accettaRegolamento) { toast({ title: "Devi accettare il regolamento", variant: "destructive" }); return false; }
    const acc = parseFloat(acconto);
    if (Number.isNaN(acc) || acc < 0) { toast({ title: "Inserisci un acconto valido", variant: "destructive" }); return false; }
    if (!firmaData) { toast({ title: "Inserisci la data della firma", variant: "destructive" }); return false; }
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
      let inizio: string, fine: string;
      if (tipoPeriodo === "personalizzato") {
        inizio = format(persInizio!, "yyyy-MM-dd");
        fine = format(persFine!, "yyyy-MM-dd");
      } else {
        const def = PERIODO_DEFAULTS[tipoPeriodo as Exclude<TipoPeriodo, "" | "personalizzato">];
        inizio = def.inizio; fine = def.fine;
      }

      const payload = {
        email: email.trim(),
        nome: capitalizeWords(nome.trim()),
        cognome: capitalizeWords(cognome.trim()),
        residente_a: residenteA.trim(),
        via: via.trim(),
        recapiti_telefonici: recapiti.filter(r => r.nome.trim() && r.telefono.trim()),
        tipo_periodo: tipoPeriodo,
        data_inizio: inizio,
        data_fine: fine,
        num_adulti: numAdulti,
        figlio_1_over10: figlio1,
        figlio_2_over10: figlio2,
        figlio_3_over10: figlio3,
        num_4_10_anni: num410,
        num_0_3_anni: num03,
        num_animali: numAnimali,
        acconto_versato: parseFloat(acconto),
        regolamento_accettato: accettaRegolamento,
        firma_data: format(firmaData, "yyyy-MM-dd"),
        firma_nome_cognome: `${capitalizeWords(nome.trim())} ${capitalizeWords(cognome.trim())}`,
      };

      const { error } = await supabase.from("iscrizioni_famiglie" as any).insert(payload as any);
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
      <div className="min-h-screen bg-gradient-to-b from-orange-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center shadow-xl rounded-2xl">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Grazie per la tua iscrizione!</h2>
            <p className="text-muted-foreground">
              Hai inviato la richiesta per il <strong>Turno Famiglie</strong>.<br />
              Ti contatteremo noi dello staff a breve.
            </p>
            <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold text-foreground">Per qualsiasi informazione</p>
              <p className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4 text-orange-600" />
                <a href="mailto:cupavdirettivo@gmail.com" className="text-primary underline">cupavdirettivo@gmail.com</a>
              </p>
              <p className="flex items-center justify-center gap-2 text-muted-foreground">
                <Facebook className="h-4 w-4 text-orange-600" />
                CUPAV Campeggio Unità Pastorale Altavilla Valmarana
              </p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">Invia un'altra iscrizione</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lastStep = totalSteps;

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-background to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 text-white py-6 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-3 sm:flex-row sm:text-left sm:gap-4">
          <img src={logoUrl} alt="CUPAV" className="h-20 w-20 sm:h-14 sm:w-14 rounded-xl bg-white/20 p-1" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase">ISCRIZIONE TURNO FAMIGLIE</h1>
            <p className="text-white/90 text-sm">CUPAV — Campeggio Unità Pastorale Altavilla Valmarana</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex justify-between mb-2 gap-2">
          {stepLabels.map((label, i) => (
            <div key={i} className={cn("text-xs font-medium transition-colors text-center", currentStep > i + 1 ? "text-orange-600" : currentStep === i + 1 ? "text-primary font-bold" : "text-muted-foreground")}>
              {i + 1}. {label}
            </div>
          ))}
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* STEP 1 */}
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
                  <div>
                    <Label>Nome *</Label>
                    <Input value={nome} onChange={e => setNome(capitalizeWords(e.target.value))} />
                  </div>
                  <div>
                    <Label>Cognome *</Label>
                    <Input value={cognome} onChange={e => setCognome(capitalizeWords(e.target.value))} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Residente a (Comune) *</Label>
                    <Input value={residenteA} onChange={e => setResidenteA(capitalizeWords(e.target.value))} />
                  </div>
                  <div>
                    <Label>Via *</Label>
                    <Input value={via} onChange={e => setVia(e.target.value)} />
                  </div>
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
                      <Input
                        value={r.nome}
                        onChange={e => updateRecapito(i, "nome", e.target.value)}
                        placeholder="Es. Michele Rossi"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Telefono {i === 0 ? "*" : "(opzionale)"}</Label>
                      <Input
                        value={r.telefono}
                        onChange={e => updateRecapito(i, "telefono", e.target.value)}
                        placeholder="Es. 333 1234567"
                      />
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

        {/* STEP 2 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Tent className="h-4 w-4" />Chiede l'iscrizione *</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={tipoPeriodo} onValueChange={(v) => setTipoPeriodo(v as TipoPeriodo)} className="space-y-3">
                  {(["7_giorni", "10_giorni", "15_giorni"] as const).map(k => (
                    <div key={k} className="flex items-start space-x-3 bg-muted/30 rounded-xl p-3">
                      <RadioGroupItem value={k} id={k} className="mt-1" />
                      <Label htmlFor={k} className="font-normal cursor-pointer flex-1">
                        {PERIODO_DEFAULTS[k].label} a Sagron Mis (TN)
                      </Label>
                    </div>
                  ))}
                  <div className="flex items-start space-x-3 bg-muted/30 rounded-xl p-3">
                    <RadioGroupItem value="personalizzato" id="personalizzato" className="mt-1" />
                    <div className="flex-1 space-y-3">
                      <Label htmlFor="personalizzato" className="font-normal cursor-pointer">
                        Periodo personalizzato (se vi è disponibilità)
                      </Label>
                      {tipoPeriodo === "personalizzato" && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Dal *</Label>
                            <PeriodoDatePicker value={persInizio} onChange={setPersInizio} label="Data inizio" />
                          </div>
                          <div>
                            <Label className="text-xs">Al *</Label>
                            <PeriodoDatePicker value={persFine} onChange={setPersFine} label="Data fine" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-3 italic">
                  Avranno la precedenza le famiglie che frequentano le attività parrocchiali di Altavilla e Valmarana, a seguire i residenti nel Comune, successivamente i residenti fuori Comune, fino ad un <strong>massimo di 50 persone</strong>.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><UsersIcon className="h-4 w-4" />Persone partecipanti *</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Adulti (numero)</Label>
                    <Input type="number" min={0} value={numAdulti} onChange={e => setNumAdulti(Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div>
                    <Label>4–10 anni (numero)</Label>
                    <Input type="number" min={0} value={num410} onChange={e => setNum410(Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div>
                    <Label>0–3 anni (numero)</Label>
                    <Input type="number" min={0} value={num03} onChange={e => setNum03(Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                  <div>
                    <Label>Animali (numero)</Label>
                    <Input type="number" min={0} value={numAnimali} onChange={e => setNumAnimali(Math.max(0, parseInt(e.target.value) || 0))} />
                  </div>
                </div>
                <div className="space-y-2 bg-muted/30 rounded-xl p-3">
                  <Label className="text-sm">Figli &gt; 10 anni</Label>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Checkbox id="f1" checked={figlio1} onCheckedChange={(v) => setFiglio1(!!v)} />
                      <Label htmlFor="f1" className="font-normal cursor-pointer">1° figlio &gt; 10 anni</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="f2" checked={figlio2} onCheckedChange={(v) => setFiglio2(!!v)} />
                      <Label htmlFor="f2" className="font-normal cursor-pointer">2° figlio &gt; 10 anni</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox id="f3" checked={figlio3} onCheckedChange={(v) => setFiglio3(!!v)} />
                      <Label htmlFor="f3" className="font-normal cursor-pointer">3° figlio &gt; 10 anni</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">📜 Regolamento</CardTitle></CardHeader>
              <CardContent>
                <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground max-h-64 overflow-y-auto pr-2">
                  <li>La partecipazione è destinata a tutti coloro che nello spirito e nei contenuti propri di questa esperienza si impegnano ad osservare il regolamento e l'impostazione del soggiorno.</li>
                  <li><strong>Ogni tenda/casetta è destinata ad almeno 2 persone.</strong> Ogni partecipante avrà cura della propria tenda/casetta e del materiale messo a disposizione. In caso di danno dovrà farsi carico delle spese per la sistemazione/acquisto.</li>
                  <li>Al fine di garantire il miglior funzionamento dei vari soggiorni i responsabili incaricati potranno adottare qualsiasi tipo di provvedimento.</li>
                  <li>I giorni prenotati possono essere ridotti solo per motivi concordati con gli organizzatori.</li>
                  <li>I partecipanti devono impegnarsi a rispettare i compagni, il personale di servizio, i responsabili, e tutto il programma redatto quotidianamente, gli orari di silenzio diurno e notturno.</li>
                  <li>Le quote di partecipazione includono vitto, alloggio ed una polizza infortuni.</li>
                </ol>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">💶 Quota giornaliera a persona</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3">
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">1. Residente ad Altavilla e collabora con il CUPAV</p>
                  <p className="text-muted-foreground text-xs mt-1">Adulto €20 — 1° figlio €15 — 2° figlio €13 — 3° figlio €10 — 4–10 anni €10 — sotto 4 anni GRATIS</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3">
                  <p className="font-semibold text-blue-700 dark:text-blue-300">2. Residente ad Altavilla</p>
                  <p className="text-muted-foreground text-xs mt-1">Adulto €25 — 1° figlio €20 — 2° figlio €15 — 3° figlio €12 — 4–10 anni €12 — sotto 4 anni GRATIS</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3">
                  <p className="font-semibold text-amber-700 dark:text-amber-300">3. Fuori Comune e collabora con il CUPAV</p>
                  <p className="text-muted-foreground text-xs mt-1">Adulto €30 — 1° figlio €23 — 2° figlio €18 — 3° figlio €15 — 4–10 anni €15 — sotto 4 anni GRATIS</p>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/20 rounded-xl p-3">
                  <p className="font-semibold text-rose-700 dark:text-rose-300">4. Fuori Comune</p>
                  <p className="text-muted-foreground text-xs mt-1">Adulto €35 — 1° figlio €25 — 2° figlio €20 — 3° figlio €17 — 4–10 anni €17 — sotto 4 anni GRATIS</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">✍️ Firma per iscrizione e accettazione regolamento</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 bg-muted/40 rounded-xl p-3">
                  <Checkbox id="acc-reg" checked={accettaRegolamento} onCheckedChange={(v) => setAccettaRegolamento(!!v)} className="mt-1" />
                  <Label htmlFor="acc-reg" className="font-normal cursor-pointer text-sm">
                    Ho letto e accetto il regolamento e la quota giornaliera a persona indicate qui sopra. *
                  </Label>
                </div>

                <div>
                  <Label>Versa come ACCONTO € *</Label>
                  <Input type="number" min={0} step="0.01" value={acconto} onChange={e => setAcconto(e.target.value)} placeholder="Es. 100" />
                </div>

                <div>
                  <Label>Data *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(firmaData, "dd/MM/yyyy", { locale: it })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={firmaData} onSelect={(d) => d && setFirmaData(d)} locale={it} className="p-3 pointer-events-auto" />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="bg-muted/40 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">Firma per iscrizione e accettazione regolamento allegato</p>
                  <p className="text-base font-semibold text-foreground mt-1 italic">
                    {nome && cognome ? `${capitalizeWords(nome)} ${capitalizeWords(cognome)}` : <span className="text-muted-foreground italic">Compila nome e cognome nel primo step</span>}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground italic border-t pt-3 leading-relaxed">
                  <p className="font-semibold text-foreground not-italic mb-1">Ci impegniamo a vivere quest'esperienza nello spirito del Campeggio Parrocchiale:</p>
                  <p>Il campeggio è di chi lo vive e vi partecipa… è NOSTRO.</p>
                  <p>Il campeggio è vivere all'aria aperta, tra bellissime montagne con vecchi e nuovi amici, apertura verso gli altri, imparando a conoscersi come persone ricche di valori e con un unico filo conduttore: la CONDIVISIONE.</p>
                  <p>Proprio per questo lo stile sarà basato su alcune piccole ma essenziali REGOLE.</p>
                  <p>Ognuno darà il suo piccolo contributo ESSENZIALE per la buona riuscita del campo.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 gap-3">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 1 || submitting}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Indietro
          </Button>
          {currentStep < lastStep ? (
            <Button onClick={nextStep}>Avanti <ChevronRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-orange-600 hover:bg-orange-700">
              <Send className="h-4 w-4 mr-2" /> {submitting ? "Invio in corso..." : "Invia iscrizione"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
