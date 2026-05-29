import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { auth, googleProvider } from './firebase'

interface AuthContextValue {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const useMock = !import.meta.env.VITE_FIREBASE_API_KEY

  useEffect(() => {
    if (useMock) {
      const mockSaved = localStorage.getItem('debatefiles.mock_user')
      if (mockSaved) {
        setUser(JSON.parse(mockSaved))
      } else {
        setUser(null)
      }
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [useMock])

  const signInWithGoogle = async () => {
    if (useMock) {
      const mockUser = {
        uid: 'local-mock-user',
        displayName: 'Local Tester',
        email: 'local@example.com',
        photoURL: null,
      } as any
      setUser(mockUser)
      localStorage.setItem('debatefiles.mock_user', JSON.stringify(mockUser))
      return
    }
    await signInWithPopup(auth, googleProvider)
  }

  const signOut = async () => {
    if (useMock) {
      setUser(null)
      localStorage.removeItem('debatefiles.mock_user')
      return
    }
    await firebaseSignOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
