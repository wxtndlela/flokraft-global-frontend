"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import {
  auth,
  signInWithEmailAndPasswordFirebase,
  createUserWithEmailAndPasswordFirebase,
  signOutFirebase,
  sendPasswordResetEmailFirebase,
  signInWithGoogleFirebase,
  updateUserProfileFirebase,
  updateUserEmailFirebase,
  updateUserPasswordFirebase,
} from "@/lib/firebase"
import { onAuthStateChanged, User } from "firebase/auth"

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
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      setLoading(false)
    })

    return () => {
      unsubscribe()
    }
  }, [])

  const signup = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPasswordFirebase(email, password)
    return result
  }

  const login = async (email: string, password: string) => {
    const result = await signInWithEmailAndPasswordFirebase(email, password)
    return result
  }

  const logout = async () => {
    await signOutFirebase()
  }

  const resetPassword = async (email: string) => {
    return sendPasswordResetEmailFirebase(email)
  }

  const signInWithGoogle = async () => {
    const result = await signInWithGoogleFirebase()
    return result
  }

  const signInWithFacebook = async () => {
    // Facebook auth would need to be implemented separately
    throw new Error("Facebook sign-in not implemented yet")
  }

  const getIdToken = async () => {
    if (!currentUser) return null
    return await currentUser.getIdToken()
  }

  const updateUserProfile = async (profileData: { displayName?: string; photoURL?: string }) => {
    try {
      console.log("Updating user profile:", profileData)
      await updateUserProfileFirebase(profileData)
      console.log("Profile updated successfully")
    } catch (error) {
      console.error("Error updating profile:", error)
      throw error
    }
  }

  const updateUserEmail = async (newEmail: string) => {
    try {
      console.log("Updating user email to:", newEmail)
      await updateUserEmailFirebase(newEmail)
      console.log("Email updated successfully")
    } catch (error) {
      console.error("Error updating email:", error)
      throw error
    }
  }

  const updateUserPassword = async (newPassword: string) => {
    try {
      console.log("Updating user password")
      await updateUserPasswordFirebase(newPassword)
      console.log("Password updated successfully")
    } catch (error) {
      console.error("Error updating password:", error)
      throw error
    }
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
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
