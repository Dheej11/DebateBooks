import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { db } from './firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import './Drive.css'

/* ── Types (mirror App.tsx) ─────────────────────────────────────── */
interface DebateDocument {
  id: string
  title: string
  updatedAt: number
  content: string
  folderId: string | null
}

interface TrashedDebateDocument extends DebateDocument {
  deletedAt: number
}

interface DebateFolder {
  id: string
  name: string
  createdAt: number
  parentFolderId: string | null
  order: number
}

interface SpeechDocument {
  id: string
  title: string
  updatedAt: number
  cardRefs: string[]
}

interface DriveData {
  debateDocs: DebateDocument[]
  deletedDocs: TrashedDebateDocument[]
  folders: DebateFolder[]
  speechDocs: SpeechDocument[]
}

type DriveTab = 'files' | 'speech' | 'deleted'

/* ── Helpers ────────────────────────────────────────────────────── */
const fmt = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent?.trim().slice(0, 120) ?? ''
}

function parseDriveData(raw: unknown): DriveData {
  const parsed = raw as Partial<DriveData>
  return {
    debateDocs: parsed.debateDocs ?? [],
    deletedDocs: (parsed.deletedDocs ?? []).map((d) => ({
      ...d,
      folderId: d.folderId ?? null,
      deletedAt: d.deletedAt ?? Date.now(),
    })),
    folders: (parsed.folders ?? []).map((f, i) => ({
      ...f,
      parentFolderId: f.parentFolderId ?? null,
      order: f.order ?? i,
    })),
    speechDocs: parsed.speechDocs ?? [],
  }
}

/* ── Component ──────────────────────────────────────────────────── */
export default function Drive() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [driveData, setDriveData] = useState<DriveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [activeTab, setActiveTab] = useState<DriveTab>('files')
  const [status, setStatus] = useState('')

  const localKey = user ? `debatefiles.v1.${user.uid}` : null

  const persistDriveChanges = useCallback(
    (updater: (current: Record<string, unknown>) => Record<string, unknown>) => {
      if (!user || !localKey) {
        return
      }

      let nextPayload: Record<string, unknown>
      try {
        const cached = localStorage.getItem(localKey)
        const current = cached ? (JSON.parse(cached) as Record<string, unknown>) : {}
        nextPayload = updater(current)
        localStorage.setItem(localKey, JSON.stringify(nextPayload))
      } catch {
        setStatus('Could not save changes')
        return
      }

      const nextDriveData = parseDriveData(nextPayload)
      setDriveData(nextDriveData)

      if (import.meta.env.VITE_FIREBASE_API_KEY) {
        const docRef = doc(db, 'users', user.uid, 'data', 'appData')
        void setDoc(docRef, nextPayload).catch(() => {
          setStatus('Saved locally, cloud sync failed')
        })
      }
    },
    [localKey, user],
  )

  const restoreDebateDoc = (docId: string) => {
    persistDriveChanges((current) => {
      const parsed = parseDriveData(current)
      const trashed = parsed.deletedDocs.find((item) => item.id === docId)
      if (!trashed) {
        return current
      }

      const { deletedAt: _deletedAt, ...docToRestore } = trashed
      return {
        ...current,
        debateDocs: [docToRestore, ...parsed.debateDocs],
        deletedDocs: parsed.deletedDocs.filter((item) => item.id !== docId),
      }
    })
    setStatus('File restored')
  }

  const permanentlyDeleteDebateDoc = (docId: string) => {
    persistDriveChanges((current) => {
      const parsed = parseDriveData(current)
      return {
        ...current,
        deletedDocs: parsed.deletedDocs.filter((item) => item.id !== docId),
      }
    })
    setStatus('File permanently deleted')
  }

  /* Load data ---------------------------------------------------- */
  useEffect(() => {
    if (!user || !localKey) return

    try {
      const cached = localStorage.getItem(localKey)
      if (cached) {
        setDriveData(parseDriveData(JSON.parse(cached)))
        setLoading(false)
      }
    } catch { /* ignore */ }

    const docRef = doc(db, 'users', user.uid, 'data', 'appData')
    getDoc(docRef)
      .then((snap) => {
        if (snap.exists()) {
          setDriveData(parseDriveData(snap.data()))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [localKey, user])

  /* Derived -------------------------------------------------------- */
  const folders = useMemo(
    () =>
      (driveData?.folders ?? [])
        .filter((f) => f.parentFolderId === currentFolderId)
        .sort((a, b) => a.order - b.order),
    [driveData, currentFolderId],
  )

  const files = useMemo(() => {
    const base = (driveData?.debateDocs ?? []).filter(
      (d) => d.folderId === currentFolderId,
    )
    if (!query) return base
    return base.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
  }, [driveData, currentFolderId, query])

  const speechDocs = useMemo(() => {
    const base = driveData?.speechDocs ?? []
    if (!query) return base
    return base.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
  }, [driveData, query])

  const deletedDocs = useMemo(() => driveData?.deletedDocs ?? [], [driveData])

  const allFiles = useMemo(() => {
    if (!query) return []
    return (driveData?.debateDocs ?? []).filter((d) =>
      d.title.toLowerCase().includes(query.toLowerCase()),
    )
  }, [driveData, query])

  /* Breadcrumb ---------------------------------------------------- */
  const breadcrumb = useMemo(() => {
    if (!currentFolderId) return []
    const crumbs: DebateFolder[] = []
    let id: string | null = currentFolderId
    while (id) {
      const folder = driveData?.folders.find((f) => f.id === id)
      if (!folder) break
      crumbs.unshift(folder)
      id = folder.parentFolderId
    }
    return crumbs
  }, [currentFolderId, driveData])

  /* Stats --------------------------------------------------------- */
  const totalFiles = driveData?.debateDocs.length ?? 0
  const totalFolders = driveData?.folders.length ?? 0
  const totalSpeech = driveData?.speechDocs.length ?? 0
  const totalDeleted = deletedDocs.length

  /* Open a debate doc in the app ---------------------------------- */
  const openDoc = (docId: string) => {
    navigate('/app', { state: { openDocId: docId } })
  }

  const openSpeechDoc = (docId: string) => {
    navigate('/app', { state: { openSpeechDocId: docId } })
  }

  const switchTab = (tab: DriveTab) => {
    setActiveTab(tab)
    setQuery('')
    if (tab === 'files') {
      setCurrentFolderId(null)
    }
  }

  return (
    <div className="drive">
      {/* Nav */}
      <nav className="drive-nav">
        <div className="drive-nav-left">
          <button className="drive-nav-brand" onClick={() => navigate('/')}>
            <img src="/debate-files-logo.jpeg" alt="DebateFiles" className="drive-nav-logo" />
            <span>DebateFiles</span>
          </button>
          <span className="drive-nav-sep">/</span>
          <span className="drive-nav-title">My Drive</span>
        </div>
        <div className="drive-search-wrap">
          <span className="drive-search-icon">🔍</span>
          <input
            className="drive-search"
            placeholder="Search files…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={activeTab === 'deleted'}
          />
        </div>
        <div className="drive-nav-right">
          {user?.photoURL
            ? <img src={user.photoURL} alt={user.displayName ?? ''} className="drive-avatar" referrerPolicy="no-referrer" />
            : <div className="drive-avatar drive-avatar-fallback">{(user?.displayName ?? user?.email ?? 'U')[0].toUpperCase()}</div>
          }
          <button className="drive-nav-app" onClick={() => navigate('/app')}>Open App</button>
          <button className="drive-nav-signout" onClick={() => void signOut()}>Sign out</button>
        </div>
      </nav>

      <div className="drive-layout">
        {/* Sidebar */}
        <aside className="drive-sidebar">
          <button
            className={`drive-sidebar-item ${activeTab === 'files' ? 'drive-sidebar-item-active' : ''}`}
            onClick={() => switchTab('files')}
          >
            📁 My Files
          </button>
          <button
            className={`drive-sidebar-item ${activeTab === 'speech' ? 'drive-sidebar-item-active' : ''}`}
            onClick={() => switchTab('speech')}
          >
            🎤 Speech Docs
          </button>
          <button
            className={`drive-sidebar-item ${activeTab === 'deleted' ? 'drive-sidebar-item-active' : ''}`}
            onClick={() => switchTab('deleted')}
          >
            🗑 Deleted
            {totalDeleted > 0 ? ` (${totalDeleted})` : ''}
          </button>
          <div className="drive-sidebar-divider" />
          <button className="drive-sidebar-item" onClick={() => navigate('/app')}>
            ✏️ Open Editor
          </button>
          <div className="drive-sidebar-stats">
            <div className="drive-stat-row"><span>{totalFiles}</span> debate files</div>
            <div className="drive-stat-row"><span>{totalFolders}</span> folders</div>
            <div className="drive-stat-row"><span>{totalSpeech}</span> speech docs</div>
            {totalDeleted > 0 ? (
              <div className="drive-stat-row"><span>{totalDeleted}</span> deleted</div>
            ) : null}
          </div>
        </aside>

        {/* Main */}
        <main className="drive-main">
          {status ? <p className="drive-status">{status}</p> : null}

          {/* Toolbar */}
          <div className="drive-toolbar">
            <div className="drive-breadcrumb">
              {activeTab === 'deleted' ? (
                <span className="drive-crumb drive-crumb-static">Deleted</span>
              ) : (
                <>
                  <button
                    className="drive-crumb"
                    onClick={() => setCurrentFolderId(null)}
                  >
                    My Drive
                  </button>
                  {breadcrumb.map((f) => (
                    <span key={f.id} className="drive-crumb-group">
                      <span className="drive-crumb-sep">›</span>
                      <button className="drive-crumb" onClick={() => setCurrentFolderId(f.id)}>
                        {f.name}
                      </button>
                    </span>
                  ))}
                </>
              )}
            </div>
            {activeTab !== 'deleted' ? (
              <div className="drive-view-toggle">
                <button
                  className={`drive-view-btn ${view === 'grid' ? 'drive-view-btn-active' : ''}`}
                  onClick={() => setView('grid')}
                  title="Grid view"
                >⊞</button>
                <button
                  className={`drive-view-btn ${view === 'list' ? 'drive-view-btn-active' : ''}`}
                  onClick={() => setView('list')}
                  title="List view"
                >☰</button>
              </div>
            ) : null}
          </div>

          {loading ? (
            <div className="drive-empty">
              <div className="drive-empty-icon">⏳</div>
              <p>Loading your files…</p>
            </div>
          ) : activeTab === 'deleted' ? (
            <>
              <p className="drive-section-label">DELETED FILES</p>
              <p className="drive-deleted-hint">
                Restore files to bring them back to your drive, or delete them forever.
              </p>
              {deletedDocs.length === 0 ? (
                <div className="drive-empty">
                  <div className="drive-empty-icon">🗑</div>
                  <p>No deleted files.</p>
                </div>
              ) : (
                <div className="drive-deleted-list">
                  {deletedDocs.map((doc) => (
                    <div key={doc.id} className="drive-deleted-item">
                      <div className="drive-deleted-item-main">
                        <span className="drive-deleted-item-icon">📄</span>
                        <div>
                          <div className="drive-deleted-item-title">{doc.title}</div>
                          <div className="drive-deleted-item-meta">
                            Deleted {fmtDateTime(doc.deletedAt)} · Updated {fmt(doc.updatedAt)}
                          </div>
                          <div className="drive-deleted-item-snippet">{stripHtml(doc.content)}</div>
                        </div>
                      </div>
                      <div className="drive-deleted-item-actions">
                        <button type="button" onClick={() => restoreDebateDoc(doc.id)}>
                          Restore
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => permanentlyDeleteDebateDoc(doc.id)}
                        >
                          Delete Forever
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : activeTab === 'speech' ? (
            /* ── Speech docs ── */
            <>
              <p className="drive-section-label">SPEECH DOCUMENTS</p>
              {speechDocs.length === 0 ? (
                <div className="drive-empty">
                  <div className="drive-empty-icon">🎤</div>
                  <p>No speech documents yet.</p>
                  <button className="drive-cta" onClick={() => navigate('/app')}>Create one in the editor</button>
                </div>
              ) : view === 'grid' ? (
                <div className="drive-grid">
                  {speechDocs.map((doc) => (
                    <button key={doc.id} className="drive-file-card" onClick={() => openSpeechDoc(doc.id)}>
                      <div className="drive-card-icon">🎤</div>
                      <div className="drive-card-body">
                        <div className="drive-card-title">{doc.title}</div>
                        <div className="drive-card-meta">{doc.cardRefs.length} cards · {fmt(doc.updatedAt)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="drive-list">
                  <div className="drive-list-header">
                    <span>Name</span><span>Cards</span><span>Updated</span>
                  </div>
                  {speechDocs.map((doc) => (
                    <button key={doc.id} className="drive-list-row" onClick={() => openSpeechDoc(doc.id)}>
                      <span className="drive-list-name"><span className="drive-list-icon">🎤</span>{doc.title}</span>
                      <span>{doc.cardRefs.length}</span>
                      <span>{fmt(doc.updatedAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : query ? (
            /* ── Search results ── */
            <>
              <p className="drive-section-label">SEARCH RESULTS FOR "{query.toUpperCase()}"</p>
              {allFiles.length === 0 ? (
                <div className="drive-empty">
                  <div className="drive-empty-icon">🔍</div>
                  <p>No files match that search.</p>
                </div>
              ) : view === 'grid' ? (
                <div className="drive-grid">
                  {allFiles.map((d) => (
                    <button key={d.id} className="drive-file-card" onClick={() => openDoc(d.id)}>
                      <div className="drive-card-icon">📄</div>
                      <div className="drive-card-body">
                        <div className="drive-card-title">{d.title}</div>
                        <div className="drive-card-snippet">{stripHtml(d.content)}</div>
                        <div className="drive-card-meta">{fmt(d.updatedAt)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="drive-list">
                  <div className="drive-list-header"><span>Name</span><span>Updated</span></div>
                  {allFiles.map((d) => (
                    <button key={d.id} className="drive-list-row" onClick={() => openDoc(d.id)}>
                      <span className="drive-list-name"><span className="drive-list-icon">📄</span>{d.title}</span>
                      <span>{fmt(d.updatedAt)}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ── Browse mode ── */
            <>
              {folders.length > 0 && (
                <>
                  <p className="drive-section-label">FOLDERS</p>
                  <div className="drive-grid drive-grid-folders">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        className="drive-folder-card"
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        <span className="drive-folder-icon">📁</span>
                        <span className="drive-folder-name">{folder.name}</span>
                        <span className="drive-folder-count">
                          {(driveData?.debateDocs ?? []).filter((d) => d.folderId === folder.id).length} files
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {files.length > 0 && (
                <>
                  <p className="drive-section-label">{folders.length > 0 ? 'FILES' : 'ALL FILES'}</p>
                  {view === 'grid' ? (
                    <div className="drive-grid">
                      {files.map((d) => (
                        <button key={d.id} className="drive-file-card" onClick={() => openDoc(d.id)}>
                          <div className="drive-card-icon">📄</div>
                          <div className="drive-card-body">
                            <div className="drive-card-title">{d.title}</div>
                            <div className="drive-card-snippet">{stripHtml(d.content)}</div>
                            <div className="drive-card-meta">{fmt(d.updatedAt)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="drive-list">
                      <div className="drive-list-header"><span>Name</span><span>Updated</span></div>
                      {files.map((d) => (
                        <button key={d.id} className="drive-list-row" onClick={() => openDoc(d.id)}>
                          <span className="drive-list-name"><span className="drive-list-icon">📄</span>{d.title}</span>
                          <span>{fmt(d.updatedAt)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              {folders.length === 0 && files.length === 0 && (
                <div className="drive-empty">
                  <div className="drive-empty-icon">📂</div>
                  <p>{currentFolderId ? 'This folder is empty.' : 'No files yet.'}</p>
                  <button className="drive-cta" onClick={() => navigate('/app')}>
                    Create your first file in the editor
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
