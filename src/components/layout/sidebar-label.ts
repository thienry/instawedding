/** Classes of a sidebar label, which shrinks away when it is collapsed. */
export function sidebarLabelClass(isCollapsed: boolean): string {
  return `whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out ${
    isCollapsed ? 'max-w-0 opacity-0' : 'max-w-[200px] opacity-100'
  }`
}
