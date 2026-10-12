/**
 * The generic "Name of Firm / NGO / Organisation" question is no longer asked
 * of every applicant. Categories that have an organisation ask for its name in
 * their own section; this finds it so `applications.organisation_name` (still
 * used by the admin list, PDFs, exports and the draw) keeps working.
 *
 * Checked in order — the first non-empty value wins. Individuals (artisans,
 * awardees, special art & craft) have none, so the column is stored as ''.
 */
const ORGANISATION_NAME_FIELD_KEYS = ['organisation_name', 'business_firm_name', 'shg_name'] as const

export function deriveOrganisationName(categoryFields: Record<string, string> | undefined): string {
  for (const key of ORGANISATION_NAME_FIELD_KEYS) {
    const value = categoryFields?.[key]?.trim()

    if (value) return value.slice(0, 191)
  }

  return ''
}
