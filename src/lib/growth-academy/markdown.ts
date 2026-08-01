export type TocItem = { id: string; text: string; level: 2 | 3 };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slugHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 64);
}

/** Minimal markdown → HTML for Growth Academy articles (safe subset). */
export function markdownToHtml(md: string): { html: string; toc: TocItem[] } {
  const toc: TocItem[] = [];
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let codeBuf: string[] = [];

  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  const inline = (text: string) => {
    let t = escapeHtml(text);
    t = t.replace(
      /`([^`]+)`/g,
      "<code>$1</code>",
    );
    t = t.replace(
      /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g,
      '<a href="$2">$1</a>',
    );
    t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    return t;
  };

  for (const raw of lines) {
    if (raw.startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeLists();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(raw);
      continue;
    }

    if (/^---+$/.test(raw.trim())) {
      closeLists();
      out.push("<hr />");
      continue;
    }

    const h2 = raw.match(/^##\s+(.+)$/);
    const h3 = raw.match(/^###\s+(.+)$/);
    if (h2 || h3) {
      closeLists();
      const text = (h2?.[1] ?? h3![1]).trim();
      const level = h2 ? 2 : 3;
      const id = slugHeading(text);
      toc.push({ id, text, level: level as 2 | 3 });
      out.push(`<h${level} id="${id}">${inline(text)}</h${level}>`);
      continue;
    }

    if (/^>\s?/.test(raw)) {
      closeLists();
      const quote = raw.replace(/^>\s?/, "");
      out.push(`<blockquote><p>${inline(quote)}</p></blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(raw)) {
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inline(raw.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }

    if (/^\d+\.\s+/.test(raw)) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inline(raw.replace(/^\d+\.\s+/, ""))}</li>`);
      continue;
    }

    if (!raw.trim()) {
      closeLists();
      continue;
    }

    closeLists();
    out.push(`<p>${inline(raw)}</p>`);
  }

  closeLists();
  if (inCode) {
    out.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  }

  return { html: out.join("\n"), toc };
}
