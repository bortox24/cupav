import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CalendarIcon, Loader2, Save } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTransaction } from '@/hooks/useTransactions';
import type { Database } from '@/integrations/supabase/types';

type TransactionType = Database['public']['Enums']['transaction_type'];

const formSchema = z.object({
  causale: z.string().min(3, 'La causale deve avere almeno 3 caratteri').max(500, 'Massimo 500 caratteri'),
  importo: z.string().refine((val) => {
    const num = parseFloat(val.replace(',', '.'));
    return !isNaN(num) && num > 0;
  }, 'Inserisci un importo valido maggiore di 0'),
  data_transazione: z.date({ required_error: 'Seleziona una data' }),
  tipologia: z.enum(['spesa', 'prelievo', 'entrata'], { required_error: 'Seleziona una tipologia' }),
  category_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const tipologiaLabels: Record<TransactionType, string> = {
  spesa: 'Spesa',
  prelievo: 'Prelievo',
  entrata: 'Entrata',
};

export default function RegistrazioneSpesePrelievi() {
  const [selectedTipologia, setSelectedTipologia] = useState<TransactionType | null>(null);
  
  const { data: categories, isLoading: loadingCategories } = useCategories(selectedTipologia || undefined);
  const createTransaction = useCreateTransaction();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      causale: '',
      importo: '',
      data_transazione: new Date(),
      tipologia: undefined,
      category_id: undefined,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const importo = parseFloat(values.importo.replace(',', '.'));
    
    await createTransaction.mutateAsync({
      causale: values.causale,
      importo,
      data_transazione: format(values.data_transazione, 'yyyy-MM-dd'),
      tipologia: values.tipologia as TransactionType,
      category_id: values.category_id || null,
    });

    form.reset({
      causale: '',
      importo: '',
      data_transazione: new Date(),
      tipologia: undefined,
      category_id: undefined,
    });
    setSelectedTipologia(null);
  };

  return (
    <MainLayout title="Registrazione Spese e Prelievi">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Nuova Transazione</CardTitle>
            <CardDescription>
              Compila il modulo per registrare una nuova spesa, prelievo o entrata
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Causale */}
                <FormField
                  control={form.control}
                  name="causale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Causale</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Es: Acquisto materiale per attività"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Descrivi brevemente la transazione
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Importo */}
                <FormField
                  control={form.control}
                  name="importo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Importo (€)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="0,00"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data Transazione */}
                <FormField
                  control={form.control}
                  name="data_transazione"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data Transazione</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: it })
                              ) : (
                                <span>Seleziona una data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tipologia */}
                <FormField
                  control={form.control}
                  name="tipologia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipologia</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedTipologia(value as TransactionType);
                          form.setValue('category_id', undefined);
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleziona tipologia" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(tipologiaLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Categoria (dinamica) */}
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={!selectedTipologia || loadingCategories}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={
                              !selectedTipologia 
                                ? 'Seleziona prima la tipologia' 
                                : loadingCategories 
                                  ? 'Caricamento...' 
                                  : 'Seleziona categoria'
                            } />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Le categorie cambiano in base alla tipologia selezionata
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={createTransaction.isPending}
                >
                  {createTransaction.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrazione in corso...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Registra
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
