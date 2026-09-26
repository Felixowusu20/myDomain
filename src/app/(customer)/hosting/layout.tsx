import { ComingSoonGate } from "@/components/coming-soon-gate";

export default function HostingLayout({ children }: { children: React.ReactNode }) {
  return (
    <ComingSoonGate
      title="Hosting coming soon"
      description="Platform hosting isn't live yet. You can buy and manage domains today, then point them at any host you already use."
    >
      {children}
    </ComingSoonGate>
  );
}
