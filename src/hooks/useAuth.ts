import { useCallback, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'
import { auth, firebaseEnabled, googleProvider } from '../services/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(Boolean(auth))

  useEffect(() => {
    if (!auth) {
      return
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
  }, [])

  const signInWithGoogle = useCallback(async () => {
    if (!auth) {
      throw new Error('Firebase auth is not configured.')
    }
    await signInWithPopup(auth, googleProvider)
  }, [])

  const signOutUser = useCallback(async () => {
    if (!auth) {
      return
    }
    await signOut(auth)
  }, [])

  return {
    enabled: firebaseEnabled,
    loading,
    user,
    signInWithGoogle,
    signOut: signOutUser,
  }
}
