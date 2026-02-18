import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Send, Tent, AlertTriangle, Info, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import logoCupav from "@/assets/logo-cupav.png";

const TURNI = [
  { value: "4_elementare", label: "4° Elementare — dal 27/06 al 04/07/2026" },
  { value: "5_elementare", label: "5° Elementare — dal 04/07 al 11/07/2026" },
  { value: "1_media", label: "1° Media — dal 11/07 al 18/07/2026" },
  { value: "2_media", label: "2° Media — dal 18/07 al 25/07/2026" },
  { value: "3_media", label: "3° Media — dal 25/07 al 01/08/2026" },
];

function DatePickerField({ value, onChange, label }: { value: Date | undefined; onChange: (d: Date | undefined) => void; label: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd/MM/yyyy", { locale: it }) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} locale={it} />
      </PopoverContent>
    </Popover>
  );
}

export default function IscrizioneCampeggio() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Step 1 fields
  const [email, setEmail] = useState("");
  const [ragazzoCognome, setRagazzoCognome] = useState("");
  const [ragazzoNome, setRagazzoNome] = useState("");
  const [ragazzoDataNascita, setRagazzoDataNascita] = useState<Date>();
  const [ragazzoLuogoNascita, setRagazzoLuogoNascita] = useState("");
  const [ragazzoResidente, setRagazzoResidente] = useState("");
  const [ragazzoIndirizzo, setRagazzoIndirizzo] = useState("");
  const [recapitiTelefonici, setRecapitiTelefonici] = useState("");
  const [genitoreQualita, setGenitoreQualita] = useState("");
  const [genitoreCognome, setGenitoreCognome] = useState("");
  const [genitoreNome, setGenitoreNome] = useState("");
  const [turno, setTurno] = useState("");
  const [secondoFiglio, setSecondoFiglio] = useState("");
  const [haAllergie, setHaAllergie] = useState<string>("");
  const [checkRegolamento, setCheckRegolamento] = useState(false);
  const [checkRimborso, setCheckRimborso] = useState(false);
  const [checkMedico, setCheckMedico] = useState(false);
  const [checkConsenso, setCheckConsenso] = useState(false);
  const [firmaData, setFirmaData] = useState<Date>();
  const [firmaNome, setFirmaNome] = useState("");

  // Step 2 fields
  const [allergieDettaglio, setAllergieDettaglio] = useState("");
  const [patologieDettaglio, setPatologieDettaglio] = useState("");
  const [farmaco1Nome, setFarmaco1Nome] = useState("");
  const [farmaco1Posologia, setFarmaco1Posologia] = useState("");
  const [farmaco2Nome, setFarmaco2Nome] = useState("");
  const [farmaco2Posologia, setFarmaco2Posologia] = useState("");
  const [farmaco3Nome, setFarmaco3Nome] = useState("");
  const [farmaco3Posologia, setFarmaco3Posologia] = useState("");
  const [checkAllergieVeritiere, setCheckAllergieVeritiere] = useState(false);
  const [checkAllergieResponsabilita, setCheckAllergieResponsabilita] = useState(false);
  const [checkAllergieVariazioni, setCheckAllergieVariazioni] = useState(false);
  const [firmaAllergieData, setFirmaAllergieData] = useState<Date>();
  const [firmaAllergieNome, setFirmaAllergieNome] = useState("");

  // Step 3 fields
  const [libCognome, setLibCognome] = useState("");
  const [libNome, setLibNome] = useState("");
  const [liberatoriaFoto, setLiberatoriaFoto] = useState<string>("");
  const [checkPrivacy, setCheckPrivacy] = useState(false);
  const [firmaLibData, setFirmaLibData] = useState<Date>();
  const [firmaLibNome, setFirmaLibNome] = useState("");

  // Step 4 fields
  const [checkAccettaRegolamento, setCheckAccettaRegolamento] = useState(false);

  const showStep2 = haAllergie === "si";
  const totalSteps = showStep2 ? 4 : 3;

  const getDisplayStep = (step: number) => {
    if (!showStep2 && step >= 3) return step - 1;
    return step;
  };

  const getStepLabels = () => {
    if (showStep2) return ["Iscrizione", "Allergie", "Liberatoria", "Regolamento"];
    return ["Iscrizione", "Liberatoria", "Regolamento"];
  };

  const actualStep = getDisplayStep(currentStep);
  const progressPercent = (actualStep / totalSteps) * 100;

  const validateStep1 = () => {
    if (!email || !ragazzoCognome || !ragazzoNome || !ragazzoDataNascita || !ragazzoLuogoNascita || !ragazzoResidente || !ragazzoIndirizzo || !recapitiTelefonici) {
      toast({ title: "Compila tutti i campi del ragazzo", variant: "destructive" }); return false;
    }
    if (!genitoreQualita || !genitoreCognome || !genitoreNome) {
      toast({ title: "Compila tutti i campi del genitore/tutore", variant: "destructive" }); return false;
    }
    if (!turno) { toast({ title: "Seleziona un turno", variant: "destructive" }); return false; }
    if (!haAllergie) { toast({ title: "Indica se il ragazzo presenta allergie", variant: "destructive" }); return false; }
    if (!checkRegolamento || !checkRimborso || !checkMedico || !checkConsenso) {
      toast({ title: "Accetta tutte le dichiarazioni obbligatorie", variant: "destructive" }); return false;
    }
    if (!firmaData || !firmaNome) { toast({ title: "Completa la firma", variant: "destructive" }); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { toast({ title: "Email non valida", variant: "destructive" }); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!allergieDettaglio.trim()) { toast({ title: "Descrivi le allergie/intolleranze", variant: "destructive" }); return false; }
    if (!checkAllergieVeritiere || !checkAllergieResponsabilita || !checkAllergieVariazioni) {
      toast({ title: "Accetta tutte le dichiarazioni obbligatorie", variant: "destructive" }); return false;
    }
    if (!firmaAllergieData || !firmaAllergieNome) { toast({ title: "Completa la firma", variant: "destructive" }); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!libCognome || !libNome) { toast({ title: "Compila cognome e nome", variant: "destructive" }); return false; }
    if (!liberatoriaFoto) { toast({ title: "Seleziona il consenso foto/video", variant: "destructive" }); return false; }
    if (!checkPrivacy) { toast({ title: "Accetta l'informativa privacy", variant: "destructive" }); return false; }
    if (!firmaLibData || !firmaLibNome) { toast({ title: "Completa la firma", variant: "destructive" }); return false; }
    return true;
  };

  const validateStep4 = () => {
    if (!checkAccettaRegolamento) { toast({ title: "Accetta il regolamento", variant: "destructive" }); return false; }
    return true;
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && showStep2 && !validateStep2()) return;
    if (currentStep === (showStep2 ? 3 : 2) && !validateStep3()) return;

    if (currentStep === 1 && !showStep2) setCurrentStep(3);
    else setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep === 3 && !showStep2) setCurrentStep(1);
    else setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;
    setSubmitting(true);
    try {
      const payload = {
        email,
        ragazzo_cognome: ragazzoCognome,
        ragazzo_nome: ragazzoNome,
        ragazzo_data_nascita: ragazzoDataNascita ? format(ragazzoDataNascita, "yyyy-MM-dd") : "",
        ragazzo_luogo_nascita: ragazzoLuogoNascita,
        ragazzo_residente: ragazzoResidente,
        ragazzo_indirizzo: ragazzoIndirizzo,
        recapiti_telefonici: recapitiTelefonici,
        genitore_qualita: genitoreQualita,
        genitore_cognome: genitoreCognome,
        genitore_nome: genitoreNome,
        turno,
        secondo_figlio: secondoFiglio || null,
        ha_allergie: haAllergie === "si",
        allergie_dettaglio: allergieDettaglio || null,
        patologie_dettaglio: patologieDettaglio || null,
        farmaco_1_nome: farmaco1Nome || null,
        farmaco_1_posologia: farmaco1Posologia || null,
        farmaco_2_nome: farmaco2Nome || null,
        farmaco_2_posologia: farmaco2Posologia || null,
        farmaco_3_nome: farmaco3Nome || null,
        farmaco_3_posologia: farmaco3Posologia || null,
        liberatoria_foto: liberatoriaFoto === "si",
        firma_data: firmaData ? format(firmaData, "yyyy-MM-dd") : "",
        firma_nome: firmaNome,
      };

      const { error } = await supabase.from("iscrizioni" as any).insert(payload as any);
      if (error) throw error;

      // Fire-and-forget webhook notification
      supabase.functions.invoke("notify-iscrizione", { body: payload }).catch(() => {});

      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Errore durante l'invio", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center shadow-xl">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Iscrizione inviata con successo!</h2>
            <p className="text-muted-foreground">
              Riceverai una email di conferma all'indirizzo indicato.<br />
              Per qualsiasi informazione: <a href="mailto:cupavdirettivo@gmail.com" className="text-primary font-medium underline">cupavdirettivo@gmail.com</a>
            </p>
            <Button onClick={() => window.location.href = "/"} variant="outline">Torna alla Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stepLabels = getStepLabels();
  const lastStep = showStep2 ? 4 : 3;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-background to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 text-white py-6 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <img src={logoCupav} alt="CUPAV" className="h-14 w-14 rounded-xl bg-white/20 p-1" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">RICHIESTA ISCRIZIONE</h1>
            <p className="text-white/80 text-sm">Campeggio CUPAV — Unità Pastorale Altavilla Valmarana</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex justify-between mb-2">
          {stepLabels.map((label, i) => (
            <div key={i} className={cn("text-xs font-medium transition-colors", actualStep > i + 1 ? "text-green-600" : actualStep === i + 1 ? "text-primary font-bold" : "text-muted-foreground")}>
              {i + 1}. {label}
            </div>
          ))}
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* STEP 1 */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {/* Email */}
            <div>
              <Label htmlFor="email">Email per le comunicazioni *</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@esempio.it" />
            </div>

            {/* Dati Ragazzo */}
            <Card>
              <CardHeader><CardTitle className="text-base">📋 Dati Ragazzo</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Cognome *</Label><Input value={ragazzoCognome} onChange={e => setRagazzoCognome(e.target.value)} /></div>
                  <div><Label>Nome *</Label><Input value={ragazzoNome} onChange={e => setRagazzoNome(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Data di nascita *</Label><DatePickerField value={ragazzoDataNascita} onChange={setRagazzoDataNascita} label="Seleziona data" /></div>
                  <div><Label>Luogo di nascita *</Label><Input value={ragazzoLuogoNascita} onChange={e => setRagazzoLuogoNascita(e.target.value)} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Residente a (Comune) *</Label><Input value={ragazzoResidente} onChange={e => setRagazzoResidente(e.target.value)} /></div>
                  <div><Label>Via/Indirizzo *</Label><Input value={ragazzoIndirizzo} onChange={e => setRagazzoIndirizzo(e.target.value)} /></div>
                </div>
                <div><Label>Recapiti telefonici *</Label><Input value={recapitiTelefonici} onChange={e => setRecapitiTelefonici(e.target.value)} /></div>
              </CardContent>
            </Card>

            {/* Dati Genitore */}
            <Card>
              <CardHeader><CardTitle className="text-base">👤 Dati Genitore/Tutore</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Il sottoscritto in qualità di *</Label>
                  <Select value={genitoreQualita} onValueChange={setGenitoreQualita}>
                    <SelectTrigger><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Genitore">Genitore</SelectItem>
                      <SelectItem value="Tutore legale">Tutore legale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Cognome *</Label><Input value={genitoreCognome} onChange={e => setGenitoreCognome(e.target.value)} /></div>
                  <div><Label>Nome *</Label><Input value={genitoreNome} onChange={e => setGenitoreNome(e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>

            {/* Turno */}
            <Card>
              <CardHeader><CardTitle className="text-base">🏕️ Turno Richiesto</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={turno} onValueChange={setTurno} className="space-y-3">
                  {TURNI.map(t => (
                    <div key={t.value} className="flex items-center space-x-3">
                      <RadioGroupItem value={t.value} id={t.value} />
                      <Label htmlFor={t.value} className="font-normal cursor-pointer">{t.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Quota */}
            <Card>
              <CardHeader><CardTitle className="text-base">💶 Quota di Partecipazione</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200 flex gap-3">
                  <Info className="h-5 w-5 shrink-0 mt-0.5" />
                  <div>
                    La quota di partecipazione è di <strong>€250,00</strong> (assicurazione inclusa).<br />
                    Il pagamento avviene tramite bonifico bancario: riceverete le coordinate via email dopo l'iscrizione.<br />
                    Per il secondo figlio iscritto è prevista una riduzione di <strong>€20,00</strong>.
                  </div>
                </div>
                <div>
                  <Label>Cognome, Nome e Turno del 2° figlio (facoltativo)</Label>
                  <Input value={secondoFiglio} onChange={e => setSecondoFiglio(e.target.value)} placeholder="Es: Rossi Marco - 1° Media" />
                </div>
              </CardContent>
            </Card>

            {/* Allergie */}
            <Card>
              <CardHeader><CardTitle className="text-base">🏥 Allergie e Patologie</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={haAllergie} onValueChange={setHaAllergie} className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="no" id="allergie-no" className="mt-1" />
                    <Label htmlFor="allergie-no" className="font-normal cursor-pointer">Il/la ragazzo/a NON presenta allergie né patologie</Label>
                  </div>
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem value="si" id="allergie-si" className="mt-1" />
                    <Label htmlFor="allergie-si" className="font-normal cursor-pointer">Il/la ragazzo/a presenta allergie e/o patologie</Label>
                  </div>
                </RadioGroup>
                {haAllergie === "si" && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200 flex gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    Dovrai compilare la sezione Allergie e Farmaci nello step successivo.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dichiarazioni */}
            <Card>
              <CardHeader><CardTitle className="text-base">✅ Dichiarazioni Obbligatorie</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checkRegolamento} onCheckedChange={(v) => setCheckRegolamento(!!v)} className="mt-1" />
                  <span className="text-sm">Ho preso visione del regolamento e mi impegno a farlo rispettare al mio/a figlio/a.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checkRimborso} onCheckedChange={(v) => setCheckRimborso(!!v)} className="mt-1" />
                  <span className="text-sm">Sono consapevole che in caso di ritiro verrà rimborsato solo €125,00.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checkMedico} onCheckedChange={(v) => setCheckMedico(!!v)} className="mt-1" />
                  <span className="text-sm">Autorizzo il personale medico ad adottare i percorsi terapeutici necessari.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checkConsenso} onCheckedChange={(v) => setCheckConsenso(!!v)} className="mt-1" />
                  <span className="text-sm">Dichiaro di agire con il consenso di entrambi i genitori (artt. 316, 337 ter e 337 quater c.c.).</span>
                </label>
              </CardContent>
            </Card>

            {/* Firma Step 1 */}
            <Card>
              <CardHeader><CardTitle className="text-base">✍️ Firma</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Data *</Label><DatePickerField value={firmaData} onChange={setFirmaData} label="Seleziona data" /></div>
                  <div><Label>Nome e Cognome del firmatario *</Label><Input value={firmaNome} onChange={e => setFirmaNome(e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 2 - Allergie */}
        {currentStep === 2 && showStep2 && (
          <div className="space-y-6">
            <div className="bg-orange-500 text-white rounded-lg p-4 text-sm flex gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <strong>ATTENZIONE</strong> — Le informazioni qui riportate verranno seguite alla lettera dagli organizzatori CUPAV durante tutta la durata del campeggio.
                Ti preghiamo di essere preciso/a e completo/a.
                In caso di omissioni o informazioni incomplete, il CUPAV declina ogni responsabilità per eventuali conseguenze sulla salute del/la ragazzo/a.
              </div>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label className="text-muted-foreground text-xs">Ragazzo/a</Label><Input value={`${ragazzoNome} ${ragazzoCognome}`} readOnly className="bg-muted" /></div>
                  <div><Label className="text-muted-foreground text-xs">Genitore/Tutore</Label><Input value={`${genitoreNome} ${genitoreCognome}`} readOnly className="bg-muted" /></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">🍽️ Allergie e Intolleranze Alimentari</CardTitle></CardHeader>
              <CardContent>
                <Label>Descrivi le allergie e/o intolleranze alimentari. Per ogni alimento intollerato specifica cosa può mangiare in alternativa. *</Label>
                <Textarea value={allergieDettaglio} onChange={e => setAllergieDettaglio(e.target.value)} className="mt-2" rows={4} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">🩺 Patologie</CardTitle></CardHeader>
              <CardContent>
                <Label>Descrivi eventuali patologie o condizioni di salute rilevanti.</Label>
                <Textarea value={patologieDettaglio} onChange={e => setPatologieDettaglio(e.target.value)} className="mt-2" rows={3} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">💊 Farmaci</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                {[
                  { n: "1", nome: farmaco1Nome, setNome: setFarmaco1Nome, pos: farmaco1Posologia, setPos: setFarmaco1Posologia },
                  { n: "2", nome: farmaco2Nome, setNome: setFarmaco2Nome, pos: farmaco2Posologia, setPos: setFarmaco2Posologia },
                  { n: "3", nome: farmaco3Nome, setNome: setFarmaco3Nome, pos: farmaco3Posologia, setPos: setFarmaco3Posologia },
                ].map(f => (
                  <div key={f.n} className="space-y-2 pb-4 border-b last:border-0">
                    <p className="font-medium text-sm">Farmaco {f.n}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label className="text-xs">Nome del farmaco</Label><Input value={f.nome} onChange={e => f.setNome(e.target.value)} /></div>
                      <div><Label className="text-xs">Posologia e istruzioni</Label><Input value={f.pos} onChange={e => f.setPos(e.target.value)} /></div>
                    </div>
                    <p className="text-xs text-muted-foreground">Specifica dose, frequenza e condizioni di somministrazione in modo chiaro.</p>
                  </div>
                ))}
                <p className="text-xs text-muted-foreground italic">Gli organizzatori si riservano il diritto di richiedere certificazione medica per le condizioni dichiarate.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">✅ Dichiarazioni</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checkAllergieVeritiere} onCheckedChange={v => setCheckAllergieVeritiere(!!v)} className="mt-1" />
                  <span className="text-sm">Dichiaro che le informazioni su allergie, intolleranze, patologie e farmaci sono veritiere, aggiornate e complete.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checkAllergieResponsabilita} onCheckedChange={v => setCheckAllergieResponsabilita(!!v)} className="mt-1" />
                  <span className="text-sm">Sono consapevole che il CUPAV seguirà esclusivamente quanto dichiarato. In caso di omissioni o informazioni errate, il CUPAV declina ogni responsabilità.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checkAllergieVariazioni} onCheckedChange={v => setCheckAllergieVariazioni(!!v)} className="mt-1" />
                  <span className="text-sm">Mi impegno a comunicare personalmente al direttivo CUPAV qualsiasi variazione delle condizioni di salute di mio/a figlio/a prima dell'inizio del campeggio.</span>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">✍️ Firma</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Data *</Label><DatePickerField value={firmaAllergieData} onChange={setFirmaAllergieData} label="Seleziona data" /></div>
                  <div><Label>Nome e Cognome *</Label><Input value={firmaAllergieNome} onChange={e => setFirmaAllergieNome(e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 3 - Liberatoria */}
        {currentStep === (showStep2 ? 3 : 2) && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">📸 Liberatoria Foto e Video</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Cognome genitore/tutore *</Label><Input value={libCognome} onChange={e => setLibCognome(e.target.value)} /></div>
                  <div><Label>Nome genitore/tutore *</Label><Input value={libNome} onChange={e => setLibNome(e.target.value)} /></div>
                </div>

                <div className="bg-muted/50 border rounded-lg p-4 text-sm text-muted-foreground">
                  Le immagini (foto e video) riprese durante il turno di campeggio potranno essere pubblicate e/o diffuse — a titolo gratuito e senza limiti di tempo — su internet, carta stampata e qualsiasi altro mezzo di diffusione, nonché conservate negli archivi informatici della Parrocchia di Altavilla.
                  La finalità è meramente informativa ed eventualmente promozionale.
                  Questa autorizzazione può essere revocata in qualsiasi momento con comunicazione scritta inviata via email a <a href="mailto:cupavdirettivo@gmail.com" className="text-primary underline">cupavdirettivo@gmail.com</a>.
                </div>

                <RadioGroup value={liberatoriaFoto} onValueChange={setLiberatoriaFoto} className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="si" id="foto-si" />
                    <Label htmlFor="foto-si" className="font-normal cursor-pointer">PRESTO IL CONSENSO alla pubblicazione di foto e video</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="no" id="foto-no" />
                    <Label htmlFor="foto-no" className="font-normal cursor-pointer">NEGO IL CONSENSO alla pubblicazione di foto e video</Label>
                  </div>
                </RadioGroup>

                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checkPrivacy} onCheckedChange={v => setCheckPrivacy(!!v)} className="mt-1" />
                  <span className="text-sm">Ho letto e compreso l'informativa sul trattamento dei dati personali ai sensi dell'art. 13 del D.Lgs. 196/2003.</span>
                </label>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">✍️ Firma</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Data *</Label><DatePickerField value={firmaLibData} onChange={setFirmaLibData} label="Seleziona data" /></div>
                  <div><Label>Nome e Cognome *</Label><Input value={firmaLibNome} onChange={e => setFirmaLibNome(e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* STEP 4 - Regolamento e Invio */}
        {currentStep === (showStep2 ? 4 : 3) && (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-5 w-5" /> Regolamento CUPAV</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-64 overflow-y-auto border rounded-lg p-4 text-sm space-y-3 bg-muted/30">
                  {[
                    "La partecipazione è destinata a tutti coloro che si impegnano a osservare il regolamento e l'impostazione del soggiorno.",
                    "Al fine di garantire il miglior funzionamento dei soggiorni, i responsabili potranno adottare qualsiasi tipo di provvedimento.",
                    "I ragazzi possono partecipare esclusivamente al turno previsto per la loro età, senza eccezioni anche in caso di fratelli.",
                    "I giorni prenotati possono essere ridotti solo per gravi motivi documentati e concordati con gli organizzatori.",
                    "Al momento della partenza è obbligatorio consegnare all'incaricato l'ORIGINALE della tessera sanitaria e una COPIA del libretto delle vaccinazioni.",
                    "I ragazzi devono rispettare se stessi, i compagni, il personale, gli animatori, il programma giornaliero e gli orari di silenzio.",
                    "Ogni partecipante avrà cura della propria tenda e del materiale. In caso di danno dovrà farsi carico delle spese.",
                    "È proibito portare materiale superfluo o non idoneo alle attività (verrà requisito e restituito a fine turno).",
                    "I genitori potranno visitare i ragazzi esclusivamente nei giorni previsti dagli organizzatori.",
                    "Le quote includono: vitto, alloggio, viaggio a/r in pullman e polizza infortuni.",
                  ].map((r, i) => (
                    <p key={i}><strong>{i + 1}.</strong> {r}</p>
                  ))}
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <Checkbox checked={checkAccettaRegolamento} onCheckedChange={v => setCheckAccettaRegolamento(!!v)} className="mt-1" />
                  <span className="text-sm font-medium">Confermo di aver letto e accettato il regolamento CUPAV in ogni sua parte e mi impegno a farlo rispettare al mio/a figlio/a per tutta la durata del campeggio.</span>
                </label>
              </CardContent>
            </Card>

            {/* Riepilogo */}
            <Card>
              <CardHeader><CardTitle className="text-base">📄 Riepilogo Iscrizione</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">Dati Ragazzo</h4>
                  <p>{ragazzoCognome} {ragazzoNome} — Nato il {ragazzoDataNascita ? format(ragazzoDataNascita, "dd/MM/yyyy") : ""} a {ragazzoLuogoNascita}</p>
                  <p>Residente a {ragazzoResidente}, {ragazzoIndirizzo}</p>
                  <p>Tel: {recapitiTelefonici} — Email: {email}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">Genitore/Tutore</h4>
                  <p>{genitoreQualita}: {genitoreCognome} {genitoreNome}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">Turno</h4>
                  <p>{TURNI.find(t => t.value === turno)?.label}</p>
                  {secondoFiglio && <p className="text-muted-foreground">2° figlio: {secondoFiglio}</p>}
                </div>
                {showStep2 && (
                  <div>
                    <h4 className="font-semibold text-muted-foreground mb-1">Allergie e Farmaci</h4>
                    <p>{allergieDettaglio}</p>
                    {patologieDettaglio && <p>Patologie: {patologieDettaglio}</p>}
                    {farmaco1Nome && <p>Farmaco 1: {farmaco1Nome} — {farmaco1Posologia}</p>}
                    {farmaco2Nome && <p>Farmaco 2: {farmaco2Nome} — {farmaco2Posologia}</p>}
                    {farmaco3Nome && <p>Farmaco 3: {farmaco3Nome} — {farmaco3Posologia}</p>}
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-1">Liberatoria Foto</h4>
                  <p>{liberatoriaFoto === "si" ? "Consenso PRESTATO" : "Consenso NEGATO"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8 pb-10">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={prevStep}><ChevronLeft className="h-4 w-4 mr-1" /> Indietro</Button>
          ) : <div />}

          {currentStep === lastStep ? (
            <Button onClick={handleSubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-base h-auto shadow-lg">
              <Send className="h-5 w-5 mr-2" />
              {submitting ? "Invio in corso..." : "INVIA ISCRIZIONE"}
            </Button>
          ) : (
            <Button onClick={nextStep}>Avanti <ChevronRight className="h-4 w-4 ml-1" /></Button>
          )}
        </div>
      </div>
    </div>
  );
}
