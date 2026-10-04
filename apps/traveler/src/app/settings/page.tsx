import { redirect } from 'next/navigation';

// Settings live under /profile — redirect there to avoid a dead route.
export default function SettingsPage() {
  redirect('/profile');
}
