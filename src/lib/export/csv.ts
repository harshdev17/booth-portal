/**
 * CSV cell escaping shared by every admin export/report route. Guards
 * against two distinct risks for the same cell:
 * 1. CSV structure — a value containing a comma/quote/newline must be
 *    quoted, with embedded quotes doubled, or it corrupts the row layout.
 * 2. Formula/CSV injection — a value starting with =, +, -, @, tab, or CR
 *    is interpreted by Excel/LibreOffice/Google Sheets as the start of a
 *    formula when the exported .csv is opened, not as literal text. Since
 *    these exports include applicant-supplied free text (name, organisation,
 *    work purpose, remarks, etc.), an applicant could submit e.g.
 *    `=HYPERLINK("http://attacker.example/x","Click")` as their organisation
 *    name, which executes when an admin later opens the export in a
 *    spreadsheet — a well-known, practical attack against portals that
 *    export user-submitted text. Prefixing with a single quote (') forces
 *    spreadsheet apps to treat the cell as plain text while leaving the
 *    value byte-identical for any other CSV consumer (no visible change in
 *    a plain text viewer).
 */
export function toCsvField(value: unknown): string {
  let str = value === null || value === undefined ? '' : String(value)

  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`
  }

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }

  return str
}
