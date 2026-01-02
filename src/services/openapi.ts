import type { Column, Schema, Table } from '../types/schema'

type JsonSchema =
  | {
      type?: string | string[]
      format?: string
      properties?: Record<string, JsonSchema>
      required?: string[]
      additionalProperties?: boolean | JsonSchema
      description?: string
    }
  | { anyOf: JsonSchema[] }

type OpenApiDocument = {
  openapi: '3.1.0'
  jsonSchemaDialect?: string
  info: { title: string; version: string; description?: string }
  paths: Record<string, unknown>
  components: { schemas: Record<string, JsonSchema> }
  tags?: Array<{ name: string; description?: string }>
}

function toSnakeCase(input: string): string {
  return (
    input
      .trim()
      // Add underscore between lower->upper transitions (camelCase -> camel_Case)
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      // Replace non-alphanumeric with underscores
      .replace(/[^a-zA-Z0-9]+/g, '_')
      // Collapse underscores
      .replace(/_+/g, '_')
      // Trim underscores
      .replace(/^_+|_+$/g, '')
      .toLowerCase() || 'table'
  )
}

function toPascalCase(input: string): string {
  const parts = toSnakeCase(input)
    .split('_')
    .filter(Boolean)
  const pascal = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('')
  return pascal || 'Table'
}

function makeUniqueName(base: string, used: Set<string>): string {
  let name = base
  let i = 2
  while (used.has(name)) {
    name = `${base}${i}`
    i += 1
  }
  used.add(name)
  return name
}

function withNullable(schema: JsonSchema, nullable: boolean): JsonSchema {
  if (!nullable) return schema

  if ('anyOf' in schema) {
    return schema
  }

  const t = schema.type
  if (typeof t === 'string') {
    return { ...schema, type: [t, 'null'] }
  }
  if (Array.isArray(t)) {
    return t.includes('null') ? schema : { ...schema, type: [...t, 'null'] }
  }

  // If schema doesn't express a type, fall back to anyOf.
  return { anyOf: [schema, { type: 'null' }] }
}

function asNonNullable(schema: JsonSchema): JsonSchema {
  if ('anyOf' in schema) return schema
  const t = schema.type
  if (Array.isArray(t)) {
    const filtered = t.filter(x => x !== 'null')
    if (filtered.length === 1) return { ...schema, type: filtered[0] }
    return { ...schema, type: filtered }
  }
  return schema
}

function mapColumnTypeToJsonSchema(column: Column): JsonSchema {
  const baseType = column.type
  let schema: JsonSchema

  switch (baseType) {
    case 'integer':
      schema = { type: 'integer' }
      break
    case 'boolean':
      schema = { type: 'boolean' }
      break
    case 'timestamp':
      schema = { type: 'string', format: 'date-time' }
      break
    case 'date':
      schema = { type: 'string', format: 'date' }
      break
    case 'json':
      schema = { type: 'object', additionalProperties: true }
      break
    case 'varchar':
    case 'text':
      schema = { type: 'string' }
      break
    default:
      schema = { type: 'string' }
      break
  }

  return withNullable(schema, column.nullable)
}

function buildTableSchemas(table: Table) {
  const readProperties: Record<string, JsonSchema> = {}
  const createProperties: Record<string, JsonSchema> = {}
  const updateProperties: Record<string, JsonSchema> = {}

  const readRequired: string[] = []
  const createRequired: string[] = []

  for (const col of table.columns) {
    const propSchema = mapColumnTypeToJsonSchema(col)
    readProperties[col.name] = propSchema
    updateProperties[col.name] = propSchema

    if (!col.autoIncrement) {
      createProperties[col.name] = propSchema
      if (!col.nullable) createRequired.push(col.name)
    }

    if (!col.nullable) readRequired.push(col.name)
  }

  const readSchema: JsonSchema = {
    type: 'object',
    properties: readProperties
  }
  if (readRequired.length) readSchema.required = readRequired

  const createSchema: JsonSchema = {
    type: 'object',
    properties: createProperties
  }
  if (createRequired.length) createSchema.required = createRequired

  const updateSchema: JsonSchema = {
    type: 'object',
    properties: updateProperties
  }

  return { readSchema, createSchema, updateSchema }
}

function getSinglePrimaryKey(table: Table): Column | null {
  const pks = table.columns.filter(c => c.primaryKey)
  return pks.length === 1 ? pks[0] : null
}

export function generateOpenApiDocument(schema: Schema): OpenApiDocument {
  const usedComponentNames = new Set<string>()
  const componentNameByTableId: Record<string, string> = {}
  const tagNames: string[] = []

  const components: Record<string, JsonSchema> = {}
  const paths: Record<string, unknown> = {}

  // Component schemas per table
  for (const table of schema.tables) {
    const base = toPascalCase(table.name)
    const safeBase = /^\d/.test(base) ? `T${base}` : base
    const componentBase = makeUniqueName(safeBase, usedComponentNames)
    componentNameByTableId[table.id] = componentBase
    tagNames.push(componentBase)

    const { readSchema, createSchema, updateSchema } = buildTableSchemas(table)
    components[componentBase] = readSchema
    components[`${componentBase}Create`] = createSchema
    components[`${componentBase}Update`] = updateSchema
  }

  // Paths per table
  for (const table of schema.tables) {
    const componentBase = componentNameByTableId[table.id] ?? toPascalCase(table.name)
    const tablePath = toSnakeCase(table.name)
    const tag = componentBase

    const listPath = `/${tablePath}`
    const listOpBase = toSnakeCase(table.name)

    paths[listPath] = {
      get: {
        tags: [tag],
        operationId: `list_${listOpBase}`,
        summary: `List ${table.name}`,
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: `#/components/schemas/${componentBase}` }
                }
              }
            }
          }
        }
      },
      post: {
        tags: [tag],
        operationId: `create_${listOpBase}`,
        summary: `Create ${table.name}`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${componentBase}Create` }
            }
          }
        },
        responses: {
          '201': {
            description: 'Created',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${componentBase}` }
              }
            }
          }
        }
      }
    }

    const pk = getSinglePrimaryKey(table)
    if (!pk) continue

    const pkParam = toSnakeCase(pk.name) || 'id'
    const itemPath = `/${tablePath}/{${pkParam}}`
    const pkSchema = asNonNullable(mapColumnTypeToJsonSchema(pk))

    paths[itemPath] = {
      get: {
        tags: [tag],
        operationId: `get_${listOpBase}_by_${pkParam}`,
        summary: `Get ${table.name} by ${pk.name}`,
        parameters: [
          {
            name: pkParam,
            in: 'path',
            required: true,
            schema: pkSchema
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${componentBase}` }
              }
            }
          }
        }
      },
      patch: {
        tags: [tag],
        operationId: `update_${listOpBase}_by_${pkParam}`,
        summary: `Update ${table.name} by ${pk.name}`,
        parameters: [
          {
            name: pkParam,
            in: 'path',
            required: true,
            schema: pkSchema
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: `#/components/schemas/${componentBase}Update` }
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: { $ref: `#/components/schemas/${componentBase}` }
              }
            }
          }
        }
      },
      delete: {
        tags: [tag],
        operationId: `delete_${listOpBase}_by_${pkParam}`,
        summary: `Delete ${table.name} by ${pk.name}`,
        parameters: [
          {
            name: pkParam,
            in: 'path',
            required: true,
            schema: pkSchema
          }
        ],
        responses: {
          '204': { description: 'No Content' }
        }
      }
    }
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Generated API',
      version: '0.1.0',
      description: 'Generated from Drop Cards schema'
    },
    tags: tagNames.map(name => ({ name })),
    paths,
    components: { schemas: components }
  }
}

export function generateOpenApiJson(schema: Schema): string {
  return JSON.stringify(generateOpenApiDocument(schema), null, 2)
}

