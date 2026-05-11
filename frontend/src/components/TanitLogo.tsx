import { cn } from '@/lib/utils'

type Props = {
  /** Fond clair (navbar) ou sombre (login) — léger ajustement visuel uniquement */
  variant?: 'dark' | 'light'
  className?: string
  /** Conservé pour compatibilité ; le visuel complet est dans l’image. */
  showTagline?: boolean
}

export function TanitLogo({ variant = 'dark', className }: Props) {
  return (
    <div
      className={cn(
        'flex shrink-0 items-center',
        variant === 'light' && 'drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <img
        src="/logo-tanithire.png"
        alt="TANITHIRE — Une plateforme de recrutement en ligne"
        className="h-9 w-auto max-h-11 max-w-[min(260px,72vw)] object-contain object-left sm:h-10"
        width={260}
        height={48}
        decoding="async"
      />
    </div>
  )
}
