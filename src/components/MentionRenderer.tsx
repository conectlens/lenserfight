import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { mentionService, ResolvedSegment } from '../services/mentionService';
import { Sparkles, HelpCircle } from 'lucide-react';

interface MentionRendererProps {
  content: string;
  className?: string;
  plainText?: boolean;
}

export const MentionRenderer: React.FC<MentionRendererProps> = ({ content, className = '', plainText = false }) => {
  const [segments, setSegments] = useState<ResolvedSegment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const resolve = async () => {
      if (!content) {
        if (isMounted) {
            setSegments([]);
            setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const result = await mentionService.resolveContent(content);
        if (isMounted) setSegments(result);
      } catch (e) {
        // Fallback to raw text if resolution completely fails
        if (isMounted) setSegments([{ type: 'text', content }]); 
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    resolve();

    return () => {
      isMounted = false;
    };
  }, [content]);

  if (isLoading) {
    // Show static loading text to prevent layout shift or empty space
    return <span className={`opacity-60 ${className}`}>Loading...</span>;
  }

  return (
    <span className={`whitespace-pre-wrap ${className}`}>
      {segments.map((segment, index) => {
        if (segment.type === 'mention') {
          // Fallback title for unknown
          const displayContent = segment.content || `Unknown ${segment.entityType || 'Entity'}`;
          
          if (segment.isValid && segment.link) {
            if (plainText) {
                return (
                    <span 
                        key={index} 
                        className="font-medium text-gray-900"
                    >
                        {displayContent}
                    </span>
                );
            }

            return (
              <Link 
                key={index}
                to={segment.link}
                className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-primary/20 text-primary-900 hover:bg-primary/30 font-medium transition-colors align-baseline no-underline group"
              >
                <Sparkles size={12} className="text-primary-700 group-hover:text-primary-900" />
                {displayContent}
              </Link>
            );
          } else {
             // Unknown/Invalid Prompt
            if (plainText) {
                return <span key={index} className="text-gray-500">{displayContent}</span>;
            }
            return (
              <span 
                key={index} 
                className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 text-sm align-baseline cursor-not-allowed"
                title="Prompt not found"
              >
                <HelpCircle size={12} />
                {displayContent}
              </span>
            );
          }
        }
        
        // Regular Text
        return <span key={index}>{segment.content}</span>;
      })}
    </span>
  );
};