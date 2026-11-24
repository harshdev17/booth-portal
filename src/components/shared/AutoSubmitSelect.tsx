'use client'

import type { SelectHTMLAttributes } from 'react'

/**
 * A plain <select> that submits its enclosing <form> the instant the admin
 * picks a different option — no separate "Filter" button click needed.
 * Used inside otherwise-server-rendered GET-form filter bars (see
 * /admin/payments) so the category dropdown behaves like the status/tab
 * links right above it (click once, see results), while search text still
 * applies on Enter via the form's own native submit.
 */
const AutoSubmitSelect = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} onChange={e => e.currentTarget.form?.requestSubmit()} />
)

export default AutoSubmitSelect
