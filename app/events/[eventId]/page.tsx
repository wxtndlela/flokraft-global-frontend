"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import {
  Trophy,
  Calendar,
  Users,
  ArrowLeft,
  MapPin,
  AlertCircle,
  Clock,
  Award,
  FileText,
  DollarSign
} from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { SidebarLayout } from "@/components/sidebar-layout"
import { API_BASE } from "@/lib/constants"

interface EventDetail {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  entries_count: number
  country_restriction: boolean
  allowed_countries?: string[]
  location?: string
  organizer?: string
  entry_fee?: number
  rules?: string
  categories?: string[]
  max_participants?: number
  status: string
}

interface EventEntry {
  id: string
  user_id: string
  event_id: string
  entered_at: string
  user_email: string
  user_country?: string
  analysis_id?: string
  dance_type?: string
  dancers?: string
  total_score?: number
  rank?: number
  video_url?: string
}

export default function EventDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { currentUser, getIdToken } = useAuth()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [entries, setEntries] = useState<EventEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [userEntry, setUserEntry] = useState<EventEntry | null>(null)

  const eventId = params.eventId as string

  useEffect(() => {
    if (eventId) {
      fetchEventDetails()
      fetchEventEntries()
    }
  }, [eventId])

  const fetchEventDetails = async () => {
    try {
      setLoading(true)
      setError(null)

      console.log(`Fetching events list to find event: ${eventId}`)

      // Fetch all events and find the specific one
      const response = await fetch(`${API_BASE}/events`)

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`)
      }

      const events = await response.json()
      console.log("Events received:", events)

      // Find the specific event by ID
      const eventDetail = events.find((event: any) => event.id === eventId)

      if (!eventDetail) {
        throw new Error("Event not found")
      }

      console.log("Event details found:", eventDetail)

      // Convert the event data to match our interface
      const formattedEvent: EventDetail = {
        id: eventDetail.id,
        name: eventDetail.name,
        description: eventDetail.description,
        start_date: eventDetail.start_date,
        end_date: eventDetail.end_date,
        entries_count: eventDetail.entries_count || 0,
        country_restriction: eventDetail.country_restriction || false,
        allowed_countries: eventDetail.allowed_countries || [],
        entry_fee: eventDetail.entry_fee || 2,
        status: eventDetail.status || 'active',
        max_participants: eventDetail.max_entries || undefined,
        organizer: eventDetail.created_by || undefined,
        categories: eventDetail.dance_type ? [eventDetail.dance_type] : [],
        rules: `Analysis Type: ${eventDetail.analysis_type}\nDance Type: ${eventDetail.dance_type || 'All'}`
      }

      setEvent(formattedEvent)
    } catch (err: any) {
      console.error("Error fetching event details:", err)
      setError(err.message || "Failed to load event details")
    } finally {
      setLoading(false)
    }
  }

  const fetchEventEntries = async () => {
    try {
      if (!currentUser) return

      const token = await getIdToken()
      if (!token) return

      const response = await fetch(`${API_BASE}/events/${eventId}/entries`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        console.log("Event entries response:", data)

        // The API returns an object with 'entries' array, not a direct array
        const entriesArray = Array.isArray(data) ? data : (data.entries || [])
        setEntries(entriesArray)

        // Check if current user is already registered
        const userEntry = entriesArray.find((entry: EventEntry) => entry.user_id === currentUser.uid)
        setUserEntry(userEntry || null)

        console.log("User registration status:", userEntry ? "Registered" : "Not registered")
      }
    } catch (err) {
      console.error("Error fetching event entries:", err)
    }
  }

  const handleRegistration = async () => {
    if (!currentUser || !event) return

    try {
      setIsRegistering(true)
      setError(null)

      const token = await getIdToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      console.log(`Registering for event: ${eventId}`)
      console.log("Registration payload:", { event_id: eventId, user_id: currentUser.uid })

      const response = await fetch(`${API_BASE}/events/${eventId}/entries`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: eventId,
          user_id: currentUser.uid
        })
      })

      console.log(`Registration response status: ${response.status}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Registration failed:", errorData)
        throw new Error(errorData.error || errorData.message || `Registration failed: ${response.statusText}`)
      }

      const registrationResponse = await response.json()
      console.log("Registration response:", registrationResponse)

      // Handle the response - it might be the entry directly or wrapped in an object
      const newEntry = registrationResponse.entry || registrationResponse
      setUserEntry(newEntry)

      // Refresh entries list
      await fetchEventEntries()

      alert("Successfully registered for the event!")
    } catch (err: any) {
      console.error("Registration error:", err)
      setError(err.message || "Failed to register for event")
    } finally {
      setIsRegistering(false)
    }
  }

  const handleBack = () => {
    router.push("/events")
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCountryRestriction = (event: EventDetail) => {
    if (!event.country_restriction || event.allowed_countries?.includes("all")) {
      return "Open to all countries"
    }

    const countries = event.allowed_countries || []
    if (countries.length === 0) {
      return "Open to all countries"
    } else if (countries.length === 1) {
      return `${countries[0]} only`
    } else if (countries.length <= 3) {
      return `${countries.join(", ")} only`
    } else {
      return `${countries.length} countries`
    }
  }

  const getEventStatus = (event: EventDetail) => {
    const now = new Date()
    const startDate = new Date(event.start_date)
    const endDate = new Date(event.end_date)

    if (now < startDate) {
      return { status: "upcoming", label: "Upcoming", color: "blue" }
    } else if (now >= startDate && now <= endDate) {
      return { status: "active", label: "Active", color: "green" }
    } else {
      return { status: "completed", label: "Completed", color: "gray" }
    }
  }

  if (loading) {
    return (
      <SidebarLayout>
        <div className="h-full flex justify-center items-center">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-600">Loading event details...</p>
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
              Back to Events
            </button>
          </div>

          <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg flex items-start">
            <AlertCircle className="w-6 h-6 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-2">Error Loading Event</h3>
              <p>{error}</p>
              <div className="mt-4">
                <button
                  onClick={fetchEventDetails}
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

  if (!event) {
    return (
      <SidebarLayout>
        <div className="h-full">
          <div className="flex justify-between items-center mb-6">
            <button onClick={handleBack} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Events
            </button>
          </div>

          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-6 py-4 rounded-lg">
            <h3 className="font-semibold mb-2">Event Not Found</h3>
            <p>The event you're looking for could not be found.</p>
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

  const eventStatus = getEventStatus(event)

  return (
    <SidebarLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <button onClick={handleBack} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Events
          </button>

          <div className="flex items-center">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              eventStatus.color === 'blue' ? 'bg-blue-100 text-blue-800' :
              eventStatus.color === 'green' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {eventStatus.label}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center">
                  <Trophy className="w-8 h-8 mr-3 text-yellow-300" />
                  {event.name}
                </h1>
                <p className="text-blue-100 text-lg">{event.description}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              {/* Event Details */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Event Details
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-3 text-gray-400" />
                    <div>
                      <p className="font-medium">Start Date</p>
                      <p className="text-gray-600">{formatDate(event.start_date)}</p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-3 text-gray-400" />
                    <div>
                      <p className="font-medium">End Date</p>
                      <p className="text-gray-600">{formatDate(event.end_date)}</p>
                    </div>
                  </div>

                  {event.location && (
                    <div className="flex items-center">
                      <MapPin className="w-5 h-5 mr-3 text-gray-400" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-gray-600">{event.location}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-3 text-gray-400" />
                    <div>
                      <p className="font-medium">Participants</p>
                      <p className="text-gray-600">
                        {event.entries_count || 0} registered
                        {event.max_participants && ` (max ${event.max_participants})`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <DollarSign className="w-5 h-5 mr-3 text-gray-400" />
                    <div>
                      <p className="font-medium">Entry Fee</p>
                      <p className="text-gray-600">{event.entry_fee || 2} credits</p>
                    </div>
                  </div>

                  {event.country_restriction && (
                    <div className="flex items-center">
                      <AlertCircle className="w-5 h-5 mr-3 text-yellow-500" />
                      <div>
                        <p className="font-medium">Country Restrictions</p>
                        <p className="text-gray-600">{formatCountryRestriction(event)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Registration Section */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2" />
                  Registration
                </h3>

                {currentUser ? (
                  <div className="space-y-4">
                    {userEntry ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <div className="bg-green-100 rounded-full p-2 mr-3">
                            <Award className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-green-800">You're registered!</p>
                            <p className="text-green-600 text-sm">
                              Registered on {new Date(userEntry.entered_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : eventStatus.status === 'completed' ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <p className="text-gray-600">This event has already ended.</p>
                      </div>
                    ) : (
                      <button
                        onClick={handleRegistration}
                        disabled={isRegistering}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition ${
                          isRegistering
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        {isRegistering ? 'Registering...' : `Register for ${event.entry_fee || 2} credits`}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 mb-2">Please log in to register for this event.</p>
                    <button
                      onClick={() => router.push('/login')}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Go to Login
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Rules and Categories */}
            {(event.rules || event.categories) && (
              <div className="border-t pt-8">
                {event.rules && (
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-3">Rules & Guidelines</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700 whitespace-pre-line">{event.rules}</p>
                    </div>
                  </div>
                )}

                {event.categories && event.categories.length > 0 && (
                  <div>
                    <h3 className="text-xl font-semibold mb-3">Categories</h3>
                    <div className="flex flex-wrap gap-2">
                      {event.categories.map((category, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  )
}
