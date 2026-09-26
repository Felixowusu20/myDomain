import { ComingSoonGate } from "@/components/coming-soon-gate";

export default function SitesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComingSoonGate
      title="Sites coming soon"
      description="GitHub deploys and site previews aren't available yet. For now, register a domain and connect it to your preferred host."
    >
      {children}
    </ComingSoonGate>
  );
}
