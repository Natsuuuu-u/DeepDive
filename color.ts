export type RGB = [number, number, number]

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function rgbCss(c: RGB): string {
  return `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`
}

export type Stops = Array<[number, RGB]>

export function makeStops(list: Array<[number, string]>): Stops {
  return list.map(([y, hex]) => [y, hexToRgb(hex)])
}

export function sampleStops(stops: Stops, y: number): RGB {
  if (y <= stops[0][0]) return stops[0][1]
  for (let i = 1; i < stops.length; i++) {
    if (y <= stops[i][0]) {
      const [y0, c0] = stops[i - 1]
      const [y1, c1] = stops[i]
      return mixRgb(c0, c1, (y - y0) / (y1 - y0))
    }
  }
  return stops[stops.length - 1][1]
}
