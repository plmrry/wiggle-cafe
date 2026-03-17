import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = resolve(import.meta.dirname, "..");
const sourceDir = resolve(
	rootDir,
	"node_modules",
	"@ffmpeg",
	"core",
	"dist",
	"umd",
);
const targetDir = resolve(rootDir, "public", "ffmpeg");
const files = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

if (!existsSync(sourceDir)) {
	throw new Error("Missing @ffmpeg/core assets. Run `pnpm install` first.");
}

mkdirSync(targetDir, { recursive: true });

for (const file of files) {
	const sourcePath = resolve(sourceDir, file);
	const targetPath = resolve(targetDir, file);

	if (!existsSync(sourcePath)) {
		throw new Error(`Missing ${file} in ${sourceDir}`);
	}

	copyFileSync(sourcePath, targetPath);
}

console.log(`Copied FFmpeg core assets to ${targetDir}`);
