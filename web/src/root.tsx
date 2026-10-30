import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { AppShell } from './components/AppShell.tsx'
import './styles/tokens.css'
import './styles/base.css'

// Runs before first paint so a saved light/dark choice never flashes the other theme.
const THEME_INIT = `try{var t=localStorage.getItem('tca-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <link rel="icon" type="image/svg+xml" href="/toronto-crime-analytics/favicon.svg" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function Root() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
