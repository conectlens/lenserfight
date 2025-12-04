
import React, { useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTagDetailController } from '../hooks/useTagDetailController';
import { TagHeader } from '../components/TagHeader';
import { TagFilterBar } from '../components/TagFilterBar';
import { TagContentGrid } from '../components/TagContentGrid';
import { useAuth } from '../../../context/AuthContext';
import { SEOHead } from '../../../components/SEOHead';

export const TagDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
        navigate('/login', { state: { from: location }, replace: true });
    }
  }, [authLoading, isAuthenticated, navigate, location]);

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

  if (authLoading || (!isAuthenticated && !authLoading)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
  }

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
    <div className="w-full">
        <SEOHead type="tag" data={tag} />
        
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
