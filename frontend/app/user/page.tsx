import dynamic from 'next/dynamic';

// Disable SSR for the entire dashboard - it uses browser APIs (window, usePathname, useState)
const UserDashboard = dynamic(
  () => import('../../components/pages/dashboard/UserDashboard'),
  { ssr: false }
);

export default function UserDashboardPage() {
  return <UserDashboard />;
}
