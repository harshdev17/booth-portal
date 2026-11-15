import 'server-only'

import { query, type TransactionQuery } from '@/lib/db/client'

export type ResultDocumentRow = {
  id: number
  title: string | null
  filePath: string
  originalFilename: string
  createdAt: string
}

/** Public listing: every uploaded result document, newest first, for the /result page. */
export async function listResultDocuments(runQuery: TransactionQuery = query): Promise<ResultDocumentRow[]> {
  return runQuery<ResultDocumentRow[]>(
    `SELECT id, title, file_path AS filePath, original_filename AS originalFilename, created_at AS createdAt
     FROM result_documents
     ORDER BY created_at DESC`
  )
}
