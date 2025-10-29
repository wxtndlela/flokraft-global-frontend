"use client"

import type React from "react"

import { useState, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { CountrySelector } from "@/components/country-selector"
import { API_BASE } from "@/lib/constants"
import Image from "next/image"

export default function SignupPage() {
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const passwordConfirmRef = useRef<HTMLInputElement>(null)
  const displayNameRef = useRef<HTMLInputElement>(null)

  const [country, setCountry] = useState("")

  const { signup, signInWithGoogle, logout } = useAuth()

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (passwordRef.current!.value !== passwordConfirmRef.current!.value) {
      return setError("Passwords do not match")
    }

    if (!country) {
      return setError("Please select your country")
    }

    try {
      setError("")
      setLoading(true)

      const userCredential = await signup(emailRef.current!.value, passwordRef.current!.value)
      const token = await userCredential.user.getIdToken()

      const backendResponse = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: emailRef.current!.value,
          displayName: displayNameRef.current!.value,
          password: passwordRef.current!.value,
          country: country,
          initialCredits: 5,
        }),
      })

      const responseData = await backendResponse.json()
      if (!backendResponse.ok) {
        console.error("Backend registration error", responseData)
        throw new Error(responseData.error || "Failed to register with backend")
      }

      router.push("/")
    } catch (error: any) {
      console.error("Registration error:", error)
      if (error.code === "auth/email-already-in-use") {
        setError("Account already exists! Please login")
      } else {
        setError("Failed to create an account: " + (error.message || error))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    try {
      setError("")

      if (!country) {
        setError("Please select your country before signing in with Google")
        return
      }

      setLoading(true)

      const userCredential = await signInWithGoogle()
      const user = userCredential.user
      const token = await user.getIdToken()

      const verifyResponse = await fetch(`${API_BASE}/auth/verify-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: token,
          sourcePage: "signup",
          country: country,
        }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        throw new Error(errorData.error || "Failed to verify user")
      }

      const backendResponse = await fetch(`${API_BASE}/auth/create-user-doc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user.email,
          displayName: user.displayName || "",
          provider: "google",
          user_id: user.uid,
          country: country,
          initialCredits: 5,
        }),
      })

      if (!backendResponse.ok) {
        const responseData = await backendResponse.json()
        console.error("Failed to register Google user in backend", responseData)
        throw new Error(responseData.error || "Failed to create user document")
      }

      router.push("/")
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      setError("Failed to sign in with Google: " + error.message)

      try {
        await logout()
      } catch (logoutError) {
        console.error("Logout error:", logoutError)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 relative">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: `url(/background.jpg)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.2,
        }}
      />
      <div className="relative z-10 max-w-md w-full space-y-8 bg-white bg-opacity-90 p-8 rounded-lg shadow-lg">
        <div>
          <div className="flex justify-center mb-4">
            <Image src="/logo192.png" alt="Flokraft Logo" width={96} height={96} className="h-24 w-auto" />
          </div>

          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">AI Match Analysis</h2>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Create your account</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Join Flokraft AI Match Analysis</p>
          <p className="mt-1 text-center text-sm font-semibold text-blue-600">Get 5 free credits when you sign up!</p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="display-name" className="sr-only">
                Display Name
              </label>
              <input
                id="display-name"
                name="name"
                type="text"
                ref={displayNameRef}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Display Name"
              />
            </div>
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                ref={emailRef}
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                ref={passwordRef}
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
              />
            </div>
            <div>
              <label htmlFor="password-confirm" className="sr-only">
                Confirm Password
              </label>
              <input
                id="password-confirm"
                name="password-confirm"
                type="password"
                ref={passwordConfirmRef}
                autoComplete="new-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm Password"
              />
            </div>
            <div>
              <label htmlFor="country" className="sr-only">
                Country
              </label>
              <CountrySelector
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Select Country (Required)"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                required={true}
              />
            </div>
          </div>

          <div>
            <Button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </div>

          <div className="flex items-center justify-center">
            <span className="text-gray-500 text-sm">or sign up with</span>
          </div>

          <div className="grid gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M12.545 10.239v3.821h5.445c-0.712 2.315-2.647 3.972-5.445 3.972-3.332 0-6.033-2.701-6.033-6.032s2.701-6.032 6.033-6.032c1.498 0 2.866 0.549 3.921 1.453l2.814-2.814c-1.79-1.677-4.184-2.702-6.735-2.702-5.514 0-10 4.486-10 10s4.486 10 10 10c5.514 0 10-4.486 10-10 0-0.837-0.12-1.64-0.329-2.411h-9.671z"
                  fill="#4285F4"
                />
              </svg>
              <span className="ml-2">Google</span>
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
