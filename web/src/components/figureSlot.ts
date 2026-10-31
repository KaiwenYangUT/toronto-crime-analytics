import { createContext } from 'react'

/** True inside a ResultSection's figure slot: the section's h2 already states the takeaway, so a Figure there may drop its own title on a phone. */
export const InFigureSlot = createContext(false)
