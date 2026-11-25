import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const DEFAULT_TITLE = 'Casamento de Thiago & Priscila — Álbum & Mural'

const ROUTE_TITLES: Record<string, string> = {
  '/': DEFAULT_TITLE,
  '/capture': 'Postar | Casamento de Thiago & Priscila',
  '/challenges': 'Desafios da Festa | Casamento de Thiago & Priscila',
  '/admin': 'Painel de Moderação | Casamento de Thiago & Priscila',
}

/** Names the browser tab after the screen, with the unread posts. */
export function usePageTitle(unreadCount: number): void {
  const { pathname } = useLocation()

  useEffect(() => {
    const title = ROUTE_TITLES[pathname] ?? DEFAULT_TITLE
    document.title = unreadCount > 0 ? `(${unreadCount}) ${title}` : title
  }, [pathname, unreadCount])
}
