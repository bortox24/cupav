import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, CheckCircle2, Mail, Facebook, PartyPopper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCustomLogo } from "@/hooks/useCustomLogo";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { calcolaContributoFesta, COSTO_FESTA_ADULTO, COSTO_FESTA_RAGAZZO, COSTO_FESTA_STAFF } from "@/hooks/useFestaCampeggio";

const capitalizeWords = (s: string) =>
  s.toLowerCase().replace(/(^|[\s'’\-])(\p{L})/gu, (_m, sep, ch) => sep + ch.toUpperCase());

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

export default function FestaCampeggio() {
  const { toast } = useToast();
  const logoUrl = useCustomLogo();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [nome, setNome] = useState("");
  const [cognome, setCognome] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [numAdulti, setNumAdulti] = useState(0);
  const [numRagazzi, setNumRagazzi] = useState(0);
  const [numStaff, setNumStaff] = useState(0);

  const contributo = useMemo(
    () => calcolaContributoFesta(numAdulti, numRagazzi, numStaff),
    [numAdulti, numRagazzi, numStaff]
  );

  const isValid = nome.trim() && cognome.trim() && email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSubmit = async () => {
    if (!isValid) {
      toast({ title: "Compila tutti i campi obbligatori", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        nome: capitalizeWords(nome.trim()),
        cognome: capitalizeWords(cognome.trim()),
        email: email.trim().toLowerCase(),
        telefono: telefono.trim() || null,
        num_adulti: numAdulti,
        num_ragazzi: numRagazzi,
        num_staff: numStaff,
        contributo,
        firma_data: format(new Date(), "yyyy-MM-dd"),
        firma_nome_cognome: `${capitalizeWords(nome.trim())} ${capitalizeWords(cognome.trim())}`,
      };
      const { error } = await (supabase as any).from("festa_campeggio").insert(payload);
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
      <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 to-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center shadow-xl rounded-2xl">
          <CardContent className="pt-10 pb-10 space-y-6">
            <div className="mx-auto w-20 h-20 bg-fuchsia-100 rounded-full flex items-center justify-center">
              <PartyPopper className="h-10 w-10 text-fuchsia-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Grazie per la tua adesione!</h2>
            <p className="text-muted-foreground">
              La tua iscrizione alla <strong>Festa Campeggio</strong> è stata registrata.
              {contributo > 0 && (
                <>
                  <br />Porta con te il contributo di <strong>{contributo}€</strong> in contanti.
                </>
              )}
            </p>
            <div className="bg-muted/40 rounded-xl p-4 text-sm space-y-2">
              <p className="font-semibold text-foreground">Per qualsiasi informazione</p>
              <p className="flex items-center justify-center gap-2">
                <Mail className="h-4 w-4 text-fuchsia-600" />
                <a href="mailto:cupavdirettivo@gmail.com" className="text-primary underline">cupavdirettivo@gmail.com</a>
              </p>
              <p className="flex items-center justify-center gap-2 text-muted-foreground">
                <Facebook className="h-4 w-4 text-fuchsia-600" />
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
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50 via-background to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-fuchsia-500 via-purple-500 to-pink-500 text-white py-6 px-4 shadow-lg">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center gap-3 sm:flex-row sm:text-left sm:gap-4">
          <img src={logoUrl} alt="CUPAV" className="h-20 w-20 sm:h-14 sm:w-14 rounded-xl bg-white/20 p-1" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold uppercase">Festa Campeggio</h1>
            <p className="text-white/90 text-sm">CUPAV — Campeggio Unità Pastorale Altavilla Valmarana</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Dati */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-fuchsia-100 text-fuchsia-600 rounded-full w-7 h-7 flex items-center justify-center text-sm">1</span>
              Anagrafica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(capitalizeWords(e.target.value))} placeholder="Mario" /></div>
              <div><Label>Cognome *</Label><Input value={cognome} onChange={e => setCognome(capitalizeWords(e.target.value))} placeholder="Rossi" /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Email *</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@esempio.it" /></div>
              <div><Label>Telefono</Label><Input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="+39 3xx xxx xxxx" /></div>
            </div>
          </CardContent>
        </Card>

        {/* Partecipanti */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-fuchsia-100 text-fuchsia-600 rounded-full w-7 h-7 flex items-center justify-center text-sm">2</span>
              Partecipanti
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Stepper label="Adulti" hint={`${COSTO_FESTA_ADULTO}€ a persona`} value={numAdulti} onChange={setNumAdulti} />
            <Stepper label="Ragazzi" hint={`${COSTO_FESTA_RAGAZZO}€ a persona`} value={numRagazzi} onChange={setNumRagazzi} />
            <Stepper label="Staff" hint={`${COSTO_FESTA_STAFF}€ a persona (animatori, responsabili, cucina, direttivo)`} value={numStaff} onChange={setNumStaff} />
          </CardContent>
        </Card>

        {/* Riepilogo */}
        <Card className="rounded-2xl border-fuchsia-300 bg-fuchsia-50/40 dark:bg-fuchsia-950/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span className="bg-fuchsia-100 text-fuchsia-600 rounded-full w-7 h-7 flex items-center justify-center text-sm">3</span>
              Riepilogo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-background rounded-xl p-3 shadow-sm">
                <p className="text-2xl font-bold text-foreground">{numAdulti + numRagazzi + numStaff}</p>
                <p className="text-xs text-muted-foreground">Persone</p>
              </div>
              <div className="bg-background rounded-xl p-3 shadow-sm col-span-2">
                <p className="text-2xl font-bold text-fuchsia-600">{contributo}€</p>
                <p className="text-xs text-muted-foreground">Contributo totale</p>
              </div>
            </div>
            {contributo > 0 && (
              <div className="text-sm text-muted-foreground space-y-1">
                {numAdulti > 0 && <p>Adulti: {numAdulti} × {COSTO_FESTA_ADULTO}€ = {numAdulti * COSTO_FESTA_ADULTO}€</p>}
                {numRagazzi > 0 && <p>Ragazzi: {numRagazzi} × {COSTO_FESTA_RAGAZZO}€ = {numRagazzi * COSTO_FESTA_RAGAZZO}€</p>}
                {numStaff > 0 && <p>Staff: {numStaff} × {COSTO_FESTA_STAFF}€ = {numStaff * COSTO_FESTA_STAFF}€</p>}
              </div>
            )}
            <div className="pt-2">
              <p className="text-sm font-medium text-foreground">Firma digitale</p>
              <p className="text-sm text-muted-foreground">
                Confermo l'adesione a nome di <strong>{nome.trim() && cognome.trim() ? `${capitalizeWords(nome.trim())} ${capitalizeWords(cognome.trim())}` : '...'}</strong> in data {format(new Date(), 'dd/MM/yyyy', { locale: it })}.
              </p>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 text-white rounded-xl"
              size="lg"
            >
              {submitting ? "Invio in corso..." : "Conferma adesione"}
            </Button>
            {!isValid && <p className="text-xs text-center text-muted-foreground">Compila nome, cognome ed email obbligatori.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
