import { Explore as ExplorePage } from '../explore/ExplorePage.tsx'

/** The dashboard uses the whole viewport width (AppShell reads this). */
export const handle = { fullWidth: true }

export function meta() {
  return [{ title: 'Explore · Toronto robbery vs property crime' }]
}

export default function ExploreRoute() {
  return <ExplorePage />
}
