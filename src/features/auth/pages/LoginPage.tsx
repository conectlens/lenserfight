
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AuthCard } from '../components/AuthCard';
import { InputField } from '../components/InputField';
import { Button } from '../../../components/Button';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { isRequired, isEmail } from '../../../utils/validation';
import { FormError } from '../../../components/FormError';
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, signInWithOAuth } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const { errors, validate, clearError, setErrors } = useFormValidation<typeof formData>({
    email: [isRequired(), isEmail()],
    password: [isRequired()]
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    clearError(name as keyof typeof formData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validate(formData)) return;

    setLoading(true);
    try {
      await login(formData.email, formData.password);
      navigate('/app');
    } catch (err: any) {
      setApiError(err.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'github' | 'azure') => {
    setApiError(null);
    try {
      await signInWithOAuth(provider);
    } catch (err: any) {
      setApiError(err.message || `Failed to connect with ${provider}`);
    }
  };

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10">
        <Link to="/app" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-white/80">
           <ArrowLeft size={16} />
           Back to Dashboard
        </Link>
      </div>
      <AuthCard title="Sign In" subtitle="Continue your creative journey">
        <div className="mb-6 grid grid-cols-3 gap-3">
          <button 
            type="button"
            onClick={() => handleOAuth('google')}
            className="flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm"
            title="Sign in with Google"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </button>
          <button 
            type="button"
            onClick={() => handleOAuth('azure')}
            className="flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm"
            title="Sign in with Microsoft"
          >
            <svg className="w-5 h-5" viewBox="0 0 21 21">
              <path fill="#f25022" d="M1 1h9v9H1z"/><path fill="#00a4ef" d="M1 11h9v9H1z"/><path fill="#7fba00" d="M11 1h9v9h-9z"/><path fill="#ffb900" d="M11 11h9v9h-9z"/>
            </svg>
          </button>
          <button 
            type="button"
            onClick={() => handleOAuth('github')}
            className="flex items-center justify-center py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors bg-white shadow-sm"
            title="Sign in with GitHub"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
            />
            <FormError message={errors.email} />
          </div>

          <div className="relative">
            <div>
              <InputField
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className={errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
              />
              <FormError message={errors.password} />
            </div>
            
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="peer sr-only" />
              <span className="w-5 h-5 rounded border-2 border-gray-300 bg-white peer-checked:bg-primary peer-checked:border-primary peer-focus:ring-2 peer-focus:ring-primary/30 transition-all flex items-center justify-center text-white">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
              <span className="text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
            </label>
            <Link to="/forgot-password" className="font-medium text-gray-900 hover:underline">
              Forgot password?
            </Link>
          </div>

          {apiError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{apiError}</div>}

          <Button type="submit" isLoading={loading} className="mt-2 text-base font-semibold">
            Sign In
          </Button>
        </form>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          New to LenserFight? <Link to="/register" className="font-medium text-gray-900 hover:underline border border-gray-200 px-3 py-1 rounded ml-1 bg-white">Create an account</Link>
        </div>
      </AuthCard>
    </div>
  );
};
