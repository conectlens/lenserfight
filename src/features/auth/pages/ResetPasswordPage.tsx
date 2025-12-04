
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AuthCard } from '../components/AuthCard';
import { InputField } from '../components/InputField';
import { Button } from '../../../components/Button';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { isRequired, minLength } from '../../../utils/validation';
import { FormError } from '../../../components/FormError';
import { ArrowLeft } from 'lucide-react';

export const ResetPasswordPage: React.FC = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Try to get token from query params (Mock) or hash (Supabase often puts it there, though auth lib handles it)
  // For the purpose of this mock/stub dual implementation, we look at query params mainly for the Mock.
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
        setToken(tokenParam);
    }
  }, [searchParams]);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });

  const { errors, validate, clearError, setErrors } = useFormValidation<typeof formData>({
    password: [isRequired(), minLength(6)],
    confirmPassword: [isRequired()]
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    clearError(name as keyof typeof formData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate(formData)) return;

    if (formData.password !== formData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
      return;
    }

    setLoading(true);
    try {
      // If mock, token is required. If Supabase, token might be null but session active.
      // We pass the token found in URL if any.
      await resetPassword(formData.password, token || undefined);
      
      window.alert("Password updated successfully!");
      navigate('/login');
    } catch (err: any) {
      setApiError(err.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10">
        <Link to="/" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-white/80">
           <ArrowLeft size={16} />
           Back to Dashboard
        </Link>
      </div>
      <AuthCard title="Set New Password" subtitle="Choose a strong password for your account">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <InputField
              label="New Password"
              name="password"
              type="password"
              placeholder="Enter new password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
            />
            <FormError message={errors.password} />
          </div>

          <div>
            <InputField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
            />
            <FormError message={errors.confirmPassword} />
          </div>

          {apiError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{apiError}</div>}

          <Button type="submit" isLoading={loading} className="mt-2 text-base font-semibold">
            Update Password
          </Button>
        </form>
      </AuthCard>
    </div>
  );
};
