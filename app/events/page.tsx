"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Trophy, Calendar, Users, ChevronRight, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { SidebarLayout } from "@/components/sidebar-layout"
import { API_BASE } from "@/lib/constants"

interface Event {
  id: string
  name: string
  description: string
  start_date: string
  end_date: string
  entries_count: number
  country_restriction: boolean
  allowed_countries?: string[]
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { currentUser } = useAuth()

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/events`)

      if (!response.ok) {
        throw new Error("Failed to fetch events")
      }

      const data = await response.json()
      setEvents(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
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

  const formatCountryRestriction = (event: Event) => {
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

  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </SidebarLayout>
    )
  }

  return (
    <SidebarLayout>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center">
          <Trophy className="w-8 h-8 mr-3 text-yellow-500" />
          Dance Events
        </h1>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
            >
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{event.name}</h3>
                <p className="text-gray-600 mb-4">{event.description}</p>

                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Starts: {formatDate(event.start_date)}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>Ends: {formatDate(event.end_date)}</span>
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{event.entries_count || 0} entries</span>
                  </div>
                  {event.country_restriction && (
                    <div className="flex items-center text-yellow-600">
                      <AlertCircle className="w-4 h-4 mr-2" />
                      <span>{formatCountryRestriction(event)}</span>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <span className="text-sm font-medium text-blue-600">Entry Fee: 2 credits</span>
                  <button
                    onClick={() => router.push(`/events/${event.id}`)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    View Event
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Active Events</h3>
            <p className="text-gray-500">Check back later for upcoming dance events!</p>
          </div>
        )}
      </div>
    </SidebarLayout>
  )
}
