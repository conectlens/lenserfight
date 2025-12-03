import React, { useState } from 'react';
import { Lenser, LenserStats } from '../../../types/lenser.types';
import { Avatar } from '../../../components/Avatar';
import { formatCount } from '../../../utils/numberUtils';
import { Camera, Pencil, Globe, Link as LinkIcon } from 'lucide-react';
import { useLenser } from '../../../context/LenserContext';
import { AvatarSelectionModal } from './AvatarSelectionModal';
import { BannerSelectionModal } from './BannerSelectionModal';
import { EditProfileModal } from './EditProfileModal';
import { NetworkModal } from './NetworkModal';
import { FEATURES } from '../../../config/runtimeConfig';

interface LenserProfileHeaderProps {
  lenser: Lenser;
  stats: LenserStats | null;
  isOwner: boolean;
  onProfileUpdate: (updatedLenser: Lenser) => void;
}

export const LenserProfileHeader: React.FC<LenserProfileHeaderProps> = ({ lenser, stats, isOwner, onProfileUpdate }) => {
  const { updateLenserProfile } = useLenser();
  
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Network Modal State
  const [networkType, setNetworkType] = useState<'followers' | 'following' | null>(null);

  const handleUpdate = async (data: Partial<Lenser>) => {
      if (!isOwner) return;
      setIsUpdating(true);
      try {
          await updateLenserProfile(data); // Context update
          
          // Manually notify parent to update local state immediately without refresh
          // We merge existing lenser with data for optimistic UI since context method returns void
          onProfileUpdate({ ...lenser, ...data } as Lenser); 

          setShowAvatarModal(false);
          setShowBannerModal(false);
          setShowEditModal(false);
      } catch (e) {
          console.error("Failed to update profile", e);
          alert("Failed to update profile. Please try again.");
      } finally {
          setIsUpdating(false);
      }
  };

  const followersCount = stats?.followersCount || 0;
  const followingCount = stats?.followingCount || 0;

  const showNetworkLinks = FEATURES.NETWORK_LINKS;

  return (
    <div className="relative mb-8">
       {/* Banner Area */}
       <div className="h-48 md:h-64 rounded-3xl overflow-hidden bg-gray-100 relative z-0 group">
          {lenser.banner_url ? (
            <img 
              src={lenser.banner_url} 
              alt="Profile Banner" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
                <span className="text-gray-400 opacity-50 text-6xl font-black tracking-tighter mix-blend-overlay">LENSER</span>
            </div>
          )}
          
          {/* Edit Banner Button (Owner Only) */}
          {isOwner && (
              <button 
                onClick={() => setShowBannerModal(true)}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Change Header Image"
              >
                  <Camera size={20} />
              </button>
          )}
       </div>

       {/* Profile Info Card Overlay */}
       <div className="px-4 md:px-6 relative z-10 -mt-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0 -mt-20 relative group/avatar">
                  <div className="relative rounded-full">
                      <Avatar 
                          src={lenser.avatar_url} 
                          alt={lenser.display_name} 
                          // Force size overrides
                          className="!w-32 !h-32 sm:!w-40 sm:!h-40 rounded-full border-4 border-white shadow-md bg-white" 
                      />
                      {/* Edit Avatar Button (Owner Only) */}
                      {isOwner && (
                        <button 
                            onClick={() => setShowAvatarModal(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-[2px]"
                            title="Change Avatar"
                        >
                            <Camera size={32} />
                        </button>
                      )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1 min-w-0 w-full">
                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-2">
                      <div className="flex flex-col gap-1">
                          
                          {/* Row 1: Stats & Handle (Left of username/handle area per request) */}
                          <div className="flex items-center flex-wrap gap-3 text-sm mb-1">
                             <div 
                                className={`flex items-center gap-1 transition-colors group/stats ${showNetworkLinks ? 'cursor-pointer hover:text-primary-700' : ''}`}
                                onClick={showNetworkLinks ? () => setNetworkType('followers') : undefined}
                             >
                                <span className={`font-bold text-gray-900 ${showNetworkLinks ? 'group-hover/stats:text-primary-700' : ''}`}>{formatCount(followersCount)}</span>
                                <span className="text-gray-500">Followers</span>
                             </div>
                             <span className="text-gray-300">•</span>
                             <div 
                                className={`flex items-center gap-1 transition-colors group/stats ${showNetworkLinks ? 'cursor-pointer hover:text-primary-700' : ''}`}
                                onClick={showNetworkLinks ? () => setNetworkType('following') : undefined}
                             >
                                <span className={`font-bold text-gray-900 ${showNetworkLinks ? 'group-hover/stats:text-primary-700' : ''}`}>{formatCount(followingCount)}</span>
                                <span className="text-gray-500">Following</span>
                             </div>
                             <span className="text-gray-300">•</span>
                             <span className="text-gray-500 font-medium">@{lenser.handle}</span>
                          </div>

                          {/* Row 2: Display Name */}
                          <h1 className="text-3xl font-bold text-gray-900 leading-tight">{lenser.display_name}</h1>
                      </div>
                      
                      {/* Edit Profile Button (Owner Only) */}
                      {isOwner && (
                          <button 
                            onClick={() => setShowEditModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-colors mt-2 md:mt-0"
                          >
                              <Pencil size={16} />
                              Edit Profile
                          </button>
                      )}
                   </div>
                   
                   {/* Row 3: Website & Headline */}
                   <div className="flex flex-col gap-2 mb-4">
                        {lenser.website_url && (
                            <a 
                                href={lenser.website_url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium w-fit"
                            >
                                <LinkIcon size={14} />
                                {lenser.website_url.replace(/^https?:\/\//, '')}
                            </a>
                        )}
                        {lenser.headline && <p className="font-medium text-gray-800">{lenser.headline}</p>}
                   </div>

                   {/* Row 4: Bio */}
                   <p className="text-gray-600 leading-relaxed max-w-3xl whitespace-pre-wrap">
                     {lenser.bio || "No bio yet."}
                   </p>
                </div>
            </div>
          </div>
       </div>

       {/* Modals */}
       {isOwner && (
           <>
               <AvatarSelectionModal 
                    isOpen={showAvatarModal} 
                    onClose={() => setShowAvatarModal(false)} 
                    onSelect={(url) => handleUpdate({ avatar_url: url })}
                    isLoading={isUpdating}
                    currentUrl={lenser.avatar_url}
               />
               <BannerSelectionModal 
                    isOpen={showBannerModal} 
                    onClose={() => setShowBannerModal(false)} 
                    onSelect={(url) => handleUpdate({ banner_url: url })}
                    isLoading={isUpdating}
                    currentUrl={lenser.banner_url}
               />
               <EditProfileModal 
                    isOpen={showEditModal} 
                    onClose={() => setShowEditModal(false)} 
                    onSave={(data) => handleUpdate(data)}
                    currentData={lenser}
                    isLoading={isUpdating}
               />
           </>
       )}
       
       {showNetworkLinks && networkType && (
           <NetworkModal 
                isOpen={!!networkType} 
                onClose={() => setNetworkType(null)} 
                type={networkType} 
                lenserId={lenser.id} 
           />
       )}
    </div>
  );
};