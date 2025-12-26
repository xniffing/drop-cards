import { ref, provide, inject } from 'vue'
import type { Table, Column, Relation, Schema } from '../types/schema'

const SCHEMA_KEY = Symbol('schema')

let tableCounter = 0
let columnCounter = 0
let relationCounter = 0

// History management
const MAX_HISTORY_SIZE = 50

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

function createSnapshot(tables: Table[], relations: Relation[]): Schema {
  return {
    tables: deepClone(tables),
    relations: deepClone(relations)
  }
}

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
  const selectedTableIds = ref<Set<string>>(new Set())
  
  // Drag state for relation creation
  const isDragging = ref(false)
  const dragSource = ref<{ tableId: string; columnId: string } | null>(null)
  const dragPreview = ref<{ x: number; y: number } | null>(null)
  const hoveredColumn = ref<{ tableId: string; columnId: string } | null>(null)

  // Undo/Redo history
  const history = ref<Schema[]>([])
  const historyIndex = ref(-1)
  const canUndo = ref(false)
  const canRedo = ref(false)

  // Save current state to history
  const saveToHistory = () => {
    // Remove any history after current index (when undoing and then making a new change)
    if (historyIndex.value < history.value.length - 1) {
      history.value = history.value.slice(0, historyIndex.value + 1)
    }

    // Add new snapshot
    const snapshot = createSnapshot(tables.value, relations.value)
    history.value.push(snapshot)

    // Limit history size
    if (history.value.length > MAX_HISTORY_SIZE) {
      history.value.shift()
    } else {
      historyIndex.value++
    }

    updateHistoryState()
  }

  // Restore state from snapshot
  const restoreFromSnapshot = (snapshot: Schema) => {
    tables.value = deepClone(snapshot.tables)
    relations.value = deepClone(snapshot.relations)
    updateHistoryState()
  }

  // Update undo/redo button states
  const updateHistoryState = () => {
    canUndo.value = historyIndex.value > 0
    canRedo.value = historyIndex.value < history.value.length - 1
  }

  // Initialize history with current state
  const initialSnapshot = createSnapshot(tables.value, relations.value)
  history.value = [initialSnapshot]
  historyIndex.value = 0
  updateHistoryState()

  // Undo function
  const undo = () => {
    if (!canUndo.value) return

    historyIndex.value--
    const snapshot = history.value[historyIndex.value]
    if (snapshot) {
      restoreFromSnapshot(snapshot)
    }
  }

  // Redo function
  const redo = () => {
    if (!canRedo.value) return

    historyIndex.value++
    const snapshot = history.value[historyIndex.value]
    if (snapshot) {
      restoreFromSnapshot(snapshot)
    }
  }

  const addTable = () => {
    saveToHistory()
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
      // Only save to history if this is a meaningful change (not just position updates during drag)
      const isPositionUpdate = Object.keys(updates).length === 1 && 'position' in updates
      if (!isPositionUpdate) {
        saveToHistory()
      }
      tables.value[index] = { ...tables.value[index], ...updates } as Table
    }
  }

  // Save position update after drag ends
  const saveTablePosition = (tableId: string, position: { x: number; y: number }) => {
    saveToHistory()
    updateTable(tableId, { position })
  }

  const deleteTable = (tableId: string) => {
    saveToHistory()
    tables.value = tables.value.filter(t => t.id !== tableId)
    // Remove relations associated with this table
    relations.value = relations.value.filter(
      r => r.fromTableId !== tableId && r.toTableId !== tableId
    )
  }

  const addColumn = (tableId: string) => {
    saveToHistory()
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
      if (colIndex !== -1 && table.columns[colIndex]) {
        table.columns[colIndex] = { ...table.columns[colIndex], ...updates } as Column
        // History will be saved on blur or timeout from the component
      }
    }
  }

  // Save column changes to history (called after debounce)
  const saveColumnChanges = () => {
    saveToHistory()
  }

  const deleteColumn = (tableId: string, columnId: string) => {
    saveToHistory()
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
    saveToHistory()
    const newRelation: Relation = {
      id: `rel-${++relationCounter}`,
      ...relation
    }
    relations.value.push(newRelation)
  }

  const deleteRelation = (relationId: string) => {
    saveToHistory()
    relations.value = relations.value.filter(r => r.id !== relationId)
    if (selectedRelationId.value === relationId) {
      selectedRelationId.value = null
    }
  }

  const updateRelation = (relationId: string, updates: Partial<Omit<Relation, 'id'>>) => {
    const index = relations.value.findIndex(r => r.id === relationId)
    if (index !== -1) {
      saveToHistory()
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
    hoveredColumn.value = null
  }

  const updateDragPreview = (coordinates: { x: number; y: number } | null) => {
    dragPreview.value = coordinates
  }

  const setHoveredColumn = (tableId: string | null, columnId: string | null) => {
    if (tableId && columnId) {
      hoveredColumn.value = { tableId, columnId }
    } else {
      hoveredColumn.value = null
    }
  }

  const validateRelation = (
    fromTableId: string,
    fromColumnId: string,
    toTableId: string,
    toColumnId: string
  ): { valid: boolean; error?: string } => {
    // Prevent relations within the same table
    if (fromTableId === toTableId) {
      return { valid: false, error: 'Cannot create relation within the same table' }
    }
    
    // Prevent self-relation (same column) - redundant but kept for clarity
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

  // Map column types to Drizzle types
  const mapColumnTypeToDrizzle = (type: string): { type: string; needsLength?: boolean } => {
    const typeMap: Record<string, { type: string; needsLength?: boolean }> = {
      integer: { type: 'integer' },
      varchar: { type: 'varchar', needsLength: true },
      text: { type: 'text' },
      boolean: { type: 'boolean' },
      timestamp: { type: 'timestamp' },
      date: { type: 'date' },
      json: { type: 'jsonb' }
    }
    return typeMap[type] || { type: 'text' }
  }

  // Generate Drizzle schema code
  const exportToDrizzle = (): string => {
    let code = "import { pgTable, text, integer, boolean, timestamp, date, jsonb, varchar, serial } from 'drizzle-orm/pg-core'\n"
    code += "import { relations } from 'drizzle-orm'\n\n"

    // Generate table definitions
    const tableDefinitions: string[] = []
    const tableVarMap: Record<string, string> = {}

    tables.value.forEach(table => {
      const tableName = table.name
      const tableVarName = tableName.replace(/[^a-zA-Z0-9]/g, '_')
      tableVarMap[table.id] = tableVarName
      
      let tableDef = `export const ${tableVarName} = pgTable('${tableName}', {\n`
      
      table.columns.forEach(column => {
        const columnName = column.name
        const drizzleTypeInfo = mapColumnTypeToDrizzle(column.type)
        let columnDef = `  ${columnName}: `
        
        // Use serial for auto-increment integers
        if (column.autoIncrement && drizzleTypeInfo.type === 'integer') {
          columnDef += 'serial'
        } else if (drizzleTypeInfo.needsLength && drizzleTypeInfo.type === 'varchar') {
          columnDef += `varchar('${columnName}', { length: 255 })`
        } else {
          columnDef += `${drizzleTypeInfo.type}('${columnName}')`
        }
        
        // Add column modifiers
        const modifiers: string[] = []
        
        if (column.primaryKey && !column.autoIncrement) {
          modifiers.push('.primaryKey()')
        }
        if (!column.nullable) {
          modifiers.push('.notNull()')
        }
        if (column.unique) {
          modifiers.push('.unique()')
        }
        
        columnDef += modifiers.join('')
        tableDef += columnDef + ',\n'
      })
      
      tableDef += '})\n'
      tableDefinitions.push(tableDef)
    })

    code += tableDefinitions.join('\n') + '\n'

    // Generate relations
    if (relations.value.length > 0) {
      code += '// Relations\n\n'
      
      // Group relations by table
      const relationsByTable: Record<string, typeof relations.value> = {}
      
      tables.value.forEach(table => {
        relationsByTable[table.id] = relations.value.filter(
          r => r.fromTableId === table.id
        )
      })
      
      tables.value.forEach(table => {
        const tableVarName = tableVarMap[table.id]
        const outgoingRelations = relationsByTable[table.id] || []
        const incomingRelations = relations.value.filter(
          r => r.toTableId === table.id
        )
        
        if (outgoingRelations.length > 0 || incomingRelations.length > 0) {
          code += `export const ${tableVarName}Relations = relations(${tableVarName}, ({ one, many }) => ({\n`
          
          // Outgoing relations (one-to-many, one-to-one)
          outgoingRelations.forEach(relation => {
            const toTable = tables.value.find(t => t.id === relation.toTableId)
            if (!toTable) return
            
            const toTableVar = tableVarMap[relation.toTableId]
            if (!toTableVar) return
            
            const fromColumn = table.columns.find(c => c.id === relation.fromColumnId)
            const toColumn = toTable.columns.find(c => c.id === relation.toColumnId)
            
            if (!fromColumn || !toColumn) return
            
            const relationName = toTableVar.charAt(0).toLowerCase() + toTableVar.slice(1) + (relation.type === 'many-to-many' ? 's' : '')
            
            if (relation.type === 'one-to-one') {
              code += `  ${relationName}: one(${toTableVar}, {\n`
              code += `    fields: [${tableVarName}.${fromColumn.name}],\n`
              code += `    references: [${toTableVar}.${toColumn.name}],\n`
              code += `  }),\n`
            } else {
              // one-to-many or many-to-many
              code += `  ${relationName}: many(${toTableVar}),\n`
            }
          })
          
          // Incoming relations (belongs to)
          incomingRelations.forEach(relation => {
            const fromTable = tables.value.find(t => t.id === relation.fromTableId)
            if (!fromTable) return
            
            const fromTableVar = tableVarMap[relation.fromTableId]
            if (!fromTableVar) return
            
            const fromColumn = fromTable.columns.find(c => c.id === relation.fromColumnId)
            const toColumn = table.columns.find(c => c.id === relation.toColumnId)
            
            if (!fromColumn || !toColumn) return
            
            const relationName = fromTableVar.charAt(0).toLowerCase() + fromTableVar.slice(1)
            
            if (relation.type === 'one-to-one' || relation.type === 'one-to-many') {
              code += `  ${relationName}: one(${fromTableVar}, {\n`
              code += `    fields: [${tableVarName}.${toColumn.name}],\n`
              code += `    references: [${fromTableVar}.${fromColumn.name}],\n`
              code += `  }),\n`
            }
          })
          
          code += '}))\n\n'
        }
      })
    }

    return code
  }

  const selectTables = (tableIds: string[]) => {
    selectedTableIds.value = new Set(tableIds)
  }

  const clearSelection = () => {
    selectedTableIds.value.clear()
  }

  const toggleTableSelection = (tableId: string) => {
    if (selectedTableIds.value.has(tableId)) {
      selectedTableIds.value.delete(tableId)
    } else {
      selectedTableIds.value.add(tableId)
    }
  }

  const api = {
    tables,
    relations,
    selectedRelationId,
    selectedTableIds,
    isDragging,
    dragSource,
    dragPreview,
    hoveredColumn,
    canUndo,
    canRedo,
    addTable,
    updateTable,
    saveTablePosition,
    deleteTable,
    addColumn,
    updateColumn,
    saveColumnChanges,
    deleteColumn,
    addRelation,
    deleteRelation,
    updateRelation,
    selectRelation,
    deselectRelation,
    selectTables,
    clearSelection,
    toggleTableSelection,
    startDrag,
    endDrag,
    updateDragPreview,
    setHoveredColumn,
    validateRelation,
    undo,
    redo,
    exportToDrizzle
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
