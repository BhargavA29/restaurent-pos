import type { Metadata } from "next";
import { buildPublicBillMetadata, PublicBillView } from "@/components/public-bill";
import { loadSignedOrder } from "@/lib/bill-share";

type BillPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: BillPageProps): Promise<Metadata> {
  const { id } = await params;
  const { s } = await searchParams;
  return buildPublicBillMetadata(await loadSignedOrder(id, s));
}

export default async function PublicBillPage({ params, searchParams }: BillPageProps) {
  const { id } = await params;
  const { s } = await searchParams;
  return <PublicBillView loaded={await loadSignedOrder(id, s)} />;
}
