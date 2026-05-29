# DebateFiles

A web-based document editor built for competitive debaters. Cut cards, organize research, manage speech documents, and access everything from any device — all in one place.

---

## What It Does

DebateFiles is a Google Docs-style editor specialized for debate research. The core workflow is **card cutting**: paste raw evidence, then use keyboard shortcuts to bold authors/dates, underline key passages, highlight impact lines, and shrink surrounding text — the same process competitive debaters use in tools like the Verbatim Word add-in, but in a modern browser app.

---

## Features

### Editor
- **Rich text editing** with a `contentEditable` single-document interface
- **Tabbed toolbar** with three panels: Style & Colors, Headings & Tags, Actions
- **Card-cutting shortcuts** — F1–F10 defaults map one-to-one with the most common formatting actions:

  | Key | Action |
  |-----|--------|
  | F1 | Bold |
  | F2 | Underline |
  | F3 | Highlight |
  | F4 | Bold + Underline |
  | F5 | Bold + Underline + Highlight |
  | F7 | Tag text |
  | F8 | Heading 1 |
  | F9 | Heading 2 |
  | F10 | Heading 3 |

- **Shrink Uncut** — automatically shrinks non-formatted (uncut) text in a paragraph to 10px
- **Clear Formatting** — strips all inline styles from selected text
- **Condense** — collapses selected text
- **Invisibility Mode** — hides all text except highlighted spans (for flowing rounds)
- **Plain-text paste** — strips formatting on paste by default
- **Document Outline** — collapsible sidebar showing H1/H2/H3 headings with click-to-jump
- **Word count bar** — live word count, estimated spreading time (300 wpm), and normal speaking time (180 wpm)
- **Send to Speech** — pushes a paragraph to the active speech document

### Keyboard Shortcuts
- **Fully customizable** — every action has a rebindable shortcut
- **Record mode** — click a shortcut and press your desired key combination to capture it
- **Manual mode** — type a shortcut string directly (e.g. `Cmd+Shift+H`)
- **Validation** — errors shown for reserved browser keys (F6, F11, F12) or invalid formats
- **Platform-aware** — displays `Cmd` on Mac, `Ctrl` on Windows/Linux
- **Capture-phase interception** — app shortcuts override browser defaults (e.g. F3 overrides browser Find, F5 overrides refresh)

### File Organization
- **Files and folders** with drag-and-drop nesting and reordering
- **Right-click context menu** on files: Move to Folder, Export as PDF, Export as JSON
- **Collapsible folders** (▼ / ▶)
- **File search** — searches both file names and document content in real time
- **Import** — load a previously exported JSON file

### Speech Documents
- **Split-screen view** — open a working document and speech document side by side
- **Adjustable split ratio** — drag the divider to resize panes
- **Tabs ribbon** — open tabs for all active documents, closeable, with active state

### Drive Page (`/drive`)
- Google Drive-style file browser
- Folder navigation with breadcrumb trail
- Grid and list view toggle
- Search across all files and speech documents
- Click any file to open it directly in the editor

### Settings
- **Theme selector** — Dark, Midnight, Slate, Forest, Light, Sepia, Debate Classic
- **Heading color palettes** — Theme Default, Vibrant Purple, Warm Amber, Ocean Blue, Forest Green
- **New Document Template** — set default font, size, style, alignment, and color for default text, tags, H1, H2, H3
- **Keyboard shortcuts table** — edit all bindings in one place

### Authentication & Sync
- **Google Sign-In** via Firebase Authentication
- **Firestore sync** — all files and settings saved to the cloud per user account
- **localStorage cache** — instant load on revisit; Firestore syncs in background
- **Offline/Mock mode** — app fully works without Firebase configured (local-only)
- **Sync status indicator** — shows "Saved to cloud ☁" or local fallback state

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Routing | React Router v6 |
| Auth | Firebase Authentication (Google OAuth) |
| Database | Firebase Firestore |
| Styling | CSS Variables + custom themes |
| Deployment | Vercel |

---

## Local Development

### Prerequisites
- Node.js 18+
- A Firebase project with Authentication and Firestore enabled

### Setup

```bash
git clone https://github.com/Dheej11/DebateFiles
cd DebateFiles
npm install
```

Create a `.env.local` file in the project root:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Start the dev server:

```bash
npm run dev
```

> **Note:** If no Firebase credentials are provided the app runs in Offline/Mock Mode — all data is saved to `localStorage` only.

### Build

```bash
npm run build
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Connect the repo to Vercel
3. Add the `VITE_FIREBASE_*` environment variables in the Vercel dashboard
4. Deploy — the included `vercel.json` handles SPA routing automatically

---

## Firebase Setup

1. **Authentication** — enable Google as a sign-in provider
2. **Authorized domains** — add your Vercel deployment URL in Firebase Console → Authentication → Settings → Authorized domains
3. **OAuth credentials** — add your domain to Authorized JavaScript origins and redirect URIs in Google Cloud Console → APIs & Services → Credentials

---

## Branches

| Branch | Description |
|--------|-------------|
| `main` | Production branch, deployed to Vercel |
| `misc/dhruv` | Active development branch with latest editor improvements |

---

## Keyboard Shortcut Notes

- **F1–F10** are the recommended shortcut keys for card cutting — they allow one-hand operation while scrolling with the other
- **Mac users:** F-keys default to system functions (brightness, volume). Either hold `Fn` while pressing the key, or enable "Use F1, F2, etc. as standard function keys" in System Settings → Keyboard
- **F6, F11, F12** cannot be used — they are reserved by the browser at a system level
- All shortcuts are fully customizable in Settings → Keyboard Shortcuts
