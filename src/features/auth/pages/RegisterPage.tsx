
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

export const RegisterPage: React.FC = () => {
  const { register, logout } = useAuth();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLen: false,
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false
  });

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
    email: [isRequired(), isEmail()],
    // We remove standard minLength validator and use our custom logic if we want strict blocking,
    // or we can keep it simple and block on submit if score < 5.
    // For this implementation, I will rely on the visual indicator for guidance but enforce in validation.
    password: [passwordValidator], 
    confirmPassword: [isRequired()]
  });

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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

    setLoading(true);
    try {
      await register(formData.email, formData.password);
      
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
            
            {/* We show error if validation fails on submit, but the strength meter is the main guide */}
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

          {apiError && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{apiError}</div>}

          <Button type="submit" isLoading={loading} className="mt-2 text-base font-semibold">
            Sign Up
          </Button>
        </form>
        
        <div className="mt-8 text-center text-sm text-gray-500">
          Already have an account? <Link to="/login" className="font-medium text-gray-900 hover:underline">Sign In</Link>
        </div>
      </AuthCard>
    </div>
  );
};
