'use client'

import { useActionState, useEffect, useRef } from 'react'

import { Loader2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Switch } from '@/components/ui/switch'

import {
  toggleWhatsappNotificationsAction,
  type NotificationSettingsActionState
} from '@/app/server/notification-settings-actions'

const initialState: NotificationSettingsActionState = {}

const WhatsappToggle = ({ enabled }: { enabled: boolean }) => {
  const [state, formAction, isPending] = useActionState(toggleWhatsappNotificationsAction, initialState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.error) toast.error(state.error)
    if (state.success) toast.success(state.success)
  }, [state])

  return (
    <form ref={formRef} action={formAction} className='inline-flex items-center gap-2'>
      <input type='hidden' name='enabled' value={String(!enabled)} />
      {isPending ? (
        <Loader2Icon className='size-4 animate-spin text-muted-foreground' />
      ) : (
        <Switch checked={enabled} onCheckedChange={() => formRef.current?.requestSubmit()} />
      )}
    </form>
  )
}

export default WhatsappToggle
