import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Modal } from '../../../components/Modal';
import { Avatar } from '../../../components/Avatar';
import { NetworkUser } from '../../../types/lenser.types';
import { lenserService } from '../../../services/lenserService';
import { UserX } from 'lucide-react';

interface NetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
  lenserId: string;
  type: 'followers' | 'following';
}

export const NetworkModal: React.FC<NetworkModalProps> = ({ isOpen, onClose, lenserId, type }) => {
  const [users, setUsers] = useState<NetworkUser[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  const loadUsers = async (pageNum: number, reset = false) => {
    if (!lenserId) return;
    setLoading(true);
    try {
      const newUsers = await lenserService.getLenserNetwork(lenserId, type, pageNum);
      if (newUsers.length === 0) {
        setHasMore(false);
      } else {
        setUsers(prev => reset ? newUsers : [...prev, ...newUsers]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
        setUsers([]);
        setPage(1);
        setHasMore(true);
        loadUsers(1, true);
    }
  }, [isOpen, lenserId, type]);

  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => {
            const nextPage = prev + 1;
            loadUsers(nextPage);
            return nextPage;
        });
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const title = type === 'followers' ? 'Followers' : 'Following';

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="min-h-[300px] max-h-[60vh] overflow-y-auto -mx-6 px-6">
        {users.map((user, index) => (
            <div key={user.id} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                    <Avatar src={user.avatar_url} size="md" className="!w-10 !h-10" />
                    <div>
                        <p className="text-sm font-semibold text-gray-900">{user.display_name}</p>
                        <p className="text-xs text-gray-500">@{user.handle}</p>
                    </div>
                </div>
                <button 
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                        user.is_following 
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                        : 'bg-primary text-gray-900 hover:bg-yellow-300'
                    }`}
                >
                    {user.is_following ? 'Following' : 'Follow'}
                </button>
                {/* Intersection anchor for last element */}
                {index === users.length - 1 && <div ref={lastElementRef} />}
            </div>
        ))}
        
        {loading && (
            <div className="space-y-3 py-3">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 w-24 rounded"></div>
                            <div className="h-2 bg-gray-200 w-16 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {!loading && users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 text-gray-300">
                    <UserX size={24} />
                </div>
                <p className="text-gray-500 font-medium text-sm">No {type} found.</p>
            </div>
        )}
      </div>
    </Modal>
  );
};