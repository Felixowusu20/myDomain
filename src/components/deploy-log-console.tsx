"use client";

import { useEffect, useRef } from "react";
import { LoaderCircle, SquareTerminal } from "lucide-react";

type DeployStatus = "BUILDING" | "LIVE" | "FAILED" | "IDLE" | string;

function lineTone(line: string) {
  const lower = line.toLowerCase();
  if (lower.includes("failed") || lower.includes("error") || lower.includes("could not")) return "is-error";
  if (lower.includes("successfully") || lower.includes("is live") || lower.includes("ready at")) return "is-ok";
  if (lower.includes("waiting") || lower.includes("installing") || lower.includes("downloading") || lower.includes("queued") || lower.includes("building") || lower.includes("starting") || lower.includes("running")) {
    return "is-info";
  }
  if (lower.includes("warning") || lower.includes("warn")) return "is-warn";
  return "";
}

function statusLabel(status: DeployStatus) {
  if (status === "BUILDING") return "Building";
  if (status === "LIVE") return "Live";
  if (status === "FAILED") return "Failed";
  if (status === "IDLE") return "Idle";
  return status;
}

export function DeployLogConsole({
  log,
  lines,
  status = "IDLE",
  title = "Deployment log",
  compact = false,
}: {
  log?: string | null;
  lines?: string[];
  status?: DeployStatus;
  title?: string;
  compact?: boolean;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  const parsed = lines?.length
    ? lines
    : (log ?? "")
        .split("\n")
        .map((line) => line.trimEnd())
        .filter((line, index, all) => line.length > 0 || (index > 0 && index < all.length - 1));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [parsed.join("\n"), status]);

  if (!parsed.length) return null;

  return (
    <section className={`deploy-console ${compact ? "is-compact" : ""}`} aria-live="polite">
      <header className="deploy-console-head">
        <div className="deploy-console-title">
          <SquareTerminal className="h-4 w-4" />
          <span>{title}</span>
        </div>
        <div className={`deploy-console-status is-${String(status).toLowerCase()}`}>
          {status === "BUILDING" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
          <span>{statusLabel(status)}</span>
        </div>
      </header>
      <div className="deploy-console-body" role="log">
        {parsed.map((line, index) => (
          <p key={`${index}-${line.slice(0, 24)}`} className={`deploy-console-line ${lineTone(line)}`}>
            <span className="deploy-console-gutter">{String(index + 1).padStart(2, "0")}</span>
            <span className="deploy-console-text">{line || " "}</span>
          </p>
        ))}
        {status === "BUILDING" ? (
          <p className="deploy-console-line is-cursor">
            <span className="deploy-console-gutter">··</span>
            <span className="deploy-console-text">
              <span className="deploy-console-caret" />
            </span>
          </p>
        ) : null}
        <div ref={endRef} />
      </div>
    </section>
  );
}
