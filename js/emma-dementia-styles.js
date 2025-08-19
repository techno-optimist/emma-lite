/**
 * Emma Dementia Companion - Modern Styles
 * On-brand styling for the dementia companion interface
 */

function addDementiaStyles() {
  // Remove any existing dementia styles
  const existingStyle = document.getElementById('emma-dementia-styles');
  if (existingStyle) existingStyle.remove();
  
  const style = document.createElement('style');
  style.id = 'emma-dementia-styles';
  style.textContent = `
    .emma-dementia-panel {
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 380px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.95) 0%, rgba(124, 58, 237, 0.95) 100%);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      backdrop-filter: blur(20px);
      box-shadow: 
        0 20px 25px -5px rgba(139, 92, 246, 0.25),
        0 10px 10px -5px rgba(139, 92, 246, 0.1),
        0 1px 3px rgba(255, 255, 255, 0.2) inset;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      z-index: 10001;
      transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
      color: white;
      overflow: hidden;
    }
    
    .emma-dementia-panel.hidden {
      transform: translateY(calc(100% + 20px)) scale(0.95);
      opacity: 0;
      pointer-events: none;
    }
    
    .emma-panel-header {
      padding: 24px 24px 20px 24px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.15);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.05);
    }
    
    .emma-status {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 600;
      font-size: 16px;
      color: rgba(255, 255, 255, 0.95);
    }
    
    .status-icon {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 12px rgba(52, 211, 153, 0.6);
      animation: gentlePulse 2s infinite;
    }
    
    @keyframes gentlePulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
    
    .emma-minimize {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.8);
      padding: 8px;
      border-radius: 10px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
    }
    
    .emma-minimize:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      transform: scale(1.05);
    }
    
    .emma-panel-content {
      padding: 24px;
    }
    
    .emma-suggestions {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
    }
    
    .emma-suggestions p {
      margin: 0 0 12px 0;
      font-size: 15px;
      color: rgba(255, 255, 255, 0.95);
      line-height: 1.5;
      font-weight: 500;
    }
    
    .emma-suggestions .text-sm, .text-sm {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.7);
      line-height: 1.4;
      font-weight: 400;
    }
    
    .emma-panel-footer {
      padding: 20px 24px 24px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      display: flex;
      gap: 12px;
      background: rgba(255, 255, 255, 0.05);
    }
    
    .emma-settings, .emma-help {
      flex: 1;
      padding: 12px 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      color: rgba(255, 255, 255, 0.9);
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
      text-align: center;
    }
    
    .emma-settings:hover, .emma-help:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    
    .btn {
      padding: 12px 20px;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-block;
      text-align: center;
      backdrop-filter: blur(10px);
    }
    
    .btn-primary, .emma-enable {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      box-shadow: 0 4px 14px rgba(245, 158, 11, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .btn-primary:hover, .emma-enable:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(245, 158, 11, 0.4);
      background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%);
    }
    
    .emma-consent {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.2);
      font-weight: 600;
      padding: 12px 24px;
      border-radius: 12px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      backdrop-filter: blur(10px);
    }
    
    .emma-consent:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
      background: linear-gradient(135deg, #10b981 0%, #047857 100%);
    }
    
    .consent-notice {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8) !important;
      margin-top: 8px;
      line-height: 1.4;
      font-weight: 400;
    }
    
    .emma-transcript {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 20px;
      min-height: 60px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      line-height: 1.5;
    }
    
    /* Accessibility improvements for dementia users */
    .emma-dementia-panel button {
      min-height: 44px;
      min-width: 44px;
      font-size: 14px;
    }
  `;
  document.head.appendChild(style);
}

// Export for use in the main companion file
if (typeof window !== 'undefined') {
  window.addDementiaStyles = addDementiaStyles;
}
