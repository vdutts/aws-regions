"use client"

import { useState, useEffect, useRef } from "react"
import RotatingEarth from "@/components/rotating-earth"
import RegionDetailsPanel from "@/components/region-details-panel"

interface AWSRegion {
  name: string
  code: string
  city: string
  country: string
  lat: number
  lng: number
  info: string[]
}

export default function Home() {
  const [regions, setRegions] = useState<AWSRegion[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedRegion, setSelectedRegion] = useState<AWSRegion | null>(null)
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set())
  const [sidebarWidth, setSidebarWidth] = useState(420)
  const [isResizing, setIsResizing] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null)
  const [detailsPanelRegion, setDetailsPanelRegion] = useState<AWSRegion | null>(null)
  const [regionCodeMapping, setRegionCodeMapping] = useState<Record<string, string>>({})
  const [regionIdentifiers, setRegionIdentifiers] = useState<Record<string, string>>({})
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/aws-regions.json")
      .then(res => res.json())
      .then(data => setRegions(data))
      .catch(err => console.error("Failed to load regions:", err))
    
    fetch("/region-code-mapping.json")
      .then(res => res.json())
      .then(data => setRegionCodeMapping(data))
      .catch(err => console.error("Failed to load region code mapping:", err))
    
    fetch("/aws-region-identifiers.json")
      .then(res => res.json())
      .then(data => setRegionIdentifiers(data))
      .catch(err => console.error("Failed to load region identifiers:", err))
  }, [])

  // Update modal position whenever the modal is rendered
  useEffect(() => {
    if (selectedRegion && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect()
      // Use the center-left edge of the modal as the connection point
      setModalPosition({
        x: rect.left,
        y: rect.top + rect.height / 2
      })
    } else {
      setModalPosition(null)
    }
  }, [selectedRegion, selectedRegions])

  const filteredRegions = regions.filter(region =>
    region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    region.code.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleRegionClick = (region: AWSRegion, event: React.MouseEvent) => {
    if (event.metaKey || event.ctrlKey) {
      // Multi-select with Cmd/Ctrl
      const newSelected = new Set(selectedRegions)
      if (newSelected.has(region.code)) {
        newSelected.delete(region.code)
      } else {
        newSelected.add(region.code)
      }
      setSelectedRegions(newSelected)
    } else {
      // Single select - zoom to region
      setSelectedRegion(region)
      setSelectedRegions(new Set([region.code]))
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true)
    e.preventDefault()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      const newWidth = e.clientX
      if (newWidth >= 320 && newWidth <= 600) {
        setSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isResizing])

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return null
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  const getAwsRegionId = (region: AWSRegion) => {
    const mappedCode = regionCodeMapping[region.code]
    if (mappedCode && regionIdentifiers[mappedCode]) {
      return regionIdentifiers[mappedCode]
    }
    return null
  }

  return (
    <main className="h-screen w-screen bg-[#0a0a0a] flex overflow-hidden">
      {/* Sidebar */}
      <div 
        className="bg-[#111111] border-r border-gray-800 flex flex-col h-screen relative transition-all duration-300"
        style={{ width: isSidebarCollapsed ? '0px' : `${sidebarWidth}px` }}
      >
        {!isSidebarCollapsed && (
          <>
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
                  onClick={(e) => handleRegionClick(region, e)}
                  className={`group w-full text-left p-4 rounded-lg mb-2 transition-all cursor-pointer ${
                    selectedRegions.has(region.code)
                      ? "bg-cyan-500/20 border border-cyan-500/50 shadow-lg shadow-cyan-500/20"
                      : "bg-[#1a1a1a] border border-gray-800 hover:border-cyan-500/30 hover:bg-[#1f1f1f] hover:shadow-lg hover:shadow-cyan-500/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {region.country && getCountryFlag(region.country) ? (
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl group-hover:scale-110 transition-transform">
                        {getCountryFlag(region.country)}
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white mb-1 truncate">{region.name}</div>
                      {getAwsRegionId(region) && (
                        <div className="text-sm text-cyan-400 font-mono mb-0.5">{getAwsRegionId(region)}</div>
                      )}
                      <div className="text-xs text-gray-400 font-mono">{region.code}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setDetailsPanelRegion(region)
                      }}
                      className="text-gray-400 hover:text-cyan-400 hover:scale-110 transition-all active:scale-95 cursor-pointer"
                      title="View details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
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
          {selectedRegions.size > 0 && (
            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-gray-800">
              <span className="text-cyan-400">Selected</span>
              <span className="text-cyan-400 font-semibold">{selectedRegions.size}</span>
            </div>
          )}
        </div>

            {/* Resize Handle */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-cyan-500/30 transition-colors group z-20"
              onMouseDown={handleMouseDown}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-16 bg-gray-700 group-hover:bg-cyan-500 transition-colors rounded-full shadow-lg" />
            </div>
          </>
        )}
      </div>

      {/* Collapse/Expand Button */}
      <button
        onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-[#111111] hover:bg-cyan-500/20 border border-gray-800 hover:border-cyan-500 rounded-r-lg p-2 transition-all duration-300 group cursor-pointer"
        style={{ left: isSidebarCollapsed ? '0px' : `${sidebarWidth}px` }}
      >
        <svg 
          className={`w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-all duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Globe Container - Full Screen */}
      <div className="flex-1 relative h-screen bg-[#0a0a0a]">
        {/* Selected Regions Info Cards */}
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap gap-3 max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/50 scrollbar-track-transparent">
          {Array.from(selectedRegions).map((code, index) => {
            const region = regions.find(r => r.code === code)
            if (!region) return null
            const isMainSelected = selectedRegion?.code === code
            return (
              <div
                key={code}
                ref={isMainSelected ? modalRef : null}
                className="bg-[#111111]/95 backdrop-blur-sm border-2 border-cyan-500 rounded-lg p-4 shadow-2xl min-w-[280px] max-w-[320px] relative animate-in slide-in-from-top-4 duration-300"
                style={{
                  boxShadow: '0 0 50px rgba(34, 211, 238, 0.6), 0 0 30px rgba(34, 211, 238, 0.4), 0 0 15px rgba(34, 211, 238, 0.3)',
                  animationDelay: `${index * 50}ms`
                }}
              >
                <div className="flex items-start gap-3 mb-3">
                  {region.country && getCountryFlag(region.country) ? (
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl">
                      {getCountryFlag(region.country)}
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-xs text-cyan-400 font-medium mb-1">Region</div>
                    <div className="text-white font-semibold">{region.name}</div>
                    {getAwsRegionId(region) && (
                      <div className="text-sm text-cyan-400 font-mono mt-1">{getAwsRegionId(region)}</div>
                    )}
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{region.code}</div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setDetailsPanelRegion(region)}
                      className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded p-1.5 transition-all cursor-pointer hover:scale-110 active:scale-95"
                      title="View details"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        const newSelected = new Set(selectedRegions)
                        newSelected.delete(code)
                        setSelectedRegions(newSelected)
                        if (selectedRegion?.code === code) {
                          setSelectedRegion(null)
                        }
                      }}
                      className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded p-1.5 transition-all cursor-pointer hover:scale-110 active:scale-95"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-cyan-400 font-medium">Region Details:</div>
                  {region.info.map((item, idx) => (
                    <div key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-cyan-400 mt-0.5">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Globe - Full Screen */}
        <div className="w-full h-full flex items-center justify-center">
          <RotatingEarth width={2000} height={2000} selectedRegion={selectedRegion} modalPosition={modalPosition} />
        </div>
      </div>

      {/* Details Panel */}
      {detailsPanelRegion && (
        <RegionDetailsPanel
          region={detailsPanelRegion}
          onClose={() => setDetailsPanelRegion(null)}
        />
      )}
    </main>
  )
}
