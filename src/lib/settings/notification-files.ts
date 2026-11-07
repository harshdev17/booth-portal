import 'server-only'

import { query } from '@/lib/db/client'

export type NotificationFileRow = {
  id: number
  title: string
  titleHi: string | null
  filePath: string
  fileType: 'pdf' | 'image'
  originalFilename: string | null
  displayOrder: number
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

type Row = {
  id: number
  title: string
  title_hi: string | null
  file_path: string
  file_type: 'pdf' | 'image'
  original_filename: string | null
  display_order: number
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

function mapRow(row: Row): NotificationFileRow {
  return {
    id: row.id,
    title: row.title,
    titleHi: row.title_hi,
    filePath: row.file_path,
    fileType: row.file_type,
    originalFilename: row.original_filename,
    displayOrder: row.display_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/** Public listing: active notification files only, for the /notifications page. */
export async function listActiveNotificationFiles(): Promise<NotificationFileRow[]> {
  const rows = await query<Row[]>(
    `SELECT id, title, title_hi, file_path, file_type, original_filename, display_order, status, created_at, updated_at
     FROM notification_files
     WHERE status = 'active'
     ORDER BY display_order ASC, created_at DESC`
  )

  return rows.map(mapRow)
}

/** Admin listing: every notification file regardless of status, for /admin/settings/notification-board. */
export async function listAllNotificationFiles(): Promise<NotificationFileRow[]> {
  const rows = await query<Row[]>(
    `SELECT id, title, title_hi, file_path, file_type, original_filename, display_order, status, created_at, updated_at
     FROM notification_files
     ORDER BY display_order ASC, created_at DESC`
  )

  return rows.map(mapRow)
}
