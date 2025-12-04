
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TagUsage } from '../../../types/tags.types';

interface TagCloudProps {
  tags: TagUsage[];
}

export const TagCloud: React.FC<TagCloudProps> = ({ tags }) => {
  const navigate = useNavigate();

  const getStyle = (weight: number = 1) => {
    // Graphic typography scaling - Bold and tight, with distinct heat colors
    // Weights are normalized 1-10
    
    if (weight > 9) return { 
        size: 'text-5xl md:text-8xl', 
        color: 'text-orange-600 hover:text-orange-800', 
        opacity: 'opacity-100' 
    };
    if (weight > 7) return { 
        size: 'text-4xl md:text-7xl', 
        color: 'text-indigo-600 hover:text-indigo-800', 
        opacity: 'opacity-90' 
    };
    if (weight > 5) return { 
        size: 'text-3xl md:text-5xl', 
        color: 'text-blue-500 hover:text-blue-700', 
        opacity: 'opacity-80' 
    };
    if (weight > 3) return { 
        size: 'text-2xl md:text-4xl', 
        color: 'text-slate-500 hover:text-slate-700', 
        opacity: 'opacity-70' 
    };
    
    return { 
        size: 'text-xl md:text-2xl', 
        color: 'text-gray-400 hover:text-gray-600', 
        opacity: 'opacity-60' 
    };
  };

  return (
    <div className="flex flex-wrap justify-center items-center gap-x-4 md:gap-x-8 gap-y-2 md:gap-y-6 max-w-4xl mx-auto">
      {tags.map((tag) => {
        const style = getStyle(tag.weight);
        return (
          <button
            key={tag.id}
            onClick={() => navigate(`/tags/${tag.slug}`)}
            className={`
              ${style.size} ${style.color} ${style.opacity}
              font-black tracking-tighter leading-none
              transition-all duration-500 ease-out
              hover:scale-110 hover:opacity-100 hover:rotate-1
              focus:outline-none focus:text-primary-700
              cursor-pointer select-none
            `}
            title={`${tag.count} items`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
};
