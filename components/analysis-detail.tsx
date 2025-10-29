"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Download, Share2, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { VideoPlayer } from "./video-player"
import { ShareAnalysisDialog } from "./share-analysis-dialog"
import { useAuth } from "@/contexts/auth-context"
import { API_BASE } from "@/lib/constants"

interface Analysis {
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
}

interface AnalysisDetailProps {
  analysis: Analysis
  onBack: () => void
  onDelete?: (id: string) => void
  isSharedView?: boolean
  shareId?: string
}

export function AnalysisDetail({ analysis, onBack, onDelete, isSharedView = false, shareId }: AnalysisDetailProps) {
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formattedAnalysis, setFormattedAnalysis] = useState<string | null>(null)
  const { currentUser, getIdToken } = useAuth()

  useEffect(() => {
    if (analysis && analysis.id) {
      fetchFormattedAnalysis()
    }
  }, [analysis])

  const fetchFormattedAnalysis = async () => {
    try {
      const token = await getIdToken()

      const response = await fetch(`${API_BASE}/analyses/${analysis.id}/formatted`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch formatted analysis: ${response.statusText}`)
      }

      const data = await response.json()
      setFormattedAnalysis(data.html || analysis.text || "")
    } catch (err) {
      console.error("Error fetching formatted analysis:", err)
      setFormattedAnalysis(analysis.text || "")
    }
  }

  const formatDate = (timestamp: string) => {
    if (!timestamp) return "Unknown"

    try {
      const year = timestamp.substring(0, 4)
      const month = timestamp.substring(4, 6)
      const day = timestamp.substring(6, 8)
      const hour = timestamp.substring(8, 10)
      const minute = timestamp.substring(10, 12)
      return `${year}/${month}/${day} ${hour}:${minute}`
    } catch (e) {
      return timestamp
    }
  }

  const handleDownloadPDF = async () => {
    try {
      setLoading(true)
      setError(null)

      const token = await getIdToken()
      if (!token) throw new Error("Authentication required")

      // For shared analyses, we might not have permission to download via regular endpoint
      // Try the regular endpoint first, and provide helpful error if it fails
      const response = await fetch(`${API_BASE}/analyses/${analysis.id}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))

        // If this is a shared analysis and we get permission denied, show helpful message
        if (isSharedView && (response.status === 403 || response.status === 404)) {
          throw new Error("PDF download is not available for shared analyses. Please ask the owner to share the PDF with you.")
        }

        throw new Error(errorData.error || `Failed to generate PDF: ${response.statusText}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.href = url
      link.download = `dance_analysis_${analysis.dance_type || "report"}.pdf`

      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      window.URL.revokeObjectURL(url)
      setLoading(false)
    } catch (err: any) {
      console.error("Error downloading PDF:", err)
      setError(`Failed to download PDF: ${err.message}`)
      setLoading(false)
    }
  }

  const handleRerunAnalysis = async () => {
    if (!window.confirm("Are you sure you want to rerun this analysis? This may take several minutes.")) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      const token = await getIdToken()

      // Create an AbortController with 10 second timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const response = await fetch(`${API_BASE}/analyses/${analysis.id}/rerun`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to rerun analysis")
        }

        alert("Analysis rerun started successfully! The analysis will be processed in the background and may take several minutes.")

        if (onBack) {
          onBack()
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === 'AbortError') {
          // Request timed out - this is actually OK for rerun since it should be async
          console.log("Rerun request timed out, but the analysis may still be processing in the background")
          alert("Analysis rerun has been initiated. It may take several minutes to complete. Please check the dashboard for updates.")

          if (onBack) {
            onBack()
          }
        } else {
          throw fetchError
        }
      }
    } catch (err: any) {
      console.error("Error rerunning analysis:", err)

      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        setError(`Failed to rerun analysis: Server connection lost. The backend may have crashed. Please check server logs and restart the backend.`)
      } else {
        setError(`Failed to rerun analysis: ${err.message}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const isOwner = currentUser && analysis.user_id === currentUser.uid
  const isProcessing = !analysis.processed

  return (
    <div className="h-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <button onClick={onBack} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Analyses
        </button>

        <div className="flex gap-2">
          {isOwner && (
            <button
              onClick={() => setShowShareDialog(true)}
              className="flex items-center px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              title="Share with others"
              disabled={loading}
            >
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </button>
          )}

          {!isSharedView && (
            <button
              onClick={handleDownloadPDF}
              className="flex items-center px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              title="Download PDF"
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-1" />
              Download PDF
            </button>
          )}

          {(isProcessing || isOwner) && (
            <button
              onClick={handleRerunAnalysis}
              className="flex items-center px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
              title="Rerun Analysis"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Rerun
            </button>
          )}

          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(analysis.id)}
              className="flex items-center px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50"
              title="Delete analysis"
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-blue-800 text-white p-6">
          <h1 className="text-2xl font-bold mb-2">Dance Analysis Report</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mt-4">
            <div>
              <p className="opacity-75 mb-1">Date:</p>
              <p className="font-medium">{formatDate(analysis.timestamp)}</p>
            </div>

            <div>
              <p className="opacity-75 mb-1">Dance Type:</p>
              <p className="font-medium">{analysis.dance_type}</p>
            </div>

            <div>
              <p className="opacity-75 mb-1">Dancers:</p>
              <p className="font-medium">{analysis.dancers}</p>
            </div>

            <div>
              <p className="opacity-75 mb-1">Analysis Type:</p>
              <p className="font-medium capitalize">
                {analysis.analysis_type === "solo"
                  ? "Solo Analysis"
                  : analysis.analysis_type === "duo"
                    ? "Duo Analysis"
                    : analysis.analysis_type === "formation"
                      ? "Formation Analysis"
                      : "Couple Analysis"}
              </p>
            </div>

            {analysis.total_score && (
              <div>
                <p className="opacity-75 mb-1">Total Score:</p>
                <p className="font-medium text-yellow-300 text-xl">{analysis.total_score}</p>
              </div>
            )}
          </div>
        </div>

        {analysis.video_url && (
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold mb-4 text-gray-700">Performance Video</h2>
            <div className="aspect-video">
              <VideoPlayer videoUrl={analysis.video_url} className="w-full h-full rounded-lg shadow" />
            </div>
          </div>
        )}

        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Analysis</h2>

          {isProcessing ? (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-lg text-gray-600 mb-2">Analysis in progress...</p>
              <p className="text-sm text-gray-500">This may take several minutes to complete.</p>
            </div>
          ) : (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{
                __html: formattedAnalysis || analysis.text || "No analysis content available.",
              }}
            />
          )}
        </div>
      </div>

      {showShareDialog && (
        <ShareAnalysisDialog
          analysisId={analysis.id}
          onClose={() => setShowShareDialog(false)}
          onSuccess={() => {
            setShowShareDialog(false)
            alert("Analysis shared successfully!")
          }}
        />
      )}
    </div>
  )
}
