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

  useEffect(() => {
    // Load region code mapping
    fetch("/region-code-mapping.json")
      .then(res => res.json())
      .then((mapping: Record<string, string>) => {
        setRegionCodeMapping(mapping)
      })
      .catch(err => console.error("Failed to load mapping:", err))
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border-2 border-cyan-500 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{
          boxShadow: '0 0 80px rgba(34, 211, 238, 0.5), 0 0 40px rgba(34, 211, 238, 0.3)'
        }}
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
                <div className="flex items-center gap-3">
                  <span className="text-cyan-400 font-mono text-sm">{region.code}</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-300">{region.city}</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white hover:bg-red-500/20 rounded-lg p-2 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 bg-[#111111]">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === "overview"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("azs")}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === "azs"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            Availability Zones ({availabilityZones.length})
          </button>
          <button
            onClick={() => setActiveTab("local")}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === "local"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            Local Zones ({localZones.length})
          </button>
          <button
            onClick={() => setActiveTab("partition")}
            className={`px-6 py-3 font-medium transition-all ${
              activeTab === "partition"
                ? "text-cyan-400 border-b-2 border-cyan-400 bg-cyan-500/10"
                : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
            }`}
          >
            Partition Info
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
                  No availability zone data found for this region
                </div>
              ) : (
                availabilityZones.map((az, idx) => (
                  <div key={idx} className="bg-[#111111] border border-gray-800 rounded-lg p-4 hover:border-cyan-500/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-white font-semibold mb-1">{az["Availability Zone Name"]}</div>
                        <div className="text-sm text-cyan-400 font-mono">{az["Availability Zone ID"]}</div>
                      </div>
                      <div className="bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full text-xs font-medium">
                        Build Order: {az["Build Order"]}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Status:</span>
                        <span className="text-white ml-2">{az["Parent Region Status"]}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Data Centers:</span>
                        <span className="text-white ml-2">{az["Data Centers"]}</span>
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
                  No local zones found for this region
                </div>
              ) : (
                localZones.map((lz, idx) => (
                  <div key={idx} className="bg-[#111111] border border-gray-800 rounded-lg p-4 hover:border-cyan-500/50 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-white font-semibold mb-1">{lz["Group Name"]}</div>
                        <div className="text-sm text-cyan-400 font-mono">{lz["External Name"]}</div>
                      </div>
                      <div className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-medium">
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
                      <div>
                        <span className="text-gray-400">Zone ID:</span>
                        <span className="text-white ml-2 font-mono text-xs">{lz["Titan Id"]}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Launched:</span>
                        <span className="text-white ml-2">{new Date(lz["Launch Date (UTC)"]).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 bg-[#0a0a0a] rounded p-2">
                      <span className="text-gray-500">Parent AZ:</span>
                      <span className="text-gray-300 ml-2 font-mono">{lz["Parent Dimension"]}</span>
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

