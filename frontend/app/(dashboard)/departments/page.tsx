import { redirect } from 'next/navigation';

// Keep legacy bookmarks working while the organization screen replaces this UI.
export default function LegacyDepartmentsPage() {
  redirect('/organization');
}
