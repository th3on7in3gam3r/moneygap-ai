"use client";

import { Bookmark, Check, Link2 } from "lucide-react";
import { useEffect, useState } from "react";

export function ShareBar({
  title,
  url,
  articleId,
}: {
  title: string;
  url: string;
  articleId: string;
}) {
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ga_bookmarks");
      const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      setBookmarked(ids.includes(articleId));
    } catch {
      setBookmarked(false);
    }
  }, [articleId]);

  function toggleBookmark() {
    try {
      const raw = localStorage.getItem("ga_bookmarks");
      const ids: string[] = raw ? (JSON.parse(raw) as string[]) : [];
      const next = bookmarked
        ? ids.filter((id) => id !== articleId)
        : [...ids, articleId];
      localStorage.setItem("ga_bookmarks", JSON.stringify(next));
      setBookmarked(!bookmarked);
    } catch {
      /* ignore */
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    void fetch("/api/growth-academy/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articleId,
        eventType: "share",
        meta: { channel: "copy" },
      }),
    });
  }

  const tweet = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  const itemClass =
    "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-fg-muted transition hover:bg-bg-muted hover:text-fg";

  return (
    <div className="flex flex-wrap items-center gap-1 border-y border-border py-3">
      <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">
        Share
      </span>
      <a href={tweet} target="_blank" rel="noreferrer" className={itemClass}>
        <span className="font-display text-sm font-semibold">X</span>
      </a>
      <a href={linkedin} target="_blank" rel="noreferrer" className={itemClass}>
        <span className="font-display text-sm font-semibold">in</span>
        LinkedIn
      </a>
      <button type="button" className={itemClass} onClick={() => void copyLink()}>
        {copied ? <Check className="h-3.5 w-3.5 text-accent" /> : <Link2 className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <button type="button" className={itemClass} onClick={toggleBookmark}>
        <Bookmark
          className={`h-3.5 w-3.5 ${bookmarked ? "fill-accent text-accent" : ""}`}
        />
        {bookmarked ? "Saved" : "Save"}
      </button>
    </div>
  );
}
