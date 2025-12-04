
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLenser } from '../../../context/LenserContext';
import { useAuth } from '../../../context/AuthContext';
import { Avatar } from '../../../components/Avatar';
import { Button } from '../../../components/Button';
import { InputField } from '../../auth/components/InputField';
import { notificationService } from '../../../services/notificationService';
import { Notification } from '../../../types/notification.types';
import { timeAgo } from '../../../utils/dateUtils';
import { Card } from '../../../components/Card';
import { AvatarSelectionModal } from '../../lensers/components/AvatarSelectionModal';
import { ExternalLink, Check, Camera, Eye, Lock } from 'lucide-react';
import { FEATURES } from '../../../config/runtimeConfig';

export const SettingsPage: React.FC = () => {
  const { lenser, updateLenserProfile } = useLenser();
  const { user } = useAuth();
  const location = useLocation();
  
  // Tab State
  const [activeTab, setActiveTab] = useState('Profile');
  const tabs = ['Account', 'Profile'];
  
  if (FEATURES.NOTIFICATIONS) {
      tabs.push('Notifications');
  }

  // Handle navigation state for tabs
  useEffect(() => {
    if (location.state && (location.state as any).tab) {
        const targetTab = (location.state as any).tab;
        if (tabs.includes(targetTab)) {
            setActiveTab(targetTab);
        }
    }
  }, [location.state]);

  // Profile Form State
  const [formData, setFormData] = useState({
      displayName: '',
      handle: '',
      bio: '',
      visibility: 'public' as 'public' | 'private'
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifTab, setNotifTab] = useState<'All' | 'Unread'>('All');

  useEffect(() => {
      if (lenser) {
          setFormData({
              displayName: lenser.display_name || '',
              handle: lenser.handle || '',
              bio: lenser.bio || '',
              visibility: lenser.visibility || 'public'
          });
      }
  }, [lenser]);

  useEffect(() => {
      if (activeTab === 'Notifications' && FEATURES.NOTIFICATIONS) {
          loadNotifications();
      }
  }, [activeTab]);

  const loadNotifications = async () => {
      setNotifLoading(true);
      const data = await notificationService.getNotifications();
      setNotifications(data);
      setNotifLoading(false);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleProfileSave = async () => {
      if (!lenser) return;
      setIsSaving(true);
      try {
          await updateLenserProfile({
              display_name: formData.displayName,
              bio: formData.bio,
              visibility: formData.visibility
          });
      } catch (e) {
          console.error(e);
      } finally {
          setIsSaving(false);
      }
  };

  const handleAvatarUpdate = async (url: string | null) => {
      if (!lenser) return;
      setIsSaving(true);
      try {
          await updateLenserProfile({ avatar_url: url });
          setShowAvatarModal(false);
      } catch (e) {
          console.error(e);
      } finally {
          setIsSaving(false);
      }
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Filter Notifications
  const filteredNotifications = notifications.filter(n => {
      if (notifTab === 'Unread') return !n.isRead;
      return true;
  });

  return (
    <div className="max-w-6xl mx-auto py-8">
       <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

       <div className="flex flex-col md:flex-row gap-12">
           {/* Sidebar */}
           <div className="w-full md:w-64 flex-shrink-0 space-y-1">
               {tabs.map(tab => (
                   <button
                       key={tab}
                       onClick={() => setActiveTab(tab)}
                       className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                           activeTab === tab 
                           ? 'bg-gray-100 text-gray-900' 
                           : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                       }`}
                   >
                       {tab}
                   </button>
               ))}
               
               {/* External Link Style Tabs */}
               <div className="pt-4 border-t border-gray-100 mt-4 space-y-1">
                   <a
                       href="/privacy"
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center justify-between w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                   >
                       Privacy & Security <ExternalLink size={14} />
                   </a>
                   <a
                       href="/terms"
                       target="_blank"
                       rel="noopener noreferrer"
                       className="flex items-center justify-between w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                   >
                       Terms & Conditions <ExternalLink size={14} />
                   </a>
               </div>
           </div>

           {/* Content */}
           <div className="flex-1 max-w-2xl">
               
               {/* ACCOUNT TAB */}
               {activeTab === 'Account' && (
                   <div>
                       <h2 className="text-xl font-bold text-gray-900 mb-2">Account</h2>
                       <p className="text-sm text-gray-500 mb-8 border-b border-gray-100 pb-6">
                           Manage your account credentials and basic information.
                       </p>
                       
                       <div className="space-y-6">
                           <div>
                               <label className="block text-sm font-medium text-gray-700 mb-1.5">Registered Name</label>
                               <input 
                                   disabled 
                                   value={user?.raw_user_meta_data?.display_name || 'N/A'} 
                                   className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
                               />
                               <p className="text-xs text-gray-400 mt-1">This is the name used for account recovery and billing, stored in identity provider.</p>
                           </div>

                           <div>
                               <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                               <input 
                                   disabled 
                                   value={user?.email || ''} 
                                   className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
                               />
                           </div>
                           
                           <div>
                               <label className="block text-sm font-medium text-gray-700 mb-1.5">User ID</label>
                               <input 
                                   disabled 
                                   value={user?.id || ''} 
                                   className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 font-mono text-xs"
                               />
                           </div>
                           
                           <div>
                               <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Sign In</label>
                               <input 
                                   disabled 
                                   value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'} 
                                   className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-500"
                               />
                           </div>
                       </div>
                   </div>
               )}

               {/* PROFILE TAB */}
               {activeTab === 'Profile' && (
                   <div>
                       <h2 className="text-xl font-bold text-gray-900 mb-2">Public Profile</h2>
                       <p className="text-sm text-gray-500 mb-8 border-b border-gray-100 pb-6">
                           This information will be displayed publicly on your Lenser profile.
                       </p>

                       {/* Avatar Section - Centered on Mobile */}
                       <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8 mb-8">
                           <div className="flex-shrink-0 flex flex-col items-center">
                               <div className="relative group cursor-pointer" onClick={() => setShowAvatarModal(true)}>
                                   <Avatar src={lenser?.avatar_url} alt={lenser?.display_name} className="!w-24 !h-24 sm:!w-32 sm:!h-32" />
                                   <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                       <Camera className="text-white" size={24} />
                                   </div>
                               </div>
                               <button 
                                   onClick={() => setShowAvatarModal(true)}
                                   className="text-xs text-primary-700 font-medium mt-2 text-center w-full hover:underline"
                               >
                                   Change Avatar
                               </button>
                           </div>

                           <div className="flex-1 space-y-6 w-full">
                               <InputField 
                                   label="Display name" 
                                   name="displayName"
                                   value={formData.displayName}
                                   onChange={handleProfileChange}
                               />

                               <div>
                                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                                   <div className="relative">
                                       <input
                                           className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none cursor-not-allowed opacity-75"
                                           name="handle"
                                           value={formData.handle}
                                           disabled
                                           readOnly
                                       />
                                   </div>
                               </div>
                           </div>
                       </div>

                       <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleProfileChange}
                                    rows={4}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors outline-none resize-none"
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Profile Visibility</label>
                                {/* Blurred/Disabled Container */}
                                <div className="grid grid-cols-2 gap-4 blur-[2px] opacity-60 pointer-events-none select-none relative">
                                    <button
                                        type="button"
                                        className={`flex items-center gap-3 p-4 border rounded-xl transition-all border-primary bg-primary/5 ring-1 ring-primary`}
                                    >
                                        <div className={`p-2 rounded-full bg-primary/20 text-gray-900`}>
                                            <Eye size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-gray-900">Public</p>
                                            <p className="text-xs text-gray-500">Visible to everyone</p>
                                        </div>
                                    </button>
                                    
                                    <button
                                        type="button"
                                        className={`flex items-center gap-3 p-4 border rounded-xl transition-all border-gray-200`}
                                    >
                                        <div className={`p-2 rounded-full bg-gray-100 text-gray-500`}>
                                            <Lock size={20} />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-gray-900">Private</p>
                                            <p className="text-xs text-gray-500">Only visible to you</p>
                                        </div>
                                    </button>
                                </div>
                                {/* Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center z-10 top-6">
                                    <span className="bg-gray-900 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                                        Coming Soon
                                    </span>
                                </div>
                            </div>
                       </div>

                       <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-gray-100">
                           <Button variant="secondary" className="w-auto px-6">Cancel</Button>
                           <Button onClick={handleProfileSave} isLoading={isSaving} className="w-auto px-6 bg-primary hover:bg-yellow-400">Save changes</Button>
                       </div>
                   </div>
               )}

               {/* NOTIFICATIONS TAB */}
               {activeTab === 'Notifications' && FEATURES.NOTIFICATIONS && (
                   <div>
                       <div className="flex items-center justify-between mb-2">
                           <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                           {notifications.some(n => !n.isRead) && (
                                <button 
                                    onClick={handleMarkAllRead}
                                    className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1 whitespace-nowrap"
                                >
                                    <Check size={16} /> Mark all read
                                </button>
                           )}
                       </div>
                       <p className="text-sm text-gray-500 mb-6 border-b border-gray-100 pb-6">
                           Manage your alerts and updates.
                       </p>

                       <div className="flex gap-2 mb-6">
                           <button
                             onClick={() => setNotifTab('All')}
                             className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${notifTab === 'All' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
                           >
                               All
                           </button>
                           <button
                             onClick={() => setNotifTab('Unread')}
                             className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${notifTab === 'Unread' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'}`}
                           >
                               Unread
                           </button>
                       </div>

                       {notifLoading ? (
                           <div className="space-y-4">
                              {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-50 animate-pulse rounded-lg"></div>)}
                           </div>
                       ) : filteredNotifications.length === 0 ? (
                           <div className="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                               <p>No notifications found.</p>
                           </div>
                       ) : (
                           <div className="space-y-3">
                               {filteredNotifications.map(notification => (
                                    <Card 
                                        key={notification.id} 
                                        className={`p-4 flex items-center gap-4 transition-all hover:bg-gray-50 cursor-pointer border-gray-100 ${!notification.isRead ? 'bg-white shadow-sm border-gray-200' : 'bg-gray-50/50'}`}
                                    >
                                      {!notification.isRead && <div className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"></div>}
                                      <div className="flex-shrink-0">
                                         <Avatar src={notification.actor?.avatarUrl} alt={notification.actor?.name || 'User'} size="md" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                                          {notification.description && <p className="text-xs text-gray-500 mt-0.5">{notification.description}</p>}
                                      </div>
                                      <div className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(notification.createdAt)}</div>
                                    </Card>
                               ))}
                           </div>
                       )}
                   </div>
               )}
           </div>
       </div>

       {/* Avatar Modal */}
       <AvatarSelectionModal 
           isOpen={showAvatarModal} 
           onClose={() => setShowAvatarModal(false)}
           onSelect={handleAvatarUpdate}
           isLoading={isSaving}
           currentUrl={lenser?.avatar_url}
       />
    </div>
  );
};
