import {
  BarChart3,
  Calendar,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Map,
  MessageSquare,
  Percent,
  Receipt,
  RotateCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  TicketPercent,
  Users,
  type LucideIcon,
} from 'lucide-react';
import type { TFunction } from 'i18next';

/**
 * Design Council Phase 4 — Nav A: the 17 agency destinations grouped
 * into Operate / Money / Grow / Account. Single source for the desktop
 * sidebar AND the mobile drawer, so mobile can no longer silently drop
 * items (Compliance / Refunds / Reviews were unreachable on mobile).
 * Phase 4 also fixes the duplicate-icon pair: promo codes keep
 * TicketPercent, price rules now use Percent.
 */
export type AgencyNavItem = { name: string; href: string; icon: LucideIcon; badgeKey?: 'proofs' };
export type AgencyNavGroup = { label: string; items: AgencyNavItem[] };

export function getAgencyNavGroups(t: TFunction): AgencyNavGroup[] {
  return [
    {
      label: t('sidebar.groups.operate'),
      items: [
        { name: t('sidebar.dashboard'), href: '/dashboard', icon: LayoutDashboard },
        { name: t('sidebar.bookings'), href: '/dashboard/bookings', icon: Calendar, badgeKey: 'proofs' },
        { name: t('sidebar.myTrips'), href: '/dashboard/trips', icon: Map },
        { name: t('sidebar.messages'), href: '/dashboard/messages', icon: MessageSquare },
        { name: t('batchF.customRequests'), href: '/dashboard/custom-requests', icon: Sparkles },
        { name: t('sidebar.quotes'), href: '/dashboard/quotes', icon: FileText },
        { name: t('sidebar.crm'), href: '/dashboard/crm', icon: Users },
      ],
    },
    {
      label: t('sidebar.groups.money'),
      items: [
        { name: t('sidebar.wallet'), href: '/dashboard/wallet', icon: CreditCard },
        { name: t('sidebar.refunds'), href: '/dashboard/refunds', icon: RotateCcw },
        { name: t('sidebar.billing'), href: '/dashboard/settings/billing', icon: Receipt },
      ],
    },
    {
      label: t('sidebar.groups.grow'),
      items: [
        { name: t('sidebar.reviews'), href: '/dashboard/reviews', icon: Star },
        { name: t('sidebar.promoCodes'), href: '/dashboard/promo-codes', icon: TicketPercent },
        { name: t('sidebar.priceRules'), href: '/dashboard/price-rules', icon: Percent },
        { name: t('sidebar.analytics'), href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
    {
      label: t('sidebar.groups.account'),
      items: [
        { name: t('sidebar.compliance'), href: '/dashboard/onboarding', icon: ShieldCheck },
        { name: t('sidebar.settings'), href: '/dashboard/settings', icon: Settings },
        { name: t('sidebar.support'), href: '/dashboard/support', icon: LifeBuoy },
      ],
    },
  ];
}

export function flattenAgencyNav(groups: AgencyNavGroup[]): AgencyNavItem[] {
  return groups.flatMap((group) => group.items);
}
