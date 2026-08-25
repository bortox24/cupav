import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { FormField, FormResponse, useUpdateFormResponse } from '@/hooks/useForms';

interface EditResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  schema: FormField[];
  response: FormResponse | null;
}

export function EditResponseDialog({
  open,
  onOpenChange,
  formId,
  schema,
  response,
}: EditResponseDialogProps) {
  const updateResponse = useUpdateFormResponse();
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !response) return;
    const data = response.data as Record<string, unknown>;
    const initial: Record<string, string> = {};
    schema.forEach((field) => {
      if (field.type === 'divider') return;
      const raw = data[field.name];
      initial[field.name] = raw === null || raw === undefined ? '' : String(raw);
    });
    setValues(initial);
    setErrors({});
  }, [open, response, schema]);

  const setValue = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSave = async () => {
    if (!response) return;

    const newErrors: Record<string, string> = {};
    schema.forEach((field) => {
      if (field.type === 'divider' || !field.required) return;
      if (field.type === 'checkbox') {
        if (values[field.name] !== 'true') newErrors[field.name] = 'Campo obbligatorio';
      } else if (!(values[field.name] || '').trim()) {
        newErrors[field.name] = 'Questo campo è obbligatorio';
      }
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const payload: Record<string, unknown> = {
      ...(response.data as Record<string, unknown>),
    };
    schema.forEach((field) => {
      if (field.type === 'divider') return;
      payload[field.name] = values[field.name] ?? '';
    });

    await updateResponse.mutateAsync({ responseId: response.id, formId, data: payload });
    onOpenChange(false);
  };

  const renderField = (field: FormField) => {
    const hasError = !!errors[field.name];
    const errorText = hasError && (
      <p className="text-sm text-destructive">{errors[field.name]}</p>
    );
    const label = (
      <Label htmlFor={field.name} className={hasError ? 'text-destructive' : ''}>
        {field.label} {field.required && <span className="text-destructive">*</span>}
      </Label>
    );

    switch (field.type) {
      case 'divider':
        return (
          <div key={`divider-${field.name}`} className="pt-2 space-y-2 sm:col-span-2">
            {field.sectionTitle && (
              <p className="text-sm font-semibold text-foreground">{field.sectionTitle}</p>
            )}
            <Separator />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="space-y-2 sm:col-span-2">
            {label}
            <Textarea
              id={field.name}
              value={values[field.name] || ''}
              onChange={(e) => setValue(field.name, e.target.value)}
              className={hasError ? 'border-destructive' : ''}
              rows={3}
            />
            {errorText}
          </div>
        );

      case 'select':
        return (
          <div key={field.name} className="space-y-2">
            {label}
            <Select
              value={values[field.name] || ''}
              onValueChange={(v) => setValue(field.name, v)}
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
            {errorText}
          </div>
        );

      case 'radio':
        return (
          <div key={field.name} className="space-y-2">
            {label}
            <RadioGroup
              value={values[field.name] || ''}
              onValueChange={(v) => setValue(field.name, v)}
              className="flex flex-wrap gap-4"
            >
              {field.options?.map((option) => (
                <div key={option} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`edit-${field.name}-${option}`} />
                  <Label
                    htmlFor={`edit-${field.name}-${option}`}
                    className="font-normal cursor-pointer"
                  >
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {errorText}
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.name} className="space-y-2 sm:col-span-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id={field.name}
                checked={values[field.name] === 'true'}
                onCheckedChange={(checked) =>
                  setValue(field.name, checked ? 'true' : 'false')
                }
                className={hasError ? 'border-destructive' : ''}
              />
              <Label htmlFor={field.name} className="font-normal cursor-pointer">
                {field.label} {field.required && <span className="text-destructive">*</span>}
              </Label>
            </div>
            {errorText}
          </div>
        );

      default:
        return (
          <div key={field.name} className="space-y-2">
            {label}
            <Input
              id={field.name}
              type={field.type}
              value={values[field.name] || ''}
              onChange={(e) => setValue(field.name, e.target.value)}
              className={hasError ? 'border-destructive' : ''}
            />
            {errorText}
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>Modifica risposta</DialogTitle>
          <DialogDescription>
            Correggi i dati inseriti e salva per aggiornare la risposta.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          {schema.map((field) => renderField(field))}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateResponse.isPending}
          >
            Annulla
          </Button>
          <Button onClick={handleSave} disabled={updateResponse.isPending}>
            {updateResponse.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
