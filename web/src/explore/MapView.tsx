import { useEffect, useRef } from 'react'
import type { Map as MlMap, GeoJSONSource, Marker, Popup } from 'maplibre-gl'
import type { EventTable, NamedPoint, Point } from '../explore-engine/analysis.ts'
import { isoDate } from '../explore-engine/analysis.ts'
import 'maplibre-gl/dist/maplibre-gl.css'
import s from './explore.module.css'

interface Props {
  table: EventTable
  selected: Int32Array
  center?: NamedPoint
  /** destination, drawn as well as the station in station mode */
  site?: NamedPoint
  radiusM?: number
  catColors: Record<string, string>
}

const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim()

function palette() {
  return {
    bg: css('--bg'), surface: css('--surface'), border: css('--border'), text: css('--text'), muted: css('--text-muted'), accent: css('--accent'),
    density: [1, 2, 3, 4, 5].map((i) => css(`--density-${i}`)),
  }
}

function circlePolygon(c: Point, radiusM: number) {
  const pts: [number, number][] = []
  const lat = (c.lat * Math.PI) / 180
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * 2 * Math.PI
    pts.push([c.lon + ((radiusM / (111_320 * Math.cos(lat))) * Math.cos(a)), c.lat + (radiusM / 110_540) * Math.sin(a)])
  }
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [pts] } }
}

const EMPTY = { type: 'FeatureCollection' as const, features: [] }

export function MapView({ table, selected, center, site, radiusM, catColors }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<MlMap | null>(null)
  const markers = useRef<Marker[]>([])
  const popup = useRef<Popup | null>(null)
  const latest = useRef({ table, selected, center, site, radiusM, catColors })
  useEffect(() => {
    latest.current = { table, selected, center, site, radiusM, catColors }
  })
  const loaded = useRef(false)

  const paint = () => {
    const m = map.current
    if (!m || !loaded.current) return
    const c = palette()
    const set = (id: string, prop: string, v: unknown) => m.getLayer(id) && m.setPaintProperty(id, prop, v)
    set('bg', 'background-color', c.surface)
    set('water', 'fill-color', c.border)
    set('park', 'fill-color', c.bg)
    set('buildings', 'fill-color', c.border)
    set('roads-minor', 'line-color', c.border)
    set('roads-major', 'line-color', c.muted)
    set('radius-fill', 'fill-color', c.accent)
    set('radius-line', 'line-color', c.accent)
    set('clusters', 'circle-color', ['step', ['get', 'point_count'], c.density[1], 20, c.density[2], 100, c.density[3], 500, c.density[4]])
    set('clusters', 'circle-stroke-color', c.bg)
    const cats = Object.entries(latest.current.catColors).flat()
    set('points', 'circle-color', ['match', ['get', 'cat'], ...cats, c.muted])
    set('points', 'circle-stroke-color', c.bg)
  }

  const sync = () => {
    const m = map.current
    if (!m || !loaded.current) return
    const { table: t, selected: sel, center: ctr, site: st, radiusM: r } = latest.current
    const features = new Array(sel.length)
    for (let k = 0; k < sel.length; k++) {
      const i = sel[k]
      features[k] = { type: 'Feature', properties: { i, cat: t.categories[t.category[i]] }, geometry: { type: 'Point', coordinates: [t.lon[i], t.lat[i]] } }
    }
    ;(m.getSource('events') as GeoJSONSource).setData({ type: 'FeatureCollection', features })
    ;(m.getSource('radius') as GeoJSONSource).setData(ctr && r ? { type: 'FeatureCollection', features: [circlePolygon(ctr, r)] } : EMPTY)
    markers.current.forEach((x) => x.remove())
    markers.current = []
    void import('maplibre-gl').then((ml) => {
      if (!map.current) return
      const add = (p: NamedPoint, label: string, color: string) => {
        const node = document.createElement('div')
        node.className = s.marker
        node.style.setProperty('--marker', color)
        node.title = `${label}: ${p.name}`
        node.setAttribute('role', 'img')
        node.setAttribute('aria-label', `${label}: ${p.name}`)
        const text = document.createElement('span')
        text.textContent = p.name
        node.append(text)
        markers.current.push(new ml.Marker({ element: node }).setLngLat([p.lon, p.lat]).addTo(map.current as MlMap))
      }
      if (ctr) {
        if (st && st.id !== ctr.id) {
          add(st, 'Destination', palette().text)
          add(ctr, 'Nearest listed station', palette().accent)
        } else add(ctr, st ? 'Destination' : 'Centre', palette().accent)
        const pad = ((r ?? 500) / 111_320) * 1.6
        map.current.fitBounds([[ctr.lon - pad * 1.4, ctr.lat - pad], [ctr.lon + pad * 1.4, ctr.lat + pad]], { duration: 400, maxZoom: 15 })
      } else {
        map.current.fitBounds([[-79.64, 43.58], [-79.12, 43.86]], { duration: 400 })
      }
    })
  }

  useEffect(() => {
    let cancelled = false
    const host = el.current
    if (!host) return
    void (async () => {
      const [ml, { Protocol }] = await Promise.all([import('maplibre-gl'), import('pmtiles')])
      if (cancelled) return
      const protocol = new Protocol()
      ml.addProtocol('pmtiles', protocol.tile)
      const url = new URL(`${import.meta.env.BASE_URL}basemap/toronto.pmtiles`, window.location.href).href
      const m = new ml.Map({
        container: host,
        style: {
          version: 8,
          sources: {
            base: { type: 'vector', url: `pmtiles://${url}`, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ODbL · <a href="https://protomaps.com">Protomaps</a>' },
            events: { type: 'geojson', data: EMPTY, cluster: true, clusterRadius: 36, clusterMaxZoom: 13 },
            radius: { type: 'geojson', data: EMPTY },
          },
          layers: [
            { id: 'bg', type: 'background', paint: { 'background-color': '#fff' } },
            { id: 'park', type: 'fill', source: 'base', 'source-layer': 'landuse', filter: ['in', 'kind', 'park', 'nature_reserve', 'forest', 'garden'], paint: { 'fill-color': '#fff', 'fill-opacity': 0.8 } },
            { id: 'water', type: 'fill', source: 'base', 'source-layer': 'water', paint: { 'fill-color': '#ccc' } },
            { id: 'buildings', type: 'fill', source: 'base', 'source-layer': 'buildings', minzoom: 14, paint: { 'fill-color': '#ddd', 'fill-opacity': 0.6 } },
            { id: 'roads-minor', type: 'line', source: 'base', 'source-layer': 'roads', filter: ['in', 'kind', 'minor_road', 'medium_road', 'other'], minzoom: 13, paint: { 'line-color': '#ddd', 'line-width': ['interpolate', ['linear'], ['zoom'], 13, 0.4, 16, 2.5] } },
            { id: 'roads-major', type: 'line', source: 'base', 'source-layer': 'roads', filter: ['in', 'kind', 'highway', 'major_road'], paint: { 'line-color': '#999', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 16, 4] } },
            { id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': '#06c', 'fill-opacity': 0.08 } },
            { id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': '#06c', 'line-width': 2, 'line-dasharray': [3, 2] } },
            { id: 'clusters', type: 'circle', source: 'events', filter: ['has', 'point_count'], paint: { 'circle-color': '#666', 'circle-radius': ['step', ['get', 'point_count'], 8, 20, 11, 100, 15, 500, 20], 'circle-stroke-width': 2, 'circle-opacity': 0.9 } },
            { id: 'points', type: 'circle', source: 'events', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': '#666', 'circle-radius': 4.5, 'circle-stroke-width': 1.5, 'circle-opacity': 0.9 } },
          ],
        },
        center: [-79.38, 43.69],
        zoom: 10,
        attributionControl: { compact: true },
        cooperativeGestures: false,
      })
      m.addControl(new ml.NavigationControl({ showCompass: false }), 'top-right')
      m.on('load', () => {
        loaded.current = true
        map.current = m
        paint()
        sync()
      })
      m.on('click', 'clusters', (e) => {
        const f = e.features?.[0]
        if (!f) return
        void (m.getSource('events') as GeoJSONSource).getClusterExpansionZoom(Number(f.properties.cluster_id)).then((zoom) => {
          m.easeTo({ center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates, zoom })
        })
      })
      m.on('click', 'points', (e) => {
        const f = e.features?.[0]
        if (!f) return
        const t = latest.current.table
        const i = Number(f.properties.i)
        popup.current?.remove()
        const box = document.createElement('div')
        box.textContent = `${t.categories[t.category[i]]} · ${isoDate(t.day[i])} · ${String(t.hour[i]).padStart(2, '0')}:00`
        popup.current = new ml.Popup({ closeButton: true, maxWidth: '240px' })
          .setLngLat((f.geometry as unknown as { coordinates: [number, number] }).coordinates)
          .setDOMContent(box)
          .addTo(m)
      })
      for (const id of ['clusters', 'points']) {
        m.on('mouseenter', id, () => (m.getCanvas().style.cursor = 'pointer'))
        m.on('mouseleave', id, () => (m.getCanvas().style.cursor = ''))
      }
      map.current = m
    })()
    const remount = () => paint()
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', remount)
    const obs = new MutationObserver(remount)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      cancelled = true
      mq.removeEventListener('change', remount)
      obs.disconnect()
      markers.current.forEach((x) => x.remove())
      map.current?.remove()
      map.current = null
      loaded.current = false
    }
    // The map is created once; data and theme updates go through paint() and sync().
  }, [])

  useEffect(() => {
    sync()
    paint()
  }, [table, selected, center, site, radiusM, catColors])

  return <div ref={el} className={s.map} role="region" aria-label="Map of the selected incidents. The totals and charts give the same counts as text." />
}
