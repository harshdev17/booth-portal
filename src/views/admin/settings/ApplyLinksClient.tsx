'use client'

import { useState } from 'react'

import { BanIcon, CheckCircle2Icon, CopyIcon, Loader2Icon, PencilIcon, PlusIcon, SaveIcon } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export type ApplyLinkCategoryOption = { id: number; name: string }

export type ApplyLinkRow = {
  id: number
  token: string
  categoryId: number
  categoryName: string
  categorySlug: string
  useCount: number
  expiresAt: string | null
  revokedAt: string | null
  createdAt: string
  lastUsedAt: string | null
}

const getLinkStatus = (link: ApplyLinkRow): { label: string; className: string } => {
  if (link.revokedAt) return { label: 'Revoked', className: 'bg-slate-100 text-slate-600' }

  if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
    return { label: 'Expired', className: 'bg-amber-100 text-amber-800' }
  }

  return { label: 'Active', className: 'bg-emerald-100 text-emerald-800' }
}

// datetime-local wants "YYYY-MM-DDTHH:mm" with no timezone/seconds.
const toDatetimeLocalValue = (isoOrDbValue: string | null): string => {
  if (!isoOrDbValue) return ''

  const d = new Date(isoOrDbValue)

  if (Number.isNaN(d.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Admin UI for generating/managing "apply anyway" links (migrations
 * 0094/0095) — per explicit request (2026-11-25): "band form ka link kisi
 * ko share kare to vo fill kar paaye". A category can be closed to the
 * public while this lets ONE specific recipient still submit a form — the
 * category stays closed for everyone else, enforced server-side regardless
 * of what this page shows (see bypass-link.ts / validate-submission.ts).
 *
 * The token itself is stored in plaintext (not just hashed) so this list
 * can offer "Copy" on every row, not just once at creation — explicitly
 * confirmed with the user, who accepted the small security tradeoff for the
 * convenience.
 */
export default function ApplyLinksClient({
  categories,
  initialLinks
}: {
  categories: ApplyLinkCategoryOption[]
  initialLinks: ApplyLinkRow[]
}) {
  const [links, setLinks] = useState(initialLinks)
  const [categoryId, setCategoryId] = useState<string>(categories[0] ? String(categories[0].id) : '')
  const [expiresAt, setExpiresAt] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revokingId, setRevokingId] = useState<number | null>(null)
  const [copiedRowId, setCopiedRowId] = useState<number | null>(null)
  const [editingExpiryId, setEditingExpiryId] = useState<number | null>(null)
  const [editingExpiryValue, setEditingExpiryValue] = useState('')
  const [isSavingExpiry, setIsSavingExpiry] = useState(false)

  const buildUrl = (link: ApplyLinkRow) =>
    `${window.location.origin}/apply/${link.categorySlug}?bypass=${encodeURIComponent(link.token)}`

  const handleCreate = async () => {
    if (!categoryId) {
      setError('Select a category.')

      return
    }

    setIsCreating(true)
    setError(null)
    setGeneratedUrl(null)

    try {
      const response = await fetch('/api/admin/apply-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: Number(categoryId),
          expiresAt: expiresAt || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? 'Failed to create link.')

        return
      }

      const newLink: ApplyLinkRow = {
        id: data.id,
        token: data.token,
        categoryId: Number(categoryId),
        categoryName: categories.find(c => c.id === Number(categoryId))?.name ?? '',
        categorySlug: data.categorySlug,
        useCount: 0,
        expiresAt: expiresAt || null,
        revokedAt: null,
        createdAt: new Date().toISOString(),
        lastUsedAt: null
      }

      setGeneratedUrl(buildUrl(newLink))
      setLinks(prev => [newLink, ...prev])
    } catch {
      setError('Could not connect to server. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!generatedUrl) return

    try {
      await navigator.clipboard.writeText(generatedUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — the URL is already shown as plain text, so the admin can select/copy it manually.
    }
  }

  const handleCopyRow = async (link: ApplyLinkRow) => {
    try {
      await navigator.clipboard.writeText(buildUrl(link))
      setCopiedRowId(link.id)
      setTimeout(() => setCopiedRowId(null), 2000)
    } catch {
      setError('Could not copy automatically — please copy the link manually.')
    }
  }

  const handleRevoke = async (link: ApplyLinkRow) => {
    if (!window.confirm('Revoke this link? It will stop working immediately.')) return

    setRevokingId(link.id)
    setError(null)

    try {
      const response = await fetch(`/api/admin/apply-links/${link.id}/revoke`, { method: 'PATCH' })

      if (!response.ok) {
        const data = await response.json()

        setError(data.error ?? 'Failed to revoke link.')

        return
      }

      setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, revokedAt: new Date().toISOString() } : l)))
    } catch {
      setError('Could not connect to server. Please try again.')
    } finally {
      setRevokingId(null)
    }
  }

  const startEditExpiry = (link: ApplyLinkRow) => {
    setEditingExpiryId(link.id)
    setEditingExpiryValue(toDatetimeLocalValue(link.expiresAt))
    setError(null)
  }

  const handleSaveExpiry = async (link: ApplyLinkRow) => {
    setIsSavingExpiry(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/apply-links/${link.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: editingExpiryValue || null })
      })

      if (!response.ok) {
        const data = await response.json()

        setError(data.error ?? 'Failed to update expiry.')

        return
      }

      setLinks(prev => prev.map(l => (l.id === link.id ? { ...l, expiresAt: editingExpiryValue || null } : l)))
      setEditingExpiryId(null)
    } catch {
      setError('Could not connect to server. Please try again.')
    } finally {
      setIsSavingExpiry(false)
    }
  }

  return (
    <div className='flex flex-col gap-6'>
      {error && (
        <Alert variant='destructive' className='rounded-xl'>
          <AlertDescription className='font-semibold'>{error}</AlertDescription>
        </Alert>
      )}

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Generate Link</CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-4 pt-6'>
          <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
            <div className='flex flex-col gap-1.5'>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={value => value && setCategoryId(value)}>
                <SelectTrigger className='w-full'>
                  <SelectValue placeholder='Select a category'>
                    {categories.find(c => String(c.id) === categoryId)?.name ?? 'Select a category'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='flex flex-col gap-1.5'>
              <Label>Expires At (optional)</Label>
              <Input type='datetime-local' value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className='w-fit bg-[#0c2847] hover:bg-[#071f3a] text-xs font-bold rounded-lg text-white'
          >
            {isCreating ? <Loader2Icon className='size-3.5 animate-spin mr-1.5' /> : <PlusIcon className='size-3.5 mr-1.5' />}
            Generate Link
          </Button>

          {generatedUrl && (
            <Alert className='border-emerald-300 bg-emerald-50 text-emerald-900 rounded-xl'>
              <CheckCircle2Icon className='size-5 text-emerald-600' />
              <AlertDescription className='flex flex-col gap-2'>
                <span className='font-semibold'>Link generated.</span>
                <div className='flex items-center gap-2'>
                  <code className='flex-1 overflow-x-auto rounded-md border border-emerald-200 bg-white px-2 py-1.5 text-xs'>
                    {generatedUrl}
                  </code>
                  <Button type='button' size='sm' variant='outline' onClick={handleCopy} className='gap-1.5 shrink-0'>
                    <CopyIcon className='size-3.5' />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card className='shadow-xs'>
        <CardHeader className='border-b bg-muted/40 py-4'>
          <CardTitle className='text-base font-bold text-[#0c2847]'>Generated Links ({links.length})</CardTitle>
        </CardHeader>
        <CardContent className='p-0'>
          <div className='divide-y'>
            {links.length === 0 && <p className='p-6 text-sm text-muted-foreground'>No links generated yet.</p>}

            {links.map(link => {
              const status = getLinkStatus(link)
              const isRevoking = revokingId === link.id
              const isEditingExpiry = editingExpiryId === link.id

              return (
                <div key={link.id} className='flex flex-col gap-3 p-4'>
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-bold text-[#0c2847]'>{link.categoryName}</span>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>
                      <p className='mt-0.5 text-xs text-muted-foreground'>
                        {link.useCount > 0 ? `Used ${link.useCount} time${link.useCount === 1 ? '' : 's'}` : 'Not used yet'}
                        {link.expiresAt ? ` — expires ${new Date(link.expiresAt).toLocaleString('en-IN')}` : ' — no expiry'}
                        {link.lastUsedAt ? ` — last used ${new Date(link.lastUsedAt).toLocaleString('en-IN')}` : ''}
                      </p>
                    </div>

                    <div className='flex shrink-0 items-center gap-2'>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() => handleCopyRow(link)}
                        className='gap-1.5 w-fit'
                      >
                        <CopyIcon className='size-3.5' />
                        {copiedRowId === link.id ? 'Copied' : 'Copy'}
                      </Button>

                      {!link.revokedAt && !isEditingExpiry && (
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          onClick={() => startEditExpiry(link)}
                          className='gap-1.5 w-fit'
                        >
                          <PencilIcon className='size-3.5' />
                          Expiry
                        </Button>
                      )}

                      {!link.revokedAt && (
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          disabled={isRevoking}
                          onClick={() => handleRevoke(link)}
                          className='gap-1.5 text-red-600 border-red-200 hover:bg-red-50 w-fit'
                        >
                          {isRevoking ? <Loader2Icon className='size-3.5 animate-spin' /> : <BanIcon className='size-3.5' />}
                          Revoke
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditingExpiry && (
                    <div className='flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3'>
                      <Label className='text-xs'>New expiry (leave blank for no expiry)</Label>
                      <Input
                        type='datetime-local'
                        value={editingExpiryValue}
                        onChange={e => setEditingExpiryValue(e.target.value)}
                        className='w-fit'
                      />
                      <Button
                        type='button'
                        size='sm'
                        disabled={isSavingExpiry}
                        onClick={() => handleSaveExpiry(link)}
                        className='gap-1.5 bg-[#0c2847] hover:bg-[#071f3a] text-white'
                      >
                        {isSavingExpiry ? <Loader2Icon className='size-3.5 animate-spin' /> : <SaveIcon className='size-3.5' />}
                        Save
                      </Button>
                      <Button type='button' size='sm' variant='outline' onClick={() => setEditingExpiryId(null)}>
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
