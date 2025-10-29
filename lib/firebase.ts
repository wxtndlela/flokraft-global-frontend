"use client"

import { initializeApp } from "firebase/app"
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
  updatePassword
} from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { firebaseConfig } from "./firebase-config"

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Auth and get a reference to the service
export const auth = getAuth(app)

// Initialize Cloud Firestore and get a reference to the service
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

console.log("[Firebase] Using real Firebase authentication.")
