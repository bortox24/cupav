import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { submitPreiscrizione } from '@/hooks/useRagazzi';
import { useCustomLogo } from '@/hooks/useCustomLogo';
import { useSiteSettings } from '@/hooks/useSiteSettings';

const TURNI = [
  '4^ Elementare',
  '5^ Elementare',
  '1^ Media',
  '2^ Media',
  '3^ Media',
];

export default function PreiscrizioneCupav() {
  const logoUrl = useCustomLogo();
  const { data: siteSettings, isLoading: settingsLoading } = useSiteSettings();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [nomeCognome, setNomeCognome] = useState('');
  const [dataNascita, setDataNascita] = useState('');
  const [turno, setTurno] = useState('');
  const [residente, setResidente] = useState('');

  const [g1Nome, setG1Nome] = useState('');
  const [g1Ruolo, setG1Ruolo] = useState('');
  const [g1Email, setG1Email] = useState('');
  const [g1Telefono, setG1Telefono] = useState('');

  const [g2Nome, setG2Nome] = useState('');
  const [g2Ruolo, setG2Ruolo] = useState('');
  const [g2Email, setG2Email] = useState('');
  const [g2Telefono, setG2Telefono] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!nomeCognome.trim()) e.nomeCognome = 'Obbligatorio';
    if (!dataNascita) e.dataNascita = 'Obbligatorio';
    if (!turno) e.turno = 'Obbligatorio';
    if (!residente) e.residente = 'Obbligatorio';
    if (!g1Nome.trim()) e.g1Nome = 'Obbligatorio';
    if (!g1Ruolo) e.g1Ruolo = 'Obbligatorio';
    if (!g1Email.trim()) e.g1Email = 'Obbligatorio';
    if (!g1Telefono.trim()) e.g1Telefono = 'Obbligatorio';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await submitPreiscrizione({
        fullName: nomeCognome.trim(),
        dataNascita,
        turno,
        residenteAltavilla: residente === 'si',
        genitore1: { nomeCognome: g1Nome, ruolo: g1Ruolo, email: g1Email, telefono: g1Telefono },
        genitore2: g2Nome ? { nomeCognome: g2Nome, ruolo: g2Ruolo, email: g2Email, telefono: g2Telefono } : undefined,
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const clearError = (field: string) => {
    if (errors[field]) setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const capitalizeWords = useCallback((value: string) => {
    return value.replace(/\b\w/g, (char) => char.toUpperCase());
  }, []);

  const header = (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-6 flex items-center justify-between">
        <div className="w-9" />
        <img src={logoUrl} alt="Logo CUPAV" className="h-24 md:h-28 w-auto object-contain" />
        <ThemeToggle />
      </div>
    </header>
  );

  const footer = (
    <footer className="bg-card border-t border-border py-4">
      <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} CUPAV
      </div>
    </footer>
  );

  // Check if preiscrizioni are disabled
  if (!settingsLoading && siteSettings?.preiscrizione_enabled === 'false') {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {header}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <CardTitle>Preiscrizioni chiuse</CardTitle>
              <CardDescription>Le preiscrizioni sono attualmente chiuse. Riprova più tardi.</CardDescription>
            </CardHeader>
          </Card>
        </main>
        {footer}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {header}
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle>Grazie!</CardTitle>
              <CardDescription>La preiscrizione è stata registrata con successo.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => { setSubmitted(false); setNomeCognome(''); setDataNascita(''); setTurno(''); setResidente(''); setG1Nome(''); setG1Ruolo(''); setG1Email(''); setG1Telefono(''); setG2Nome(''); setG2Ruolo(''); setG2Email(''); setG2Telefono(''); }}>
                Invia un'altra preiscrizione
              </Button>
            </CardContent>
          </Card>
        </main>
        {footer}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {header}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">Preiscrizione CUPAV 2026</CardTitle>
            <CardDescription>Compila il modulo per preiscrivere il/la ragazzo/a al campeggio.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Sezione Ragazzo */}
              <div className="bg-card rounded-xl p-5 md:p-6 space-y-6 border border-border shadow-md">
                <h3 className="text-lg font-semibold text-foreground">Dati ragazzo/a</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={errors.nomeCognome ? 'text-destructive' : ''}>Nome e Cognome <span className="text-destructive">*</span></Label>
                    <Input value={nomeCognome} onChange={(e) => { setNomeCognome(capitalizeWords(e.target.value)); clearError('nomeCognome'); }} className={errors.nomeCognome ? 'border-destructive' : ''} />
                    {errors.nomeCognome && <p className="text-sm text-destructive">{errors.nomeCognome}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className={errors.dataNascita ? 'text-destructive' : ''}>Data di nascita <span className="text-destructive">*</span></Label>
                    <Input type="date" value={dataNascita} onChange={(e) => { setDataNascita(e.target.value); clearError('dataNascita'); }} className={`w-full min-h-[40px] ${errors.dataNascita ? 'border-destructive' : ''}`} />
                    {errors.dataNascita && <p className="text-sm text-destructive">{errors.dataNascita}</p>}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className={errors.turno ? 'text-destructive' : ''}>Turno <span className="text-destructive">*</span></Label>
                  <RadioGroup value={turno} onValueChange={(v) => { setTurno(v); clearError('turno'); }} className="flex flex-wrap gap-4">
                    {TURNI.map((t) => (
                      <div key={t} className="flex items-center space-x-2">
                        <RadioGroupItem value={t} id={`turno-${t}`} />
                        <Label htmlFor={`turno-${t}`} className="font-normal cursor-pointer">{t}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                  {errors.turno && <p className="text-sm text-destructive">{errors.turno}</p>}
                </div>
                <div className="space-y-2">
                  <Label className={errors.residente ? 'text-destructive' : ''}>Residente ad Altavilla Vicentina? <span className="text-destructive">*</span></Label>
                  <RadioGroup value={residente} onValueChange={(v) => { setResidente(v); clearError('residente'); }} className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="si" id="residente-si" />
                      <Label htmlFor="residente-si" className="font-normal cursor-pointer">Sì</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="residente-no" />
                      <Label htmlFor="residente-no" className="font-normal cursor-pointer">No</Label>
                    </div>
                  </RadioGroup>
                  {errors.residente && <p className="text-sm text-destructive">{errors.residente}</p>}
                </div>
              </div>

              {/* Sezione Genitore 1 */}
              <div className="bg-card rounded-xl p-5 md:p-6 space-y-6 border border-border shadow-md">
                <h3 className="text-lg font-semibold text-foreground">Dati Genitore 1</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={errors.g1Nome ? 'text-destructive' : ''}>Nome e Cognome <span className="text-destructive">*</span></Label>
                    <Input value={g1Nome} onChange={(e) => { setG1Nome(capitalizeWords(e.target.value)); clearError('g1Nome'); }} className={errors.g1Nome ? 'border-destructive' : ''} />
                    {errors.g1Nome && <p className="text-sm text-destructive">{errors.g1Nome}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className={errors.g1Ruolo ? 'text-destructive' : ''}>Chi? <span className="text-destructive">*</span></Label>
                    <RadioGroup value={g1Ruolo} onValueChange={(v) => { setG1Ruolo(v); clearError('g1Ruolo'); }} className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Mamma" id="g1-mamma" />
                        <Label htmlFor="g1-mamma" className="font-normal cursor-pointer">Mamma</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Papà" id="g1-papa" />
                        <Label htmlFor="g1-papa" className="font-normal cursor-pointer">Papà</Label>
                      </div>
                    </RadioGroup>
                    {errors.g1Ruolo && <p className="text-sm text-destructive">{errors.g1Ruolo}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className={errors.g1Email ? 'text-destructive' : ''}>Email <span className="text-destructive">*</span></Label>
                    <Input type="email" value={g1Email} onChange={(e) => { setG1Email(e.target.value); clearError('g1Email'); }} className={errors.g1Email ? 'border-destructive' : ''} />
                    {errors.g1Email && <p className="text-sm text-destructive">{errors.g1Email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className={errors.g1Telefono ? 'text-destructive' : ''}>Telefono <span className="text-destructive">*</span></Label>
                    <Input type="tel" value={g1Telefono} onChange={(e) => { setG1Telefono(e.target.value); clearError('g1Telefono'); }} className={errors.g1Telefono ? 'border-destructive' : ''} />
                    {errors.g1Telefono && <p className="text-sm text-destructive">{errors.g1Telefono}</p>}
                  </div>
                </div>
              </div>

              {/* Sezione Genitore 2 (opzionale) */}
              <div className="bg-card rounded-xl p-5 md:p-6 space-y-6 border border-border shadow-md">
                <h3 className="text-lg font-semibold text-foreground">Dati Genitore 2 <span className="text-sm font-normal text-muted-foreground">(opzionale)</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Nome e Cognome</Label>
                    <Input value={g2Nome} onChange={(e) => setG2Nome(capitalizeWords(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Chi?</Label>
                    <RadioGroup value={g2Ruolo} onValueChange={setG2Ruolo} className="flex flex-wrap gap-4">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Mamma" id="g2-mamma" />
                        <Label htmlFor="g2-mamma" className="font-normal cursor-pointer">Mamma</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Papà" id="g2-papa" />
                        <Label htmlFor="g2-papa" className="font-normal cursor-pointer">Papà</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={g2Email} onChange={(e) => setG2Email(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input type="tel" value={g2Telefono} onChange={(e) => setG2Telefono(e.target.value)} />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Invio in corso...</>
                ) : 'Invia preiscrizione'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
      {footer}
    </div>
  );
}
