import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon, CheckCircle2, ChevronLeft, ChevronRight, Send, AlertTriangle, Download, Loader2 } from "lucide-react";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCustomLogo } from "@/hooks/useCustomLogo";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { TURNI } from "@/hooks/useTurnoPermissions";
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

const PDF_URL = "/regolamento-staff.pdf";

function PdfViewer({ url }: { url: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateWidth = useCallback(() => {
    if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
  }, []);

  useEffect(() => {
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateWidth]);

  return (
    <div ref={containerRef} className="w-full">
      <Document
        file={url}
        onLoadSuccess={({ numPages: n }) => setNumPages(n)}
        loading={<div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}
        error={<div className="text-center py-10 text-destructive">Errore nel caricamento del PDF</div>}
      >
        {numPages && containerWidth > 0 && Array.from({ length: numPages }, (_, i) => (
          <div key={i} className={i < numPages - 1 ? 'mb-4' : ''}>
            <Page pageNumber={i + 1} width={containerWidth} renderTextLayer renderAnnotationLayer />
          </div>
        ))}
      </Document>
    </div>
  );
}

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

  // Step 2 - turno selection
  const [selectedTurni, setSelectedTurni] = useState<string[]>([]);
  const [confermaResponsabilita, setConfermaResponsabilita] = useState(false);

  // Step 3 - allergie
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

  // Step regolamento (final)
  const [firmaNome, setFirmaNome] = useState("");
  const [firmaData, setFirmaData] = useState<Date>();
  const [accettaRegolamento, setAccettaRegolamento] = useState(false);

  const showStep3 = haAllergie === "si";
  // Steps: 1=Dati, 2=Turno, (3=Allergie if needed), last=Regolamento
  const regolamentoStep = showStep3 ? 4 : 3;
  const totalSteps = regolamentoStep;
  const progressPercent = (currentStep / totalSteps) * 100;

  const toggleTurno = (turnoValue: string) => {
    setSelectedTurni((prev) =>
      prev.includes(turnoValue)
        ? prev.filter((t) => t !== turnoValue)
        : [...prev, turnoValue]
    );
  };

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
    if (selectedTurni.length === 0) { toast({ title: "Seleziona almeno un turno", variant: "destructive" }); return false; }
    if (!confermaResponsabilita) { toast({ title: "Conferma la responsabilità della selezione turno", variant: "destructive" }); return false; }
    return true;
  };

  const validateStep3 = () => {
    if (!checkCompleto) { toast({ title: "Conferma la completezza dei dati", variant: "destructive" }); return false; }
    return true;
  };

  const validateRegolamento = () => {
    if (!firmaNome.trim()) { toast({ title: "Inserisci il nome per la firma", variant: "destructive" }); return false; }
    if (!firmaData) { toast({ title: "Inserisci la data della firma", variant: "destructive" }); return false; }
    if (!accettaRegolamento) { toast({ title: "Devi accettare il regolamento per procedere", variant: "destructive" }); return false; }
    return true;
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && showStep3 && !validateStep3()) return;

    setCurrentStep((s) => s + 1);
    scrollToTop();
  };

  const prevStep = () => {
    setCurrentStep((s) => s - 1);
    scrollToTop();
  };

  const handleSubmit = async () => {
    if (!validateRegolamento()) return;
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

      const { data: animatore, error } = await supabase
        .from("animatori" as any)
        .insert(payload as any)
        .select("id")
        .single();
      if (error) throw error;

      const animatoreId = (animatore as any).id;
      const currentYear = new Date().getFullYear();
      const turniRows = selectedTurni.map((turno) => ({
        animatore_id: animatoreId,
        turno,
        anno: currentYear,
      }));

      const { error: turniError } = await supabase
        .from("animatori_turni" as any)
        .insert(turniRows as any);
      if (turniError) {
        console.error("Errore inserimento turni:", turniError);
      }

      // Log registrazione modulo staff
      const turniLabel = selectedTurni.join(", ");
      await supabase.from("staff_activity_logs" as any).insert({
        animatore_id: animatoreId,
        azione: "registrazione_modulo",
        dettaglio: `Registrazione dal modulo staff pubblico. Turni selezionati: ${turniLabel}. Regolamento accettato e firmato da: ${firmaNome} in data ${firmaData ? format(firmaData, "dd/MM/yyyy") : ""}`,
        eseguito_da: animatoreId,
        eseguito_da_nome: fullName,
      } as any);

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

  

  const stepLabels = [
    "1. Dati personali",
    "2. Selezione turno",
    ...(showStep3 ? ["3. Allergie/Patologie"] : []),
    `${showStep3 ? "4" : "3"}. Regolamento`,
  ];

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
          {stepLabels.map((label, i) => (
            <span
              key={i}
              className={cn(
                "text-xs font-medium",
                currentStep === i + 1 ? "text-primary font-bold" :
                currentStep > i + 1 ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
          ))}
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* STEP 1 — Dati personali */}
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
                    <Input value={nome} onChange={(e) => setNome(capitalize(e.target.value))} placeholder="Mario" />
                  </div>
                  <div>
                    <Label>Cognome *</Label>
                    <Input value={cognome} onChange={(e) => setCognome(capitalize(e.target.value))} placeholder="Rossi" />
                  </div>
                </div>
                <div>
                  <Label>Data di nascita *</Label>
                  <DatePickerField value={dataNascita} onChange={setDataNascita} label="Seleziona data (dd-mm-yyyy)" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@esempio.it" />
                </div>
                <div>
                  <Label>Telefono *</Label>
                  <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="+39 ..." />
                </div>
                <div>
                  <Label>Ruolo *</Label>
                  <Select value={ruolo} onValueChange={setRuolo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona ruolo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {RUOLI.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

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
                Avanti <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Selezione Turno */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🏕️ Selezione Turno</CardTitle>
                <CardDescription>
                  Seleziona il turno (o i turni) che ti è stato comunicato dallo staff animatori.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 dark:text-amber-300 text-sm">
                    <strong>Attenzione:</strong> La selezione del turno è <strong>definitiva e non modificabile</strong> dopo l'invio.
                    Seleziona esclusivamente il turno che ti è stato comunicato dallo staff animatori.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {TURNI.map((turno) => (
                    <div
                      key={turno.value}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                        selectedTurni.includes(turno.value)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      )}
                      onClick={() => toggleTurno(turno.value)}
                    >
                      <Checkbox
                        checked={selectedTurni.includes(turno.value)}
                        onCheckedChange={() => toggleTurno(turno.value)}
                      />
                      <span className="font-medium">{turno.label}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 pt-3 border-t">
                  <Checkbox
                    id="conferma-responsabilita"
                    checked={confermaResponsabilita}
                    onCheckedChange={(v) => setConfermaResponsabilita(v === true)}
                  />
                  <Label htmlFor="conferma-responsabilita" className="text-sm font-normal leading-tight cursor-pointer">
                    Confermo che il/i turno/i selezionato/i corrisponde/ono a quanto comunicato dallo staff animatori. Sono consapevole che questa scelta non è modificabile. *
                  </Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Indietro
              </Button>
              <Button onClick={nextStep} className="gap-2">
                Avanti <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Allergie/Patologie (solo se haAllergie === "si") */}
        {currentStep === 3 && showStep3 && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🏥 Dettaglio Allergie e Patologie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Allergie (dettaglio)</Label>
                  <Textarea value={allergieDettaglio} onChange={(e) => setAllergieDettaglio(e.target.value)} placeholder="Descrivi le allergie..." rows={3} />
                </div>
                <div>
                  <Label>Patologie (dettaglio)</Label>
                  <Textarea value={patologieDettaglio} onChange={(e) => setPatologieDettaglio(e.target.value)} placeholder="Descrivi le patologie..." rows={3} />
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
              <Button variant="outline" onClick={prevStep} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Indietro
              </Button>
              <Button onClick={() => { if (validateStep3()) nextStep(); }} className="gap-2">
                Avanti <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP REGOLAMENTO (final) */}
        {currentStep === regolamentoStep && (
          <div className="space-y-6">
            {/* Regole specifiche per ruolo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📜 Regolamento — {regolamentoRuolo.titolo}</CardTitle>
                <CardDescription>
                  Leggi attentamente le regole previste per il tuo ruolo nel campeggio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {regolamentoRuolo.regole.map((regola, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="text-primary font-bold mt-0.5 shrink-0">{i + 1}.</span>
                      <p className="text-muted-foreground leading-relaxed">{regola}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t">
                  <p className="text-sm font-medium italic text-foreground">{REGOLA_COMUNE}</p>
                </div>
              </CardContent>
            </Card>

            {/* Download documento completo */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">📄 Documento completo</CardTitle>
                <CardDescription>
                  Scarica il regolamento completo con tutte le figure del campeggio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="gap-2" asChild>
                  <a href="/regolamento-staff.pdf" target="_blank" rel="noopener noreferrer" download>
                    <Download className="h-4 w-4" />
                    Scarica regolamento (PDF)
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Firma e accettazione */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">✍️ Firma e Accettazione</CardTitle>
                <CardDescription>
                  Firmando, dichiari di aver letto e accettato il regolamento del campeggio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Nome e Cognome (firma) *</Label>
                  <Input
                    value={firmaNome || `${cognome} ${nome}`.trim()}
                    onChange={(e) => setFirmaNome(capitalize(e.target.value))}
                    placeholder="Cognome Nome"
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label>Data *</Label>
                  <Input
                    value={format(new Date(), "dd-MM-yyyy")}
                    readOnly
                    className="bg-muted"
                  />
                </div>

                <div className="flex items-start gap-2 pt-3 border-t">
                  <Checkbox
                    id="accetta-regolamento"
                    checked={accettaRegolamento}
                    onCheckedChange={(v) => setAccettaRegolamento(v === true)}
                  />
                  <Label htmlFor="accetta-regolamento" className="text-sm font-normal leading-tight cursor-pointer">
                    Dichiaro di aver letto, compreso e accettato integralmente il regolamento delle figure del Campeggio Unità Pastorale Altavilla Valmarana. Mi impegno a rispettare le regole e i doveri previsti per il mio ruolo. *
                  </Label>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={prevStep} className="gap-2">
                <ChevronLeft className="h-4 w-4" /> Indietro
              </Button>
              <Button onClick={() => { if (validateRegolamento()) setShowConfirm(true); }} className="gap-2">
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
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Stai per inviare la registrazione di <strong>{cognome} {nome}</strong> come <strong>{RUOLI.find(r => r.value === ruolo)?.label}</strong>.
                </p>
                <p>
                  Turno/i selezionato/i: <strong>{selectedTurni.map(t => TURNI.find(tt => tt.value === t)?.label).join(", ")}</strong>
                </p>
                <p>
                  Regolamento firmato da: <strong>{firmaNome}</strong> in data <strong>{firmaData ? format(firmaData, "dd/MM/yyyy") : ""}</strong>
                </p>
                <p>Vuoi procedere?</p>
              </div>
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
