'use client'

import { useActionState, useEffect, useState } from 'react'

import { Loader2Icon, UserPlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { createStaffUserAction, type RoleActionState } from '@/app/server/role-actions'
import { PERMISSION_GROUP_ORDER, PERMISSION_LABELS } from '@/lib/rbac/permission-labels'

const initialState: RoleActionState = {}

type PermissionOption = { id: number; key: string; description: string | null }

/**
 * Creates a new admin/staff login — previously there was no way to do this
 * from the UI at all; every existing account had been inserted straight
 * into the database by hand. Deliberately placed on this same Admin Users
 * card (not a new sidebar entry) per explicit request.
 *
 * No role dropdown — per explicit request, the admin picks exactly which
 * permissions this one person gets, checkbox by checkbox, instead of
 * assigning one of the existing shared roles. The server action creates a
 * one-person role behind the scenes carrying exactly these permissions.
 */
const AddStaffUserDialog = ({ permissions }: { permissions: PermissionOption[] }) => {
  const [open, setOpen] = useState(false)
  const [state, formAction, isPending] = useActionState(createStaffUserAction, initialState)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      setOpen(false)
      setSelected(new Set())
    }
  }, [state.success])

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)

      if (next.has(id)) next.delete(id)
      else next.add(id)

      return next
    })
  }

  const groupedPermissions = permissions.reduce<Record<string, PermissionOption[]>>((groups, perm) => {
    const group = PERMISSION_LABELS[perm.key]?.group ?? 'Other'

    groups[group] = groups[group] ?? []
    groups[group].push(perm)

    return groups
  }, {})
  const groupOrder = PERMISSION_GROUP_ORDER

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type='button' size='sm' onClick={() => setOpen(true)} className='bg-[#0c2847] hover:bg-[#12365c] text-white'>
        <UserPlusIcon className='size-4' />
        Add Staff User
      </Button>

      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Add Staff User</DialogTitle>
          <DialogDescription>
            Creates a new admin login with exactly the access checked below — not an existing shared role. The
            password is set here directly; share it with the staff member through a secure channel.
          </DialogDescription>
        </DialogHeader>

        {state.error && (
          <Alert variant='destructive'>
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        )}

        <form action={formAction} className='flex flex-col gap-4'>
          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='staff-full-name' className='text-xs font-semibold'>
              Full Name
            </Label>
            <Input id='staff-full-name' name='fullName' required maxLength={191} placeholder='e.g. Priya Sharma' />
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='staff-email' className='text-xs font-semibold'>
              Email
            </Label>
            <Input id='staff-email' name='email' type='email' required maxLength={191} placeholder='name@example.com' />
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='staff-password' className='text-xs font-semibold'>
              Password
            </Label>
            <Input
              id='staff-password'
              name='password'
              type='text'
              required
              minLength={8}
              maxLength={72}
              placeholder='At least 8 characters'
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs font-semibold'>Access (select everything this person needs)</Label>
            <div className='max-h-72 overflow-y-auto rounded-md border p-2 flex flex-col gap-3'>
              {groupOrder
                .filter(group => groupedPermissions[group]?.length)
                .map(group => (
                  <div key={group}>
                    <p className='px-1.5 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground'>
                      {group}
                    </p>
                    <div className='flex flex-col gap-0.5'>
                      {groupedPermissions[group].map(perm => {
                        const info = PERMISSION_LABELS[perm.key]

                        return (
                          <label
                            key={perm.id}
                            className='flex items-start gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted/50 cursor-pointer'
                          >
                            <input
                              type='checkbox'
                              name='permissionIds'
                              value={perm.id}
                              checked={selected.has(perm.id)}
                              onChange={() => toggle(perm.id)}
                              className='mt-0.5 size-4 rounded border-slate-300'
                            />
                            <span className='text-slate-800'>{info?.label ?? perm.description ?? perm.key}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
            {selected.size === 0 && (
              <p className='text-[11px] text-amber-600'>Select at least one permission.</p>
            )}
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type='submit'
              disabled={isPending || selected.size === 0}
              className='bg-[#0c2847] hover:bg-[#12365c] text-white'
            >
              {isPending && <Loader2Icon className='animate-spin' />}
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddStaffUserDialog
