import { PrismaClient } from "@/generated/prisma";
const g = globalThis as unknown as {
	db?: PrismaClient;
	cartPerfListenerAttached?: boolean;
};
const cartPerfTrace = process.env.CART_PERF_TRACE === "1";
export const db: PrismaClient = g.db ?? new PrismaClient({
	log: cartPerfTrace ? [{ emit: "event", level: "query" }] : [],
});
g.db = db;

if (cartPerfTrace && !g.cartPerfListenerAttached) {
	(db as any).$on("query", (event: { duration: number }) => {
		console.info("[db-query-perf]", JSON.stringify({ durationMs: event.duration }));
	});
	g.cartPerfListenerAttached = true;
}
