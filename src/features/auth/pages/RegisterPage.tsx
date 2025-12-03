
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { AuthCard } from '../components/AuthCard';
import { InputField } from '../components/InputField';
import { Button } from '../../../components/Button';
import { useFormValidation } from '../../../hooks/useFormValidation';
import { isRequired, isEmail, minLength } from '../../../utils/validation';
import { FormError } from '../../../components/FormError';
import { ArrowLeft, Check, X } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { isMock } from '../../../config/runtimeConfig';

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

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLen: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false
  });

  // Policy Modal State
  const [policyModal, setPolicyModal] = useState<{ isOpen: boolean; title: string; content: React.ReactNode } | null>(null);

  useEffect(() => {
    const p = formData.password;
    const hasMinLen = p.length >= 8;
    const hasUpper = /[A-Z]/.test(p);
    const hasLower = /[a-z]/.test(p);
    const hasNumber = /[0-9]/.test(p);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(p);
    
    let score = 0;
    if (hasMinLen) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;
    
    setPasswordStrength({
        score,
        hasMinLen,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial
    });
  }, [formData.password]);

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
      navigate('/login');
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
            <div className="space-y-4 text-sm text-gray-600">
                <p><strong>1. Introduction</strong><br/>Welcome to ConnectLens. By using our website, you agree to these terms.</p>
                <p><strong>2. Usage</strong><br/>You agree to use the platform for lawful purposes only.</p>
                <p><strong>3. Content</strong><br/>You retain rights to content you create, but grant us a license to display it.</p>
            </div>
        );
    } else if (type === 'Privacy') {
        content = (
            <div className="space-y-4 text-sm text-gray-600">
                <p><strong>1. Data Collection</strong><br/>We collect information you provide directly to us.</p>
                <p><strong>2. Usage of Data</strong><br/>We use your data to provide and improve our services.</p>
                <p><strong>3. Third Parties</strong><br/>We do not sell your personal data to third parties.</p>
            </div>
        );
    } else {
        content = (
            <div className="space-y-4 text-sm text-gray-600">
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

  // Helper for strength bar
  const getStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'bg-red-500';
    if (passwordStrength.score <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const StrengthItem = ({ fulfilled, label }: { fulfilled: boolean, label: string }) => (
    <div className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${fulfilled ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
        {fulfilled ? <Check size={12} strokeWidth={3} /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
        {label}
    </div>
  );

  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10">
        <Link to="/app" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors bg-white/50 backdrop-blur-sm px-4 py-2 rounded-lg hover:bg-white/80">
           <ArrowLeft size={16} />
           Back to Dashboard
        </Link>
      </div>
      <AuthCard title="Create Account" subtitle="Join the community today">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <InputField
              label="Display Name"
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
            
            {/* Password Strength Meter */}
            {formData.password && (
                <div className="mt-2 animate-in fade-in slide-in-from-top-1">
                    <div className="flex gap-1 h-1 mb-2">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div 
                                key={i} 
                                className={`flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength.score ? getStrengthColor() : 'bg-gray-100'}`} 
                            />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-y-1">
                        <StrengthItem fulfilled={passwordStrength.hasMinLen} label="8+ characters" />
                        <StrengthItem fulfilled={passwordStrength.hasUpper} label="Uppercase letter" />
                        <StrengthItem fulfilled={passwordStrength.hasLower} label="Lowercase letter" />
                        <StrengthItem fulfilled={passwordStrength.hasNumber} label="Number" />
                        <StrengthItem fulfilled={passwordStrength.hasSpecial} label="Special character" />
                    </div>
                </div>
            )}
            
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
                <span className="w-5 h-5 rounded border-2 border-gray-300 bg-white peer-checked:bg-primary peer-checked:border-primary peer-focus:ring-2 peer-focus:ring-primary/30 transition-all flex items-center justify-center text-white">
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                </span>
              </div>
              <div className="text-sm leading-tight text-gray-600">
                I agree to the{' '}
                <button type="button" onClick={() => openPolicy('Terms')} className="font-semibold text-gray-900 hover:underline">
                  Terms and Conditions
                </button>
                ,{' '}
                <button type="button" onClick={() => openPolicy('Privacy')} className="font-semibold text-gray-900 hover:underline">
                  Privacy Policy
                </button>
                {' '}and{' '}
                <button type="button" onClick={() => openPolicy('Cookies')} className="font-semibold text-gray-900 hover:underline">
                  Cookie Policy
                </button>.
              </div>
            </label>
          </div>

          {apiError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{apiError}</div>}

          <Button type="submit" isLoading={loading} className="mt-2 text-base font-semibold">
            Sign Up
          </Button>
        </form>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="font-medium text-gray-900 hover:underline">Sign In</Link>
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
            <div className="max-h-[60vh] overflow-y-auto pr-2">
                {policyModal.content}
            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={() => setPolicyModal(null)} className="w-auto">
                    Close
                </Button>
            </div>
        </Modal>
      )}
    </div>
  );
};
