import { OrdersPageSkeleton } from "@/app/(app)/orders/orders-skeleton";

export default function CustomerOrdersLoading() {
  return (
    <OrdersPageSkeleton
      title="Customer orders"
      subtitle="Loading order history…"
      showCustomerColumn={false}
    />
  );
}
