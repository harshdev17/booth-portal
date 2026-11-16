/**
 * Resolves the actual allotment amount (paise) for a specific booth/stall,
 * given its shop_type and the category's configured amounts. Single source
 * of truth for the migration-0083 per-shop-type override — every call site
 * must go through this instead of reading allotment_amount_paise directly,
 * so a category that never sets the single/double override columns keeps
 * behaving exactly as it did before this feature existed.
 */
export function resolveAllotmentAmountPaise(
  category: {
    allotment_amount_paise: number | null
    allotment_amount_single_paise?: number | null
    allotment_amount_double_paise?: number | null
  },
  shopType: 'single' | 'double' | null | undefined
): number | null {
  if (shopType === 'single' && category.allotment_amount_single_paise != null) {
    return category.allotment_amount_single_paise
  }

  if (shopType === 'double' && category.allotment_amount_double_paise != null) {
    return category.allotment_amount_double_paise
  }

  return category.allotment_amount_paise
}
