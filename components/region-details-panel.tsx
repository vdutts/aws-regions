"use client"

import { useState, useEffect } from "react"

interface AWSRegion {
  name: string
  code: string
  city: string
  country: string
  lat: number
  lng: number
  info: string[]
}

interface AvailabilityZone {
  "Availability Zone Name": string
  "Parent Region": string
  "Availability Zone ID": string
  "Build Order": number
  "Parent Region Status": string
  "Data Centers": string
}

interface LocalZone {
  "Titan Name": string
  "Titan Id": string
  "External Name": string
  "Parent Dimension": string
  "Group Name": string
  "City": string
  "Status": string
  "Launch Date (UTC)": string
  "Region Code": string
}

interface Partition {
  "Partition Name": string
  "Status": string
  "Domain": string
  "Public DNS Suffix": string
  "Regions": string
  "Website Domain": string
}

interface RegionDetailsPanelProps {
  region: AWSRegion
  onClose: () => void
}

export default function RegionDetailsPanel({ region, onClose }: RegionDetailsPanelProps) {
  const [availabilityZones, setAvailabilityZones] = useState<AvailabilityZone[]>([])
  const [localZones, setLocalZones] = useState<LocalZone[]>([])
  const [partition, setPartition] = useState<Partition | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "azs" | "local" | "partition">("overview")
  const [regionCodeMapping, setRegionCodeMapping] = useState<Record<string, string>>({})
  const [regionIdentifiers, setRegionIdentifiers] = useState<Record<string, string>>({})

  useEffect(() => {
    // Load region code mapping
    fetch("/region-code-mapping.json")
      .then(res => res.json())
      .then((mapping: Record<string, string>) => {
        setRegionCodeMapping(mapping)
      })
      .catch(err => console.error("Failed to load mapping:", err))
    
    // Load region identifiers
    fetch("/aws-region-identifiers.json")
      .then(res => res.json())
      .then((identifiers: Record<string, string>) => {
        setRegionIdentifiers(identifiers)
      })
      .catch(err => console.error("Failed to load region identifiers:", err))
  }, [])

  useEffect(() => {
    if (Object.keys(regionCodeMapping).length === 0) return

    // Load availability zones
    fetch("/availability-zones.json")
      .then(res => res.json())
      .then((data: AvailabilityZone[]) => {
        // Use the mapping to find the correct parent region code
        const mappedCode = regionCodeMapping[region.code]
        if (mappedCode) {
          const filtered = data.filter(az => az["Parent Region"] === mappedCode)
          setAvailabilityZones(filtered)
        } else {
          setAvailabilityZones([])
        }
      })
      .catch(err => console.error("Failed to load AZs:", err))

    // Load partition info
    fetch("/partitions.json")
      .then(res => res.json())
      .then((data: Partition[]) => {
        // Find partition from region info
        const partitionName = region.info.find(i => i.startsWith("Partition:"))?.split(": ")[1]
        const found = data.find(p => p["Partition Name"] === partitionName)
        setPartition(found || null)
      })
      .catch(err => console.error("Failed to load partitions:", err))

    // Load local zones
    fetch("/local-zones.json")
      .then(res => res.json())
      .then((data: LocalZone[]) => {
        // Filter by region code
        const filtered = data.filter(lz => lz["Region Code"] === region.code)
        setLocalZones(filtered)
      })
      .catch(err => console.error("Failed to load local zones:", err))
  }, [region, regionCodeMapping])

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return null
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  const getAwsRegionId = () => {
    const mappedCode = regionCodeMapping[region.code]
    if (mappedCode && regionIdentifiers[mappedCode]) {
      return regionIdentifiers[mappedCode]
    }
    return null
  }

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-[#0a0a0a] border-2 border-cyan-500 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300"
        style={{
          boxShadow: '0 0 80px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-b border-cyan-500/30 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {region.country && getCountryFlag(region.country) ? (
                <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center text-4xl">
                  {getCountryFlag(region.country)}
                </div>
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              )}
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{region.name}</h2>
                {getAwsRegionId() && (
                  <div className="text-lg text-cyan-400 font-mono mb-2">{getAwsRegionId()}</div>
                )}
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 font-mono text-sm">{region.code}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-300">{region.city}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-[#111111] overflow-x-auto flex-shrink-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap cursor-pointer flex-shrink-0 ${
              activeTab === "overview"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab("azs")}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap cursor-pointer flex-shrink-0 ${
              activeTab === "azs"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              Availability Zones
              <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full text-xs flex-shrink-0">
                {availabilityZones.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("local")}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap cursor-pointer flex-shrink-0 ${
              activeTab === "local"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Local Zones
              <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full text-xs flex-shrink-0">
                {localZones.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("partition")}
            className={`px-6 py-3 font-medium transition-colors whitespace-nowrap cursor-pointer flex-shrink-0 ${
              activeTab === "partition"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Partition
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Infrastructure Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/50 rounded-lg p-4">
                  <div className="text-xs text-cyan-400 font-medium mb-1">Availability Zones</div>
                  <div className="text-3xl font-bold text-white">{availabilityZones.length}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/50 rounded-lg p-4">
                  <div className="text-xs text-purple-400 font-medium mb-1">Local Zones</div>
                  <div className="text-3xl font-bold text-white">{localZones.length}</div>
                </div>
                <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4">
                  <div className="text-xs text-green-400 font-medium mb-1">Total Zones</div>
                  <div className="text-3xl font-bold text-white">{availabilityZones.length + localZones.length}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {region.info.map((item, idx) => {
                  const [label, value] = item.split(": ")
                  return (
                    <div key={idx} className="bg-[#111111] border border-gray-800 rounded-lg p-4">
                      <div className="text-xs text-cyan-400 font-medium mb-1">{label}</div>
                      <div className="text-white font-semibold">{value || item}</div>
                    </div>
                  )
                })}
              </div>

              <div className="bg-[#111111] border border-gray-800 rounded-lg p-4">
                <div className="text-sm text-cyan-400 font-medium mb-2">Coordinates</div>
                <div className="text-gray-300">
                  Latitude: {region.lat.toFixed(2)}° • Longitude: {region.lng.toFixed(2)}°
                </div>
              </div>
            </div>
          )}

          {activeTab === "azs" && (
            <div className="space-y-3">
              {availabilityZones.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p>No availability zone data found for this region</p>
                </div>
              ) : (
                availabilityZones.map((az, idx) => (
                  <div key={idx} className="bg-[#111111] border border-gray-800 rounded-lg p-4 hover:border-cyan-500/50 hover:bg-[#151515] transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-white font-semibold mb-1 group-hover:text-cyan-400 transition-colors">{az["Availability Zone Name"]}</div>
                        <div className="text-sm text-cyan-400 font-mono">{az["Availability Zone ID"]}</div>
                      </div>
                      <div className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap">
                        Build Order: {az["Build Order"]}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 text-sm">Status:</span>
                        <span className="text-white text-sm">{az["Parent Region Status"]}</span>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm mb-2">Data Centers:</div>
                        <div className="flex flex-wrap gap-2">
                          {az["Data Centers"].split(',').map((dc, i) => (
                            <span key={i} className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full text-xs font-mono">
                              {dc.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "local" && (
            <div className="space-y-3">
              {localZones.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>No local zones found for this region</p>
                </div>
              ) : (
                localZones.map((lz, idx) => (
                  <div key={idx} className="bg-[#111111] border border-gray-800 rounded-lg p-4 hover:border-purple-500/50 hover:bg-[#151515] transition-all cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-semibold mb-1 group-hover:text-purple-400 transition-colors truncate">{lz["Group Name"]}</div>
                        <div className="text-sm text-purple-400 font-mono break-all">{lz["External Name"]}</div>
                      </div>
                      <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2">
                        Local Zone
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <span className="text-white ml-2">{lz["Status"]}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">City:</span>
                        <span className="text-white ml-2">{lz["City"]}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Zone ID:</span>
                        <div className="text-white mt-1 font-mono text-xs bg-[#0a0a0a] p-2 rounded break-all">{lz["Titan Id"]}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">Launched:</span>
                        <span className="text-white ml-2">{new Date(lz["Launch Date (UTC)"]).toLocaleDateString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Parent AZ:</span>
                        <span className="text-white ml-2 font-mono text-xs">{lz["Parent Dimension"]}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "partition" && (
            <div className="space-y-4">
              {!partition ? (
                <div className="text-center py-12 text-gray-500">
                  No partition data found for this region
                </div>
              ) : (
                <>
                  <div className="bg-[#111111] border border-cyan-500/50 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-white">{partition["Partition Name"]}</div>
                        <div className="text-cyan-400 text-sm">{partition["Status"]}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="bg-[#0a0a0a] rounded-lg p-3">
                        <div className="text-xs text-cyan-400 mb-1">Domain</div>
                        <div className="text-white font-mono text-sm">{partition["Domain"]}</div>
                      </div>
                      <div className="bg-[#0a0a0a] rounded-lg p-3">
                        <div className="text-xs text-cyan-400 mb-1">Public DNS Suffix</div>
                        <div className="text-white font-mono text-sm">{partition["Public DNS Suffix"]}</div>
                      </div>
                      <div className="bg-[#0a0a0a] rounded-lg p-3">
                        <div className="text-xs text-cyan-400 mb-1">Website</div>
                        <div className="text-white font-mono text-sm">{partition["Website Domain"]}</div>
                      </div>
                      <div className="bg-[#0a0a0a] rounded-lg p-3">
                        <div className="text-xs text-cyan-400 mb-1">Regions in Partition</div>
                        <div className="text-white text-sm">{partition["Regions"]}</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

