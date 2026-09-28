'use client'

// Third-party Imports
import { LogOutIcon, UserIcon } from 'lucide-react'

// Component Imports
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

// Server Action Import
import { logoutAction } from '@/app/server/auth-actions'

const initials = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

const ProfileDropdown = ({ user }: { user: { fullName: string; email: string; roleName: string } }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant='ghost' size='icon' className='relative rounded-full hover:bg-transparent' />}
      >
        <Avatar>
          <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
        </Avatar>
        <span className='ring-card absolute right-0 bottom-0 block size-2 rounded-full bg-green-600 ring-2' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64'>
        <DropdownMenuGroup>
          <DropdownMenuLabel className='flex items-center gap-4 px-2 py-2.5 font-normal'>
            <Avatar className='size-10'>
              <AvatarFallback>{initials(user.fullName)}</AvatarFallback>
            </Avatar>
            <div className='flex flex-1 flex-col items-start'>
              <span className='text-foreground text-base font-semibold'>{user.fullName}</span>
              <span className='text-muted-foreground text-sm'>{user.email}</span>
              <span className='text-muted-foreground text-xs'>{user.roleName}</span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem render={<a href='/admin/account/profile' />}>
            <UserIcon />
            <span>My Account</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <form action={logoutAction} className='w-full'>
            <DropdownMenuItem variant='destructive' render={<button type='submit' className='w-full' />}>
              <LogOutIcon />
              <span>Sign out</span>
            </DropdownMenuItem>
          </form>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ProfileDropdown
