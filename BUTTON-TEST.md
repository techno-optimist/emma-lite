# Emma Extension Button Testing Guide

## Changes Made to Fix Button Issues

1. **Added debugging logs** to track initialization and button attachment
2. **Added null checks** for all button event listeners
3. **Fixed z-index issues** that might block button clicks
4. **Added pointer-events: none** to background animation
5. **Added type="button"** to all buttons to prevent form submission issues
6. **Added error handling** for settings and test page opening

## How to Test the Buttons

### Step 1: Reload the Extension
1. Go to `chrome://extensions/`
2. Find "Emma Lite - MTAP Memory Layer"
3. Click the refresh icon
4. **Important**: Open DevTools for the extension
   - Right-click the Emma extension icon
   - Select "Inspect popup"
   - Go to Console tab

### Step 2: Check Console Logs
When you click the extension icon, you should see in the console:
```
Emma Popup: Initializing...
Emma Popup: Attaching event listeners...
Settings button: <button element>
Test button: <button element>
Capture button listener attached
View All button listener attached
... (more buttons)
Emma Popup: All event listeners attached
Emma Popup: Initialization complete
```

### Step 3: Test Each Button

1. **Settings Button (⚙️)**
   - Click the gear icon in top-right
   - Console should show: `Emma Popup: Opening settings page...`
   - Settings page should open

2. **Capture Current Page Button**
   - Navigate to ChatGPT or Claude first
   - Click "Capture Current Page"
   - Should see capture notification

3. **View All Memories Button**
   - Click "View All Memories"
   - Should open memories.html in new tab

4. **Export Data Button**
   - Click "Export Data"
   - Should download JSON file

5. **Import Data Button**
   - Click "Import Data"
   - Should open file picker

6. **Run Tests Button**
   - Click "Run Tests"
   - Should open test page

7. **Search Button**
   - Type something in search box
   - Click search button or press Enter
   - Should show results or "No memories found"

### Step 4: Check for Errors

If buttons still don't work:

1. **Check Console Errors**
   - Look for any red error messages
   - Common issues:
     - "Cannot read property of null"
     - "Failed to execute"
     - "Uncaught TypeError"

2. **Check Elements Panel**
   - In DevTools, go to Elements tab
   - Click the inspect tool
   - Hover over buttons
   - Check if they have event listeners (look for "Event Listeners" panel)

3. **Manual Test in Console**
   - In the popup console, try:
   ```javascript
   // Test if button exists
   document.getElementById('settings-btn')
   
   // Test if function exists
   openSettings
   
   // Manually trigger
   openSettings()
   ```

### Troubleshooting

If buttons still don't work after reload:

1. **Clear Extension Cache**
   - Remove extension
   - Re-add extension from folder

2. **Check Permissions**
   - Make sure extension has all required permissions
   - Check for any permission prompts

3. **Browser Console**
   - Open main browser console (F12)
   - Look for extension errors

4. **Try Incognito Mode**
   - Enable extension in incognito
   - Test if it works there

## Expected Behavior

When everything is working:
- All buttons should be clickable
- Hover effects should work (slight scale/color change)
- Console logs should show button clicks
- Each button should perform its action
- No errors in console