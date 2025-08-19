/**
 * 🌟 Emma Orb Showcase - Examples & Documentation
 * 
 * Demonstrates all Emma orb variants and states
 * Used for: Documentation, testing, visual regression
 */

import React, { useState } from 'react';
import { EmmaCompanionOrb } from '../presets/EmmaCompanionOrb';
import { EmmaOrb } from '../core/EmmaOrb';
import { EmmaOrbState, EmmaOrbSize } from '../core/types';
import { EMMA_THEME_PRESETS, EMMA_SIZE_PRESETS } from '../index';

// ========================================
// SHOWCASE COMPONENT
// ========================================

const EmmaOrbShowcase: React.FC = () => {
  const [selectedState, setSelectedState] = useState<EmmaOrbState>('idle');
  const [selectedSize, setSelectedSize] = useState<EmmaOrbSize>('medium');

  const states: EmmaOrbState[] = [
    'idle',
    'thinking',
    'speaking',
    'listening',
    'celebrating',
    'attention',
    'error',
  ];

  const sizes: EmmaOrbSize[] = [
    'micro',
    'tiny',
    'small',
    'medium',
    'large',
    'xl',
    'xxl',
  ];

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🌟 Emma Orb System Showcase
          </h1>
          <p className="text-lg text-gray-600">
            Interactive demonstration of Emma orb components and states
          </p>
        </div>

        {/* Interactive Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Interactive Demo</h2>
          
          <div className="flex flex-wrap gap-6 mb-6">
            {/* State Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value as EmmaOrbState)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                {states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            {/* Size Controls */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value as EmmaOrbSize)}
                className="border border-gray-300 rounded-md px-3 py-2"
              >
                {sizes.map((size) => (
                  <option key={size} value={size}>
                    {size} ({EMMA_SIZE_PRESETS[size]}px)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Live Demo */}
          <div className="flex justify-center p-8 bg-gray-100 rounded-lg">
            <EmmaCompanionOrb
              size={selectedSize}
              state={selectedState}
              onConversationStart={() => console.log('Conversation started!')}
              onMemoryCapture={() => console.log('Memory captured!')}
              debug={true}
            />
          </div>
        </div>

        {/* Size Variations */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Size Variations</h2>
          <div className="flex flex-wrap items-end justify-center gap-6 p-6 bg-gray-100 rounded-lg">
            {sizes.map((size) => (
              <div key={size} className="text-center">
                <EmmaOrb size={size} state="idle" />
                <p className="text-sm text-gray-600 mt-2">
                  {size}<br />
                  {EMMA_SIZE_PRESETS[size]}px
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* State Variations */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">State Variations</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-gray-100 rounded-lg">
            {states.map((state) => (
              <div key={state} className="text-center">
                <EmmaOrb size="large" state={state} />
                <p className="text-sm text-gray-600 mt-2 capitalize">
                  {state}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Theme Variations */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Theme Variations</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 p-6 bg-gray-100 rounded-lg">
            {Object.entries(EMMA_THEME_PRESETS).map(([name, theme]) => (
              <div key={name} className="text-center">
                <EmmaOrb size="large" state="idle" theme={theme} />
                <p className="text-sm text-gray-600 mt-2 capitalize">
                  {name}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Component Variants */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Component Variants</h2>
          
          <div className="space-y-6">
            {/* Companion Orb */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium mb-2">EmmaCompanionOrb</h3>
              <p className="text-gray-600 mb-4">
                Full-featured companion with conversation states and interactions
              </p>
              <div className="flex justify-center">
                <EmmaCompanionOrb
                  size="large"
                  onConversationStart={() => console.log('Companion conversation started!')}
                  onMemoryCapture={() => console.log('Companion memory captured!')}
                />
              </div>
            </div>

            {/* Basic Orb */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium mb-2">EmmaOrb (Basic)</h3>
              <p className="text-gray-600 mb-4">
                Core orb component with minimal configuration
              </p>
              <div className="flex justify-center">
                <EmmaOrb
                  size="large"
                  state="idle"
                  interactions={{
                    onClick: () => console.log('Basic orb clicked!')
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Usage Examples</h2>
          
          <div className="space-y-4">
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Basic Usage</h3>
              <pre className="text-sm text-gray-700 overflow-x-auto">
{`import { EmmaCompanionOrb } from '@/components/emma-orb-system';

<EmmaCompanionOrb 
  size="large"
  onConversationStart={() => console.log('Started!')}
/>`}
              </pre>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Custom Theme</h3>
              <pre className="text-sm text-gray-700 overflow-x-auto">
{`import { EmmaOrb, createEmmaTheme } from '@/components/emma-orb-system';

const customTheme = createEmmaTheme(180, 70, 50, 0.9);

<EmmaOrb 
  size="xl"
  state="celebrating"
  theme={customTheme}
/>`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmmaOrbShowcase;

