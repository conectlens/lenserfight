
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TagUsage } from '../../../types/tags.types';

interface TagCloudProps {
  tags: TagUsage[];
}

export const TagCloud: React.FC<TagCloudProps> = ({ tags }) => {
  const navigate = useNavigate();

  const getStyle = (weight: number = 1) => {
    // Graphic typography scaling - Bold and tight
    if (weight > 9) return { size: 'text-5xl md:text-8xl', color: 'text-gray-900', opacity: 'opacity-100' };
    if (weight > 7) return { size: 'text-4xl md:text-7xl', color: 'text-gray-800', opacity: 'opacity-90' };
    if (weight > 5) return { size: 'text-3xl md:text-5xl', color: 'text-gray-600', opacity: 'opacity-80' };
    if (weight > 3) return { size: 'text-2xl md:text-4xl', color: 'text-gray-400', opacity: 'opacity-60' };
    return { size: 'text-xl md:text-2xl', color: 'text-gray-300', opacity: 'opacity-40' };
  };

  // Center-heavy sort is handled nicely by flex-wrap center usually, 
  // but randomizing slightly or shuffling can look more organic for a "cloud".
  // For now, we keep the weight-based sort from service but rendered centrally.
  
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
              hover:scale-110 hover:opacity-100 hover:text-primary hover:rotate-1
              focus:outline-none focus:text-primary
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
