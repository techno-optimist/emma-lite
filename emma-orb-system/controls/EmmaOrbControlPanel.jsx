/**
 * 🎛️ Emma Orb Control Panel
 * 
 * Master control interface for customizing Emma's appearance and behavior
 */

import React, { useState, useEffect } from 'react';
import { X, Palette, Brain, Zap, Settings, Download, Upload, RotateCcw } from 'lucide-react';

const EmmaOrbControlPanel = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSettingsChange, 
  onSettingsSave,
  onPresetLoad 
}) => {
  const [activeTab, setActiveTab] = useState('visual');
  
  // Provide safe defaults to prevent crashes
  const defaultSettings = {
    visual: {
      hue: 250,
      saturation: 80,
      lightness: 60,
      haloIntensity: 0.8
    },
    contextual: {
      moodDetection: false,
      conversationSync: false,
      environmentalResponse: false
    },
    behavioral: {
      idleAnimation: 'float',
      animationSpeed: 1.0
    },
    advanced: {
      performanceMode: 'high',
      debugMode: false,
      reducedMotion: false
    }
  };
  
  const [localSettings, setLocalSettings] = useState(settings || defaultSettings);

  useEffect(() => {
    if (settings) {
      // Merge with defaults to ensure all properties exist
      const mergedSettings = {
        visual: { ...defaultSettings.visual, ...settings.visual },
        contextual: { ...defaultSettings.contextual, ...settings.contextual },
        behavioral: { ...defaultSettings.behavioral, ...settings.behavioral },
        advanced: { ...defaultSettings.advanced, ...settings.advanced }
      };
      setLocalSettings(mergedSettings);
    }
  }, [settings]);

  if (!isOpen) return null;

  const handleSettingChange = (category, key, value) => {
    try {
      const newSettings = {
        ...localSettings,
        [category]: {
          ...localSettings[category],
          [key]: value
        }
      };
      setLocalSettings(newSettings);
      if (onSettingsChange) {
        onSettingsChange(newSettings);
      }
    } catch (error) {
      console.error('Error updating setting:', error);
      // Fallback to safe defaults if there's an error
      setLocalSettings(defaultSettings);
    }
  };

  const handleSave = () => {
    try {
      if (onSettingsSave) {
        onSettingsSave(localSettings);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const tabs = [
    { id: 'visual', label: 'Visual', icon: Palette },
    { id: 'contextual', label: 'AI', icon: Brain },
    { id: 'behavioral', label: 'Behavior', icon: Zap },
    { id: 'advanced', label: 'Advanced', icon: Settings }
  ];

  const renderVisualControls = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Hue: {localSettings.visual?.hue || 250}
        </label>
        <input
          type="range"
          min="0"
          max="360"
          value={localSettings.visual?.hue || 250}
          onChange={(e) => handleSettingChange('visual', 'hue', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Saturation: {localSettings.visual?.saturation || 80}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={localSettings.visual?.saturation || 80}
          onChange={(e) => handleSettingChange('visual', 'saturation', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lightness: {localSettings.visual?.lightness || 60}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={localSettings.visual?.lightness || 60}
          onChange={(e) => handleSettingChange('visual', 'lightness', parseInt(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Halo Intensity: {((localSettings.visual?.haloIntensity || 0.8) * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={localSettings.visual?.haloIntensity || 0.8}
          onChange={(e) => handleSettingChange('visual', 'haloIntensity', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );

  const renderContextualControls = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Mood Detection</span>
        <input
          type="checkbox"
          checked={localSettings.contextual?.moodDetection || false}
          onChange={(e) => handleSettingChange('contextual', 'moodDetection', e.target.checked)}
          className="rounded"
        />
      </div>
      
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Conversation Sync</span>
        <input
          type="checkbox"
          checked={localSettings.contextual?.conversationSync || false}
          onChange={(e) => handleSettingChange('contextual', 'conversationSync', e.target.checked)}
          className="rounded"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Environmental Response</span>
        <input
          type="checkbox"
          checked={localSettings.contextual?.environmentalResponse || false}
          onChange={(e) => handleSettingChange('contextual', 'environmentalResponse', e.target.checked)}
          className="rounded"
        />
      </div>
    </div>
  );

  const renderBehavioralControls = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Idle Animation</label>
        <select
          value={localSettings.behavioral?.idleAnimation || 'float'}
          onChange={(e) => handleSettingChange('behavioral', 'idleAnimation', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="float">Float</option>
          <option value="pulse">Pulse</option>
          <option value="rotate">Rotate</option>
          <option value="static">Static</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Animation Speed: {((localSettings.behavioral?.animationSpeed || 1.0) * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0.1"
          max="2.0"
          step="0.1"
          value={localSettings.behavioral?.animationSpeed || 1.0}
          onChange={(e) => handleSettingChange('behavioral', 'animationSpeed', parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );

  const renderAdvancedControls = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Performance Mode</label>
        <select
          value={localSettings.advanced?.performanceMode || 'high'}
          onChange={(e) => handleSettingChange('advanced', 'performanceMode', e.target.value)}
          className="w-full p-2 border border-gray-300 rounded-md"
        >
          <option value="high">High Quality</option>
          <option value="balanced">Balanced</option>
          <option value="performance">Performance</option>
        </select>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Debug Mode</span>
        <input
          type="checkbox"
          checked={localSettings.advanced?.debugMode || false}
          onChange={(e) => handleSettingChange('advanced', 'debugMode', e.target.checked)}
          className="rounded"
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Reduced Motion</span>
        <input
          type="checkbox"
          checked={localSettings.advanced?.reducedMotion || false}
          onChange={(e) => handleSettingChange('advanced', 'reducedMotion', e.target.checked)}
          className="rounded"
        />
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'visual':
        return renderVisualControls();
      case 'contextual':
        return renderContextualControls();
      case 'behavioral':
        return renderBehavioralControls();
      case 'advanced':
        return renderAdvancedControls();
      default:
        return renderVisualControls();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Emma Orb Control Panel</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => {/* Reset to defaults */}}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmmaOrbControlPanel;

