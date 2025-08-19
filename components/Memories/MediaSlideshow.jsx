import React from 'react';
import { X } from 'lucide-react';

const MediaSlideshow = ({ isOpen, onClose, mediaItems = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className="relative w-full h-full flex items-center justify-center">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        >
          <X className="w-8 h-8" />
        </button>
        
        <div className="text-center text-white">
          {mediaItems.length === 0 ? (
            <div>
              <h2 className="text-2xl mb-4">No Media Available</h2>
              <p className="text-gray-300">No photos or videos found in your memories.</p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl mb-4">Media Slideshow</h2>
              <p className="text-gray-300">Media slideshow functionality coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaSlideshow;
