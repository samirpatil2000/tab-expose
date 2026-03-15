# Mosaic

<p align="center">
  <img src="public/mosaic-logo.svg" alt="Mosaic Logo" width="128" />
</p>

A fast, keyboard-driven tab overview interface for your browser. Find, manage, and switch between your open tabs with an elegant, Exposé-style grid featuring visual thumbnails.

## ✨ Features

- **Visual Overview:** Instantly see all your open tabs across all browser windows in a clean, responsive grid layout.
- **Live Thumbnails:** Get immediate visual context with automatically captured preview thumbnails of pages.
- **Lightning-Fast Search:** Use fuzzy search to instantly filter tabs by title or URL. Just start typing!
- **Keyboard-First Navigation:** Fully controllable via keyboard. Navigate the grid with arrow keys, hit `Enter` to switch, or `Escape` to close.
- **Smart Auto-Focus:** Automatically centers and highlights your currently active tab the moment you open the overview.
- **Tab Management:** Close unwanted tabs directly from the interface without losing your place.
- **Modern UI/UX:** Built with React, Tailwind CSS, and Framer Motion for a sleek, responsive, and native-feeling experience.

## ⌨️ Shortcuts

- **Summon & Dismiss:** `Command+Shift+Y` (Mac) / `Ctrl+Shift+Y` (Windows/Linux). *Press once to reveal your digital workspace. Press again to seamlessly glide back to your active tab.*
- **Navigate Grid:** Arrow Keys (`↑`, `↓`, `←`, `→`)
- **Switch to Tab:** `Enter` or single-click an already highlighted card.
- **Close Tab:** Mouse hover + click the `X` button
- **Global Search:** Begin typing anywhere to instantly focus the search bar

> [!TIP]
> You can manually customize or fix these shortcuts by navigating to `chrome://extensions/shortcuts` in your browser.

## 🚀 Installation & Development

Mosaic is built as a highly optimized Vite extension project using React and TypeScript.

### Prerequisites

- [Node.js](https://nodejs.org/) installed
- npm or yarn

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/samirpatil2000/mosaic.git
   cd mosaic
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```

4. **Load into Google Chrome / Edge / Brave:**
   - Open your browser and navigate to `chrome://extensions/`
   - Enable **Developer mode** using the toggle in the top right corner.
   - Click **Load unpacked** in the top left.
   - Select the `dist` folder located in the project directory.

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + Lucide React icons
- **Animations:** Framer Motion
- **Search Engine:** Fuse.js
- **Performance:** `react-window` for virtualized grid rendering (handles hundreds of tabs smoothly)

## 🤝 Contributing

Contributions, issues, and feature requests are always welcome! Whether it's a bug report or a new feature idea, feel free to open an issue or submit a pull request.

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
