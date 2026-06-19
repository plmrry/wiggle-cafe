import { defineConfig } from "oxlint";

export default defineConfig({
	plugins: ["react", "jsx-a11y", "nextjs"],
	env: {
		browser: true,
		es2024: true,
		node: true,
	},
	settings: {
		react: {
			version: "19.0.0",
		},
	},
});
