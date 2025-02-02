# Dialogue Tree Editor

A visual editor for creating and managing dialogue trees for games. Built with React and TypeScript, exports to Godot-compatible format.

## Features

- Visual node-based dialogue editor
- Rich text formatting with BBCode support
  - Text colors
  - Bold, italic, strikethrough
  - Variable substitution
- Live dialogue preview with:
  - Game state simulation
  - Flag system
  - Conditional branching
  - Dynamic text replacement
- Character emotion system
  - Multiple emotion states
  - Dynamic portrait switching
- Export to Godot
  - BBCode-compatible rich text
  - Resource (.tres) format
  - GDScript integration

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### Creating a New Dialogue

1. Start with the default template or load an existing dialogue
2. Add nodes by clicking the "+" button on any choice
3. Connect nodes by dragging from choice endpoints
4. Edit node content in the inspector panel:
   - Add speaker name
   - Edit dialogue text
   - Add formatting and colors
   - Set conditions and state changes

### Text Formatting

The editor supports several formatting options:

- **Bold**: Use `**text**` or the B button
- _Italic_: Use `_text_` or the I button
- ~~Strikethrough~~: Use `~~text~~` or the S button
- Colors: Use the color picker or `[color=red]text[/color]`
- Variables: Use `{$$variable_name}`

### Game State

Test your dialogue conditions with the state manager:

- Toggle flags on/off
- Adjust numeric variables
- See immediate preview updates

## Building

To create a production build:

```bash
npm run build
```

## License

MIT
