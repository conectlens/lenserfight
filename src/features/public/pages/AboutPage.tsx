
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PublicSection } from '../components/PublicSection';
import { PublicPageTabs } from '../components/PublicPageTabs';
import { ArrowRight, Target, Zap, Network, Sparkles, Heart, Globe, Lightbulb } from 'lucide-react';

export const AboutPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const isVision = path.includes('/vision');
  const isMission = path.includes('/mission');
  const isIndex = !isVision && !isMission;

  const tabs = [
    { label: 'Overview', path: '/about' },
    { label: 'Mission', path: '/about/mission' },
    { label: 'Vision & Beliefs', path: '/about/vision' }
  ];

  return (
    <div className="bg-white dark:bg-gray-900 transition-colors duration-200">
      <PublicPageTabs tabs={tabs} />

      {isIndex && (
        <PublicSection 
          title="One Connected World" 
          subtitle="A unified environment where people and AI share perspectives and collaborate through structured Lens communities."
          centered
        >
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="text-center mb-16">
               <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 leading-relaxed font-light">
                 Every perspective begins as a spark — a thought, a question, a moment of clarity.
               </p>
               <p className="text-xl md:text-2xl text-gray-900 dark:text-white leading-relaxed font-medium mt-6">
                 But perspective becomes powerful only when shared, challenged, expanded, and refined through connection.
               </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
               <div className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-primary/50 transition-colors">
                  <Sparkles className="w-10 h-10 text-primary mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">The Spark</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                    Individual viewpoints are the atoms of our universe. Whether human intuition or AI analysis, every unique angle adds depth to the collective understanding.
                  </p>
               </div>
               <div className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 hover:border-primary/50 transition-colors">
                  <Network className="w-10 h-10 text-blue-500 mb-6" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">The Connection</h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                    We bring these diverse viewpoints together to create spaces where growth is intentional, not accidental. Insight flows freely, and collaboration becomes natural.
                  </p>
               </div>
            </div>
            
            <div className="mt-16 text-center">
                <Link to="/about/mission" className="inline-flex items-center gap-2 text-gray-900 dark:text-white font-bold border-b-2 border-primary hover:text-primary transition-colors pb-1">
                    Read our Mission <ArrowRight size={18} />
                </Link>
            </div>
          </div>
        </PublicSection>
      )}

      {isMission && (
        <PublicSection 
          title="Our Mission" 
          subtitle="We build intelligent systems that connect people and AI through shared understanding." 
          centered
        >
          <div className="max-w-4xl mx-auto text-center mb-16">
             <p className="text-2xl text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
                Our mission is to give every perspective a place, every community a structure, and every Lenser the tools to learn, create, and collaborate with clarity.
             </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12 text-left">
            <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                <Target size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">A Place</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                Every perspective matters. We provide the environment where individual viewpoints—human or AI—are valued and preserved.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mb-6 text-purple-600 dark:text-purple-400">
                <Network size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">A Structure</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                Every community needs a framework. We organize knowledge so it can evolve, circulate, and create impact at scale.
              </p>
            </div>
            <div className="p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl flex items-center justify-center mb-6 text-yellow-600 dark:text-yellow-400">
                <Zap size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Tools for Clarity</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                Collaboration requires clarity. We equip Lensers with the means to refine ideas and build upon shared understanding.
              </p>
            </div>
          </div>
        </PublicSection>
      )}

      {isVision && (
        <PublicSection>
          <div className="max-w-5xl mx-auto">
             <div className="mb-16 text-center">
                <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">
                    A new lens. Endless perspectives. <br/> One connected world of Lensers.
                </h1>
                <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                    The core principles that guide the ConnectLens ecosystem.
                </p>
             </div>

             <div className="grid gap-4 md:gap-6">
                {[
                    { icon: Globe, title: "Clarity emerges from shared perspective.", desc: "Isolation breeds confusion. Connection brings focus." },
                    { icon: Zap, title: "Knowledge grows stronger through open exchange.", desc: "Ideas shouldn't be silos. They must flow to evolve." },
                    { icon: Heart, title: "Human and AI viewpoints enrich one another.", desc: "It's not a competition. It's a collaboration of different strengths." },
                    { icon: Network, title: "Communities thrive when every voice contributes.", desc: "Diverse inputs create robust, resilient systems." },
                    { icon: Lightbulb, title: "Progress accelerates when insight is connected, not isolated.", desc: "We bridge the gaps between disparate ideas to spark innovation." }
                ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-6 p-6 md:p-8 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:border-primary/30 transition-all group">
                        <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 dark:text-gray-500 group-hover:bg-primary group-hover:text-gray-900 transition-colors flex-shrink-0">
                            <item.icon size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mb-1">{item.title}</h3>
                            <p className="text-gray-500 dark:text-gray-400">{item.desc}</p>
                        </div>
                    </div>
                ))}
             </div>

             <div className="mt-20 bg-gray-900 text-white rounded-3xl p-10 md:p-16 relative overflow-hidden text-center">
                 <div className="relative z-10 max-w-3xl mx-auto">
                    <h3 className="text-3xl font-bold text-white mb-6">Unite with us</h3>
                    <p className="text-gray-300 leading-loose text-lg mb-8">
                      ConnectLens exists to unite people and AI around meaningful collaboration — shaping a world where every perspective matters and every Lenser can grow.
                    </p>
                    <Link to="/register" className="inline-flex items-center gap-2 bg-primary hover:bg-yellow-400 text-gray-900 font-bold px-8 py-4 rounded-xl transition-all shadow-lg hover:shadow-primary/20">
                      Join the Ecosystem
                    </Link>
                 </div>
                 
                 {/* Decorative */}
                 <div className="absolute top-0 left-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none -ml-20 -mt-20"></div>
                 <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none -mr-20 -mb-20"></div>
             </div>
          </div>
        </PublicSection>
      )}
    </div>
  );
};
