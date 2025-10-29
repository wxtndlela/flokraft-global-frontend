"use client"
import { useState, useEffect } from "react"
import { X, Search, Send, AlertCircle, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { API_BASE } from "@/lib/constants"

interface ShareAnalysisDialogProps {
  analysisId: string
  onClose: () => void
  onSuccess: () => void
}

interface User {
  id: string
  email: string
  displayName?: string
}

export function ShareAnalysisDialog({ analysisId, onClose, onSuccess }: ShareAnalysisDialogProps) {
  const [recipientEmail, setRecipientEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)

  const { getIdToken } = useAuth()

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains("modal-backdrop")) {
        onClose()
      }
    }

    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [onClose])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [onClose])

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm.length >= 3) {
        searchUsers()
      } else {
        setSearchResults([])
      }
    }, 500)

    return () => clearTimeout(delaySearch)
  }, [searchTerm])

  const searchUsers = async () => {
    if (searchTerm.length < 3) return

    try {
      setSearching(true)
      setError(null)

      const token = await getIdToken()

      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`${API_BASE}/user/search?email=${encodeURIComponent(searchTerm)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Search failed")
      }

      const data = await response.json()
      setSearchResults(data)
    } catch (err: any) {
      console.error("User search error:", err)
      setError(err.message || "Failed to search for users")
    } finally {
      setSearching(false)
    }
  }

  const handleShare = async () => {
    if (!recipientEmail) {
      setError("Please enter a recipient email")
      return
    }

    try {
      setLoading(true)
      setError(null)

      const token = await getIdToken()

      if (!token) {
        throw new Error("Authentication required")
      }

      const response = await fetch(`${API_BASE}/analyses/${analysisId}/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient_email: recipientEmail,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Sharing failed")
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err: any) {
      console.error("Sharing error:", err)
      setError(err.message || "Failed to share analysis")
    } finally {
      setLoading(false)
    }
  }

  const selectUser = (user: User) => {
    setRecipientEmail(user.email)
    setSearchResults([])
    setSearchTerm(user.email)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 modal-backdrop">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Share Analysis</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Email</label>

          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for a user by email"
              className="w-full p-2 pl-10 border rounded-lg"
            />
            {searching ? (
              <Loader2 className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-lg max-h-40 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => selectUser(user)}
                  className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                >
                  <div className="font-medium">{user.displayName || user.email}</div>
                  <div className="text-sm text-gray-600">{user.email}</div>
                </div>
              ))}
            </div>
          )}

          {searchTerm.length >= 3 && searchResults.length === 0 && !searching && (
            <div className="mt-2 text-sm text-gray-500">No users found matching "{searchTerm}"</div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handleShare}
            disabled={loading || !recipientEmail}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center disabled:bg-gray-400"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sharing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Share
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
