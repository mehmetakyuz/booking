import { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  block?: boolean
  children: ReactNode
}

export function Button({ variant = 'primary', block, className = '', children, ...rest }: Props) {
  const cls = ['btn', `btn--${variant}`, block && 'btn--block', className].filter(Boolean).join(' ')
  return (
    <button {...rest} className={cls}>
      {children}
    </button>
  )
}
