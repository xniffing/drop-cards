<script setup lang="ts">
import { computed } from 'vue'
import type { Relation, Table } from '../types/schema'

const props = defineProps<{
  relation: Relation
  tables: Table[]
}>()

const fromTable = computed(() =>
  props.tables.find(t => t.id === props.relation.fromTableId)
)

const toTable = computed(() =>
  props.tables.find(t => t.id === props.relation.toTableId)
)

const path = computed(() => {
  if (!fromTable.value || !toTable.value) return ''

  const from = fromTable.value.position
  const to = toTable.value.position

  // Calculate card centers (approximate)
  const fromX = from.x + 140 // half of card width (280/2)
  const fromY = from.y + 60 // approximate center height
  const toX = to.x + 140
  const toY = to.y + 60

  // Create a curved path
  const dx = toX - fromX
  const dy = toY - fromY
  const controlOffset = Math.abs(dx) / 2

  return `M ${fromX} ${fromY} C ${fromX + controlOffset} ${fromY}, ${toX - controlOffset} ${toY}, ${toX} ${toY}`
})

const strokeColor = computed(() => {
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
</script>

<template>
  <g v-if="fromTable && toTable">
    <path
      :d="path"
      :stroke="strokeColor"
      stroke-width="2"
      fill="none"
      class="pointer-events-auto cursor-pointer hover:stroke-width-3"
    />
    <!-- Arrow marker -->
    <defs>
      <marker
        :id="`arrow-${relation.id}`"
        markerWidth="10"
        markerHeight="10"
        refX="5"
        refY="3"
        orient="auto"
        markerUnits="strokeWidth"
      >
        <path d="M0,0 L0,6 L9,3 z" :fill="strokeColor" />
      </marker>
    </defs>
  </g>
</template>
