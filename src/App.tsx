import {
  type ChangeEventHandler,
  type CSSProperties,
  type KeyboardEventHandler,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useNavigate, useLocation } from 'react-router-dom'
import { db } from './firebase'
import { useAuth } from './AuthContext'
import './App.css'

interface DebateDocument {
  id: string
  title: string
  updatedAt: number
  content: string
  folderId: string | null
}

interface DebateFolder {
  id: string
  name: string
  createdAt: number
  parentFolderId: string | null
  order: number
}

type OpenTabType = 'debate' | 'speech'

interface OpenTab {
  id: string
  type: OpenTabType
}

interface SpeechDocument {
  id: string
  title: string
  updatedAt: number
  content: string
  cardRefs: string[]
}

interface AppData {
  debateDocs: DebateDocument[]
  folders: DebateFolder[]
  speechDocs: SpeechDocument[]
  activeDebateDocId: string
  activeSpeechId: string
  openTabs: OpenTab[]
  activeTab: OpenTab | null
  settings: EditorSettings
}

type LeftPanelView = 'files' | 'settings'
type PrimaryView = 'debate' | 'speech'
type FontStylePreset =
  | 'normal'
  | 'bold'
  | 'italic'
  | 'boldItalic'
  | 'underline'
  | 'boldUnderline'
type TextAlignPreset = 'left' | 'center' | 'right'
type ShortcutAction =
  | 'bold'
  | 'underline'
  | 'highlight'
  | 'boldUnderline'
  | 'boldUnderlineHighlight'
  | 'pasteAsDefaultText'
  | 'tagText'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'defaultText'
  | 'condense'
  | 'sendToSpeech'

interface TextStyleSetting {
  fontSize: number
  style: FontStylePreset
  color: string
  align: TextAlignPreset
}

interface EditorSettings {
  theme: string
  defaultFont: string
  textStyles: {
    defaultText: TextStyleSetting
    tag: TextStyleSetting
    heading1: TextStyleSetting
    heading2: TextStyleSetting
    heading3: TextStyleSetting
  }
  defaultHighlightColor: string
  shortcuts: Record<ShortcutAction, string>
}

const appThemes: Array<{ id: string; label: string }> = [
  { id: 'dark',     label: 'Dark'           },
  { id: 'midnight', label: 'Midnight'       },
  { id: 'slate',    label: 'Slate'          },
  { id: 'forest',   label: 'Forest'         },
  { id: 'light',    label: 'Light'          },
  { id: 'sepia',    label: 'Sepia'          },
  { id: 'classic',  label: 'Debate Classic' },
]

const defaultSettings: EditorSettings = {
  theme: 'dark',
  defaultFont: 'Arial',
  textStyles: {
    defaultText: { fontSize: 15, style: 'normal', color: '', align: 'left' },
    tag:      { fontSize: 16, style: 'bold', color: '#111827', align: 'left' },
    heading1: { fontSize: 34, style: 'bold', color: '#111827', align: 'left' },
    heading2: { fontSize: 26, style: 'bold', color: '#111827', align: 'left' },
    heading3: { fontSize: 20, style: 'bold', color: '#111827', align: 'left' },
  },
  defaultHighlightColor: '#fff59d',
  shortcuts: {
    bold: 'Mod+B',
    underline: 'Mod+U',
    highlight: 'Mod+Shift+H',
    boldUnderline: 'Mod+Shift+U',
    boldUnderlineHighlight: 'Mod+Shift+J',
    pasteAsDefaultText: 'Mod+Shift+V',
    tagText: 'Mod+Shift+T',
    heading1: 'Mod+Alt+1',
    heading2: 'Mod+Alt+2',
    heading3: 'Mod+Alt+3',
    defaultText: 'Mod+Alt+0',
    condense: 'Mod+Shift+C',
    sendToSpeech: 'Mod+Shift+S',
  },
}

const fontChoices = [
  'Arial',
  'Times New Roman',
  'Calibri',
  'Cambria',
  'Georgia',
  'Verdana',
  'Trebuchet MS',
]

const styleChoices: Array<{ value: FontStylePreset; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'bold', label: 'Bold' },
  { value: 'italic', label: 'Italic' },
  { value: 'boldItalic', label: 'Bold Italic' },
  { value: 'underline', label: 'Underline' },
  { value: 'boldUnderline', label: 'Bold + Underline' },
]

const headingAlignmentChoices: Array<{ value: TextAlignPreset; label: string }> = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
]

const colorChoices = [
  '#111827',
  '#1f2937',
  '#374151',
  '#6b7280',
  '#1d4ed8',
  '#7c2d12',
  '#166534',
  '#6b21a8',
  '#b91c1c',
]

const textColorOptions: Array<{ label: string; value: string }> = [
  { label: 'Default (Black)', value: '#111827' },
  { label: 'Dark Gray', value: '#374151' },
  { label: 'Gray', value: '#6b7280' },
  { label: 'White', value: '#ffffff' },
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Dark Blue', value: '#1e3a8a' },
  { label: 'Red', value: '#b91c1c' },
  { label: 'Dark Red', value: '#7c2d12' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Dark Green', value: '#166534' },
  { label: 'Purple', value: '#7c3aed' },
  { label: 'Dark Purple', value: '#6b21a8' },
  { label: 'Orange', value: '#ea580c' },
  { label: 'Brown', value: '#92400e' },
]

const highlightColorOptions: Array<{ label: string; value: string }> = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fbcfe8' },
  { label: 'Orange', value: '#fed7aa' },
  { label: 'Purple', value: '#ddd6fe' },
  { label: 'Red', value: '#fecaca' },
  { label: 'Cyan', value: '#a5f3fc' },
  { label: 'None', value: 'transparent' },
]

const styleToCss = (preset: FontStylePreset) => {
  switch (preset) {
    case 'bold':
      return {
        fontWeight: 700,
        fontStyle: 'normal',
        textDecoration: 'none',
      }
    case 'italic':
      return {
        fontWeight: 400,
        fontStyle: 'italic',
        textDecoration: 'none',
      }
    case 'boldItalic':
      return {
        fontWeight: 700,
        fontStyle: 'italic',
        textDecoration: 'none',
      }
    case 'underline':
      return {
        fontWeight: 400,
        fontStyle: 'normal',
        textDecoration: 'underline',
      }
    case 'boldUnderline':
      return {
        fontWeight: 700,
        fontStyle: 'normal',
        textDecoration: 'underline',
      }
    default:
      return {
        fontWeight: 400,
        fontStyle: 'normal',
        textDecoration: 'none',
      }
  }
}


const textStyleGroups: Array<{
  key: keyof EditorSettings['textStyles']
  label: string
}> = [
  { key: 'defaultText', label: 'Default Text' },
  { key: 'tag', label: 'Tag Text' },
  { key: 'heading1', label: 'Heading 1' },
  { key: 'heading2', label: 'Heading 2' },
  { key: 'heading3', label: 'Heading 3' },
]

const headingKeys: Array<keyof EditorSettings['textStyles']> = [
  'heading1',
  'heading2',
  'heading3',
]

const shortcutGroups: Array<{
  key: ShortcutAction
  label: string
}> = [
  { key: 'bold', label: 'Bold' },
  { key: 'underline', label: 'Underline' },
  { key: 'highlight', label: 'Highlight' },
  { key: 'boldUnderline', label: 'Bold + Underline' },
  {
    key: 'boldUnderlineHighlight',
    label: 'Bold + Underline + Highlight',
  },
  { key: 'pasteAsDefaultText', label: 'Paste as Default Text' },
  { key: 'tagText', label: 'Set text to Tag' },
  { key: 'heading1', label: 'Set text to Heading 1' },
  { key: 'heading2', label: 'Set text to Heading 2' },
  { key: 'heading3', label: 'Set text to Heading 3' },
  { key: 'defaultText', label: 'Set text to Default Text' },
  { key: 'condense', label: 'Condense' },
  { key: 'sendToSpeech', label: 'Send to Speech' },
]

interface ParsedShortcut {
  key: string
  mod: boolean
  ctrl: boolean
  meta: boolean
  alt: boolean
  shift: boolean
}

const normalizeKey = (value: string) => {
  const lowered = value.toLowerCase()
  if (lowered === ' ') {
    return 'space'
  }
  if (lowered === 'arrowup') {
    return 'up'
  }
  if (lowered === 'arrowdown') {
    return 'down'
  }
  if (lowered === 'arrowleft') {
    return 'left'
  }
  if (lowered === 'arrowright') {
    return 'right'
  }
  return lowered
}

const parseShortcut = (value: string): ParsedShortcut | null => {
  const tokens = value
    .split('+')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)

  if (!tokens.length) {
    return null
  }

  const parsed: ParsedShortcut = {
    key: '',
    mod: false,
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
  }

  for (const token of tokens) {
    if (token === 'mod') {
      parsed.mod = true
    } else if (token === 'ctrl' || token === 'control') {
      parsed.ctrl = true
    } else if (token === 'cmd' || token === 'meta') {
      parsed.meta = true
    } else if (token === 'alt' || token === 'option') {
      parsed.alt = true
    } else if (token === 'shift') {
      parsed.shift = true
    } else {
      parsed.key = normalizeKey(token)
    }
  }

  return parsed.key ? parsed : null
}

type AnyKeyEvent = { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }

const matchesShortcut = (
  event: AnyKeyEvent,
  shortcut: string,
) => {
  const parsed = parseShortcut(shortcut)
  if (!parsed) {
    return false
  }

  const eventKey = normalizeKey(event.key)
  if (eventKey !== parsed.key) {
    return false
  }

  if (parsed.mod && !(event.metaKey || event.ctrlKey)) {
    return false
  }

  if (!parsed.mod && parsed.ctrl !== event.ctrlKey) {
    return false
  }

  if (!parsed.mod && parsed.meta !== event.metaKey) {
    return false
  }

  if (parsed.alt !== event.altKey) {
    return false
  }

  if (parsed.shift !== event.shiftKey) {
    return false
  }

  return true
}

const defaultData = (): AppData => {
  const debateDoc: DebateDocument = {
    id: crypto.randomUUID(),
    title: 'Starter File',
    updatedAt: Date.now(),
    content: `<h1>Aff Case</h1>
<h2>Advantages</h2>
<h3>Climate Advantage</h3>
<p>Paste evidence here and cut cards directly in this document.</p>`,
    folderId: null,
  }

  return {
    debateDocs: [debateDoc],
    folders: [],
    speechDocs: [],
    activeDebateDocId: debateDoc.id,
    activeSpeechId: '',
    openTabs: [{ id: debateDoc.id, type: 'debate' }],
    activeTab: { id: debateDoc.id, type: 'debate' },
    settings: defaultSettings,
  }
}

const exportJson = (name: string, payload: unknown) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = `${name.replace(/\s+/g, '-').toLowerCase()}.json`
  anchor.click()
  URL.revokeObjectURL(href)
}

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

// Merge raw Firestore/localStorage data with current defaults, filling any missing keys.
function parseAppData(raw: unknown): AppData {
  try {
    const parsed = raw as AppData
    if (!parsed.debateDocs?.length || !parsed.activeDebateDocId) {
      return defaultData()
    }
    return {
      ...parsed,
      folders: (parsed.folders ?? []).map((folder, index) => ({
        ...folder,
        parentFolderId: folder.parentFolderId ?? null,
        order: folder.order ?? index,
      })),
      debateDocs: parsed.debateDocs.map((d) => ({
        ...d,
        folderId: d.folderId ?? null,
      })),
      openTabs:
        parsed.openTabs?.length > 0
          ? parsed.openTabs
          : [{ id: parsed.activeDebateDocId, type: 'debate' }],
      activeTab:
        parsed.activeTab ?? { id: parsed.activeDebateDocId, type: 'debate' },
      settings: {
        ...defaultSettings,
        ...(parsed.settings ?? {}),
        textStyles: {
          ...defaultSettings.textStyles,
          ...(parsed.settings?.textStyles ?? {}),
        },
        shortcuts: {
          ...defaultSettings.shortcuts,
          ...(parsed.settings?.shortcuts ?? {}),
        },
      },
    }
  } catch {
    return defaultData()
  }
}

function App() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [data, setData] = useState<AppData>(defaultData)
  const [dataLoading, setDataLoading] = useState(true)

  const [invisibilityMode, setInvisibilityMode] = useState(false)
  const [status, setStatus] = useState('Ready')
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>('files')
  const [fileSearchQuery, setFileSearchQuery] = useState('')
  const [leftPanelWidth, setLeftPanelWidth] = useState(290)
  const [isResizingLeftPanel, setIsResizingLeftPanel] = useState(false)
  const [primaryView, setPrimaryView] = useState<PrimaryView>('debate')
  const [isSplitView, setIsSplitView] = useState(false)
  const [splitRatio, setSplitRatio] = useState(50)
  const [isResizingSplit, setIsResizingSplit] = useState(false)
  const [activeTextColor, setActiveTextColor] = useState('')
  const [activeTextSize, setActiveTextSize] = useState(15)
  const [activeHighlightColor, setActiveHighlightColor] = useState('#fff59d')
  const [isShortcutsDialogOpen, setIsShortcutsDialogOpen] = useState(false)
  const [draggingDocId, setDraggingDocId] = useState<string | null>(null)
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null)
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null)
  const [folderDropTarget, setFolderDropTarget] = useState<{
    mode: 'inside' | 'before' | 'after'
    folderId: string
  } | null>(null)
  const [collapsedFolderIds, setCollapsedFolderIds] = useState<string[]>([])
  const [activeContextDocId, setActiveContextDocId] = useState<string | null>(null)
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [activeEditorTarget, setActiveEditorTarget] = useState<PrimaryView>('debate')
  const editorRef = useRef<HTMLDivElement | null>(null)
  const speechEditorRef = useRef<HTMLDivElement | null>(null)
  const savedSelectionRef = useRef<Range | null>(null)
  const splitContainerRef = useRef<HTMLDivElement | null>(null)
  const leftResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  )
  const splitResizeStateRef = useRef<{
    startX: number
    startRatio: number
    containerWidth: number
  } | null>(null)

  const activeDebateDoc = useMemo(
    () => data.debateDocs.find((doc) => doc.id === data.activeDebateDocId) ?? null,
    [data.debateDocs, data.activeDebateDocId],
  )

  const activeSpeechDoc = useMemo(
    () => data.speechDocs.find((doc) => doc.id === data.activeSpeechId) ?? null,
    [data.speechDocs, data.activeSpeechId],
  )

  const rootDocs = useMemo(
    () => data.debateDocs.filter((doc) => !doc.folderId),
    [data.debateDocs],
  )

  const docsByFolder = useMemo(() => {
    const map = new Map<string, DebateDocument[]>()
    for (const folder of data.folders) {
      map.set(folder.id, [])
    }
    for (const doc of data.debateDocs) {
      if (doc.folderId && map.has(doc.folderId)) {
        map.get(doc.folderId)?.push(doc)
      }
    }
    return map
  }, [data.debateDocs, data.folders])

  const sortedFolders = useMemo(
    () => [...data.folders].sort((a, b) => a.order - b.order),
    [data.folders],
  )

  const searchResults = useMemo(() => {
    const q = fileSearchQuery.trim().toLowerCase()
    if (!q) return null
    const matchedDocs = data.debateDocs.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q),
    )
    const matchedFolders = data.folders.filter((f) =>
      f.name.toLowerCase().includes(q),
    )
    return { docs: matchedDocs, folders: matchedFolders }
  }, [fileSearchQuery, data.debateDocs, data.folders])

  const localKey = user ? `debatefiles.v1.${user.uid}` : null

  // Load: try Firestore first, fall back to localStorage so data is never lost.
  useEffect(() => {
    if (!user || !localKey) return

    // Show locally-cached data immediately so the app feels instant.
    const cached = localStorage.getItem(localKey)
    if (cached) {
      try { setData(parseAppData(JSON.parse(cached))) } catch { /* ignore */ }
    }

    // Then fetch from Firestore and upgrade if cloud data exists.
    const docRef = doc(db, 'users', user.uid, 'data', 'appData')
    getDoc(docRef)
      .then((snap) => {
        if (snap.exists()) {
          const cloud = parseAppData(snap.data())
          setData(cloud)
          localStorage.setItem(localKey, JSON.stringify(cloud))
        }
        setDataLoading(false)
      })
      .catch(() => {
        // Firestore unavailable (not set up yet) — local cache is the source of truth.
        setDataLoading(false)
        setStatus('Saved locally (cloud not connected)')
      })
  }, [user, localKey])

  // Open a specific doc passed via router state (e.g. from the Drive page).
  useEffect(() => {
    if (dataLoading) return
    const state = location.state as { openDocId?: string; openSpeechDocId?: string } | null
    if (state?.openDocId) {
      setData((prev) => {
        const exists = prev.debateDocs.some((d) => d.id === state.openDocId)
        if (!exists) return prev
        return {
          ...prev,
          activeDebateDocId: state.openDocId!,
          openTabs: prev.openTabs.some((t) => t.id === state.openDocId && t.type === 'debate')
            ? prev.openTabs
            : [...prev.openTabs, { id: state.openDocId!, type: 'debate' }],
          activeTab: { id: state.openDocId!, type: 'debate' },
        }
      })
      // Clear the state so refreshing doesn't re-open it
      navigate('/app', { replace: true, state: null })
    } else if (state?.openSpeechDocId) {
      setData((prev) => {
        const exists = prev.speechDocs.some((d) => d.id === state.openSpeechDocId)
        if (!exists) return prev
        return {
          ...prev,
          activeSpeechId: state.openSpeechDocId!,
          openTabs: prev.openTabs.some((t) => t.id === state.openSpeechDocId && t.type === 'speech')
            ? prev.openTabs
            : [...prev.openTabs, { id: state.openSpeechDocId!, type: 'speech' }],
          activeTab: { id: state.openSpeechDocId!, type: 'speech' },
        }
      })
      navigate('/app', { replace: true, state: null })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataLoading])

  // Save: write to localStorage immediately + Firestore after 1.5 s debounce.
  const saveToFirestore = useCallback(async (payload: AppData) => {
    if (!user) return
    const docRef = doc(db, 'users', user.uid, 'data', 'appData')
    await setDoc(docRef, payload)
    setStatus('Saved to cloud ☁')
  }, [user])

  useEffect(() => {
    if (dataLoading || !localKey) return
    localStorage.setItem(localKey, JSON.stringify(data))
    const timer = setTimeout(() => void saveToFirestore(data), 1500)
    return () => clearTimeout(timer)
  }, [data, dataLoading, localKey, saveToFirestore])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', data.settings.theme ?? 'dark')
  }, [data.settings.theme])

  useEffect(() => {
    if (!editorRef.current || !activeDebateDoc) {
      return
    }

    if (editorRef.current.innerHTML !== activeDebateDoc.content) {
      editorRef.current.innerHTML = activeDebateDoc.content
    }
  }, [activeDebateDoc?.id, activeDebateDoc?.content])

  useEffect(() => {
    if (!speechEditorRef.current || !activeSpeechDoc) {
      return
    }

    if (speechEditorRef.current.innerHTML !== activeSpeechDoc.content) {
      speechEditorRef.current.innerHTML = activeSpeechDoc.content
    }
  }, [activeSpeechDoc?.id, activeSpeechDoc?.content])

  useEffect(() => {
    setActiveTextColor(data.settings.textStyles.defaultText.color)
    setActiveTextSize(data.settings.textStyles.defaultText.fontSize)
    setActiveHighlightColor(data.settings.defaultHighlightColor)
  }, [
    data.settings.defaultHighlightColor,
    data.settings.textStyles.defaultText.color,
    data.settings.textStyles.defaultText.fontSize,
  ])

  useEffect(() => {
    if (!isResizingLeftPanel) {
      return
    }

    const onMouseMove = (event: MouseEvent) => {
      const resizeState = leftResizeStateRef.current
      if (!resizeState) {
        return
      }

      const nextWidth = resizeState.startWidth + (event.clientX - resizeState.startX)
      const clampedWidth = Math.max(220, Math.min(520, nextWidth))
      setLeftPanelWidth(clampedWidth)
    }

    const onMouseUp = () => {
      setIsResizingLeftPanel(false)
      leftResizeStateRef.current = null
    }

    const originalCursor = document.body.style.cursor
    const originalUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      document.body.style.cursor = originalCursor
      document.body.style.userSelect = originalUserSelect
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isResizingLeftPanel])

  useEffect(() => {
    if (!isResizingSplit) {
      return
    }

    const onMouseMove = (event: MouseEvent) => {
      const resizeState = splitResizeStateRef.current
      if (!resizeState) {
        return
      }

      const delta = event.clientX - resizeState.startX
      const deltaPercent = (delta / resizeState.containerWidth) * 100
      const nextRatio = resizeState.startRatio + deltaPercent
      const clampedRatio = Math.max(25, Math.min(75, nextRatio))
      setSplitRatio(clampedRatio)
    }

    const onMouseUp = () => {
      setIsResizingSplit(false)
      splitResizeStateRef.current = null
    }

    const originalCursor = document.body.style.cursor
    const originalUserSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      document.body.style.cursor = originalCursor
      document.body.style.userSelect = originalUserSelect
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [isResizingSplit])

  useEffect(() => {
    const dismissContextMenu = () => {
      setActiveContextDocId(null)
      setContextMenuPosition(null)
    }

    window.addEventListener('click', dismissContextMenu)
    return () => window.removeEventListener('click', dismissContextMenu)
  }, [])

  // Keep a stable ref to runShortcutAction so the capture listener never goes stale.
  const runShortcutActionRef = useRef<((action: ShortcutAction) => void) | null>(null)

  // Capture-phase global listener — fires before any browser shortcut handling.
  // This lets custom shortcuts (e.g. Mod+1) override browser tab-switching, etc.
  useEffect(() => {
    const shortcuts = data.settings.shortcuts
    const onKeyDownCapture = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsShortcutsDialogOpen(false)
        return
      }
      // Only intercept when focus is inside the app (not browser chrome)
      const target = event.target as Element | null
      const insideApp = target && document.getElementById('root')?.contains(target)
      if (!insideApp) return

      for (const group of shortcutGroups) {
        if (matchesShortcut(event, shortcuts[group.key])) {
          event.preventDefault()
          runShortcutActionRef.current?.(group.key)
          break
        }
      }
    }

    // capture: true makes this fire before the browser acts on the key
    window.addEventListener('keydown', onKeyDownCapture, { capture: true })
    return () => window.removeEventListener('keydown', onKeyDownCapture, { capture: true })
  }, [data.settings.shortcuts])

  useEffect(() => {
    const clear = () => clearDragState()
    window.addEventListener('dragend', clear)
    window.addEventListener('drop', clear)
    return () => {
      window.removeEventListener('dragend', clear)
      window.removeEventListener('drop', clear)
    }
  }, [])

  useEffect(() => {
    if (data.activeTab?.type === 'speech') {
      setPrimaryView('speech')
    } else {
      setPrimaryView('debate')
    }
  }, [data.activeTab])

  useEffect(() => {
    const hasOpenSpeechTab = data.openTabs.some((tab) => tab.type === 'speech')
    if (!hasOpenSpeechTab && isSplitView) {
      setIsSplitView(false)
    }
  }, [data.openTabs, isSplitView])

  const mutateActiveDebateDoc = (updater: (doc: DebateDocument) => void) => {
    setData((previous) => {
      const nextDocs = previous.debateDocs.map((doc) => {
        if (doc.id !== previous.activeDebateDocId) {
          return doc
        }

        const draft = structuredClone(doc) as DebateDocument
        updater(draft)
        draft.updatedAt = Date.now()
        return draft
      })

      return { ...previous, debateDocs: nextDocs }
    })
  }

  const mutateSpeechDoc = (speechId: string, updater: (doc: SpeechDocument) => void) => {
    setData((previous) => {
      const next = previous.speechDocs.map((doc) => {
        if (doc.id !== speechId) {
          return doc
        }

        const draft = structuredClone(doc) as SpeechDocument
        updater(draft)
        draft.updatedAt = Date.now()
        return draft
      })

      return { ...previous, speechDocs: next }
    })
  }

  // Builds an inline `style` attribute string for a given template style key.
  const buildTemplateInlineStyle = (key: keyof EditorSettings['textStyles']): string => {
    const ts = data.settings.textStyles[key]
    const css = styleToCss(ts.style)
    const parts = [
      `font-family: ${data.settings.defaultFont}, Arial, sans-serif`,
      `font-size: ${ts.fontSize}px`,
      `font-weight: ${css.fontWeight}`,
      `font-style: ${css.fontStyle}`,
      `text-decoration: ${css.textDecoration}`,
    ]
    if (ts.color) {
      parts.push(`color: ${ts.color}`)
    }
    if ('align' in ts && ts.align) {
      parts.push(`text-align: ${ts.align}`)
    }
    return parts.join('; ')
  }

  const createDebateDoc = () => {
    const inlineStyle = buildTemplateInlineStyle('defaultText')
    const doc: DebateDocument = {
      id: crypto.randomUUID(),
      title: 'Untitled Debate File',
      updatedAt: Date.now(),
      content: `<p style="${inlineStyle}">Start writing...</p>`,
      folderId: null,
    }

    setData((previous) => ({
      ...previous,
      debateDocs: [doc, ...previous.debateDocs],
      activeDebateDocId: doc.id,
      openTabs: previous.openTabs.some((tab) => tab.id === doc.id && tab.type === 'debate')
        ? previous.openTabs
        : [...previous.openTabs, { id: doc.id, type: 'debate' }],
      activeTab: { id: doc.id, type: 'debate' },
    }))
  }

  const createSpeechDoc = () => {
    const speech: SpeechDocument = {
      id: crypto.randomUUID(),
      title: `Speech ${data.speechDocs.length + 1}`,
      updatedAt: Date.now(),
      content: '<h2>Speech Doc</h2>',
      cardRefs: [],
    }

    setData((previous) => ({
      ...previous,
      speechDocs: [speech, ...previous.speechDocs],
      activeSpeechId: speech.id,
      openTabs: previous.openTabs.some((tab) => tab.id === speech.id && tab.type === 'speech')
        ? previous.openTabs
        : [...previous.openTabs, { id: speech.id, type: 'speech' }],
      activeTab: { id: speech.id, type: 'speech' },
    }))
  }

  const createFolder = () => {
    const folderName = window.prompt('Folder name')
    if (!folderName?.trim()) {
      return
    }

    const folder: DebateFolder = {
      id: crypto.randomUUID(),
      name: folderName.trim(),
      createdAt: Date.now(),
      parentFolderId: null,
      order: data.folders.length,
    }

    setData((previous) => ({
      ...previous,
      folders: [...previous.folders, folder],
    }))
  }

  const getActiveEditorElement = () =>
    activeEditorTarget === 'speech' ? speechEditorRef.current : editorRef.current

  const saveCurrentSelection = () => {
    const editor = getActiveEditorElement()
    const selection = window.getSelection()
    if (!editor || !selection || selection.rangeCount === 0) {
      return
    }

    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    if (editor.contains(container)) {
      savedSelectionRef.current = range.cloneRange()
    }
  }

  const applyCommand = (
    command: 'bold' | 'underline' | 'hiliteColor' | 'foreColor',
    value?: string,
  ) => {
    const targetEditor = getActiveEditorElement()
    targetEditor?.focus()
    document.execCommand(command, false, value)
    if (activeEditorTarget === 'speech') {
      onSpeechEditorInput()
    } else {
      onEditorInput()
    }
  }

  const condenseSelection = () => {
    if (!editorRef.current) {
      return
    }

    const source = editorRef.current.innerText
    const condensed = source.replace(/\s+/g, ' ').trim()
    editorRef.current.innerHTML = condensed ? `<p>${condensed}</p>` : ''
    onEditorInput()
  }

  // After execCommand('formatBlock') the caret is inside the new block element.
  // Walk up from the current selection to find it and apply template inline styles.
  const applyTemplateStyleToCurrentBlock = (tag: string, styleKey: keyof EditorSettings['textStyles']) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return
    let node: Node | null = selection.getRangeAt(0).startContainer
    while (node && node.nodeName.toLowerCase() !== tag) {
      node = node.parentElement ?? null
    }
    if (node instanceof HTMLElement) {
      const inlineStyle = buildTemplateInlineStyle(styleKey)
      node.setAttribute('style', inlineStyle)
    }
  }

  const applyTagStyle = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return
    }

    const range = selection.getRangeAt(0)
    const wrapper = document.createElement('span')
    wrapper.className = 'tag-text'
    wrapper.setAttribute('style', buildTemplateInlineStyle('tag'))

    try {
      const content = range.extractContents()
      wrapper.appendChild(content)
      range.insertNode(wrapper)
      selection.removeAllRanges()
      const postRange = document.createRange()
      postRange.selectNodeContents(wrapper)
      selection.addRange(postRange)
      onEditorInput()
    } catch {
      // Ignore invalid partial selections that cannot be wrapped.
    }
  }

  const applyHeading = (level: 1 | 2 | 3) => {
    document.execCommand('formatBlock', false, `h${level}`)
    const key = `heading${level}` as keyof EditorSettings['textStyles']
    applyTemplateStyleToCurrentBlock(`h${level}`, key)
    onEditorInput()
  }

  const applyDefaultTextBlock = () => {
    document.execCommand('formatBlock', false, 'p')
    applyTemplateStyleToCurrentBlock('p', 'defaultText')
    onEditorInput()
  }

  // Core routine: apply an inline style wrapper to a specific Range.
  // Works even when the editor has lost focus (e.g. after the OS color picker closes).
  const applyStyleToRange = (
    range: Range,
    styleUpdater: (span: HTMLSpanElement) => void,
  ): boolean => {
    if (range.collapsed) return false

    const container = range.commonAncestorContainer
    const isInDebate = editorRef.current?.contains(container)
    const isInSpeech = speechEditorRef.current?.contains(container)

    if (!isInDebate && !isInSpeech) return false

    const wrapper = document.createElement('span')
    styleUpdater(wrapper)

    try {
      const content = range.extractContents()
      wrapper.appendChild(content)
      range.insertNode(wrapper)

      // Re-select the wrapped content so the user sees it selected.
      const selection = window.getSelection()
      if (selection) {
        selection.removeAllRanges()
        const postRange = document.createRange()
        postRange.selectNodeContents(wrapper)
        selection.addRange(postRange)
        savedSelectionRef.current = postRange.cloneRange()
      }

      if (isInDebate) onEditorInput()
      else onSpeechEditorInput()

      return true
    } catch {
      return false
    }
  }

  const applyInlineStyleToSelection = (
    styleUpdater: (span: HTMLSpanElement) => void,
    emptySelectionMessage: string,
  ) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setStatus(emptySelectionMessage)
      return false
    }
    const ok = applyStyleToRange(selection.getRangeAt(0), styleUpdater)
    if (!ok) setStatus('Unable to apply style to selected text')
    return ok
  }

  const applyHighlightColorToSelection = (color: string) =>
    applyInlineStyleToSelection(
      (wrapper) => { wrapper.style.backgroundColor = color },
      'Select text to apply highlight',
    )

  // Toggle highlight on the current selection.
  // Detection is done by finding spans with inline background-color that intersect the
  // range, then checking if every text node in the range is covered by one of those spans.
  // Removal clears background-color directly on those spans — never wraps with "transparent"
  // (which would sit inside the colored span and have no visual effect).
  const toggleHighlightOnSelection = (color: string) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setStatus('Select text to toggle highlight')
      return
    }

    const range = selection.getRangeAt(0)
    const container = range.commonAncestorContainer
    const editorEl = editorRef.current?.contains(container)
      ? editorRef.current
      : speechEditorRef.current?.contains(container)
        ? speechEditorRef.current
        : null
    if (!editorEl) return

    // Collect every span with an inline background-color that overlaps the selection.
    const highlightSpans = Array.from(
      editorEl.querySelectorAll<HTMLSpanElement>('span[style]'),
    ).filter(
      (span) =>
        span.style.backgroundColor &&
        span.style.backgroundColor !== 'transparent' &&
        range.intersectsNode(span),
    )

    // Walk every text node in the range. If all are contained inside one of the
    // highlight spans, treat the selection as "all highlighted".
    const walkerRoot =
      container.nodeType === Node.TEXT_NODE
        ? (container.parentElement ?? editorEl)
        : (container as Element)

    const walker = document.createTreeWalker(walkerRoot, NodeFilter.SHOW_TEXT)
    let allCovered = highlightSpans.length > 0
    let hasText = false

    let node = walker.nextNode()
    while (node) {
      if (range.intersectsNode(node) && node.textContent?.trim()) {
        hasText = true
        const coveredBySpan = highlightSpans.some((span) => span.contains(node))
        if (!coveredBySpan) {
          allCovered = false
          break
        }
      }
      node = walker.nextNode()
    }

    if (!hasText) return

    if (allCovered) {
      // Remove: clear background-color directly from the spans.
      for (const span of highlightSpans) {
        span.style.backgroundColor = ''
        if (!span.style.cssText.trim() && !span.className) {
          span.replaceWith(...Array.from(span.childNodes))
        }
      }
      if (editorEl === editorRef.current) onEditorInput()
      else onSpeechEditorInput()
      setStatus('Highlight removed')
    } else {
      applyStyleToRange(range, (wrapper) => {
        wrapper.style.backgroundColor = color
      })
      setStatus('Highlight applied')
    }
  }

  const applyInlineTextSize = (size: number) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setStatus('Select text to apply custom size')
      return
    }

    const range = selection.getRangeAt(0)
    const wrapper = document.createElement('span')
    wrapper.style.fontSize = `${size}px`

    try {
      const content = range.extractContents()
      wrapper.appendChild(content)
      range.insertNode(wrapper)
      selection.removeAllRanges()
      const postRange = document.createRange()
      postRange.selectNodeContents(wrapper)
      selection.addRange(postRange)
      onEditorInput()
      setStatus(`Applied ${size}px text size`)
    } catch {
      setStatus('Unable to apply custom text size here')
    }
  }

  const pasteAsDefaultText = async () => {
    if (!editorRef.current) {
      return
    }

    editorRef.current.focus()

    try {
      const clipboardText = await navigator.clipboard.readText()
      if (!clipboardText) {
        return
      }
      document.execCommand('insertText', false, clipboardText)
      onEditorInput()
      setStatus('Pasted as default text')
    } catch {
      setStatus('Paste blocked by browser permissions')
    }
  }

  const runShortcutAction = (action: ShortcutAction) => {
    switch (action) {
      case 'bold':
        applyCommand('bold')
        break
      case 'underline':
        applyCommand('underline')
        break
      case 'highlight':
        toggleHighlightOnSelection(activeHighlightColor)
        break
      case 'boldUnderline':
        applyCommand('bold')
        applyCommand('underline')
        break
      case 'boldUnderlineHighlight':
        applyCommand('bold')
        applyCommand('underline')
        applyHighlightColorToSelection(activeHighlightColor)
        break
      case 'pasteAsDefaultText':
        void pasteAsDefaultText()
        break
      case 'tagText':
        applyTagStyle()
        break
      case 'heading1':
        applyHeading(1)
        break
      case 'heading2':
        applyHeading(2)
        break
      case 'heading3':
        applyHeading(3)
        break
      case 'defaultText':
        applyDefaultTextBlock()
        break
      case 'condense':
        condenseSelection()
        break
      case 'sendToSpeech':
        sendToSpeech()
        break
      default:
        break
    }
  }

  // Keep the capture-phase listener in sync with the latest runShortcutAction closure.
  runShortcutActionRef.current = runShortcutAction

  const sendToSpeech = () => {
    const sourceEditor =
      activeEditorTarget === 'speech' ? speechEditorRef.current : editorRef.current

    if (!activeSpeechDoc || !sourceEditor) {
      return
    }

    const selection = window.getSelection()
    const hasSelection = selection && selection.rangeCount > 0 && !selection.isCollapsed
    let html = ''

    if (hasSelection && selection) {
      const wrapper = document.createElement('div')
      wrapper.appendChild(selection.getRangeAt(0).cloneContents())
      html = wrapper.innerHTML
    } else {
      html = sourceEditor.innerHTML
    }

    mutateSpeechDoc(activeSpeechDoc.id, (speech) => {
      speech.content += `<section>${html}</section>`
      speech.cardRefs.push(crypto.randomUUID())
    })
    setStatus(`Sent content to ${activeSpeechDoc.title}`)
  }

  const onEditorInput = () => {
    if (!editorRef.current) {
      return
    }
    const nextContent = editorRef.current.innerHTML
    mutateActiveDebateDoc((doc) => {
      doc.content = nextContent
    })
  }

  const onSpeechEditorInput = () => {
    if (!speechEditorRef.current || !activeSpeechDoc) {
      return
    }

    const nextContent = speechEditorRef.current.innerHTML
    mutateSpeechDoc(activeSpeechDoc.id, (doc) => {
      doc.content = nextContent
    })
  }

  const updateSettings = (updater: (settings: EditorSettings) => void) => {
    setData((previous) => {
      const nextSettings = structuredClone(previous.settings) as EditorSettings
      updater(nextSettings)
      return { ...previous, settings: nextSettings }
    })
  }

  const updateTextStyleSetting = (
    key: keyof EditorSettings['textStyles'],
    field: keyof TextStyleSetting,
    value: string | number,
  ) => {
    updateSettings((settings) => {
      settings.textStyles[key][field] = value as never
    })
  }

  const updateShortcutSetting = (action: ShortcutAction, shortcut: string) => {
    updateSettings((settings) => {
      settings.shortcuts[action] = shortcut
    })
  }

  const moveDocToFolder = (docId: string, folderId: string | null) => {
    setData((previous) => ({
      ...previous,
      debateDocs: previous.debateDocs.map((doc) =>
        doc.id === docId ? { ...doc, folderId, updatedAt: Date.now() } : doc,
      ),
    }))
  }

  const isFolderDescendant = (
    folders: DebateFolder[],
    folderId: string,
    potentialAncestorId: string,
  ) => {
    let current = folders.find((folder) => folder.id === folderId) ?? null
    while (current?.parentFolderId) {
      if (current.parentFolderId === potentialAncestorId) {
        return true
      }
      current = folders.find((folder) => folder.id === current?.parentFolderId) ?? null
    }
    return false
  }

  const moveFolderInside = (folderId: string, targetFolderId: string | null) => {
    setData((previous) => {
      if (folderId === targetFolderId) {
        return previous
      }
      if (
        targetFolderId &&
        isFolderDescendant(previous.folders, targetFolderId, folderId)
      ) {
        return previous
      }

      const siblingCount = previous.folders.filter(
        (folder) => folder.parentFolderId === targetFolderId && folder.id !== folderId,
      ).length

      return {
        ...previous,
        folders: previous.folders.map((folder) =>
          folder.id === folderId
            ? {
                ...folder,
                parentFolderId: targetFolderId,
                order: siblingCount,
              }
            : folder,
        ),
      }
    })
  }

  const moveFolderRelative = (
    folderId: string,
    targetFolderId: string,
    position: 'before' | 'after',
  ) => {
    setData((previous) => {
      if (folderId === targetFolderId) {
        return previous
      }

      const target = previous.folders.find((folder) => folder.id === targetFolderId)
      if (!target) {
        return previous
      }

      if (isFolderDescendant(previous.folders, targetFolderId, folderId)) {
        return previous
      }

      const newParentId = target.parentFolderId
      const siblings = previous.folders
        .filter((folder) => folder.parentFolderId === newParentId && folder.id !== folderId)
        .sort((a, b) => a.order - b.order)

      const targetIndex = siblings.findIndex((folder) => folder.id === targetFolderId)
      if (targetIndex === -1) {
        return previous
      }

      const insertIndex = position === 'before' ? targetIndex : targetIndex + 1
      const movingFolder = previous.folders.find((folder) => folder.id === folderId)
      if (!movingFolder) {
        return previous
      }

      const reordered = [...siblings]
      reordered.splice(insertIndex, 0, {
        ...movingFolder,
        parentFolderId: newParentId,
      })

      const nextFolderMap = new Map<string, DebateFolder>()
      for (const folder of previous.folders) {
        nextFolderMap.set(folder.id, folder)
      }
      reordered.forEach((folder, index) => {
        nextFolderMap.set(folder.id, {
          ...folder,
          parentFolderId: newParentId,
          order: index,
        })
      })

      return {
        ...previous,
        folders: Array.from(nextFolderMap.values()),
      }
    })
  }

  const openDebateTab = (docId: string) => {
    setData((previous) => ({
      ...previous,
      activeDebateDocId: docId,
      openTabs: previous.openTabs.some((tab) => tab.id === docId && tab.type === 'debate')
        ? previous.openTabs
        : [...previous.openTabs, { id: docId, type: 'debate' }],
      activeTab: { id: docId, type: 'debate' },
    }))
    setPrimaryView('debate')
  }

  const openSpeechTab = (docId: string) => {
    setData((previous) => ({
      ...previous,
      activeSpeechId: docId,
      openTabs: previous.openTabs.some((tab) => tab.id === docId && tab.type === 'speech')
        ? previous.openTabs
        : [...previous.openTabs, { id: docId, type: 'speech' }],
      activeTab: { id: docId, type: 'speech' },
    }))
    setPrimaryView('speech')
  }

  const closeTab = (tab: OpenTab) => {
    setData((previous) => {
      const nextOpenTabs = previous.openTabs.filter(
        (item) => !(item.id === tab.id && item.type === tab.type),
      )

      let nextActiveTab = previous.activeTab
      if (previous.activeTab?.id === tab.id && previous.activeTab?.type === tab.type) {
        if (tab.type === 'speech') {
          const fallbackDebateTab = [...nextOpenTabs]
            .reverse()
            .find((item) => item.type === 'debate')
          nextActiveTab = fallbackDebateTab ?? null
        } else {
          nextActiveTab = nextOpenTabs.at(-1) ?? null
        }
      }

      let nextActiveDebateId = previous.activeDebateDocId
      let nextActiveSpeechId = previous.activeSpeechId

      if (nextActiveTab?.type === 'debate') {
        nextActiveDebateId = nextActiveTab.id
      } else if (nextActiveTab?.type === 'speech') {
        nextActiveSpeechId = nextActiveTab.id
      }

      return {
        ...previous,
        openTabs: nextOpenTabs,
        activeTab: nextActiveTab,
        activeDebateDocId: nextActiveDebateId,
        activeSpeechId: nextActiveSpeechId,
      }
    })
  }

  const activateTab = (tab: OpenTab) => {
    if (tab.type === 'debate') {
      openDebateTab(tab.id)
    } else {
      openSpeechTab(tab.id)
    }
  }

  const getTabTitle = (tab: OpenTab) => {
    if (tab.type === 'debate') {
      return data.debateDocs.find((doc) => doc.id === tab.id)?.title ?? 'Debate file'
    }
    return data.speechDocs.find((doc) => doc.id === tab.id)?.title ?? 'Speech doc'
  }

  const isDebateDocOpen = (docId: string) =>
    data.openTabs.some((tab) => tab.type === 'debate' && tab.id === docId)

  const isSpeechDocOpen = (docId: string) =>
    data.openTabs.some((tab) => tab.type === 'speech' && tab.id === docId)

  const exportDocById = (docId: string) => {
    const doc = data.debateDocs.find((item) => item.id === docId)
    if (!doc) {
      return
    }
    exportJson(doc.title, doc)
  }

  const exportDocAsPdf = (docId: string) => {
    const doc = data.debateDocs.find((item) => item.id === docId)
    if (!doc) {
      return
    }

    const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
    if (!printWindow) {
      setStatus('Pop-up blocked. Allow pop-ups to export PDF.')
      return
    }

    const escapedTitle = doc.title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    printWindow.document.open()
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${escapedTitle}</title>
          <style>
            body {
              font-family: ${data.settings.defaultFont}, Arial, sans-serif;
              margin: 32px;
              line-height: 1.45;
              color: #111827;
            }
            h1, h2, h3 {
              margin-top: 1.2em;
              margin-bottom: 0.45em;
            }
          </style>
        </head>
        <body>
          <h1>${escapedTitle}</h1>
          <hr />
          ${doc.content}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    setStatus(`Opened PDF export for "${doc.title}"`)
  }

  const onDocContextMenu = (
    event: ReactMouseEvent<HTMLButtonElement>,
    docId: string,
  ) => {
    event.preventDefault()
    setActiveContextDocId(docId)
    setContextMenuPosition({ x: event.clientX, y: event.clientY })
  }

  const onFolderDrop = (folderId: string | null) => {
    if (!draggingDocId) {
      return
    }
    moveDocToFolder(draggingDocId, folderId)
    setDraggingDocId(null)
    setDropTargetFolderId(null)
    setDraggingFolderId(null)
    setFolderDropTarget(null)
  }

  const onFolderStructureDrop = () => {
    if (!draggingFolderId || !folderDropTarget) {
      return
    }

    if (folderDropTarget.mode === 'inside') {
      moveFolderInside(draggingFolderId, folderDropTarget.folderId)
    } else {
      moveFolderRelative(
        draggingFolderId,
        folderDropTarget.folderId,
        folderDropTarget.mode,
      )
    }

    setDraggingFolderId(null)
    setFolderDropTarget(null)
    setDraggingDocId(null)
    setDropTargetFolderId(null)
  }

  const clearDragState = () => {
    setDraggingDocId(null)
    setDropTargetFolderId(null)
    setDraggingFolderId(null)
    setFolderDropTarget(null)
  }

  const toggleFolderCollapsed = (folderId: string) => {
    setCollapsedFolderIds((previous) =>
      previous.includes(folderId)
        ? previous.filter((id) => id !== folderId)
        : [...previous, folderId],
    )
  }

  const onEditorKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    for (const group of shortcutGroups) {
      const shortcut = data.settings.shortcuts[group.key]
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault()
        runShortcutAction(group.key)
        break
      }
    }
  }

  const importDebateDoc: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const text = await file.text()
    try {
      const imported = JSON.parse(text) as DebateDocument
      if (!imported.id || !('content' in imported)) {
        setStatus('Import failed: invalid file format')
        return
      }

      setData((previous) => ({
        ...previous,
        debateDocs: [
          { ...imported, id: crypto.randomUUID(), folderId: null },
          ...previous.debateDocs,
        ],
      }))
      setStatus(`Imported ${file.name}`)
    } catch {
      setStatus('Import failed: could not parse JSON')
    } finally {
      event.target.value = ''
    }
  }

  const startLeftPanelResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    leftResizeStateRef.current = {
      startX: event.clientX,
      startWidth: leftPanelWidth,
    }
    setIsResizingLeftPanel(true)
  }

  const startSplitResize = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!splitContainerRef.current) {
      return
    }

    event.preventDefault()
    splitResizeStateRef.current = {
      startX: event.clientX,
      startRatio: splitRatio,
      containerWidth: splitContainerRef.current.clientWidth || 1,
    }
    setIsResizingSplit(true)
  }

  const shortcutsTable = (
    <table className="shortcuts-table">
      <thead>
        <tr>
          <th>Action</th>
          <th>Shortcut</th>
        </tr>
      </thead>
      <tbody>
        {shortcutGroups.map((shortcut) => (
          <tr key={shortcut.key}>
            <td>{shortcut.label}</td>
            <td>
              <input
                type="text"
                value={data.settings.shortcuts[shortcut.key]}
                onChange={(event) =>
                  updateShortcutSetting(shortcut.key, event.target.value)
                }
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const renderFolderTree = (parentFolderId: string | null, depth = 0): ReactElement[] => {
    const folders = sortedFolders.filter((folder) => folder.parentFolderId === parentFolderId)

    return folders.map((folder) => {
      const folderDocs = docsByFolder.get(folder.id) ?? []
      const isCollapsed = collapsedFolderIds.includes(folder.id)
      const insideActive =
        folderDropTarget?.folderId === folder.id && folderDropTarget.mode === 'inside'
      const beforeActive =
        folderDropTarget?.folderId === folder.id && folderDropTarget.mode === 'before'
      const afterActive =
        folderDropTarget?.folderId === folder.id && folderDropTarget.mode === 'after'

      const childFolders = renderFolderTree(folder.id, depth + 1)

      return (
        <div key={folder.id} className="folder-tree-node" style={{ marginLeft: depth * 14 }}>
          <div
            className={`folder-drop-line ${beforeActive ? 'folder-drop-line-active' : ''}`}
            onDragOver={(event) => {
              if (!draggingFolderId) {
                return
              }
              event.stopPropagation()
              event.preventDefault()
              setFolderDropTarget({ mode: 'before', folderId: folder.id })
            }}
            onDrop={(event) => {
              event.stopPropagation()
              event.preventDefault()
              onFolderStructureDrop()
            }}
          />
          <div
            className={`stack folder-drop-zone ${insideActive ? 'folder-drop-zone-active' : ''}`}
            onDragOver={(event) => {
              event.stopPropagation()
              event.preventDefault()
              if (draggingFolderId) {
                setFolderDropTarget({ mode: 'inside', folderId: folder.id })
              } else {
                setDropTargetFolderId(folder.id)
              }
            }}
            onDrop={(event) => {
              event.stopPropagation()
              event.preventDefault()
              if (draggingFolderId) {
                onFolderStructureDrop()
              } else {
                onFolderDrop(folder.id)
              }
            }}
          >
            <div
              className={`folder-header ${
                beforeActive
                  ? 'folder-header-drop-before'
                  : afterActive
                    ? 'folder-header-drop-after'
                    : ''
              }`}
              draggable
              onDragStart={() => {
                setDraggingFolderId(folder.id)
                setFolderDropTarget(null)
              }}
              onDragEnd={clearDragState}
              onDragOver={(event) => {
                if (!draggingFolderId || draggingFolderId === folder.id) {
                  return
                }
                event.preventDefault()
                event.stopPropagation()

                const rect = (event.currentTarget as HTMLDivElement).getBoundingClientRect()
                const midpoint = rect.top + rect.height / 2
                const mode = event.clientY < midpoint ? 'before' : 'after'
                setFolderDropTarget({ mode, folderId: folder.id })
              }}
              onDrop={(event) => {
                if (!draggingFolderId || draggingFolderId === folder.id) {
                  return
                }
                event.preventDefault()
                event.stopPropagation()
                onFolderStructureDrop()
              }}
            >
              <strong>{folder.name}</strong>
              <button
                type="button"
                className="folder-toggle-button"
                aria-label={isCollapsed ? 'Expand folder' : 'Minimize folder'}
                onClick={() => toggleFolderCollapsed(folder.id)}
              >
                {isCollapsed ? '▶' : '▼'}
              </button>
            </div>
            {!isCollapsed
              ? folderDocs.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    draggable
                    onDragStart={() => setDraggingDocId(doc.id)}
                    onDragEnd={clearDragState}
                    onContextMenu={(event) => onDocContextMenu(event, doc.id)}
                    className={`doc-button ${
                      data.activeTab?.type === 'debate' && data.activeTab.id === doc.id
                        ? 'doc-button-active'
                        : isDebateDocOpen(doc.id)
                          ? 'doc-button-open'
                          : ''
                    }`}
                    onClick={() => openDebateTab(doc.id)}
                  >
                    <span>{doc.title}</span>
                    <small>Updated {formatDate(doc.updatedAt)}</small>
                  </button>
                ))
              : null}
            {!isCollapsed ? childFolders : null}
          </div>
          <div
            className={`folder-drop-line ${afterActive ? 'folder-drop-line-active' : ''}`}
            onDragOver={(event) => {
              if (!draggingFolderId) {
                return
              }
              event.stopPropagation()
              event.preventDefault()
              setFolderDropTarget({ mode: 'after', folderId: folder.id })
            }}
            onDrop={(event) => {
              event.stopPropagation()
              event.preventDefault()
              onFolderStructureDrop()
            }}
          />
        </div>
      )
    })
  }

  const debatePane = activeDebateDoc ? (
    <article className="editor-content">
      <div className="pane-header">
        <strong>Working Document</strong>
        {isSplitView ? (
          <button
            type="button"
            onClick={() => {
              if (activeDebateDoc) {
                openDebateTab(activeDebateDoc.id)
              }
              setPrimaryView('debate')
              setIsSplitView(false)
            }}
          >
            Open
          </button>
        ) : null}
      </div>
      <input
        className="doc-title"
        value={activeDebateDoc.title}
        onFocus={() => setActiveEditorTarget('debate')}
        onChange={(event) =>
          mutateActiveDebateDoc((doc) => {
            doc.title = event.target.value
          })
        }
      />
      <div
        ref={editorRef}
        className={`editor single-editor ${invisibilityMode ? 'invisibility' : ''}`}
        style={{ fontFamily: `${data.settings.defaultFont}, Arial, sans-serif` }}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setActiveEditorTarget('debate')}
        onInput={onEditorInput}
        onKeyDown={onEditorKeyDown}
      />
    </article>
  ) : (
    <p>Select a document to begin editing.</p>
  )

  const speechPane = activeSpeechDoc ? (
    <article className="editor-content">
      <div className="pane-header">
        <strong>Speech Document</strong>
        {isSplitView ? (
          <button
            type="button"
            onClick={() => {
              if (activeSpeechDoc) {
                openSpeechTab(activeSpeechDoc.id)
              }
              setPrimaryView('speech')
              setIsSplitView(false)
            }}
          >
            Open
          </button>
        ) : null}
      </div>
      <input
        className="doc-title"
        value={activeSpeechDoc.title}
        onFocus={() => setActiveEditorTarget('speech')}
        onChange={(event) =>
          mutateSpeechDoc(activeSpeechDoc.id, (doc) => {
            doc.title = event.target.value
          })
        }
      />
      <div
        ref={speechEditorRef}
        className="editor speech-editor"
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setActiveEditorTarget('speech')}
        onInput={onSpeechEditorInput}
      />
    </article>
  ) : (
    <p>Select a speech document.</p>
  )

  if (dataLoading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100svh', background: 'var(--bg)', color: 'var(--text)', fontSize: 14,
      }}>
        Loading your files…
      </div>
    )
  }

  return (
    <main
      className="app-layout"
      style={{ '--left-panel-width': `${leftPanelWidth}px` } as CSSProperties}
    >
      <aside className="panel left-panel">
        <div className="panel-header">
          <button
            type="button"
            className="panel-brand"
            onClick={() => navigate('/')}
            title="Go to home page"
          >
            <img
              src="/debate-files-logo.jpeg"
              alt="DebateFiles logo"
              className="panel-logo"
            />
            <h2>Debate Files</h2>
          </button>
          <div className="panel-header-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Open settings"
              title="Settings"
              onClick={() =>
                setLeftPanelView((previous) =>
                  previous === 'settings' ? 'files' : 'settings',
                )
              }
            >
              ⚙
            </button>
          </div>
        </div>
        {leftPanelView === 'settings' ? (
          <div className="settings-panel">
            <h3>Settings</h3>
            <h4 className="settings-section-title">Appearance</h4>
            <div className="settings-group">
              <label className="settings-row">
                <span>Theme</span>
                <select
                  value={data.settings.theme ?? 'dark'}
                  onChange={(e) =>
                    updateSettings((settings) => {
                      settings.theme = e.target.value
                    })
                  }
                >
                  {appThemes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <h4 className="settings-section-title">New Document Template</h4>
            <p className="settings-section-desc">These settings are applied when creating a new document. They do not affect existing documents.</p>
            <div className="settings-group">
              <label className="settings-row">
                <span>Default text font</span>
                <select
                  value={data.settings.defaultFont}
                  onChange={(event) =>
                    updateSettings((settings) => {
                      settings.defaultFont = event.target.value
                    })
                  }
                >
                  {fontChoices.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
              <label className="settings-row">
                <span>Default highlight color</span>
                <div className="color-row">
                  <input
                    type="color"
                    value={data.settings.defaultHighlightColor}
                    onChange={(event) =>
                      updateSettings((settings) => {
                        settings.defaultHighlightColor = event.target.value
                      })
                    }
                  />
                  <select
                    value={data.settings.defaultHighlightColor}
                    onChange={(event) =>
                      updateSettings((settings) => {
                        settings.defaultHighlightColor = event.target.value
                      })
                    }
                  >
                    {colorChoices.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>
            {textStyleGroups.map((group) => (
              <div key={group.key} className="settings-group">
                <h4>{group.label}</h4>
                <div className="settings-grid">
                  <label className="settings-row">
                    <span>Size</span>
                    <input
                      type="number"
                      min={8}
                      max={96}
                      value={data.settings.textStyles[group.key].fontSize}
                      onChange={(event) =>
                        updateTextStyleSetting(
                          group.key,
                          'fontSize',
                          Number(event.target.value),
                        )
                      }
                    />
                  </label>
                  <label className="settings-row">
                    <span>Style</span>
                    <select
                      value={data.settings.textStyles[group.key].style}
                      onChange={(event) =>
                        updateTextStyleSetting(group.key, 'style', event.target.value)
                      }
                    >
                      {styleChoices.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  {headingKeys.includes(group.key) ? (
                    <label className="settings-row">
                      <span>Alignment</span>
                      <select
                        value={data.settings.textStyles[group.key].align}
                        onChange={(event) =>
                          updateTextStyleSetting(group.key, 'align', event.target.value)
                        }
                      >
                        {headingAlignmentChoices.map((alignment) => (
                          <option key={alignment.value} value={alignment.value}>
                            {alignment.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                  <label className="settings-row">
                    <span>Color</span>
                    <div className="color-row">
                      <input
                        type="color"
                        value={data.settings.textStyles[group.key].color || '#111827'}
                        disabled={!data.settings.textStyles[group.key].color}
                        onChange={(event) =>
                          updateTextStyleSetting(group.key, 'color', event.target.value)
                        }
                      />
                      <select
                        value={data.settings.textStyles[group.key].color}
                        onChange={(event) =>
                          updateTextStyleSetting(group.key, 'color', event.target.value)
                        }
                      >
                        <option value=''>Auto (follows theme)</option>
                        {colorChoices.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </div>
                  </label>
                </div>
              </div>
            ))}
            <h4 className="settings-section-title">Keyboard Shortcuts</h4>
            <div className="settings-group">
              <h4>Keyboard Shortcuts</h4>
              <p className="hint">
                Use format like <code>Mod+Shift+H</code> or <code>Mod+Alt+1</code>.
                Mod = Cmd on Mac, Ctrl on Windows.
              </p>
              {shortcutsTable}
            </div>
            <button type="button" onClick={() => setLeftPanelView('files')}>
              Back to Files
            </button>
            <p className="hint">
              Tag style applies to text wrapped in a span with class <code>tag-text</code>.
            </p>
          </div>
        ) : (
          <>
            <div className="row">
              <button type="button" onClick={createFolder}>
                New Folder
              </button>
              <button type="button" onClick={createDebateDoc}>
                New File
              </button>
              <label className="button-like">
                Import
                <input type="file" accept="application/json" onChange={importDebateDoc} />
              </label>
            </div>
            <button type="button" className="drive-link-btn" onClick={() => navigate('/drive')}>
              Go To Drive 🗂
            </button>
            <div className="file-search-wrap">
              <span className="file-search-icon">🔍</span>
              <input
                className="file-search-input"
                placeholder="Search files…"
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
              />
              {fileSearchQuery && (
                <button
                  type="button"
                  className="file-search-clear"
                  onClick={() => setFileSearchQuery('')}
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {searchResults ? (
              <div className="file-search-results">
                {searchResults.folders.length === 0 && searchResults.docs.length === 0 ? (
                  <p className="file-search-empty">No results for "{fileSearchQuery}"</p>
                ) : (
                  <>
                    {searchResults.folders.length > 0 && (
                      <>
                        <p className="file-search-section-label">FOLDERS</p>
                        {searchResults.folders.map((folder) => (
                          <div key={folder.id} className="file-search-result-row file-search-folder-row">
                            <span className="file-search-result-icon">📁</span>
                            <span className="file-search-result-name">{folder.name}</span>
                          </div>
                        ))}
                      </>
                    )}
                    {searchResults.docs.length > 0 && (
                      <>
                        <p className="file-search-section-label">FILES</p>
                        {searchResults.docs.map((doc) => (
                          <button
                            key={doc.id}
                            type="button"
                            className={`file-search-result-row ${
                              data.activeTab?.type === 'debate' && data.activeTab.id === doc.id
                                ? 'doc-button-active'
                                : isDebateDocOpen(doc.id)
                                  ? 'doc-button-open'
                                  : ''
                            }`}
                            onClick={() => { openDebateTab(doc.id); setFileSearchQuery('') }}
                          >
                            <span className="file-search-result-icon">📄</span>
                            <span className="file-search-result-name">{doc.title}</span>
                            <small className="file-search-result-meta">{formatDate(doc.updatedAt)}</small>
                          </button>
                        ))}
                      </>
                    )}
                  </>
                )}
              </div>
            ) : (
            <>
            <div
              className={`stack folder-drop-zone ${
                dropTargetFolderId === 'root' ? 'folder-drop-zone-active' : ''
              }`}
              onDragOver={(event) => {
                if (!draggingDocId) {
                  return
                }
                event.preventDefault()
                event.stopPropagation()
                setDropTargetFolderId('root')
              }}
              onDrop={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onFolderDrop(null)
              }}
            >
              <strong>Unfiled</strong>
              {rootDocs.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  draggable
                  onDragStart={() => setDraggingDocId(doc.id)}
                  onDragEnd={clearDragState}
                  onContextMenu={(event) => onDocContextMenu(event, doc.id)}
                  className={`doc-button ${
                    data.activeTab?.type === 'debate' && data.activeTab.id === doc.id
                      ? 'doc-button-active'
                      : isDebateDocOpen(doc.id)
                        ? 'doc-button-open'
                        : ''
                  }`}
                  onClick={() => openDebateTab(doc.id)}
                >
                  <span>{doc.title}</span>
                  <small>Updated {formatDate(doc.updatedAt)}</small>
                </button>
              ))}
            </div>
            <div
              className={`files-main-drop-area ${
                draggingFolderId && folderDropTarget?.folderId === '__root__'
                  ? 'files-main-drop-area-active'
                  : ''
              }`}
              onDragOver={(event) => {
                if (!draggingFolderId) {
                  return
                }
                event.preventDefault()
                event.stopPropagation()
                setFolderDropTarget({ mode: 'inside', folderId: '__root__' })
              }}
              onDrop={(event) => {
                event.preventDefault()
                event.stopPropagation()
                if (draggingFolderId) {
                  moveFolderInside(draggingFolderId, null)
                  clearDragState()
                }
              }}
            >
              {renderFolderTree(null)}
            </div>
            <p className="hint">
              Drag files into folders. Drag folders to nest or reorder.
            </p>
            {activeContextDocId && contextMenuPosition ? (
              <div
                className="context-menu"
                style={{
                  top: `${contextMenuPosition.y}px`,
                  left: `${contextMenuPosition.x}px`,
                }}
              >
                <div className="context-menu-section">Move to folder</div>
                <button
                  type="button"
                  onClick={() => {
                    moveDocToFolder(activeContextDocId, null)
                    setActiveContextDocId(null)
                    setContextMenuPosition(null)
                  }}
                >
                  Unfiled
                </button>
                {data.folders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    onClick={() => {
                      moveDocToFolder(activeContextDocId, folder.id)
                      setActiveContextDocId(null)
                      setContextMenuPosition(null)
                    }}
                  >
                    {folder.name}
                  </button>
                ))}
                <div className="context-menu-divider" />
                <div className="context-menu-section">Export File</div>
                <button
                  type="button"
                  onClick={() => {
                    exportDocAsPdf(activeContextDocId)
                    setActiveContextDocId(null)
                    setContextMenuPosition(null)
                  }}
                >
                  Export as PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportDocById(activeContextDocId)
                    setActiveContextDocId(null)
                    setContextMenuPosition(null)
                  }}
                >
                  Export as JSON
                </button>
              </div>
            ) : null}
            </> /* end searchResults else */
            )}
          </>
        )}
        <div
          className={`left-resize-handle ${
            isResizingLeftPanel ? 'left-resize-handle-active' : ''
          }`}
          role="separator"
          aria-label="Resize left menu"
          aria-orientation="vertical"
          onMouseDown={startLeftPanelResize}
        />
      </aside>

      <section className="editor-panel">
        {data.openTabs.length ? (
          <div className="tabs-ribbon">
            {data.openTabs.map((tab) => (
              <div
                key={`${tab.type}:${tab.id}`}
                className={`tab-chip ${
                  data.activeTab?.id === tab.id && data.activeTab?.type === tab.type
                    ? 'tab-chip-active'
                    : ''
                }`}
              >
                <button type="button" onClick={() => activateTab(tab)}>
                  <span className="tab-type">{tab.type === 'debate' ? 'D' : 'S'}</span>{' '}
                  {getTabTitle(tab)}
                </button>
                <button
                  type="button"
                  className="tab-close-button"
                  aria-label="Close tab"
                  onClick={() => closeTab(tab)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <header className="editor-toolbar">
          <div className="row">
            <label className="toolbar-color-control">
              <span>Text Color</span>
              <div className="toolbar-color-select-wrap">
                <span
                  className="toolbar-color-dot"
                  style={{ background: activeTextColor || 'var(--text)' }}
                />
                <select
                  value={activeTextColor}
                  onMouseDown={saveCurrentSelection}
                  onChange={(event) => {
                    const color = event.target.value
                    setActiveTextColor(color)
                    const saved = savedSelectionRef.current
                    if (saved && !saved.collapsed) {
                      applyStyleToRange(saved, (span) => { span.style.color = color })
                    }
                  }}
                >
                  {textColorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label className="toolbar-size-control">
              <span>Text Size</span>
              <select
                value={activeTextSize}
                onMouseDown={saveCurrentSelection}
                onChange={(event) => {
                  const nextSize = Number(event.target.value)
                  setActiveTextSize(nextSize)
                  const saved = savedSelectionRef.current
                  if (saved && !saved.collapsed) {
                    applyStyleToRange(saved, (span) => { span.style.fontSize = `${nextSize}px` })
                  } else {
                    applyInlineTextSize(nextSize)
                  }
                }}
              >
                {[10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 28, 32, 36, 40].map(
                  (size) => (
                    <option key={size} value={size}>
                      {size}px
                    </option>
                  ),
                )}
              </select>
            </label>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyCommand('bold') }}
            >
              Bold
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); applyCommand('underline') }}
            >
              Underline
            </button>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); toggleHighlightOnSelection(activeHighlightColor) }}
            >
              Highlight
            </button>
            <label className="toolbar-color-control">
              <span>Highlight Color</span>
              <div className="toolbar-color-select-wrap">
                <span
                  className="toolbar-color-dot"
                  style={{ background: activeHighlightColor === 'transparent' ? 'repeating-linear-gradient(45deg,#ccc 0,#ccc 3px,#fff 3px,#fff 6px)' : activeHighlightColor }}
                />
                <select
                  value={activeHighlightColor}
                  onMouseDown={saveCurrentSelection}
                  onChange={(event) => {
                    const color = event.target.value
                    setActiveHighlightColor(color)
                    const saved = savedSelectionRef.current
                    if (saved && !saved.collapsed) {
                      applyStyleToRange(saved, (span) => { span.style.backgroundColor = color })
                    }
                  }}
                >
                  {highlightColorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); condenseSelection() }}
            >
              Condense
            </button>
            <button type="button" onClick={() => setIsShortcutsDialogOpen(true)}>
              Keyboard Shortcuts
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSplitView((previous) => {
                  if (!previous) {
                    setSplitRatio(50)
                  }
                  return !previous
                })
                if (!isSplitView) {
                  setPrimaryView('debate')
                }
              }}
            >
              {isSplitView ? 'Close Split' : 'Split View'}
            </button>
            <button type="button" onClick={sendToSpeech}>
              Send to Speech
            </button>
            <button
              type="button"
              onClick={() => setInvisibilityMode((previous) => !previous)}
            >
              {invisibilityMode ? 'Exit Invisibility' : 'Invisibility Mode'}
            </button>
          </div>
        </header>
        {data.activeTab === null ? (
          <div className="empty-workspace">
            <div className="debatefiles-icon">📁</div>
            <p>DebateFiles</p>
          </div>
        ) : isSplitView ? (
          <div ref={splitContainerRef} className="split-editor-layout">
            <div className="split-pane" style={{ width: `${splitRatio}%` }}>
              {debatePane}
            </div>
            <div
              className={`split-resize-handle ${
                isResizingSplit ? 'split-resize-handle-active' : ''
              }`}
              role="separator"
              aria-label="Resize split view"
              aria-orientation="vertical"
              onMouseDown={startSplitResize}
            />
            <div className="split-pane" style={{ width: `${100 - splitRatio}%` }}>
              {speechPane}
            </div>
          </div>
        ) : data.activeTab?.type === 'speech' || primaryView === 'speech' ? (
          speechPane
        ) : (
          debatePane
        )}
      </section>

      <aside className="panel">
        {user && (
          <div className="user-bar">
            {user.photoURL && (
              <img src={user.photoURL} alt={user.displayName ?? 'User'} className="user-avatar" referrerPolicy="no-referrer" />
            )}
            <span className="user-name" title={user.email ?? ''}>
              {user.displayName ?? user.email}
            </span>
            <button
              type="button"
              className="user-signout"
              title="Sign out"
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        )}
        <div className={`sync-status ${status.includes('cloud ☁') ? 'sync-status-cloud' : status.includes('locally') ? 'sync-status-local' : 'sync-status-idle'}`}>
          <span className="sync-status-dot" />
          <span className="sync-status-text">{status}</span>
        </div>
        <h2>Speech Docs</h2>
        <div className="row">
          <button type="button" onClick={createSpeechDoc}>
            New Speech
          </button>
          <button
            type="button"
            onClick={() =>
              activeDebateDoc && exportJson(activeDebateDoc.title, activeDebateDoc)
            }
            disabled={!activeDebateDoc}
          >
            Export File
          </button>
        </div>
        <div className="stack">
          {data.speechDocs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              className={`doc-button ${
                data.activeTab?.type === 'speech' && data.activeTab.id === doc.id
                  ? 'doc-button-active'
                  : isSpeechDocOpen(doc.id)
                    ? 'doc-button-open'
                    : ''
              }`}
              onClick={() => {
                // Determine which debate doc should anchor the split.
                // Prefer whichever debate tab is currently active; fall back to
                // the most recently opened debate tab in openTabs.
                const currentDebateId =
                  data.activeTab?.type === 'debate'
                    ? data.activeTab.id
                    : [...data.openTabs].reverse().find((t) => t.type === 'debate')?.id ?? null

                if (currentDebateId && currentDebateId !== data.activeDebateDocId) {
                  setData((prev) => ({ ...prev, activeDebateDocId: currentDebateId }))
                }

                openSpeechTab(doc.id)

                const hasOpenDebateTab = data.openTabs.some((tab) => tab.type === 'debate')
                if (hasOpenDebateTab) {
                  setIsSplitView(true)
                  setSplitRatio(50)
                } else {
                  setIsSplitView(false)
                  setPrimaryView('speech')
                }
              }}
              onDoubleClick={() => closeTab({ id: doc.id, type: 'speech' })}
            >
              <span>{doc.title}</span>
              <small>
                {doc.cardRefs.length} cards · {formatDate(doc.updatedAt)}
              </small>
            </button>
          ))}
        </div>
      </aside>
      {isShortcutsDialogOpen ? (
        <div
          className="shortcuts-dialog-backdrop"
          onClick={() => setIsShortcutsDialogOpen(false)}
        >
          <div className="shortcuts-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="shortcuts-dialog-header">
              <h3>Keyboard Shortcuts</h3>
              <button type="button" onClick={() => setIsShortcutsDialogOpen(false)}>
                Close
              </button>
            </div>
            <p className="hint">
              Changes here are shared with Settings. Press <code>Esc</code> to close.
            </p>
            {shortcutsTable}
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default App
