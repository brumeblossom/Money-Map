import { LoanDetailView } from "@/components/loan-detail-view";

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LoanDetailView id={id} />;
}
