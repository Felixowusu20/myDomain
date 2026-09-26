import { CustomerShell } from "@/components/customer-shell";
import { getCustomerContext } from "@/lib/page-auth";
import { prisma } from "@/lib/db";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { user, customerId } = await getCustomerContext();
  const cartCount = await prisma.cartItem.count({ where: { customerId } });
  return (
    <CustomerShell name={user.name} email={user.email} cartCount={cartCount}>
      {children}
    </CustomerShell>
  );
}
