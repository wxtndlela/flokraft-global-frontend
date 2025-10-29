"use client"

import { initializeApp, getApps, getApp } from "firebase/app"
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  updateEmail,
  updatePassword,
} from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { firebaseConfig } from "./firebase-config"

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const auth = getAuth(app)
export const db = getFirestore(app)

// Google Auth Provider
const googleProvider = new GoogleAuthProvider()

// Auth functions
export const signInWithEmailAndPasswordFirebase = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password)
}

export const createUserWithEmailAndPasswordFirebase = (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password)
}

export const signOutFirebase = () => {
  return signOut(auth)
}

export const sendPasswordResetEmailFirebase = (email: string) => {
  return sendPasswordResetEmail(auth, email)
}

export const signInWithGoogleFirebase = () => {
  return signInWithPopup(auth, googleProvider)
}

export const updateUserProfileFirebase = (profileData: { displayName?: string; photoURL?: string }) => {
  if (!auth.currentUser) {
    throw new Error("No user is currently signed in")
  }
  return updateProfile(auth.currentUser, profileData)
}

export const updateUserEmailFirebase = (newEmail: string) => {
  if (!auth.currentUser) {
    throw new Error("No user is currently signed in")
  }
  return updateEmail(auth.currentUser, newEmail)
}

export const updateUserPasswordFirebase = (newPassword: string) => {
  if (!auth.currentUser) {
    throw new Error("No user is currently signed in")
  }
  return updatePassword(auth.currentUser, newPassword)
}
