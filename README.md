# Drizzle Schema Designer

A visual database schema designer for Drizzle ORM with Cloudflare D1 (SQLite) support. Create and manage database schemas with an intuitive drag-and-drop interface.

## Features

- **Drag & Drop Tables**: Create tables and position them freely on the canvas
- **Column Management**: Add, edit, and delete columns with various data types
- **Visual Relations**: Connect tables to visualize relationships (one-to-one, one-to-many, many-to-many)
- **D1/SQLite Support**: Generate and import Drizzle schemas for Cloudflare D1
- **Export/Import**: Export to Drizzle schema code or import existing schemas
- **AI-Powered**: Use AI chat to generate schemas from natural language descriptions
- **Undo/Redo**: Full history support for schema changes
- **Auto-Layout**: Automatically arrange tables for better visualization
- **Clean Interface**: Simple, modern UI built with Vue 3 and Tailwind CSS 4

## Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe development
- **Tailwind CSS 4** - Utility-first CSS framework
- **Vite** - Next-generation frontend tooling

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

### AI Chat (OpenRouter)

To enable the AI chat panel, create a `.env` file (see `env.example`) and set:

```bash
VITE_OPENROUTER_API_KEY=your_openrouter_key
```

### Build

```bash
npm run build
```

## Usage

1. **Add Table**: Click the "Add Table" button in the toolbar to create a new table
2. **Edit Table Name**: Click on the table name to edit it
3. **Add Columns**: Click "Add Column" button within a table card
4. **Edit Columns**: Click on column names or types to modify them, or use the column config button for advanced options
5. **Create Relations**: Drag from a column in one table to a column in another table to create relationships
6. **Edit Relations**: Click on a relation line to edit its type (one-to-one, one-to-many, many-to-many)
7. **Move Tables**: Drag tables around the canvas to organize your schema
8. **Pan Canvas**: Middle-click and drag, or click and drag on empty canvas area to pan the view
9. **Zoom**: Use mouse wheel to zoom in/out
10. **Export Schema**: Click "Export" in the toolbar to copy Drizzle schema code
11. **Import Schema**: Click "Import" to paste and import existing Drizzle schema code
12. **AI Chat**: Use the chat panel to generate schemas from natural language descriptions
13. **Delete Items**: Use the delete buttons to remove tables, columns, or relations

## Project Structure

```
src/
├── components/
│   ├── SchemaCanvas.vue    # Main canvas component
│   ├── TableCard.vue        # Individual table card
│   ├── Toolbar.vue          # Top toolbar
│   └── RelationLine.vue     # Relation visualization
├── composables/
│   └── useSchema.ts         # Schema state management
├── types/
│   └── schema.ts            # TypeScript type definitions
└── App.vue                  # Root component
```

## Roadmap

- [x] Basic drag-and-drop functionality
- [x] Table and column management
- [x] Create relations between tables by dragging
- [x] Different relation types (one-to-one, one-to-many, many-to-many)
- [x] Export to Drizzle schema code (D1/SQLite)
- [x] Import existing schemas
- [x] Undo/redo functionality
- [x] Dark mode
- [x] Auto-layout for tables
- [x] AI-powered schema generation
- [ ] Schema validation
- [ ] Database management (save/load multiple schemas)

## License

MIT
