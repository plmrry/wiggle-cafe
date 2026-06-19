import { defineConfig } from "oxfmt";

export default defineConfig({
	useTabs: true,
	sortImports: {
		customGroups: [
			{
				groupName: "react-core",
				elementNamePattern: ["react", "react-dom", "next", "next/*"],
			},
			{
				groupName: "framework-libs",
				elementNamePattern: ["@vercel/*", "geist", "geist/*"],
			},
			{
				groupName: "ui-libs",
				elementNamePattern: ["lucide-react", "@radix-ui/*"],
			},
			{
				groupName: "app-components",
				elementNamePattern: ["@/components", "@/components/*", "@/components/**"],
			},
			{
				groupName: "app-lib",
				elementNamePattern: ["@/lib", "@/lib/*", "@/lib/**"],
			},
		],
		groups: [
			"type-import",
			"react-core",
			"framework-libs",
			"ui-libs",
			["value-builtin", "value-external"],
			["type-internal", "type-subpath"],
			["app-components", "app-lib"],
			["value-internal", "value-subpath"],
			["type-parent", "type-sibling", "type-index"],
			["value-parent", "value-sibling", "value-index"],
			"style",
			"unknown",
		],
		ignoreCase: true,
		internalPattern: ["@/", "#"],
		newlinesBetween: true,
		order: "asc",
		partitionByComment: true,
		partitionByNewline: false,
		sortSideEffects: false,
	},
	sortTailwindcss: {
		attributes: [],
		functions: ["cn", "clsx", "cva"],
		preserveDuplicates: false,
		preserveWhitespace: false,
		stylesheet: "./src/app/globals.css",
	},
	sortPackageJson: {
		sortScripts: true,
	},
});
