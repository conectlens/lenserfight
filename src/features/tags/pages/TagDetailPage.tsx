
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTagDetailController } from '../hooks/useTagDetailController';
import { TagHeader } from '../components/TagHeader';
import { TagFilterBar } from '../components/TagFilterBar';
import { TagContentGrid } from '../components/TagContentGrid';
import { ChevronLeft } from 'lucide-react';

export const TagDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  
  const { 
    tag, 
    items, 
    loading, 
    filter, 
    setFilter, 
    sort, 
    setSort,
    availableFilters 
  } = useTagDetailController(slug);

  if (!loading && !tag) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Topic Not Found</h2>
              <button onClick={() => navigate('/tags')} className="text-primary-700 font-medium hover:underline">
                  Return to Explore
              </button>
          </div>
      );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 sm:px-6">
        {/* Navigation */}
        <div className="py-6">
            <button 
                onClick={() => navigate('/tags')} 
                className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
                <ChevronLeft size={16} className="mr-1" />
                Back to Topics
            </button>
        </div>

        {/* Header Block */}
        {tag ? (
            <TagHeader tag={tag} totalItems={items.length} />
        ) : (
            <div className="h-48 bg-gray-100 rounded-2xl animate-pulse mb-8"></div>
        )}

        {/* Filters & Controls */}
        <TagFilterBar 
            filters={availableFilters}
            activeFilter={filter}
            onFilterChange={setFilter}
            activeSort={sort}
            onSortChange={setSort}
        />

        {/* Content Area */}
        <TagContentGrid items={items} loading={loading} />

        {/* Footer / Pagination Placeholder */}
        {!loading && items.length > 0 && (
            <div className="mt-12 flex justify-center">
                <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">End of Results</p>
            </div>
        )}
    </div>
  );
};
