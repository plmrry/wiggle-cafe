"use server"

import { createCanvas, loadImage } from "canvas"
import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile } from "@ffmpeg/util"

export async function generateWigglingGif(imageDataUrl: string) {
  try {
    console.log("[v0] Starting GIF generation with FFmpeg")
    const img = await loadImage(imageDataUrl)
    console.log("[v0] Image loaded:", img.width, "x", img.height)

    const width = img.width
    const height = img.height
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext("2d")

    const frameCount = 20
    const maxRotation = 15
    const maxScale = 0.15

    const frames: Buffer[] = []
    console.log("[v0] Generating frames")

    for (let i = 0; i < frameCount; i++) {
      const progress = i / frameCount
      const angle = Math.sin(progress * Math.PI * 4) * maxRotation * (Math.PI / 180)
      const scale = 1 + Math.sin(progress * Math.PI * 4) * maxScale
      const offsetX = Math.sin(progress * Math.PI * 6) * 5
      const offsetY = Math.cos(progress * Math.PI * 5) * 5

      ctx.clearRect(0, 0, width, height)
      ctx.save()
      ctx.translate(width / 2 + offsetX, height / 2 + offsetY)
      ctx.rotate(angle)
      ctx.scale(scale, scale)
      ctx.translate(-width / 2, -height / 2)
      ctx.drawImage(img, 0, 0)
      ctx.restore()

      frames.push(canvas.toBuffer("image/png"))
    }

    console.log("[v0] Frames generated:", frames.length)

    const ffmpeg = new FFmpeg()
    await ffmpeg.load()
    console.log("[v0] FFmpeg loaded")

    // Write frames to FFmpeg virtual filesystem
    for (let i = 0; i < frames.length; i++) {
      await ffmpeg.writeFile(`frame${i.toString().padStart(3, "0")}.png`, await fetchFile(frames[i]))
    }

    console.log("[v0] Creating GIF with FFmpeg")
    // Create GIF with looping and 50ms delay between frames (20fps)
    await ffmpeg.exec([
      "-framerate",
      "20",
      "-i",
      "frame%03d.png",
      "-vf",
      "split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse",
      "-loop",
      "0",
      "output.gif",
    ])

    // Read the output GIF
    const data = await ffmpeg.readFile("output.gif")
    const buffer = Buffer.from(data as Uint8Array)
    const base64 = buffer.toString("base64")

    console.log("[v0] GIF created successfully")

    return {
      success: true,
      data: `data:image/gif;base64,${base64}`,
    }
  } catch (error) {
    console.error("[v0] Error generating GIF:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
