import React from 'react';
import { Lenser } from '../../../types/lenser.types';
import { Avatar } from '../../../components/Avatar';
import { formatCount } from '../../../utils/numberUtils';
import { Users } from 'lucide-react';

interface LenserProfileHeaderProps {
  lenser: Lenser;
  followersCount: number;
}

export const LenserProfileHeader: React.FC<LenserProfileHeaderProps> = ({ lenser, followersCount }) => {
  return (
    <div className="relative mb-8">
       {/* Banner Area */}
       <div className="h-48 md:h-64 rounded-3xl overflow-hidden bg-gray-100 relative z-0">
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
       </div>

       {/* Profile Info Card Overlay */}
       <div className="px-4 md:px-6 relative z-10 -mt-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
                {/* Avatar - Negative margin to overlap banner */}
                <div className="flex-shrink-0 -mt-20 relative">
                  <Avatar 
                      src={lenser.avatar_url} 
                      alt={lenser.display_name} 
                      // Force size overrides
                      className="!w-32 !h-32 sm:!w-40 sm:!h-40 rounded-full border-4 border-white shadow-md bg-white" 
                  />
                </div>

                {/* Content */}
                <div className="flex-1 pt-1 min-w-0">
                   <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                      <div>
                          <h1 className="text-3xl font-bold text-gray-900 leading-tight">{lenser.display_name}</h1>
                          <p className="text-gray-500 font-medium text-lg">@{lenser.handle}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-2 mb-4 text-gray-600">
                      <Users size={16} />
                      <span className="font-semibold text-gray-900">{formatCount(followersCount)}</span>
                      <span className="text-sm">Followers</span>
                   </div>

                   <p className="text-gray-700 leading-relaxed max-w-3xl">
                     {lenser.headline || lenser.bio || "No bio yet."}
                   </p>
                </div>
            </div>
          </div>
       </div>
    </div>
  );
};