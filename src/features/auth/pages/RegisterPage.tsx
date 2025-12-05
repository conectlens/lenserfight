
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AuthCard } from '../components/AuthCard';
import { InputField } from '../components/InputField';
import { Button } from '../../../components/Button';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { isRequired, isEmail } from '../../../utils/validation';
import { FormError } from '../../../components/FormError';
import { ArrowLeft, Check } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { isMock } from '../../../config/runtimeConfig';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';

export const RegisterPage: React.FC = () => {
  const { register, logout } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    displayName: isMock ? 'New User' : '',
    email: isMock ? `newuser_${Date.now()}@example.com` : '',
    password: isMock ? 'Password123!' : '',
    confirmPassword: isMock ? 'Password123!' : '',
    agreeTerms: isMock ? true : false
  });

  // Policy Modal State
  const [policyModal, setPolicyModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode } | null>(null);

  // Custom password validator for the hook
  const passwordValidator = (value: any) => {
    if (!value) return "Password is required";
    if (value.length < 8) return "Must be at least 8 characters";
    if (!/[A-Z]/.test(value)) return "Must contain uppercase letter";
    if (!/[a-z]/.test(value)) return "Must contain lowercase letter";
    if (!/[0-9]/.test(value)) return "Must contain a number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return "Must contain special character";
    return null;
  };

  const { errors, validate, clearError, setErrors } = useFormValidation<typeof formData>({
    displayName: [isRequired()],
    email: [isRequired(), isEmail()],
    password: [passwordValidator], 
    confirmPassword: [isRequired()],
    // Manual check for agreeTerms in submit
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    clearError(name as keyof typeof formData);
    if (name === 'password') clearError('confirmPassword'); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    // Run standard validation
    if (!validate(formData)) return;

    if (formData.password !== formData.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "Passwords do not match" }));
      return;
    }

    if (!formData.agreeTerms) {
      setApiError("You must agree to the terms and conditions.");
      return;
    }

    setLoading(true);
    try {
      await register(formData.email, formData.password, formData.displayName);
      
      // Simulating Email Verification Requirement
      window.alert("Registration successful! Please check your email to approve your account.");
      await logout();
      navigate('/welcome');
    } catch (err: any) {
      setApiError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const openPolicy = (type: 'Terms' | 'Privacy' | 'Cookies') => {
    let content = <p>Content loading...</p>;
    if (type === 'Terms') {
        content = (
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p><strong>1. Introduction</strong><br/>Welcome to ConnectLens. By using our website, you agree to these terms.</p>
                <p><strong>2. Usage</strong><br/>You agree to use the platform for lawful purposes only.</p>
                <p><strong>3. Content</strong><br/>You retain rights to content you create, but grant us a license to display it.</p>
            </div>
        );
    } else if (type === 'Privacy') {
        content = (
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p><strong>1. Data Collection</strong><br/>We collect information you provide directly to us.</p>
                <p><strong>2. Usage of Data</strong><br/>We use your data to provide and improve our services.</p>
                <p><strong>3. Third Parties</strong><br/>We do not sell your personal data to third parties.</p>
            </div>
        );
    } else {
        content = (
            <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
                <p><strong>1. What are cookies?</strong><br/>Cookies are small text files stored on your device.</p>
                <p><strong>2. How we use them</strong><br/>We use cookies for authentication and analytics.</p>
            </div>
        );
    }

    setPolicyModal({
        isOpen: true,
        title: `${type} Policy`,
        content
    });
  };

  const backButton = (
    <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-all bg-white/80 dark:bg-gray-800/80 backdrop-blur-md px-4 py-2.5 rounded-full hover:bg-white dark:hover:bg-gray-800 shadow-sm border border-gray-200/50 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 w-auto">
       <ArrowLeft size={16} />
       Dive into the arena
    </Link>
  );

  return (
    <>
      <AuthCard title="Create Account" subtitle="Join the community today" backButton={backButton}>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <InputField
              label="Name"
              name="displayName"
              type="text"
              placeholder="Your full name"
              value={formData.displayName}
              onChange={handleChange}
              className={errors.displayName ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
            />
            <FormError message={errors.displayName} />
          </div>

          <div>
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
            />
            <FormError message={errors.email} />
          </div>

          <div>
            <InputField
              label="Password"
              name="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
            />
            
            <PasswordStrengthMeter password={formData.password} />
            
            <FormError message={errors.password} />
          </div>

          <div>
            <InputField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : ''}
            />
            <FormError message={errors.confirmPassword} />
          </div>

          {/* Terms Checkbox - Redesigned */}
          <div className="flex items-start gap-3 mt-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative flex items-center mt-0.5">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleChange}
                  className="peer sr-only"
                />
                <div className="w-5 h-5 rounded border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 peer-checked:bg-primary peer-checked:border-primary peer-focus:ring-2 peer-focus:ring-primary/30 transition-all"></div>
                <Check className="w-3.5 h-3.5 text-gray-900 absolute left-[3px] top-[3px] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3.5} />
              </div>
              <div className="text-sm leading-tight text-gray-600 dark:text-gray-400">
                I agree to the{' '}
                <button type="button" onClick={() => openPolicy('Terms')} className="font-semibold text-gray-900 dark:text-gray-200 hover:underline">
                  Terms and Conditions
                </button>
                ,{' '}
                <button type="button" onClick={() => openPolicy('Privacy')} className="font-semibold text-gray-900 dark:text-gray-200 hover:underline">
                  Privacy Policy
                </button>
                {' '}and{' '}
                <button type="button" onClick={() => openPolicy('Cookies')} className="font-semibold text-gray-900 dark:text-gray-200 hover:underline">
                  Cookie Policy
                </button>.
              </div>
            </label>
          </div>

          {apiError && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 p-3 rounded-xl text-red-600 dark:text-red-400 text-sm mt-4">
                <span className="mt-0.5">⚠️</span>
                {apiError}
            </div>
          )}

          <Button type="submit" isLoading={loading} className="mt-4 py-3 text-base font-bold shadow-lg shadow-primary/20">
            Sign Up
          </Button>
        </form>
        
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
          Already have an account? <Link to="/login" className="ml-1 text-gray-900 dark:text-gray-200 hover:text-primary-700 dark:hover:text-primary-400 font-bold hover:underline transition-colors">Sign In</Link>
        </div>
      </AuthCard>

      {/* Policy Modal */}
      {policyModal && (
        <Modal 
            isOpen={policyModal.isOpen} 
            onClose={() => setPolicyModal(null)} 
            title={policyModal.title}
            canClose={true}
        >
            <div className="max-h-[60vh] overflow-y-auto pr-2 text-gray-600 dark:text-gray-300">
                {policyModal.content}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={() => setPolicyModal(null)} className="w-auto">
                    Close
                </Button>
            </div>
        </Modal>
      )}
    </>
  );
};
