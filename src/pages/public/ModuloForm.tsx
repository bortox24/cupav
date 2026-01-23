import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useFormBySlug, useSubmitFormResponse, FormField } from '@/hooks/useForms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import logoCupav from '@/assets/logo-cupav.png';

// Configurazione video per moduli specifici
const VIDEO_CONFIG: Record<string, { videoId: string; autoplay?: boolean }> = {
  'campeggio-2026': {
    videoId: 'b8gB4XSxJ1c',
    autoplay: true,
  },
};

// Componente per la sezione video YouTube
function YouTubeVideoSection({ videoId, autoplay = false }: { videoId: string; autoplay?: boolean }) {
  const embedUrl = autoplay 
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&modestbranding=1&rel=0&showinfo=0&controls=1`
    : `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&controls=1`;
  
  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="aspect-video rounded-lg overflow-hidden shadow-lg">
        <iframe
          src={embedUrl}
          title="Video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    </div>
  );
}

export default function ModuloForm() {
  const { slug } = useParams<{ slug: string }>();
  const { data: form, isLoading, error } = useFormBySlug(slug || '');
  const submitResponse = useSubmitFormResponse();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update document title when form loads
  useEffect(() => {
    if (form?.name) {
      document.title = form.name;
    }
    return () => {
      document.title = 'CUPAV';
    };
  }, [form?.name]);

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    // Clear validation error when user types
    if (validationErrors[fieldName]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!form) return false;

    const errors: Record<string, string> = {};
    const schema = form.form_schema as FormField[];

    schema.forEach((field) => {
      if (field.required) {
        if (field.type === 'checkbox') {
          if (formData[field.name] !== 'true') {
            errors[field.name] = 'Devi accettare per continuare';
          }
        } else if (!formData[field.name]?.trim()) {
          errors[field.name] = 'Questo campo è obbligatorio';
        }
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form || !validateForm()) return;

    await submitResponse.mutateAsync({
      formId: form.id,
      data: formData,
    });

    // Chiamata webhook n8n se configurato
    if (form.webhook_url) {
      try {
        await fetch(form.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          mode: 'no-cors',
          body: JSON.stringify({
            formName: form.name,
            formSlug: slug,
            formId: form.id,
            submittedAt: new Date().toISOString(),
            data: formData,
          }),
        });
      } catch (error) {
        console.error('Errore webhook n8n:', error);
        // Non blocca il successo del form
      }
    }

    setSubmitted(true);
  };

  const renderField = (field: FormField) => {
    const hasError = !!validationErrors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className={hasError ? 'text-destructive' : ''}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={formData[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-sm text-destructive">{validationErrors[field.name]}</p>}
          </div>
        );

      case 'date':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className={hasError ? 'text-destructive' : ''}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              value={formData[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={`w-full min-h-[40px] ${hasError ? 'border-destructive' : ''}`}
            />
            {hasError && <p className="text-sm text-destructive">{validationErrors[field.name]}</p>}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className={hasError ? 'text-destructive' : ''}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={formData[field.name] || ''}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className={hasError ? 'border-destructive' : ''}
            />
            {hasError && <p className="text-sm text-destructive">{validationErrors[field.name]}</p>}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name} className={hasError ? 'text-destructive' : ''}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={formData[field.name] || ''}
              onValueChange={(value) => handleFieldChange(field.name, value)}
            >
              <SelectTrigger className={hasError ? 'border-destructive' : ''}>
                <SelectValue placeholder="Seleziona un'opzione" />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && <p className="text-sm text-destructive">{validationErrors[field.name]}</p>}
          </div>
        );

      case 'radio':
        return (
          <div key={field.name} className="space-y-2">
            <Label className={hasError ? 'text-destructive' : ''}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <RadioGroup
              value={formData[field.name] || ''}
              onValueChange={(value) => handleFieldChange(field.name, value)}
              className="flex flex-wrap gap-4"
            >
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${field.name}-${option}`} />
                  <Label htmlFor={`${field.name}-${option}`} className="font-normal cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {hasError && <p className="text-sm text-destructive">{validationErrors[field.name]}</p>}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="space-y-2">
            <div className="flex items-start space-x-3">
              <Checkbox
                id={field.name}
                checked={formData[field.name] === 'true'}
                onCheckedChange={(checked) => 
                  handleFieldChange(field.name, checked ? 'true' : 'false')
                }
                className={hasError ? 'border-destructive' : ''}
              />
              <div className="grid gap-1.5 leading-none">
                <Label 
                  htmlFor={field.name} 
                  className={`font-normal cursor-pointer ${hasError ? 'text-destructive' : ''}`}
                >
                  {field.label} {field.required && <span className="text-destructive">*</span>}
                </Label>
              </div>
            </div>
            {hasError && <p className="text-sm text-destructive">{validationErrors[field.name]}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="bg-card border-b border-border shadow-sm">
          <div className="container mx-auto px-4 py-6 flex items-center justify-between">
            <div className="w-9" />
            <img src={logoCupav} alt="Logo CUPAV" className="h-24 md:h-28 w-auto object-contain" />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle>Modulo non trovato</CardTitle>
              <CardDescription>
                Il modulo richiesto non esiste o non è più attivo.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <header className="bg-card border-b border-border shadow-sm">
          <div className="container mx-auto px-4 py-6 flex items-center justify-between">
            <div className="w-9" />
            <img src={logoCupav} alt="Logo CUPAV" className="h-24 md:h-28 w-auto object-contain" />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardHeader>
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle>Grazie!</CardTitle>
              <CardDescription>
                La tua risposta è stata registrata con successo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => { setSubmitted(false); setFormData({}); }}>
                Invia un'altra risposta
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const schema = form.form_schema as FormField[];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="w-9" />
          <img src={logoCupav} alt="Logo CUPAV" className="h-24 md:h-28 w-auto object-contain" />
          <ThemeToggle />
        </div>
      </header>

      {/* Video section - solo per moduli configurati */}
      {slug && VIDEO_CONFIG[slug] && (
        <YouTubeVideoSection
          videoId={VIDEO_CONFIG[slug].videoId}
          autoplay={VIDEO_CONFIG[slug].autoplay}
        />
      )}

      <main className="flex-1 container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl md:text-2xl">{form.name}</CardTitle>
            {form.description && (
              <CardDescription>{form.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {schema.map(renderField)}

              <Button
                type="submit"
                className="w-full"
                disabled={submitResponse.isPending}
              >
                {submitResponse.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Invio in corso...
                  </>
                ) : (
                  'Invia'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-card border-t border-border py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} CUPAV
        </div>
      </footer>
    </div>
  );
}
