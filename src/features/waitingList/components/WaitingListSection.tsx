
import React, { useState } from 'react';
import { useLenser } from '../../../context/LenserContext';
import { useAuth } from '../../../context/AuthContext';
import { Button } from '../../../components/Button';
import { ArrowRight, CheckCircle, Lock, Sparkles, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const WaitingListSection: React.FC = () => {
  const { lenser, hasLenser, updateLenserProfile } = useLenser();
  const { isAuthenticated } = useAuth();
  
  const [kvkkApproved, setKvkkApproved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isJoined = lenser?.is_in_waiting_list;

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!lenser) return;
      setError(null);

      if (!kvkkApproved) {
          setError("You must approve the privacy policy to join.");
          return;
      }

      setIsSubmitting(true);

      try {
          await updateLenserProfile({
              is_in_waiting_list: true
          });
      } catch (err: any) {
          setError(err.message || "Failed to join list.");
      } finally {
          setIsSubmitting(false);
      }
  };

  return (
    <section className="relative w-full overflow-hidden rounded-[2.5rem] bg-white shadow-2xl shadow-gray-200/60 border border-gray-100">
        {/* Enhanced Background */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-gray-50 via-white to-white"></div>
            
            {/* Animated Orbs */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] mix-blend-multiply opacity-60 animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-indigo-50 rounded-full blur-[120px] mix-blend-multiply opacity-60"></div>
            
            {/* Texture */}
            <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
        </div>

        <div className="relative z-10 px-6 py-20 md:py-24 max-w-3xl mx-auto text-center">
            
            {/* Premium Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gray-900 text-white text-[10px] md:text-xs font-bold uppercase tracking-widest mb-10 shadow-lg shadow-gray-200 ring-1 ring-white/20">
                <Sparkles size={12} className="text-primary animate-pulse" /> 
                The Next Evolution of LenserFight
            </div>
            
            {/* Main Headline */}
            <h2 className="text-5xl md:text-7xl font-black text-gray-900 tracking-tight mb-6 leading-[1.1] drop-shadow-sm">
                Early Access
            </h2>
            
            {/* Clear Subtext */}
            <p className="text-xl md:text-2xl text-gray-500 font-medium max-w-2xl mx-auto mb-14 leading-relaxed">
                Join the waitlist for upcoming features and agentic workflows.
            </p>

            {isAuthenticated && hasLenser ? (
                isJoined ? (
                    <div className="bg-green-50 border border-green-100 rounded-3xl p-10 max-w-md mx-auto animate-in fade-in zoom-in duration-500 shadow-sm">
                        <div className="w-20 h-20 bg-white border-4 border-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <CheckCircle size={40} className="fill-current text-white stroke-green-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Spot Secured</h3>
                        <p className="text-gray-600 font-medium">You are on the list! We'll notify you as soon as the beta opens.</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="max-w-md mx-auto relative group/form">
                        <div className="flex flex-col gap-6">
                            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-sm text-gray-600 mb-2 text-left">
                               <p><strong>Authenticated as:</strong> {lenser?.display_name}</p>
                               <p className="text-xs text-gray-500 mt-1">Your Lenser profile will be marked for priority access.</p>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer group text-left px-2 select-none">
                                <div className="relative flex items-center mt-0.5">
                                    <input 
                                        type="checkbox" 
                                        className="peer sr-only" 
                                        checked={kvkkApproved}
                                        onChange={(e) => setKvkkApproved(e.target.checked)}
                                    />
                                    <div className="w-5 h-5 rounded-md border-2 border-gray-300 bg-white peer-checked:bg-primary peer-checked:border-primary peer-focus:ring-2 peer-focus:ring-primary/30 transition-all shadow-sm"></div>
                                    <CheckCircle className="w-3.5 h-3.5 text-gray-900 absolute left-[3px] top-[3px] opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" strokeWidth={3.5} />
                                </div>
                                <span className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-700 transition-colors">
                                    I agree to the processing of my personal data in accordance with the <a href="/legal/privacy" target="_blank" className="underline text-gray-900 font-bold hover:text-primary-700 decoration-gray-300">Privacy Policy</a>.
                                </span>
                            </label>

                            <Button 
                                type="submit" 
                                isLoading={isSubmitting} 
                                className="h-12 px-6 rounded-xl text-sm font-bold shadow-md bg-gray-900 text-white hover:bg-gray-800"
                            >
                                Secure My Spot
                            </Button>
                        </div>
                        {error && (
                            <div className="mt-6 text-sm font-medium text-red-600 bg-red-50 py-3 px-4 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                                {error}
                            </div>
                        )}
                    </form>
                )
            ) : (
                // Locked State
                <div className="max-w-md mx-auto">
                    <div className="relative p-1 rounded-3xl bg-gradient-to-b from-white to-transparent">
                        <div className="bg-white/80 backdrop-blur-xl rounded-[1.4rem] p-10 border border-gray-100 shadow-xl flex flex-col items-center text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 text-gray-400 border border-gray-100 shadow-inner">
                                <Lock size={28} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Lenser Exclusive</h3>
                            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                                You must have an active Lenser identity to join the early access program.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-4 w-full">
                                <Link to="/login" className="w-full">
                                    <Button variant="secondary" className="w-full h-12 border-gray-200">Sign In</Button>
                                </Link>
                                <Link to="/register" className="w-full">
                                    <Button className="w-full h-12 bg-primary hover:bg-yellow-400 text-gray-900 shadow-md">Join Now</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-16 pt-8 border-t border-gray-100 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-semibold text-gray-400 uppercase tracking-wider">
               <div className="flex items-center gap-2.5">
                   <ShieldCheck size={18} className="text-gray-300" /> Secure Protocol
               </div>
               <div className="flex items-center gap-2.5">
                   <ArrowRight size={18} className="text-gray-300" /> Priority Access
               </div>
            </div>
        </div>
    </section>
  );
};
