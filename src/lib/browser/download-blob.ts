// Triggers a browser download for a Blob already in memory — used for PDF
// downloads fetched with an Authorization header (receipt/application PDFs),
// where a plain <a href> can't carry that header, so the file has to be
// fetched via JS first and then "clicked" through a throwaway anchor.
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
