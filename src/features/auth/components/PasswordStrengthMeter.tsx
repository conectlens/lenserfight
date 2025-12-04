import React, { useMemo } from 'react';
import { Check } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

const StrengthItem = ({ fulfilled, label }: { fulfilled: boolean, label: string }) => (
  <div className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${fulfilled ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
      {fulfilled ? <Check size={12} strokeWidth={3} /> : <div className="w-3 h-3 rounded-full border border-gray-300" />}
      {label}
  </div>
);

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const strength = useMemo(() => {
    const p = password || '';
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

    return { score, hasMinLen, hasUpper, hasLower, hasNumber, hasSpecial };
  }, [password]);

  if (!password) return null;

  const getStrengthColor = () => {
    if (strength.score <= 2) return 'bg-red-500';
    if (strength.score <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="mt-2 animate-in fade-in slide-in-from-top-1">
        <div className="flex gap-1 h-1 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
                <div 
                    key={i} 
                    className={`flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? getStrengthColor() : 'bg-gray-100'}`} 
                />
            ))}
        </div>
        <div className="grid grid-cols-2 gap-y-1">
            <StrengthItem fulfilled={strength.hasMinLen} label="8+ characters" />
            <StrengthItem fulfilled={strength.hasUpper} label="Uppercase letter" />
            <StrengthItem fulfilled={strength.hasLower} label="Lowercase letter" />
            <StrengthItem fulfilled={strength.hasNumber} label="Number" />
            <StrengthItem fulfilled={strength.hasSpecial} label="Special character" />
        </div>
    </div>
  );
};