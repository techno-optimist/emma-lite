'use strict';

const TOOL_DEFINITIONS = [
  {
    type: 'function',
    name: 'get_people',
    description: 'Search local people by name or relationship.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: "Name or relationship to search for (for example 'mom' or 'Aunt Sarah')."
        }
      },
      required: ['query']
    }
  },
  {
    type: 'function',
    name: 'get_memories',
    description: 'Find memories connected to a person or timeframe.',
    parameters: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'Filter memories by a known person identifier.'
        },
        dateRange: {
          type: 'string',
          description: "Natural language time range like 'last Christmas' or '2010s'."
        },
        limit: {
          type: 'number',
          default: 5,
          description: 'Maximum number of memories to return.'
        }
      }
    }
  },
  {
    type: 'function',
    name: 'summarize_memory',
    description: 'Generate a gentle summary of a specific memory capsule.',
    parameters: {
      type: 'object',
      properties: {
        memoryId: {
          type: 'string',
          description: 'Identifier of the memory to summarize.'
        }
      },
      required: ['memoryId']
    }
  },
  {
    type: 'function',
    name: 'create_memory_from_voice',
    description: 'Store a new memory capsule based on the current conversation.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Story or description shared by the user.'
        },
        people: {
          type: 'array',
          items: { type: 'string' },
          description: 'Names of people mentioned.'
        },
        emotion: {
          type: 'string',
          description: 'Primary emotion expressed by the user.'
        },
        importance: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Relative importance of the memory.'
        }
      },
      required: ['content']
    }
  },
  {
    type: 'function',
    name: 'create_memory_capsule',
    description: 'Save a new memory capsule with story text, people, and optional media attachments.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Full memory story or description.'
        },
        title: {
          type: 'string',
          description: 'Optional title to display for the memory.'
        },
        people: {
          type: 'array',
          description: 'People connected to this memory by name or identifier.',
          items: {
            anyOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  relationship: { type: 'string' }
                }
              }
            ]
          }
        },
        emotion: {
          type: 'string',
          description: 'Primary feeling expressed in the memory.'
        },
        importance: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'How important this memory is to the user.'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Memory tags such as holidays or themes.'
        },
        date: {
          type: 'string',
          description: 'ISO date or natural language date for when the memory happened.'
        },
        location: {
          type: 'string',
          description: 'Where the memory took place.'
        },
        attachments: {
          type: 'array',
          description: 'Media attachments provided as base64/data URLs or references.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              uploadId: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              data: { type: 'string' },
              dataUrl: { type: 'string' }
            }
          }
        }
      },
      required: ['content']
    }
  },
  {
    type: 'function',
    name: 'update_person',
    description: 'Add or update information about someone mentioned in conversation.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Person's name." },
        relationship: { type: 'string', description: 'Relationship to the user.' },
        details: { type: 'string', description: 'Additional details to remember.' }
      },
      required: ['name']
    }
  },
  {
    type: 'function',
    name: 'create_person_profile',
    description: 'Create a new person in the vault or enrich an existing profile with relationship and avatar details.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Person's full name." },
        relationship: { type: 'string', description: 'Relationship to the user or family.' },
        pronouns: { type: 'string', description: 'Preferred pronouns for the person.' },
        birthday: { type: 'string', description: 'Important birthday or anniversary to remember.' },
        details: { type: 'string', description: 'Additional notes Emma should remember.' },
        avatar: {
          type: 'object',
          description: 'Optional avatar photo to attach to the person profile.',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            data: { type: 'string' },
            dataUrl: { type: 'string' }
          }
        }
      },
      required: ['name']
    }
  },
  {
    type: 'function',
    name: 'update_memory_capsule',
    description: 'Update an existing memory with new story details, people, tags, or attachments.',
    parameters: {
      type: 'object',
      properties: {
        memoryId: { type: 'string', description: 'Identifier of the memory to update.' },
        content: { type: 'string', description: 'Updated story text.' },
        title: { type: 'string', description: 'New title for the memory.' },
        people: {
          type: 'array',
          description: 'Updated list of people connected to this memory.',
          items: {
            anyOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  relationship: { type: 'string' }
                }
              }
            ]
          }
        },
        tags: { type: 'array', items: { type: 'string' } },
        emotion: { type: 'string' },
        importance: { type: 'number', minimum: 1, maximum: 10 },
        location: { type: 'string' },
        date: { type: 'string' },
        removeAttachmentIds: {
          type: 'array',
          description: 'Attachment identifiers that should be removed from the memory.',
          items: { type: 'string' }
        },
        attachments: {
          type: 'array',
          description: 'New attachments to add to the memory.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              uploadId: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              data: { type: 'string' },
              dataUrl: { type: 'string' }
            }
          }
        },
        replaceAttachments: {
          type: 'boolean',
          description: 'If true, replace existing attachments instead of appending.'
        }
      },
      required: ['memoryId']
    }
  },
  {
    type: 'function',
    name: 'attach_memory_media',
    description: 'Add one or more photos, videos, or audio clips to an existing memory capsule.',
    parameters: {
      type: 'object',
      properties: {
        memoryId: { type: 'string', description: 'Identifier of the memory receiving new media.' },
        media: {
          type: 'array',
          description: 'Media objects to attach to the memory.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              uploadId: { type: 'string' },
              name: { type: 'string' },
              type: { type: 'string' },
              data: { type: 'string' },
              dataUrl: { type: 'string' }
            }
          }
        },
        replaceExisting: {
          type: 'boolean',
          description: 'Whether to replace current attachments instead of appending.'
        }
      },
      required: ['memoryId', 'media']
    }
  },
  {
    name: 'get_related_memories',
    description: 'Finds and returns memories related to a specific memory based on content similarity.',
    parameters: {
      type: 'object',
      properties: {
        memoryId: {
          type: 'string',
          description: 'The unique identifier for the source memory capsule.'
        },
        limit: {
          type: 'integer',
          description: 'The maximum number of related memories to return.',
          default: 3
        }
      },
      required: ['memoryId']
    }
  },
  {
    type: 'function',
    name: 'delete_memory',
    description: 'Delete a memory capsule from the vault.',
    parameters: {
      type: 'object',
      properties: {
        memoryId: {
          type: 'string',
          description: 'Identifier of the memory to delete.'
        }
      },
      required: ['memoryId']
    }
  },
  {
    type: 'function',
    name: 'delete_person',
    description: 'Delete a person from the vault.',
    parameters: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'Identifier of the person to delete.'
        }
      },
      required: ['personId']
    }
  },
  {
    type: 'function',
    name: 'get_memory_by_id',
    description: 'Get a memory by its ID.',
    parameters: {
      type: 'object',
      properties: {
        memoryId: {
          type: 'string',
          description: 'Identifier of the memory to retrieve.'
        }
      },
      required: ['memoryId']
    }
  },
  {
    type: 'function',
    name: 'get_person_by_id',
    description: 'Get a person by their ID.',
    parameters: {
      type: 'object',
      properties: {
        personId: {
          type: 'string',
          description: 'Identifier of the person to retrieve.'
        }
      },
      required: ['personId']
    }
  },
  {
    type: 'function',
    name: 'summarize_conversation',
    description: 'Summarize the conversation to create a memory.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic of the conversation to summarize.'
        }
      },
      required: ['topic']
    }
  }
];

module.exports = {
  TOOL_DEFINITIONS
};
