
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AuthCard } from '../components/AuthCard';
import { InputField } from '../components/InputField';
import { Button } from '../../../components/Button';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { isRequired, isEmail } from '../../../utils/validation';
import { FormError } from '../../../components/FormError';
import { ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { requestPasswordReset } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
  });

  const { errors, validate, clearError } = useFormValidation<typeof formData>({
    email: [isRequired(), isEmail()],
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    clearError(name as keyof typeof formData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setSuccess(false);

    if (!validate(formData)) return;

    setLoading(true);
    try {
      await requestPasswordReset(formData.email);
      setSuccess(true);
      // For mock purposes, console.log is handled in repository
    } catch (err: any) {
      setApiError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
        <AuthCard title="Check your email" subtitle="We sent you a reset link">
            <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="text-gray-600 mb-6">
                    If an account exists for <strong>{formData.email}</strong>, you will receive instructions to reset your password.
                </p>
                <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg mb-6 text-left">
                    <strong>Mock Mode Tip:</strong> Check your browser console (F12) for the reset link.
                </div>
                <Link to="/login">
                    <Button>Return to Sign In</Button>
                </Link>
            </div>
        </AuthCard>
    );
  }

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10">
        <Link to="/" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-white/80">
           <ArrowLeft size={16} />
           Back to Dashboard
        </Link>
      </div>
      <AuthCard title="Reset Password" subtitle="Enter your email to receive instructions">
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <InputField
              label="Email Address"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
            />
            <FormError message={errors.email} />
          </div>

          {apiError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{apiError}</div>}

          <Button type="submit" isLoading={loading} className="mt-2 text-base font-semibold">
            Send Reset Link
          </Button>
        </form>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-gray-900 hover:underline flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Sign In
          </Link>
        </div>
      </AuthCard>
    </div>
  );
};
