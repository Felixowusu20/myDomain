import { Settings } from "lucide-react";
import { getCustomerContext } from "@/lib/page-auth";
import { AccountForm } from "@/components/account-form";
import { CustomerTotpSettings } from "@/components/customer-totp-settings";
import { PageHeader } from "@/components/ui";

export default async function AccountPage() {
  const { user } = await getCustomerContext();
  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Profile"
        title="Account settings"
        description="Update your profile security, and sign-in details."
      />
      <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
        <Settings className="h-4 w-4" />
        Signed in as {user.email}
      </div>
      <CustomerTotpSettings />
      <AccountForm
        name={user.name}
        email={user.email}
        phone={user.phone ?? ""}
        avatarUrl={user.avatarUrl ?? ""}
      />
    </div>
  );
}
