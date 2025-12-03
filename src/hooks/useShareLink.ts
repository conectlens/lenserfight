import { useState } from 'react';
import { shareService } from '../services/shareService';
import { useLenser } from '../context/LenserContext';
import { ShareResourceType } from '../types/share.types';

export const useShareLink = () => {
  const { lenser } = useLenser();
  const [isLoading, setIsLoading] = useState(false);
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateLink = async (
    resourceType: ShareResourceType,
    resourceId: string,
    slug?: string,
    meta?: Record<string, any>
  ) => {
    if (!lenser) {
        setError("You must have a Lenser profile to share.");
        return null;
    }

    setIsLoading(true);
    setError(null);
    setShortUrl(null);

    try {
      const link = await shareService.createLink({
          resourceType,
          resourceId,
          slug,
          meta
      }, lenser.id);
      
      const url = shareService.getShareUrl(link.short_id);
      setShortUrl(url);
      return url;
    } catch (err: any) {
      setError(err.message || "Failed to generate link");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
      setShortUrl(null);
      setError(null);
      setIsLoading(false);
  };

  return {
    generateLink,
    shortUrl,
    isLoading,
    error,
    reset
  };
};
