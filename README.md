# Drizzle Schema Designer

A visual database schema designer for Drizzle ORM. Create and manage database schemas with an intuitive drag-and-drop interface.

## Features

- **Drag & Drop Tables**: Create tables and position them freely on the canvas
- **Column Management**: Add, edit, and delete columns with various data types
- **Visual Relations**: Connect tables to visualize relationships (coming soon)
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

### Build

```bash
npm run build
```

## Usage

1. **Add Table**: Click the "Add Table" button in the toolbar to create a new table
2. **Edit Table Name**: Click on the table name to edit it
3. **Add Columns**: Click "Add Column" button within a table card
4. **Edit Columns**: Click on column names or types to modify them
5. **Move Tables**: Drag tables around the canvas to organize your schema
6. **Pan Canvas**: Click and drag on the empty canvas area to pan the view
7. **Delete Items**: Use the delete buttons to remove tables or columns

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
- [ ] Create relations between tables by dragging
- [ ] Different relation types (one-to-one, one-to-many, many-to-many)
- [ ] Export to Drizzle schema code
- [ ] Import existing schemas
- [ ] Undo/redo functionality
- [ ] Schema validation
- [ ] Dark mode

## License

MIT
