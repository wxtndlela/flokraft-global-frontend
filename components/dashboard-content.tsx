"use client"

import { useState, useEffect } from "react"
import { Search, Upload, ChevronDown, ChevronUp, Trash2, Loader2, RefreshCw, LinkIcon } from 'lucide-react'
import { useAuth } from "@/contexts/auth-context"
import { useCredits } from "@/contexts/credits-context"
import { API_BASE, getDanceTypesByAnalysisType, ADMIN_UIDS } from "@/lib/constants"
import { AnalysisDetail } from "@/components/analysis-detail"
import Link from "next/link"

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
  scores?: any
}

export function DashboardContent() {
  const { currentUser, getIdToken } = useAuth()
  const { credits, fetchUserCredits } = useCredits()

  const [isAdmin, setIsAdmin] = useState(false)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null)
  const [insufficientCredits, setInsufficientCredits] = useState(false)

  const [maleDancerName, setMaleDancerName] = useState("")
  const [femaleDancerName, setFemaleDancerName] = useState("")
  const [selectedDanceType, setSelectedDanceType] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [youtubeLink, setYoutubeLink] = useState("")
  const [uploadMethod, setUploadMethod] = useState<"file" | "youtube">("file")

  const [analysisType, setAnalysisType] = useState("couple")
  const [serverConnected, setServerConnected] = useState(true)
  const [consecutiveFailures, setConsecutiveFailures] = useState(0)

  useEffect(() => {
    setSelectedDanceType("")
  }, [analysisType])

  useEffect(() => {
    fetchAnalyses()
    ensureUserDocument()
    const interval = setInterval(fetchAnalyses, 3000)
    return () => clearInterval(interval)
  }, [analysisType])

  useEffect(() => {
    const checkAdmin = () => {
      if (currentUser) {
        setIsAdmin(ADMIN_UIDS.includes(currentUser.uid))
      } else {
        setIsAdmin(false)
      }
    }

    checkAdmin()
  }, [currentUser])

  const ensureUserDocument = async () => {
    if (!currentUser) return

    try {
      const token = await getIdToken()
      if (!token) return

      const response = await fetch(`${API_BASE}/auth/verify-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken: token,
        }),
      })

      if (!response.ok) {
        console.error("Failed to verify token and ensure user document")
      }
    } catch (error) {
      console.error("Error ensuring user document:", error)
    }
  }

  const handleRerunAnalysis = async (analysisId: string) => {
    console.log(`[RERUN] Starting rerun for analysis ID: ${analysisId}`)

    try {
      setLoading(true)
      setError(null)

      const token = await getIdToken()
      console.log(`[RERUN] Got auth token: ${token ? 'yes' : 'no'}`)

      if (!token) {
        throw new Error("Authentication required")
      }

      // Create an AbortController with 10 second timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      console.log(`[RERUN] Sending POST request to: ${API_BASE}/analyses/${analysisId}/rerun`)

      try {
        const response = await fetch(`${API_BASE}/analyses/${analysisId}/rerun`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)
        console.log(`[RERUN] Response status: ${response.status}`)

        const data = await response.json()
        console.log(`[RERUN] Response data:`, data)

        if (!response.ok) {
          throw new Error(data.error || "Failed to rerun analysis")
        }

        await fetchAnalyses()

        alert("Analysis rerun started successfully! The analysis will be processed in the background and may take several minutes.")
      } catch (fetchError: any) {
        clearTimeout(timeoutId)

        if (fetchError.name === 'AbortError') {
          // Request timed out - this is actually OK for rerun since it should be async
          console.log("[RERUN] Request timed out after 10 seconds (this may be normal if processing in background)")
          await fetchAnalyses()
          alert("Analysis rerun has been initiated. It may take several minutes to complete. Please refresh if you don't see updates.")
        } else {
          console.error("[RERUN] Fetch error:", fetchError)
          throw fetchError
        }
      }
    } catch (error: any) {
      console.error("[RERUN] Error:", error)

      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        setError(`Failed to rerun analysis: Server connection lost. The backend may have crashed. Please check server logs and restart the backend.`)
      } else {
        setError(`Failed to rerun analysis: ${error.message}`)
      }
    } finally {
      setLoading(false)
      console.log("[RERUN] Finished rerun handler")
    }
  }


  const fetchAnalyses = async () => {
    try {
      let headers: any = {
        Accept: "application/json",
        "Content-Type": "application/json",
      }

      if (currentUser) {
        const token = await getIdToken()
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
          console.log("Using auth token:", token.substring(0, 20) + "...")
        } else {
          console.warn("No auth token available")
        }
      }

      let url = `${API_BASE}/analyses?analysis_type=${analysisType}`

      if (currentUser) {
        url += `&user_id=${currentUser.uid}`
      }

      console.log("Fetching analyses from:", url)
      console.log("Request headers:", headers)

      const response = await fetch(url, {
        headers: headers,
        mode: "cors",
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()

      const filteredData = data.filter(
        (analysis: Analysis) => analysis.analysis_type === analysisType || (analysisType === "couple" && !analysis.analysis_type)
      )

      setAnalyses(filteredData)
      setError(null)
      setServerConnected(true)
      setConsecutiveFailures(0)
    } catch (error: any) {
      console.error("Fetch error:", error)

      setConsecutiveFailures(prev => prev + 1)

      // Mark server as disconnected after 3 consecutive failures
      if (consecutiveFailures >= 2) {
        setServerConnected(false)
      }

      let errorMessage = "Failed to load analyses"

      if (error.name === 'AbortError') {
        errorMessage = "Request timed out after 30 seconds. The server might be slow - please try again."
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = "Backend server is currently unavailable. Please check if the server is running or try again later."
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = "Unable to connect to the backend server. Please check your connection or try again later."
      } else if (error.message.includes('CORS')) {
        errorMessage = "Server access issue. Please try refreshing the page."
      } else if (error.message.includes('NetworkError')) {
        errorMessage = "Network connection failed. Please check if the backend server is accessible."
      } else if (error.message) {
        errorMessage = `${error.message}`
      }

      // Only show error if server is disconnected
      if (!serverConnected) {
        setError(errorMessage)
      }
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    const maxSize = 100 * 1024 * 1024

    if (file && file.size > maxSize) {
      setError("File size must be less than 100MB")
      setSelectedFile(null)
      event.target.value = ""
      return
    }

    setError(null)
    setSelectedFile(file || null)
  }

  const submitAnalysis = async () => {
    if (analysisType === "couple") {
      if (!maleDancerName.trim()) {
        setError("Please enter the male dancer's name")
        return
      }
      if (!femaleDancerName.trim()) {
        setError("Please enter the female dancer's name")
        return
      }
    } else {
      if (!maleDancerName.trim()) {
        setError("Please enter the dancer's name")
        return
      }
    }

    if (!selectedDanceType) {
      setError("Please select a dance type")
      return
    }

    try {
      setLoading(true)
      setUploadProgress(0)
      setInsufficientCredits(false)

      let headers: any = {}
      if (currentUser) {
        const token = await getIdToken()
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }
      }

      if (uploadMethod === "file") {
        if (!selectedFile) {
          setError("Please select a video file")
          setLoading(false)
          return
        }

        const formData = new FormData()
        formData.append("video", selectedFile)

        if (analysisType === "couple") {
          formData.append("dancers", `Man: ${maleDancerName}, Lady: ${femaleDancerName}`)
        } else if (analysisType === "solo") {
          formData.append("dancers", `Dancer: ${maleDancerName}`)
        } else if (analysisType === "formation") {
          formData.append("dancers", `Formation: ${maleDancerName}`)
        } else {
          formData.append("dancers", `Duo: ${maleDancerName}`)
        }

        formData.append("dance_type", selectedDanceType)
        formData.append("analysis_type", analysisType)

        const xhr = new XMLHttpRequest()

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100)
            setUploadProgress(percentComplete)
          }
        }

        xhr.onload = async () => {
          if (xhr.status === 200) {
            resetForm()
            await fetchAnalyses()
          } else if (xhr.status === 400) {
            try {
              const response = JSON.parse(xhr.responseText)
              if (response.error && response.error.includes("Insufficient credits")) {
                setInsufficientCredits(true)
              } else {
                setError(response.error || "Upload failed")
              }
            } catch (e) {
              setError("Upload failed")
            }
          } else {
            setError("Upload failed")
          }
          setLoading(false)
        }

        xhr.onerror = () => {
          setError("Upload failed")
          setLoading(false)
        }

        xhr.open("POST", `${API_BASE}/analyze`, true)

        if (headers["Authorization"]) {
          xhr.setRequestHeader("Authorization", headers["Authorization"])
        }

        xhr.send(formData)
      } else {
        if (!youtubeLink.trim()) {
          setError("Please enter a YouTube URL")
          setLoading(false)
          return
        }

        const youtubeUrlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/
        if (!youtubeUrlPattern.test(youtubeLink)) {
          setError("Please enter a valid YouTube URL")
          setLoading(false)
          return
        }

        const response = await fetch(`${API_BASE}/analyze-youtube`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            youtube_url: youtubeLink,
            dancers:
              analysisType === "couple"
                ? `Man: ${maleDancerName}, Lady: ${femaleDancerName}`
                : `Dancer: ${maleDancerName}`,
            dance_type: selectedDanceType,
            analysis_type: analysisType,
          }),
        })

        const data = await response.json()
        if (!response.ok) {
          if (data.error && data.error.includes("Insufficient credits")) {
            setInsufficientCredits(true)
          } else {
            throw new Error(data.error || "YouTube download failed")
          }
        } else {
          await fetchUserCredits()
          resetForm()
          await fetchAnalyses()
        }
        setLoading(false)
      }
    } catch (error: any) {
      setError(error.message || "Upload failed")
      setLoading(false)
    }
  }

  const resetForm = () => {
    setMaleDancerName("")
    setFemaleDancerName("")
    setSelectedDanceType("")
    setSelectedFile(null)
    setYoutubeLink("")
    setUploadProgress(0)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this analysis?")) return

    try {
      let headers: any = {
        Accept: "application/json",
        "Content-Type": "application/json",
      }

      if (currentUser) {
        const token = await getIdToken()
        if (token) {
          headers["Authorization"] = `Bearer ${token}`
        }
      }

      const response = await fetch(`${API_BASE}/analyses/${id}`, {
        method: "DELETE",
        headers: headers,
        mode: "cors",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Delete failed")
      }

      await fetchAnalyses()
    } catch (error: any) {
      setError("Delete failed: " + error.message)
    }
  }

  const formatDate = (timestamp: string) => {
    const year = timestamp.substring(0, 4)
    const month = timestamp.substring(4, 6)
    const day = timestamp.substring(6, 8)
    const hour = timestamp.substring(8, 10)
    const minute = timestamp.substring(10, 12)
    return `${year}/${month}/${day} ${hour}:${minute}`
  }

  const getStatusStyle = (status?: string, processed?: boolean) => {
    if (status === "processing" || status === "Analysis in progress..") {
      return "bg-orange-100 border-l-4 border-orange-500"
    }
    return processed ? "bg-green-50 border-l-4 border-green-500" : ""
  }

  const filteredAndSortedAnalyses = analyses
    .filter(
      (analysis) =>
        analysis.dance_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        analysis.dancers?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      return sortOrder === "desc" ? b.timestamp.localeCompare(a.timestamp) : a.timestamp.localeCompare(b.timestamp)
    })

  if (selectedAnalysis) {
    return (
      <AnalysisDetail
        analysis={selectedAnalysis}
        onBack={() => setSelectedAnalysis(null)}
        onDelete={handleDelete}
      />
    )
  }

  const extractScores = (text?: string) => {
    if (!text) return null

    const totalScoreRegex = /TOTAL\s+SCORE:?\s*(?:=\s*)?(\d+\.?\d*)/i
    const totalMatch = text.match(totalScoreRegex)

    if (totalMatch && totalMatch[1]) {
      return <span className="font-medium text-green-600">Total Score: {parseFloat(totalMatch[1]).toFixed(1)}</span>
    }

    return null
  }

  const getAnalysisStatus = (analysis: Analysis) => {
    if (analysis.processed) {
      return {
        label: "Completed",
        color: "green",
        bgColor: "bg-green-100",
        textColor: "text-green-800",
        dotColor: "bg-green-500",
        animate: false
      }
    }

    // Check for failed status
    if (analysis.status && analysis.status.toLowerCase().includes("failed")) {
      return {
        label: "Failed",
        color: "red",
        bgColor: "bg-red-100",
        textColor: "text-red-800",
        dotColor: "bg-red-500",
        animate: false
      }
    }

    // Processing or pending
    return {
      label: "Processing",
      color: "yellow",
      bgColor: "bg-yellow-100",
      textColor: "text-yellow-800",
      dotColor: "bg-yellow-500",
      animate: true
    }
  }

  return (
    <div className="h-full">
      {/* Server Connection Warning */}
      {!serverConnected && (
        <div className="bg-orange-100 border-l-4 border-orange-500 text-orange-700 px-4 py-3 rounded mb-6 flex items-center">
          <svg className="w-5 h-5 mr-3 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <p className="font-bold">Backend Server Disconnected</p>
            <p className="text-sm">The backend server appears to be down or unreachable. Retrying automatically... Please check server logs.</p>
          </div>
        </div>
      )}

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

      {insufficientCredits && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-6">
          <div className="font-bold mb-1">Insufficient Credits</div>
          <p>You don't have enough credits to perform this analysis. Please purchase more credits.</p>
          <div className="mt-2">
            <Link
              href="/credits"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              Purchase Credits
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6 md:mb-8">
        <div className="mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-700">Select Analysis Type</label>
          <select
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
            className="w-full p-2 border rounded-lg bg-white"
          >
            <option value="couple">Couple Analysis</option>
            <option value="solo">Solo Analysis</option>
            <option value="duo">Duo Analysis</option>
            <option value="formation">Formation Analysis</option>
          </select>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {analysisType === "couple"
              ? "Couple Dance Analysis"
              : analysisType === "solo"
                ? "Solo Dance Analysis"
                : analysisType === "formation"
                  ? "Formation Dance Analysis"
                  : "Duo Dance Analysis"}
          </h1>
          <p className="text-gray-600">
            {analysisType === "couple"
              ? "Analyze a dance couple using Technical Quality, Movement to Music, Partnering Skill, Choreography & Presentation"
              : analysisType === "solo"
                ? "Analyze an individual dancer focusing on Technique, Creativity"
                : analysisType === "formation"
                  ? "Analyze a formation dance focusing on Synchronization, Choreography, and Team Performance"
                  : "Analyze a duo performance focusing on Synchronization, Technique and Creativity"}
          </p>
          <p className="text-sm text-blue-600 mt-1">Each analysis costs 5 credits.</p>
        </div>

        {analysisType === "couple" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Male Dancer Name *</label>
              <input
                type="text"
                value={maleDancerName}
                onChange={(e) => setMaleDancerName(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="Enter male dancer's name"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Female Dancer Name *</label>
              <input
                type="text"
                value={femaleDancerName}
                onChange={(e) => setFemaleDancerName(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="Enter female dancer's name"
                required
                disabled={loading}
              />
            </div>
          </div>
        ) : analysisType === "solo" ? (
          <div className="mt-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Dancer Name *</label>
            <input
              type="text"
              value={maleDancerName}
              onChange={(e) => setMaleDancerName(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder="Enter dancer's name"
              required
              disabled={loading}
            />
          </div>
        ) : analysisType === "formation" ? (
          <div className="mt-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Formation Name *</label>
            <input
              type="text"
              value={maleDancerName}
              onChange={(e) => setMaleDancerName(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder="Enter formation name"
              required
              disabled={loading}
            />
          </div>
        ) : (
          <div className="mt-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Duo Name *</label>
            <input
              type="text"
              value={maleDancerName}
              onChange={(e) => setMaleDancerName(e.target.value)}
              className="w-full p-2 border rounded-lg"
              placeholder="Enter duo name"
              required
              disabled={loading}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Dance Type *</label>
            <select
              value={selectedDanceType}
              onChange={(e) => setSelectedDanceType(e.target.value)}
              className="w-full p-2 border rounded-lg"
              required
              disabled={loading}
            >
              <option value="">Select Dance Type</option>
              {getDanceTypesByAnalysisType(analysisType).map((dance) => (
                <option key={dance} value={dance}>
                  {dance}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">Upload Method</label>
            <div className="flex gap-4 mb-2">
              <button
                onClick={() => setUploadMethod("file")}
                className={`px-4 py-2 rounded ${uploadMethod === "file" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                disabled={loading}
              >
                <Upload className="w-4 h-4 inline mr-1" />
                Upload File
              </button>
              <button
                onClick={() => setUploadMethod("youtube")}
                className={`px-4 py-2 rounded ${uploadMethod === "youtube" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
                disabled={loading}
              >
                <LinkIcon className="w-4 h-4 inline mr-1" />
                YouTube Link
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          {uploadMethod === "file" ? (
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">Video File *</label>
              <label className="flex items-center justify-center w-full p-2 border-2 border-dashed rounded-lg cursor-pointer hover:border-blue-500">
                <input
                  type="file"
                  className="hidden"
                  accept="video/mp4,video/quicktime"
                  onChange={handleFileUpload}
                  disabled={loading}
                />
                <div className="text-center">
                  <Upload className="w-6 h-6 mb-1 mx-auto text-gray-500" />
                  <span className="text-gray-600 text-sm">{selectedFile ? selectedFile.name : "Click to upload video"}</span>
                  <p className="text-xs text-gray-500 mt-1">MP4 or MOV, max 100MB</p>
                </div>
              </label>
            </div>
          ) : (
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">YouTube URL *</label>
              <input
                type="text"
                value={youtubeLink}
                onChange={(e) => setYoutubeLink(e.target.value)}
                className="w-full p-2 border rounded-lg"
                placeholder="https://www.youtube.com/watch?v=..."
                required
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Enter full YouTube video URL</p>
            </div>
          )}
        </div>

        {loading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
            </div>
            <div className="text-center text-sm text-gray-600 mt-2">
              {uploadMethod === "youtube" ? "Processing YouTube video..." : `${uploadProgress}% Uploaded`}
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-center">
          <button
            onClick={submitAnalysis}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadMethod === "youtube" ? "Processing..." : "Uploading..."}
              </>
            ) : (
              "Submit Analysis"
            )}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-1">
            {analysisType === "couple"
              ? "Couple Dance Analyses"
              : analysisType === "solo"
                ? "Solo Dance Analyses"
                : analysisType === "formation"
                  ? "Formation Dance Analyses"
                  : "Duo Dance Analyses"}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <input
              type="text"
              placeholder={`Search ${analysisType} analyses...`}
              className="w-full p-2 pl-10 border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
          </div>
          <button
            onClick={() => setSortOrder((order) => (order === "desc" ? "asc" : "desc"))}
            className="px-4 py-2 border rounded-lg flex items-center gap-2 hover:bg-gray-50 whitespace-nowrap"
          >
            Date
            {sortOrder === "desc" ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="grid grid-cols-1 p-4 font-semibold border-b">
          <div className="flex justify-between items-center">
            <div>Date</div>
            <div>Dance Type</div>
          </div>
        </div>

        {filteredAndSortedAnalyses.length > 0 ? (
          filteredAndSortedAnalyses.map((analysis) => (
            <div
              key={analysis.id}
              onClick={() => setSelectedAnalysis(analysis)}
              className={`${getStatusStyle(analysis.status, analysis.processed)} border-b hover:bg-gray-50 cursor-pointer`}
            >
              <div className="grid grid-cols-1 p-4 gap-2">
                <div className="flex justify-between items-center">
                  <div>{formatDate(analysis.timestamp)}</div>
                  <div>{analysis.dance_type}</div>
                </div>
                <div className="flex flex-col">
                  <div>
                    {analysis.analysis_type === "solo"
                      ? analysis.dancers && analysis.dancers.includes("Dancer:")
                        ? analysis.dancers
                        : `Dancer: ${analysis.dancers.replace(/Man: |Lady: |Unknown, /g, "")}`
                      : analysis.analysis_type === "duo"
                        ? analysis.dancers && analysis.dancers.includes("Duo:")
                          ? analysis.dancers
                          : `Duo: ${analysis.dancers.replace(/Man: |Lady: |Dancer: |Unknown, /g, "")}`
                        : analysis.analysis_type === "formation"
                          ? analysis.dancers && analysis.dancers.includes("Formation:")
                            ? analysis.dancers
                            : `Formation: ${analysis.dancers.replace(/Man: |Lady: |Dancer: |Duo: |Unknown, /g, "")}`
                          : analysis.dancers}
                  </div>

                  {analysis.processed && (
                    <div className="text-sm text-gray-600 mt-1">
                      {analysis.total_score && (
                        <span className="font-medium text-green-600">Total Score: {analysis.total_score}</span>
                      )}

                      {!analysis.total_score && analysis.text && extractScores(analysis.text)}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-1 items-center">
                    {/* Status Indicator */}
                    {(() => {
                      const status = getAnalysisStatus(analysis)
                      return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.textColor}`}>
                          <span className={`w-2 h-2 mr-1.5 rounded-full ${status.dotColor} ${status.animate ? 'animate-pulse' : ''}`}></span>
                          {status.label}
                        </span>
                      )
                    })()}

                    {(!analysis.processed || isAdmin) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRerunAnalysis(analysis.id)
                        }}
                        className="px-3 py-1 text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        title={isAdmin ? "Rerun analysis (admin)" : "Rerun stuck analysis"}
                      >
                        <RefreshCw className="w-4 h-4" />
                        Rerun
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(analysis.id)
                      }}
                      className="px-3 py-1 text-red-600 hover:text-red-800 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500">
            {analyses.length === 0 ? `No ${analysisType} analyses found` : "No matches found for your search"}
          </div>
        )}
      </div>

      <div className="w-full p-4 mt-8 border-t text-xs text-gray-500">
        <div className="flex justify-between">
          <a
            href="https://novosense.africa/flokraft/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors"
          >
            Privacy Policy
          </a>
          <a
            href="https://novosense.africa/flokraft/deletion.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors"
          >
            Data Deletion
          </a>
        </div>
        <div className="mt-2 text-center">© {new Date().getFullYear()} Flokraft</div>
      </div>
    </div>
  )
}
