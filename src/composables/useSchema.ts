import { ref, provide, inject, watch } from 'vue'
import type { Table, Column, Relation, Schema } from '../types/schema'
import { computeElkLayout } from '../services/autoLayout'
import { generateOpenApiJson } from '../services/openapi'

const SCHEMA_KEY = Symbol('schema')

let tableCounter = 0
let columnCounter = 0
let relationCounter = 0

// localStorage persistence
const STORAGE_KEY_CURRENT_SCHEMA = 'drop-cards:current-schema:v1'
const STORAGE_KEY_DATABASES = 'drop-cards:databases:v1'
const STORAGE_KEY_CURRENT_DB_ID = 'drop-cards:current-db-id:v1'

export interface StoredDatabase {
  id: string
  name: string
  createdAt: number
  updatedAt: number
  schema: Schema
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function readCurrentSchemaFromStorage(): Schema | null {
  if (typeof localStorage === 'undefined') return null
  const parsed = safeJsonParse<Schema>(localStorage.getItem(STORAGE_KEY_CURRENT_SCHEMA))
  if (!parsed || !Array.isArray(parsed.tables) || !Array.isArray(parsed.relations)) return null
  return parsed
}

function writeCurrentSchemaToStorage(schema: Schema) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_CURRENT_SCHEMA, JSON.stringify(schema))
  } catch {
    // Ignore quota / serialization failures
  }
}

function readDatabasesFromStorage(): StoredDatabase[] {
  if (typeof localStorage === 'undefined') return []
  const parsed = safeJsonParse<StoredDatabase[]>(localStorage.getItem(STORAGE_KEY_DATABASES))
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter(d => d && typeof d.id === 'string' && typeof d.name === 'string' && d.schema && Array.isArray(d.schema.tables) && Array.isArray(d.schema.relations))
    .map(d => ({
      id: d.id,
      name: d.name,
      createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
      updatedAt: typeof d.updatedAt === 'number' ? d.updatedAt : Date.now(),
      schema: d.schema
    }))
}

function writeDatabasesToStorage(databases: StoredDatabase[]) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY_DATABASES, JSON.stringify(databases))
  } catch {
    // Ignore quota / serialization failures
  }
}

function readCurrentDatabaseIdFromStorage(): string | null {
  if (typeof localStorage === 'undefined') return null
  const id = localStorage.getItem(STORAGE_KEY_CURRENT_DB_ID)
  return id && id.trim().length > 0 ? id : null
}

function writeCurrentDatabaseIdToStorage(id: string | null) {
  if (typeof localStorage === 'undefined') return
  try {
    if (!id) localStorage.removeItem(STORAGE_KEY_CURRENT_DB_ID)
    else localStorage.setItem(STORAGE_KEY_CURRENT_DB_ID, id)
  } catch {
    // Ignore storage failures
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function recomputeCountersFromSchema(tables: Table[], relations: Relation[]) {
  let maxTable = 0
  let maxCol = 0
  let maxRel = 0

  for (const t of tables) {
    const m = /^table-(\d+)$/.exec(t.id)
    if (m) maxTable = Math.max(maxTable, Number(m[1] || 0))
    for (const c of t.columns) {
      const cm = /^col-(\d+)$/.exec(c.id)
      if (cm) maxCol = Math.max(maxCol, Number(cm[1] || 0))
    }
  }
  for (const r of relations) {
    const rm = /^rel-(\d+)$/.exec(r.id)
    if (rm) maxRel = Math.max(maxRel, Number(rm[1] || 0))
  }

  tableCounter = maxTable
  columnCounter = maxCol
  relationCounter = maxRel
}

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
    position: { x: -105.45376723152509, y: -133.0314541082399 },
    width: 350,
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
    position: { x: 551.0187207219225, y: 258.57169954111 },
    width: 350,
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
    position: { x: 1244.721085958935, y: -106.83265157536083 },
    width: 350,
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
  const storedSchema = readCurrentSchemaFromStorage()
  const previewData = storedSchema ? storedSchema : createPreviewSchema()
  const tables = ref<Table[]>(previewData.tables)
  const relations = ref<Relation[]>(previewData.relations)
  const selectedRelationId = ref<string | null>(null)
  const selectedTableIds = ref<Set<string>>(new Set())
  const isAutoArranging = ref(false)

  // Saved databases list (named snapshots)
  const databases = ref<StoredDatabase[]>(
    readDatabasesFromStorage().sort((a, b) => b.updatedAt - a.updatedAt)
  )

  const currentDatabaseId = ref<string | null>(readCurrentDatabaseIdFromStorage())
  const currentDatabaseName = ref<string>('Untitled')

  const syncCurrentDatabaseName = () => {
    if (currentDatabaseId.value) {
      const found = databases.value.find(d => d.id === currentDatabaseId.value)
      if (found) {
        currentDatabaseName.value = found.name
        return
      }
    }
    // If we restored a schema from autosave but no known database, call it autosaved.
    currentDatabaseName.value = storedSchema ? 'Autosaved' : 'Untitled'
  }

  syncCurrentDatabaseName()

  // If we loaded from storage, ensure counters won't collide with numeric ids
  if (storedSchema) {
    recomputeCountersFromSchema(tables.value, relations.value)
  }
  
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

  const resetInteractionState = () => {
    selectedRelationId.value = null
    selectedTableIds.value.clear()
    isDragging.value = false
    dragSource.value = null
    dragPreview.value = null
    hoveredColumn.value = null
  }

  const resetHistoryToCurrent = () => {
    const snap = createSnapshot(tables.value, relations.value)
    history.value = [snap]
    historyIndex.value = 0
    updateHistoryState()
  }

  const applySchema = (schema: Schema) => {
    tables.value = deepClone(schema.tables)
    relations.value = deepClone(schema.relations)
    recomputeCountersFromSchema(tables.value, relations.value)
    resetInteractionState()
    resetHistoryToCurrent()
    writeCurrentSchemaToStorage(createSnapshot(tables.value, relations.value))
  }

  const newEmptySchema = () => {
    currentDatabaseId.value = null
    currentDatabaseName.value = 'Untitled'
    writeCurrentDatabaseIdToStorage(null)
    applySchema({ tables: [], relations: [] })
  }

  const saveDatabase = (name: string): { success: boolean; id?: string; error?: string } => {
    const trimmed = (name || '').trim()
    if (!trimmed) return { success: false, error: 'Name is required' }

    const now = Date.now()
    const record: StoredDatabase = {
      id: createId(),
      name: trimmed,
      createdAt: now,
      updatedAt: now,
      schema: createSnapshot(tables.value, relations.value)
    }

    databases.value = [record, ...databases.value].sort((a, b) => b.updatedAt - a.updatedAt)
    writeDatabasesToStorage(databases.value)
    currentDatabaseId.value = record.id
    currentDatabaseName.value = record.name
    writeCurrentDatabaseIdToStorage(record.id)
    return { success: true, id: record.id }
  }

  const loadDatabase = (id: string): { success: boolean; error?: string } => {
    const found = databases.value.find(d => d.id === id)
    if (!found) return { success: false, error: 'Database not found' }
    currentDatabaseId.value = found.id
    currentDatabaseName.value = found.name
    writeCurrentDatabaseIdToStorage(found.id)
    applySchema(found.schema)
    return { success: true }
  }

  const deleteDatabaseById = (id: string): { success: boolean; error?: string } => {
    const before = databases.value.length
    databases.value = databases.value.filter(d => d.id !== id)
    if (databases.value.length === before) return { success: false, error: 'Database not found' }
    writeDatabasesToStorage(databases.value)
    if (currentDatabaseId.value === id) {
      currentDatabaseId.value = null
      currentDatabaseName.value = storedSchema ? 'Autosaved' : 'Untitled'
      writeCurrentDatabaseIdToStorage(null)
    }
    return { success: true }
  }

  const renameDatabase = (id: string, name: string): { success: boolean; error?: string } => {
    const trimmed = (name || '').trim()
    if (!trimmed) return { success: false, error: 'Name is required' }
    const idx = databases.value.findIndex(d => d.id === id)
    if (idx === -1) return { success: false, error: 'Database not found' }
    const existing = databases.value[idx]
    if (!existing) return { success: false, error: 'Database not found' }
    const now = Date.now()
    databases.value[idx] = { ...existing, name: trimmed, updatedAt: now }
    databases.value = [...databases.value].sort((a, b) => b.updatedAt - a.updatedAt)
    writeDatabasesToStorage(databases.value)
    if (currentDatabaseId.value === id) {
      currentDatabaseName.value = trimmed
    }
    return { success: true }
  }

  // Autosave current working schema to localStorage (so refresh restores)
  let autosaveTimer: number | null = null
  const scheduleAutosave = () => {
    if (autosaveTimer != null) window.clearTimeout(autosaveTimer)
    autosaveTimer = window.setTimeout(() => {
      writeCurrentSchemaToStorage(createSnapshot(tables.value, relations.value))
      autosaveTimer = null
    }, 250)
  }

  watch([tables, relations], scheduleAutosave, { deep: true })

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

  const autoArrange = async (): Promise<{ success: boolean; error?: string }> => {
    if (isAutoArranging.value) return { success: false, error: 'Auto-arrange is already running' }
    if (!Array.isArray(tables.value) || tables.value.length === 0) return { success: false, error: 'No tables to arrange' }

    isAutoArranging.value = true
    try {
      // Compute first so we don't add a history entry if layout fails.
      const positions = await computeElkLayout(tables.value, relations.value, {
        direction: 'RIGHT',
        // For RIGHT layouts, this mostly controls vertical spacing ("row gaps") within each column/layer.
        nodeSpacing: 120,
        // Horizontal spacing between layers/columns.
        layerSpacing: 160
      })

      // One undo step for the entire layout operation.
      saveToHistory()

      for (const t of tables.value) {
        const pos = positions[t.id]
        if (!pos) continue
        updateTable(t.id, { position: { x: pos.x, y: pos.y } })
      }

      return { success: true }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : 'Failed to auto-arrange' }
    } finally {
      isAutoArranging.value = false
    }
  }

  const addTable = () => {
    saveToHistory()
    const newTable: Table = {
      id: `table-${++tableCounter}`,
      name: `table_${tableCounter}`,
      position: { x: 100 + tableCounter * 50, y: 100 + tableCounter * 50 },
      width: 350,
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

  const exportToOpenApiJson = (): string => {
    const schema: Schema = {
      tables: tables.value,
      relations: relations.value
    }
    return generateOpenApiJson(schema)
  }

  // Map Drizzle types back to internal types
  const mapDrizzleTypeToInternal = (drizzleType: string): string => {
    const typeMap: Record<string, string> = {
      integer: 'integer',
      serial: 'integer',
      varchar: 'varchar',
      text: 'text',
      decimal: 'decimal',
      boolean: 'boolean',
      timestamp: 'timestamp',
      date: 'date',
      jsonb: 'json'
    }
    return typeMap[drizzleType] || 'text'
  }

  // Parse Drizzle schema code and import into the schema
  const importFromDrizzle = (code: string): { success: boolean; error?: string } => {
    try {
      const newTables: Table[] = []
      const newRelations: Relation[] = []
      const tableVarMap: Record<string, { tableId: string; name: string }> = {}
      const enumVarMap: Record<string, { enumName: string; values: string[] }> = {}
      const pendingRefRelations: Array<{
        fromTableVar: string // referenced table var
        fromColumnName: string // referenced column prop
        toTableVar: string // referencing table var
        toColumnName: string // fk column prop on referencing table
      }> = []
      
      // Reset counters
      tableCounter = 0
      columnCounter = 0
      relationCounter = 0

      const addRelationIfMissing = (rel: Omit<Relation, 'id'>) => {
        const exists = newRelations.some(
          r =>
            (r.fromTableId === rel.fromTableId &&
              r.fromColumnId === rel.fromColumnId &&
              r.toTableId === rel.toTableId &&
              r.toColumnId === rel.toColumnId) ||
            (r.fromTableId === rel.toTableId &&
              r.fromColumnId === rel.toColumnId &&
              r.toTableId === rel.fromTableId &&
              r.toColumnId === rel.fromColumnId)
        )
        if (exists) return
        newRelations.push({ id: `rel-${++relationCounter}`, ...rel })
      }

      const scanToMatching = (source: string, openPos: number, openChar: string, closeChar: string): number | null => {
        if (source[openPos] !== openChar) return null
        let depth = 1
        let i = openPos + 1
        let inString: "'" | '"' | '`' | null = null
        let escaped = false
        let inLineComment = false
        let inBlockComment = false

        for (; i < source.length; i++) {
          const ch = source[i]
          const next = i + 1 < source.length ? source[i + 1] : ''

          if (inLineComment) {
            if (ch === '\n') inLineComment = false
            continue
          }
          if (inBlockComment) {
            if (ch === '*' && next === '/') {
              inBlockComment = false
              i++
            }
            continue
          }

          if (inString) {
            if (escaped) {
              escaped = false
              continue
            }
            if (ch === '\\') {
              escaped = true
              continue
            }
            if (ch === inString) {
              inString = null
            }
            continue
          }

          if (ch === '/' && next === '/') {
            inLineComment = true
            i++
            continue
          }
          if (ch === '/' && next === '*') {
            inBlockComment = true
            i++
            continue
          }

          if (ch === "'" || ch === '"' || ch === '`') {
            inString = ch
            continue
          }

          if (ch === openChar) depth++
          else if (ch === closeChar) depth--

          if (depth === 0) return i
        }
        return null
      }

      const splitTopLevelComma = (source: string): string[] => {
        const parts: string[] = []
        let start = 0
        let depthParen = 0
        let depthBrace = 0
        let depthBracket = 0
        let inString: "'" | '"' | '`' | null = null
        let escaped = false
        let inLineComment = false
        let inBlockComment = false

        for (let i = 0; i < source.length; i++) {
          const ch = source[i]
          const next = i + 1 < source.length ? source[i + 1] : ''

          if (inLineComment) {
            if (ch === '\n') inLineComment = false
            continue
          }
          if (inBlockComment) {
            if (ch === '*' && next === '/') {
              inBlockComment = false
              i++
            }
            continue
          }

          if (inString) {
            if (escaped) {
              escaped = false
              continue
            }
            if (ch === '\\') {
              escaped = true
              continue
            }
            if (ch === inString) {
              inString = null
            }
            continue
          }

          if (ch === '/' && next === '/') {
            inLineComment = true
            i++
            continue
          }
          if (ch === '/' && next === '*') {
            inBlockComment = true
            i++
            continue
          }

          if (ch === "'" || ch === '"' || ch === '`') {
            inString = ch
            continue
          }

          if (ch === '(') depthParen++
          else if (ch === ')') depthParen = Math.max(0, depthParen - 1)
          else if (ch === '{') depthBrace++
          else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1)
          else if (ch === '[') depthBracket++
          else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1)

          if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
            const piece = source.slice(start, i).trim()
            if (piece) parts.push(piece)
            start = i + 1
          }
        }
        const last = source.slice(start).trim()
        if (last) parts.push(last)
        return parts
      }

      // Enums: export const orderStatusEnum = pgEnum('order_status', ['pending', ...])
      const enumRegex = /export\s+const\s+(\w+)\s*=\s*pgEnum\(\s*['"]([^'"]+)['"]\s*,\s*\[([\s\S]*?)\]\s*\)\s*;?/g
      let enumMatch: RegExpExecArray | null
      while ((enumMatch = enumRegex.exec(code)) !== null) {
        const enumVar = enumMatch[1]
        const enumName = enumMatch[2]
        const valuesRaw = enumMatch[3] || ''
        const values = Array.from(valuesRaw.matchAll(/['"]([^'"]+)['"]/g))
          .map(m => m[1])
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
        if (enumVar && enumName) {
          enumVarMap[enumVar] = { enumName, values }
        }
      }

      // Tables: export const users = pgTable('users', { ... });
      const tableStartRegex = /export\s+const\s+(\w+)\s*=\s*pgTable\s*\(/g
      let tableStart: RegExpExecArray | null
      while ((tableStart = tableStartRegex.exec(code)) !== null) {
        const tableVar = tableStart[1]
        const openParenPos = tableStart.index + tableStart[0].length - 1
        if (!tableVar) continue

        const closeParenPos = scanToMatching(code, openParenPos, '(', ')')
        if (closeParenPos == null) continue

        const argsText = code.slice(openParenPos + 1, closeParenPos)
        // First argument is table name string
        const tableNameMatch = argsText.match(/^\s*['"]([^'"]+)['"]\s*,/s)
        if (!tableNameMatch) continue
        const tableName = tableNameMatch[1]
        if (!tableName) continue

        // Find the first "{" for the columns object (second argument)
        const bracePosInArgs = argsText.indexOf('{')
        if (bracePosInArgs === -1) continue
        const bracePosInCode = openParenPos + 1 + bracePosInArgs
        const closeBracePos = scanToMatching(code, bracePosInCode, '{', '}')
        if (closeBracePos == null) continue

        const columnsStr = code.slice(bracePosInCode + 1, closeBracePos)
        const tableId = `table-${++tableCounter}`
        tableVarMap[tableVar] = { tableId, name: tableName }

        const columns: Column[] = []
        const entries = splitTopLevelComma(columnsStr)

        for (const entry of entries) {
          const m = entry.match(/^\s*(\w+)\s*:\s*([\s\S]+)$/)
          if (!m) continue
          const colProp = m[1]
          const expr = (m[2] || '').trim()
          if (!colProp || !expr) continue

          const baseTypeMatch = expr.match(/^\s*([A-Za-z_]\w*)\s*\(/)
          const baseType = baseTypeMatch?.[1]
          if (!baseType) continue

          const isSerial = baseType === 'serial'
          const isPrimaryKey = /\.primaryKey\(\)/.test(expr) || isSerial
          const isNotNull = /\.notNull\(\)/.test(expr) || isSerial
          const isUnique = /\.unique\(\)/.test(expr)

          const colType = enumVarMap[baseType]
            ? `enum:${enumVarMap[baseType].enumName}`
            : isSerial
              ? 'integer'
              : mapDrizzleTypeToInternal(baseType)

          const column: Column = {
            id: `col-${++columnCounter}`,
            name: colProp,
            type: colType,
            nullable: !isNotNull,
            primaryKey: isPrimaryKey,
            unique: isUnique,
            autoIncrement: isSerial
          }
          columns.push(column)

          // Inline FK references: .references(() => users.id)
          const refMatch = expr.match(/\.references\(\s*\(\s*\)\s*=>\s*(\w+)\.(\w+)\s*\)/)
          if (refMatch) {
            const referencedTableVar = refMatch[1]
            const referencedColProp = refMatch[2]
            if (referencedTableVar && referencedColProp) {
              pendingRefRelations.push({
                fromTableVar: referencedTableVar,
                fromColumnName: referencedColProp,
                toTableVar: tableVar,
                toColumnName: colProp
              })
            }
          }
        }

        const table: Table = {
          id: tableId,
          name: tableName,
          position: {
            x: 100 + (newTables.length % 5) * 400,
            y: 100 + Math.floor(newTables.length / 5) * 300
          },
          width: 350,
          columns
        }
        newTables.push(table)
      }

      if (newTables.length === 0) {
        return { success: false, error: 'No tables found in schema. Make sure tables are defined with pgTable()' }
      }

      // Resolve relations declared via inline .references(() => otherTable.otherColumn)
      for (const pending of pendingRefRelations) {
        const referencedTable = tableVarMap[pending.fromTableVar]
        const referencingTable = tableVarMap[pending.toTableVar]
        if (!referencedTable || !referencingTable) continue

        const fromTable = newTables.find(t => t.id === referencedTable.tableId)
        const toTable = newTables.find(t => t.id === referencingTable.tableId)
        if (!fromTable || !toTable) continue

        const fromCol = fromTable.columns.find(c => c.name === pending.fromColumnName)
        const toCol = toTable.columns.find(c => c.name === pending.toColumnName)
        if (!fromCol || !toCol) continue

        const relationType: Relation['type'] = toCol.unique ? 'one-to-one' : 'one-to-many'
        addRelationIfMissing({
          fromTableId: fromTable.id,
          fromColumnId: fromCol.id,
          toTableId: toTable.id,
          toColumnId: toCol.id,
          type: relationType
        })
      }

      // Also support explicit relations(...) blocks for users who define them
      const relationsStartRegex = /export\s+const\s+(\w+)Relations\s*=\s*relations\s*\(/g
      let relStart: RegExpExecArray | null
      while ((relStart = relationsStartRegex.exec(code)) !== null) {
        const openParenPos = relStart.index + relStart[0].length - 1
        const closeParenPos = scanToMatching(code, openParenPos, '(', ')')
        if (closeParenPos == null) continue

        const argsText = code.slice(openParenPos + 1, closeParenPos)
        const baseTableVarMatch = argsText.match(/^\s*(\w+)\s*,/s)
        const baseTableVar = baseTableVarMatch?.[1]
        if (!baseTableVar) continue

        const baseTableInfo = tableVarMap[baseTableVar]
        if (!baseTableInfo) continue

        const baseTable = newTables.find(t => t.id === baseTableInfo.tableId)
        if (!baseTable) continue

        // one(target, { fields: [base.col], references: [target.col] })
        const oneRegex =
          /one\(\s*(\w+)\s*,\s*\{\s*fields:\s*\[\s*(\w+)\.(\w+)\s*\]\s*,\s*references:\s*\[\s*(\w+)\.(\w+)\s*\]\s*\}\s*\)/g
        let oneMatch: RegExpExecArray | null
        while ((oneMatch = oneRegex.exec(argsText)) !== null) {
          const targetTableVar = oneMatch[1]
          const fieldsTableVar = oneMatch[2]
          const fkColProp = oneMatch[3]
          const refTableVar = oneMatch[4]
          const refColProp = oneMatch[5]
          if (!targetTableVar || !fieldsTableVar || !fkColProp || !refTableVar || !refColProp) continue

          // Typically fieldsTableVar === baseTableVar and refTableVar === targetTableVar, but don't assume.
          const referencingInfo = tableVarMap[fieldsTableVar]
          const referencedInfo = tableVarMap[refTableVar]
          if (!referencingInfo || !referencedInfo) continue

          const referencingTable = newTables.find(t => t.id === referencingInfo.tableId)
          const referencedTable = newTables.find(t => t.id === referencedInfo.tableId)
          if (!referencingTable || !referencedTable) continue

          const fkCol = referencingTable.columns.find(c => c.name === fkColProp)
          const refCol = referencedTable.columns.find(c => c.name === refColProp)
          if (!fkCol || !refCol) continue

          const relationType: Relation['type'] = fkCol.unique ? 'one-to-one' : 'one-to-many'
          addRelationIfMissing({
            fromTableId: referencedTable.id,
            fromColumnId: refCol.id,
            toTableId: referencingTable.id,
            toColumnId: fkCol.id,
            type: relationType
          })
        }

        // many(targetTable) — heuristic only (prefer .references / one() above)
        const manyRegex = /many\(\s*(\w+)\s*\)/g
        let manyMatch: RegExpExecArray | null
        while ((manyMatch = manyRegex.exec(argsText)) !== null) {
          const targetVar = manyMatch[1]
          if (!targetVar) continue
          const targetInfo = tableVarMap[targetVar]
          if (!targetInfo) continue

          const targetTable = newTables.find(t => t.id === targetInfo.tableId)
          if (!targetTable) continue

          const fromPK = baseTable.columns.find(c => c.primaryKey) || baseTable.columns[0]
          if (!fromPK) continue

          const baseName = baseTable.name.toLowerCase()
          const singular = baseName.endsWith('s') ? baseName.slice(0, -1) : baseName
          const fkCandidate =
            targetTable.columns.find(c => c.name.toLowerCase() === `${singular}id`) ||
            targetTable.columns.find(c => c.name.toLowerCase().includes(singular) && c.name.toLowerCase().endsWith('id')) ||
            targetTable.columns.find(c => c.name.toLowerCase().endsWith('id'))

          if (!fkCandidate) continue

          addRelationIfMissing({
            fromTableId: baseTable.id,
            fromColumnId: fromPK.id,
            toTableId: targetTable.id,
            toColumnId: fkCandidate.id,
            type: fkCandidate.unique ? 'one-to-one' : 'one-to-many'
          })
        }
      }

      // Replace existing schema with imported one
      saveToHistory()
      tables.value = newTables
      relations.value = newRelations
      
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to parse Drizzle schema' 
      }
    }
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
    isAutoArranging,
    dragSource,
    dragPreview,
    hoveredColumn,
    databases,
    currentDatabaseId,
    currentDatabaseName,
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
    autoArrange,
    exportToDrizzle,
    exportToOpenApiJson,
    importFromDrizzle,
    newEmptySchema,
    saveDatabase,
    loadDatabase,
    deleteDatabaseById,
    renameDatabase
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
