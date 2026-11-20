/**
 * Pixel-art sprites defined as text rows (same technique as DivingCharacter).
 * Each sprite is rendered once to a tiny SVG data URI so parallax layers can use
 * cheap <img> elements instead of hundreds of <rect> nodes.
 */

export type SpriteKey =
  | 'fishOrange'
  | 'fishBlue'
  | 'fishSilver'
  | 'coralFan'
  | 'coralBranch'
  | 'jelly'
  | 'jellyTeal'
  | 'angler'
  | 'lanternFish'
  | 'viper'
  | 'squid'
  | 'rock'
  | 'trench'
  | 'dumbo'
  | 'krill'

interface SpriteDef {
  rows: string[]
  palette: Record<string, string>
}

export const SPRITES: Record<SpriteKey, SpriteDef> = {
  fishOrange: {
    palette: { O: '#fb923c', o: '#c2410c', W: '#ffffff', K: '#0f172a' },
    rows: [
      '....OOOO.....',
      '..OOOOOOOO..O',
      '.OOOWKOOOOOOO',
      'OOOOOOOoOOOOO',
      '.OOOOOOoOOOOO',
      '..OOOOOOOO..O',
      '....OOOO.....',
    ],
  },
  fishBlue: {
    palette: { B: '#38bdf8', b: '#0369a1', Y: '#facc15', W: '#ffffff', K: '#0f172a' },
    rows: [
      '...BBBB....',
      '.BBBBBBBB.Y',
      'BBBWKBBBBYY',
      'BBBBBBbBBYY',
      '.BBBBBBBB.Y',
      '...bbbb....',
    ],
  },
  fishSilver: {
    palette: { S: '#cbd5e1', s: '#64748b', W: '#ffffff', K: '#0f172a' },
    rows: [
      '..SSSSS....',
      '.SSSSSSSS.S',
      'SSWKSSSSSSS',
      'SSSSSSsSSSS',
      '.sSSSSSSSsS',
      '..sssss....',
    ],
  },
  coralFan: {
    palette: { C: '#fb7185', c: '#be123c', P: '#f9a8d4', t: '#7f1d1d' },
    rows: [
      '.C..C.PP.C..C.',
      '.C.CC.PP.CC.C.',
      'CC.CCCPPCCC.CC',
      'CCCCCcPPcCCCCC',
      '.CCCCcPPcCCCC.',
      '..CCCccccCCC..',
      '...CCCccCCC...',
      '....ccttcc....',
      '.....cttc.....',
      '.....tttt.....',
    ],
  },
  coralBranch: {
    palette: { O: '#fb923c', o: '#c2410c', Y: '#fde047', t: '#7c2d12' },
    rows: [
      '.Y....Y..Y.',
      '.O....O..O.',
      '.OO..OO..OO',
      '..O..O..OO.',
      '..OOOO.OO..',
      '...ooOOOo..',
      '....oOOo...',
      '....ootto..',
      '.....tt....',
      '....tttt...',
    ],
  },
  jelly: {
    palette: { P: '#f0abfc', p: '#c026d3', t: '#e879f9', W: '#fdf4ff' },
    rows: [
      '...PPPPP...',
      '.PPPWPPPPP.',
      'PPPPPPPpPPP',
      'PPpPPPPPPPP',
      'PPPPPPPPPpP',
      '.p.p.p.p.p.',
      '.t.t.t.t.t.',
      '..t.t.t.t..',
      '.t.t.t.t.t.',
      '..t.t.t.t..',
      '.t.......t.',
    ],
  },
  jellyTeal: {
    palette: { P: '#5eead4', p: '#0d9488', t: '#2dd4bf', W: '#ccfbf1' },
    rows: [
      '...PPPPP...',
      '.PPPWPPPPP.',
      'PPPPPPPpPPP',
      'PPpPPPPPPPP',
      'PPPPPPPPPpP',
      '.p.p.p.p.p.',
      '.t.t.t.t.t.',
      '..t.t.t.t..',
      '.t.t.t.t.t.',
      '..t.t.t.t..',
      '.t.......t.',
    ],
  },
  angler: {
    palette: { L: '#fde047', l: '#facc15', s: '#94a3b8', D: '#334155', d: '#1e293b', W: '#ffffff', K: '#020617', T: '#f8fafc' },
    rows: [
      '..LL............',
      '.LLLL...........',
      '.LLLL...........',
      '..lls...........',
      '...s............',
      '..sDDDDDDD......',
      '.DDDDDDDDDDD..DD',
      'DDWKDDDDDDDDDDDD',
      'DDDDDDDDdDDDDDD.',
      'DTTTTDDDDDDDDD..',
      '.DTTTDDDDDDD..D.',
      '..DDDDDDDD...DD.',
    ],
  },
  lanternFish: {
    palette: { B: '#1e40af', b: '#1e3a8a', C: '#22d3ee', W: '#ffffff', K: '#020617' },
    rows: [
      '..BBBB....',
      '.BBBBBBB.B',
      'BBWKBBBBBB',
      'BBBBBBBBBB',
      '.bCbCbCbB.',
      '..bbbbb...',
    ],
  },
  viper: {
    palette: { V: '#475569', v: '#1e293b', G: '#a78bfa', T: '#f1f5f9', K: '#fde047' },
    rows: [
      '...VVVVVVVVV.....',
      '.VVVVVVVVVVVVV.VV',
      'VTVKVVVVVVVVVVVVV',
      'VTTVVGVGVGVGVvVVV',
      '.VVVVVVVVVVVVV.VV',
      '...vvvvvvvv......',
    ],
  },
  squid: {
    palette: { S: '#7c3aed', s: '#4c1d95', G: '#c4b5fd', W: '#fef9c3', K: '#020617' },
    rows: [
      '....SSSS....',
      '...SSSSSS...',
      '..SSSSSSSS..',
      '..SSSSSSSS..',
      '..SGSSSSGS..',
      '..SSSSSSSS..',
      '.SSSWKSWKSS.',
      '.SSSSSSSSSS.',
      '..sSSSSSSs..',
      '..S.S..S.S..',
      '..s.s..s.s..',
      '.S..S..S..S.',
      '.s..s..s..s.',
      '.S...SS...S.',
    ],
  },
  rock: {
    palette: { R: '#334155', r: '#1e293b', h: '#475569' },
    rows: [
      '....hhh.......',
      '...hRRRh..hh..',
      '..hRRRRRhhRRh.',
      '.hRRRRRRRRRRRh',
      'hRRRRRrRRRRRRR',
      'RRRRRrrrRRRRrR',
      'RRRRrrrrRRRrrr',
      'rRRrrrrrrrRrrr',
    ],
  },
  trench: {
    palette: { T: '#27172e', t: '#170d1c', h: '#3b2445' },
    rows: [
      'hTT.....',
      'hTTTT...',
      'TTTTTT..',
      'hTTTTTTT',
      'TTTTTTtT',
      'TTTTTtTT',
      'TTTtTTTT',
      'tTTTTTTT',
    ],
  },
  dumbo: {
    palette: { P: '#f9a8d4', p: '#f472b6', W: '#ffffff', K: '#020617' },
    rows: [
      '..pp....pp..',
      '.ppp.PP.ppp.',
      '.pp.PPPP.pp.',
      '....PPPP....',
      '...PWKPWK...',
      '...PPPPPP...',
      '....PPPP....',
      '...P.PP.P...',
      '..P.P..P.P..',
      '..p.p..p.p..',
    ],
  },
  krill: {
    palette: { G: '#fde047', g: '#f59e0b', K: '#020617', W: '#fffbeb' },
    rows: [
      '.....GGGGG.....',
      '...GGGGGGGGG.G.',
      '.GGGWKGGGGGGGGG',
      'GGGGGGGgGgGgGGG',
      '.gGgGgGgGgGgGG.',
      '..g.g.g.g.g..GG',
      '.g.g.g.g.g......',
    ],
  },
}

const urlCache = new Map<SpriteKey, string>()

export function spriteSize(key: SpriteKey): { cols: number; rows: number } {
  const { rows } = SPRITES[key]
  return { cols: Math.max(...rows.map((r) => r.length)), rows: rows.length }
}

/** Crisp SVG data URI for a sprite (cached). */
export function spriteUrl(key: SpriteKey): string {
  const cached = urlCache.get(key)
  if (cached) return cached
  const { rows, palette } = SPRITES[key]
  const { cols, rows: height } = spriteSize(key)
  const paths = new Map<string, string>()
  rows.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      const ch = row[x]
      if (ch === '.' || !palette[ch]) {
        x += 1
        continue
      }
      let run = 1
      while (x + run < row.length && row[x + run] === ch) run += 1
      const d = `M${x} ${y}h${run}v1h-${run}z`
      paths.set(palette[ch], (paths.get(palette[ch]) ?? '') + d)
      x += run
    }
  })
  const body = [...paths.entries()].map(([fill, d]) => `<path fill="${fill}" d="${d}"/>`).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cols} ${height}" shape-rendering="crispEdges">${body}</svg>`
  const url = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
  urlCache.set(key, url)
  return url
}
