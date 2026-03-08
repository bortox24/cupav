import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCustomLogo } from "@/hooks/useCustomLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { XCircle } from "lucide-react";

const capitalize = (s: string) =>
  s
    .toLowerCase()
    .split(" ")
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .trim();

const RUOLI = [
  { value: "animatore", label: "Animatore" },
  { value: "cuoco", label: "Cuoco" },
  { value: "responsabile_campo", label: "Responsabile di campo" },
];

function DatePickerField({
  value,
  onChange,
  label,
}: {
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
  label: string;
}) {
  const [month, setMonth] = useState<Date>(value || new Date(1995, 0));
  const years = Array.from({ length: 2010 - 1960 + 1 }, (_, i) => 1960 + i);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd/MM/yyyy", { locale: it }) : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
          <Select
            value={String(month.getFullYear())}
            onValueChange={(y) =>
              setMonth(new Date(Number(y), month.getMonth()))
            }
          >
            <SelectTrigger className="h-8 w-[90px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm font-medium capitalize">
            {format(month, "MMMM", { locale: it })}
          </span>
        </div>
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          month={month}
          onMonthChange={setMonth}
          locale={it}
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
}

export default function ModuloStaff() {
  const { toast } = useToast();
  const logoUrl = useCustomLogo();
  const { data: siteSettings, isLoading: settingsLoading } = useSiteSettings();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 1
  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [dataNascita, setDataNascita] = useState<Date>();
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ruolo, setRuolo] = useState("");

  // Step 2 - allergie
  const [haAllergie, setHaAllergie] = useState<string>("");
  const [allergieDettaglio, setAllergieDettaglio] = useState("");
  const [patologieDettaglio, setPatologieDettaglio] = useState("");
  const [farmaco1Nome, setFarmaco1Nome] = useState("");
  const [farmaco1Posologia, setFarmaco1Posologia] = useState("");
  const [farmaco2Nome, setFarmaco2Nome] = useState("");
  const [farmaco2Posologia, setFarmaco2Posologia] = useState("");
  const [farmaco3Nome, setFarmaco3Nome] = useState("");
  const [farmaco3Posologia, setFarmaco3Posologia] = useState("");
  const [checkCompleto, setCheckCompleto] = useState(false);

  const showStep2 = haAllergie === "si";
  const totalSteps = showStep2 ? 2 : 1;
  const progressPercent = (currentStep / totalSteps) * 100;

  const validateStep1 = () => {
    if (!nome.trim()) { toast({ title: "Inserisci il nome", variant: "destructive" }); return false; }
    if (!cognome.trim()) { toast({ title: "Inserisci il cognome", variant: "destructive" }); return false; }
    if (!dataNascita) { toast({ title: "Inserisci la data di nascita", variant: "destructive" }); return false; }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast({ title: "Inserisci un'email valida", variant: "destructive" }); return false; }
    if (!telefono.trim()) { toast({ title: "Inserisci il telefono", variant: "destructive" }); return false; }
    if (!ruolo) { toast({ title: "Seleziona un ruolo", variant: "destructive" }); return false; }
    if (!haAllergie) { toast({ title: "Indica se hai allergie o patologie", variant: "destructive" }); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!checkCompleto) { toast({ title: "Conferma la completezza dei dati", variant: "destructive" }); return false; }
    return true;
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (!showStep2) {
      // go directly to confirm
      setShowConfirm(true);
      return;
    }
    setCurrentStep(2);
    scrollToTop();
  };

  const handleSubmit = async () => {
    if (showStep2 && !validateStep2()) return;
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const fullName = `${cognome} ${nome}`.trim();
      const payload = {
        full_name: fullName,
        cognome,
        email,
        telefono,
        data_nascita: dataNascita ? format(dataNascita, "dd-MM-yyyy") : null,
        ruolo,
        ha_allergie: haAllergie === "si",
        allergie_dettaglio: allergieDettaglio || null,
        patologie_dettaglio: patologieDettaglio || null,
        farmaco_1_nome: farmaco1Nome || null,
        farmaco_1_posologia: farmaco1Posologia || null,
        farmaco_2_nome: farmaco2Nome || null,
        farmaco_2_posologia: farmaco2Posologia || null,
        farmaco_3_nome: farmaco3Nome || null,
        farmaco_3_posologia: farmaco3Posologia || null,
      };

      const { error } = await supabase.from("animatori" as any).insert(payload as any);
      if (error) throw error;

      setSubmitted(true);
      scrollToTop();
    } catch (err: any) {
      toast({ title: "Errore durante l'invio", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Check if modulo staff is disabled
  if (!settingsLoading && siteSettings?.modulo_staff_enabled === 'false') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center shadow-xl">
          <CardHeader>
            <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <CardTitle>Registrazione staff chiusa</CardTitle>
            <CardDescription>Le registrazioni staff sono attualmente chiuse. Riprova più tardi.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center shadow-xl">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Registrazione inviata!</h2>
            <p className="text-muted-foreground">
              Grazie per la tua registrazione. Verrai contattato per ulteriori informazioni.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Invia altra registrazione
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-background to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 text-white py-6 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-3 sm:flex-row sm:text-left sm:gap-4">
          <img src={logoUrl} alt="CUPAV" className="h-20 w-20 sm:h-14 sm:w-14 rounded-xl bg-white/20 p-1" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">REGISTRAZIONE STAFF</h1>
            <p className="text-white/80 text-sm">CUPAV - Campeggio unità pastorale Altavilla Valmarana</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex justify-between mb-2">
          <span className={cn("text-xs font-medium", currentStep === 1 ? "text-primary font-bold" : "text-green-600")}>
            1. Dati personali
          </span>
          {showStep2 && (
            <span className={cn("text-xs font-medium", currentStep === 2 ? "text-primary font-bold" : "text-muted-foreground")}>
              2. Allergie/Patologie
            </span>
          )}
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📋 Dati Personali</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      value={nome}
                      onChange={(e) => setNome(capitalize(e.target.value))}
                      placeholder="Mario"
                    />
                  </div>
                  <div>
                    <Label>Cognome *</Label>
                    <Input
                      value={cognome}
                      onChange={(e) => setCognome(capitalize(e.target.value))}
                      placeholder="Rossi"
                    />
                  </div>
                </div>
                <div>
                  <Label>Data di nascita *</Label>
                  <DatePickerField
                    value={dataNascita}
                    onChange={setDataNascita}
                    label="Seleziona data (dd-mm-yyyy)"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@esempio.it"
                  />
                </div>
                <div>
                  <Label>Telefono *</Label>
                  <Input
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="+39 ..."
                  />
                </div>
                <div>
                  <Label>Ruolo *</Label>
                  <Select value={ruolo} onValueChange={setRuolo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona ruolo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RUOLI.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Allergie section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🏥 Allergie o Patologie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Presenti allergie o patologie? *</Label>
                  <Select value={haAllergie} onValueChange={setHaAllergie}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="si">Sì</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={nextStep} className="gap-2">
                {showStep2 ? (
                  <>Avanti <ChevronRight className="h-4 w-4" /></>
                ) : (
                  <>Invia <Send className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && showStep2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🏥 Dettaglio Allergie e Patologie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Allergie (dettaglio)</Label>
                  <Textarea
                    value={allergieDettaglio}
                    onChange={(e) => setAllergieDettaglio(e.target.value)}
                    placeholder="Descrivi le allergie..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Patologie (dettaglio)</Label>
                  <Textarea
                    value={patologieDettaglio}
                    onChange={(e) => setPatologieDettaglio(e.target.value)}
                    placeholder="Descrivi le patologie..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">💊 Farmaci</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Farmaco 1</Label><Input value={farmaco1Nome} onChange={(e) => setFarmaco1Nome(e.target.value)} placeholder="Nome farmaco" /></div>
                  <div><Label>Posologia</Label><Input value={farmaco1Posologia} onChange={(e) => setFarmaco1Posologia(e.target.value)} placeholder="Posologia" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Farmaco 2</Label><Input value={farmaco2Nome} onChange={(e) => setFarmaco2Nome(e.target.value)} placeholder="Nome farmaco" /></div>
                  <div><Label>Posologia</Label><Input value={farmaco2Posologia} onChange={(e) => setFarmaco2Posologia(e.target.value)} placeholder="Posologia" /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Farmaco 3</Label><Input value={farmaco3Nome} onChange={(e) => setFarmaco3Nome(e.target.value)} placeholder="Nome farmaco" /></div>
                  <div><Label>Posologia</Label><Input value={farmaco3Posologia} onChange={(e) => setFarmaco3Posologia(e.target.value)} placeholder="Posologia" /></div>
                </div>

                <div className="flex items-start gap-2 pt-2">
                  <Checkbox
                    id="check-completo"
                    checked={checkCompleto}
                    onCheckedChange={(v) => setCheckCompleto(v === true)}
                  />
                  <Label htmlFor="check-completo" className="text-sm font-normal leading-tight cursor-pointer">
                    Dichiaro che le informazioni fornite sono veritiere e complete *
                  </Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { setCurrentStep(1); scrollToTop(); }} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Indietro
              </Button>
              <Button onClick={() => { if (validateStep2()) setShowConfirm(true); }} className="gap-2">
                <Send className="h-4 w-4" /> Invia
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma invio</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per inviare la registrazione di <strong>{cognome} {nome}</strong> come <strong>{RUOLI.find(r => r.value === ruolo)?.label}</strong>. Vuoi procedere?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Invio..." : "Conferma"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
