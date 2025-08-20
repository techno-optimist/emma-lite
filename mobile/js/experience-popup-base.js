/**
 * Base class for Emma experience popups
 */

console.log('🔥🔥🔥 CACHE BUST DEBUG: experience-popup-base.js RELOADED at', new Date().toISOString());

class ExperiencePopup {
  constructor(position, settings) {
    this.position = position;
    this.settings = settings;
    this.element = null;
    this.isVisible = false;
  }

  /**
   * Show the popup
   */
  async show() {
    if (this.isVisible) return;

    this.element = this.createElement();
    document.body.appendChild(this.element);
    
    // Animate in
    requestAnimationFrame(() => {
      // Ensure within viewport before fade-in
      this.ensureOnScreen();
      // If still bottom-clipped, nudge upward by the clipped amount
      const rect = this.element.getBoundingClientRect();
      const bottomOverflow = rect.bottom - window.innerHeight;
      if (bottomOverflow > 0) {
        const top = Math.max(8, rect.top - bottomOverflow - 8);
        this.element.style.top = `${top}px`;
        this.position.top = top;
      }
      this.element.style.opacity = '1';
      this.element.style.transform = 'translateY(0) scale(1)';
    });

    this.isVisible = true;
    this.setupEventListeners();
    await this.initialize();
    
    // Enable drag-to-move with header handle(s) after content is initialized
    this.setupDragHandles();
    // Enable resize from bottom-left corner
    this.setupResizeHandle();
  }

  /**
   * Close the popup
   */
  close() {
    console.log('🔵 SIMPLIFIED Close: Starting close sequence');
    
    // Bulletproof close - capture all context immediately
    const element = this.element;
    const isVisible = this.isVisible;
    
    if (!isVisible || !element) {
      console.log('🔵 SIMPLIFIED Close: Already closed or no element');
      return;
    }

    // Set state immediately
    this.isVisible = false;
    
    // Simple animation
    element.style.opacity = '0';
    element.style.transform = 'translateY(-10px) scale(0.95)';
    
    // Remove after animation with captured element reference
    setTimeout(() => {
      console.log('🔵 SIMPLIFIED Close: Removing element');
      if (element && element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 200);

    // Clear reference immediately
    this.element = null;
    
    // Cleanup
    this.cleanup();
    console.log('🔵 SIMPLIFIED Close: Complete');
  }

  /**
   * Create the popup DOM element
   */
  createElement() {
    // Store reference to this for use in event handlers
    const self = this;
    const popup = document.createElement('div');
    popup.className = 'emma-experience-popup';
    popup.style.cssText = `
      position: fixed;
      left: ${Math.max(8, Math.min(window.innerWidth - this.position.width - 8, this.position.left))}px;
      top: ${Math.max(8, Math.min(window.innerHeight - this.position.height - 8, this.position.top))}px;
      width: ${this.position.width}px;
      height: ${this.position.height}px;
      background: linear-gradient(135deg, rgba(147, 112, 219, 0.95), rgba(123, 104, 238, 0.95));
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      z-index: 2147483647;
      opacity: 0;
      transform: translateY(-10px) scale(0.95);
      transition: all 0.2s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: white;
      overflow: hidden;
    `;

    // Create header
    const header = document.createElement('div');
    header.className = 'popup-header';
    header.style.cssText = `
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    `;
    title.textContent = this.getTitle();

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s ease;
    `;
    closeBtn.onmouseover = () => closeBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    closeBtn.onmouseout = () => closeBtn.style.backgroundColor = 'transparent';
    
    // BULLETPROOF: Multiple debugging layers for close button
    closeBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔥 CLOSE DEBUG: Close button clicked - starting debug sequence');
      console.log('🔥 CLOSE DEBUG: this =', this);
      console.log('🔥 CLOSE DEBUG: this.element =', this.element);
      console.log('🔥 CLOSE DEBUG: this.isVisible =', this.isVisible);
      console.log('🔥 CLOSE DEBUG: this.close =', typeof this.close);
      
      try {
        console.log('🔥 CLOSE DEBUG: About to call this.close()');
        this.close();
        console.log('🔥 CLOSE DEBUG: this.close() completed successfully');
      } catch (error) {
        console.error('🔥 CLOSE DEBUG: ERROR in this.close():', error);
        console.error('🔥 CLOSE DEBUG: Error stack:', error.stack);
        
        // EMERGENCY FALLBACK: Manual DOM removal
        console.log('🔥 CLOSE DEBUG: Attempting emergency fallback removal');
        if (this.element && this.element.parentNode) {
          this.element.parentNode.removeChild(this.element);
          console.log('🔥 CLOSE DEBUG: Emergency removal successful');
        } else {
          console.log('🔥 CLOSE DEBUG: No element to remove');
        }
      }
    };

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Customize header appearance based on title
    const titleText = this.getTitle();
    if (!titleText || titleText.trim() === '') {
      // No title - just show close button with no border/padding
      header.style.borderBottom = 'none';
      header.style.padding = '8px 12px 0 0';
      header.style.justifyContent = 'flex-end';
      title.style.display = 'none';
    }

    // Create content area
    const content = document.createElement('div');
    content.className = 'popup-content';
    const contentPadding = (!titleText || titleText.trim() === '') ? '8px 20px 20px 20px' : '20px';
    content.style.cssText = `
      padding: ${contentPadding};
      height: auto;
      overflow: visible;
    `;

    popup.appendChild(header);
    popup.appendChild(content);

    this.renderContent(content);

    return popup;
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // SIMPLIFIED: Arrow functions preserve 'this' automatically
    
    // Close on Escape
    this.escapeHandler = (e) => {
      if (e.key === 'Escape') {
        console.log('🔵 SIMPLIFIED: Escape key pressed');
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);

    // Close on outside click
    this.clickHandler = (e) => {
      console.log('🔥 POPUP CLICK DEBUG: Click detected', e.target);
      // Don't close if clicking on the orb itself
      if (e.target.closest('.universal-emma-orb')) {
        console.log('🔥 POPUP CLICK DEBUG: Ignoring orb click');
        return;
      }
      // Don't close if clicking on any modal (password, input, etc.)
      if (e.target.closest('.clean-modal-overlay') || e.target.closest('.emma-input-modal-overlay')) {
        console.log('🔥 POPUP CLICK DEBUG: Clicked on modal - not closing popup');
        return;
      }
      
      // Close when clicking outside the popup
      if (this.element && !this.element.contains(e.target)) {
        console.log('🔥 POPUP CLICK DEBUG: Clicked outside popup - closing');
        this.close();
      } else {
        console.log('🔥 POPUP CLICK DEBUG: Clicked inside popup - not closing');
      }
    };
    // Use setTimeout to ensure this handler is added after any orb handlers
    setTimeout(() => {
      document.addEventListener('click', this.clickHandler);
    }, 100);
  }

  /**
   * Remove event listeners
   */
  cleanup() {
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler);
    }
  }

  // Abstract methods to be overridden by subclasses
  getTitle() {
    return 'Emma';
  }

  renderContent(contentElement) {
    contentElement.innerHTML = '<p>Experience content goes here</p>';
  }

  async initialize() {
    // Override in subclasses for initialization logic
  }

  /**
   * Measure current content height and resize popup to fit without scrolling.
   * Keeps current left/top position (no jumping). Bounds to viewport height.
   */
  resizeToContent(options = {}) {
    const defaults = { minHeight: 420, maxHeight: Math.max(360, window.innerHeight - 32), animate: true };
    const settings = { ...defaults, ...options };

    if (!this.element) return;

    const header = this.element.querySelector('.popup-header');
    const content = this.element.querySelector('.popup-content');
    if (!content) return;

    // Temporarily allow natural sizing for measurement
    const prevContentHeight = content.style.height;
    const prevOverflow = content.style.overflow;
    content.style.height = 'auto';
    content.style.overflow = 'visible';

    const headerHeight = header ? header.offsetHeight : 0;
    // Measure content height robustly, even if children are position:absolute
    let contentHeight = Math.max(content.scrollHeight, content.offsetHeight);
    const activeTab = content.querySelector('.tab-content.active');
    if (activeTab) {
      const tabRect = activeTab.getBoundingClientRect();
      contentHeight = Math.max(contentHeight, Math.ceil(tabRect.height));
      // If the tab uses an inner container, prefer that
      const inner = activeTab.querySelector('.voice-wizard-container') || activeTab.firstElementChild;
      if (inner) {
        const innerRect = inner.getBoundingClientRect();
        contentHeight = Math.max(contentHeight, Math.ceil(innerRect.height));
      }
    }
    let requiredHeight = headerHeight + contentHeight; // padding already included in content

    // Apply bounds
    requiredHeight = Math.max(settings.minHeight, Math.min(settings.maxHeight, requiredHeight));

    // Apply
    if (settings.animate) {
      this.element.style.transition = this.element.style.transition || 'height 120ms ease';
    }
    this.element.style.height = `${requiredHeight}px`;

    // Restore
    content.style.height = prevContentHeight || 'auto';
    content.style.overflow = prevOverflow || 'visible';
    // Final safety: keep on screen
    this.ensureOnScreen();
  }

  /** Ensure popup stays fully within viewport */
  ensureOnScreen() {
    if (!this.element) return;
    const rect = this.element.getBoundingClientRect();
    const padding = 8;
    let left = rect.left;
    let top = rect.top;
    const maxLeft = Math.max(padding, window.innerWidth - rect.width - padding);
    const maxTop = Math.max(padding, window.innerHeight - rect.height - padding);
    left = Math.min(Math.max(left, padding), maxLeft);
    top = Math.min(Math.max(top, padding), maxTop);
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
    this.position.left = left;
    this.position.top = top;
  }

  /**
   * Attach drag-to-move behavior using either a custom in-content header
   * (e.g., `.custom-header`) or the base `.popup-header`.
   */
  setupDragHandles() {
    if (!this.element) return;
    const custom = this.element.querySelector('.custom-header');
    const base = this.element.querySelector('.popup-header');
    if (custom) this.enableDragWithHandle(custom);
    else if (base) this.enableDragWithHandle(base);
  }

  /**
   * Enable dragging the popup by the given handle element.
   */
  enableDragWithHandle(handleElement) {
    if (!handleElement || !this.element) return;
    const popup = this.element;
    handleElement.style.cursor = 'move';
    handleElement.style.userSelect = 'none';
    handleElement.style.webkitUserSelect = 'none';

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startLeft = 0;
    let startTop = 0;

    const threshold = 3; // pixels before we consider it a drag

    const onPointerMove = (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (!isDragging && (Math.abs(dx) > threshold || Math.abs(dy) > threshold)) {
        isDragging = true;
      }
      if (!isDragging) return;

      const width = popup.offsetWidth;
      const height = popup.offsetHeight;
      const maxLeft = Math.max(0, window.innerWidth - width);
      const maxTop = Math.max(0, window.innerHeight - height);

      let newLeft = startLeft + dx;
      let newTop = startTop + dy;
      newLeft = Math.min(maxLeft, Math.max(0, newLeft));
      newTop = Math.min(maxTop, Math.max(0, newTop));

      popup.style.left = `${newLeft}px`;
      popup.style.top = `${newTop}px`;

      // Persist position
      this.position.left = newLeft;
      this.position.top = newTop;
    };

    const endDrag = (e) => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', endDrag, true);
      document.removeEventListener('pointercancel', endDrag, true);
      handleElement.releasePointerCapture?.(e.pointerId);
      isDragging = false;
      popup.style.willChange = '';
    };

    const onPointerDown = (e) => {
      // Left click / primary touch only
      if (e.button !== undefined && e.button !== 0) return;
      // Don't start drag from interactive controls (e.g., close button)
      if (e.target.closest('button, a, input, textarea, select')) return;

      const rect = popup.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;
      popup.style.willChange = 'left, top';

      handleElement.setPointerCapture?.(e.pointerId);
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', endDrag, true);
      document.addEventListener('pointercancel', endDrag, true);
    };

    handleElement.addEventListener('pointerdown', onPointerDown);
  }

  /**
   * Add a bottom-left resize grip so users can resize the popup height and width.
   */
  setupResizeHandle() {
    if (!this.element) return;
    const popup = this.element;
    const grip = document.createElement('div');
    grip.className = 'emma-popup-resize-grip';
    grip.style.cssText = `
      position: absolute;
      left: 6px;
      bottom: 6px;
      width: 14px;
      height: 14px;
      border-radius: 3px;
      background: rgba(255,255,255,0.25);
      border: 1px solid rgba(255,255,255,0.4);
      cursor: nwse-resize;
      z-index: 2;
    `;
    popup.appendChild(grip);

    let startX = 0;
    let startY = 0;
    let startWidth = 0;
    let startHeight = 0;
    let startLeft = 0;

    const onMove = (e) => {
      const dx = startX - e.clientX; // bottom-left grip: moving left increases width
      const dy = e.clientY - startY; // moving down increases height
      const newWidth = Math.max(380, startWidth + dx);
      const newHeight = Math.max(420, startHeight + dy);

      // Adjust left to keep right edge anchored while resizing from left
      const deltaWidth = newWidth - startWidth;
      const newLeft = Math.max(0, startLeft - deltaWidth);

      popup.style.width = `${newWidth}px`;
      popup.style.height = `${newHeight}px`;
      popup.style.left = `${newLeft}px`;

      // Persist
      this.position.width = newWidth;
      this.position.height = newHeight;
      this.position.left = newLeft;
    };

    const end = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', end, true);
      document.removeEventListener('pointercancel', end, true);
    };

    grip.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const rect = popup.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startWidth = rect.width;
      startHeight = rect.height;
      startLeft = rect.left;
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', end, true);
      document.addEventListener('pointercancel', end, true);
    });
  }
}

// Export for use
window.ExperiencePopup = ExperiencePopup;
