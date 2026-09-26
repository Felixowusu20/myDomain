import type { ReactNode } from "react";

type Block =
  | { type: "p"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "code"; text: string };

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        code.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    if (line.trim() === "") {
      index += 1;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push({ type: "h3", text: line.slice(4).trim() });
      index += 1;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && (lines[index] ?? "").startsWith("- ")) {
        items.push((lines[index] ?? "").slice(2).trim());
        index += 1;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\d+\.\s/, "").trim());
        index += 1;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index] ?? "";
      if (
        current.trim() === "" ||
        current.startsWith("```") ||
        current.startsWith("- ") ||
        current.startsWith("### ") ||
        /^\d+\.\s/.test(current)
      ) {
        break;
      }
      paragraph.push(current.trim());
      index += 1;
    }
    if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
  }
  return blocks;
}

function safeHref(href: string) {
  const value = href.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (value.startsWith("https://")) return value;
  return null;
}

function Inline({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    if (match[1] != null) {
      nodes.push(
        <code key={match.index} className="rounded bg-[var(--field-bg)] px-1 py-0.5 font-mono text-[0.92em]">
          {match[1]}
        </code>,
      );
    } else if (match[2] != null) {
      nodes.push(
        <strong key={match.index} className="font-semibold text-[var(--navy)]">
          {match[2]}
        </strong>,
      );
    } else if (match[3] != null && match[4] != null) {
      const href = safeHref(match[4]);
      nodes.push(
        href ? (
          <a key={match.index} href={href} className="font-semibold text-[var(--navy)] underline">
            {match[3]}
          </a>
        ) : (
          match[3]
        ),
      );
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

export function DocBody({ body, baseUrl }: { body: string; baseUrl: string }) {
  const source = body.replaceAll("{{baseUrl}}", baseUrl.replace(/\/+$/, ""));
  const blocks = parseBlocks(source);
  return (
    <div className="space-y-3 text-sm leading-6 text-[var(--muted)]">
      {blocks.map((block, index) => {
        if (block.type === "h3") {
          return (
            <h3 key={index} className="pt-2 text-base font-bold text-[var(--navy)]">
              <Inline text={block.text} />
            </h3>
          );
        }
        if (block.type === "ul" || block.type === "ol") {
          const List = block.type === "ul" ? "ul" : "ol";
          return (
            <List key={index} className={`${block.type === "ul" ? "list-disc" : "list-decimal"} space-y-1 pl-5`}>
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`}>
                  <Inline text={item} />
                </li>
              ))}
            </List>
          );
        }
        if (block.type === "code") {
          return (
            <pre key={index} className="overflow-auto rounded-xl border border-[var(--line)] bg-[var(--field-bg)] p-4 font-mono text-[13px] leading-6 text-[var(--navy)]">
              {block.text}
            </pre>
          );
        }
        return (
          <p key={index}>
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}
