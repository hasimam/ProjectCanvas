# Interactive Canvas Project Plan

A journal-style interactive showcase where users can explore a visual infographic by zooming, panning, and clicking on elements to reveal detailed information in a modal popup.

## Technical Approach

**Stack:**
- **HTML/CSS/JavaScript** - Single page, vanilla JS for simplicity
- **Panzoom library** - For smooth pan/zoom with limits
- **Google Fonts** - Tajawal (Arabic font)
- **Hosting** - Vercel (free tier)
- **Version control** - GitHub repository

**Core Features:**
1. Zoomable/pannable canvas (with zoom limits to preserve image quality)
2. Clickable hotspot regions (icons, titles, elements)
3. Centered white-bordered modal popup on click with:
   - Arabic text content
   - Optional detail image
4. Control panel with: Previous / Next / Show All buttons
5. RTL Arabic text support with Tajawal font

---

## Project Structure

```
ProjectCanvas/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── assets/
│   ├── images/
│   │   └── (canvas background and any extracted images)
│   └── icons/
│       └── (control panel icons)
├── docs/
│   └── project-plan.md
└── README.md
```

---

## Requirements Gathering

### What We Need:

1. **The complete design image** (PNG) - The full canvas background

2. **Clickable regions data** - For each clickable image/area:
   - Position (x, y coordinates from top-left)
   - Size (width, height) for the click region
   - The text to display (in Arabic)
   - Text position (where should the text appear relative to the image)

3. **Sequence order** - Which order should Next/Back navigate through the images?

4. **Design preferences:**
   - Canvas dimensions (or should it match the image size?)
   - Font preferences for Arabic text
   - Control panel icon preferences

---

## Questions to Clarify

1. Do you have the coordinates already, or should we define them after reviewing the image?
2. How many clickable regions are there approximately?
3. Do you have GitHub and Vercel accounts set up?
4. Should the canvas fill the browser window, or have a fixed size?

---

## Implementation Phases

### Phase 1: Project Setup
- Initialize project structure
- Set up HTML boilerplate with RTL support
- Add base CSS styling

### Phase 2: Canvas Implementation
- Implement pan/zoom functionality
- Load and display the background image
- Set up coordinate system

### Phase 3: Interactive Regions
- Define clickable hotspots
- Implement click detection
- Add text overlay system
- Implement zoom-to-region animation

### Phase 4: Control Panel
- Build semi-transparent control panel UI
- Implement Show All functionality
- Implement Next/Back sequence navigation

### Phase 5: Polish & Deploy
- Fine-tune animations and transitions
- Test RTL Arabic text rendering
- Deploy to GitHub
- Deploy to Vercel

---

## Notes

- All texts are in Arabic (RTL support required)
- Control panel: semi-transparent, rounded corners, flat buttons with big simple icons
- Click toggles text on/off
- Sequence mode accumulates shown texts (previous stays visible when moving to next)
