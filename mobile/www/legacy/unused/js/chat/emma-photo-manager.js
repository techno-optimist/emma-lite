/**
 * 📷 EMMA PHOTO MANAGER - Media Upload & Management
 * Single responsibility: All photo and media operations
 * 
 * CTO ARCHITECTURE: Clean photo handling with no memory conflicts
 */

class EmmaPhotoManager {
  constructor(chatCore) {
    this.chatCore = chatCore;
    this.activeUploads = new Map();
  }

  /**
   * 🎯 HANDLE PHOTO REQUESTS
   */
  async handlePhotoRequest(userMessage, intent) {
    console.log('📷 PHOTO: Handling request:', userMessage);
    
    try {
      const targetPerson = intent.targetPerson || 'your memories';
      
      const responses = [
        `I'd love to help you add photos! Let me open the photo selector for you.`,
        `Perfect! Let's add some beautiful photos to your memories.`,
        `Wonderful! I'll help you add photos. You can select multiple photos at once.`
      ];
      
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      return {
        text: response,
        actions: [{
          type: 'trigger_photo_upload',
          targetPerson: targetPerson
        }]
      };
      
    } catch (error) {
      console.error('📷 PHOTO: Error handling photo request:', error);
      return {
        text: "I'd love to help you add photos! Let me try to open the photo selector for you."
      };
    }
  }

  /**
   * 📤 TRIGGER PHOTO UPLOAD
   */
  async triggerUpload(targetPerson) {
    console.log(`📷 PHOTO: Triggering upload for ${targetPerson}`);
    
    try {
      // Create file input
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.multiple = true;
      fileInput.style.display = 'none';
      
      fileInput.addEventListener('change', (event) => {
        const files = Array.from(event.target.files);
        if (files.length > 0) {
          this.handlePhotoFiles(files, targetPerson);
        }
      });
      
      document.body.appendChild(fileInput);
      
      // Setup drag and drop
      this.setupPhotoDragAndDrop(targetPerson);
      
      // Trigger file dialog
      setTimeout(() => {
        fileInput.click();
      }, 300);
      
    } catch (error) {
      console.error('📤 PHOTO: Error triggering upload:', error);
      this.chatCore.addMessage("I'm having trouble opening the photo selector. Please try again.", 'emma');
    }
  }

  /**
   * 📸 HANDLE PHOTO FILES
   */
  async handlePhotoFiles(files, targetPerson) {
    console.log(`📸 PHOTO: Processing ${files.length} photos for ${targetPerson}`);
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file
        if (!file.type.startsWith('image/')) {
          console.warn('📸 PHOTO: Skipping non-image file:', file.name);
          continue;
        }
        
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
          console.warn('📸 PHOTO: File too large:', file.name);
          this.chatCore.addMessage(`The photo "${file.name}" is too large. Please choose photos under 10MB.`, 'emma');
          continue;
        }
        
        // Process file
        const reader = new FileReader();
        reader.onload = (e) => {
          const imageData = e.target.result;
          this.displayPhotoPreview(imageData, file.name, targetPerson);
        };
        reader.readAsDataURL(file);
      }
      
      // After processing all files
      if (files.length > 0) {
        setTimeout(() => {
          this.chatCore.addMessage(`These photos look wonderful! Would you like me to create a memory with them?`, 'emma');
        }, 1500);
      }
      
    } catch (error) {
      console.error('📸 PHOTO: Error processing files:', error);
      this.chatCore.addMessage("I had trouble processing those photos. Please try again.", 'emma');
    }
  }

  /**
   * 🖼️ DISPLAY PHOTO PREVIEW
   */
  displayPhotoPreview(imageData, fileName, targetPerson) {
    const photoPreview = `
      <div class="photo-preview-card">
        <img src="${imageData}" alt="${fileName}" class="photo-preview-image" />
        <div class="photo-preview-info">
          <div class="photo-filename">${fileName}</div>
          <div class="photo-context">📷 Photo with ${targetPerson}</div>
        </div>
      </div>
    `;
    
    this.chatCore.addMessage(photoPreview, 'emma', { isHtml: true });
    this.addPhotoPreviewStyles();
  }

  /**
   * 🖱️ SETUP DRAG AND DROP
   */
  setupPhotoDragAndDrop(targetPerson) {
    const chatContainer = this.chatCore.messageContainer;
    if (!chatContainer) return;
    
    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
      if (files.length > 0) {
        this.handlePhotoFiles(files, targetPerson);
      }
      
      chatContainer.classList.remove('drag-over');
    };
    
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      chatContainer.classList.add('drag-over');
    };
    
    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      chatContainer.classList.remove('drag-over');
    };
    
    // Clean up existing listeners
    chatContainer.removeEventListener('drop', handleDrop);
    chatContainer.removeEventListener('dragover', handleDragOver);
    chatContainer.removeEventListener('dragleave', handleDragLeave);
    
    // Add new listeners
    chatContainer.addEventListener('drop', handleDrop);
    chatContainer.addEventListener('dragover', handleDragOver);
    chatContainer.addEventListener('dragleave', handleDragLeave);
    
    console.log(`📷 PHOTO: Drag and drop enabled for ${targetPerson}`);
  }

  /**
   * 🎨 ADD PHOTO PREVIEW STYLES
   */
  addPhotoPreviewStyles() {
    if (document.getElementById('photo-preview-styles')) return;
    
    const styles = `
      <style id="photo-preview-styles">
        .photo-preview-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.06));
          border: 2px solid rgba(138, 43, 226, 0.4);
          border-radius: 18px;
          padding: 20px;
          margin: 16px 0;
          display: flex;
          align-items: center;
          gap: 20px;
          /* 🎯 CTO: ACCESSIBILITY - Large touch target */
          min-height: 80px;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 16px rgba(138, 43, 226, 0.2);
          /* 🎯 CTO: GENTLE ANIMATION */
          animation: photoCardFadeIn 0.5s ease-out forwards;
          opacity: 0;
          transform: translateX(-20px);
        }

        @keyframes photoCardFadeIn {
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        .photo-preview-image {
          width: 80px;
          height: 80px;
          border-radius: 12px;
          object-fit: cover;
          border: 2px solid rgba(138, 43, 226, 0.2);
        }

        .photo-filename {
          color: white;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .photo-context {
          color: rgba(138, 43, 226, 0.9);
          font-size: 12px;
          font-weight: 500;
        }

        .drag-over {
          background: rgba(138, 43, 226, 0.1) !important;
          border: 2px dashed rgba(138, 43, 226, 0.5) !important;
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }
}

// Export for global use
window.EmmaPhotoManager = EmmaPhotoManager;
console.log('📷 Emma Photo Manager: Module loaded successfully');
