"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import Image from "next/image";
import Script from "next/script";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Upload, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

function œ(...args: unknown[]) {
  console.log(...args);
}

export default function EmojiWiggler() {
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [gifSize, setGifSize] = useState<number | null>(null);
  const [wiggleIntensity, setWiggleIntensity] = useState(1.5);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegScriptReady, setFfmpegScriptReady] = useState(false);

  // Debounced effect to regenerate GIF when wiggle intensity changes
  useEffect(() => {
    if (!image || !gifUrl) return;

    const timeoutId = setTimeout(() => {
      handleGenerateGif();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [wiggleIntensity]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isHeifFile = useCallback((file: File): boolean => {
    return (
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif")
    );
  }, []);

  const convertFileToDataURL = useCallback(
    async (file: File): Promise<string> => {
      œ("AHOY");
      if (isHeifFile(file)) {
        // For HEIF files, we'll use createImageBitmap which has better support
        try {
          const imageBitmap = await createImageBitmap(file);
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not get canvas context");

          canvas.width = imageBitmap.width;
          canvas.height = imageBitmap.height;
          ctx.drawImage(imageBitmap, 0, 0);

          return canvas.toDataURL("image/png");
        } catch (error) {
          console.error("Error converting HEIF file:", error);
          throw new Error(
            "Failed to convert HEIF file. Your browser may not support HEIF images."
          );
        }
      } else {
        // For other formats, use FileReader as before
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            resolve(event.target?.result as string);
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });
      }
    },
    [isHeifFile]
  );

  const loadFFmpeg = async () => {
    if (ffmpegLoaded || !ffmpegScriptReady) return;

    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core/dist/umd";

    if (!ffmpegRef.current) {
      ffmpegRef.current = new FFmpeg();
    }

    const ffmpeg = ffmpegRef.current;

    ffmpeg.on("log", ({ message }) => {
      console.log(message);
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      ),
    });

    setFfmpegLoaded(true);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.type === "image/png" || isHeifFile(file))) {
        setOriginalFilename(file.name);
        try {
          const dataURL = await convertFileToDataURL(file);
          setImage(dataURL);
          setGifUrl(null);
          setGifSize(null);
        } catch (error) {
          console.error("Error processing file:", error);
          alert(
            error instanceof Error
              ? error.message
              : "Failed to process the image file."
          );
        }
      }
    },
    [convertFileToDataURL, isHeifFile]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type === "image/png" || isHeifFile(file))) {
      setOriginalFilename(file.name);
      try {
        const dataURL = await convertFileToDataURL(file);
        setImage(dataURL);
        setGifUrl(null);
        setGifSize(null);
      } catch (error) {
        console.error("Error processing file:", error);
        alert(
          error instanceof Error
            ? error.message
            : "Failed to process the image file."
        );
      }
    }
  };

  const handleGenerateGif = async () => {
    if (!image) return;

    setIsGenerating(true);

    try {
      await loadFFmpeg();

      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg) throw new Error("FFmpeg not initialized");

      const img = new window.Image();
      img.src = image;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) throw new Error("Could not get canvas context");

      // Limit canvas size to reduce file size
      const maxSize = 120;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);

      // High framerate for smooth animation
      const frameCount = 60;
      const frameDuration = 33; // ms per frame (30 FPS)
      const speed = 2;

      // Generate random seeds for unique wiggle patterns each time
      const randomSeed1 = Math.random() * Math.PI * 2;
      const randomSeed2 = Math.random() * Math.PI * 2;
      const randomSeed3 = Math.random() * Math.PI * 2;
      const randomFreq1 = 2.5 + Math.random() * 1.5; // Random frequency 2.5-4
      const randomFreq2 = 6 + Math.random() * 3; // Random frequency 6-9
      const randomFreq3 = 4 + Math.random() * 3; // Random frequency 4-7

      // Calculate the scaled image dimensions and maximum safe wiggle offset
      const imageScale = 0.8;
      const scaledWidth = img.width * scale * imageScale;
      const scaledHeight = img.height * scale * imageScale;

      // Maximum offset before image escapes canvas (half the difference between canvas and scaled image)
      const maxOffsetX = (canvas.width - scaledWidth) / 2;
      const maxOffsetY = (canvas.height - scaledHeight) / 2;

      for (let i = 0; i < frameCount; i++) {
        const progress = i / frameCount;

        // Create crazy wobble with multiple sine waves at different frequencies and random variations
        const time = progress * Math.PI * 2;
        const rawOffsetX =
          (Math.sin(time * randomFreq1 * speed + randomSeed1) * 8 +
            Math.sin(time * 7 * speed + randomSeed2) * 4 +
            Math.cos(time * 5 * speed + randomSeed3) * 6) *
          wiggleIntensity;
        const rawOffsetY =
          (Math.cos(time * 4 * speed + randomSeed1) * 8 +
            Math.sin(time * randomFreq2 * speed + randomSeed2) * 3 +
            Math.cos(time * randomFreq3 * speed + randomSeed3) * 5) *
          wiggleIntensity;

        // Clamp offsets to ensure image never escapes canvas boundaries
        const offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, rawOffsetX));
        const offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, rawOffsetY));

        // Clear with transparent background
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // Shrink by 80% and center, then add crazy wobble
        ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
        ctx.scale(imageScale * scale, imageScale * scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        ctx.restore();

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => {
            if (b) resolve(b);
            else reject(new Error("Failed to create blob"));
          }, "image/png");
        });

        const frameData = await fetchFile(blob);
        await ffmpeg.writeFile(
          `frame${i.toString().padStart(3, "0")}.png`,
          frameData
        );
      }

      // Generate GIF with transparency support
      await ffmpeg.exec([
        "-framerate",
        `${1000 / frameDuration}`, // Set input framerate (30 FPS)
        "-i",
        "frame%03d.png", // Input PNG sequence with padding (frame000.png, frame001.png, etc.)
        "-vf",
        // Video filter: split stream, generate palette with 63 colors + transparency, apply palette with dithering
        "split[s0][s1];[s0]palettegen=max_colors=12:reserve_transparent=1[p];[s1][p]paletteuse=dither=bayer:bayer_scale=2:alpha_threshold=128",
        "-loop",
        "0", // Loop infinitely (0 = infinite loop)
        "-fs",
        "90k", // File size limit: maximum 90KB
        "output.gif", // Output filename
      ]);

      const data = await ffmpeg.readFile("output.gif");
      const arrayData = new Uint8Array(data as Uint8Array);
      const gifBlob = new Blob([arrayData], { type: "image/gif" });
      const gifUrl = URL.createObjectURL(gifBlob);

      // Store file size for display
      setGifSize(gifBlob.size);
      setGifUrl(gifUrl);

      for (let i = 0; i < frameCount; i++) {
        await ffmpeg.deleteFile(`frame${i.toString().padStart(3, "0")}.png`);
      }
      await ffmpeg.deleteFile("output.gif");
    } catch (error) {
      console.error("Error generating GIF:", error);
      alert("Failed to generate GIF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadGif = () => {
    if (!gifUrl) return;

    // Generate filename based on original filename
    let filename = "wiggling-emoji.gif";
    if (originalFilename) {
      // Remove the extension and add "-wiggle.gif"
      const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, "");
      filename = `${nameWithoutExt}-wiggle.gif`;
    }

    const a = document.createElement("a");
    a.href = gifUrl;
    a.download = filename;
    a.click();
  };

  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd/ffmpeg-core.js"
        strategy="lazyOnload"
        onReady={() => setFfmpegScriptReady(true)}
      />

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
            <Card className="p-6 bg-black border-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-white">
                Upload Emoji
              </h2>
              <button
                type="button"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Upload image file"
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/heic,image/heif"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {image ? (
                  <div className="space-y-4">
                    <Image
                      src={image || "/placeholder.svg"}
                      alt="Uploaded emoji"
                      width={200}
                      height={200}
                      className="max-w-[200px] max-h-[200px] mx-auto"
                    />
                    <p className="text-sm text-gray-400">
                      Click to change image
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-16 h-16 mx-auto text-gray-600" />
                    <div>
                      <p className="text-lg font-medium text-white">
                        Drop your image here
                      </p>
                      <p className="text-sm text-gray-400">
                        or click to browse (PNG, HEIC, HEIF)
                      </p>
                    </div>
                  </div>
                )}
              </button>

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
                    Make it Wiggle
                  </>
                )}
              </Button>
            </Card>

            <Card className="p-6 bg-black border-gray-800">
              <h2 className="text-xl font-semibold mb-4 text-white">
                Wiggling Result
              </h2>
              <div className="border-2 border-gray-800 rounded-lg p-8 text-center min-h-[300px] flex flex-col items-center justify-center bg-gray-950">
                {gifUrl ? (
                  <div className="space-y-4">
                    <Image
                      src={gifUrl || "/placeholder.svg"}
                      alt="Wiggling emoji"
                      width={200}
                      height={200}
                      className="max-w-[200px] max-h-[200px] mx-auto"
                    />
                    <div className="space-y-1">
                      <p className="text-sm text-gray-400">
                        Your wiggling emoji is ready
                      </p>
                      {gifSize && (
                        <p className="text-xs text-gray-500">
                          File size: {formatFileSize(gifSize)}
                          {gifSize <= 110 * 1024 && (
                            <span className="text-green-400 ml-2">
                              ✓ Under 110KB
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-gray-900 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-400">
                      Your wiggling GIF will appear here
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="wiggle-intensity" className="text-sm font-medium text-white">
                    Wiggle Intensity
                  </label>
                  <span className="text-sm text-gray-400">{wiggleIntensity.toFixed(1)}x</span>
                </div>
                <input
                  id="wiggle-intensity"
                  type="range"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={wiggleIntensity}
                  onChange={(e) => setWiggleIntensity(parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-white"
                />
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
        </div>
      </div>
    </>
  );
}
