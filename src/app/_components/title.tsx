import { Sparkles } from "lucide-react";

export function Title() {
	return (
		<div className="mb-12 text-center">
			<div className="mb-4 inline-flex items-center gap-2">
				<Sparkles className="h-8 w-8 text-white" />
				<h1 className="text-5xl font-bold text-white">Wiggle Café</h1>
				<Sparkles className="h-8 w-8 text-white" />
			</div>
			<p className="text-lg text-gray-400">Make it wiggle</p>
		</div>
	);
}
