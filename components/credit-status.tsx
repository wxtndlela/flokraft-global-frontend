"use client"
import { Coins, AlertTriangle } from "lucide-react"
import { useCredits } from "@/contexts/credits-context"
import Link from "next/link"

export function CreditStatus() {
  const { credits, loading, error } = useCredits()

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500 py-2 px-3">
        <div className="w-3 h-3 rounded-full border-2 border-t-blue-500 animate-spin"></div>
        <span>Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-500 py-2 px-3">
        <AlertTriangle className="w-4 h-4" />
        <span>Error loading credits</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg mb-2">
        <div className="flex items-center">
          <Coins className="w-5 h-5 text-blue-600 mr-2" />
          <span className="font-medium">Credits</span>
        </div>
        <div className="text-lg font-bold text-blue-700">{credits}</div>
      </div>

      {credits < 1 && (
        <div className="rounded-md bg-yellow-100 p-2 text-sm text-yellow-700 mb-1">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          No credits available
        </div>
      )}

      <Link
        href="/credits"
        className="text-center px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
      >
        {credits < 1 ? "Buy Credits" : "Add More Credits"}
      </Link>
    </div>
  )
}
