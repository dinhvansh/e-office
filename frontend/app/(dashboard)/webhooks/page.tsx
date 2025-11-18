"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";

const DEFAULT_EVENTS = ["document.uploaded", "sign.started", "sign.completed", "sign.declined"];

export default function WebhooksPage() {
  const { fetchJson } = useAuth();
  const [url, setUrl] = useState("https://example.com/webhook");
  const [selected, setSelected] = useState<string[]>(DEFAULT_EVENTS);

  const mutation = useMutation({
    mutationFn: async () => {
      await fetchJson("/webhooks/register", {
        method: "POST",
        body: JSON.stringify({ url, events: selected }),
      });
    },
  });

  const toggleEvent = (eventName: string) => {
    setSelected((prev) => (prev.includes(eventName) ? prev.filter((e) => e !== eventName) : [...prev, eventName]));
  };

  return (
    <section className="card space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">Webhooks</h2>
      <label className="text-sm">
        Endpoint URL
        <input className="input mt-1" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
      </label>
      <div>
        <p className="text-sm font-semibold text-slate-700">Su kien</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          {DEFAULT_EVENTS.map((eventName) => (
            <label key={eventName} className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={selected.includes(eventName)}
                onChange={() => toggleEvent(eventName)}
              />
              {eventName}
            </label>
          ))}
        </div>
      </div>
      <button
        onClick={() => mutation.mutate()}
        className="rounded-xl bg-brand-600 px-4 py-2 text-white hover:bg-brand-500"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? "Dang dang ky..." : "Dang ky webhook"}
      </button>
      {mutation.isSuccess && <p className="text-sm text-green-600">Da cap nhat webhook!</p>}
    </section>
  );
}
