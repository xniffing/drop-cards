import ELK from 'elkjs/lib/elk.bundled.js'
import type { Relation, Table } from '../types/schema'

export type LayoutPositions = Record<string, { x: number; y: number }>

export interface AutoLayoutOptions {
  direction?: 'DOWN' | 'RIGHT'
  padding?: number
  nodeSpacing?: number
  layerSpacing?: number
}

const DEFAULT_TABLE_WIDTH = 350

// These are aligned to the sizing assumptions used in `TableCard.vue`:
// - headerHeight: 68
// - padding: 12
// - each column group: labelsRow(20) + inputsRow(48) = 68
const HEADER_HEIGHT = 68
const TABLE_PADDING_Y = 12 * 2
const COLUMN_GROUP_HEIGHT = 20 + 48
const MIN_TABLE_HEIGHT = 140

export function estimateTableHeight(table: Table): number {
  const cols = Array.isArray(table.columns) ? table.columns.length : 0
  const h = HEADER_HEIGHT + TABLE_PADDING_Y + cols * COLUMN_GROUP_HEIGHT
  return Math.max(MIN_TABLE_HEIGHT, h)
}

export async function computeElkLayout(
  tables: Table[],
  relations: Relation[],
  opts: AutoLayoutOptions = {}
): Promise<LayoutPositions> {
  const padding = opts.padding ?? 80
  const direction = opts.direction ?? 'DOWN'
  const nodeSpacing = opts.nodeSpacing ?? 60
  const layerSpacing = opts.layerSpacing ?? 120

  if (!Array.isArray(tables) || tables.length === 0) return {}

  const tableIds = new Set(tables.map(t => t.id))

  // If there are no edges, ELK can still lay out, but a simple grid is faster and stable.
  const hasAnyEdges =
    Array.isArray(relations) &&
    relations.some(r => tableIds.has(r.fromTableId) && tableIds.has(r.toTableId) && r.fromTableId !== r.toTableId)

  if (!hasAnyEdges) {
    const positions: LayoutPositions = {}
    const cols = Math.max(1, Math.ceil(Math.sqrt(tables.length)))
    tables.forEach((t, idx) => {
      const w = t.width ?? DEFAULT_TABLE_WIDTH
      const h = estimateTableHeight(t)
      const x = (idx % cols) * (w + nodeSpacing)
      const y = Math.floor(idx / cols) * (h + layerSpacing)
      positions[t.id] = { x: x + padding, y: y + padding }
    })
    return positions
  }

  const elk = new ELK()

  const children = tables.map(t => ({
    id: t.id,
    width: t.width ?? DEFAULT_TABLE_WIDTH,
    height: estimateTableHeight(t)
  }))

  const edges = (relations || [])
    .filter(r => tableIds.has(r.fromTableId) && tableIds.has(r.toTableId) && r.fromTableId !== r.toTableId)
    .map(r => ({
      id: r.id,
      // `fromTableId` is the referenced/parent table; `toTableId` is the referencing/child table.
      sources: [r.fromTableId],
      targets: [r.toTableId]
    }))

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.spacing.nodeNode': `${nodeSpacing}`,
      'elk.layered.spacing.nodeNodeBetweenLayers': `${layerSpacing}`,
      'elk.layered.crossingMinimization.semiInteractive': 'true',
      // Keep it stable and readable.
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF'
    },
    children,
    edges
  }

  const out = await elk.layout(graph as any)
  const outChildren: Array<{ id: string; x?: number; y?: number }> = (out as any)?.children || []

  const positions: LayoutPositions = {}
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY

  for (const n of outChildren) {
    const x = typeof n.x === 'number' ? n.x : 0
    const y = typeof n.y === 'number' ? n.y : 0
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    positions[n.id] = { x, y }
  }

  // Normalize so the layout starts at a consistent origin and has padding.
  if (Number.isFinite(minX) && Number.isFinite(minY)) {
    for (const id of Object.keys(positions)) {
      positions[id] = {
        x: positions[id]!.x - minX + padding,
        y: positions[id]!.y - minY + padding
      }
    }
  }

  // Ensure every table has a position (fallback for any missing nodes).
  for (const t of tables) {
    if (!positions[t.id]) {
      positions[t.id] = { x: padding, y: padding }
    }
  }

  return positions
}

