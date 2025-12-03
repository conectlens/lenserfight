
import { useState } from 'react';
import { Validator } from '../utils/validation';

type ValidationRules<T> = Partial<Record<keyof T, Validator[]>>;
type ValidationErrors<T> = Partial<Record<keyof T, string>>;

export const useFormValidation = <T extends Record<string, any>>(rules: ValidationRules<T>) => {
  const [errors, setErrors] = useState<ValidationErrors<T>>({});

  const validate = (formData: T): boolean => {
    const newErrors: ValidationErrors<T> = {};
    let isValid = true;

    (Object.keys(rules) as Array<keyof T>).forEach((key) => {
      const fieldValidators = rules[key];
      const value = formData[key];

      if (fieldValidators) {
        for (const validator of fieldValidators) {
          const error = validator(value);
          if (error) {
            newErrors[key] = error;
            isValid = false;
            break; // Stop at the first error for this field
          }
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const clearError = (key: keyof T) => {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  return {
    errors,
    validate,
    clearError,
    setErrors // Expose in case manual error setting is needed (e.g., API errors)
  };
};
