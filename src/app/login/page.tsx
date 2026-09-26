import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { isGithubConfigured } from "@/lib/github/config";
import { getHomepageCms } from "@/lib/services/cms.service";

export default async function LoginPage() {
  const cms = await getHomepageCms().catch(() => null);
  return (
    <Suspense>
      <AuthForm
        mode="login"
        githubEnabled={isGithubConfigured()}
        sideImageUrl={cms?.home.heroImageUrl || undefined}
      />
    </Suspense>
  );
}
