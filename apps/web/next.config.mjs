import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	...(process.env.NEXT_PERF_DIST_DIR ? { distDir: process.env.NEXT_PERF_DIST_DIR } : {}),
	experimental: {
		serverActions: { bodySizeLimit: "6mb" },
		outputFileTracingRoot: path.resolve(__dirname, "../../"),
		outputFileTracingIncludes: {
			"/**": [
				"../../node_modules/.prisma/client/**/*",
			],
		},
	},
};

export default nextConfig;
