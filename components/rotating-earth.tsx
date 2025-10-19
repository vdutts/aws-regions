"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface RotatingEarthProps {
  width?: number
  height?: number
  className?: string
  selectedRegion?: AWSRegion | null
}

interface AWSRegion {
  name: string
  code: string
  lat: number
  lng: number
  info: string[]
}

interface TooltipData {
  region: AWSRegion
  x: number
  y: number
}

export default function RotatingEarth({ width = 800, height = 600, className = "", selectedRegion = null }: RotatingEarthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)
  const projectionRef = useRef<any>(null)
  const rotationRef = useRef<number[]>([0, 0])
  const renderRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const context = canvas.getContext("2d")
    if (!context) return

    // Set up responsive dimensions
    const containerWidth = Math.min(width, window.innerWidth - 40)
    const containerHeight = Math.min(height, window.innerHeight - 100)
    const radius = Math.min(containerWidth, containerHeight) / 2.5

    const dpr = window.devicePixelRatio || 1
    canvas.width = containerWidth * dpr
    canvas.height = containerHeight * dpr
    canvas.style.width = `${containerWidth}px`
    canvas.style.height = `${containerHeight}px`
    context.scale(dpr, dpr)

    // Create projection and path generator for Canvas
    const projection = d3
      .geoOrthographic()
      .scale(radius)
      .translate([containerWidth / 2, containerHeight / 2])
      .clipAngle(90)

    projectionRef.current = projection
    const path = d3.geoPath().projection(projection).context(context)

    const pointInPolygon = (point: [number, number], polygon: number[][]): boolean => {
      const [x, y] = point
      let inside = false

      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i]
        const [xj, yj] = polygon[j]

        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
          inside = !inside
        }
      }

      return inside
    }

    const pointInFeature = (point: [number, number], feature: any): boolean => {
      const geometry = feature.geometry

      if (geometry.type === "Polygon") {
        const coordinates = geometry.coordinates
        // Check if point is in outer ring
        if (!pointInPolygon(point, coordinates[0])) {
          return false
        }
        // Check if point is in any hole (inner rings)
        for (let i = 1; i < coordinates.length; i++) {
          if (pointInPolygon(point, coordinates[i])) {
            return false // Point is in a hole
          }
        }
        return true
      } else if (geometry.type === "MultiPolygon") {
        // Check each polygon in the MultiPolygon
        for (const polygon of geometry.coordinates) {
          // Check if point is in outer ring
          if (pointInPolygon(point, polygon[0])) {
            // Check if point is in any hole
            let inHole = false
            for (let i = 1; i < polygon.length; i++) {
              if (pointInPolygon(point, polygon[i])) {
                inHole = true
                break
              }
            }
            if (!inHole) {
              return true
            }
          }
        }
        return false
      }

      return false
    }

    const generateDotsInPolygon = (feature: any, dotSpacing = 16) => {
      const dots: [number, number][] = []
      const bounds = d3.geoBounds(feature)
      const [[minLng, minLat], [maxLng, maxLat]] = bounds

      const stepSize = dotSpacing * 0.08
      let pointsGenerated = 0

      for (let lng = minLng; lng <= maxLng; lng += stepSize) {
        for (let lat = minLat; lat <= maxLat; lat += stepSize) {
          const point: [number, number] = [lng, lat]
          if (pointInFeature(point, feature)) {
            dots.push(point)
            pointsGenerated++
          }
        }
      }

      console.log(
        `[v0] Generated ${pointsGenerated} points for land feature:`,
        feature.properties?.featurecla || "Land",
      )
      return dots
    }

    interface DotData {
      lng: number
      lat: number
      visible: boolean
    }

    const allDots: DotData[] = []
    let landFeatures: any
    let awsRegions: AWSRegion[] = []

    const render = () => {
      // Clear canvas
      context.clearRect(0, 0, containerWidth, containerHeight)

      const currentScale = projection.scale()
      const scaleFactor = currentScale / radius

      // Draw ocean (globe background)
      context.beginPath()
      context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI)
      context.fillStyle = "#000000"
      context.fill()
      context.strokeStyle = "#ffffff"
      context.lineWidth = 2 * scaleFactor
      context.stroke()

      if (landFeatures) {
        // Draw graticule
        const graticule = d3.geoGraticule()
        context.beginPath()
        path(graticule())
        context.strokeStyle = "#ffffff"
        context.lineWidth = 1 * scaleFactor
        context.globalAlpha = 0.25
        context.stroke()
        context.globalAlpha = 1

        // Draw land outlines
        context.beginPath()
        landFeatures.features.forEach((feature: any) => {
          path(feature)
        })
        context.strokeStyle = "#ffffff"
        context.lineWidth = 1 * scaleFactor
        context.stroke()

        // Draw halftone dots
        allDots.forEach((dot) => {
          const projected = projection([dot.lng, dot.lat])
          if (
            projected &&
            projected[0] >= 0 &&
            projected[0] <= containerWidth &&
            projected[1] >= 0 &&
            projected[1] <= containerHeight
          ) {
            context.beginPath()
            context.arc(projected[0], projected[1], 1.2 * scaleFactor, 0, 2 * Math.PI)
            context.fillStyle = "#999999"
            context.fill()
          }
        })

        // Draw AWS region markers
        awsRegions.forEach((region) => {
          const projected = projection([region.lng, region.lat])
          if (projected) {
            const [x, y] = projected
            // Check if point is on visible side of globe
            const distance = projection.rotate()
            const lambda = region.lng + distance[0]
            const phi = region.lat - distance[1]
            const cosc = Math.sin(phi * Math.PI / 180) * Math.sin(0) + 
                        Math.cos(phi * Math.PI / 180) * Math.cos(0) * Math.cos(lambda * Math.PI / 180)
            
            if (cosc > 0) {
              // Draw outer glow
              const gradient = context.createRadialGradient(x, y, 0, x, y, 12 * scaleFactor)
              gradient.addColorStop(0, "rgba(34, 211, 238, 0.8)")
              gradient.addColorStop(0.5, "rgba(34, 211, 238, 0.4)")
              gradient.addColorStop(1, "rgba(34, 211, 238, 0)")
              context.beginPath()
              context.arc(x, y, 12 * scaleFactor, 0, 2 * Math.PI)
              context.fillStyle = gradient
              context.fill()

              // Draw main marker dot
              context.beginPath()
              context.arc(x, y, 5 * scaleFactor, 0, 2 * Math.PI)
              context.fillStyle = "#22d3ee"
              context.fill()
              context.strokeStyle = "#ffffff"
              context.lineWidth = 2 * scaleFactor
              context.stroke()
            }
          }
        })
      }
    }

    const loadWorldData = async () => {
      try {
        setIsLoading(true)

        // Load land data
        const response = await fetch(
          "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json",
        )
        if (!response.ok) throw new Error("Failed to load land data")

        landFeatures = await response.json()

        // Load AWS regions data
        const regionsResponse = await fetch("/aws-regions.json")
        if (regionsResponse.ok) {
          awsRegions = await regionsResponse.json()
          console.log(`[v0] Loaded ${awsRegions.length} AWS regions`)
        }

        // Generate dots for all land features
        let totalDots = 0
        landFeatures.features.forEach((feature: any) => {
          const dots = generateDotsInPolygon(feature, 16)
          dots.forEach(([lng, lat]) => {
            allDots.push({ lng, lat, visible: true })
            totalDots++
          })
        })

        console.log(`[v0] Total dots generated: ${totalDots} across ${landFeatures.features.length} land features`)

        render()
        setIsLoading(false)
      } catch (err) {
        setError("Failed to load land map data")
        setIsLoading(false)
      }
    }

    // Set up rotation and interaction
    const rotation = rotationRef.current
    let autoRotate = false
    const rotationSpeed = 0.5

    const rotate = () => {
      if (autoRotate) {
        rotation[0] += rotationSpeed
        projection.rotate(rotation)
        render()
      }
    }

    // Auto-rotation timer
    const rotationTimer = d3.timer(rotate)
    
    renderRef.current = render

    let hoverCheckTimeout: number | null = null
    const handleMouseMove = (event: MouseEvent) => {
      // Throttle hover checks for better performance
      if (hoverCheckTimeout) return
      
      hoverCheckTimeout = window.setTimeout(() => {
        hoverCheckTimeout = null
      }, 16) // ~60fps
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      // Check if hovering over any AWS region
      let hoveredRegion: AWSRegion | null = null
      for (const region of awsRegions) {
        const projected = projection([region.lng, region.lat])
        if (projected) {
          const [x, y] = projected
          const distance = projection.rotate()
          const lambda = region.lng + distance[0]
          const phi = region.lat - distance[1]
          const cosc = Math.sin(phi * Math.PI / 180) * Math.sin(0) + 
                      Math.cos(phi * Math.PI / 180) * Math.cos(0) * Math.cos(lambda * Math.PI / 180)
          
          if (cosc > 0) {
            const dx = mouseX - x
            const dy = mouseY - y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 15) {
              hoveredRegion = region
              break
            }
          }
        }
      }

      if (hoveredRegion) {
        canvas.style.cursor = "pointer"
        setTooltip({
          region: hoveredRegion,
          x: event.clientX,
          y: event.clientY
        })
      } else {
        canvas.style.cursor = "grab"
        setTooltip(null)
      }
    }

    const handleMouseDown = (event: MouseEvent) => {
      // Check if clicking on a region
      const rect = canvas.getBoundingClientRect()
      const mouseX = event.clientX - rect.left
      const mouseY = event.clientY - rect.top

      for (const region of awsRegions) {
        const projected = projection([region.lng, region.lat])
        if (projected) {
          const [x, y] = projected
          const distance = projection.rotate()
          const lambda = region.lng + distance[0]
          const phi = region.lat - distance[1]
          const cosc = Math.sin(phi * Math.PI / 180) * Math.sin(0) + 
                      Math.cos(phi * Math.PI / 180) * Math.cos(0) * Math.cos(lambda * Math.PI / 180)
          
          if (cosc > 0) {
            const dx = mouseX - x
            const dy = mouseY - y
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < 12) {
              // Clicked on a region - don't start dragging
              return
            }
          }
        }
      }

      // Start dragging
      autoRotate = false
      canvas.style.cursor = "grabbing"
      const startX = event.clientX
      const startY = event.clientY
      const startRotation = [...rotation]

      const handleMouseMoveWhileDragging = (moveEvent: MouseEvent) => {
        const sensitivity = 0.25
        const dx = moveEvent.clientX - startX
        const dy = moveEvent.clientY - startY

        rotation[0] = startRotation[0] + dx * sensitivity
        rotation[1] = startRotation[1] - dy * sensitivity
        rotation[1] = Math.max(-90, Math.min(90, rotation[1]))

        projection.rotate(rotation)
        
        // Use requestAnimationFrame for smoother rendering
        if (!window.requestAnimationFrame) {
          render()
        } else {
          requestAnimationFrame(render)
        }
      }

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMoveWhileDragging)
        document.removeEventListener("mouseup", handleMouseUp)
        canvas.style.cursor = "grab"
      }

      document.addEventListener("mousemove", handleMouseMoveWhileDragging)
      document.addEventListener("mouseup", handleMouseUp)
    }

    let zoomAnimationFrame: number | null = null
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      
      // Smoother zoom with smaller increments
      const scaleFactor = event.deltaY > 0 ? 0.95 : 1.05
      const currentScale = projection.scale()
      const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, currentScale * scaleFactor))
      
      // Cancel any pending animation
      if (zoomAnimationFrame) {
        cancelAnimationFrame(zoomAnimationFrame)
      }
      
      // Smooth zoom animation
      const startScale = currentScale
      const duration = 100 // ms
      const startTime = Date.now()
      
      const animateZoom = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Ease out
        const eased = 1 - Math.pow(1 - progress, 3)
        const scale = startScale + (newRadius - startScale) * eased
        
        projection.scale(scale)
        render()
        
        if (progress < 1) {
          zoomAnimationFrame = requestAnimationFrame(animateZoom)
        } else {
          zoomAnimationFrame = null
        }
      }
      
      animateZoom()
    }

    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("wheel", handleWheel)

    // Load the world data
    loadWorldData()

    // Cleanup
    return () => {
      rotationTimer.stop()
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("wheel", handleWheel)
    }
  }, [width, height])

  // Handle selected region zoom
  useEffect(() => {
    if (!selectedRegion || !projectionRef.current || !renderRef.current) return

    const projection = projectionRef.current
    const render = renderRef.current
    const rotation = rotationRef.current

    // Calculate target rotation to center the selected region
    const targetRotation = [-selectedRegion.lng, -selectedRegion.lat]
    
    // Animate rotation with smoother easing
    const startRotation = [...rotation]
    const duration = 800 // ms - faster
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Smooth ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)

      rotation[0] = startRotation[0] + (targetRotation[0] - startRotation[0]) * eased
      rotation[1] = startRotation[1] + (targetRotation[1] - startRotation[1]) * eased

      projection.rotate(rotation)
      render()

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    animate()
  }, [selectedRegion])

  if (error) {
    return (
      <div className={`dark flex items-center justify-center bg-card rounded-2xl p-8 ${className}`}>
        <div className="text-center">
          <p className="dark text-destructive font-semibold mb-2">Error loading Earth visualization</p>
          <p className="dark text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
      <div className="absolute bottom-4 right-4 text-xs text-gray-400 px-3 py-2 rounded-lg bg-[#111111]/80 backdrop-blur-sm border border-gray-800">
        Drag to rotate • Scroll to zoom
      </div>
      
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: `${tooltip.x + 20}px`,
            top: `${tooltip.y - 80}px`,
          }}
        >
          <div className="bg-[#111111]/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-4 shadow-2xl min-w-[280px]">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              </div>
              <div>
                <div className="text-xs text-cyan-400 font-medium mb-1">Region</div>
                <div className="text-white font-semibold">{tooltip.region.name}</div>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm text-gray-300 font-medium">Region Details:</div>
              {tooltip.region.info.map((item, idx) => (
                <div key={idx} className="text-sm text-gray-400 flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
