
import React, { useEffect, useState, useRef } from 'react';
import { TagUsage } from '../../../types/tags.types';
import { tagService } from '../../../services/tagService';
import { TagCloud } from '../components/TagCloud';
import { SEOHead } from '../../../components/SEOHead';

const NodeGraphBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
    let height = canvas.height = canvas.parentElement?.clientHeight || window.innerHeight;

    const particles: { x: number; y: number; vx: number; vy: number }[] = [];
    // Lower density for minimalism
    const particleCount = Math.min(Math.floor((width * height) / 15000), 50); 
    const connectionDistance = Math.min(width, height) * 0.15 + 30; 

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Updated colors for better visibility on light theme
      ctx.fillStyle = '#9CA3AF'; // gray-400
      ctx.strokeStyle = '#9CA3AF'; // gray-400

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        // Bounce off edges gently
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        // Draw Node
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw Connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);

          if (dist < connectionDistance) {
            ctx.beginPath();
            ctx.globalAlpha = 0.4 * (1 - (dist / connectionDistance)); 
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.globalAlpha = 1.0; // Reset
          }
        }
      });
      
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    const handleResize = () => {
        if (!canvas.parentElement) return;
        width = canvas.width = canvas.parentElement.clientWidth;
        height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

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
    // Minimalist full-height container with no visible boundaries
    <div className="relative w-full h-[80vh] flex items-center justify-center overflow-hidden">
      <SEOHead type="tag-cloud" />
      <NodeGraphBackground />
      
      <div className="relative z-10 w-full max-w-5xl mx-auto px-4 flex flex-col items-center justify-center">
        {isLoading ? (
           // Abstract subtle loading pulse
           <div className="flex gap-2 opacity-30">
              <div className="w-16 h-6 bg-gray-300 rounded-full animate-pulse"></div>
              <div className="w-24 h-6 bg-gray-300 rounded-full animate-pulse delay-75"></div>
              <div className="w-12 h-6 bg-gray-300 rounded-full animate-pulse delay-150"></div>
           </div>
        ) : tags.length > 0 ? (
           <div className="animate-in fade-in zoom-in duration-1000 ease-out">
               <TagCloud tags={tags} />
           </div>
        ) : (
           <div className="text-gray-300 font-light text-sm tracking-widest uppercase">No topics found</div>
        )}
      </div>
    </div>
  );
};
