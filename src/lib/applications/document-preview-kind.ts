/** Picks the right inline-preview mode from a filename's extension — same list of accepted types as the applicant upload form (PDF, JPEG, PNG). */
export function previewKindFor(filename: string | null): 'pdf' | 'image' | null {
  if (!filename) return null

  const ext = filename.split('.').pop()?.toLowerCase()

  if (ext === 'pdf') return 'pdf'
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return 'image'

  return null
}
