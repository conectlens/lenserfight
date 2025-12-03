import React from 'react';

interface InputFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const InputField: React.FC<InputFieldProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        className={`w-full px-4 py-2.5 rounded-lg border bg-white text-gray-900 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none ${error ? 'border-red-500' : 'border-gray-200'} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};