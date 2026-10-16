"use client";

import type { FormEvent } from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import LoadingButton from "@/components/ui/LoadingButton";

export default function SearchForm({ query }: { query: string }) {
  const router = useRouter();
  const [searching, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searching) return;
    const form = new FormData(event.currentTarget);
    const nextQuery = String(form.get("q") ?? "").trim();
    const queryString = nextQuery ? `?q=${encodeURIComponent(nextQuery)}` : "";
    startTransition(() => router.push(`/ar/search${queryString}`, { scroll: false }));
  }

  return (
    <form className="f" onSubmit={submit}>
      <input name="q" defaultValue={query} placeholder="ابحثي عن منتج" />
      <LoadingButton loading={searching} pendingText="جارٍ البحث...">
        بحث
      </LoadingButton>
    </form>
  );
}