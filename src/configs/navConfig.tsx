// Third-party Imports
import type * as Icon from 'lucide-react'

type IconName = keyof typeof Icon

export type MenuLeafSubItem = {
  label: string
  href: string
  activePath?: string
  badge?: string
  badgeClassName?: string
  target?: '_blank' | '_self' | '_parent' | '_top'

  /** Permission required to see this item. Enforced server-side too — see src/lib/rbac. */
  permission?: string
}

export type MenuGroupSubItem = {
  label: string
  childItems: MenuLeafSubItem[]
}

export type MenuSubItem = MenuLeafSubItem | MenuGroupSubItem

export type MenuItem = {
  icon: IconName
  label: string
  permission?: string
} & (
  | {
      href: string
      badge?: string
      badgeClassName?: string
      childItems?: never
      target?: '_blank' | '_self' | '_parent' | '_top'
    }
  | {
      href?: never
      badge?: string
      badgeClassName?: string
      childItems: MenuSubItem[]
    }
)

export type NavItem = {
  groupLabel?: string
  items: MenuItem[]
}

/**
 * KDB Admin Panel navigation. Structure/grouping per .ai/ADMIN_PANEL.md and
 * .ai/ADMIN_TRANSFORMATION_PLAN.md Section 5. `permission` keys correspond to
 * .ai/RBAC.md's permission catalogue and are enforced again server-side —
 * this file only controls what's rendered, never what's authorized.
 */
export const navItems: NavItem[] = [
  {
    groupLabel: 'Overview',
    items: [
      {
        icon: 'LayoutDashboard',
        label: 'Dashboard',
        href: '/admin/dashboard'
      }
    ]
  },
  {
    groupLabel: 'Applications',
    items: [
      {
        icon: 'FileText',
        label: 'All Applications',
        href: '/admin/applications',
        permission: 'application:view'
      },
      {
        icon: 'FileCheck2',
        label: 'Document Verification',
        href: '/admin/documents',
        permission: 'document:view'
      }
    ]
  },
  {
    groupLabel: 'Payments',
    items: [
      {
        icon: 'CreditCard',
        label: 'All Payments',
        href: '/admin/payments',
        permission: 'payment:view'
      },
      {
        icon: 'Settings2',
        label: 'Razorpay Settings',
        href: '/admin/settings/razorpay',
        permission: 'config:manage'
      }
    ]
  },
  {
    groupLabel: 'Inventory & Allotment',
    items: [
      {
        icon: 'Store',
        label: 'Inventory / Booths & Stalls',
        href: '/admin/inventory',
        permission: 'inventory:view'
      },
      {
        icon: 'Shuffle',
        label: 'Draw Process',
        href: '/admin/draw',
        permission: 'draw:view'
      },
      {
        icon: 'ClipboardCheck',
        label: 'Booth/Stall Allotment',
        href: '/admin/allotment',
        permission: 'allotment:perform'
      }
    ]
  },
  {
    groupLabel: 'Reports & Security',
    items: [
      {
        icon: 'BarChart3',
        label: 'Reports & Exports',
        href: '/admin/reports',
        permission: 'report:view'
      },
      {
        icon: 'ShieldAlert',
        label: 'Audit Logs',
        href: '/admin/audit-logs',
        permission: 'audit:view'
      }
    ]
  },
  {
    groupLabel: 'Administration',
    items: [
      {
        icon: 'ShieldCheck',
        label: 'User Roles & Permissions',
        href: '/admin/roles',
        permission: 'role:manage'
      },
      {
        icon: 'MessageSquare',
        label: 'WhatsApp / SMS Settings',
        href: '/admin/settings/notifications',
        permission: 'config:manage'
      },
      {
        icon: 'SlidersHorizontal',
        label: 'Fees / Categories / Event Settings',
        href: '/admin/settings/general',
        permission: 'config:manage'
      },
      {
        icon: 'Megaphone',
        label: 'Homepage Notices',
        href: '/admin/settings/notices',
        permission: 'config:manage'
      },
      {
        icon: 'Bot',
        label: 'reCAPTCHA Settings',
        href: '/admin/settings/recaptcha',
        permission: 'config:manage'
      },
      {
        icon: 'Phone',
        label: 'Contact & Social Settings',
        href: '/admin/settings/contact',
        permission: 'config:manage'
      }
    ]
  }
]
