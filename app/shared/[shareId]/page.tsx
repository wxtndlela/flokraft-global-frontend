"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SidebarLayout } from "@/components/sidebar-layout"
import { AnalysisDetail } from "@/components/analysis-detail"
import { ArrowLeft, AlertCircle } from "lucide-react"
import { API_BASE } from "@/lib/constants"

interface SharedAnalysisData {
  id: string
  timestamp: string
  dance_type: string
  dancers: string
  analysis_type: string
  processed: boolean
  status?: string
  text?: string
  video_url?: string
  user_id?: string
  total_score?: string
  owner_email?: string
  shared_at?: any
}

export default function SharedAnalysisViewPage() {
  const router = useRouter()
  const params = useParams()
  const { currentUser, getIdToken } = useAuth()
  const [analysis, setAnalysis] = useState<SharedAnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const shareId = params.shareId as string

  useEffect(() => {
    if (shareId && currentUser) {
      fetchSharedAnalysis()
    }
  }, [shareId, currentUser])

  const fetchSharedAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await getIdToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      console.log(`Fetching shared analysis from: ${API_BASE}/shared-analyses/${shareId}`)
      console.log(`Using token: ${token ? 'Token present' : 'No token'}`)

      const response = await fetch(`${API_BASE}/shared-analyses/${shareId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        mode: "cors",
      })

      console.log(`Response status: ${response.status}`)
      console.log(`Response headers:`, Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.log(`Error response body:`, errorText)

        if (response.status === 404) {
          throw new Error("Shared analysis not found or access denied")
        } else if (response.status === 401) {
          throw new Error("Authentication failed. Please try logging out and back in.")
        } else if (response.status === 403) {
          throw new Error("You don't have permission to view this shared analysis")
        } else {
          throw new Error(`Failed to fetch shared analysis: ${response.status} ${response.statusText}. Error: ${errorText}`)
        }
      }

      const data = await response.json()
      console.log("Received data:", data)
      setAnalysis(data)
    } catch (err: any) {
      console.error("Error fetching shared analysis:", err)

      setError(err.message || "Failed to load shared analysis")
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/shared-analyses")
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="h-full flex justify-center items-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-600">Loading shared analysis...</p>
          </div>
        </div>
      </SidebarLayout>
    )
  }

  if (error) {
    return (
      <SidebarLayout>
        <div className="h-full">
          <div className="flex justify-between items-center mb-6">
            <button onClick={handleBack} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Shared Analyses
            </button>
          </div>

          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg flex items-start">
            <AlertCircle className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-2">Error Loading Shared Analysis</h3>
              <p>{error}</p>
              <div className="mt-4">
                <button
                  onClick={fetchSharedAnalysis}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors mr-3"
                >
                  Try Again
                </button>
                <button
                  onClick={handleBack}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    )
  }

  if (!analysis) {
    return (
      <SidebarLayout>
        <div className="h-full">
          <div className="flex justify-between items-center mb-6">
            <button onClick={handleBack} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Shared Analyses
            </button>
          </div>

          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg">
            <h3 className="font-semibold mb-2">Analysis Not Found</h3>
            <p>The shared analysis you're looking for could not be found or you don't have access to view it.</p>
            <div className="mt-4">
              <button
                onClick={handleBack}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <div className="h-full">
        {/* Custom header for shared analysis */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Shared Analysis</p>
              <p className="text-xs text-blue-500">
                {analysis.owner_email && `Shared by ${analysis.owner_email}`}
                {analysis.shared_at && ` on ${new Date(analysis.shared_at.seconds ? analysis.shared_at.seconds * 1000 : analysis.shared_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>

        {/* Use the existing AnalysisDetail component */}
        <AnalysisDetail
          analysis={analysis}
          onBack={handleBack}
          // Don't allow deletion for shared analyses
          onDelete={undefined}
          isSharedView={true}
          shareId={shareId}
        />
      </div>
    </SidebarLayout>
  )
}