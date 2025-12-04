
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TagUsage } from '../../../types/tags.types';

interface TagCloudProps {
  tags: TagUsage[];
}

export const TagCloud: React.FC<TagCloudProps> = ({ tags }) => {
  const navigate = useNavigate();

  const cloudTags = useMemo(() => {
    // Shuffle tags to avoid linear size sorting (big to small)
    const shuffled = [...tags].sort(() => Math.random() - 0.5);

    return shuffled.map(tag => {
      const weight = tag.weight || 1;
      
      // Randomized Visual Properties
      const rotation = Math.floor(Math.random() * 30) - 15; // -15deg to +15deg
      const translateY = Math.floor(Math.random() * 20) - 10; // -10px to +10px
      const margin = Math.random() * 1.5 + 0.5; // 0.5rem to 2rem spacing
      
      return {
        ...tag,
        visuals: {
          rotation,
          translateY,
          margin,
          weight
        }
      };
    });
  }, [tags]);

  const getTagStyles = (weight: number) => {
    // Dynamic Typography & Color Scaling based on Engagement Weight (1-10)
    if (weight >= 9) {
      return {
        className: 'text-5xl md:text-7xl font-black text-gray-900 z-30 opacity-100 hover:text-primary-600',
        scale: 1.1
      };
    }
    if (weight >= 7) {
      return {
        className: 'text-4xl md:text-6xl font-extrabold text-gray-800 z-20 opacity-95 hover:text-primary-600',
        scale: 1.05
      };
    }
    if (weight >= 5) {
      return {
        className: 'text-3xl md:text-5xl font-bold text-gray-600 z-10 opacity-80 hover:text-gray-900',
        scale: 1
      };
    }
    if (weight >= 3) {
      return {
        className: 'text-xl md:text-3xl font-semibold text-gray-400 z-0 opacity-60 hover:text-gray-700',
        scale: 0.95
      };
    }
    return {
      className: 'text-lg md:text-xl font-medium text-gray-300 z-0 opacity-40 hover:text-gray-500 blur-[0.5px] hover:blur-0',
      scale: 0.9
    };
  };

  return (
    <div className="flex flex-wrap justify-center items-center content-center w-full min-h-[50vh] py-12 px-4 md:px-16 overflow-visible perspective-1000 gap-4">
      {cloudTags.map((tag) => {
        const styles = getTagStyles(tag.visuals.weight);
        
        return (
          <button
            key={tag.id}
            onClick={() => navigate(`/tags/${tag.slug}`)}
            className={`
              relative cursor-pointer transition-all duration-500 ease-out 
              hover:scale-110 hover:rotate-0 hover:z-50 hover:opacity-100
              focus:outline-none focus:scale-110 focus:text-primary-700
              select-none leading-none tracking-tight
              ${styles.className}
            `}
            style={{
              transform: `rotate(${tag.visuals.rotation}deg) translateY(${tag.visuals.translateY}px)`,
              margin: `0 ${tag.visuals.margin}rem`,
            }}
            title={`${tag.name}: ${tag.count} uses`}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
};
