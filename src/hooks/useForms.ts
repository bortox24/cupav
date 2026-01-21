import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'date' | 'select' | 'radio' | 'textarea' | 'number' | 'email';
  required: boolean;
  options?: string[];
}

export interface Form {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  form_schema: FormField[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  data: Record<string, unknown>;
  created_at: string;
}

// Hook to get all forms (admin)
export function useForms() {
  return useQuery({
    queryKey: ['forms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as Form[];
    },
  });
}

// Hook to get a single form by slug (public)
export function useFormBySlug(slug: string) {
  return useQuery({
    queryKey: ['form', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      return data as unknown as Form;
    },
    enabled: !!slug,
  });
}

// Hook to get a single form by id (admin)
export function useFormById(id: string) {
  return useQuery({
    queryKey: ['form-by-id', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as unknown as Form;
    },
    enabled: !!id,
  });
}

// Hook to get form responses
export function useFormResponses(formId: string) {
  return useQuery({
    queryKey: ['form-responses', formId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('form_responses')
        .select('*')
        .eq('form_id', formId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as FormResponse[];
    },
    enabled: !!formId,
  });
}

// Hook to submit a form response (public)
export function useSubmitFormResponse() {
  return useMutation({
    mutationFn: async ({ formId, data }: { formId: string; data: Record<string, unknown> }) => {
      const { error } = await supabase
        .from('form_responses')
        .insert({ form_id: formId, data: data as unknown as Record<string, never> });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Grazie!',
        description: 'La tua risposta è stata registrata con successo.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile inviare la risposta. Riprova più tardi.',
        variant: 'destructive',
      });
      console.error('Error submitting form response:', error);
    },
  });
}

// Hook to create a new form
export function useCreateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (form: {
      name: string;
      slug: string;
      description?: string;
      form_schema: FormField[];
    }) => {
      const { data, error } = await supabase
        .from('forms')
        .insert({
          name: form.name,
          slug: form.slug,
          description: form.description,
          form_schema: form.form_schema as unknown as Record<string, never>,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Successo',
        description: 'Modulo creato correttamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile creare il modulo.',
        variant: 'destructive',
      });
      console.error('Error creating form:', error);
    },
  });
}

// Hook to update a form
export function useUpdateForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      form_schema,
      ...updates
    }: {
      id: string;
      name?: string;
      slug?: string;
      description?: string;
      is_active?: boolean;
      form_schema?: FormField[];
    }) => {
      const updateData: Record<string, unknown> = { ...updates };
      if (form_schema) {
        updateData.form_schema = form_schema as unknown as Record<string, never>;
      }
      
      const { error } = await supabase
        .from('forms')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Successo',
        description: 'Modulo aggiornato correttamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile aggiornare il modulo.',
        variant: 'destructive',
      });
      console.error('Error updating form:', error);
    },
  });
}

// Hook to delete a form
export function useDeleteForm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formId: string) => {
      const { error } = await supabase
        .from('forms')
        .delete()
        .eq('id', formId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      toast({
        title: 'Successo',
        description: 'Modulo eliminato correttamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare il modulo.',
        variant: 'destructive',
      });
      console.error('Error deleting form:', error);
    },
  });
}

// Hook to delete a form response
export function useDeleteFormResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (responseId: string) => {
      const { error } = await supabase
        .from('form_responses')
        .delete()
        .eq('id', responseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['form-responses'] });
      toast({
        title: 'Successo',
        description: 'Risposta eliminata correttamente.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Errore',
        description: 'Impossibile eliminare la risposta.',
        variant: 'destructive',
      });
      console.error('Error deleting form response:', error);
    },
  });
}
