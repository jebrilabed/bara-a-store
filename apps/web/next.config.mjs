export default {
	reactStrictMode: true,
	...(process.env.NEXT_PERF_DIST_DIR ? { distDir: process.env.NEXT_PERF_DIST_DIR } : {}),
	experimental: { serverActions: { bodySizeLimit: "6mb" } },
};
