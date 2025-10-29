"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X, Home, LogOut, User, Settings, Shield, Coins, Share2, Trophy } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { CreditStatus } from "@/components/credit-status"
import { ADMIN_UIDS } from "@/lib/constants"
import Image from "next/image"

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { currentUser, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const isAdmin = currentUser && ADMIN_UIDS.includes(currentUser.uid)

  const handleLogout = async () => {
    try {
      await logout()
      router.push("/login")
    } catch (error) {
      console.error("Failed to log out:", error)
    }
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
  }

  if (!currentUser) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {sidebarOpen && <div className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden" onClick={closeSidebar} />}

      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 lg:static lg:inset-0 transition duration-300 ease-in-out h-full flex flex-col`}
      >
        <div className="h-16 px-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center justify-center h-full w-full">
              <Image src="/logo192.png" alt="Flokraft Logo" width={48} height={48} className="h-12 w-auto mx-auto" />
            </div>
            <button className="p-2 rounded-md lg:hidden" onClick={closeSidebar}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <div className="mb-6 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center mr-3">
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {currentUser.displayName || currentUser.email}
                </p>
                <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
              </div>
            </div>

            <CreditStatus />
          </div>

          <ul className="space-y-1.5">
            <li>
              <Link
                href="/"
                className={`flex items-center px-3 py-2 rounded-md ${
                  pathname === "/" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={closeSidebar}
              >
                <Home className="w-5 h-5 mr-3" />
                Dashboard
              </Link>
            </li>

            <li>
              <Link
                href="/credits"
                className={`flex items-center px-3 py-2 rounded-md ${
                  pathname === "/credits" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={closeSidebar}
              >
                <Coins className="w-5 h-5 mr-3" />
                Buy Credits
              </Link>
            </li>

            {isAdmin && (
              <li>
                <Link
                  href="/admin"
                  className={`flex items-center px-3 py-2 rounded-md ${
                    pathname.startsWith("/admin") ? "bg-purple-100 text-purple-700" : "text-gray-700 hover:bg-gray-100"
                  }`}
                  onClick={closeSidebar}
                >
                  <Shield className="w-5 h-5 mr-3" />
                  Admin Panel
                </Link>
              </li>
            )}

            <li>
              <Link
                href="/shared-analyses"
                className={`flex items-center px-3 py-2 rounded-md ${
                  pathname === "/shared-analyses" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={closeSidebar}
              >
                <Share2 className="w-5 h-5 mr-3" />
                Shared With Me
              </Link>
            </li>

            <li>
              <Link
                href="/events"
                className={`flex items-center px-3 py-2 rounded-md ${
                  pathname.startsWith("/events") ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={closeSidebar}
              >
                <Trophy className="w-5 h-5 mr-3" />
                Events
              </Link>
            </li>

            <li>
              <Link
                href="/profile"
                className={`flex items-center px-3 py-2 rounded-md ${
                  pathname === "/profile" ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                }`}
                onClick={closeSidebar}
              >
                <Settings className="w-5 h-5 mr-3" />
                Profile Settings
              </Link>
            </li>

            <li>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 lg:px-6">
          <button className="p-2 rounded-md lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="text-xl font-bold">AI Match Analysis</div>

          <div className="flex items-center">
            <div className="lg:hidden">
              <Link href="/credits" className="flex items-center p-2 rounded-md text-blue-600">
                <Coins className="w-5 h-5 mr-1" />
                <span className="font-semibold">Credits</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
