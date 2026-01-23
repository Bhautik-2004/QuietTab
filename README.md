# Quiet Quotes

A minimalist, aesthetically pleasing Chrome New Tab extension that serves daily inspiration alongside a clean clock and pinned shortcuts.

## Features

- **Minimalist Design**: Clean typography, fluid layouts, and a soothing mesh gradient background.
- **Dynamic Themes**: Backgrounds shift subtly; text adapts for readability.
- **Pinned Sites**: Quick access to your favorite websites with custom shortcuts (up to 12 sites).
- **Context Awareness**: (Optional) Smartly detects if you're browsing coding or creative sites to serve relevant quotes.
- **Privacy Focused**: All preferences are stored locally or synced via your Chrome profile. No external tracking.
- **Time Display**: Elegant 12-hour clock centered at the top.
- **Customizable Background**: Choose from Plane, Sphere, or Water effects with adjustable noise texture and motion speed.

## Recent Updates (January 23, 2026)

### Pinned Sites Feature
- **Add Shortcuts**: Click the "+" tile to add your favorite websites with custom names
- **Edit & Remove**: 3-dot menu on each tile for quick editing or removal
- **Favicon Support**: Automatic favicon loading with fallback to site initials
- **Smart Grid**: Responsive layout that adapts to your collection (max 12 sites)
- **Persistent Storage**: Sites sync across devices via Chrome sync

### UI/UX Improvements
- **Modern Dialog**: Custom modal for adding/editing sites (replaces browser prompts)
- **Glassmorphism Menus**: Consistent styling across settings and context menus
- **Smooth Animations**: Fade-in effects for tiles, menus, and dialogs
- **Click-Outside-to-Close**: Intuitive dismissal for dialogs and menus
- **Z-Index Management**: Fixed menu overlay issues for proper stacking

### Technical Enhancements
- Moved grain texture outside app container to prevent UI interference
- Improved favicon rendering with proper padding and containment
- Fixed event listener cleanup to prevent dialog reopening issues
- Enhanced color contrast system for tile backgrounds based on theme luminance

## Installation

1. Clone this repository or download the source code:
   ```bash
   git clone https://github.com/bhautik-2004/QuietTab.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `QuietTab` folder from this repository.
6. Open a new tab to see it in action!

## Customization

- Click the **Settings** gear icon (bottom right) to toggle Context Awareness or change font preferences.
- The extension adapts to your browsing habits locally to show "General", "Coding", or "Design" quotes.

## Smart Context Features

The extension automatically detects your focus area (Coding, Creative, Productivity, etc.) by analyzing your interactions with major AI platforms.

**Supported Platforms:**
- **ChatGPT** (chatgpt.com)
- **Claude** (claude.ai)
- **Google Gemini** (gemini.google.com)

**Requirements for Context Mode:**
1. You must be **logged in** and actively using one of the supported platforms in a tab.
2. The extension relies on local page analysis, so the AI tab must be **open**.
3. **Troubleshooting**: If the quote context doesn't update, try **refreshing the AI web page** to re-initialize the detection script.

## Development

- Built with vanilla HTML/CSS/JS (Manifest V3).
- Uses local JSON storage for quotes (`data/quotes.json`).

## Dataset & Acknowledgements

The quotes collection is sourced from this [Kaggle Dataset](https://www.kaggle.com/datasets/akmittal/quotes-dataset?resource=download).

> **Note**: This dataset is used in its raw form and has not been manually refined. It may contain quotes with varying language quality or attribution details.
