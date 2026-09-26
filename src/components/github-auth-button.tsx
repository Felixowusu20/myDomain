import { Github } from "lucide-react";

export function GithubAuthButton({
  intent = "login",
  next = "/sites",
  label,
}: {
  intent?: "login" | "connect";
  next?: string;
  label?: string;
}) {
  const href = `/api/auth/github?intent=${intent}&next=${encodeURIComponent(next)}`;
  return (
    <a href={href} className="btn btn-github w-full" data-no-loader>
      <Github className="h-4 w-4" />
      {label ?? (intent === "connect" ? "Connect GitHub" : "Continue with GitHub")}
    </a>
  );
}
