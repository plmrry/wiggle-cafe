"use client";

import { useCallback, useState, useRef } from "react";
import Image from "next/image";
import Script from "next/script";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Upload, Download, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function EmojiWiggler() {
  const [image, setImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [originalFilename, setOriginalFilename] = useState<string | null>(null);
  const [gifSize, setGifSize] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [ffmpegScriptReady, setFfmpegScriptReady] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === "image/png") {
      setOriginalFilename(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setGifUrl(null);
        setGifSize(null);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "image/png") {
      setOriginalFilename(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setGifUrl(null);
        setGifSize(null);
      };
      reader.readAsDataURL(file);
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
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // Limit canvas size to reduce file size
      const maxSize = 120;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = Math.floor(img.width * scale);
      canvas.height = Math.floor(img.height * scale);

      // Optimize for file size: fewer frames, lower FPS
      const frameCount = 12;
      const frameDuration = 150; // ms per frame (~6.7 FPS)

      for (let i = 0; i < frameCount; i++) {
        const progress = i / frameCount;

        // Create crazy wobble with multiple sine waves at different frequencies
        const time = progress * Math.PI * 2;
        const offsetX =
          Math.sin(time * 3) * 8 +
          Math.sin(time * 7) * 4 +
          Math.cos(time * 5) * 6;
        const offsetY =
          Math.cos(time * 4) * 6 +
          Math.sin(time * 8) * 3 +
          Math.cos(time * 6) * 5;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        // Shrink by 80% and center, then add crazy wobble
        ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
        ctx.scale(0.8 * scale, 0.8 * scale);
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

      await ffmpeg.exec([
        "-framerate",
        `${1000 / frameDuration}`,
        "-i",
        "frame%03d.png",
        "-vf",
        "split[s0][s1];[s0]palettegen=max_colors=64:reserve_transparent=0[p];[s1][p]paletteuse=dither=bayer:bayer_scale=2",
        "-loop",
        "0",
        "-fs",
        "128k",
        "output.gif",
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
                  accept="image/png"
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
                        Drop your PNG here
                      </p>
                      <p className="text-sm text-gray-400">
                        or click to browse
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
                          {gifSize <= 128 * 1024 && (
                            <span className="text-green-400 ml-2">✓ Under 128KB</span>
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
