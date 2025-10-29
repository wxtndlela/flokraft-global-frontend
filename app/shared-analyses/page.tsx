"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SidebarLayout } from "@/components/sidebar-layout"
import {
  Clock,
  Eye,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  SortAsc,
  SortDesc,
  AlertCircle,
} from "lucide-react"
import { API_BASE } from "@/lib/constants"

interface SharedAnalysis {
  share_id: string
  dance_type: string
  dancers: string
  owner_email: string
  analysis_type?: string
  shared_at: any
}

export default function SharedAnalysesPage() {
  const { currentUser, getIdToken } = useAuth()
  const router = useRouter()
  const [sharedAnalyses, setSharedAnalyses] = useState<SharedAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterOwner, setFilterOwner] = useState("")
  const [filterType, setFilterType] = useState("all")

  const [uniqueOwners, setUniqueOwners] = useState<string[]>([])

  useEffect(() => {
    fetchSharedAnalyses()
  }, [currentUser])

  useEffect(() => {
    if (sharedAnalyses.length > 0) {
      const owners = [...new Set(sharedAnalyses.map((analysis) => analysis.owner_email))]
      setUniqueOwners(owners)
    }
  }, [sharedAnalyses])

  const fetchSharedAnalyses = async () => {
    try {
      setLoading(true)

      const token = await getIdToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`${API_BASE}/shared-analyses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setSharedAnalyses(data)
      setError(null)
    } catch (error) {
      console.error("Failed to fetch shared analyses:", error)
      setError("Failed to load shared analyses")
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "Unknown"

    if (timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000)
      return date.toLocaleDateString() + " " + date.toLocaleTimeString()
    }

    return new Date(timestamp).toLocaleDateString()
  }

  const handleViewAnalysis = (analysis: SharedAnalysis) => {
    router.push(`/shared/${analysis.share_id}`)
  }

  const handleDeleteShared = async (analysis: SharedAnalysis, event: React.MouseEvent) => {
    if (event) {
      event.stopPropagation()
    }

    if (
      !window.confirm(
        `Are you sure you want to remove "${analysis.dance_type}" shared by ${analysis.owner_email} from your shared list?`,
      )
    ) {
      return
    }

    try {
      setIsDeleting(true)

      const token = await getIdToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`${API_BASE}/shared-analyses/${analysis.share_id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to remove shared analysis: ${response.statusText}`)
      }

      setSharedAnalyses((prevAnalyses) => prevAnalyses.filter((a) => a.share_id !== analysis.share_id))
    } catch (error) {
      console.error("Error removing shared analysis:", error)
      setError(`Failed to remove shared analysis: ${(error as Error).message}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const resetFilters = () => {
    setSearchTerm("")
    setFilterOwner("")
    setFilterType("all")
    setSortOrder("desc")
  }

  const getFilteredAnalyses = () => {
    return sharedAnalyses
      .filter((analysis) => {
        const searchMatch =
          !searchTerm ||
          (analysis.dance_type && analysis.dance_type.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (analysis.dancers && analysis.dancers.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (analysis.owner_email && analysis.owner_email.toLowerCase().includes(searchTerm.toLowerCase()))

        const ownerMatch = !filterOwner || analysis.owner_email === filterOwner

        const typeMatch = filterType === "all" || analysis.analysis_type === filterType

        return searchMatch && ownerMatch && typeMatch
      })
      .sort((a, b) => {
        if (a.shared_at && b.shared_at) {
          if (a.shared_at.seconds && b.shared_at.seconds) {
            return sortOrder === "desc"
              ? b.shared_at.seconds - a.shared_at.seconds
              : a.shared_at.seconds - b.shared_at.seconds
          }

          const dateA = new Date(a.shared_at)
          const dateB = new Date(b.shared_at)
          return sortOrder === "desc" ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime()
        }
        return 0
      })
  }

  const getAnalysisTypeLabel = (type?: string) => {
    switch (type) {
      case "solo":
        return "Solo"
      case "duo":
        return "Duo"
      case "formation":
        return "Formation"
      default:
        return "Couple"
    }
  }

  const filteredAnalyses = getFilteredAnalyses()

  return (
    <SidebarLayout>
      <div className="h-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Shared With Me</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading shared analyses...</span>
          </div>
        ) : sharedAnalyses.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-gray-500 mb-2">No analyses have been shared with you yet.</div>
            <p className="text-sm text-gray-400">
              When other users share their analyses with you, they will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Search and Filter Bar */}
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                <div className="relative w-full md:w-2/3">
                  <input
                    type="text"
                    placeholder="Search by dance type, dancers, or owner..."
                    className="w-full p-2 pl-10 border rounded-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button
                    onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                    className="flex items-center px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                    title={sortOrder === "desc" ? "Newest First" : "Oldest First"}
                  >
                    {sortOrder === "desc" ? (
                      <>
                        <SortDesc className="w-4 h-4 mr-1" />
                        Newest
                      </>
                    ) : (
                      <>
                        <SortAsc className="w-4 h-4 mr-1" />
                        Oldest
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
                  >
                    <Filter className="w-4 h-4 mr-1" />
                    Filters
                    {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="bg-gray-50 p-4 rounded-lg border mt-2">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-1/3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Analysis Type</label>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="all">All Types</option>
                        <option value="couple">Couple</option>
                        <option value="solo">Solo</option>
                        <option value="duo">Duo</option>
                        <option value="formation">Formation</option>
                      </select>
                    </div>

                    <div className="w-full md:w-1/3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Shared By</label>
                      <select
                        value={filterOwner}
                        onChange={(e) => setFilterOwner(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      >
                        <option value="">All Owners</option>
                        {uniqueOwners.map((owner) => (
                          <option key={owner} value={owner}>
                            {owner}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-full md:w-1/3 flex items-end">
                      <button
                        onClick={resetFilters}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredAnalyses.length} of {sharedAnalyses.length} analyses
                {searchTerm && <span> matching &quot;{searchTerm}&quot;</span>}
                {filterOwner && <span> from {filterOwner}</span>}
                {filterType !== "all" && <span> of type {getAnalysisTypeLabel(filterType)}</span>}
              </div>
            </div>

            {/* Analyses List */}
            <div className="bg-white rounded-lg shadow">
              <div className="grid grid-cols-4 p-4 font-semibold border-b">
                <div>Analysis</div>
                <div>Shared By</div>
                <div>Date Shared</div>
                <div className="text-right">Actions</div>
              </div>

              {filteredAnalyses.length > 0 ? (
                <div className="divide-y">
                  {filteredAnalyses.map((analysis) => (
                    <div
                      key={analysis.share_id}
                      className="grid grid-cols-4 p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleViewAnalysis(analysis)}
                    >
                      <div className="flex items-start">
                        <div className="flex-1">
                          <div className="font-medium">{analysis.dance_type || "Unknown"}</div>
                          <div className="text-sm text-gray-600">{analysis.dancers || "Unknown dancers"}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                              {getAnalysisTypeLabel(analysis.analysis_type || "couple")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 flex items-center">{analysis.owner_email || "Unknown"}</div>

                      <div className="text-sm text-gray-600 flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDate(analysis.shared_at)}
                      </div>

                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleViewAnalysis(analysis)
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="View Analysis"
                        >
                          <Eye className="w-5 h-5" />
                        </button>

                        <button
                          onClick={(e) => handleDeleteShared(analysis, e)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Remove from Shared"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No analyses found matching your filters
                  <div className="mt-2">
                    <button onClick={resetFilters} className="text-blue-600 hover:text-blue-800 text-sm underline">
                      Reset Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  )
}