import { useEffect, useState, type ReactNode } from 'react'
import * as Collapsible from '@radix-ui/react-collapsible'
import s from './ui.module.css'

/** Keyboard-operable disclosure that opens when the URL hash equals its id. */
export function Disclosure({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const check = () => window.location.hash === `#${id}` && setOpen(true)
    check()
    window.addEventListener('hashchange', check)
    return () => window.removeEventListener('hashchange', check)
  }, [id])
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className={s.disclosure} id={id}>
      <Collapsible.Trigger className={s.disclosureTrigger}>
        <span>{title}</span>
        <svg className={s.disclosureChevron} width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m3 6 5 5 5-5" />
        </svg>
      </Collapsible.Trigger>
      <Collapsible.Content className={s.disclosureBody}>{children}</Collapsible.Content>
    </Collapsible.Root>
  )
}
