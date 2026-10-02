import { createContext, useContext, useEffect, useState } from 'react'
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth'
import { auth, firebaseConfigured, googleProvider } from './client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(!firebaseConfigured)
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState('')
  const [authError, setAuthError] = useState('')
  const [lastSynced, setLastSynced] = useState(null)

  useEffect(() => {
    if (!auth) return undefined
    getRedirectResult(auth).then((result) => {
      if (result) setAuthError('')
    }).catch((error) => {
      console.error('Google redirect sign-in failed:', error)
      setAuthError(error.code || 'auth/redirect-failed')
    })
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      if (nextUser) setAuthError('')
      if (!nextUser) { setSyncing(false); setReady(true); return }
      setSyncing(true)
      setSyncError('')
      try {
        const { syncLocalData } = await import('./cloudSync')
        await syncLocalData(nextUser.uid)
        setLastSynced(new Date())
      } catch (error) {
        console.error('Initial workout sync failed:', error)
        setSyncError('Signed in, but sync could not finish. Check your connection and Firebase setup.')
      } finally {
        setSyncing(false)
        setReady(true)
      }
    })
  }, [])

  const signIn = async () => {
    if (!auth) throw new Error('Add Firebase settings to .env.local first.')
    setAuthError('')
    const mobile = window.matchMedia('(max-width: 700px)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent)
    try {
      if (mobile) await signInWithRedirect(auth, googleProvider)
      else await signInWithPopup(auth, googleProvider)
    } catch (error) {
      console.error('Google sign-in failed:', error)
      setAuthError(error.code || 'auth/sign-in-failed')
      throw error
    }
  }
  const signOutUser = async () => { if (auth) await signOut(auth) }
  const syncNow = async () => {
    if (!user) throw new Error('Sign in before syncing.')
    setSyncing(true)
    setSyncError('')
    try {
      const { syncLocalData } = await import('./cloudSync')
      const result = await syncLocalData(user.uid)
      setLastSynced(new Date())
      return result
    } catch (error) {
      console.error('Workout sync failed:', error)
      setSyncError('Sync failed. Your local workouts are still saved on this device.')
      throw error
    } finally { setSyncing(false) }
  }

  return <AuthContext.Provider value={{ user, ready, syncing, syncError, authError, lastSynced, firebaseConfigured, signIn, signOut: signOutUser, syncNow }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
