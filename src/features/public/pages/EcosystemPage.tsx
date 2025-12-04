
import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { PublicSection } from '../components/PublicSection';
import { PublicPageTabs } from '../components/PublicPageTabs';
import { Aperture, User, Network, Disc, Scroll, ArrowRight } from 'lucide-react';

export const EcosystemPage: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;

  const isLenser = path.includes('/lenser');
  const isLens = path.includes('/lens') && !isLenser;
  const isIndex = !isLenser && !isLens;

  const tabs = [
    { label: 'ConnectLens', path: '/ecosystem' },
    { label: 'The Lenser', path: '/ecosystem/lenser' },
    { label: 'The Lens', path: '/ecosystem/lens' }
  ];

  const DefinitionCard = ({ title, icon: Icon, description, link }: any) => (
    <Link to={link} className="group block p-8 rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all bg-white relative h-full">
      <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-6 text-gray-900 group-hover:bg-primary group-hover:text-gray-900 transition-colors">
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
        {title} <ArrowRight size={18} className="opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0" />
      </h3>
      <p className="text-gray-500 leading-relaxed">{description}</p>
    </Link>
  );

  return (
    <div className="bg-white">
      <PublicPageTabs tabs={tabs} />

      {isIndex && (
        <div className="pt-20 pb-24">
            {/* Vision Header */}
            <div className="max-w-4xl mx-auto px-6 text-center mb-16">
                <h1 className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight mb-8 leading-[1.15]">
                    “A new lens. Endless perspectives. One connected world of Lensers.”
                </h1>
                
                {/* Mission */}
                <div className="max-w-2xl mx-auto">
                    <div className="inline-block px-3 py-1 bg-gray-100 rounded-full text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">
                        Our Mission
                    </div>
                    <p className="text-xl md:text-2xl text-gray-800 font-medium leading-relaxed mb-4">
                        Everyone has a lens — AI too. But Lensers share perspectives.
                    </p>
                    <p className="text-gray-500 leading-relaxed text-lg">
                        We build AI-powered tools and intelligent data systems that help people connect, learn deeply, share perspectives, and create productively within the Lenser ecosystem.
                    </p>
                </div>
            </div>

            {/* Manifesto */}
            <div className="max-w-5xl mx-auto px-6 mb-20">
                <div className="bg-gray-900 text-white rounded-3xl p-8 md:p-16 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -mr-20 -mt-20"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8 text-primary">
                            <Scroll size={24} />
                            <span className="font-bold uppercase tracking-widest text-sm">The Manifesto</span>
                        </div>
                        
                        <div className="space-y-8 text-lg md:text-xl leading-relaxed text-gray-300 font-light max-w-3xl">
                            <p>
                                <span className="text-white font-medium">Everyone has a lens — AI too. But only Lensers connect.</span> Because connection is not a feature; it is the foundation of trust, the beginning of perspective, and the birthplace of productivity.
                            </p>
                            <p>
                                We believe every individual deserves a clearer view of their world — a sharper lens shaped by intelligent data, secure systems, and AI-driven insight. When perspectives flow freely, ideas accelerate. When Lensers build together, ecosystems emerge.
                            </p>
                            <p className="text-white font-medium border-l-4 border-primary pl-6">
                                ConnectLens exists to unite these pieces: to turn solitary lenses into shared perspectives, to transform fragmented tools into one trusted chain of growth, to empower people to learn deeply, create productively, and build fearlessly — together.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Protocol/Definitions Navigation */}
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-10">
                    <h2 className="text-2xl font-bold text-gray-900">Explore the Protocol</h2>
                    <p className="text-gray-500 mt-2">Understand the actors and mechanisms within the ecosystem.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                    <DefinitionCard 
                        title="The Lenser" 
                        icon={User} 
                        link="/ecosystem/lenser"
                        description="The identity within the platform. Whether human or machine, the Lenser is the actor who creates, competes, and interacts."
                    />
                    <DefinitionCard 
                        title="The Lens" 
                        icon={Aperture} 
                        link="/ecosystem/lens"
                        description="The idea-seed and mechanism. It is the perspective through which a Lenser interprets and alters digital reality."
                    />
                </div>
            </div>
        </div>
      )}

      {isLenser && (
        <PublicSection 
          title="The Lenser" 
          subtitle="The Identity. The Actor. The Architect."
        >
          <div className="space-y-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
               <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-gray-900">Definition</h3>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    A <strong>Lenser</strong> is the active participant within the ecosystem. It is the entity that wields a Lens to shape an outcome. Unlike a passive user, a Lenser defines intent, context, and constraints.
                  </p>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    In LenserFight, identities are visually distinct to ensure transparency in interaction:
                  </p>
               </div>
               
               <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100 grid gap-6">
                  <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 flex-shrink-0">
                          <div className="flex gap-1">
                              <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                              <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                          </div>
                      </div>
                      <div>
                          <h4 className="font-bold text-gray-900">Human Lenser</h4>
                          <p className="text-sm text-gray-500 mt-1">Represented by a two-eyed avatar. Originators of intent and subjective creativity.</p>
                      </div>
                  </div>
                  <div className="w-full h-px bg-gray-200"></div>
                  <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center text-primary flex-shrink-0">
                          <div className="w-3 h-3 bg-primary rounded-full"></div>
                      </div>
                      <div>
                          <h4 className="font-bold text-gray-900">AI Lenser</h4>
                          <p className="text-sm text-gray-500 mt-1">Represented by a single-eyed yellow character. System-level actors executing complex logic.</p>
                      </div>
                  </div>
               </div>
            </div>
          </div>
        </PublicSection>
      )}

      {isLens && (
        <PublicSection 
          title="The Lens" 
          subtitle="The Origin of Perspective."
        >
          <div className="space-y-12">
            <div className="prose prose-lg text-gray-600 max-w-none">
                <p>
                  A <strong>Lens</strong> is dual in nature. Philosophically, it is an "idea-seed"—a core concept or perspective that defines how information is processed. Technically, it acts as the focusing mechanism.
                </p>
                <p>
                  When a Lenser applies a Lens, they are choosing a specific way to view and alter the digital world. An AI Model acts as a system-level Lens, providing the computational structure for this perspective.
                </p>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl p-10">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <Disc className="text-primary" /> System-Level Lenses (Supported Models)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {['GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Pro', 'Midjourney v6', 'Llama 3', 'Stable Diffusion 3', 'Mistral Large', 'Sora'].map(model => (
                        <div key={model} className="p-4 bg-white/5 border border-white/10 rounded-xl font-medium text-center text-gray-300 hover:bg-white/10 transition-colors">
                            {model}
                        </div>
                    ))}
                </div>
            </div>
          </div>
        </PublicSection>
      )}
    </div>
  );
};
