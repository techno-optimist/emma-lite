# Emma Lite Chrome Extension - Installation Guide

## 🚀 Quick Installation

### Step 1: Generate Icons
1. Open `icon-generator.html` in Chrome
2. Click "Generate All Icons"
3. Download each icon and save to the `icons/` folder with the exact names shown

### Step 2: Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"**
4. Select the `emma-lite-extension` folder
5. The Emma icon (🧠) should appear in your toolbar

### Step 3: Test the Extension
1. **Method 1 - Test Page:**
   - Open `test.html` in Chrome
   - Run through the test suite to verify functionality

2. **Method 2 - Real Usage:**
   - Visit [ChatGPT](https://chat.openai.com) or [Claude](https://claude.ai)
   - Have a conversation
   - Click the Emma icon in toolbar to see captured memories

## 📁 File Structure

```
emma-lite-extension/
├── manifest.json          # Extension configuration
├── js/
│   ├── background.js      # Service worker (runs in background)
│   ├── content-chatgpt.js # Injected into ChatGPT pages
│   ├── content-claude.js  # Injected into Claude pages
│   ├── popup.js          # Popup window logic
│   └── options.js        # Settings page logic
├── lib/
│   └── database.js       # IndexedDB wrapper for storage
├── css/
│   ├── popup.css         # Popup styles
│   └── content.css       # Injected UI styles
├── icons/                # Extension icons (generate these!)
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
├── popup.html            # Popup interface
├── options.html          # Settings page
├── welcome.html          # First-time user welcome
├── test.html             # Test suite
└── icon-generator.html   # Icon generation tool
```

## ✅ Features Checklist

- [ ] **Auto-capture** from ChatGPT
- [ ] **Auto-capture** from Claude
- [ ] **Search** memories
- [ ] **Export** data as JSON
- [ ] **Import** data from backup
- [ ] **Settings** configuration
- [ ] **Local storage** only (privacy-first)
- [ ] **Statistics** tracking

## 🧪 Testing Checklist

1. **Extension Load Test**
   - [ ] Extension loads without errors
   - [ ] Icon appears in toolbar
   - [ ] Popup opens when clicked

2. **ChatGPT Integration**
   - [ ] Navigate to chat.openai.com
   - [ ] Emma button appears on page
   - [ ] Conversations are captured
   - [ ] Can search captured memories

3. **Claude Integration**
   - [ ] Navigate to claude.ai
   - [ ] Emma button appears on page
   - [ ] Conversations are captured
   - [ ] Can search captured memories

4. **Core Functions**
   - [ ] Search returns relevant results
   - [ ] Export creates valid JSON file
   - [ ] Import restores memories
   - [ ] Settings save properly
   - [ ] Statistics update correctly

## 🐛 Troubleshooting

### Extension not loading?
- Check Chrome version (needs v88+)
- Verify all files are present
- Check browser console for errors (F12)

### Not capturing from ChatGPT/Claude?
- Refresh the page after installing extension
- Check if auto-capture is enabled in settings
- Look for Emma floating button on the page

### Search not working?
- Ensure some memories are saved first
- Try simpler search terms
- Check browser console for errors

### Icons not showing?
- Generate icons using icon-generator.html
- Save as PNG files with exact names
- Ensure icons are in the icons/ folder

## 🔒 Privacy & Security

- ✅ **100% Local**: All data stored in browser's IndexedDB
- ✅ **No servers**: No external API calls
- ✅ **No tracking**: No analytics or telemetry
- ✅ **Your data**: Export anytime, delete anytime
- ✅ **Open source**: Inspect the code yourself

## 📝 Development Notes

### Making Changes
1. Edit the relevant JS/HTML/CSS files
2. Go to `chrome://extensions/`
3. Click the refresh icon on Emma extension
4. Test your changes

### Debugging
- Right-click extension icon → "Inspect popup" for popup debugging
- Open DevTools on ChatGPT/Claude pages for content script debugging
- Check `chrome://extensions/` for background script errors

### Building for Distribution
```bash
# Create a zip file for Chrome Web Store submission
zip -r emma-lite-extension.zip . -x "*.git*" -x "test.html" -x "icon-generator.html" -x "*.md"
```

## 🎉 Success!

If you can:
1. See the Emma icon in your toolbar
2. Open the popup and see the interface
3. Capture a conversation from ChatGPT or Claude
4. Search for and find that conversation

**Then Emma Lite is working! 🧠✨**

## 📚 Next Steps

1. **Use it daily** with ChatGPT and Claude
2. **Export regularly** for backups
3. **Share feedback** for improvements
4. **Contribute** to the open-source project

---

**Remember Everything. Forever.** 🧠

Need help? Open an issue on GitHub or check the test.html page for diagnostics.