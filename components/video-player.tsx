"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Loader2 } from "lucide-react"

interface VideoPlayerProps {
  videoUrl: string
  className?: string
}

export function VideoPlayer({ videoUrl, className }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleMute = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen()
      }
    }
  }

  const handleLoadStart = () => {
    setIsLoading(true)
    setError(null)
  }

  const handleLoadedData = () => {
    setIsLoading(false)
    setError(null)
  }

  const handleError = () => {
    setIsLoading(false)
    setError("Error loading video. Please try again.")
  }

  if (!videoUrl) {
    return null
  }

  return (
    <div
      className={`relative w-full aspect-video rounded-lg overflow-hidden bg-gray-900 ${className}`}
      onClick={handleVideoClick}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onLoadStart={handleLoadStart}
        onLoadedData={handleLoadedData}
        onError={handleError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onClick={handleVideoClick}
        controls
        controlsList="nodownload"
        playsInline
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-white text-center px-4">
            <p className="text-red-400 mb-2">⚠️</p>
            <p>{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}
