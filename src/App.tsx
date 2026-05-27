import {
  type ChangeEventHandler,
  type CSSProperties,
  type KeyboardEvent,
  type KeyboardEventHandler,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
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

const STORAGE_KEY = 'debatefiles.v1'
const defaultSettings: EditorSettings = {
  defaultFont: 'Arial',
  textStyles: {
    defaultText: { fontSize: 15, style: 'normal', color: '#111827', align: 'left' },
    tag: { fontSize: 16, style: 'bold', color: '#6b21a8', align: 'left' },
    heading1: { fontSize: 34, style: 'bold', color: '#0f172a', align: 'left' },
    heading2: { fontSize: 26, style: 'bold', color: '#1f2937', align: 'left' },
    heading3: { fontSize: 20, style: 'bold', color: '#374151', align: 'left' },
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

const matchesShortcut = (
  event: KeyboardEvent<HTMLDivElement>,
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

  const speechDoc: SpeechDocument = {
    id: crypto.randomUUID(),
    title: '1AC Speech',
    updatedAt: Date.now(),
    content: '<h2>1AC</h2><p>Send cards here with Cmd/Ctrl + Shift + S.</p>',
    cardRefs: [],
  }

  return {
    debateDocs: [debateDoc],
    folders: [],
    speechDocs: [speechDoc],
    activeDebateDocId: debateDoc.id,
    activeSpeechId: speechDoc.id,
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

function App() {
  const [data, setData] = useState<AppData>(() => {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return defaultData()
    }

    try {
      const parsed = JSON.parse(raw) as AppData
      if (
        !parsed.debateDocs?.length ||
        !parsed.speechDocs?.length ||
        !parsed.activeDebateDocId
      ) {
        return defaultData()
      }
      return {
        ...parsed,
        folders: (parsed.folders ?? []).map((folder, index) => ({
          ...folder,
          parentFolderId: folder.parentFolderId ?? null,
          order: folder.order ?? index,
        })),
        debateDocs: parsed.debateDocs.map((doc) => ({
          ...doc,
          folderId: doc.folderId ?? null,
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
  })

  const [invisibilityMode, setInvisibilityMode] = useState(false)
  const [status, setStatus] = useState('Ready')
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>('files')
  const [leftPanelWidth, setLeftPanelWidth] = useState(290)
  const [isResizingLeftPanel, setIsResizingLeftPanel] = useState(false)
  const [primaryView, setPrimaryView] = useState<PrimaryView>('debate')
  const [isSplitView, setIsSplitView] = useState(false)
  const [splitRatio, setSplitRatio] = useState(50)
  const [isResizingSplit, setIsResizingSplit] = useState(false)
  const [activeTextColor, setActiveTextColor] = useState('#111827')
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    setStatus('Saved locally')
  }, [data])

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

  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsShortcutsDialogOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

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

  const createDebateDoc = () => {
    const doc: DebateDocument = {
      id: crypto.randomUUID(),
      title: 'Untitled Debate File',
      updatedAt: Date.now(),
      content: '<p>Start writing...</p>',
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

  const applyCommand = (
    command: 'bold' | 'underline' | 'hiliteColor' | 'foreColor',
    value?: string,
  ) => {
    editorRef.current?.focus()
    document.execCommand(command, false, value)
    onEditorInput()
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

  const applyTagStyle = () => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return
    }

    const range = selection.getRangeAt(0)
    const wrapper = document.createElement('span')
    wrapper.className = 'tag-text'

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
    onEditorInput()
  }

  const applyDefaultTextBlock = () => {
    document.execCommand('formatBlock', false, 'p')
    onEditorInput()
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
        applyCommand('hiliteColor', activeHighlightColor)
        break
      case 'boldUnderline':
        applyCommand('bold')
        applyCommand('underline')
        break
      case 'boldUnderlineHighlight':
        applyCommand('bold')
        applyCommand('underline')
        applyCommand('hiliteColor', activeHighlightColor)
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
      <style>
        {`
          .single-editor {
            font-family: ${data.settings.defaultFont};
          }

          .single-editor,
          .single-editor p,
          .single-editor div,
          .single-editor li {
            font-size: ${data.settings.textStyles.defaultText.fontSize}px;
            font-weight: ${styleToCss(data.settings.textStyles.defaultText.style).fontWeight};
            font-style: ${styleToCss(data.settings.textStyles.defaultText.style).fontStyle};
            text-decoration: ${styleToCss(data.settings.textStyles.defaultText.style).textDecoration};
            color: ${data.settings.textStyles.defaultText.color};
          }

          .single-editor h1 {
            font-size: ${data.settings.textStyles.heading1.fontSize}px;
            font-weight: ${styleToCss(data.settings.textStyles.heading1.style).fontWeight};
            font-style: ${styleToCss(data.settings.textStyles.heading1.style).fontStyle};
            text-decoration: ${styleToCss(data.settings.textStyles.heading1.style).textDecoration};
            color: ${data.settings.textStyles.heading1.color};
            text-align: ${data.settings.textStyles.heading1.align};
          }

          .single-editor h2 {
            font-size: ${data.settings.textStyles.heading2.fontSize}px;
            font-weight: ${styleToCss(data.settings.textStyles.heading2.style).fontWeight};
            font-style: ${styleToCss(data.settings.textStyles.heading2.style).fontStyle};
            text-decoration: ${styleToCss(data.settings.textStyles.heading2.style).textDecoration};
            color: ${data.settings.textStyles.heading2.color};
            text-align: ${data.settings.textStyles.heading2.align};
          }

          .single-editor h3 {
            font-size: ${data.settings.textStyles.heading3.fontSize}px;
            font-weight: ${styleToCss(data.settings.textStyles.heading3.style).fontWeight};
            font-style: ${styleToCss(data.settings.textStyles.heading3.style).fontStyle};
            text-decoration: ${styleToCss(data.settings.textStyles.heading3.style).textDecoration};
            color: ${data.settings.textStyles.heading3.color};
            text-align: ${data.settings.textStyles.heading3.align};
          }

          .single-editor .tag-text {
            font-size: ${data.settings.textStyles.tag.fontSize}px;
            font-weight: ${styleToCss(data.settings.textStyles.tag.style).fontWeight};
            font-style: ${styleToCss(data.settings.textStyles.tag.style).fontStyle};
            text-decoration: ${styleToCss(data.settings.textStyles.tag.style).textDecoration};
            color: ${data.settings.textStyles.tag.color};
          }
        `}
      </style>
      <div
        ref={editorRef}
        className={`editor single-editor ${invisibilityMode ? 'invisibility' : ''}`}
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

  return (
    <main
      className="app-layout"
      style={{ '--left-panel-width': `${leftPanelWidth}px` } as CSSProperties}
    >
      <aside className="panel left-panel">
        <div className="panel-header">
          <h2>Debate Files</h2>
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
        {leftPanelView === 'settings' ? (
          <div className="settings-panel">
            <h3>Settings</h3>
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
                        value={data.settings.textStyles[group.key].color}
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
            <label className="toolbar-color-control toolbar-color-control-primary">
              <span>Text Color</span>
              <input
                type="color"
                value={activeTextColor}
                onChange={(event) => {
                  setActiveTextColor(event.target.value)
                  applyCommand('foreColor', event.target.value)
                }}
              />
            </label>
            <label className="toolbar-size-control">
              <span>Text Size</span>
              <select
                value={activeTextSize}
                onChange={(event) => {
                  const nextSize = Number(event.target.value)
                  setActiveTextSize(nextSize)
                  applyInlineTextSize(nextSize)
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
            <button type="button" onClick={() => applyCommand('bold')}>
              Bold
            </button>
            <button type="button" onClick={() => applyCommand('underline')}>
              Underline
            </button>
            <button
              type="button"
              onClick={() => applyCommand('hiliteColor', activeHighlightColor)}
            >
              Highlight
            </button>
            <label className="toolbar-color-swatch" title="Highlight color">
              <span className="sr-only">Highlight color</span>
              <input
                type="color"
                value={activeHighlightColor}
                onChange={(event) => setActiveHighlightColor(event.target.value)}
              />
            </label>
            <button type="button" onClick={condenseSelection}>
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
        <style>
          {`
            .single-editor {
              font-family: ${data.settings.defaultFont};
            }

            .single-editor,
            .single-editor p,
            .single-editor div,
            .single-editor li {
              font-size: ${data.settings.textStyles.defaultText.fontSize}px;
              font-weight: ${styleToCss(data.settings.textStyles.defaultText.style).fontWeight};
              font-style: ${styleToCss(data.settings.textStyles.defaultText.style).fontStyle};
              text-decoration: ${styleToCss(data.settings.textStyles.defaultText.style).textDecoration};
              color: ${data.settings.textStyles.defaultText.color};
            }

            .single-editor h1 {
              font-size: ${data.settings.textStyles.heading1.fontSize}px;
              font-weight: ${styleToCss(data.settings.textStyles.heading1.style).fontWeight};
              font-style: ${styleToCss(data.settings.textStyles.heading1.style).fontStyle};
              text-decoration: ${styleToCss(data.settings.textStyles.heading1.style).textDecoration};
              color: ${data.settings.textStyles.heading1.color};
              text-align: ${data.settings.textStyles.heading1.align};
            }

            .single-editor h2 {
              font-size: ${data.settings.textStyles.heading2.fontSize}px;
              font-weight: ${styleToCss(data.settings.textStyles.heading2.style).fontWeight};
              font-style: ${styleToCss(data.settings.textStyles.heading2.style).fontStyle};
              text-decoration: ${styleToCss(data.settings.textStyles.heading2.style).textDecoration};
              color: ${data.settings.textStyles.heading2.color};
              text-align: ${data.settings.textStyles.heading2.align};
            }

            .single-editor h3 {
              font-size: ${data.settings.textStyles.heading3.fontSize}px;
              font-weight: ${styleToCss(data.settings.textStyles.heading3.style).fontWeight};
              font-style: ${styleToCss(data.settings.textStyles.heading3.style).fontStyle};
              text-decoration: ${styleToCss(data.settings.textStyles.heading3.style).textDecoration};
              color: ${data.settings.textStyles.heading3.color};
              text-align: ${data.settings.textStyles.heading3.align};
            }

            .single-editor .tag-text {
              font-size: ${data.settings.textStyles.tag.fontSize}px;
              font-weight: ${styleToCss(data.settings.textStyles.tag.style).fontWeight};
              font-style: ${styleToCss(data.settings.textStyles.tag.style).fontStyle};
              text-decoration: ${styleToCss(data.settings.textStyles.tag.style).textDecoration};
              color: ${data.settings.textStyles.tag.color};
            }
          `}
        </style>
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
        <p className="status">{status}</p>
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
