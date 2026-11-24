import { useState } from 'react'

const STORAGE_KEY = 'instawedding_sidebar_collapsed'

/** Whether the sidebar is collapsed, remembered in the browser. */
export function useSidebarCollapsed(): readonly [boolean, () => void] {
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem(STORAGE_KEY) === 'true'
  )

  const toggle = () => {
    localStorage.setItem(STORAGE_KEY, String(!isCollapsed))
    setIsCollapsed(!isCollapsed)
  }

  return [isCollapsed, toggle]
}
