import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "./db";

export const STORE_SETTINGS_TAG = "store-settings";

const readStoreSettings = unstable_cache(
	async () => {
		const settings = await db.setting.findMany({ select: { key: true, value: true } });
		return Object.fromEntries(settings.map(({ key, value }) => [key, value])) as Record<string, string>;
	},
	["store-settings-v1"],
	{ revalidate: 300, tags: [STORE_SETTINGS_TAG] },
);

export async function getSettings<T extends Record<string, string>>(defaults: T): Promise<T> {
	const stored = await readStoreSettings();
	return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, stored[key] ?? fallback])) as T;
}

export async function getSetting(key: string, fallback = "") {
	const stored = await readStoreSettings();
	return stored[key] ?? fallback;
}

export function revalidateStoreSettings() {
	revalidateTag(STORE_SETTINGS_TAG);
}

export const money = (n: number | string | { toString(): string }) => `${Number(n.toString()).toFixed(2)} ₪`;
