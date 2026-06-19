import { Sparkles } from "lucide-react";

export function Title() {
	return (
		<div
			className="mb-12 text-center mt-8"
			ref={(ref) => {
				if (!ref) return;
				const animations = ref?.getAnimations() ?? [];
				if (animations.length > 0) return;
				ref.animate(
					Array.from({ length: 10 }, () => {
						const [randomX, randomY] = crypto.getRandomValues(new Int8Array(2));
						const x = Math.floor(randomX * 0.2);
						const y = Math.floor(randomY * 0.1);
						return {
							translate: `${x}px ${y}px`,
						};
					}),
					{
						duration: 1000,
						easing: "steps(10)",
						fill: "both",
						iterations: Infinity,
					},
				);
			}}
		>
			<div className="mb-4 inline-flex items-center gap-2">
				<Sparkles className="h-8 w-8 text-white" />
				<h1 className="block text-5xl font-bold text-white">Wiggle Café</h1>
				<Sparkles className="h-8 w-8 text-white" />
			</div>
			<p className="text-lg text-gray-400">Make it wiggle</p>
		</div>
	);
}
