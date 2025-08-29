/**
 * 👤 EMMA PERSON HANDLER - People & Relationship Management
 * Single responsibility: All person-related operations
 * 
 * CTO ARCHITECTURE: Clean people handling with vault integration
 */

class EmmaPersonHandler {
  constructor(chatCore) {
    this.chatCore = chatCore;
  }

  /**
   * 🎯 HANDLE PERSON REQUESTS
   */
  async handlePersonRequest(userMessage, intent) {
    console.log('👤 PERSON: Handling request:', intent.subType);
    
    switch (intent.subType) {
      case 'list':
        return await this.handlePeopleListRequest(userMessage, intent);
      case 'query':
        return await this.handlePersonQuery(userMessage, intent);
      default:
        return await this.handleGeneralPersonQuery(userMessage, intent);
    }
  }

  /**
   * 👥 HANDLE PEOPLE LIST REQUEST
   */
  async handlePeopleListRequest(userMessage, intent) {
    try {
      const vault = window.emmaWebVault?.vaultData?.content;
      
      if (!vault?.people || Object.keys(vault.people).length === 0) {
        return {
          text: "I don't see any people in your vault yet. Would you like to add someone special to you?"
        };
      }

      const allPeople = Object.values(vault.people);
      const peopleCount = allPeople.length;

      // 💝 EMOTIONAL INTELLIGENCE: Context-aware people responses
      const context = this.chatCore.intentClassifier.getContext();
      const emotionalState = context.emotionalState || 'calm';
      
      let introResponses;
      
      if (emotionalState === 'nostalgic' || emotionalState === 'reflective') {
        introResponses = [
          `I can feel you're thinking deeply about the people in your life. You have ${peopleCount} precious ${peopleCount === 1 ? 'soul' : 'souls'} in your heart. Let me show you these beautiful relationships.`,
          `There's something so touching about reflecting on the people we love. Here ${peopleCount === 1 ? 'is the special person' : `are the ${peopleCount} special people`} you've entrusted me to remember.`,
          `Your heart holds ${peopleCount} meaningful ${peopleCount === 1 ? 'relationship' : 'relationships'}. Each one has woven such beauty into your life story.`
        ];
      } else if (emotionalState === 'joyful' || emotionalState === 'excited') {
        introResponses = [
          `What joy I hear in your voice! You have ${peopleCount} wonderful ${peopleCount === 1 ? 'person' : 'people'} who bring such happiness to your life. Let me celebrate them with you!`,
          `I love the warmth in your question! Here ${peopleCount === 1 ? 'is the amazing person' : `are the ${peopleCount} amazing people`} who fill your world with love.`,
          `Your enthusiasm about your people fills my heart! These ${peopleCount} beautiful ${peopleCount === 1 ? 'soul brings' : 'souls bring'} such light to your life.`
        ];
      } else {
        introResponses = [
          `What a beautiful question! You have ${peopleCount} special ${peopleCount === 1 ? 'person' : 'people'} in your memory vault. Let me show you everyone who matters to you.`,
          `I love that you're thinking about your people! Here ${peopleCount === 1 ? 'is the precious person' : `are the ${peopleCount} precious people`} you've shared with me.`,
          `Your heart is full of ${peopleCount} wonderful ${peopleCount === 1 ? 'person' : 'people'}! Each one has brought such meaning to your life. Here they are:`
        ];
      }
      
      const intro = introResponses[Math.floor(Math.random() * introResponses.length)];

      return {
        text: intro,
        actions: allPeople.map(person => ({
          type: 'display_person',
          person: person
        }))
      };
      
    } catch (error) {
      console.error('👥 PERSON: Error handling people list:', error);
      return {
        text: "I'd love to show you your people, but I'm having trouble accessing them right now."
      };
    }
  }

  /**
   * 👤 HANDLE SPECIFIC PERSON QUERY
   */
  async handlePersonQuery(userMessage, intent) {
    try {
      if (!intent.targetPerson) {
        return {
          text: "Who would you like to know about? I'm here to help you explore your relationships."
        };
      }

      const person = await this.findPersonInVault(intent.targetPerson);
      
      if (!person) {
        return {
          text: `I don't see ${intent.targetPerson} in your vault yet. Would you like to add them so I can help you remember them?`
        };
      }

      // Update context for future responses
      this.chatCore.intentClassifier.setContext({
        lastQueriedPerson: person.name
      });

      // Get person's memories
      const memories = await this.getPersonMemories(person);
      const memoryText = memories.length > 0 ? 
        `I have ${memories.length} ${memories.length === 1 ? 'memory' : 'memories'} about them.` :
        `I don't see any memories with them yet.`;

      return {
        text: `${person.name} - they're ${person.relationship || 'someone special'}! ${memoryText} Would you like me to share what I know?`,
        actions: [{
          type: 'display_person',
          person: person
        }]
      };
      
    } catch (error) {
      console.error('👤 PERSON: Error handling person query:', error);
      return {
        text: `I'd love to tell you about ${intent.targetPerson}. Let me try again.`
      };
    }
  }

  /**
   * 💎 DISPLAY PERSON CARD
   */
  async displayPersonCard(person) {
    try {
      const relationship = person.relationship || 'Someone special';
      const initials = (person.name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      
      const personCardHTML = `
        <div class="chat-person-card">
          <div class="person-avatar">
            ${person.profilePicture ? 
              `<img src="${person.profilePicture}" alt="${person.name}" />` :
              `<div class="person-initials">${initials}</div>`
            }
          </div>
          <div class="person-info">
            <div class="person-name">${person.name}</div>
            <div class="person-relationship">${relationship}</div>
          </div>
        </div>
      `;

      this.chatCore.addMessage(personCardHTML, 'emma', { isHtml: true });
      this.addPersonCardStyles();
      
      // Show connected memories
      const memories = await this.getPersonMemories(person);
      if (memories.length > 0) {
        setTimeout(() => {
          this.chatCore.addMessage(`${person.name} appears in ${memories.length} of your ${memories.length === 1 ? 'memory' : 'memories'}:`, 'emma');
        }, 500);
        
        // Display memory cards
        setTimeout(() => {
          this.chatCore.memoryOperations.displayMemories(memories);
        }, 1000);
      }
      
    } catch (error) {
      console.error('💎 PERSON: Error displaying person card:', error);
    }
  }

  /**
   * 🔍 FIND PERSON IN VAULT
   */
  async findPersonInVault(personName) {
    try {
      const vault = window.emmaWebVault?.vaultData?.content;
      if (!vault?.people) return null;
      
      return Object.values(vault.people).find(person => 
        person.name?.toLowerCase().includes(personName.toLowerCase())
      );
    } catch (error) {
      console.error('🔍 PERSON: Error finding person:', error);
      return null;
    }
  }

  /**
   * 📚 GET PERSON'S MEMORIES
   */
  async getPersonMemories(person) {
    try {
      const vault = window.emmaWebVault?.vaultData?.content;
      if (!vault?.memories) return [];

      const connectedMemories = [];
      
      for (const [memoryId, memory] of Object.entries(vault.memories)) {
        // Check if person is tagged in memory
        if (memory.metadata?.people?.includes(person.id)) {
          connectedMemories.push({ ...memory, id: memoryId });
        }
        
        // Check if person's name is mentioned in content
        if (person.name && memory.content?.toLowerCase().includes(person.name.toLowerCase())) {
          if (!connectedMemories.find(m => m.id === memoryId)) {
            connectedMemories.push({ ...memory, id: memoryId });
          }
        }
      }

      // Sort by date (most recent first)
      return connectedMemories.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
      
    } catch (error) {
      console.error('📚 PERSON: Error getting person memories:', error);
      return [];
    }
  }

  /**
   * 🎨 ADD PERSON CARD STYLES
   */
  addPersonCardStyles() {
    if (document.getElementById('chat-person-card-styles')) return;
    
    const styles = `
      <style id="chat-person-card-styles">
        .chat-person-card {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
          border: 2px solid rgba(138, 43, 226, 0.3);
          border-radius: 16px;
          padding: 16px;
          margin: 12px 0;
          display: flex;
          align-items: center;
          gap: 16px;
          transition: all 0.3s ease;
        }

        .person-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          background: linear-gradient(135deg, #8a2be2, #4b0082);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .person-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .person-initials {
          color: white;
          font-size: 20px;
          font-weight: 600;
        }

        .person-name {
          color: white;
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .person-relationship {
          color: rgba(138, 43, 226, 0.9);
          font-size: 14px;
          font-weight: 500;
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', styles);
  }
}

// Export for global use
window.EmmaPersonHandler = EmmaPersonHandler;
console.log('👤 Emma Person Handler: Module loaded successfully');
