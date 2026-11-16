import type { Metadata } from "next";
import { buildPublicBillMetadata, PublicBillView } from "@/components/public-bill";
import { loadSignedOrderByCode } from "@/lib/bill-share";

type ShortBillPageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({
  params,
}: ShortBillPageProps): Promise<Metadata> {
  const { code } = await params;
  return buildPublicBillMetadata(await loadSignedOrderByCode(code));
}

export default async function ShortBillPage({ params }: ShortBillPageProps) {
  const { code } = await params;
  return <PublicBillView loaded={await loadSignedOrderByCode(code)} />;
}
