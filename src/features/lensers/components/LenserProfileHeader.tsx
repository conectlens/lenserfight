
import React, { useState, useEffect } from 'react';
import { Lenser, LenserStats, SocialLink } from '../../../types/lenser.types';
import { Avatar } from '../../../components/Avatar';
import { formatCount } from '../../../utils/numberUtils';
import { Camera, Pencil, Globe, Link as LinkIcon, Linkedin, Github, Twitter, Instagram, Facebook, Youtube } from 'lucide-react';
import { useLenser } from '../../../context/LenserContext';
import { AvatarSelectionModal } from './AvatarSelectionModal';
import { BannerSelectionModal } from './BannerSelectionModal';
import { EditProfileModal } from './EditProfileModal';
import { NetworkModal } from './NetworkModal';
import { FEATURES } from '../../../config/runtimeConfig';
import { socialLinksService } from '../../../services/socialLinksService';

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
  
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // Network Modal State
  const [networkType, setNetworkType] = useState<'followers' | 'following' | null>(null);

  // Fetch social links
  useEffect(() => {
      const fetchLinks = async () => {
          try {
              const links = await socialLinksService.getLinks(lenser.id);
              setSocialLinks(links);
          } catch (e) {
              console.error(e);
          }
      };
      fetchLinks();
  }, [lenser.id]);

  // Refetch when edit modal closes (assuming save happened)
  const handleEditClose = async () => {
      setShowEditModal(false);
      // Refresh links
      const links = await socialLinksService.getLinks(lenser.id);
      setSocialLinks(links);
  };

  const handleUpdate = async (data: Partial<Lenser>) => {
      if (!isOwner) return;
      setIsUpdating(true);
      try {
          const updated = await updateLenserProfile(data); 
          onProfileUpdate(updated); 
          setShowAvatarModal(false);
          setShowBannerModal(false);
          setShowEditModal(false);
          
          // Also refresh links in case they were updated
          const links = await socialLinksService.getLinks(lenser.id);
          setSocialLinks(links);
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

  const StatsBlock = ({ mobile = false }) => (
    <div className={`flex items-center gap-3 text-sm ${mobile ? 'justify-center text-gray-600' : 'text-gray-500'}`}>
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
        {!mobile && (
            <>
                <span className="text-gray-300">•</span>
                <span className="text-gray-500 font-medium">@{lenser.handle}</span>
            </>
        )}
    </div>
  );

  const getWebsiteLabel = () => {
      if (lenser.website_display_name) {
          return lenser.website_display_name.replace(/^https?:\/\//, '').replace(/\/$/, '');
      }
      return lenser.website_url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'Website';
  };

  const getPlatformIcon = (platform: string) => {
      switch (platform) {
          case 'LinkedIn': return <Linkedin size={18} />;
          case 'GitHub': return <Github size={18} />;
          case 'X': return <Twitter size={18} />;
          case 'Instagram': return <Instagram size={18} />;
          case 'Facebook': return <Facebook size={18} />;
          case 'Youtube': return <Youtube size={18} />;
          default: return <LinkIcon size={18} />;
      }
  };

  return (
    <div className="relative mb-6 md:mb-8">
       {/* Banner Area */}
       <div className="h-32 md:h-64 rounded-3xl overflow-hidden bg-gray-100 relative z-0 group">
          {lenser.banner_url ? (
            <img 
              src={lenser.banner_url} 
              alt="Profile Banner" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
                <span className="text-gray-400 opacity-50 text-4xl md:text-6xl font-black tracking-tighter mix-blend-overlay">LENSER</span>
            </div>
          )}
          
          {isOwner && (
              <button 
                onClick={() => setShowBannerModal(true)}
                className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white p-2 rounded-full backdrop-blur-sm transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                title="Change Header Image"
              >
                  <Camera size={20} />
              </button>
          )}
       </div>

       {/* Profile Info Card Overlay */}
       <div className="px-0 md:px-6 relative z-10 -mt-6 md:-mt-16">
          <div className="bg-white md:rounded-2xl shadow-sm border-b md:border border-gray-100 p-6 md:p-8 relative">
            
            {/* Mobile Edit Button */}
            {isOwner && (
                <button 
                    onClick={() => setShowEditModal(true)}
                    className="md:hidden absolute top-4 right-4 p-2.5 text-gray-500 hover:bg-gray-50 hover:text-gray-900 rounded-full transition-colors z-20 border border-transparent hover:border-gray-200"
                    title="Edit Profile"
                >
                    <Pencil size={18} />
                </button>
            )}

            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
                {/* Avatar */}
                <div className="flex-shrink-0 -mt-16 md:-mt-20 relative group/avatar">
                  <div className="relative rounded-full">
                      <Avatar 
                          src={lenser.avatar_url} 
                          alt={lenser.display_name} 
                          className="!w-28 !h-28 md:!w-40 md:!h-40 rounded-full border-4 border-white shadow-md bg-white" 
                      />
                      
                      {lenser.join_order !== undefined && (
                          <div 
                              className="absolute -bottom-1 -right-1 md:bottom-1 md:right-1 z-20 bg-gradient-to-r from-yellow-300 via-yellow-400 to-orange-400 border-[3px] border-white shadow-lg px-3 py-1 rounded-full flex items-center justify-center transform transition-transform hover:scale-105 hover:rotate-2 cursor-default group/badge"
                              title={`Member #${lenser.join_order}`}
                          >
                              <div className="flex items-center gap-1">
                                  <span className="text-[11px] font-black text-yellow-950 tracking-tight leading-none font-mono">
                                      #{lenser.join_order}
                                  </span>
                              </div>
                          </div>
                      )}

                      {isOwner && (
                        <button 
                            onClick={() => setShowAvatarModal(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity backdrop-blur-[2px] z-10"
                            title="Change Avatar"
                        >
                            <Camera size={32} />
                        </button>
                      )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-1 min-w-0 w-full flex flex-col items-center md:items-start text-center md:text-left">
                   
                   {/* Desktop: Stats Row Top */}
                   <div className="hidden md:block mb-1">
                       <StatsBlock />
                   </div>

                   <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 w-full mb-1">
                      <div className="flex flex-col gap-1 w-full md:w-auto items-center md:items-start">
                          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
                              {lenser.display_name}
                          </h1>
                          <p className="md:hidden text-gray-500 text-sm font-medium">@{lenser.handle}</p>
                      </div>
                      
                      {isOwner && (
                          <button 
                            onClick={() => setShowEditModal(true)}
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-colors mt-2 md:mt-0"
                          >
                              <Pencil size={16} />
                              Edit Profile
                          </button>
                      )}
                   </div>

                   {/* Mobile: Stats */}
                   <div className="md:hidden w-full mb-4 mt-2">
                       <StatsBlock mobile />
                   </div>

                   <div className="w-full h-px bg-gray-100 my-2 md:hidden"></div>
                   
                   <div className="flex flex-col gap-2 mb-3 md:mb-4 w-full">
                        {lenser.headline && (
                            <p className="font-medium text-gray-800 mt-2 md:mt-0">{lenser.headline}</p>
                        )}
                        
                        <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-3xl whitespace-pre-wrap">
                            {lenser.bio || (isOwner ? "Add a bio to tell your story." : "")}
                        </p>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                            {lenser.website_url && (
                                <a 
                                    href={lenser.website_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline font-medium"
                                >
                                    <Globe size={14} />
                                    {getWebsiteLabel()}
                                </a>
                            )}

                            {/* Social Links Row */}
                            {socialLinks.length > 0 && (
                                <div className="flex items-center gap-3">
                                    {lenser.website_url && <span className="text-gray-300 text-xs">|</span>}
                                    {socialLinks.map(link => (
                                        <a 
                                            key={link.id} 
                                            href={link.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-gray-400 hover:text-gray-700 transition-colors p-1 -m-1"
                                            title={link.label || link.platform}
                                        >
                                            {getPlatformIcon(link.platform)}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                   </div>
                </div>
            </div>
          </div>
       </div>

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
                    onClose={handleEditClose} 
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
