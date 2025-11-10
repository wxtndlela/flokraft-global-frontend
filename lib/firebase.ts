"use client"
import type { GoogleAuthProvider as GoogleAuthProviderType, Auth, User } from "firebase/auth"
import type { Firestore } from "firebase/firestore"
import { initializeApp, getApps } from "firebase/app"
import { firebaseConfig } from "./firebase-config"

// Initialize Firebase app only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

let _auth: Auth | null = null
let _db: Firestore | null = null
let _googleProvider: GoogleAuthProviderType | null = null

// Getter functions that initialize on first access
export const getAuthInstance = async () => {
  if (!_auth) {
    const { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } = await import("firebase/auth")
    _auth = getAuth(app)
    await setPersistence(_auth, browserLocalPersistence)

    if (!_googleProvider) {
      _googleProvider = new GoogleAuthProvider()
      _googleProvider.setCustomParameters({ prompt: "select_account" })
    }
  }
  return _auth
}

export const getDbInstance = async () => {
  if (!_db) {
    const { getFirestore } = await import("firebase/firestore")
    _db = getFirestore(app)
  }
  return _db
}

export const getGoogleProvider = async () => {
  if (!_googleProvider) {
    const { GoogleAuthProvider } = await import("firebase/auth")
    _googleProvider = new GoogleAuthProvider()
    _googleProvider.setCustomParameters({ prompt: "select_account" })
  }
  return _googleProvider
}

// Re-export for backwards compatibility (these will be initialized lazily)
export const auth = new Proxy({} as Auth, {
  get: (_target, prop) => {
    throw new Error(`Please use getAuthInstance() to access auth.${String(prop)}`)
  },
})

export const db = new Proxy({} as Firestore, {
  get: (_target, prop) => {
    throw new Error(`Please use getDbInstance() to access db.${String(prop)}`)
  },
})

export const googleProvider = new Proxy({} as GoogleAuthProviderType, {
  get: (_target, prop) => {
    throw new Error(`Please use getGoogleProvider() to access googleProvider.${String(prop)}`)
  },
})

// Re-export types
export type { User, Auth, Firestore, GoogleAuthProviderType }
