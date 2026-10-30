import { Explore as ExplorePage } from '../explore/ExplorePage.tsx'

export function meta() {
  return [{ title: 'Explore · Toronto robbery vs property crime' }]
}

export default function ExploreRoute() {
  return <ExplorePage />
}
