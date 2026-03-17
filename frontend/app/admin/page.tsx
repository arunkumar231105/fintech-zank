import dynamic from 'next/dynamic';

// Disable SSR for the admin dashboard - uses browser APIs and client hooks
const AdminDashboard = dynamic(
  () => import('../../components/pages/admin/AdminDashboard'),
  { ssr: false }
);

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}
