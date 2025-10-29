"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useAuth } from "./auth-context"

const API_BASE = "https://chappie-demo.novosense.africa:5555"

interface CreditsContextType {
  credits: number
  totalPurchased: number
  totalUsed: number
  loading: boolean
  error: string | null
  fetchUserCredits: () => Promise<void>
  initializePayment: (amount: number, packageType: string, amountUSD?: number | null) => Promise<any>
  verifyPayment: (reference: string) => Promise<any>
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined)

export const useCredits = () => {
  const context = useContext(CreditsContext)
  if (!context) {
    throw new Error("useCredits must be used within a CreditsProvider")
  }
  return context
}

export const CreditsProvider = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, getIdToken } = useAuth()
  const [credits, setCredits] = useState(0)
  const [totalPurchased, setTotalPurchased] = useState(0)
  const [totalUsed, setTotalUsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUserCredits = useCallback(async () => {
    if (!currentUser) {
      setCredits(0)
      setTotalPurchased(0)
      setTotalUsed(0)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const token = await getIdToken()

      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`${API_BASE}/user/credits`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          const createResponse = await fetch(`${API_BASE}/auth/create-user-doc`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              initialCredits: 5,
            }),
          })

          if (createResponse.ok) {
            return fetchUserCredits()
          }
        }
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      setCredits(data.credits || 0)
      setTotalPurchased(data.total_purchased || 0)
      setTotalUsed(data.total_used || 0)
      setError(null)
    } catch (error) {
      console.error("Failed to fetch credits:", error)
      setError("Failed to load credit information")
    } finally {
      setLoading(false)
    }
  }, [currentUser, getIdToken])

  useEffect(() => {
    fetchUserCredits()
  }, [fetchUserCredits])

  const initializePayment = async (amount: number, packageType: string, amountUSD: number | null = null) => {
    try {
      if (!currentUser) {
        throw new Error("Authentication required")
      }

      const token = await getIdToken()

      const response = await fetch(`${API_BASE}/payment/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount,
          amountUSD: amountUSD,
          package: packageType,
          callback_url: window.location.origin + "/credits",
          currency: "ZAR",
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Payment initialization failed")
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error("Payment initialization error:", error)
      throw error
    }
  }

  const verifyPayment = async (reference: string) => {
    try {
      if (!currentUser) {
        throw new Error("Authentication required")
      }

      const token = await getIdToken()

      const response = await fetch(`${API_BASE}/payment/verify/${reference}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Payment verification failed")
      }

      const data = await response.json()

      if (data.status === "success") {
        await fetchUserCredits()
      }

      return data
    } catch (error) {
      console.error("Payment verification error:", error)
      throw error
    }
  }

  const value = {
    credits,
    totalPurchased,
    totalUsed,
    loading,
    error,
    fetchUserCredits,
    initializePayment,
    verifyPayment,
  }

  return <CreditsContext.Provider value={value}>{children}</CreditsContext.Provider>
}
