
import { useState, useEffect, useMemo } from 'react';
import { TagUsage, TaggedContentItem, SortOption, ContentType, TagContentProvider } from '../../../types/tags.types';
import { tagService } from '../../../services/tagService';
import { PromptTagProvider } from '../providers/PromptTagProvider';
import { ThreadTagProvider } from '../providers/ThreadTagProvider';
import { useLenser } from '../../../context/LenserContext';

// Extensible provider registry
const PROVIDERS: TagContentProvider[] = [
  new ThreadTagProvider(),
  new PromptTagProvider()
];

export const useTagDetailController = (slug?: string) => {
  const { lenser } = useLenser();
  const [tag, setTag] = useState<TagUsage | null>(null);
  const [items, setItems] = useState<TaggedContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // View State
  const [filter, setFilter] = useState<ContentType | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('trending'); // Default to trending per requirements

  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      setLoading(true);
      setItems([]);

      try {
        // 1. Fetch Tag Metadata & Stats
        const tagData = await tagService.getTagDetails(slug);
        if (!tagData) {
            setTag(null);
            return;
        }
        setTag(tagData);

        // 2. Determine Active Providers
        const activeProviders = filter === 'all' 
            ? PROVIDERS 
            : PROVIDERS.filter(p => p.type === filter);

        // 3. Fetch Content in Parallel
        const results = await Promise.all(
            activeProviders.map(p => p.listByTag(slug, sort, lenser?.id))
        );

        // 4. Merge Results
        const merged = results.flat();

        // 5. Final Sort (Consistently merge across providers)
        if (sort === 'newest') {
            merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else {
            // "Popular/Trending" heuristic for mixed content:
            // Normalize: 1 prompt use ~= 1 thread like ~= 1 thread reply
            const getScore = (item: TaggedContentItem) => {
                const uses = item.stats.uses || 0;
                const likes = item.stats.likes || 0;
                const replies = item.stats.replies || 0;
                return uses + likes + replies;
            };
            merged.sort((a, b) => getScore(b) - getScore(a));
        }

        setItems(merged);

      } catch (err) {
        console.error("Tag Controller Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, filter, sort, lenser?.id]);

  // Derived available filters for UI
  const availableFilters = useMemo(() => {
      return [
          { value: 'all', label: 'All' },
          ...PROVIDERS.map(p => ({ value: p.type, label: p.label }))
      ];
  }, []);

  return {
    tag,
    items,
    loading,
    filter,
    setFilter,
    sort,
    setSort,
    availableFilters
  };
};
