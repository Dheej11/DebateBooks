import {
  type ChangeEventHandler,
  type CSSProperties,
  type KeyboardEvent,
  type KeyboardEventHandler,
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
  speechDocs: SpeechDocument[]
  activeDebateDocId: string
  activeSpeechId: string
  settings: EditorSettings
}

type LeftPanelView = 'files' | 'settings'
type FontStylePreset = 'normal' | 'bold' | 'italic' | 'boldItalic' | 'underline'
type ShortcutAction =
  | 'bold'
  | 'underline'
  | 'highlight'
  | 'boldUnderline'
  | 'boldUnderlineHighlight'
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
  shortcuts: Record<ShortcutAction, string>
}

const STORAGE_KEY = 'debatefiles.v1'
const defaultSettings: EditorSettings = {
  defaultFont: 'Arial',
  textStyles: {
    defaultText: { fontSize: 15, style: 'normal' },
    tag: { fontSize: 16, style: 'bold' },
    heading1: { fontSize: 34, style: 'bold' },
    heading2: { fontSize: 26, style: 'bold' },
    heading3: { fontSize: 20, style: 'bold' },
  },
  shortcuts: {
    bold: 'Mod+B',
    underline: 'Mod+U',
    highlight: 'Mod+Shift+H',
    boldUnderline: 'Mod+Shift+U',
    boldUnderlineHighlight: 'Mod+Shift+J',
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
    speechDocs: [speechDoc],
    activeDebateDocId: debateDoc.id,
    activeSpeechId: speechDoc.id,
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
  const editorRef = useRef<HTMLDivElement | null>(null)
  const leftResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  )

  const activeDebateDoc = useMemo(
    () => data.debateDocs.find((doc) => doc.id === data.activeDebateDocId) ?? null,
    [data.debateDocs, data.activeDebateDocId],
  )

  const activeSpeechDoc = useMemo(
    () => data.speechDocs.find((doc) => doc.id === data.activeSpeechId) ?? null,
    [data.speechDocs, data.activeSpeechId],
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
      content: '<h1>New File</h1><p>Start writing...</p>',
    }

    setData((previous) => ({
      ...previous,
      debateDocs: [doc, ...previous.debateDocs],
      activeDebateDocId: doc.id,
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
    }))
  }

  const applyCommand = (
    command: 'bold' | 'underline' | 'hiliteColor',
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

  const runShortcutAction = (action: ShortcutAction) => {
    switch (action) {
      case 'bold':
        applyCommand('bold')
        break
      case 'underline':
        applyCommand('underline')
        break
      case 'highlight':
        applyCommand('hiliteColor', 'yellow')
        break
      case 'boldUnderline':
        applyCommand('bold')
        applyCommand('underline')
        break
      case 'boldUnderlineHighlight':
        applyCommand('bold')
        applyCommand('underline')
        applyCommand('hiliteColor', 'yellow')
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
    if (!activeSpeechDoc || !editorRef.current) {
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
      html = editorRef.current.innerHTML
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
        debateDocs: [{ ...imported, id: crypto.randomUUID() }, ...previous.debateDocs],
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
            </div>
            <div className="settings-group">
              <h4>Text + Style Defaults</h4>
              <p className="hint">
                Set default size/style for regular text, tags, and headings.
              </p>
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
                </div>
              </div>
            ))}
            <div className="settings-group">
              <h4>Keyboard Shortcuts</h4>
              <p className="hint">
                Use format like <code>Mod+Shift+H</code> or <code>Mod+Alt+1</code>.
                Mod = Cmd on Mac, Ctrl on Windows.
              </p>
              <div className="shortcuts-grid">
                {shortcutGroups.map((shortcut) => (
                  <label key={shortcut.key} className="settings-row">
                    <span>{shortcut.label}</span>
                    <input
                      type="text"
                      value={data.settings.shortcuts[shortcut.key]}
                      onChange={(event) =>
                        updateShortcutSetting(shortcut.key, event.target.value)
                      }
                    />
                  </label>
                ))}
              </div>
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
          <button type="button" onClick={createDebateDoc}>
            New File
          </button>
          <label className="button-like">
            Import
            <input type="file" accept="application/json" onChange={importDebateDoc} />
          </label>
        </div>
        <div className="stack">
          {data.debateDocs.map((doc) => (
            <button
              key={doc.id}
              type="button"
              className={`doc-button ${
                doc.id === data.activeDebateDocId ? 'doc-button-active' : ''
              }`}
              onClick={() =>
                setData((previous) => ({
                  ...previous,
                  activeDebateDocId: doc.id,
                }))
              }
            >
              <span>{doc.title}</span>
              <small>Updated {formatDate(doc.updatedAt)}</small>
            </button>
          ))}
        </div>
        <p className="hint">
          Each file opens as one continuous editable page, like Google Docs.
        </p>
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
        <header className="editor-toolbar">
          <div className="row">
            <button type="button" onClick={() => applyCommand('bold')}>
              Bold
            </button>
            <button type="button" onClick={() => applyCommand('underline')}>
              Underline
            </button>
            <button type="button" onClick={() => applyCommand('hiliteColor', 'yellow')}>
              Highlight
            </button>
            <button type="button" onClick={condenseSelection}>
              Condense
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

        {activeDebateDoc ? (
          <article className="editor-content">
            <input
              className="doc-title"
              value={activeDebateDoc.title}
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
                }

                .single-editor h1 {
                  font-size: ${data.settings.textStyles.heading1.fontSize}px;
                  font-weight: ${styleToCss(data.settings.textStyles.heading1.style).fontWeight};
                  font-style: ${styleToCss(data.settings.textStyles.heading1.style).fontStyle};
                  text-decoration: ${styleToCss(data.settings.textStyles.heading1.style).textDecoration};
                }

                .single-editor h2 {
                  font-size: ${data.settings.textStyles.heading2.fontSize}px;
                  font-weight: ${styleToCss(data.settings.textStyles.heading2.style).fontWeight};
                  font-style: ${styleToCss(data.settings.textStyles.heading2.style).fontStyle};
                  text-decoration: ${styleToCss(data.settings.textStyles.heading2.style).textDecoration};
                }

                .single-editor h3 {
                  font-size: ${data.settings.textStyles.heading3.fontSize}px;
                  font-weight: ${styleToCss(data.settings.textStyles.heading3.style).fontWeight};
                  font-style: ${styleToCss(data.settings.textStyles.heading3.style).fontStyle};
                  text-decoration: ${styleToCss(data.settings.textStyles.heading3.style).textDecoration};
                }

                .single-editor .tag-text {
                  font-size: ${data.settings.textStyles.tag.fontSize}px;
                  font-weight: ${styleToCss(data.settings.textStyles.tag.style).fontWeight};
                  font-style: ${styleToCss(data.settings.textStyles.tag.style).fontStyle};
                  text-decoration: ${styleToCss(data.settings.textStyles.tag.style).textDecoration};
                }
              `}
            </style>
            <div
              ref={editorRef}
              className={`editor single-editor ${invisibilityMode ? 'invisibility' : ''}`}
              contentEditable
              suppressContentEditableWarning
              onInput={onEditorInput}
              onKeyDown={onEditorKeyDown}
            />
            <p className="hint">
              Shortcuts: Cmd/Ctrl+B (bold), Cmd/Ctrl+U (underline), Cmd/Ctrl+Shift+H
              (highlight), Cmd/Ctrl+Shift+C (condense), Cmd/Ctrl+Shift+S (send to
              speech).
            </p>
          </article>
        ) : (
          <p>Select a document to begin editing.</p>
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
              className={`doc-button ${doc.id === data.activeSpeechId ? 'doc-button-active' : ''}`}
              onClick={() =>
                setData((previous) => ({ ...previous, activeSpeechId: doc.id }))
              }
            >
              <span>{doc.title}</span>
              <small>
                {doc.cardRefs.length} cards · {formatDate(doc.updatedAt)}
              </small>
            </button>
          ))}
        </div>
        {activeSpeechDoc ? (
          <div className="speech-preview">
            <input
              className="node-title"
              value={activeSpeechDoc.title}
              onChange={(event) =>
                mutateSpeechDoc(activeSpeechDoc.id, (doc) => {
                  doc.title = event.target.value
                })
              }
            />
            <textarea
              value={activeSpeechDoc.content}
              onChange={(event) =>
                mutateSpeechDoc(activeSpeechDoc.id, (doc) => {
                  doc.content = event.target.value
                })
              }
            />
          </div>
        ) : null}
        <p className="status">{status}</p>
      </aside>
    </main>
  )
}

export default App
