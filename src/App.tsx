import {
  type ChangeEventHandler,
  type KeyboardEventHandler,
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
}

type LeftPanelView = 'files' | 'settings'

const STORAGE_KEY = 'debatefiles.v1'

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
      return parsed
    } catch {
      return defaultData()
    }
  })

  const [invisibilityMode, setInvisibilityMode] = useState(false)
  const [status, setStatus] = useState('Ready')
  const [leftPanelView, setLeftPanelView] = useState<LeftPanelView>('files')
  const editorRef = useRef<HTMLDivElement | null>(null)

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

  const onEditorKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    const mod = event.metaKey || event.ctrlKey
    const key = event.key.toLowerCase()

    if (mod && key === 'b') {
      event.preventDefault()
      applyCommand('bold')
    } else if (mod && key === 'u') {
      event.preventDefault()
      applyCommand('underline')
    } else if (mod && event.shiftKey && key === 'h') {
      event.preventDefault()
      applyCommand('hiliteColor', 'yellow')
    } else if (mod && event.shiftKey && key === 's') {
      event.preventDefault()
      sendToSpeech()
    } else if (mod && event.shiftKey && key === 'c') {
      event.preventDefault()
      condenseSelection()
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

  return (
    <main className="app-layout">
      <aside className="panel">
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
            <label className="settings-row">
              <input
                type="checkbox"
                checked={invisibilityMode}
                onChange={(event) => setInvisibilityMode(event.target.checked)}
              />
              Start in invisibility mode
            </label>
            <button type="button" onClick={() => setLeftPanelView('files')}>
              Back to Files
            </button>
            <p className="hint">
              More options can be added here (shortcuts, defaults, and export behavior).
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
