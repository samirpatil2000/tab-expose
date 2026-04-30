# Mosaic

<p align="center">
  <img src="public/mosaic-logo.svg" alt="Mosaic Logo" width="128" />
</p>

A fast, keyboard-driven tab overview for your browser. Find, manage, and switch between open tabs with an Exposé-style grid of live thumbnails.

## ✨ Features

- **Tab-Based Overview:** Opens as a regular browser tab (not a popup) and auto-closes when you navigate away, switch tabs, or Alt+Tab out.
- **Live Thumbnails:** Full-resolution preview thumbnails captured automatically — no downscaling, no blur.
- **Lightning-Fast Search:** Fuzzy search by title or URL. Just start typing anywhere — the search bar focuses instantly, no Ctrl+F needed.
- **Keyboard-First Navigation:** Arrow keys to move, Enter to switch, Escape to close. Delete to close a tab, Insert to open a new one, Home/End to jump to first/last, PageUp/PageDown to shift left/right.
- **Content-Driven Adaptive Grid:** Layout scales based on tab count — cards grow to fill available space while maintaining aspect ratio, mathematically guaranteed to never overflow.
- **Sliding Window:** Up to 18 tabs visible at once (3×6). The window slides to stay centered on the selected tab, with a position indicator for large tab counts.
- **Smart Auto-Focus:** Highlights your currently active tab the moment you open the overview.
- **Tab Management:** Close tabs directly from the overview. Single click to open — no double-click needed.
- **Unified Selection Model:** Mouse hover and keyboard navigation share the same selection state. One model, two input methods.
- **In-Memory Thumbnail Cache:** `Map` layer above IndexedDB with batch prefetch for zero-flash initial render.
- **Modern UI/UX:** React 19, Tailwind CSS, Framer Motion. Subtle visual treatment — selected card gets a white border, brightness lift, and shadow; unselected thumbnails desaturate gently.

## 🖼️ Screenshots And Demo

<img width="1438" height="893" alt="Image" src="https://github.com/user-attachments/assets/91004dae-acfd-49ce-9a6b-53d66d1a2834" />

___

https://github.com/user-attachments/assets/08a8f47d-d7fe-4076-a6d6-1242ffcd1721

## ⌨️ Shortcuts

| Action | Shortcut |
|---|---|
| Open Overview | `Alt+Q` (Windows/Linux) · `Ctrl+Q` (Mac) |
| Navigate Grid | Arrow Keys (`↑` `↓` `←` `→`) |
| Switch to Tab | `Enter` or single-click |
| Close Tab | `Delete`, or hover + click `X` |
| New Tab (after current) | `Insert` |
| First / Last Tab | `Home` / `End` |
| Move Left / Right | `PageUp` / `PageDown` |
| Search | Start typing anywhere |
| Dismiss | `Escape`, or press the open shortcut again |

> [!TIP]
> You can customize all shortcuts — including the one for opening the overview — at `chrome://extensions/shortcuts`, or by clicking the redirect icon inside the Mosaic window.

## 🚀 Installation & Development

### Prerequisites

- [Node.js](https://nodejs.org/)
- npm

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

4. **Load into Chrome / Edge / Brave:**
   - Navigate to `chrome://extensions/`
   - Enable **Developer mode** (top right toggle)
   - Click **Load unpacked** (top left)
   - Select the `dist` folder

### Packaging for Distribution

Build and zip in one step:
```bash
sh build_and_pack.sh
```
Produces `mosaic-extension.zip` ready to share or sideload.

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS 4 + Lucide React icons
- **Animations:** Framer Motion
- **Search:** Fuse.js
- **Thumbnail Storage:** idb-keyval (IndexedDB) with in-memory cache layer
- **Utilities:** clsx, tailwind-merge

## 🤝 Contributing

Contributions, issues, and feature requests are welcome. Open an issue or submit a pull request.

## 🔒 Privacy Policy

All processing and thumbnail generation happens locally. No browsing data is collected, transmitted, or sold.

Read the full [Privacy Policy](PRIVACY.md).

## 📝 License

Open-source under the [MIT License](LICENSE).
