# 🔍 Button-Specific Debug Guide

## Current Status:
- ✅ MTAP toggle works
- ❌ Settings gear icon doesn't work
- ❌ Search button doesn't work

This suggests **partial JavaScript loading** or **specific element issues**.

## Debug Steps:

### Step 1: Check Console During Popup Open
1. **Right-click Emma icon** → "Inspect popup"
2. **Go to Console tab**
3. **Click Emma icon again** (to reload popup)
4. **Look for these specific messages**:
   ```
   Settings button: FOUND (or NOT FOUND)
   Search button: FOUND (or NOT FOUND)
   Settings button listener attached (or error)
   Search button listener attached (or error)
   ```

### Step 2: Manual Button Test
**Copy/paste the entire contents of `button-specific-debug.js` into the popup console.**

This will:
- Check if buttons exist
- Check if they're blocked by other elements
- Add manual event listeners
- Test the functions directly

### Step 3: Visual Inspection
Look at the popup and check:
- Is the gear icon (⚙️) visible in top-right?
- Is the search button (🔍) visible next to search input?
- Do they visually look clickable (hover effects)?

### Step 4: Expected Debug Output
After running the debug script, you should see:
```
Settings button found: true
Settings button details: {...}
Settings button position: {...}
Element at settings button center: BUTTON (GOOD)
Manual settings listener added
```

### Step 5: Test Manual Clicks
After running the debug script:
1. **Try clicking gear icon** → Should show alert "Manual settings click!"
2. **Try clicking search button** → Should show alert "Manual search click!"

## Possible Issues:

1. **Element Not Found**: Button IDs don't match
2. **Element Blocked**: CSS overlay preventing clicks
3. **Function Scope**: Functions not available in global scope
4. **Timing Issue**: Event listeners attached before elements exist

## Quick Fix Test:
If manual listeners work but original ones don't, the issue is in the initialization timing or scope.

---
**Run the debug script and tell me what output you get!** 🎯