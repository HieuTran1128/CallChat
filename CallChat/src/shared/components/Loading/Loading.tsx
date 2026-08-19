export function Loading({ small = false }: { small?: boolean }) {
  return <span className={`spinner${small ? ' small' : ''}`} aria-label="Đang tải" />
}
