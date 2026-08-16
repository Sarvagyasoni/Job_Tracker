import { useState, useCallback } from 'react';
import type { ApiError } from '../types';

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => Promise<{ success: boolean; error?: string }>;
}

export function useForm<T extends Record<string, unknown>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = useCallback(
    (name: keyof T, value: unknown) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      if (touched[name]) {
        const fieldErrors = validate ? validate({ ...values, [name]: value }) : {};
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      if (submitError) setSubmitError(null);
    },
    [values, touched, validate, submitError]
  );

  const handleBlur = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      if (validate) {
        const fieldErrors = validate(values);
        setErrors(fieldErrors);
      }
    },
    [values, validate]
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setIsSubmitting(true);
      setSubmitError(null);
      setIsSuccess(false);

      const validationErrors = validate ? validate(values) : {};
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        const allTouched = Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {}) as Partial<Record<keyof T, boolean>>;
        setTouched(allTouched);
        setIsSubmitting(false);
        return;
      }

      try {
        const result = await onSubmit(values);
        if (result.success) {
          setIsSuccess(true);
          setValues(initialValues);
          setTouched({});
          setErrors({});
        } else {
          setSubmitError(result.error || 'Submission failed');
        }
      } catch (error) {
        const apiError = error as ApiError;
        if (apiError.fieldErrors) {
          const typedErrors = apiError.fieldErrors as Partial<Record<keyof T, string>>;
          setErrors(typedErrors);
        }
        setSubmitError(apiError.message || 'An error occurred');
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit, initialValues]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setSubmitError(null);
    setIsSuccess(false);
  }, [initialValues]);

  const setFieldError = useCallback((name: keyof T, error: string) => {
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    submitError,
    isSuccess,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldError,
    setValues,
  };
}