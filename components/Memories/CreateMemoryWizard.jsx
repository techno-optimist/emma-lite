import React, { useCallback, useMemo, useReducer, useState } from 'react';

function generateId(prefix = 'id') {
  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${ts}_${rnd}`;
}

function readableFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, idx)).toFixed(1)} ${units[idx]}`;
}

function attachmentsReducer(state, action) {
  switch (action.type) {
    case 'ADD_FILES': {
      const next = [...state];
      for (const file of action.files) {
        next.push({
          localId: generateId('local'),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          caption: '',
          previewUrl: URL.createObjectURL(file)
        });
      }
      return next;
    }
    case 'REMOVE': {
      const next = state.filter(att => att.localId !== action.localId);
      return next;
    }
    case 'UPDATE_META': {
      return state.map(att => att.localId === action.localId ? { ...att, ...action.updates } : att);
    }
    case 'RESET':
      return [];
    default:
      return state;
  }
}

export default function CreateMemoryWizard({ onCancel, onComplete }) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');

  const [attachments, dispatch] = useReducer(attachmentsReducer, []);

  const tagList = useMemo(() => (tags || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean), [tags]);

  const canContinueDetails = title.trim().length > 0 || description.trim().length > 0 || attachments.length > 0;

  const handleFiles = useCallback((files) => {
    if (!files || files.length === 0) return;
    dispatch({ type: 'ADD_FILES', files: Array.from(files) });
  }, []);

  const removeAttachment = useCallback((localId) => {
    dispatch({ type: 'REMOVE', localId });
  }, []);

  const updateAttachmentCaption = useCallback((localId, caption) => {
    dispatch({ type: 'UPDATE_META', localId, updates: { caption } });
  }, []);

  const goNext = useCallback(() => setStep(s => Math.min(3, s + 1)), []);
  const goBack = useCallback(() => setStep(s => Math.max(1, s - 1)), []);

  const createCapsule = useCallback(async () => {
    try {
      setSaving(true);
      setError('');
      setProgress('Creating capsule...');

      const memoryPayload = {
        content: description || title || '(Untitled memory)',
        role: 'user',
        source: 'manual',
        type: attachments.length > 0 ? 'media' : 'note',
        metadata: {
          title: title || undefined,
          category,
          tags: tagList,
          createdVia: 'CreateMemoryWizard'
        }
      };

      const saveResp = await chrome.runtime.sendMessage({ action: 'saveMemory', data: memoryPayload });
      if (!saveResp || !saveResp.success) {
        throw new Error(saveResp?.error || 'Failed to create memory');
      }
      const capsuleId = saveResp.memoryId;

      if (attachments.length > 0) {
        let index = 0;
        for (const att of attachments) {
          index += 1;
          setProgress(`Uploading media ${index}/${attachments.length}...`);
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(att.file);
          });

          const meta = {
            id: generateId('att'),
            mime: att.type || 'application/octet-stream',
            size: att.size || 0,
            type: (att.type || '').startsWith('video') ? 'video' : ((att.type || '').startsWith('image') ? 'image' : 'file'),
            caption: att.caption || '',
            capturedAt: new Date().toISOString(),
            capsuleId
          };

          const addResp = await chrome.runtime.sendMessage({ action: 'attachment.add', meta, dataUrl });
          if (!addResp || !addResp.success) {
            throw new Error(addResp?.error || 'Failed to upload attachment');
          }
        }
      }

      setProgress('Finalizing...');
      setTimeout(() => {
        setSaving(false);
        setProgress('');
        if (typeof onComplete === 'function') onComplete({ id: capsuleId });
      }, 200);
    } catch (e) {
      setSaving(false);
      setError(e.message || 'Unknown error');
    }
  }, [attachments, category, description, onComplete, tagList, title]);

  return (
    <div className="create-memory-wizard" style={{ color: 'var(--emma-text, #fff)' }}>
      <div className="wizard-header" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Create Memory Capsule</h2>
        <div style={{ opacity: 0.7, fontSize: 13 }}>Step {step} of 3</div>
      </div>

      {step === 1 && (
        <div className="wizard-step step-details" data-step="details">
          <div className="field">
            <label>Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Give this memory a title"
            />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe this moment, context, or significance"
            />
          </div>
          <div className="row" style={{ display: 'flex', gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="general">General</option>
                <option value="photos">Photos</option>
                <option value="videos">Videos</option>
                <option value="notes">Notes</option>
                <option value="work">Work</option>
                <option value="personal">Personal</option>
              </select>
            </div>
            <div className="field" style={{ flex: 2 }}>
              <label>Tags</label>
              <input
                type="text"
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="Comma-separated tags"
              />
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="wizard-step step-attachments" data-step="attachments">
          <div className="uploader" style={{
            border: '1px dashed var(--emma-border, rgba(255,255,255,0.2))',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
            background: 'rgba(255,255,255,0.03)'
          }}>
            <input
              id="wizard-file-input"
              type="file"
              multiple
              accept="image/*,video/*"
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
            <div style={{ marginBottom: 8 }}>Add photos or videos</div>
            <button type="button" onClick={() => document.getElementById('wizard-file-input').click()}>
              Select Files
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="attachment-list" style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {attachments.map(att => (
                <div key={att.localId} className="attachment-item" style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 12,
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  {att.type?.startsWith('image') ? (
                    <img src={att.previewUrl} alt={att.name} style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8 }} />
                  ) : (
                    <div style={{ height: 100, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.3)' }}>🎥</div>
                  )}
                  <div style={{ fontSize: 12, opacity: 0.8 }}>{att.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{readableFileSize(att.size)}</div>
                  <input
                    type="text"
                    value={att.caption}
                    onChange={e => updateAttachmentCaption(att.localId, e.target.value)}
                    placeholder="Add a caption"
                    style={{ fontSize: 12 }}
                  />
                  <button type="button" onClick={() => removeAttachment(att.localId)} style={{ alignSelf: 'flex-end' }}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="wizard-step step-review" data-step="review">
          <div style={{ marginBottom: 12, opacity: 0.85 }}>Review</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <div><strong>Title:</strong> {title || '(none)'}</div>
            <div><strong>Description:</strong> {description || '(none)'}</div>
            <div><strong>Category:</strong> {category}</div>
            <div><strong>Tags:</strong> {tagList.length ? tagList.join(', ') : '(none)'}</div>
            <div><strong>Attachments:</strong> {attachments.length}</div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, color: '#ff6b6b', fontSize: 13 }}>{error}</div>
      )}
      {saving && progress && (
        <div style={{ marginTop: 12, opacity: 0.8, fontSize: 13 }}>{progress}</div>
      )}

      <div className="wizard-actions" style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <div>
          {step > 1 && (
            <button type="button" onClick={goBack} disabled={saving}>Back</button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => onCancel?.()} disabled={saving}>Cancel</button>
          {step < 3 && (
            <button type="button" onClick={goNext} disabled={!canContinueDetails || saving}>Next</button>
          )}
          {step === 3 && (
            <button type="button" onClick={createCapsule} disabled={saving}>Create Capsule</button>
          )}
        </div>
      </div>
    </div>
  );
}

export { CreateMemoryWizard };

import React, { useState } from 'react';
import { X } from 'lucide-react';

// CreateMemoryWizard wires the form to Emma Vault via chrome.runtime messages
// Props:
// - onClose: () => void
// - onMemoryCreated?: (created) => void
const CreateMemoryWizard = ({ isOpen, onClose, onMemoryCreated, onSubmit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Family');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const categories = ['Family', 'Friends', 'Travel', 'Celebration', 'Achievement', 'Daily Life', 'Other'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (saving) return;
    setSaving(true);
    setErrorMessage('');

    // Ensure running in extension context with background available
    if (!(window.chrome && chrome.runtime && chrome.runtime.sendMessage)) {
      setErrorMessage('Emma extension context not detected. Please open this page inside the Emma extension or use the popup.');
      setSaving(false);
      return;
    }

    // Check vault status first to give actionable feedback
    try {
      const status = await chrome.runtime.sendMessage({ action: 'vault.getStatus' });
      console.log('🔐 CreateMemoryWizard: Vault status:', status);
      
      if (status?.success) {
        if (!status.initialized) {
          setErrorMessage('Vault not set up. Please complete vault setup first.');
          setSaving(false);
          return;
        } else if (!status.isUnlocked) {
          const sessionInfo = status.hasValidSession ? ' (session expired)' : '';
          setErrorMessage(`Vault is locked${sessionInfo}. Open the Emma popup and unlock, then try again.`);
          setSaving(false);
          return;
        }
      }
    } catch (e) {
      console.error('🔐 CreateMemoryWizard: Error checking vault status:', e);
      // Continue; attempt creation which will surface the error
    }

    const payload = {
      content: description?.trim() || title.trim(),
      type: 'note',
      source: 'dashboard-wizard',
      metadata: {
        title: title.trim(),
        timestamp: Date.now(),
        category
      }
    };

    try {
      const res = await chrome.runtime.sendMessage({ action: 'vault.createCapsule', data: payload });
      if (res && res.success) {
        setSuccess(true);
        // Notify parent
        const created = { id: res.id, ...payload.metadata };
        if (typeof onMemoryCreated === 'function') onMemoryCreated(created);
        if (typeof onSubmit === 'function') onSubmit(created);
        // Reset inputs
        setTitle('');
        setDescription('');
        setCategory('Family');
        // Close after brief delay
        setTimeout(() => {
          setSaving(false);
          setSuccess(false);
          onClose && onClose();
        }, 800);
      } else {
        const message = res?.error || 'Failed to create memory';
        if (/vault locked/i.test(message)) {
          setErrorMessage('Vault is locked. Open Emma popup and unlock, or run welcome → Vault Setup.');
        } else {
          setErrorMessage(message);
        }
        setSaving(false);
      }
    } catch (err) {
      setErrorMessage(err?.message || 'Unexpected error');
      setSaving(false);
    }
  };

  if (isOpen === false) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Create Memory Capsule</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>
        {errorMessage && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
            {errorMessage}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            Memory saved to Vault
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter memory title..."
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows="3"
              placeholder="Describe this memory..."
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`px-4 py-2 text-white rounded-lg ${saving ? 'bg-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
            >
              {saving ? 'Saving…' : 'Create Memory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateMemoryWizard;
