import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2, ChevronLeft, ChevronRight, Send, Mail, Facebook,
  Minus, Plus, Users as UsersIcon, CalendarHeart,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomLogo } from "@/hooks/useCustomLogo";

// Capitalizes first letter of every word, lowercases the rest
const capitalizeWords = (s: string) =>
  s.toLowerCase().replace(/(^|[\s'’\-])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase());

const COSTO_ADULTO = 10;
const COSTO_MINORE = 5;

const TURNI_GG: { value: string; label: string }[] = [
  { value: "4° Elementare", label: "4ª Elementare" },
  { value: "5° Elementare", label: "5ª Elementare" },
];

function Stepper({ label, hint, value, onChange }: { label: string; hint: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between bg-muted/30 rounded-xl p-4">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => onChange(Math.max(0, value - 1))} disabled={value <= 0}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center text-lg font-bold tabular-nums">{value}</span>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => onChange(value + 1)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function GiornataGenitori() {
  const { toast } = useToast();
  const logoUrl = useCustomLogo();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Dati
  const [genitoreNome, setGenitoreNome] = useState("");
  const [genitoreCognome, setGenitoreCognome] = useState("");
  const [genitoreEmail, setGenitoreEmail] = useState("");
  const [figlioNome, setFiglioNome] = useState("");
  const [figlioCognome, setFiglioCognome] = useState("");
  const [turno, setTurno] = useState("");
  const [partecipa, setPartecipa] = useState<"" | "si" | "no">("");

  // Partecipanti
  const [numAdulti, setNumAdulti] = useState(0);
  const [numMinori, setNumMinori] = useState(0);

  const contributo = numAdulti * COSTO_ADULTO + numMinori * COSTO_MINORE;
  const partecipaBool = partecipa === "si";

  // Steps: se "sì" -> 3 step (Dati, Partecipanti, Riepilogo). Se "no" -> 2 step (Dati, Riepilogo)
  const stepLabels = partecipaBool ? ["Dati", "Partecipanti", "Riepilogo"] : ["Dati", "Riepilogo"];
  const totalSteps = stepLabels.length;
  const progressPercent = (currentStep / totalSteps) * 100;
  const isLastStep = currentStep === totalSteps;

  const step1Valid =
    genitoreNome.trim() && genitoreCognome.trim() && genitoreEmail.trim() &&
    figlioNome.trim() && figlioCognome.trim() && turno && partecipa !== "";

  const turnoLabel = TURNI_GG.find(t => t.value === turno)?.label ?? turno;

  const handleNext = () => {
    if (currentStep === 1 && !step1Valid) {
      toast({ title: "Compila tutti i campi", description: "Tutti i campi sono obbligatori.", variant: "destructive" });
      return;
    }
    setCurrentStep((s) => Math.min(totalSteps, s + 1));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      genitore_nome: capitalizeWords(genitoreNome.trim()),
      genitore_cognome: capitalizeWords(genitoreCognome.trim()),
      genitore_email: genitoreEmail.trim(),
      figlio_nome: capitalizeWords(figlioNome.trim()),
      figlio_cognome: capitalizeWords(figlioCognome.trim()),
      turno,
      partecipa: partecipaBool,
      num_adulti: partecipaBool ? numAdulti : 0,
      num_minori: partecipaBool ? numMinori : 0,
      contributo: partecipaBool ? contributo : 0,
    };

    const isTransientError = (err: any) => {
      const name = err?.name ?? "";
      const msg = (err?.message ?? "").toLowerCase();
      return (
        name === "AbortError" ||
        msg.includes("aborted") ||
        msg.includes("failed to fetch") ||
        msg.includes("network") ||
        msg.includes("load failed")
      );
    };

    const maxAttempts = 3;
    try {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const { error } = await supabase.from("giornata_genitori" as any).insert(payload as any);
          if (error) throw error;
          setSubmitted(true);
          return;
        } catch (err: any) {
          // Riprova solo per interruzioni di rete temporanee
          if (isTransientError(err) && attempt < maxAttempts) {
            await new Promise((r) => setTimeout(r, attempt * 800));
            continue;
          }
          if (isTransientError(err)) {
            toast({
              title: "Connessione interrotta",
              description: "L'invio non è andato a buon fine. Controlla la connessione e premi di nuovo Invia.",
              variant: "destructive",
            });
          } else {
            toast({ title: "Errore durante l'invio", description: err.message, variant: "destructive" });
          }
          return;
        }
      }
    } finally {
      setSubmitting(false);
    }
  };


  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center shadow-xl rounded-2xl">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-rose-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Grazie, abbiamo ricevuto l'invio!</h2>
            <p className="text-muted-foreground">
              La tua adesione alla <strong>Giornata genitori</strong> è stata registrata.
              {partecipaBool && (
                <>
                  <br />Ti aspettiamo sabato! Ricorda di portare il contributo di <strong>{contributo}€</strong> in contanti.
                </>
              )}
            </p>
            <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold text-foreground">Per qualsiasi informazione</p>
              <p className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4 text-rose-600" />
                <a href="mailto:cupavdirettivo@gmail.com" className="text-primary underline">cupavdirettivo@gmail.com</a>
              </p>
              <p className="flex items-center justify-center gap-2 text-muted-foreground">
                <Facebook className="h-4 w-4 text-rose-600" />
                CUPAV Campeggio Unità Pastorale Altavilla Valmarana
              </p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">Invia un'altra adesione</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-background to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 text-white py-6 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-3 sm:flex-row sm:text-left sm:gap-4">
          <img src={logoUrl} alt="CUPAV" className="h-20 w-20 sm:h-14 sm:w-14 rounded-xl bg-white/20 p-1" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase">GIORNATA GENITORI</h1>
            <p className="text-white/90 text-sm">CUPAV — Campeggio Unità Pastorale Altavilla Valmarana</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex justify-between mb-2 gap-2">
          {stepLabels.map((label, i) => (
            <div key={i} className={`text-xs font-medium transition-colors text-center ${currentStep > i + 1 ? "text-rose-600" : currentStep === i + 1 ? "text-primary font-bold" : "text-muted-foreground"}`}>
              {i + 1}. {label}
            </div>
          ))}
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* STEP 1 — Dati */}
        {currentStep === 1 && (
          <>
            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">👤 Genitore</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome genitore *</Label>
                    <Input value={genitoreNome} onChange={e => setGenitoreNome(capitalizeWords(e.target.value))} />
                  </div>
                  <div>
                    <Label>Cognome genitore *</Label>
                    <Input value={genitoreCognome} onChange={e => setGenitoreCognome(capitalizeWords(e.target.value))} />
                  </div>
                </div>
                <div>
                  <Label>Email del genitore *</Label>
                  <Input type="email" value={genitoreEmail} onChange={e => setGenitoreEmail(e.target.value)} placeholder="email@esempio.it" />
                  <p className="text-xs text-muted-foreground mt-1">
                    Indica <strong>una sola</strong> email per le comunicazioni riguardanti la giornata genitori di sabato.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base">🧒 Figlio in campeggio</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome figlio *</Label>
                    <Input value={figlioNome} onChange={e => setFiglioNome(capitalizeWords(e.target.value))} />
                  </div>
                  <div>
                    <Label>Cognome figlio *</Label>
                    <Input value={figlioCognome} onChange={e => setFiglioCognome(capitalizeWords(e.target.value))} />
                  </div>
                </div>
                <div>
                  <Label>Turno *</Label>
                  <RadioGroup value={turno} onValueChange={setTurno} className="flex gap-3 mt-2">
                    {TURNI_GG.map(t => (
                      <label key={t.value} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer flex-1 ${turno === t.value ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30" : "border-border"}`}>
                        <RadioGroupItem value={t.value} />
                        <span className="text-sm font-medium">{t.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarHeart className="h-4 w-4" /> Partecipazione</CardTitle></CardHeader>
              <CardContent>
                <Label>Verrò sabato alla giornata genitori?</Label>
                <RadioGroup value={partecipa} onValueChange={(v) => setPartecipa(v as "si" | "no")} className="flex gap-3 mt-2">
                  <label className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer flex-1 ${partecipa === "si" ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-border"}`}>
                    <RadioGroupItem value="si" />
                    <span className="text-sm font-medium">Sì</span>
                  </label>
                  <label className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 cursor-pointer flex-1 ${partecipa === "no" ? "border-red-400 bg-red-50 dark:bg-red-950/30" : "border-border"}`}>
                    <RadioGroupItem value="no" />
                    <span className="text-sm font-medium">No</span>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>
          </>
        )}

        {/* STEP 2 — Partecipanti (solo se "Sì") */}
        {partecipaBool && currentStep === 2 && (
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><UsersIcon className="h-4 w-4" /> Quante persone parteciperanno?</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Stepper label="Adulti (≥ 18 anni)" hint={`Contributo ${COSTO_ADULTO}€ a persona`} value={numAdulti} onChange={setNumAdulti} />
              <Stepper label="Minori di 18 anni" hint={`Contributo ${COSTO_MINORE}€ a persona`} value={numMinori} onChange={setNumMinori} />
              <div className="flex items-center justify-between rounded-xl bg-rose-50 dark:bg-rose-950/30 px-4 py-3">
                <span className="font-semibold text-foreground">Contributo totale</span>
                <span className="text-xl font-bold text-rose-600">{contributo}€</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Il contributo è da consegnare in <strong>contanti</strong> il giorno della giornata genitori (sabato).
              </p>
            </CardContent>
          </Card>
        )}

        {/* STEP finale — Riepilogo */}
        {isLastStep && (
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base">📋 Riepilogo</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="bg-muted/30 rounded-xl px-4 divide-y divide-border">
                <div className="flex justify-between py-2.5"><span className="text-muted-foreground">Genitore</span><span className="font-medium">{capitalizeWords(genitoreCognome)} {capitalizeWords(genitoreNome)}</span></div>
                <div className="flex justify-between py-2.5"><span className="text-muted-foreground">Email</span><span className="font-medium break-all">{genitoreEmail}</span></div>
                <div className="flex justify-between py-2.5"><span className="text-muted-foreground">Figlio in campeggio</span><span className="font-medium">{capitalizeWords(figlioCognome)} {capitalizeWords(figlioNome)}</span></div>
                <div className="flex justify-between py-2.5"><span className="text-muted-foreground">Turno</span><span className="font-medium">{turnoLabel}</span></div>
                <div className="flex justify-between py-2.5"><span className="text-muted-foreground">Partecipa sabato</span><span className="font-medium">{partecipaBool ? "Sì" : "No"}</span></div>
                {partecipaBool && (
                  <>
                    <div className="flex justify-between py-2.5"><span className="text-muted-foreground">Adulti</span><span className="font-medium">{numAdulti}</span></div>
                    <div className="flex justify-between py-2.5"><span className="text-muted-foreground">Minori</span><span className="font-medium">{numMinori}</span></div>
                    <div className="flex justify-between py-2.5"><span className="text-muted-foreground">Contributo totale</span><span className="font-bold text-rose-600">{contributo}€</span></div>
                  </>
                )}
              </div>
              {partecipaBool && (
                <p className="text-xs text-muted-foreground">
                  Il contributo di <strong>{contributo}€</strong> è da consegnare in contanti sabato, il giorno della giornata genitori.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={() => setCurrentStep((s) => Math.max(1, s - 1))} disabled={submitting}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Indietro
            </Button>
          ) : <span />}

          {!isLastStep ? (
            <Button onClick={handleNext} className="bg-rose-600 hover:bg-rose-700 text-white">
              Avanti <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-rose-600 hover:bg-rose-700 text-white">
              <Send className="h-4 w-4 mr-1" /> {submitting ? "Invio..." : "Invia"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
