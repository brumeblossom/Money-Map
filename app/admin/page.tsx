import { notFound } from "next/navigation";
import { verifyAdminUser } from "@/lib/auth/admin";
import { getAdminAnalytics } from "@/lib/admin/stats";
import { AdminDashboardView } from "@/components/admin-dashboard-view";

export default async function AdminPage() {
  const { isAdmin } = await verifyAdminUser();

  // If not admin, serve standard 404 page so endpoint existence is not revealed
  if (!isAdmin) {
    notFound();
  }

  const initialData = await getAdminAnalytics();

  return <AdminDashboardView initialData={initialData} />;
}
