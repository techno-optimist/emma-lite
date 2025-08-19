import React, { useState, useEffect } from 'react';
import { 
  X, Lock, Users, Globe, Heart, Link, Mail, QrCode, 
  Facebook, Twitter, Instagram, MessageCircle, Copy, 
  Check, Eye, Download, Settings, Shield, Clock,
  UserPlus, Share2, AlertCircle, Info, Loader2
} from 'lucide-react';
import { apiService } from '../../services/api';

const ShareModal = ({ memory, isOpen, onClose }) => {
  // Privacy state
  const [privacyLevel, setPrivacyLevel] = useState('private');
  const [privacySettings, setPrivacySettings] = useState({
    allow_downloads: true,
    allow_comments: true,
    password_protected: false,
    has_password: false
  });
  const [isLoadingPrivacy, setIsLoadingPrivacy] = useState(false);
  const [privacyError, setPrivacyError] = useState('');

  // Share links state
  const [shareLinks, setShareLinks] = useState([]);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [linkSettings, setLinkSettings] = useState({
    expires_in_days: 7,
    password: '',
    max_access_count: null
  });

  // UI state
  const [activeTab, setActiveTab] = useState('privacy');
  const [copiedLink, setCopiedLink] = useState('');
  const [showLinkSettings, setShowLinkSettings] = useState(false);
  const [selectedShareLink, setSelectedShareLink] = useState(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [qrCodeData, setQrCodeData] = useState('');

  // Social sharing state
  const [emailRecipients, setEmailRecipients] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Collaboration state
  const [collaborations, setCollaborations] = useState({ owner: null, collaborators: [] });
  const [loadingCollaborations, setLoadingCollaborations] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'viewer',
    expires_in_days: 30
  });
  const [sendingInvite, setSendingInvite] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Advanced settings state
  const [advancedSettings, setAdvancedSettings] = useState({
    allowDownloads: true,
    allowComments: true,
    requirePassword: false,
    notifyOnAccess: true,
    trackAnalytics: true
  });

  useEffect(() => {
    if (isOpen && memory) {
      loadPrivacySettings();
      loadShareLinks();
      loadCollaborations();
      loadAnalytics();
    }
  }, [isOpen, memory]);

  const loadPrivacySettings = async () => {
    try {
      setIsLoadingPrivacy(true);
      setPrivacyError('');
      
      const response = await apiService.getMemoryCapsulePrivacy(memory.id);
      setPrivacyLevel(response.privacy_level);
      setPrivacySettings({
        allow_downloads: response.allow_downloads,
        allow_comments: response.allow_comments,
        password_protected: response.password_protected,
        has_password: response.has_password
      });
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      setPrivacyError('Failed to load privacy settings');
    } finally {
      setIsLoadingPrivacy(false);
    }
  };

  const loadShareLinks = async () => {
    try {
      const links = await apiService.getMemoryCapsuleShareLinks(memory.id);
      setShareLinks(links);
    } catch (error) {
      console.error('Failed to load share links:', error);
    }
  };

  const updatePrivacyLevel = async (newLevel) => {
    try {
      setIsLoadingPrivacy(true);
      setPrivacyError('');
      
      await apiService.updateMemoryCapsulePrivacy(memory.id, {
        privacy_level: newLevel,
        ...privacySettings
      });
      
      setPrivacyLevel(newLevel);
      
      // Show success feedback
      setTimeout(() => {
        // Could add a success toast here
      }, 100);
    } catch (error) {
      console.error('Failed to update privacy level:', error);
      setPrivacyError('Failed to update privacy settings. Please try again.');
    } finally {
      setIsLoadingPrivacy(false);
    }
  };

  const updatePrivacySettings = async (newSettings) => {
    try {
      setIsLoadingPrivacy(true);
      setPrivacyError('');
      
      await apiService.updateMemoryCapsulePrivacy(memory.id, {
        privacy_level: privacyLevel,
        ...newSettings
      });
      
      setPrivacySettings(newSettings);
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      setPrivacyError('Failed to update privacy settings. Please try again.');
    } finally {
      setIsLoadingPrivacy(false);
    }
  };

  const generateShareLink = async () => {
    try {
      setIsGeneratingLink(true);
      
      const linkData = {
        expires_in_days: linkSettings.expires_in_days || null,
        password: linkSettings.password || null,
        max_access_count: linkSettings.max_access_count || null
      };
      
      // Remove null/empty values
      Object.keys(linkData).forEach(key => {
        if (linkData[key] === null || linkData[key] === '') {
          delete linkData[key];
        }
      });
      
      const response = await apiService.createMemoryCapsuleShareLink(memory.id, linkData);
      await loadShareLinks(); // Refresh the list
      setShowLinkSettings(false);
      setLinkSettings({ expires_in_days: 7, password: '', max_access_count: null });
      
      // Auto-copy the new link
      if (response.share_link && response.share_link.share_url) {
        await copyToClipboard(response.share_link.share_url, response.share_link.id);
      }
    } catch (error) {
      console.error('Failed to generate share link:', error);
      // Could add error toast here
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const copyToClipboard = async (text, linkId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(linkId);
      setTimeout(() => setCopiedLink(''), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const revokeShareLink = async (linkId) => {
    try {
      await apiService.revokeShareLink(linkId);
      await loadShareLinks(); // Refresh the list
    } catch (error) {
      console.error('Failed to revoke share link:', error);
    }
  };

  const generateQRCode = (url) => {
    // Simple QR code generation using a QR code API service
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
    setQrCodeData(qrApiUrl);
    setShowQRCode(true);
  };

  const shareToSocial = (platform, url) => {
    const encodedUrl = encodeURIComponent(url);
    const encodedTitle = encodeURIComponent(`Check out my memory: ${memory?.title}`);
    const encodedDescription = encodeURIComponent(memory?.description || 'A precious memory to share');
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const sendEmailInvitation = async () => {
    if (!emailRecipients.trim()) return;
    
    try {
      setSendingEmail(true);
      
      // For now, we'll use mailto: link since we don't have email service configured
      const subject = encodeURIComponent(`${memory?.title} - Memory Shared with You`);
      const body = encodeURIComponent(
        `Hi there!\n\nI wanted to share a special memory with you: "${memory?.title}"\n\n${emailMessage}\n\nView the memory here: ${selectedShareLink?.share_url || 'Link will be generated'}\n\nBest regards`
      );
      
      const mailtoUrl = `mailto:${emailRecipients}?subject=${subject}&body=${body}`;
      window.open(mailtoUrl);
      
      // Reset form
      setEmailRecipients('');
      setEmailMessage('');
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setSendingEmail(false);
    }
  };

  const loadCollaborations = async () => {
    try {
      setLoadingCollaborations(true);
      const response = await apiService.getMemoryCapsuleInvitations(memory.id);
      setCollaborations(response);
    } catch (error) {
      console.error('Failed to load collaborations:', error);
    } finally {
      setLoadingCollaborations(false);
    }
  };

  const sendCollaborationInvite = async () => {
    if (!inviteData.email.trim()) return;
    
    try {
      setSendingInvite(true);
      
      await apiService.inviteCollaborator(memory.id, inviteData);
      await loadCollaborations(); // Refresh the list
      
      // Reset form
      setInviteData({
        email: '',
        role: 'viewer',
        expires_in_days: 30
      });
      setShowInviteForm(false);
    } catch (error) {
      console.error('Failed to send collaboration invite:', error);
    } finally {
      setSendingInvite(false);
    }
  };

  const updateCollaboratorRole = async (invitationId, newRole) => {
    try {
      await apiService.updateCollaboratorRole(memory.id, invitationId, newRole);
      await loadCollaborations(); // Refresh the list
    } catch (error) {
      console.error('Failed to update collaborator role:', error);
    }
  };

  const removeCollaborator = async (invitationId) => {
    try {
      await apiService.removeCollaborator(memory.id, invitationId);
      await loadCollaborations(); // Refresh the list
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
    }
  };

  const loadAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const response = await apiService.getMemoryCapsuleAnalytics(memory.id);
      setAnalytics(response);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const getPrivacyIcon = (level) => {
    switch (level) {
      case 'private': return <Lock size={20} className="text-red-500" />;
      case 'family': return <Heart size={20} className="text-orange-500" />;
      case 'friends': return <Users size={20} className="text-blue-500" />;
      case 'public': return <Globe size={20} className="text-green-500" />;
      default: return <Lock size={20} className="text-gray-500" />;
    }
  };

  const getPrivacyDescription = (level) => {
    switch (level) {
      case 'private': return 'Only you can see this memory';
      case 'family': return 'Only you and tagged family members can see this';
      case 'friends': return 'You, family, and tagged friends can see this';
      case 'public': return 'Anyone with the link can see this memory';
      default: return '';
    }
  };

  const getPrivacyColor = (level) => {
    switch (level) {
      case 'private': return 'border-red-200 bg-red-50';
      case 'family': return 'border-orange-200 bg-orange-50';
      case 'friends': return 'border-blue-200 bg-blue-50';
      case 'public': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[calc(100vw-16px)] sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 sm:gap-3">
            <Share2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Share Memory</h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate max-w-[200px] sm:max-w-none">
                {memory?.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-w-max ${
              activeTab === 'privacy'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Privacy</span>
            <span className="sm:hidden">Privacy</span>
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-w-max ${
              activeTab === 'links'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Share Links</span>
            <span className="sm:hidden">Links</span>
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-w-max ${
              activeTab === 'methods'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Methods</span>
            <span className="sm:hidden">Methods</span>
          </button>
          <button
            onClick={() => setActiveTab('collaborate')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-w-max ${
              activeTab === 'collaborate'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Collaborate</span>
            <span className="sm:hidden">Team</span>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-w-max ${
              activeTab === 'analytics'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Analytics</span>
            <span className="sm:hidden">Stats</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap min-w-max ${
              activeTab === 'settings'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Settings</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 max-h-[60vh] sm:max-h-[65vh] overflow-y-auto">
          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              {privacyError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={16} className="text-red-500" />
                  <span className="text-sm text-red-700">{privacyError}</span>
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy Level</h3>
                <div className="space-y-3">
                  {['private', 'family', 'friends', 'public'].map((level) => (
                    <button
                      key={level}
                      onClick={() => updatePrivacyLevel(level)}
                      disabled={isLoadingPrivacy}
                      className={`w-full p-4 border-2 rounded-lg transition-all text-left relative ${
                        privacyLevel === level
                          ? `${getPrivacyColor(level)} border-current shadow-md`
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      } ${isLoadingPrivacy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
                    >
                      <div className="flex items-center gap-3">
                        {getPrivacyIcon(level)}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 capitalize">{level}</div>
                          <div className="text-sm text-gray-600">{getPrivacyDescription(level)}</div>
                        </div>
                        {privacyLevel === level && (
                          <div className="flex items-center gap-2">
                            {isLoadingPrivacy ? (
                              <div className="animate-spin">
                                <Loader2 size={16} className="text-purple-500" />
                              </div>
                            ) : (
                              <Check size={20} className="text-green-500" />
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sharing Settings</h3>
                <div className="space-y-4">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={privacySettings.allow_downloads}
                      onChange={(e) => updatePrivacySettings({
                        ...privacySettings,
                        allow_downloads: e.target.checked
                      })}
                      disabled={isLoadingPrivacy}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Allow Downloads</div>
                      <div className="text-sm text-gray-600">Let people download photos and videos</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={privacySettings.allow_comments}
                      onChange={(e) => updatePrivacySettings({
                        ...privacySettings,
                        allow_comments: e.target.checked
                      })}
                      disabled={isLoadingPrivacy}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Allow Comments</div>
                      <div className="text-sm text-gray-600">Let people leave comments on this memory</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Share Links Tab */}
          {activeTab === 'share' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Share Links</h3>
                <button
                  onClick={() => setShowLinkSettings(!showLinkSettings)}
                  disabled={isGeneratingLink}
                  className={`px-4 py-2 rounded-lg transition-all font-medium ${
                    showLinkSettings 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                      : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105'
                  } ${isGeneratingLink ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {showLinkSettings ? 'Cancel' : 'Create Link'}
                </button>
              </div>

              {showLinkSettings && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg space-y-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings size={16} className="text-purple-600" />
                    <h4 className="font-medium text-gray-900">Link Settings</h4>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock size={14} className="inline mr-1" />
                      Expires in
                    </label>
                    <select
                      value={linkSettings.expires_in_days}
                      onChange={(e) => setLinkSettings({
                        ...linkSettings,
                        expires_in_days: parseInt(e.target.value)
                      })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    >
                      <option value={1}>1 day</option>
                      <option value={7}>1 week</option>
                      <option value={30}>1 month</option>
                      <option value={0}>Never expires</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Lock size={14} className="inline mr-1" />
                      Password (optional)
                    </label>
                    <input
                      type="password"
                      value={linkSettings.password}
                      onChange={(e) => setLinkSettings({
                        ...linkSettings,
                        password: e.target.value
                      })}
                      placeholder="Leave empty for no password"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={generateShareLink}
                      disabled={isGeneratingLink}
                      className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {isGeneratingLink ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 size={16} className="animate-spin" />
                          Creating...
                        </div>
                      ) : (
                        'Create Link'
                      )}
                    </button>
                    <button
                      onClick={() => setShowLinkSettings(false)}
                      disabled={isGeneratingLink}
                      className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {shareLinks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Link size={48} className="mx-auto mb-2 text-gray-300" />
                    <p>No share links created yet</p>
                    <p className="text-sm">Create a link to share this memory with others</p>
                  </div>
                ) : (
                  shareLinks.map((link) => (
                    <div key={link.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Link size={16} className="text-purple-600" />
                          <span className="font-medium text-gray-900">Share Link</span>
                          {link.password_protected && (
                            <Lock size={14} className="text-orange-500" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(link.share_url, link.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            {copiedLink === link.id ? (
                              <Check size={16} className="text-green-500" />
                            ) : (
                              <Copy size={16} className="text-gray-500" />
                            )}
                          </button>
                          <button
                            onClick={() => revokeShareLink(link.id)}
                            className="p-1 hover:bg-gray-100 rounded transition-colors"
                          >
                            <X size={16} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-4">
                          <span>Accessed {link.access_count} times</span>
                          {link.expires_at && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              Expires {new Date(link.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded truncate">
                        {link.share_url}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Methods Tab */}
          {activeTab === 'methods' && (
            <div className="space-y-6">
              {/* Email Sharing */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Mail size={20} className="text-blue-500" />
                  Email Sharing
                </h3>
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Recipients (comma-separated)
                    </label>
                    <input
                      type="email"
                      multiple
                      value={emailRecipients}
                      onChange={(e) => setEmailRecipients(e.target.value)}
                      placeholder="friend@example.com, family@example.com"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personal Message (optional)
                    </label>
                    <textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Add a personal note to your invitation..."
                      rows={3}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <button
                    onClick={sendEmailInvitation}
                    disabled={!emailRecipients.trim() || sendingEmail}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {sendingEmail ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 size={16} className="animate-spin" />
                        Preparing Email...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <Mail size={16} />
                        Send Email Invitation
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* QR Code Sharing */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <QrCode size={20} className="text-green-500" />
                  QR Code Sharing
                </h3>
                <div className="space-y-4">
                  {shareLinks.length > 0 ? (
                    <div className="grid gap-3">
                      {shareLinks.map((link) => (
                        <div key={link.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">Share Link #{link.id}</span>
                            <button
                              onClick={() => generateQRCode(link.share_url)}
                              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium"
                            >
                              <QrCode size={14} className="inline mr-1" />
                              Generate QR
                            </button>
                          </div>
                          <div className="text-sm text-gray-600">
                            {link.expires_at ? `Expires ${new Date(link.expires_at).toLocaleDateString()}` : 'Never expires'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <QrCode size={48} className="mx-auto mb-2 text-gray-300" />
                      <p>Create a share link first to generate QR codes</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Social Media Sharing */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Share2 size={20} className="text-purple-500" />
                  Social Media
                </h3>
                <div className="space-y-4">
                  {shareLinks.length > 0 ? (
                    <div className="space-y-3">
                      {shareLinks.map((link) => (
                        <div key={link.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium text-gray-900">Share Link #{link.id}</span>
                            <span className="text-sm text-gray-500">
                              {link.access_count} views
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            <button
                              onClick={() => shareToSocial('facebook', link.share_url)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                            >
                              <Facebook size={14} />
                              Facebook
                            </button>
                            
                            <button
                              onClick={() => shareToSocial('twitter', link.share_url)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-all text-sm font-medium"
                            >
                              <Twitter size={14} />
                              Twitter
                            </button>
                            
                            <button
                              onClick={() => shareToSocial('whatsapp', link.share_url)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all text-sm font-medium"
                            >
                              <MessageCircle size={14} />
                              WhatsApp
                            </button>
                            
                            <button
                              onClick={() => shareToSocial('telegram', link.share_url)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all text-sm font-medium"
                            >
                              <MessageCircle size={14} />
                              Telegram
                            </button>
                            
                            <button
                              onClick={() => shareToSocial('linkedin', link.share_url)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-all text-sm font-medium"
                            >
                              <Share2 size={14} />
                              LinkedIn
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      <Share2 size={48} className="mx-auto mb-2 text-gray-300" />
                      <p>Create a share link first to enable social media sharing</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Collaborate Tab */}
          {activeTab === 'collaborate' && (
            <div className="space-y-6">
              {/* Owner Information */}
              {collaborations.owner && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <UserPlus size={20} className="text-purple-500" />
                    Memory Owner
                  </h3>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                        {collaborations.owner.name?.charAt(0) || 'O'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{collaborations.owner.name}</div>
                        <div className="text-sm text-gray-600">{collaborations.owner.email}</div>
                        <div className="text-xs text-purple-600 font-medium">Owner</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Invite Collaborators */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Collaborators</h3>
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    disabled={sendingInvite}
                    className={`px-4 py-2 rounded-lg transition-all font-medium ${
                      showInviteForm 
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                        : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105'
                    } ${sendingInvite ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {showInviteForm ? 'Cancel' : 'Invite Collaborator'}
                  </button>
                </div>

                {showInviteForm && (
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg space-y-4 border border-purple-200 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Mail size={16} className="text-purple-600" />
                      <h4 className="font-medium text-gray-900">Send Collaboration Invitation</h4>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={inviteData.email}
                        onChange={(e) => setInviteData({
                          ...inviteData,
                          email: e.target.value
                        })}
                        placeholder="collaborator@example.com"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role
                      </label>
                      <select
                        value={inviteData.role}
                        onChange={(e) => setInviteData({
                          ...inviteData,
                          role: e.target.value
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      >
                        <option value="viewer">Viewer - Can view the memory</option>
                        <option value="contributor">Contributor - Can add comments and media</option>
                        <option value="editor">Editor - Can edit memory details</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invitation Expires
                      </label>
                      <select
                        value={inviteData.expires_in_days}
                        onChange={(e) => setInviteData({
                          ...inviteData,
                          expires_in_days: parseInt(e.target.value)
                        })}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                      >
                        <option value={7}>1 week</option>
                        <option value={30}>1 month</option>
                        <option value={90}>3 months</option>
                        <option value={0}>Never expires</option>
                      </select>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={sendCollaborationInvite}
                        disabled={!inviteData.email.trim() || sendingInvite}
                        className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                      >
                        {sendingInvite ? (
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            Sending Invitation...
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <Mail size={16} />
                            Send Invitation
                          </div>
                        )}
                      </button>
                      <button
                        onClick={() => setShowInviteForm(false)}
                        disabled={sendingInvite}
                        className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Collaborators List */}
                <div className="space-y-3">
                  {loadingCollaborations ? (
                    <div className="text-center py-6">
                      <Loader2 size={24} className="animate-spin mx-auto text-purple-500" />
                      <p className="text-gray-500 mt-2">Loading collaborators...</p>
                    </div>
                  ) : collaborations.collaborators.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <UserPlus size={48} className="mx-auto mb-2 text-gray-300" />
                      <p>No collaborators yet</p>
                      <p className="text-sm">Invite people to collaborate on this memory</p>
                    </div>
                  ) : (
                    collaborations.collaborators.map((collab) => (
                      <div key={collab.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                              {collab.invited_email.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {collab.user_name || collab.invited_email}
                              </div>
                              <div className="text-sm text-gray-600">{collab.invited_email}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                  collab.status === 'accepted' 
                                    ? 'bg-green-100 text-green-700'
                                    : collab.status === 'pending'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700'
                                }`}>
                                  {collab.status}
                                </span>
                                <span className="text-xs text-gray-500 capitalize">
                                  {collab.role}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <select
                              value={collab.role}
                              onChange={(e) => updateCollaboratorRole(collab.id, e.target.value)}
                              className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-purple-500 focus:border-purple-500"
                            >
                              <option value="viewer">Viewer</option>
                              <option value="contributor">Contributor</option>
                              <option value="editor">Editor</option>
                            </select>
                            
                            <button
                              onClick={() => removeCollaborator(collab.id)}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Remove collaborator"
                            >
                              <X size={16} className="text-red-500" />
                            </button>
                          </div>
                        </div>
                        
                        {collab.expires_at && (
                          <div className="mt-2 text-xs text-gray-500">
                            Invitation expires: {new Date(collab.expires_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              {loadingAnalytics ? (
                <div className="text-center py-8">
                  <Loader2 size={24} className="animate-spin mx-auto text-purple-500" />
                  <p className="text-gray-500 mt-2">Loading analytics...</p>
                </div>
              ) : analytics ? (
                <>
                  {/* Overview Stats */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Eye size={20} className="text-blue-500" />
                      Overview
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">{analytics.total_accesses || 0}</div>
                        <div className="text-sm text-gray-600">Total Views</div>
                      </div>
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-600">{analytics.unique_visitors || 0}</div>
                        <div className="text-sm text-gray-600">Unique Visitors</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">{analytics.total_share_links || 0}</div>
                        <div className="text-sm text-gray-600">Share Links</div>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="text-2xl font-bold text-orange-600">{analytics.total_link_accesses || 0}</div>
                        <div className="text-sm text-gray-600">Link Clicks</div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Clock size={20} className="text-green-500" />
                      Recent Activity
                    </h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {analytics.recent_accesses && analytics.recent_accesses.length > 0 ? (
                        analytics.recent_accesses.map((access, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <Eye size={14} className="text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 capitalize">
                                  {access.access_type} Access
                                </div>
                                <div className="text-xs text-gray-500">
                                  IP: {access.ip_address}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(access.created_at).toLocaleString()}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-gray-500">
                          <Eye size={48} className="mx-auto mb-2 text-gray-300" />
                          <p>No recent activity</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Share Performance */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <Share2 size={20} className="text-purple-500" />
                      Share Performance
                    </h3>
                    <div className="space-y-3">
                      {shareLinks.map((link) => (
                        <div key={link.id} className="p-4 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">Share Link #{link.id}</span>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{link.access_count} views</span>
                              {link.expires_at && (
                                <span>Expires {new Date(link.expires_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ 
                                width: `${Math.min((link.access_count / Math.max(analytics.total_link_accesses, 1)) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Eye size={48} className="mx-auto mb-2 text-gray-300" />
                  <p>No analytics data available</p>
                  <p className="text-sm">Analytics will appear once people start viewing your memory</p>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Settings size={20} className="text-gray-500" />
                  Advanced Settings
                </h3>
                
                <div className="space-y-4">
                  {/* Download Control */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Allow Downloads</div>
                      <div className="text-sm text-gray-600">Let viewers download media from this memory</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={advancedSettings.allowDownloads}
                        onChange={(e) => setAdvancedSettings({
                          ...advancedSettings,
                          allowDownloads: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Comments Control */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Allow Comments</div>
                      <div className="text-sm text-gray-600">Enable comments and reactions on this memory</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={advancedSettings.allowComments}
                        onChange={(e) => setAdvancedSettings({
                          ...advancedSettings,
                          allowComments: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Access Notifications */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Access Notifications</div>
                      <div className="text-sm text-gray-600">Get notified when someone views your memory</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={advancedSettings.notifyOnAccess}
                        onChange={(e) => setAdvancedSettings({
                          ...advancedSettings,
                          notifyOnAccess: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  {/* Analytics Tracking */}
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-900">Analytics Tracking</div>
                      <div className="text-sm text-gray-600">Track views and engagement metrics</div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={advancedSettings.trackAnalytics}
                        onChange={(e) => setAdvancedSettings({
                          ...advancedSettings,
                          trackAnalytics: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>
                </div>

                {/* Save Settings Button */}
                <div className="mt-6">
                  <button
                    onClick={() => {
                      // Here you would save the settings to the backend
                      console.log('Saving advanced settings:', advancedSettings);
                    }}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium"
                  >
                    Save Settings
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h4>
                <div className="space-y-3">
                  <button className="w-full px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all font-medium">
                    Revoke All Share Links
                  </button>
                  <button className="w-full px-4 py-3 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all font-medium">
                    Remove All Collaborators
                  </button>
                  <button className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-medium">
                    Reset All Sharing Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Modal */}
      {showQRCode && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">QR Code</h3>
              <button
                onClick={() => setShowQRCode(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            
            <div className="text-center">
              <div className="mb-4 p-4 bg-white border-2 border-gray-200 rounded-lg inline-block">
                <img 
                  src={qrCodeData} 
                  alt="QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code to access the memory
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = qrCodeData;
                    link.download = `memory-qr-${memory?.title || 'code'}.png`;
                    link.click();
                  }}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Download size={14} className="inline mr-1" />
                  Download
                </button>
                <button
                  onClick={() => setShowQRCode(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareModal;

