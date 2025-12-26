<script setup lang="ts">
import { computed } from 'vue'
import type { Relation, Table } from '../types/schema'
import { useSchema } from '../composables/useSchema'

const props = defineProps<{
  relation: Relation
  tables: Table[]
}>()

const { selectedRelationId, selectRelation } = useSchema()

const isSelected = computed(() => selectedRelationId.value === props.relation.id)

const handleClick = (e: MouseEvent) => {
  e.stopPropagation()
  selectRelation(props.relation.id)
}

const fromTable = computed(() =>
  props.tables.find(t => t.id === props.relation.fromTableId)
)

const toTable = computed(() =>
  props.tables.find(t => t.id === props.relation.toTableId)
)

const path = computed(() => {
  if (!fromTable.value || !toTable.value) return ''

  const fromTablePos = fromTable.value.position
  const toTablePos = toTable.value.position
  const fromTableWidth = fromTable.value.width || 280
  const toTableWidth = toTable.value.width || 280

  // Find column indices (cache if possible, but keep reactive)
  const fromColumnIndex = fromTable.value.columns.findIndex(c => c.id === props.relation.fromColumnId)
  const toColumnIndex = toTable.value.columns.findIndex(c => c.id === props.relation.toColumnId)

  // Calculate column positions accurately based on actual layout:
  // Header: py-3 (12px) + label mb-1 (4px) + label text (~16px) + input text-lg (~24px) + py-3 bottom (12px) ≈ 68px
  // Columns container: p-3 (12px padding)
  // Each column group:
  //   - Labels row: mb-1 (4px) + label text-xs (~16px) = 20px
  //   - Inputs row: py-2 (8px top) + h-8 (32px) + py-2 (8px bottom) = 48px
  //   Total per column: 20 + 48 = 68px
  
  const headerHeight = 68 // More accurate header height
  const padding = 12 // p-3
  const labelsRowHeight = 20 // mb-1 (4px) + label height (~16px)
  const inputsRowHeight = 48 // py-2 (16px) + h-8 (32px)
  const columnGroupHeight = labelsRowHeight + inputsRowHeight // 68px per column
  
  // Calculate Y position: header + padding + (for each column: labels + inputs/2)
  // We want the center of the inputs row for each column
  // Adjusted by 10px down for better alignment
  const fromY = fromTablePos.y + headerHeight + padding + 
    (fromColumnIndex * columnGroupHeight) + labelsRowHeight + (inputsRowHeight / 2) + 10
  const toY = toTablePos.y + headerHeight + padding + 
    (toColumnIndex * columnGroupHeight) + labelsRowHeight + (inputsRowHeight / 2) + 10
  
  // X positions: right edge of source table, left edge of target table
  const fromX = fromTablePos.x + fromTableWidth
  const toX = toTablePos.x

  // Create a curved path with control points
  const dx = toX - fromX
  const controlOffset = Math.max(50, Math.abs(dx) / 2)

  return `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`
})

const strokeColor = computed(() => {
  if (isSelected.value) {
    return '#1d4ed8' // darker blue for selected
  }
  switch (props.relation.type) {
    case 'one-to-one':
      return '#3b82f6' // blue
    case 'one-to-many':
      return '#10b981' // green
    case 'many-to-many':
      return '#f59e0b' // amber
    default:
      return '#6b7280' // gray
  }
})

const strokeWidth = computed(() => isSelected.value ? 3 : 2)
</script>

<template>
  <g v-if="fromTable && toTable">
    <!-- Arrow marker definition -->
    <defs>
      <marker
        :id="`arrow-${relation.id}`"
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" :fill="strokeColor" />
      </marker>
    </defs>
    
    <path
      :d="path"
      :stroke="strokeColor"
      :stroke-width="strokeWidth"
      fill="none"
      :marker-end="`url(#arrow-${relation.id})`"
      class="pointer-events-auto cursor-pointer"
      :class="{ 'hover:stroke-width-4': !isSelected }"
      @click="handleClick"
    />
  </g>
</template>
