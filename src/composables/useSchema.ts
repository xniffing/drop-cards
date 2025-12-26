import { ref, provide, inject } from 'vue'
import type { Table, Column, Relation } from '../types/schema'

const SCHEMA_KEY = Symbol('schema')

let tableCounter = 0
let columnCounter = 0
let relationCounter = 0

// Preview schema data
const createPreviewSchema = () => {
  const usersTable: Table = {
    id: 'table-users',
    name: 'users',
    position: { x: 100, y: 100 },
    width: 280,
    columns: [
      { id: 'col-users-id', name: 'id', type: 'integer', nullable: false, primaryKey: true, unique: true, autoIncrement: true },
      { id: 'col-users-email', name: 'email', type: 'varchar', nullable: false, primaryKey: false, unique: true, autoIncrement: false },
      { id: 'col-users-name', name: 'name', type: 'varchar', nullable: false, primaryKey: false, unique: false, autoIncrement: false },
      { id: 'col-users-created', name: 'created_at', type: 'timestamp', nullable: false, primaryKey: false, unique: false, autoIncrement: false }
    ]
  }

  const postsTable: Table = {
    id: 'table-posts',
    name: 'posts',
    position: { x: 500, y: 100 },
    width: 280,
    columns: [
      { id: 'col-posts-id', name: 'id', type: 'integer', nullable: false, primaryKey: true, unique: true, autoIncrement: true },
      { id: 'col-posts-user-id', name: 'user_id', type: 'integer', nullable: false, primaryKey: false, unique: false, autoIncrement: false },
      { id: 'col-posts-title', name: 'title', type: 'varchar', nullable: false, primaryKey: false, unique: false, autoIncrement: false },
      { id: 'col-posts-content', name: 'content', type: 'text', nullable: true, primaryKey: false, unique: false, autoIncrement: false },
      { id: 'col-posts-created', name: 'created_at', type: 'timestamp', nullable: false, primaryKey: false, unique: false, autoIncrement: false }
    ]
  }

  const commentsTable: Table = {
    id: 'table-comments',
    name: 'comments',
    position: { x: 900, y: 100 },
    width: 280,
    columns: [
      { id: 'col-comments-id', name: 'id', type: 'integer', nullable: false, primaryKey: true, unique: true, autoIncrement: true },
      { id: 'col-comments-post-id', name: 'post_id', type: 'integer', nullable: false, primaryKey: false, unique: false, autoIncrement: false },
      { id: 'col-comments-user-id', name: 'user_id', type: 'integer', nullable: false, primaryKey: false, unique: false, autoIncrement: false },
      { id: 'col-comments-text', name: 'text', type: 'text', nullable: false, primaryKey: false, unique: false, autoIncrement: false },
      { id: 'col-comments-created', name: 'created_at', type: 'timestamp', nullable: false, primaryKey: false, unique: false, autoIncrement: false }
    ]
  }

  const previewTables: Table[] = [usersTable, postsTable, commentsTable]

  const previewRelations: Relation[] = [
    {
      id: 'rel-users-posts',
      fromTableId: 'table-users',
      fromColumnId: 'col-users-id',
      toTableId: 'table-posts',
      toColumnId: 'col-posts-user-id',
      type: 'one-to-many'
    },
    {
      id: 'rel-posts-comments',
      fromTableId: 'table-posts',
      fromColumnId: 'col-posts-id',
      toTableId: 'table-comments',
      toColumnId: 'col-comments-post-id',
      type: 'one-to-many'
    },
    {
      id: 'rel-users-comments',
      fromTableId: 'table-users',
      fromColumnId: 'col-users-id',
      toTableId: 'table-comments',
      toColumnId: 'col-comments-user-id',
      type: 'one-to-many'
    }
  ]

  // Update counters to avoid conflicts
  tableCounter = 3
  columnCounter = 14
  relationCounter = 3

  return { tables: previewTables, relations: previewRelations }
}

export function useSchemaProvider() {
  const previewData = createPreviewSchema()
  const tables = ref<Table[]>(previewData.tables)
  const relations = ref<Relation[]>(previewData.relations)
  const selectedRelationId = ref<string | null>(null)
  
  // Drag state for relation creation
  const isDragging = ref(false)
  const dragSource = ref<{ tableId: string; columnId: string } | null>(null)
  const dragPreview = ref<{ x: number; y: number } | null>(null)

  const addTable = () => {
    const newTable: Table = {
      id: `table-${++tableCounter}`,
      name: `table_${tableCounter}`,
      position: { x: 100 + tableCounter * 50, y: 100 + tableCounter * 50 },
      width: 280,
      columns: [
        {
          id: `col-${++columnCounter}`,
          name: 'id',
          type: 'integer',
          nullable: false,
          primaryKey: true,
          unique: true,
          autoIncrement: true
        }
      ]
    }
    tables.value.push(newTable)
  }

  const updateTable = (tableId: string, updates: Partial<Table>) => {
    const index = tables.value.findIndex(t => t.id === tableId)
    if (index !== -1) {
      tables.value[index] = { ...tables.value[index], ...updates } as Table
    }
  }

  const deleteTable = (tableId: string) => {
    tables.value = tables.value.filter(t => t.id !== tableId)
    // Remove relations associated with this table
    relations.value = relations.value.filter(
      r => r.fromTableId !== tableId && r.toTableId !== tableId
    )
  }

  const addColumn = (tableId: string) => {
    const table = tables.value.find(t => t.id === tableId)
    if (table) {
      const newColumn: Column = {
        id: `col-${++columnCounter}`,
        name: `column_${columnCounter}`,
        type: 'varchar',
        nullable: true,
        primaryKey: false,
        unique: false,
        autoIncrement: false
      }
      table.columns.push(newColumn)
    }
  }

  const updateColumn = (tableId: string, columnId: string, updates: Partial<Column>) => {
    const table = tables.value.find(t => t.id === tableId)
    if (table) {
      const colIndex = table.columns.findIndex(c => c.id === columnId)
      if (colIndex !== -1) {
        table.columns[colIndex] = { ...table.columns[colIndex], ...updates } as Column
      }
    }
  }

  const deleteColumn = (tableId: string, columnId: string) => {
    const table = tables.value.find(t => t.id === tableId)
    if (table) {
      table.columns = table.columns.filter(c => c.id !== columnId)
      // Remove relations associated with this column
      relations.value = relations.value.filter(
        r => !(r.fromTableId === tableId && r.fromColumnId === columnId) &&
             !(r.toTableId === tableId && r.toColumnId === columnId)
      )
    }
  }

  const addRelation = (relation: Omit<Relation, 'id'>) => {
    const newRelation: Relation = {
      id: `rel-${++relationCounter}`,
      ...relation
    }
    relations.value.push(newRelation)
  }

  const deleteRelation = (relationId: string) => {
    relations.value = relations.value.filter(r => r.id !== relationId)
    if (selectedRelationId.value === relationId) {
      selectedRelationId.value = null
    }
  }

  const updateRelation = (relationId: string, updates: Partial<Omit<Relation, 'id'>>) => {
    const index = relations.value.findIndex(r => r.id === relationId)
    if (index !== -1) {
      relations.value[index] = { ...relations.value[index], ...updates } as Relation
    }
  }

  const selectRelation = (relationId: string | null) => {
    selectedRelationId.value = relationId
  }

  const deselectRelation = () => {
    selectedRelationId.value = null
  }

  const startDrag = (tableId: string, columnId: string) => {
    isDragging.value = true
    dragSource.value = { tableId, columnId }
  }

  const endDrag = () => {
    isDragging.value = false
    dragSource.value = null
    dragPreview.value = null
  }

  const updateDragPreview = (coordinates: { x: number; y: number } | null) => {
    dragPreview.value = coordinates
  }

  const validateRelation = (
    fromTableId: string,
    fromColumnId: string,
    toTableId: string,
    toColumnId: string
  ): { valid: boolean; error?: string } => {
    // Prevent self-relation (same column)
    if (fromTableId === toTableId && fromColumnId === toColumnId) {
      return { valid: false, error: 'Cannot create relation from a column to itself' }
    }

    // Check for duplicate relations
    const duplicate = relations.value.find(
      r =>
        r.fromTableId === fromTableId &&
        r.fromColumnId === fromColumnId &&
        r.toTableId === toTableId &&
        r.toColumnId === toColumnId
    )
    if (duplicate) {
      return { valid: false, error: 'Relation already exists between these columns' }
    }

    // Check reverse duplicate
    const reverseDuplicate = relations.value.find(
      r =>
        r.fromTableId === toTableId &&
        r.fromColumnId === toColumnId &&
        r.toTableId === fromTableId &&
        r.toColumnId === fromColumnId
    )
    if (reverseDuplicate) {
      return { valid: false, error: 'Reverse relation already exists' }
    }

    return { valid: true }
  }

  const api = {
    tables,
    relations,
    selectedRelationId,
    isDragging,
    dragSource,
    dragPreview,
    addTable,
    updateTable,
    deleteTable,
    addColumn,
    updateColumn,
    deleteColumn,
    addRelation,
    deleteRelation,
    updateRelation,
    selectRelation,
    deselectRelation,
    startDrag,
    endDrag,
    updateDragPreview,
    validateRelation
  }

  provide(SCHEMA_KEY, api)
  provide('addTable', addTable)

  return api
}

export function useSchema() {
  const schema = inject<ReturnType<typeof useSchemaProvider>>(SCHEMA_KEY)
  if (!schema) {
    throw new Error('useSchema must be used within a component that calls useSchemaProvider')
  }
  return schema
}
