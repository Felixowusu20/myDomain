import { ShieldAlert, ShieldCheck, Timer } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { maskPhone } from "@/lib/messaging/phone";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";

function otpLabel(otp: {
  consumedAt: Date | null;
  invalidatedAt: Date | null;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
}) {
  if (otp.consumedAt) return "VERIFIED";
  if (otp.invalidatedAt && otp.attempts >= otp.maxAttempts) return "LOCKED";
  if (otp.invalidatedAt) return "INVALIDATED";
  if (otp.expiresAt <= new Date()) return "EXPIRED";
  return "PENDING";
}

export default async function AdminOtpPage() {
  await getAdminContext();
  const [requests, verified, limited] = await Promise.all([
    prisma.otpRequest.findMany({
      include: { project: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.otpRequest.count({ where: { consumedAt: { not: null } } }),
    prisma.auditLog.count({ where: { action: "otp.rate_limited" } }),
  ]);
  const failed = requests.filter((otp) => otp.attempts > 0 && !otp.consumedAt).length;

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Messaging"
        title="OTP"
        description="Verification challenges. Codes are stored as hashes and are never shown here."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Timer} label="Recent requests" value={requests.length} />
        <StatCard icon={ShieldCheck} label="Verified" value={verified} />
        <StatCard icon={ShieldAlert} label="Rate-limit events" value={limited} hint={`${failed} recent rows have failed attempts`} />
      </div>
      {requests.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Request</th>
                <th>Project</th>
                <th>Phone</th>
                <th>Purpose</th>
                <th>Attempts</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((otp) => (
                <tr key={otp.id}>
                  <td className="font-mono text-xs">{otp.id.slice(0, 10)}</td>
                  <td>{otp.project.name}</td>
                  <td>{maskPhone(otp.phoneE164)}</td>
                  <td>{otp.purpose}</td>
                  <td>
                    {otp.attempts}/{otp.maxAttempts}
                  </td>
                  <td>
                    <StatusBadge status={otpLabel(otp)} />
                  </td>
                  <td>{formatDate(otp.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={ShieldCheck} title="No OTP requests" body="Phone verifications will show up here." />
        </div>
      )}
    </div>
  );
}
