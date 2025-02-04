import { DialogueTree } from '../types/DialogueTypes';

const convertToTRES = (dialogueTree: DialogueTree): string => {
  // Convert camelCase/PascalCase to snake_case
  const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).replace(/^_/, '');

  // Helper to convert any object to Godot resource syntax
  const objectToTRES = (obj: object, indent: string = ''): string => {
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return `[${obj.map((item) => objectToTRES(item, indent)).join(', ')}]`;
    }

    if (typeof obj === 'object' && obj !== null) {
      const entries = Object.entries(obj)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => {
          const snakeKey = toSnakeCase(key);
          if (key === 'text') {
            return `"${snakeKey}": "${value as string}"`;
          }
          return `"${snakeKey}": ${objectToTRES(value, indent)}`;
        });

      if (entries.length === 0) return '{}';
      return `{${entries.join(', ')}}`;
    }

    if (typeof obj === 'string') return `"${(obj as string).replace(/"/g, '\\"')}"`;
    return String(obj);
  };

  return `[gd_resource type="Resource" script_class="DialogueTree" load_steps=2 format=3]

[ext_resource type="Script" path="res://addons/dialogue_tree/dialogue_tree.gd" id="1_script"]

[resource]
script = ExtResource("1_script")
name = "${dialogueTree.name}"
characters = ${objectToTRES(dialogueTree.characters)}
start_node_id = "${dialogueTree.startNodeId}"
nodes = ${objectToTRES(dialogueTree.nodes)}`;
};

// Add helper function for system save dialog
const saveFileWithDialog = async (content: string, suggestedName: string, options: SaveFilePickerOptions) => {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      ...options,
    });

    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (err) {
    if (err instanceof Error && err.name !== 'AbortError') {
      console.error('Error saving file:', err);
      // Fallback to download if system dialog fails
      const element = document.createElement('a');
      const file = new Blob([content], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = suggestedName;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  }
};

export const downloadAsGodotResource = async (dialogueTree: DialogueTree) => {
  const resourceContent = convertToTRES(dialogueTree);
  const fileName = `${dialogueTree.name.toLowerCase().replace(/\s+/g, '_')}.tres`;

  await saveFileWithDialog(resourceContent, fileName, {
    types: [
      {
        description: 'Godot Resource',
        accept: {
          'application/tres': ['.tres'],
        },
      },
    ],
  });
};

export const downloadDialogueTreeScript = async () => {
  try {
    const response = await fetch('/src/assets/dialogueTree.gd');
    const content = await response.text();

    await saveFileWithDialog(content, 'dialogue_tree.gd', {
      types: [
        {
          description: 'GDScript File',
          accept: {
            'text/x-gdscript': ['.gd'],
          },
        },
      ],
    });
  } catch (err) {
    console.error('Error downloading script:', err);
  }
};
