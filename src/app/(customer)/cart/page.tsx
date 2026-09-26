import Link from "next/link";
import { Search, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { CartView } from "@/components/cart-view";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function CartPage() {
  const { customerId } = await getCustomerContext();
  const items = await prisma.cartItem.findMany({
    where: { customerId },
    orderBy: { createdAt: "asc" },
  });
  const total = items.reduce((sum, item) => sum + item.amountCents, 0);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        kicker="Checkout"
        title="Your cart"
        description="Review items, remove anything you do not need, then pay."
        actions={
          <Link href="/search" className="btn btn-ghost">
            <Search className="h-4 w-4" />
            Keep shopping
          </Link>
        }
      />
      {items.length ? (
        <CartView
          items={items.map((item) => ({
            id: item.id,
            type: item.type,
            description: item.description,
            amountCents: item.amountCents,
          }))}
          total={total}
        />
      ) : (
        <div className="card">
          <EmptyState
            icon={ShoppingCart}
            title="Your cart is empty"
            body="Search for a domain, then add it here."
            action={
              <Link href="/search" className="btn btn-hot">
                <Search className="h-4 w-4" />
                Find a domain
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
