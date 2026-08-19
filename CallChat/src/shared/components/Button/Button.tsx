import type { ButtonHTMLAttributes, ReactNode } from 'react'
interface Props extends ButtonHTMLAttributes<HTMLButtonElement> { children: ReactNode }
export function Button({ children, className = '', ...props }: Props) {
  return <button className={`submit-button ${className}`} {...props}>{children}</button>
}
