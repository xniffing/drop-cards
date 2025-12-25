import { ref, provide, inject } from 'vue'
import type { Table, Column, Relation } from '../types/schema'

const SCHEMA_KEY = Symbol('schema')

let tableCounter = 0
let columnCounter = 0
let relationCounter = 0

export function useSchemaProvider() {
  const tables = ref<Table[]>([])
  const relations = ref<Relation[]>([])

  const addTable = () => {
    const newTable: Table = {
      id: `table-${++tableCounter}`,
      name: `table_${tableCounter}`,
      position: { x: 100 + tableCounter * 50, y: 100 + tableCounter * 50 },
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
  }

  const api = {
    tables,
    relations,
    addTable,
    updateTable,
    deleteTable,
    addColumn,
    updateColumn,
    deleteColumn,
    addRelation,
    deleteRelation
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
