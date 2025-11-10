"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { User } from "firebase/auth"
import { getAuthInstance, getGoogleProvider } from "@/lib/firebase"

interface AuthContextType {
  currentUser: User | null
  signup: (email: string, password: string) => Promise<any>
  login: (email: string, password: string) => Promise<any>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signInWithGoogle: () => Promise<any>
  signInWithFacebook: () => Promise<any>
  getIdToken: () => Promise<string | null>
  updateUserProfile: (profileData: { displayName?: string; photoURL?: string }) => Promise<void>
  updateUserEmail: (newEmail: string) => Promise<void>
  updateUserPassword: (newPassword: string) => Promise<void>
  loading: boolean
  firebaseError: Error | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const initAuth = async () => {
      try {
        const auth = await getAuthInstance()
        const { onAuthStateChanged } = await import("firebase/auth")

        unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user)
          setLoading(false)
        })
      } catch (error) {
        console.error("[v0] Firebase auth initialization error:", error)
        setLoading(false)
      }
    }

    initAuth()

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const signup = async (email: string, password: string) => {
    const auth = await getAuthInstance()
    const { createUserWithEmailAndPassword } = await import("firebase/auth")
    return await createUserWithEmailAndPassword(auth, email, password)
  }

  const login = async (email: string, password: string) => {
    const auth = await getAuthInstance()
    const { signInWithEmailAndPassword } = await import("firebase/auth")
    return await signInWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    const auth = await getAuthInstance()
    const { signOut } = await import("firebase/auth")
    await signOut(auth)
  }

  const resetPassword = async (email: string) => {
    const auth = await getAuthInstance()
    const { sendPasswordResetEmail } = await import("firebase/auth")
    return await sendPasswordResetEmail(auth, email)
  }

  const signInWithGoogle = async () => {
    const auth = await getAuthInstance()
    const provider = await getGoogleProvider()
    const { signInWithPopup } = await import("firebase/auth")
    return await signInWithPopup(auth, provider)
  }

  const signInWithFacebook = async () => {
    throw new Error("Facebook sign-in not implemented yet")
  }

  const getIdToken = async () => {
    if (!currentUser) return null
    return await currentUser.getIdToken()
  }

  const updateUserProfile = async (profileData: { displayName?: string; photoURL?: string }) => {
    if (!currentUser) {
      throw new Error("No user is currently signed in")
    }
    const { updateProfile } = await import("firebase/auth")
    await updateProfile(currentUser, profileData)
  }

  const updateUserEmail = async (newEmail: string) => {
    if (!currentUser) {
      throw new Error("No user is currently signed in")
    }
    const { updateEmail } = await import("firebase/auth")
    await updateEmail(currentUser, newEmail)
  }

  const updateUserPassword = async (newPassword: string) => {
    if (!currentUser) {
      throw new Error("No user is currently signed in")
    }
    const { updatePassword } = await import("firebase/auth")
    await updatePassword(currentUser, newPassword)
  }

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    signInWithGoogle,
    signInWithFacebook,
    getIdToken,
    updateUserProfile,
    updateUserEmail,
    updateUserPassword,
    loading,
    firebaseError: null,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
