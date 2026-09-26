import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getHomepageCms } from "@/lib/services/cms.service";

export default async function AdminLoginPage() {
  const cms = await getHomepageCms().catch(() => null);
  return (
    <Suspense>
      <AuthForm mode="login" admin sideImageUrl={cms?.home.heroImageUrl || undefined} />
    </Suspense>
  );
}
