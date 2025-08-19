# Emma Lite Chrome Extension 🧠

## Memory Layer for AI Conversations

Emma Lite is a Chrome extension that gives your AI assistants perfect memory. It automatically captures and stores your conversations with ChatGPT, Claude, and other AI platforms, making them searchable and accessible across all your AI interactions.

## Features

✨ **Auto-Capture**: Automatically saves conversations from ChatGPT and Claude  
🔍 **Smart Search**: Find any past conversation instantly  
💾 **Local Storage**: Your memories stay on your device  
📊 **Analytics**: Track your AI usage patterns  
🔒 **Privacy First**: No cloud uploads, everything stays local  
📦 **Export/Import**: Backup and restore your memories  
🎨 **Clean UI**: Beautiful, intuitive interface  

## Installation

### Development Mode

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `emma-lite-extension` folder
6. The extension icon (🧠) will appear in your toolbar

### Usage

1. **Automatic Capture**: Just browse ChatGPT or Claude normally - Emma automatically captures conversations
2. **Manual Capture**: Click the Emma button on any page to capture current content
3. **Search**: Click the extension icon and use the search bar to find memories
4. **Export**: Click Export to save all memories as JSON
5. **Import**: Click Import to restore memories from a backup

## Supported Platforms

- ✅ ChatGPT (chat.openai.com)
- ✅ Claude (claude.ai)
- 🔜 Google Gemini
- 🔜 Microsoft Copilot
- 🔜 Perplexity AI

## Privacy & Security

- **100% Local**: All data stored in browser's IndexedDB
- **No Cloud**: No external servers or API calls
- **Encrypted**: Optional encryption for sensitive memories
- **You Own Your Data**: Export anytime, delete anytime

## Technical Details

### Architecture

```
emma-lite-extension/
├── manifest.json          # Chrome extension manifest
├── js/
│   ├── background.js      # Service worker
│   ├── content-*.js       # Content scripts for each platform
│   └── popup.js          # Popup interface
├── lib/
│   └── database.js       # IndexedDB wrapper
├── css/
│   ├── popup.css         # Popup styles
│   └── content.css       # Injected UI styles
└── icons/                # Extension icons
```

### Storage

- **IndexedDB**: Primary storage for memories
- **Chrome Storage API**: Settings and preferences
- **No limits**: Stores unlimited memories (browser permitting)

### Search Algorithm

- Token-based text matching
- Relevance scoring
- Recency boosting
- Role-based filtering

## Development

### Prerequisites

- Chrome browser (version 88+)
- Basic knowledge of Chrome extensions
- Text editor (VS Code recommended)

### Building from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/emma-lite-extension.git

# Navigate to directory
cd emma-lite-extension

# Load in Chrome
# 1. Open chrome://extensions/
# 2. Enable Developer mode
# 3. Click "Load unpacked"
# 4. Select this folder
```

### Testing

1. Load the extension in development mode
2. Navigate to ChatGPT or Claude
3. Have a conversation
4. Click the Emma icon to see captured memories
5. Test search functionality
6. Test export/import

## Roadmap

### Version 1.0 (Current)
- ✅ Basic capture from ChatGPT/Claude
- ✅ Local storage with IndexedDB
- ✅ Search functionality
- ✅ Export/Import
- ✅ Basic UI

### Version 1.1 (Next)
- 🔜 Vector embeddings for semantic search
- 🔜 Cloud sync (optional)
- 🔜 API for external access
- 🔜 More AI platforms

### Version 2.0 (Future)
- 🔜 Memory sharing between users
- 🔜 Team collaboration features
- 🔜 Advanced analytics
- 🔜 Plugin system

## Troubleshooting

### Extension not capturing conversations?
1. Refresh the ChatGPT/Claude page
2. Check if auto-capture is enabled in settings
3. Make sure the extension has proper permissions

### Search not working?
1. Ensure you have some memories stored
2. Try simpler search terms
3. Check the browser console for errors

### Storage full?
1. Export your memories for backup
2. Delete old memories you don't need
3. Consider upgrading browser storage limits

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

- 📧 Email: support@emma-lite.com
- 💬 Discord: [Join our community](https://discord.gg/emma-lite)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/emma-lite-extension/issues)

## Acknowledgments

Built with ❤️ for the AI community.

Special thanks to:
- OpenAI for ChatGPT
- Anthropic for Claude
- The open-source community

---

**Remember Everything. Forever.** 🧠✨