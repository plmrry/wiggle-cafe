"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Download, Sparkles, Upload } from "lucide-react";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

import { Title } from "#/app/_components/title";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";

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
					throw new Error("Failed to convert HEIF file. Your browser may not support HEIF images.");
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
		[isHeifFile],
	);

	const loadFFmpeg = async () => {
		if (ffmpegLoaded) return;

		if (!ffmpegRef.current) {
			ffmpegRef.current = new FFmpeg();
		}

		const ffmpeg = ffmpegRef.current;
		const coreURL = new URL("/ffmpeg/ffmpeg-core.js", window.location.origin).toString();
		const wasmURL = new URL("/ffmpeg/ffmpeg-core.wasm", window.location.origin).toString();

		ffmpeg.on("log", ({ message }) => {
			console.log(message);
		});

		await ffmpeg.load({
			coreURL,
			wasmURL,
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
			if (
				file &&
				(file.type === "image/png" ||
					file.type === "image/jpeg" ||
					file.type === "image/jpg" ||
					isHeifFile(file))
			) {
				setOriginalFilename(file.name);
				try {
					const dataURL = await convertFileToDataURL(file);
					setImage(dataURL);
					setGifUrl(null);
					setGifSize(null);
				} catch (error) {
					console.error("Error processing file:", error);
					alert(error instanceof Error ? error.message : "Failed to process the image file.");
				}
			}
		},
		[convertFileToDataURL, isHeifFile],
	);

	const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (
			file &&
			(file.type === "image/png" ||
				file.type === "image/jpeg" ||
				file.type === "image/jpg" ||
				isHeifFile(file))
		) {
			setOriginalFilename(file.name);
			try {
				const dataURL = await convertFileToDataURL(file);
				setImage(dataURL);
				setGifUrl(null);
				setGifSize(null);
			} catch (error) {
				console.error("Error processing file:", error);
				alert(error instanceof Error ? error.message : "Failed to process the image file.");
			}
		}
	};

	const handleGenerateGif = async () => {
		if (!image) return;

		console.debug("🎬 Starting GIF generation...");
		setIsGenerating(true);

		try {
			console.debug("📦 Loading FFmpeg...");
			await loadFFmpeg();
			console.debug("✅ FFmpeg loaded");

			const ffmpeg = ffmpegRef.current;
			if (!ffmpeg) throw new Error("FFmpeg not initialized");

			console.debug("🖼️ Loading source image...");
			const img = new window.Image();
			img.src = image;
			await new Promise((resolve) => {
				img.onload = resolve;
			});
			console.debug(`✅ Image loaded: ${img.width}x${img.height}`);

			const canvas = document.createElement("canvas");
			const ctx = canvas.getContext("2d", { alpha: true });
			if (!ctx) throw new Error("Could not get canvas context");

			// Limit canvas size to reduce file size
			const maxSize = 120;
			const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
			canvas.width = Math.floor(img.width * scale);
			canvas.height = Math.floor(img.height * scale);
			console.debug(
				`📐 Canvas size: ${canvas.width}x${canvas.height} (scale: ${scale.toFixed(2)})`,
			);

			// High framerate for frenetic animation
			const frameCount = 60;
			const frameDuration = 33; // ms per frame (30 FPS)

			// Generate random seeds for unique wiggle patterns each time
			const randomSeed1 = Math.random() * Math.PI * 2;
			const randomSeed2 = Math.random() * Math.PI * 2;
			console.debug(`🎲 Random seeds: ${randomSeed1.toFixed(2)}, ${randomSeed2.toFixed(2)}`);

			// Calculate the scaled image dimensions and maximum safe wiggle offset
			const imageScale = 0.9;
			const scaledWidth = img.width * scale * imageScale;
			const scaledHeight = img.height * scale * imageScale;

			// Maximum offset before image escapes canvas (half the difference between canvas and scaled image)
			const maxOffsetX = (canvas.width - scaledWidth) / 2;
			const maxOffsetY = (canvas.height - scaledHeight) / 2;
			console.debug(
				`🎯 Wiggle intensity: ${wiggleIntensity}x, Max offset: ${maxOffsetX.toFixed(1)}x${maxOffsetY.toFixed(1)}`,
			);

			console.debug(`🎞️ Generating ${frameCount} frames...`);
			for (let i = 0; i < frameCount; i++) {
				// Create frantic jumps with random offsets that change every frame
				// Use deterministic random based on frame number so it's reproducible
				const seedX = Math.sin(i * 12.9898 + randomSeed1) * 43758.5453;
				const seedY = Math.sin(i * 78.233 + randomSeed2) * 43758.5453;

				const rawOffsetX = ((seedX - Math.floor(seedX)) * 2 - 1) * maxOffsetX * wiggleIntensity;
				const rawOffsetY = ((seedY - Math.floor(seedY)) * 2 - 1) * maxOffsetY * wiggleIntensity;

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
				await ffmpeg.writeFile(`frame${i.toString().padStart(3, "0")}.png`, frameData);
			}
			console.debug("✅ All frames generated and written to FFmpeg");

			// Generate GIF with transparency support
			console.debug("🎨 Running FFmpeg to create GIF...");
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
				"60k", // File size limit
				"output.gif", // Output filename
			]);
			console.debug("✅ FFmpeg encoding complete");

			console.debug("📖 Reading output GIF...");
			const data = await ffmpeg.readFile("output.gif");
			const arrayData = new Uint8Array(data as Uint8Array);
			const gifBlob = new Blob([arrayData], { type: "image/gif" });
			const gifUrl = URL.createObjectURL(gifBlob);
			console.debug(`✅ GIF created: ${(gifBlob.size / 1024).toFixed(1)} KB`);

			// Store file size for display
			setGifSize(gifBlob.size);
			setGifUrl(gifUrl);

			console.debug("🧹 Cleaning up temporary files...");
			for (let i = 0; i < frameCount; i++) {
				await ffmpeg.deleteFile(`frame${i.toString().padStart(3, "0")}.png`);
			}
			await ffmpeg.deleteFile("output.gif");
			console.debug("✅ Cleanup complete");
		} catch (error) {
			console.error("❌ Error generating GIF:", error);
			alert("Failed to generate GIF. Please try again.");
		} finally {
			console.debug("🏁 GIF generation process finished");
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

	// Debounced effect to regenerate GIF when wiggle intensity changes
	/* oxlint-disable react/exhaustive-deps */
	useEffect(() => {
		if (!image || !gifUrl) return;

		const timeoutId = setTimeout(() => {
			handleGenerateGif();
		}, 500); // 500ms debounce

		return () => clearTimeout(timeoutId);
	}, [wiggleIntensity]);
	/* oxlint-enable react/exhaustive-deps */

	return (
		<div className="min-h-screen bg-black">
			<div className="container mx-auto max-w-4xl px-4 py-12">
				<Title />

				<div className="grid gap-8 md:grid-cols-2">
					<Card className="border-gray-800 bg-black p-6">
						<h2 className="mb-4 text-xl font-semibold text-white">Upload Emoji</h2>
						<button
							type="button"
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							onClick={() => fileInputRef.current?.click()}
							aria-label="Upload image file"
							className={`flex min-h-75 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-all duration-200 ${
								isDragging
									? "scale-105 border-white bg-gray-900"
									: "border-gray-800 hover:border-gray-600 hover:bg-gray-950"
							} `}
						>
							<input
								ref={fileInputRef}
								type="file"
								accept="image/png,image/jpeg,image/jpg,image/heic,image/heif"
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
										className="mx-auto max-h-50 max-w-50"
									/>
									<p className="text-sm text-gray-400">Click to change image</p>
								</div>
							) : (
								<div className="space-y-4">
									<Upload className="mx-auto h-16 w-16 text-gray-600" />
									<div>
										<p className="text-lg font-medium text-white">Drop your image here</p>
										<p className="text-sm text-gray-400">or click to browse (PNG, JPEG, HEIC)</p>
									</div>
								</div>
							)}
						</button>

						<Button
							onClick={handleGenerateGif}
							disabled={!image || isGenerating}
							className="mt-4 w-full bg-white text-black hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-600"
							size="lg"
						>
							{isGenerating ? (
								<>
									<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
									Generating Wiggle...
								</>
							) : (
								<>
									<Sparkles className="mr-2 h-4 w-4" />
									Make it Wiggle
								</>
							)}
						</Button>
					</Card>

					<Card className="border-gray-800 bg-black p-6">
						<h2 className="mb-4 text-xl font-semibold text-white">Wiggling Result</h2>
						<div className="flex min-h-75 flex-col items-center justify-center rounded-lg border-2 border-gray-800 bg-gray-950 p-8 text-center">
							{gifUrl ? (
								<div className="space-y-4">
									<Image
										src={gifUrl || "/placeholder.svg"}
										alt="Wiggling emoji"
										width={200}
										height={200}
										className="mx-auto max-h-50 max-w-50"
									/>
									<div className="space-y-1">
										<p className="text-sm text-gray-400">Your wiggling emoji is ready</p>
										{gifSize && (
											<p className="text-xs text-gray-500">File size: {formatFileSize(gifSize)}</p>
										)}
									</div>
								</div>
							) : (
								<div className="space-y-4">
									<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-900">
										<Sparkles className="h-8 w-8 text-gray-600" />
									</div>
									<p className="text-gray-400">Your wiggling GIF will appear here</p>
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
								max="10"
								step="0.1"
								value={wiggleIntensity}
								onChange={(e) => setWiggleIntensity(parseFloat(e.target.value))}
								className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-800 accent-white"
							/>
						</div>

						<Button
							onClick={downloadGif}
							disabled={!gifUrl}
							variant="outline"
							className="hover:border-gray-1000 mt-4 w-full cursor-pointer border-gray-800 bg-transparent text-white disabled:border-gray-900 disabled:text-gray-600"
							size="lg"
						>
							<Download className="mr-2 h-4 w-4" />
							Download GIF
						</Button>
					</Card>
				</div>
			</div>
		</div>
	);
}
