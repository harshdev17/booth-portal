'use client'

import { useActionState, useEffect, useRef } from 'react'

import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Switch } from '@/components/ui/switch'

import { toggleRolePermissionAction, type RoleActionState } from '@/app/server/role-actions'

const initialState: RoleActionState = {}

type Props = {
  roleId: number
  permissionId: number
  granted: boolean
  disabled?: boolean
}

const PermissionToggle = ({ roleId, permissionId, granted, disabled }: Props) => {
  const [state, formAction, isPending] = useActionState(toggleRolePermissionAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.error) toast.error(state.error)
    if (state.success) toast.success(state.success)
  }, [state])

  return (
    <form ref={formRef} action={formAction} className='inline-flex items-center gap-2'>
      <input type='hidden' name='roleId' value={roleId} />
      <input type='hidden' name='permissionId' value={permissionId} />
      <input type='hidden' name='grant' value={String(!granted)} />
      {isPending ? (
        <Loader2Icon className='size-4 animate-spin text-muted-foreground' />
      ) : (
        <Switch
          checked={granted}
          disabled={disabled}
          onCheckedChange={() => formRef.current?.requestSubmit()}
        />
      )}
    </form>
  )
}

export default PermissionToggle
