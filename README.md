# Quiet Quotes

A minimalist, aesthetically pleasing Chrome New Tab extension that serves daily inspiration alongside a clean clock.

## Features

- **Minimalist Design**: Clean typography, fluid layouts, and a soothing multiverse gradient background.
- **Dynamic Themes**: Backgrounds shift subtly; text adapts for readability.
- **Context Awareness**: (Optional) Smartly detects if you're browsing coding or creative sites to serve relevant quotes.
- **Privacy Focused**: All preferences are stored locally or synced via your Chrome profile. No external tracking.
- **Time Display**: Elegant 12-hour clock centered at the top.

## Installation

1. Clone this repository or download the source code:
   ```bash
   git clone https://github.com/YOUR_USERNAME/quiet-quotes-extension.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `quiet-quotes-extension` folder from this repository.
6. Open a new tab to see it in action!

## Customization

- Click the **Settings** gear icon (bottom right) to toggle Context Awareness or change font preferences.
- The extension adapts to your browsing habits locally to show "General", "Coding", or "Design" quotes.

## Development

- Built with vanilla HTML/CSS/JS (Manifest V3).
- Uses local JSON storage for quotes (`data/quotes.json`).
