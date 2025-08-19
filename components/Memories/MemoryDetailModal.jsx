import React, { useState, useEffect } from 'react';
import { X, Share2, Heart, Users, Camera, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import ShareModal from './ShareModal';
import MediaSlideshow from './MediaSlideshow';
import { apiService } from '../../services/api';

const MemoryDetailModal = ({ memory, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [mediaItems, setMediaItems] = useState([]);
  const [collaborators, setCollaborators] = useState([]);
  const [relatedMemories, setRelatedMemories] = useState([]);
  const [availablePeople, setAvailablePeople] = useState([]);
  const [selectedPeople, setSelectedPeople] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (memory) {
      loadMemoryDetails();
    }
  }, [memory?.id]);

  const loadMemoryDetails = async () => {
    try {
      setIsLoading(true);
      
      // Load media items
      const media = await apiService.getMediaItems(memory.id);
      setMediaItems(media || []);
      
      // Load collaborators
      const collabs = await apiService.getCollaborators(memory.id);
      setCollaborators(collabs || []);
      
      // Load available people
      const people = await apiService.getPeople(1);
      setAvailablePeople(people || []);
      
    } catch (error) {
      console.error('Error loading memory details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startSlideshow = (index = 0) => {
    setSlideshowIndex(index);
    setShowSlideshow(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Heart },
    { id: 'media', label: 'Media', icon: Camera, count: mediaItems.length },
    { id: 'people', label: 'People', icon: Users, count: collaborators.length },
    { id: 'related', label: 'Related', icon: Heart, count: relatedMemories.length }
  ];

  if (!memory) return null;

  return (
    <>
      {/* Main Modal */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
        <div className="bg-white rounded-xl w-full max-w-[calc(100vw-16px)] sm:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{memory.title}</h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {memory.date_created && formatDate(memory.date_created)} • {memory.category}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => setShowShareModal(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Share memory"
              >
                <Share2 size={20} className="text-gray-500" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex overflow-x-auto scrollbar-hide px-2 sm:px-0">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors min-w-max ${
                      activeTab === tab.id
                        ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-4 sm:space-y-6">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                    {memory.description || 'No description provided.'}
                  </p>
                </div>

                {mediaItems.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">Media Preview</h3>
                      <button
                        onClick={() => startSlideshow(0)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                      >
                        <Play size={14} />
                        <span className="hidden sm:inline">Start Slideshow</span>
                        <span className="sm:hidden">Play</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                      {mediaItems.slice(0, 8).map((item, index) => (
                        <div
                          key={item.id}
                          className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => startSlideshow(index)}
                        >
                          <img
                            src={`https://5004-i96h1jt9e7dpn8d4b1z58-3f029ef4.manusvm.computer${item.file_path}`}
                            alt={item.caption || 'Memory media'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Media Tab */}
            {activeTab === 'media' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                    Media ({mediaItems.length})
                  </h3>
                  {mediaItems.length > 0 && (
                    <button
                      onClick={() => startSlideshow(0)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      <Play size={14} />
                      <span className="hidden sm:inline">Start Slideshow</span>
                      <span className="sm:hidden">Play</span>
                    </button>
                  )}
                </div>

                {mediaItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {mediaItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => startSlideshow(index)}
                      >
                        <div className="aspect-video bg-gray-100">
                          <img
                            src={`https://5004-i96h1jt9e7dpn8d4b1z58-3f029ef4.manusvm.computer${item.file_path}`}
                            alt={item.caption || 'Memory media'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        {item.caption && (
                          <div className="p-2 sm:p-3">
                            <p className="text-xs sm:text-sm text-gray-600">{item.caption}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <Camera className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-gray-500">No media items found</p>
                  </div>
                )}
              </div>
            )}

            {/* People Tab */}
            {activeTab === 'people' && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  People ({collaborators.length})
                </h3>

                {collaborators.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {collaborators.map((person) => (
                      <div
                        key={person.id}
                        className="flex items-center gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                            {person.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-gray-500 capitalize">
                            {person.relationship || 'Friend'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm sm:text-base text-gray-500">No people tagged in this memory</p>
                  </div>
                )}
              </div>
            )}

            {/* Related Tab */}
            {activeTab === 'related' && (
              <div className="space-y-4">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                  Related Memories ({relatedMemories.length})
                </h3>

                <div className="text-center py-8 sm:py-12">
                  <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-sm sm:text-base text-gray-500">No related memories found</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          memory={memory}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Media Slideshow */}
      {showSlideshow && mediaItems.length > 0 && (
        <MediaSlideshow
          mediaItems={mediaItems}
          initialIndex={slideshowIndex}
          onClose={() => setShowSlideshow(false)}
        />
      )}
    </>
  );
};

export default MemoryDetailModal;

