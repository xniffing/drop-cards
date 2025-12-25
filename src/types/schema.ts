export interface Column {
  id: string
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
  unique: boolean
  autoIncrement: boolean
}

export interface Table {
  id: string
  name: string
  position: { x: number; y: number }
  columns: Column[]
}

export interface Relation {
  id: string
  fromTableId: string
  fromColumnId: string
  toTableId: string
  toColumnId: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
}

export interface Schema {
  tables: Table[]
  relations: Relation[]
}
