"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { SidebarLayout } from "@/components/sidebar-layout"
import { Search, Users, FileText, Trash2, Eye, Globe, RefreshCw, Filter } from "lucide-react"
import { API_BASE, ADMIN_UIDS } from "@/lib/constants"

interface Analysis {
  id: string
  dance_type: string
  dancers: string
  user_id: string
  user_email: string
  user_displayName: string
  user_country: string
  user_credits: string
  timestamp: string
  processed: boolean
  total_score?: string
  analysis_type?: string
  video_url?: string
}

interface User {
  id: string
  email: string
  displayName: string
  country: string
  credits: string
  analysisCount: number
}

export default function AdminPage() {
  const [allAnalyses, setAllAnalyses] = useState<Analysis[]>([])
  const [users, setUsers] = useState<Record<string, User>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("timestamp")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [activeCountry, setActiveCountry] = useState<string | null>(null)
  const [countries, setCountries] = useState<string[]>([])
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [filterAnalysisType, setFilterAnalysisType] = useState("all")

  const { currentUser, getIdToken } = useAuth()
  const router = useRouter()

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      if (!currentUser || !ADMIN_UIDS.includes(currentUser.uid)) {
        router.push("/")
      }
    }

    checkAdmin()
  }, [currentUser, router])

  useEffect(() => {
    fetchAllAnalyses()
  }, [])

  const fetchAllAnalyses = async () => {
    try {
      setLoading(true)

      const token = await getIdToken()

      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`${API_BASE}/admin/analyses`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setAllAnalyses(data)

      // Group users and extract countries
      const usersMap: Record<string, User> = {}
      const uniqueCountries = new Set<string>()

      data.forEach((analysis: Analysis) => {
        if (analysis.user_id) {
          if (!usersMap[analysis.user_id]) {
            usersMap[analysis.user_id] = {
              id: analysis.user_id,
              email: analysis.user_email || "Unknown",
              displayName: analysis.user_displayName || "Unknown User",
              country: analysis.user_country || "Unknown",
              credits: analysis.user_credits || "0",
              analysisCount: 0,
            }

            if (analysis.user_country) {
              uniqueCountries.add(analysis.user_country)
            }
          }
          usersMap[analysis.user_id].analysisCount++
        }
      })

      setUsers(usersMap)
      setCountries(Array.from(uniqueCountries).sort())
      setError(null)
    } catch (error) {
      console.error("Error fetching analyses:", error)
      setError("Failed to load analyses: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAnalysis = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this analysis?")) {
      return
    }

    try {
      const token = await getIdToken()

      const response = await fetch(`${API_BASE}/analyses/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      setAllAnalyses(allAnalyses.filter((analysis) => analysis.id !== id))

      const updatedUsers = { ...users }
      const analysisToDelete = allAnalyses.find((a) => a.id === id)

      if (analysisToDelete && analysisToDelete.user_id && updatedUsers[analysisToDelete.user_id]) {
        updatedUsers[analysisToDelete.user_id].analysisCount--
        setUsers(updatedUsers)
      }
    } catch (error) {
      console.error("Error deleting analysis:", error)
      setError("Failed to delete analysis: " + (error as Error).message)
    }
  }

  const handleViewAnalysis = (analysis: Analysis) => {
    sessionStorage.setItem("adminViewAnalysis", JSON.stringify(analysis))
    router.push(`/admin/analysis/${analysis.id}`)
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

  const handleRerunAnalysis = async (analysisId: string) => {
    if (!window.confirm("Are you sure you want to rerun this analysis?")) {
      return
    }

    try {
      setLoading(true)
      const token = await getIdToken()

      const response = await fetch(`${API_BASE}/analyses/${analysisId}/rerun`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to rerun analysis")
      }

      alert("Analysis rerun started successfully")
      await fetchAllAnalyses()
    } catch (error) {
      console.error("Error rerunning analysis:", error)
      setError("Failed to rerun analysis: " + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const getFilteredAnalyses = () => {
    return allAnalyses
      .filter((analysis) => {
        if (activeUserId && analysis.user_id !== activeUserId) {
          return false
        }

        if (activeCountry && analysis.user_country !== activeCountry) {
          return false
        }

        if (filterAnalysisType !== "all" && analysis.analysis_type !== filterAnalysisType) {
          return false
        }

        const searchLower = searchTerm.toLowerCase()
        return (
          (analysis.dance_type && analysis.dance_type.toLowerCase().includes(searchLower)) ||
          (analysis.dancers && analysis.dancers.toLowerCase().includes(searchLower)) ||
          (analysis.user_email && analysis.user_email.toLowerCase().includes(searchLower)) ||
          (analysis.user_displayName && analysis.user_displayName.toLowerCase().includes(searchLower)) ||
          (analysis.user_country && analysis.user_country.toLowerCase().includes(searchLower))
        )
      })
      .sort((a, b) => {
        if (sortField === "timestamp") {
          return sortOrder === "desc"
            ? (b.timestamp || "").localeCompare(a.timestamp || "")
            : (a.timestamp || "").localeCompare(b.timestamp || "")
        } else if (sortField === "user") {
          const aEmail = a.user_email || ""
          const bEmail = b.user_email || ""
          return sortOrder === "desc" ? bEmail.localeCompare(aEmail) : aEmail.localeCompare(bEmail)
        } else if (sortField === "dance_type") {
          const aDance = a.dance_type || ""
          const bDance = b.dance_type || ""
          return sortOrder === "desc" ? bDance.localeCompare(aDance) : aDance.localeCompare(bDance)
        } else if (sortField === "country") {
          const aCountry = a.user_country || ""
          const bCountry = b.user_country || ""
          return sortOrder === "desc" ? bCountry.localeCompare(aCountry) : aCountry.localeCompare(bCountry)
        }
        return 0
      })
  }

  const getUsersList = () => {
    let filteredUsers = Object.values(users)

    if (activeCountry) {
      filteredUsers = filteredUsers.filter((user) => user.country === activeCountry)
    }

    return filteredUsers.sort((a, b) => b.analysisCount - a.analysisCount)
  }

  const getAnalysisCounts = () => {
    const counts = {
      couple: allAnalyses.filter((a) => a.analysis_type === "couple" || !a.analysis_type).length,
      solo: allAnalyses.filter((a) => a.analysis_type === "solo").length,
      duo: allAnalyses.filter((a) => a.analysis_type === "duo").length,
      formation: allAnalyses.filter((a) => a.analysis_type === "formation").length,
    }
    return counts
  }

  const clearAllFilters = () => {
    setActiveUserId(null)
    setActiveCountry(null)
    setSearchTerm("")
    setFilterAnalysisType("all")
    setShowFilterPanel(false)
  }

  return (
    <SidebarLayout>
      <div className="h-full">
        <h1 className="text-3xl font-bold text-blue-800 mb-6">Admin Dashboard</h1>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Users Sidebar */}
            <div className="md:col-span-1">
              {/* Filter Controls */}
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Filter className="w-5 h-5 mr-2" />
                    Filters
                  </h2>
                  <button
                    onClick={() => setShowFilterPanel(!showFilterPanel)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    {showFilterPanel ? "Hide" : "Show"}
                  </button>
                </div>

                {showFilterPanel && (
                  <div className="space-y-4">
                    {/* Analysis Type Filter */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Filter by Analysis Type</p>
                      <div className="space-y-1">
                        {["all", "couple", "solo", "duo", "formation"].map((type) => (
                          <div
                            key={type}
                            onClick={() => setFilterAnalysisType(type)}
                            className={`px-3 py-2 rounded-md cursor-pointer flex items-center justify-between text-sm ${
                              filterAnalysisType === type ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100"
                            }`}
                          >
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-2 opacity-70" />
                              {type === "all" ? "All Types" : type.charAt(0).toUpperCase() + type.slice(1)}
                            </div>
                            {type !== "all" && (
                              <div className="text-xs bg-gray-200 rounded-full px-2 py-1">
                                {getAnalysisCounts()[type as keyof ReturnType<typeof getAnalysisCounts>]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Country Filter */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Filter by Country</p>
                      <div className="max-h-48 overflow-y-auto">
                        {countries.length > 0 ? (
                          <div className="space-y-1">
                            {countries.map((country) => (
                              <div
                                key={country}
                                onClick={() => setActiveCountry(country === activeCountry ? null : country)}
                                className={`px-3 py-2 rounded-md cursor-pointer flex items-center justify-between text-sm ${
                                  country === activeCountry ? "bg-blue-100 text-blue-800" : "hover:bg-gray-100"
                                }`}
                              >
                                <div className="flex items-center">
                                  <Globe className="w-4 h-4 mr-2 opacity-70" />
                                  {country}
                                </div>
                                <div className="text-xs bg-gray-200 rounded-full px-2 py-1">
                                  {Object.values(users).filter((user) => user.country === country).length}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">No countries found</p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={clearAllFilters}
                      className="w-full py-2 px-3 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                    >
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>

              {/* Users List */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Users ({getUsersList().length})
                  </h2>
                  {(activeUserId || activeCountry) && (
                    <button
                      onClick={() => {
                        setActiveUserId(null)
                        setActiveCountry(null)
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Show All
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto">
                  {getUsersList().length > 0 ? (
                    getUsersList().map((user) => (
                      <div
                        key={user.id}
                        onClick={() => setActiveUserId(user.id === activeUserId ? null : user.id)}
                        className={`p-3 rounded-lg cursor-pointer flex items-center justify-between ${
                          user.id === activeUserId ? "bg-blue-100 border border-blue-300" : "hover:bg-gray-100"
                        }`}
                      >
                        <div className="overflow-hidden">
                          <div className="font-medium truncate">{user.displayName}</div>
                          <div className="text-sm text-gray-500 truncate">{user.email}</div>
                          <div className="text-sm text-blue-500 truncate">CREDITS: {user.credits}</div>
                          <div className="text-xs text-gray-400 flex items-center mt-1">
                            <Globe className="w-3 h-3 mr-1" />
                            {user.country || "Unknown"}
                          </div>
                        </div>
                        <div className="text-sm bg-gray-200 px-2 py-1 rounded-full">{user.analysisCount}</div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">No users found</div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-3">
              <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                  <h2 className="text-xl font-semibold text-gray-800 flex items-center flex-wrap">
                    <FileText className="w-5 h-5 mr-2" />
                    Analyses ({getFilteredAnalyses().length})
                    <div className="flex items-center ml-2 flex-wrap gap-2">
                      {activeUserId && users[activeUserId] && (
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center">
                          User: {users[activeUserId].email}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveUserId(null)
                            }}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {activeCountry && (
                        <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                          Country: {activeCountry}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveCountry(null)
                            }}
                            className="ml-1 text-green-600 hover:text-green-800"
                          >
                            ×
                          </button>
                        </span>
                      )}
                      {filterAnalysisType !== "all" && (
                        <span className="text-sm bg-purple-100 text-purple-800 px-2 py-1 rounded-full flex items-center">
                          Type: {filterAnalysisType.charAt(0).toUpperCase() + filterAnalysisType.slice(1)}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setFilterAnalysisType("all")
                            }}
                            className="ml-1 text-purple-600 hover:text-purple-800"
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </div>
                  </h2>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Sort by:</span>
                    <select
                      value={`${sortField}-${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split("-")
                        setSortField(field)
                        setSortOrder(order as "asc" | "desc")
                      }}
                      className="border rounded p-1"
                    >
                      <option value="timestamp-desc">Date (Newest)</option>
                      <option value="timestamp-asc">Date (Oldest)</option>
                      <option value="user-asc">User (A-Z)</option>
                      <option value="user-desc">User (Z-A)</option>
                      <option value="dance_type-asc">Dance Type (A-Z)</option>
                      <option value="dance_type-desc">Dance Type (Z-A)</option>
                      <option value="country-asc">Country (A-Z)</option>
                      <option value="country-desc">Country (Z-A)</option>
                    </select>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search analyses..."
                    className="w-full p-2 pl-10 border rounded-lg mb-4"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>

                {/* Analysis Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <div className="text-sm text-gray-500">Total Analyses</div>
                    <div className="text-2xl font-semibold">{allAnalyses.length}</div>
                  </div>

                  <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                    <div className="text-sm text-gray-500">Processed</div>
                    <div className="text-2xl font-semibold">{allAnalyses.filter((a) => a.processed).length}</div>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                    <div className="text-sm text-gray-500">Couple</div>
                    <div className="text-2xl font-semibold">{getAnalysisCounts().couple}</div>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <div className="text-sm text-gray-500">Solo</div>
                    <div className="text-2xl font-semibold">{getAnalysisCounts().solo}</div>
                  </div>

                  <div className="bg-pink-50 rounded-lg p-3 border border-pink-100">
                    <div className="text-sm text-gray-500">Duo/Formation</div>
                    <div className="text-2xl font-semibold">
                      {getAnalysisCounts().duo + getAnalysisCounts().formation}
                    </div>
                  </div>
                </div>
              </div>

              {/* Analyses Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="grid grid-cols-7 p-4 font-semibold border-b bg-gray-50">
                  <div className="col-span-2">Analysis</div>
                  <div>User</div>
                  <div>Date</div>
                  <div>Country</div>
                  <div>Score</div>
                  <div className="text-right">Actions</div>
                </div>

                <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
                  {getFilteredAnalyses().length > 0 ? (
                    getFilteredAnalyses().map((analysis) => (
                      <div
                        key={analysis.id}
                        className={`grid grid-cols-7 p-4 border-b hover:bg-gray-50 ${
                          !analysis.processed ? "bg-orange-50" : ""
                        }`}
                      >
                        <div className="col-span-2">
                          <div className="font-medium">{analysis.dance_type || "Unknown"}</div>
                          <div className="text-sm text-gray-600">{analysis.dancers || "Unknown dancers"}</div>
                          <div className="text-xs text-gray-500">
                            {analysis.analysis_type === "solo"
                              ? "Solo Analysis"
                              : analysis.analysis_type === "duo"
                                ? "Duo Analysis"
                                : analysis.analysis_type === "formation"
                                  ? "Formation Analysis"
                                  : "Couple Analysis"}
                          </div>
                        </div>

                        <div>
                          <div className="text-xs text-gray-600">{analysis.user_email || "Unknown"}</div>
                          <div className="text-xs text-gray-500">{analysis.user_displayName || "Unknown User"}</div>
                        </div>

                        <div className="text-sm">
                          {formatDate(analysis.timestamp)}
                          <div className="text-xs text-gray-500">
                            {analysis.processed ? "Processed" : "In Progress"}
                          </div>
                        </div>

                        <div className="text-sm flex items-center">
                          <Globe className="w-4 h-4 mr-1 text-gray-400" />
                          {analysis.user_country || "Unknown"}
                        </div>

                        <div className="text-sm">
                          {analysis.total_score ? (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                              {analysis.total_score}
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </div>

                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => handleViewAnalysis(analysis)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="View Analysis"
                          >
                            <Eye size={18} />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRerunAnalysis(analysis.id)
                            }}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Rerun Analysis"
                          >
                            <RefreshCw size={18} />
                          </button>

                          <button
                            onClick={() => handleDeleteAnalysis(analysis.id)}
                            className="p-1 text-red-600 hover:text-red-800"
                            title="Delete Analysis"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-500">No analyses found</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}
