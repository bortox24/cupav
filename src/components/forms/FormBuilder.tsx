import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField, Form, useCreateForm, useUpdateForm } from '@/hooks/useForms';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';

const fieldTypes = [
  { value: 'text', label: 'Testo' },
  { value: 'email', label: 'Email' },
  { value: 'number', label: 'Numero' },
  { value: 'date', label: 'Data' },
  { value: 'textarea', label: 'Testo lungo' },
  { value: 'select', label: 'Menu a tendina' },
  { value: 'radio', label: 'Scelta singola' },
  { value: 'checkbox', label: 'Checkbox (accettazione)' },
] as const;

interface FormBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editForm?: Form | null;
}

export function FormBuilder({ open, onOpenChange, editForm }: FormBuilderProps) {
  const createForm = useCreateForm();
  const updateFormMutation = useUpdateForm();
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<FormField[]>([]);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  // Field editor state
  const [fieldName, setFieldName] = useState('');
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<FormField['type']>('text');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptions, setFieldOptions] = useState('');

  const isEditMode = !!editForm;

  // Populate form when editing
  useEffect(() => {
    if (editForm) {
      setFormName(editForm.name);
      setFormSlug(editForm.slug);
      setFormDescription(editForm.description || '');
      setFields(editForm.form_schema || []);
    } else {
      resetForm();
    }
  }, [editForm, open]);

  const resetForm = () => {
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFields([]);
  };

  const resetFieldEditor = () => {
    setFieldName('');
    setFieldLabel('');
    setFieldType('text');
    setFieldRequired(false);
    setFieldOptions('');
    setEditingField(null);
    setEditingIndex(null);
    setShowFieldEditor(false);
  };

  const handleAddField = () => {
    resetFieldEditor();
    setShowFieldEditor(true);
  };

  const handleEditField = (field: FormField, index: number) => {
    setFieldName(field.name);
    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldRequired(field.required);
    setFieldOptions(field.options?.join('\n') || '');
    setEditingField(field);
    setEditingIndex(index);
    setShowFieldEditor(true);
  };

  const handleSaveField = () => {
    const newField: FormField = {
      name: fieldName.toLowerCase().replace(/\s+/g, '_'),
      label: fieldLabel,
      type: fieldType,
      required: fieldRequired,
      ...(fieldType === 'select' || fieldType === 'radio'
        ? { options: fieldOptions.split('\n').filter((o) => o.trim()) }
        : {}),
    };

    if (editingIndex !== null) {
      const updated = [...fields];
      updated[editingIndex] = newField;
      setFields(updated);
    } else {
      setFields([...fields, newField]);
    }
    resetFieldEditor();
  };

  const handleDeleteField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleMoveField = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= fields.length) return;

    const updated = [...fields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFields(updated);
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormName(name);
    // Only auto-generate slug for new forms
    if (!isEditMode && (!formSlug || formSlug === generateSlug(formName))) {
      setFormSlug(generateSlug(name));
    }
  };

  const handleSubmit = async () => {
    if (!formName || !formSlug || fields.length === 0) return;

    if (isEditMode && editForm) {
      await updateFormMutation.mutateAsync({
        id: editForm.id,
        name: formName,
        slug: formSlug,
        description: formDescription || undefined,
        form_schema: fields,
      });
    } else {
      await createForm.mutateAsync({
        name: formName,
        slug: formSlug,
        description: formDescription || undefined,
        form_schema: fields,
      });
    }

    // Reset and close
    resetForm();
    onOpenChange(false);
  };

  const isValid = formName && formSlug && fields.length > 0;
  const isPending = createForm.isPending || updateFormMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Modifica modulo' : 'Crea nuovo modulo'}</DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Modifica i campi e le impostazioni del modulo.'
              : 'Configura il tuo modulo personalizzato aggiungendo i campi necessari.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Form metadata */}
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="form-name">Nome modulo *</Label>
                <Input
                  id="form-name"
                  placeholder="es. Iscrizione evento"
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-slug">Slug URL *</Label>
                <Input
                  id="form-slug"
                  placeholder="es. iscrizione-evento"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  disabled={isEditMode} // Can't change slug when editing
                />
                <p className="text-xs text-muted-foreground">
                  URL: /modulo/{formSlug || 'slug'}
                  {isEditMode && ' (non modificabile)'}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="form-description">Descrizione</Label>
              <Textarea
                id="form-description"
                placeholder="Descrivi brevemente lo scopo del modulo..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Fields section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Campi del modulo</Label>
              <Button variant="outline" size="sm" onClick={handleAddField}>
                <Plus className="h-4 w-4 mr-1" />
                Aggiungi campo
              </Button>
            </div>

            {fields.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Nessun campo aggiunto. Clicca "Aggiungi campo" per iniziare.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <Card key={index} className="relative">
                    <CardContent className="flex items-center gap-4 py-3 px-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveField(index, 'up')}
                          disabled={index === 0}
                        >
                          <GripVertical className="h-4 w-4 rotate-90" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleMoveField(index, 'down')}
                          disabled={index === fields.length - 1}
                        >
                          <GripVertical className="h-4 w-4 rotate-90" />
                        </Button>
                      </div>
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => handleEditField(field, index)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{field.label}</span>
                          {field.required && (
                            <Badge variant="secondary" className="text-xs">
                              Obbligatorio
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {fieldTypes.find((t) => t.value === field.type)?.label} •{' '}
                          {field.name}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Field editor dialog */}
          <Dialog open={showFieldEditor} onOpenChange={setShowFieldEditor}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingField ? 'Modifica campo' : 'Nuovo campo'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="field-label">Etichetta *</Label>
                  <Input
                    id="field-label"
                    placeholder="es. Nome completo"
                    value={fieldLabel}
                    onChange={(e) => {
                      setFieldLabel(e.target.value);
                      if (!fieldName || fieldName === fieldLabel.toLowerCase().replace(/\s+/g, '_')) {
                        setFieldName(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-name">Nome campo (ID)</Label>
                  <Input
                    id="field-name"
                    placeholder="es. nome_completo"
                    value={fieldName}
                    onChange={(e) => setFieldName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Identificativo tecnico del campo (senza spazi)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="field-type">Tipo campo</Label>
                  <Select value={fieldType} onValueChange={(v) => setFieldType(v as FormField['type'])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(fieldType === 'select' || fieldType === 'radio') && (
                  <div className="space-y-2">
                    <Label htmlFor="field-options">Opzioni (una per riga)</Label>
                    <Textarea
                      id="field-options"
                      placeholder="Opzione 1&#10;Opzione 2&#10;Opzione 3"
                      value={fieldOptions}
                      onChange={(e) => setFieldOptions(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="field-required"
                    checked={fieldRequired}
                    onCheckedChange={setFieldRequired}
                  />
                  <Label htmlFor="field-required">Campo obbligatorio</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetFieldEditor}>
                  Annulla
                </Button>
                <Button
                  onClick={handleSaveField}
                  disabled={!fieldLabel || !fieldName}
                >
                  {editingField ? 'Salva modifiche' : 'Aggiungi'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isPending}>
            {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditMode ? 'Salva modifiche' : 'Crea modulo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
