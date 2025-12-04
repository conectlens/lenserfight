
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PublicSection } from '../components/PublicSection';
import { PublicPageTabs } from '../components/PublicPageTabs';
import { Card } from '../../../components/Card';
import { ArrowRight, Target, Zap, Network } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const isVision = path.includes('/vision');
  const isMission = path.includes('/mission');
  const isIndex = !isVision && !isMission;

  const tabs = [
    { label: 'Overview', path: '/about' },
    { label: 'Mission', path: '/about/mission' },
    { label: 'Vision', path: '/about/vision' }
  ];

  return (
    <div className="bg-white">
      <PublicPageTabs tabs={tabs} />

      {isIndex && (
        <PublicSection 
          title="The Prompt Engineering Arena" 
          subtitle="LenserFight is a competitive ecosystem where creativity, logic, and AI interaction converge."
        >
          <div className="grid md:grid-cols-2 gap-12 mt-4">
            <div className="text-gray-600 text-lg leading-loose space-y-6">
              <p>
                In the era of Generative AI, the ability to direct machine intelligence is the defining skill. LenserFight was built to refine this skill through structured competition and verifiable results.
              </p>
              <p>
                A <strong>Lens</strong> is the origin point of perspective—an idea-seed that defines how the world is interpreted. Lensers use our platform to plant these seeds, creating prompts that act as technical mechanisms for exploring and altering digital reality.
              </p>
            </div>
            <div className="flex flex-col gap-6">
               <Card className="p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">For Creators</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Build a portfolio of high-impact prompts. Prove your logic in ranked battles and establish your identity as a top-tier Lenser.
                  </p>
               </Card>
               <Card className="p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">For Developers</h3>
                  <p className="text-gray-500 leading-relaxed">
                    Integrate stress-tested AI behaviors. Use the Lens Cloud to access a library of deterministic outputs for your applications.
                  </p>
               </Card>
            </div>
          </div>
        </PublicSection>
      )}

      {isMission && (
        <PublicSection 
          title="Our Mission" 
          subtitle="To empower creators and developers to build reliable prompts, test ideas, and share knowledge through verifiable results." 
          centered
        >
          <div className="grid md:grid-cols-3 gap-8 mt-16 text-left">
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center mb-6 text-gray-900 shadow-sm">
                <Target size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Reliability</h3>
              <p className="text-gray-500 leading-relaxed">
                Moving beyond hallucination to deterministic, high-quality AI outputs through rigorous community testing and feedback loops.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center mb-6 text-gray-900 shadow-sm">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Verification</h3>
              <p className="text-gray-500 leading-relaxed">
                Establishing a standard for prompt effectiveness. We validate logic against multiple models to ensure reproducibility.
              </p>
            </div>
            <div className="p-6 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="w-12 h-12 bg-white border border-gray-200 rounded-xl flex items-center justify-center mb-6 text-gray-900 shadow-sm">
                <Network size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-3">Knowledge</h3>
              <p className="text-gray-500 leading-relaxed">
                Democratizing access to advanced techniques like Chain-of-Thought and ReAct through an open, searchable arena.
              </p>
            </div>
          </div>
        </PublicSection>
      )}

      {isVision && (
        <PublicSection 
          title="Vision 2030" 
          subtitle="An interconnected ecosystem where Lens communities grow from ideas, supported by AI models acting as dynamic lenses for exploration."
        >
          <div className="bg-gray-900 text-white rounded-3xl p-10 md:p-16 relative overflow-hidden mt-8">
             <div className="relative z-10 max-w-2xl">
                <h3 className="text-3xl font-bold text-primary mb-6">The Universal Protocol</h3>
                <p className="text-gray-300 leading-loose text-lg mb-8">
                  We envision LenserFight evolving into the standard protocol for human-AI collaboration. As AI models function as system-level Lenses, human Lensers become the architects of digital agents. We are building the foundational layer where intent meets execution.
                </p>
                <Link to="/register" className="inline-flex items-center gap-3 text-white font-bold hover:text-primary transition-colors group">
                  Join the movement <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </Link>
             </div>
             
             {/* Abstract Decorative Elements */}
             <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -mr-20 -mt-20"></div>
             <div className="absolute bottom-0 right-0 w-64 h-64 border border-white/5 rounded-full pointer-events-none -mb-12 -mr-12"></div>
             <div className="absolute bottom-0 right-0 w-48 h-48 border border-white/5 rounded-full pointer-events-none -mb-4 -mr-4"></div>
          </div>
        </PublicSection>
      )}
    </div>
  );
};
