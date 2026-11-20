import { useMemo } from 'react'
import { motion, useTransform, type MotionValue } from 'framer-motion'
import PixelSprite from './PixelSprite'
import type { SpriteKey } from './spriteArt'
import { DEPTH_ZONES } from '@/lib/depth'
import { getZoneWeights } from '@/lib/ocean'
import type { DepthZone } from '@/types'

type ZoneId = DepthZone['id']

/** Height of one repeating tile, in px. Two copies stack so the scroll wraps seamlessly. */
const TILE = 800

interface LayerConfig {
  id: string
  /** Pixels scrolled per metre of depth. Nearer layers move faster (parallax). */
  speed: number
  /** Rendered size of one sprite cell. */
  px: number
  opacity: number
  perZone: number
  seed: number
  /** Keep the centre clear so UI stays readable. */
  edgesOnly: boolean
}

const LAYERS: LayerConfig[] = [
  { id: 'far', speed: 0.35, px: 2, opacity: 0.45, perZone: 5, seed: 3, edgesOnly: false },
  { id: 'mid', speed: 0.9, px: 3, opacity: 0.75, perZone: 4, seed: 7, edgesOnly: false },
  { id: 'near', speed: 2.0, px: 5, opacity: 1, perZone: 3, seed: 11, edgesOnly: true },
]

/** What lives in each zone. Coral reefs at the surface, then jellyfish, anglerfish, rocks, trench life. */
const ZONE_POOL: Record<ZoneId, SpriteKey[]> = {
  sunlit: ['fishOrange', 'coralFan', 'fishBlue', 'coralBranch', 'fishOrange'],
  twilight: ['jelly', 'fishSilver', 'jelly', 'fishSilver', 'jellyTeal'],
  midnight: ['angler', 'lanternFish', 'lanternFish', 'jellyTeal', 'angler'],
  abyss: ['viper', 'rock', 'squid', 'rock', 'lanternFish'],
  hadal: ['trench', 'dumbo', 'jellyTeal', 'trench', 'squid'],
}

/** Sprites that are scenery, anchored to the sides, and never flipped or swaying. */
const STATIC_SPRITES = new Set<SpriteKey>(['coralFan', 'coralBranch', 'rock', 'trench'])

/** Deterministic pseudo-random in [0,1) so layout never jumps between renders. */
function rand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface Item {
  sprite: SpriteKey
  x: number
  y: number
  flip: boolean
  sway: number
  delay: number
  scale: number
}

function buildItems(layer: LayerConfig, zone: ZoneId, zoneIndex: number): Item[] {
  const pool = ZONE_POOL[zone]
  return Array.from({ length: layer.perZone }, (_, i) => {
    const seed = layer.seed * 100 + zoneIndex * 17 + i * 5
    const sprite = pool[(i + layer.seed + zoneIndex) % pool.length]
    const scenery = STATIC_SPRITES.has(sprite)
    const side = rand(seed + 1) < 0.5
    let x: number
    if (scenery || layer.edgesOnly) x = side ? 1 + rand(seed + 2) * 10 : 58 + rand(seed + 2) * 12
    else x = 4 + rand(seed + 2) * 70
    return {
      sprite,
      x,
      y: ((i + rand(seed + 3) * 0.7) / layer.perZone) * TILE,
      flip: !scenery && rand(seed + 4) < 0.5,
      sway: 5 + rand(seed + 5) * 5,
      delay: -rand(seed + 6) * 8,
      scale: scenery ? 1.4 : 1,
    }
  })
}

function buildLayerItems(compact: boolean): Item[][][] {
  return LAYERS.map((layer) =>
    DEPTH_ZONES.map((zone, zoneIndex) =>
      buildItems(
        compact ? { ...layer, perZone: Math.max(2, layer.perZone - 2) } : layer,
        zone.id,
        zoneIndex,
      ),
    ),
  )
}

const FULL_LAYER_ITEMS = buildLayerItems(false)
const COMPACT_LAYER_ITEMS = buildLayerItems(true)

function ZoneGroup({
  items,
  px,
  weight,
  animate,
}: {
  items: Item[]
  px: number
  weight: MotionValue<number>
  animate: boolean
}) {
  return (
    <motion.div className="absolute inset-0" style={{ opacity: weight }}>
      {[0, 1].map((copy) =>
        items.map((item, i) => (
          <div
            key={`${copy}-${i}`}
            className="absolute"
            style={{ left: `${item.x}%`, top: item.y + copy * TILE }}
          >
            <div
              className={animate && !STATIC_SPRITES.has(item.sprite) ? 'dd-sway' : undefined}
              style={{ animationDuration: `${item.sway}s`, animationDelay: `${item.delay}s` }}
            >
              <PixelSprite sprite={item.sprite} pixel={px * item.scale} flip={item.flip} />
            </div>
          </div>
        )),
      )}
    </motion.div>
  )
}

function Layer({
  layer,
  items,
  depth,
  weights,
  animate,
}: {
  layer: LayerConfig
  items: Item[][]
  depth: MotionValue<number>
  weights: MotionValue<number>[]
  animate: boolean
}) {
  const y = useTransform(depth, (d) => -((d * layer.speed) % TILE))
  return (
    <motion.div
      className="absolute inset-x-0 top-0"
      style={{ y, height: TILE * 2, opacity: layer.opacity, willChange: 'transform' }}
    >
      {DEPTH_ZONES.map((zone, zi) => (
        <ZoneGroup
          key={zone.id}
          items={items[zi]}
          px={layer.px}
          weight={weights[zi]}
          animate={animate}
        />
      ))}
    </motion.div>
  )
}

interface Props {
  depth: MotionValue<number>
  animate: boolean
  /** Fewer scenery sprites on phones. */
  compact?: boolean
}

/**
 * Parallax scenery that scrolls as the diver descends. Each zone's creatures
 * and rocks cross-fade using the same smooth zone weights as the water colour,
 * so nothing pops in or out when a depth threshold is crossed.
 */
export default function OceanLayers({ depth, animate, compact = false }: Props) {
  const all = useTransform(depth, (d) => getZoneWeights(d))
  const w0 = useTransform(all, (w) => w[0])
  const w1 = useTransform(all, (w) => w[1])
  const w2 = useTransform(all, (w) => w[2])
  const w3 = useTransform(all, (w) => w[3])
  const w4 = useTransform(all, (w) => w[4])
  const weights = useMemo(() => [w0, w1, w2, w3, w4], [w0, w1, w2, w3, w4])
  const itemSets = compact ? COMPACT_LAYER_ITEMS : FULL_LAYER_ITEMS

  return (
    <>
      {LAYERS.map((layer, i) => (
        <Layer
          key={layer.id}
          layer={layer}
          items={itemSets[i]}
          depth={depth}
          weights={weights}
          animate={animate}
        />
      ))}
    </>
  )
}
