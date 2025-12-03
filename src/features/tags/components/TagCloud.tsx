
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TagUsage } from '../../../types/tags.types';

interface TagCloudProps {
  tags: TagUsage[];
}

export const TagCloud: React.FC<TagCloudProps> = ({ tags }) => {
  const navigate = useNavigate();

  // Helper to map weight (1-10) to Tailwind classes
  const getStyle = (weight: number = 1) => {
    if (weight > 9) return { size: 'text-5xl md:text-6xl', color: 'text-primary-900', opacity: 'opacity-100' };
    if (weight > 7) return { size: 'text-4xl md:text-5xl', color: 'text-gray-900', opacity: 'opacity-90' };
    if (weight > 5) return { size: 'text-3xl md:text-4xl', color: 'text-gray-800', opacity: 'opacity-80' };
    if (weight > 3) return { size: 'text-2xl md:text-3xl', color: 'text-gray-600', opacity: 'opacity-70' };
    return { size: 'text-lg md:text-xl', color: 'text-gray-500', opacity: 'opacity-60' };
  };

  // Sort tags alphabetically for the cloud display to make scanning easier,
  // or use random/popularity sort. Let's stick to popularity for "center mass" effect
  // but the prompt implies a cluster.
  const displayTags = [...tags].sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-wrap justify-center content-center items-baseline gap-x-6 gap-y-4 max-w-5xl mx-auto py-12 px-4">
      {displayTags.map((tag) => {
        const style = getStyle(tag.weight);
        return (
          <button
            key={tag.id}
            onClick={() => navigate(`/tags/${tag.slug}`)}
            className={`
              ${style.size} ${style.color} ${style.opacity}
              font-bold transition-all duration-300 ease-out
              hover:scale-110 hover:text-primary-600 hover:opacity-100 cursor-pointer
              focus:outline-none focus:text-primary-600
              leading-none tracking-tight
            `}
            title={`${tag.count} uses | Trend Score: ${tag.trendingScore}`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
};
