"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Upload, Download, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

export default function EmojiWiggler() {
  const [image, setImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [gifUrl, setGifUrl] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const ffmpegRef = useRef<FFmpeg | null>(null)
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)

  const loadFFmpeg = async () => {
    if (ffmpegLoaded) return

    const ffmpeg = new FFmpeg()
    ffmpegRef.current = ffmpeg

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd"
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    })

    setFfmpegLoaded(true)
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type === "image/png") {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
        setGifUrl(null)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === "image/png") {
      const reader = new FileReader()
      reader.onload = (event) => {
        setImage(event.target?.result as string)
        setGifUrl(null)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGenerateGif = async () => {
    if (!image) return

    setIsGenerating(true)

    try {
      // Load FFmpeg if not already loaded
      await loadFFmpeg()

      const ffmpeg = ffmpegRef.current
      if (!ffmpeg) throw new Error("FFmpeg not initialized")

      // Create an image element to load the source
      const img = new Image()
      img.src = image
      await new Promise((resolve) => {
        img.onload = resolve
      })

      // Create canvas for frame generation
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")

      canvas.width = img.width
      canvas.height = img.height

      const frameCount = 20
      const frameDuration = 50 // ms per frame

      // Generate frames with wiggle effect
      for (let i = 0; i < frameCount; i++) {
        const progress = i / frameCount
        const angle = Math.sin(progress * Math.PI * 4) * 0.2 // Rotation wiggle
        const scale = 1 + Math.sin(progress * Math.PI * 4) * 0.1 // Scale wiggle
        const offsetX = Math.sin(progress * Math.PI * 4) * 5 // Horizontal wiggle
        const offsetY = Math.cos(progress * Math.PI * 4) * 3 // Vertical wiggle

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        // Apply transformations
        ctx.save()
        ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY)
        ctx.rotate(angle)
        ctx.scale(scale, scale)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        ctx.restore()

        // Convert canvas to blob and write to FFmpeg
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), "image/png")
        })

        const frameData = await fetchFile(blob)
        await ffmpeg.writeFile(`frame${i.toString().padStart(3, "0")}.png`, frameData)
      }

      // Generate GIF using FFmpeg
      await ffmpeg.exec([
        "-framerate",
        `${1000 / frameDuration}`,
        "-i",
        "frame%03d.png",
        "-vf",
        "split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer",
        "-loop",
        "0",
        "output.gif",
      ])

      // Read the output GIF
      const data = await ffmpeg.readFile("output.gif")
      const gifBlob = new Blob([data], { type: "image/gif" })
      const gifUrl = URL.createObjectURL(gifBlob)
      setGifUrl(gifUrl)

      // Clean up FFmpeg files
      for (let i = 0; i < frameCount; i++) {
        await ffmpeg.deleteFile(`frame${i.toString().padStart(3, "0")}.png`)
      }
      await ffmpeg.deleteFile("output.gif")
    } catch (error) {
      console.error("Error generating GIF:", error)
      alert("Failed to generate GIF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadGif = () => {
    if (!gifUrl) return

    const a = document.createElement("a")
    a.href = gifUrl
    a.download = "wiggling-emoji.gif"
    a.click()
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-white" />
            <h1 className="text-5xl font-bold text-white">Emoji Wiggler</h1>
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <p className="text-lg text-gray-400">Make it wiggle</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Upload Section */}
          <Card className="p-6 bg-black border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-white">Upload Emoji</h2>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-all duration-200 min-h-[300px] flex flex-col items-center justify-center
                ${
                  isDragging
                    ? "border-white bg-gray-900 scale-105"
                    : "border-gray-800 hover:border-gray-600 hover:bg-gray-950"
                }
              `}
            >
              <input ref={fileInputRef} type="file" accept="image/png" onChange={handleFileSelect} className="hidden" />

              {image ? (
                <div className="space-y-4">
                  <img
                    src={image || "/placeholder.svg"}
                    alt="Uploaded emoji"
                    className="max-w-[200px] max-h-[200px] mx-auto"
                  />
                  <p className="text-sm text-gray-400">Click to change image</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-16 h-16 mx-auto text-gray-600" />
                  <div>
                    <p className="text-lg font-medium text-white">Drop your PNG here</p>
                    <p className="text-sm text-gray-400">or click to browse</p>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleGenerateGif}
              disabled={!image || isGenerating}
              className="w-full mt-4 bg-white hover:bg-gray-200 text-black disabled:bg-gray-800 disabled:text-gray-600"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                  Generating Wiggle...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Make it Wiggle!
                </>
              )}
            </Button>
          </Card>

          {/* Result Section */}
          <Card className="p-6 bg-black border-gray-800">
            <h2 className="text-xl font-semibold mb-4 text-white">Wiggling Result</h2>
            <div className="border-2 border-gray-800 rounded-lg p-8 text-center min-h-[300px] flex flex-col items-center justify-center bg-gray-950">
              {gifUrl ? (
                <div className="space-y-4">
                  <img
                    src={gifUrl || "/placeholder.svg"}
                    alt="Wiggling emoji"
                    className="max-w-[200px] max-h-[200px] mx-auto"
                  />
                  <p className="text-sm text-gray-400">Your wiggling emoji is ready!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gray-900 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="text-gray-400">Your wiggling GIF will appear here</p>
                </div>
              )}
            </div>

            <Button
              onClick={downloadGif}
              disabled={!gifUrl}
              variant="outline"
              className="w-full mt-4 bg-transparent border-gray-800 text-white hover:bg-gray-950 hover:border-gray-600 disabled:border-gray-900 disabled:text-gray-600"
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              Download GIF
            </Button>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Card className="p-6 bg-gray-950 border-gray-800">
            <h3 className="font-semibold mb-2 text-white">How it works</h3>
            <p className="text-sm text-gray-400">
              Upload a PNG emoji, and we'll create a fun wiggling animation with rotation, scaling, and movement
              effects. Perfect for Slack reactions and social media!
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
