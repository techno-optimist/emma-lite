/**
 * 💝 EMMA MEMORY OPERATIONS - Vault Memory Management
 * Single responsibility: All memory-related operations
 * 
 * CTO ARCHITECTURE: Clean memory handling with no conflicts
 */

class EmmaMemoryOperations {
  constructor(chatCore) {
    this.chatCore = chatCore;
  }

  /**
   * 🎯 HANDLE MEMORY REQUESTS
   */
  async handleMemoryRequest(userMessage, intent) {
    console.log('💝 MEMORY: Handling request:', intent.subType);
    
    switch (intent.subType) {
      case 'create':
        return await this.handleMemoryCreation(userMessage, intent);
      case 'search':
        return await this.handleMemorySearch(userMessage, intent);
      default:
        return await this.handleGeneralMemoryQuery(userMessage, intent);
    }
  }

  /**
   * ✨ HANDLE MEMORY CREATION - EMOTIONALLY INTELLIGENT
   */
  async handleMemoryCreation(userMessage, intent) {
    try {
      console.log('✨ MEMORY: Creating memory from:', userMessage);
      
      // Extract memory subject from message
      const subject = this.extractMemorySubject(userMessage);
      
      if (!subject) {
        // 💝 EMOTIONAL INTELLIGENCE: Encouraging, not robotic
        const encouragingResponses = [
          "What a wonderful idea to save a memory! I'm excited to help you preserve something special. What moment is calling to your heart?",
          "I love that you want to capture a precious memory! Tell me about the moment you'd like to treasure forever.",
          "How beautiful that you're thinking about saving memories! What story would you like me to help you preserve?"
        ];
        return {
          text: encouragingResponses[Math.floor(Math.random() * encouragingResponses.length)]
        };
      }
      
      // Check if this mentions a person who needs to be added to vault
      const mentionedPerson = this.extractPersonFromMemorySubject(subject);
      
      if (mentionedPerson && !(await this.isPersonInVault(mentionedPerson))) {
        // Person not in vault - offer to add them first
        return {
          text: `I'd love to help you save that memory about ${subject}! I notice you mentioned ${mentionedPerson}. Should I add them to your vault first?`,
          actions: [{
            type: 'offer_person_creation',
            personName: mentionedPerson,
            memorySubject: subject
          }]
        };
      }
      
      // Create memory with proper structure
      const memoryData = {
        id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: subject,
        content: `Memory about: ${subject}`,
        created: Date.now(),
        metadata: {
          people: mentionedPerson ? [await this.getPersonId(mentionedPerson)] : [],
          captureMethod: 'chat-conversation',
          needsEnrichment: true
        }
      };
      
      return {
        text: `Beautiful! I'm saving your memory about "${subject}". Would you like to add more details or photos?`,
        actions: [{
          type: 'create_memory',
          memoryData: memoryData
        }]
      };
      
    } catch (error) {
      console.error('✨ MEMORY: Error creating memory:', error);
      return {
        text: "I'd love to help you save that memory. Let me try again."
      };
    }
  }

  /**
   * 🔍 HANDLE MEMORY SEARCH
   */
  async handleMemorySearch(userMessage, intent) {
    try {
      const vault = window.emmaWebVault?.vaultData?.content;
      
      if (!vault?.memories || Object.keys(vault.memories).length === 0) {
        return {
          text: "I don't see any memories in your vault yet. Would you like to create your first memory?"
        };
      }
      
      const memories = Object.values(vault.memories);
      const memoryCount = memories.length;
      
      return {
        text: `You have ${memoryCount} precious ${memoryCount === 1 ? 'memory' : 'memories'} saved! Let me show you some of them.`,
        actions: [{
          type: 'display_memories',
          memories: memories.slice(0, 5) // Show recent 5
        }]
      };
      
    } catch (error) {
      console.error('🔍 MEMORY: Error searching memories:', error);
      return {
        text: "I'd love to show you your memories. Let me try again."
      };
    }
  }

  /**
   * 💝 DISPLAY MEMORY CARDS
   */
  async displayMemories(memories) {
    for (const memory of memories) {
      await this.displayMemoryCard(memory);
      await new Promise(resolve => setTimeout(resolve, 300)); // Gentle pacing
    }
  }

  /**
   * 💎 DISPLAY INDIVIDUAL MEMORY CARD
   */
  async displayMemoryCard(memory) {
    try {
      // Format date
      const date = new Date(memory.created || memory.timestamp || Date.now());
      const formattedDate = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      // Create preview text
      const content = memory.content || memory.description || 'A precious memory...';
      const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;

      // Load media items
      const mediaItems = await this.loadMemoryMedia(memory);
      
      // Generate media HTML
      const mediaHTML = this.generateMediaHTML(mediaItems, memory.id);
      
      // Create beautiful, accessible memory card
      const memoryCardHTML = `
        <div class="chat-memory-card" 
             onclick="window.chatCore.openMemory('${memory.id}')"
             role="button"
             tabindex="0"
             aria-label="Memory from ${formattedDate}: ${preview.substring(0, 50)}..."
             onkeydown="if(event.key==='Enter'||event.key===' ') window.chatCore.openMemory('${memory.id}')">
          ${mediaHTML}
          <div class="memory-content">
            <div class="memory-date" style="
              font-size: 14px;
              font-weight: 700;
              color: rgba(138, 43, 226, 1);
              background: rgba(138, 43, 226, 0.15);
              padding: 6px 12px;
              border-radius: 8px;
              display: inline-block;
              margin-bottom: 12px;
              letter-spacing: 1px;
            ">${formattedDate.toUpperCase()}</div>
            <div class="memory-text" style="
              font-size: 17px;
              line-height: 1.7;
              color: rgba(255, 255, 255, 1);
              margin-bottom: 16px;
              font-weight: 400;
            ">${preview}</div>
            <div class="memory-action" style="
              color: rgba(255, 255, 255, 0.95);
              background: linear-gradient(135deg, rgba(138, 43, 226, 0.9), rgba(75, 0, 130, 1));
              font-size: 15px;
              font-weight: 600;
              display: inline-flex;
              align-items: center;
              gap: 10px;
              padding: 12px 20px;
              border-radius: 14px;
              border: 2px solid rgba(255, 255, 255, 0.1);
              transition: all 0.3s ease;
              box-shadow: 0 3px 10px rgba(138, 43, 226, 0.3);
              cursor: pointer;
              min-height: 44px;
            ">💜 View this memory</div>
          </div>
        </div>
      `;

      this.chatCore.addMessage(memoryCardHTML, 'emma', { isHtml: true });
      this.addMemoryCardStyles();
      
    } catch (error) {
      console.error('💎 MEMORY: Error displaying memory card:', error);
    }
  }

  /**
   * 🖼️ LOAD MEMORY MEDIA
   */
  async loadMemoryMedia(memory) {
    const mediaItems = [];
    
    try {
      if (memory.attachments?.length > 0 && window.emmaWebVault?.vaultData?.content?.media) {
        const vaultMedia = window.emmaWebVault.vaultData.content.media;
        
        for (const attachment of memory.attachments) {
          if (attachment?.id && vaultMedia[attachment.id]) {
            const mediaData = vaultMedia[attachment.id];
            if (mediaData?.data) {
              const mediaUrl = mediaData.data.startsWith('data:') 
                ? mediaData.data 
                : `data:${mediaData.type || 'image/jpeg'};base64,${mediaData.data}`;
              
              mediaItems.push({
                id: attachment.id,
                url: mediaUrl,
                type: mediaData.type || 'image/jpeg'
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('🖼️ MEMORY: Error loading media:', error);
    }
    
    return mediaItems;
  }

  /**
   * 🎨 GENERATE MEDIA HTML
   */
  generateMediaHTML(mediaItems, memoryId) {
    if (mediaItems.length === 0) {
      return `<div class="memory-icon">💝</div>`;
    }
    
    if (mediaItems.length === 1) {
      return `
        <div class="memory-single-image" onclick="event.stopPropagation(); window.chatCore.openImageModal('${mediaItems[0].url}', '${memoryId}')">
          <img src="${mediaItems[0].url}" alt="Memory photo" />
        </div>
      `;
    }
    
    // Multiple images - grid layout
    const gridClass = mediaItems.length === 2 ? 'grid-2' : 
                     mediaItems.length === 3 ? 'grid-3' : 'grid-4';
    
    return `
      <div class="memory-grid ${gridClass}">
        ${mediaItems.slice(0, 4).map((item, index) => `
          <div class="grid-item" onclick="event.stopPropagation(); window.chatCore.openImageModal('${item.url}', '${memoryId}', ${index})">
            <img src="${item.url}" alt="Memory photo ${index + 1}" />
            ${index === 3 && mediaItems.length > 4 ? `<div class="more-overlay">+${mediaItems.length - 4}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 🔍 HELPER METHODS
   */
  extractMemorySubject(message) {
    // Extract subject from "save memory about X" or "Let's save X"
    let subject = null;
    
    const savePatterns = [
      /(?:save|create|new)\s+(?:memory\s+)?(?:about\s+)?(.+)/i,
      /let'?s\s+save\s+(.+)/i,
      /(?:memory\s+)?(?:about\s+)?(.+)/i
    ];
    
    for (const pattern of savePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        subject = match[1].trim();
        break;
      }
    }
    
    return subject;
  }

  extractPersonFromMemorySubject(subject) {
    if (!subject) return null;
    
    // Look for names in the subject
    const nameMatch = subject.match(/([A-Z][a-z]+)/);
    return nameMatch ? nameMatch[1] : null;
  }

  async isPersonInVault(personName) {
    const vault = window.emmaWebVault?.vaultData?.content;
    if (!vault?.people) return false;
    
    return Object.values(vault.people).some(person => 
      person.name?.toLowerCase() === personName.toLowerCase()
    );
  }

  async getPersonId(personName) {
    const vault = window.emmaWebVault?.vaultData?.content;
    if (!vault?.people) return null;
    
    const person = Object.values(vault.people).find(p => 
      p.name?.toLowerCase() === personName.toLowerCase()
    );
    
    return person?.id || null;
  }

  /**
   * 🎨 ADD MEMORY CARD STYLES
   */
  addMemoryCardStyles() {
    if (document.getElementById('chat-memory-card-styles')) return;
    
    const styles = `
      <style id="chat-memory-card-styles">
        .chat-memory-card {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.12) 0%, 
            rgba(255, 255, 255, 0.06) 100%);
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          margin: 16px 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(15px);
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          /* 🎯 CTO: ACCESSIBILITY - Large touch target */
          min-height: 120px;
          position: relative;
        }

        .chat-memory-card:hover, 
        .chat-memory-card:focus {
          background: linear-gradient(135deg, 
            rgba(138, 43, 226, 0.25) 0%, 
            rgba(75, 0, 130, 0.20) 100%);
          border-color: rgba(138, 43, 226, 0.8);
          transform: translateY(-6px) scale(1.03);
          box-shadow: 0 16px 40px rgba(138, 43, 226, 0.4);
          /* 🎯 CTO: ACCESSIBILITY - Focus outline */
          outline: 3px solid rgba(138, 43, 226, 0.6);
          outline-offset: 2px;
        }

        /* 🎯 CTO: GENTLE ANIMATION - Fade in effect */
        .chat-memory-card {
          animation: memoryCardFadeIn 0.6s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
        }

        @keyframes memoryCardFadeIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .memory-content {
          padding: 20px;
          background: rgba(255, 255, 255, 0.02);
        }

        .memory-date {
          color: rgba(138, 43, 226, 1);
          font-size: 13px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          background: rgba(138, 43, 226, 0.1);
          padding: 4px 8px;
          border-radius: 6px;
          display: inline-block;
        }

        .memory-text {
          color: rgba(255, 255, 255, 1);
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 16px;
          font-weight: 400;
        }

        .memory-action {
          color: rgba(255, 255, 255, 0.9);
          background: linear-gradient(135deg, rgba(138, 43, 226, 0.8), rgba(75, 0, 130, 0.9));
          font-size: 14px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 12px;
          border: 1px solid rgba(138, 43, 226, 0.3);
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(138, 43, 226, 0.2);
        }

        .memory-icon {
          width: 100px;
          height: 100px;
          border-radius: 20px;
          background: linear-gradient(135deg, #8a2be2, #4b0082);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 40px;
          margin: 20px auto;
          box-shadow: 0 6px 16px rgba(138, 43, 226, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .memory-single-image {
          width: 100%;
          height: 200px;
          cursor: pointer;
          overflow: hidden;
          border-radius: 20px 20px 0 0;
        }

        .memory-single-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }
}

// Export for global use
window.EmmaMemoryOperations = EmmaMemoryOperations;
console.log('💝 Emma Memory Operations: Module loaded successfully');
