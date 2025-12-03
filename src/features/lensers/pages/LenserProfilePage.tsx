import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lenserService } from '../../../services/lenserService';
import { Lenser, LenserStats, LenserActivityPoint } from '../../../types/lenser.types';
import { PromptTemplateRecord } from '../../../types/prompts.types';
import { ThreadRecord } from '../../../types/threads.types';
import { LenserProfileHeader } from '../components/LenserProfileHeader';
import { LenserStatsRow } from '../components/LenserStatsRow';
import { LenserActivityHeatmap } from '../components/LenserActivityHeatmap';
import { LenserTabs } from '../components/LenserTabs';
import { LenserPromptsGrid } from '../components/LenserPromptsGrid';
import { LenserThreadsGrid } from '../components/LenserThreadsGrid';
import { FolderOpen, MessageSquare, Trophy } from 'lucide-react';
import { FEATURES } from '../../../config/runtimeConfig';

export const LenserProfilePage: React.FC = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  
  const [lenser, setLenser] = useState<Lenser | null>(null);
  const [stats, setStats] = useState<LenserStats | null>(null);
  const [activity, setActivity] = useState<LenserActivityPoint[]>([]);
  const [prompts, setPrompts] = useState<PromptTemplateRecord[]>([]);
  const [threads, setThreads] = useState<ThreadRecord[]>([]);
  
  const [activeTab, setActiveTab] = useState<'prompts' | 'threads' | 'challenges'>('prompts');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!handle) return;
      setIsLoading(true);
      try {
        const lenserData = await lenserService.getLenserByHandle(handle);
        if (!lenserData) {
            return;
        }
        setLenser(lenserData);

        const promises: Promise<any>[] = [
             lenserService.getLenserStats(lenserData.id),
             lenserService.getLenserPrompts(lenserData.id),
             lenserService.getLenserThreads(lenserData.id)
        ];

        // Conditionally fetch activity
        if (FEATURES.LENSER_ACTIVITY) {
             promises.push(lenserService.getLenserActivity(lenserData.id));
        }

        const results = await Promise.all(promises);
        
        setStats(results[0]);
        setPrompts(results[1]);
        setThreads(results[2]);
        
        if (FEATURES.LENSER_ACTIVITY && results[3]) {
            setActivity(results[3]);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [handle]);

  if (isLoading) {
    return (
        <div className="max-w-7xl mx-auto py-8 px-4">
             <div className="animate-pulse space-y-8">
                 <div className="h-64 bg-gray-200 rounded-3xl"></div>
                 <div className="flex gap-6 mt-4 px-6">
                     <div className="w-32 h-32 rounded-full bg-gray-200 -mt-20 border-4 border-white"></div>
                     <div className="flex-1 space-y-4 pt-4">
                         <div className="w-1/3 h-8 bg-gray-200 rounded"></div>
                         <div className="w-1/4 h-4 bg-gray-200 rounded"></div>
                     </div>
                 </div>
             </div>
        </div>
    );
  }

  if (!lenser) {
    return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <h2 className="text-xl font-bold text-gray-500">Lenser not found</h2>
        </div>
    );
  }

  const EmptyState = ({ icon: Icon, message }: { icon: any, message: string }) => (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
            <Icon size={32} />
        </div>
        <p className="text-gray-500 font-medium">{message}</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <LenserProfileHeader lenser={lenser} followersCount={stats?.followersCount || 0} />
      
      {stats && <div className="px-6 md:px-0"><LenserStatsRow stats={stats} /></div>}
      
      {FEATURES.LENSER_ACTIVITY && (
        <div className="px-6 md:px-0">
           <LenserActivityHeatmap data={activity} />
        </div>
      )}
      
      <div className="px-6 md:px-0">
          <LenserTabs activeTab={activeTab} onChange={setActiveTab} />
          
          <div className="min-h-[300px]">
            {activeTab === 'prompts' && (
                prompts.length > 0 ? (
                    <LenserPromptsGrid 
                        prompts={prompts} 
                        onOpen={(id) => navigate(`/prompts/${id}`)} 
                    />
                ) : (
                    <EmptyState icon={FolderOpen} message="No prompts created yet." />
                )
            )}
            
            {activeTab === 'threads' && (
                threads.length > 0 ? (
                    <LenserThreadsGrid 
                        threads={threads}
                        onOpen={(id) => navigate(`/threads/${id}`)}
                    />
                ) : (
                    <EmptyState icon={MessageSquare} message="No threads posted yet." />
                )
            )}
            
            {FEATURES.CHALLENGES_TAB && activeTab === 'challenges' && (
                <EmptyState icon={Trophy} message="No challenge history available." />
            )}
          </div>
      </div>
    </div>
  );
};