import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { threadsService } from '../../../services/threadsService';
import { ThreadDetailViewModel } from '../../../types/threads.types';
import { ThreadDetailCard } from '../components/ThreadDetailCard';
import { ThreadRepliesList } from '../components/ThreadRepliesList';
import { Button } from '../../../components/Button';
import { ChevronLeft } from 'lucide-react';

export const ThreadDetailPage: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const [thread, setThread] = useState<ThreadDetailViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchThread = async () => {
      if (!threadId) return;
      setLoading(true);
      try {
        const data = await threadsService.getThreadDetail(threadId);
        setThread(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load thread.");
      } finally {
        setLoading(false);
      }
    };
    fetchThread();
  }, [threadId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
         <div className="animate-pulse space-y-8">
           <div className="bg-gray-200 h-96 rounded-2xl"></div>
           <div className="bg-gray-200 h-32 rounded-2xl"></div>
           <div className="bg-gray-200 h-32 rounded-2xl"></div>
         </div>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Thread not found</h2>
        <Button onClick={() => navigate('/app')} className="w-auto inline-block">
          Return Home
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-6">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Back
        </button>
      </div>
      
      <ThreadDetailCard thread={thread} />
      <ThreadRepliesList replies={thread.replies} />
    </div>
  );
};
