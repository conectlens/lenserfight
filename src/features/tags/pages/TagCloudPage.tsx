
import React, { useEffect, useState } from 'react';
import { TagUsage } from '../../../types/tags.types';
import { tagService } from '../../../services/tagService';
import { TagCloud } from '../components/TagCloud';
import { Hash } from 'lucide-react';

export const TagCloudPage: React.FC = () => {
  const [tags, setTags] = useState<TagUsage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        const data = await tagService.getCloud();
        setTags(data);
      } catch (e) {
        console.error("Failed to load tag cloud", e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTags();
  }, []);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4">
      <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="inline-flex items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 text-gray-900">
           <Hash size={32} />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
          Explore Topics
        </h1>
        <p className="text-xl text-gray-500 max-w-lg mx-auto leading-relaxed">
          Discover trending conversations and popular prompts. Select a topic to dive deeper.
        </p>
      </div>

      {isLoading ? (
         <div className="flex flex-wrap justify-center gap-4 max-w-4xl animate-pulse">
            {[...Array(20)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded-full" style={{ width: Math.random() * 100 + 60 }}></div>
            ))}
         </div>
      ) : tags.length > 0 ? (
         <TagCloud tags={tags} />
      ) : (
         <div className="text-gray-400">No topics found.</div>
      )}
    </div>
  );
};
