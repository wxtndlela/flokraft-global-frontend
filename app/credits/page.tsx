"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { useCredits } from "@/contexts/credits-context"
import { SidebarLayout } from "@/components/sidebar-layout"
import { Coins, CreditCard, Check, Loader2 } from "lucide-react"

const CREDIT_PACKAGES = [
  {
    id: "starter",
    name: "Starter Pack",
    credits: 10,
    price: 9.99,
    popular: false,
  },
  {
    id: "popular",
    name: "Popular Pack",
    credits: 25,
    price: 19.99,
    popular: true,
    savings: "Save 20%",
  },
  {
    id: "pro",
    name: "Pro Pack",
    credits: 50,
    price: 34.99,
    popular: false,
    savings: "Save 30%",
  },
  {
    id: "ultimate",
    name: "Ultimate Pack",
    credits: 100,
    price: 59.99,
    popular: false,
    savings: "Save 40%",
  },
]

export default function CreditsPage() {
  const { currentUser, getIdToken, loading: authLoading } = useAuth()
  const { credits, fetchUserCredits } = useCredits()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push("/login")
    }
  }, [currentUser, authLoading, router])

  const handlePurchase = async (packageId: string) => {
    try {
      setLoading(packageId)
      setError(null)

      const token = await getIdToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const selectedPackage = CREDIT_PACKAGES.find((pkg) => pkg.id === packageId)
      if (!selectedPackage) {
        throw new Error("Invalid package selected")
      }

      // In a real implementation, this would integrate with a payment provider like Stripe
      // For now, we'll show a placeholder message
      alert(
        `Payment integration required.\n\nYou selected: ${selectedPackage.name}\nCredits: ${selectedPackage.credits}\nPrice: $${selectedPackage.price}\n\nPlease contact support to complete your purchase.`,
      )

      // Simulate successful purchase for demo purposes
      // In production, this would be handled by a webhook from the payment provider
      // await fetchUserCredits()
    } catch (err: any) {
      console.error("Purchase error:", err)
      setError(err.message || "Failed to process purchase")
    } finally {
      setLoading(null)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return null
  }

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Purchase Credits</h1>
          <p className="text-gray-600">Choose a credit package to continue analyzing dance performances</p>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Coins className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Current Balance</h2>
                <p className="text-gray-600">Available credits for analysis</p>
              </div>
            </div>
            <div className="text-4xl font-bold text-blue-600">{credits}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative bg-white rounded-lg shadow-lg p-6 border-2 ${
                pkg.popular ? "border-blue-500" : "border-gray-200"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
                {pkg.savings && <p className="text-green-600 text-sm font-semibold mb-2">{pkg.savings}</p>}
              </div>

              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Coins className="w-6 h-6 text-blue-600 mr-2" />
                  <span className="text-3xl font-bold text-gray-900">{pkg.credits}</span>
                </div>
                <p className="text-gray-600 text-sm">credits</p>
              </div>

              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900">${pkg.price}</div>
                <p className="text-gray-600 text-sm">one-time payment</p>
              </div>

              <button
                onClick={() => handlePurchase(pkg.id)}
                disabled={loading !== null}
                className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center ${
                  pkg.popular
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading === pkg.id ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Purchase
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">How Credits Work</h2>
          <div className="space-y-4">
            <div className="flex items-start">
              <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Each analysis costs 5 credits</h3>
                <p className="text-gray-600 text-sm">
                  Upload a dance video and receive a comprehensive AI-powered analysis
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Credits never expire</h3>
                <p className="text-gray-600 text-sm">Use your credits whenever you need them, no time limits</p>
              </div>
            </div>
            <div className="flex items-start">
              <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Detailed analysis reports</h3>
                <p className="text-gray-600 text-sm">
                  Get scores, feedback, and downloadable PDF reports for each analysis
                </p>
              </div>
            </div>
            <div className="flex items-start">
              <Check className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-gray-900">Support multiple analysis types</h3>
                <p className="text-gray-600 text-sm">
                  Analyze couples, solo dancers, duos, and formations with the same credits
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
