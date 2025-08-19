import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Eye, Trash2, Play } from 'lucide-react';
import CreateMemoryWizard from './CreateMemoryWizard';
import MemoryDetailModal from './MemoryDetailModal';
import MediaSlideshow from './MediaSlideshow';
import { apiService } from '../../services/api';

const MemoriesPage = ({ autoOpenWizard = false }) => {
  const [memories, setMemories] = useState([]);
  const [filteredMemories, setFilteredMemories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showWizard, setShowWizard] = useState(autoOpenWizard);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Global slideshow state
  const [showGlobalSlideshow, setShowGlobalSlideshow] = useState(false);
  const [allMediaItems, setAllMediaItems] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(false);

  const categories = ['All', 'Family', 'Friends', 'Travel', 'Celebration', 'Achievement', 'Daily Life', 'Other'];

  useEffect(() => {
    fetchMemories();
  }, []);

  useEffect(() => {
    filterMemories();
  }, [memories, searchTerm, selectedCategory]);

  const fetchMemories = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/memory-capsules?user_id=1');
      console.log('API Response:', response); // Debug log
      setMemories(response); // API returns data directly, not response.data
    } catch (error) {
      console.error('Error fetching memories:', error);
      setMemories([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const filterMemories = () => {
    let filtered = memories;

    if (searchTerm) {
      filtered = filtered.filter(memory =>
        memory.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        memory.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(memory => memory.category === selectedCategory);
    }

    setFilteredMemories(filtered);
  };

  const handleMemoryCreated = () => {
    setShowWizard(false);
    fetchMemories();
  };

  const handleDeleteMemory = async (memoryId) => {
    if (window.confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      try {
        await apiService.delete(`/memory-capsules/${memoryId}`);
        fetchMemories();
      } catch (error) {
        console.error('Error deleting memory:', error);
      }
    }
  };

  // Global slideshow functions
  const fetchAllMedia = async () => {
    setLoadingMedia(true);
    try {
      const allMedia = [];
      
      // Fetch media from all memory capsules
      for (const memory of memories) {
        try {
          const mediaResponse = await apiService.get(`/memory-capsules/${memory.id}/media`);
          if (Array.isArray(mediaResponse) && mediaResponse.length > 0) {
            // Add memory context to each media item
            const mediaWithContext = mediaResponse.map(item => ({
              ...item,
              memoryTitle: memory.title,
              memoryId: memory.id,
              memoryCategory: memory.category
            }));
            allMedia.push(...mediaWithContext);
          }
        } catch (error) {
          console.error(`Error fetching media for memory ${memory.id}:`, error);
          // Continue with other memories even if one fails
        }
      }
      
      // Sort by creation date (newest first)
      allMedia.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setAllMediaItems(allMedia);
      return allMedia;
    } catch (error) {
      console.error('Error fetching all media:', error);
      setAllMediaItems([]);
      return [];
    } finally {
      setLoadingMedia(false);
    }
  };

  const startGlobalSlideshow = async () => {
    if (memories.length === 0) {
      alert('No memory capsules available for slideshow.');
      return;
    }

    const media = await fetchAllMedia();
    
    if (media.length === 0) {
      alert('No media found in your memory capsules.');
      return;
    }

    setShowGlobalSlideshow(true);
  };

  const closeGlobalSlideshow = () => {
    setShowGlobalSlideshow(false);
    setAllMediaItems([]);
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Family': 'bg-red-100 text-red-800',
      'Friends': 'bg-blue-100 text-blue-800',
      'Travel': 'bg-green-100 text-green-800',
      'Celebration': 'bg-purple-100 text-purple-800',
      'Achievement': 'bg-yellow-100 text-yellow-800',
      'Daily Life': 'bg-gray-100 text-gray-800',
      'Other': 'bg-indigo-100 text-indigo-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Memory Capsules</h1>
            <p className="text-gray-600">Your precious memories, beautifully organized</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Global Slideshow Button */}
            <button
              onClick={startGlobalSlideshow}
              disabled={loading || loadingMedia || memories.length === 0}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={memories.length === 0 ? "No memories available" : "Start slideshow of all memories"}
            >
              <Play className="w-5 h-5" />
              <span>{loadingMedia ? 'Loading...' : 'Slideshow'}</span>
            </button>
            
            {/* Create New Capsule Button */}
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Capsule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="text-gray-400 w-5 h-5" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-6">
        <p className="text-gray-600">
          Showing {filteredMemories.length} of {memories.length} memories
        </p>
      </div>

      {/* Memory Grid */}
      {filteredMemories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredMemories.map((memory) => (
            <div 
              key={memory.id} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedMemory(memory)}
            >
              {/* Memory Card Header */}
              <div className="h-48 bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center relative">
                <div className="absolute top-4 left-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(memory.category)}`}>
                    {memory.category || 'Uncategorized'}
                  </span>
                </div>
                <div className="absolute top-4 right-4 flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMemory(memory);
                    }}
                    className="p-2 bg-white/80 hover:bg-white rounded-full transition-colors"
                    title="View memory"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMemory(memory.id);
                    }}
                    className="p-2 bg-white/80 hover:bg-white rounded-full transition-colors"
                    title="Delete memory"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <span className="text-2xl">💝</span>
                  </div>
                </div>
              </div>

              {/* Memory Card Content */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {memory.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                  {memory.description}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{formatDate(memory.created_at)}</span>
                  <span>{memory.media_count || 0} media</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">💝</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No memories found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || selectedCategory !== 'All' 
              ? 'Try adjusting your search or filter criteria'
              : 'Start creating your first memory capsule'
            }
          </p>
          {!searchTerm && selectedCategory === 'All' && (
            <button
              onClick={() => setShowWizard(true)}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Create Your First Memory
            </button>
          )}
        </div>
      )}

      {/* Modals */}
      {showWizard && (
        <CreateMemoryWizard
          onClose={() => setShowWizard(false)}
          onMemoryCreated={handleMemoryCreated}
        />
      )}
      {selectedMemory && (
        <MemoryDetailModal
          memory={selectedMemory}
          onClose={() => setSelectedMemory(null)}
          onMemoryUpdated={fetchMemories}
        />
      )}
      
      {/* Global Slideshow Modal */}
      {showGlobalSlideshow && allMediaItems.length > 0 && (
        <MediaSlideshow
          mediaItems={allMediaItems}
          initialIndex={0}
          onClose={closeGlobalSlideshow}
        />
      )}
    </div>
  );
};

export default MemoriesPage;

