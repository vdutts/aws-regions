"use client"

import { useState, useEffect } from "react"
import RotatingEarth from "@/components/rotating-earth"

interface AWSRegion {
  name: string
  code: string
  lat: number
  lng: number
  info: string[]
}

export default function Home() {
  const [regions, setRegions] = useState<AWSRegion[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<AWSRegion | null>(null)

  useEffect(() => {
    fetch("/aws-regions.json")
      .then(res => res.json())
      .then(data => setRegions(data))
      .catch(err => console.error("Failed to load regions:", err))
  }, [])

  const filteredRegions = regions.filter(region =>
    region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    region.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <main className="h-screen w-screen bg-[#0a0a0a] flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-[420px] bg-[#111111] border-r border-gray-800 flex flex-col h-screen">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-white mb-2">AWS Regions</h1>
          <p className="text-gray-400 text-sm">Explore datacenter locations worldwide</p>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-800">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search regions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Region List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            {filteredRegions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? "No regions found" : "Loading regions..."}
              </div>
            ) : (
              filteredRegions.map((region) => (
                <button
                  key={region.code}
                  onClick={() => setSelectedRegion(region)}
                  className={`w-full text-left p-4 rounded-lg mb-2 transition-all ${
                    selectedRegion?.code === region.code
                      ? "bg-cyan-500/20 border border-cyan-500/50"
                      : "bg-[#1a1a1a] border border-gray-800 hover:border-gray-700 hover:bg-[#1f1f1f]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white mb-1">{region.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{region.code}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer Stats */}
        <div className="p-4 border-t border-gray-800 bg-[#0a0a0a]">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Total Regions</span>
            <span className="text-white font-semibold">{regions.length}</span>
          </div>
        </div>
      </div>

      {/* Globe Container - Full Screen */}
      <div className="flex-1 relative h-screen bg-[#0a0a0a]">
        {/* Top Bar - Floating */}
        {selectedRegion && (
          <div className="absolute top-4 left-4 z-10 bg-[#111111]/90 backdrop-blur-sm border border-gray-800 rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <div>
              <div className="text-white font-semibold text-sm">{selectedRegion.name}</div>
              <div className="text-xs text-gray-400">{selectedRegion.code}</div>
            </div>
            <button
              onClick={() => setSelectedRegion(null)}
              className="ml-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Globe - Full Screen */}
        <div className="w-full h-full flex items-center justify-center">
          <RotatingEarth width={2000} height={2000} selectedRegion={selectedRegion} />
        </div>
      </div>
    </main>
  )
}
