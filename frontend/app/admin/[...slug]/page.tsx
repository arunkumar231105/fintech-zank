import dynamic from 'next/dynamic';

// Disable SSR for the admin dashboard
const AdminDashboard = dynamic(
  () => import('../../../components/pages/admin/AdminDashboard'),
  { ssr: false }
);

export default function AdminDashboardSlugPage() {
  return <AdminDashboard />;
}
