import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('')

export function UserAvatar({
  user,
  size = 'md',
  className,
}: {
  user: { name: string; image: string | null }
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  return (
    <Avatar size={size} className={className}>
      {user.image && <AvatarImage src={user.image} alt="" />}
      <AvatarFallback
        className={cn('bg-info text-info-foreground font-semibold')}
      >
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  )
}
