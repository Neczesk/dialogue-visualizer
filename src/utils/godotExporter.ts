import { DialogueTree } from '../types/DialogueTypes';

// Convert markdown to BBCode
const markdownToBBCode = (text: string): string => {
  return (
    text
      // Bold: *text* or **text** -> [b]text[/b]
      .replace(/\*\*?(.*?)\*\*?/g, '[b]$1[/b]')
      // Italic: _text_ -> [i]text[/i]
      .replace(/_(.*?)_/g, '[i]$1[/i]')
      // Strikethrough: ~~text~~ -> [s]text[/s]
      .replace(/~~(.*?)~~/g, '[s]$1[/s]')
      // Headers: # text -> [font_size=24]text[/font_size]
      .replace(/^# (.*?)$/gm, '[font_size=24]$1[/font_size]')
      // Subheaders: ## text -> [font_size=20]text[/font_size]
      .replace(/^## (.*?)$/gm, '[font_size=20]$1[/font_size]')
      // Links: [text](url) -> [url=url]text[/url]
      .replace(/\[(.*?)\]\((.*?)\)/g, '[url=$2]$1[/url]')
      // Convert our color tags to BBCode color tags
      .replace(/\[color=(.*?)\](.*?)\[\/color\]/g, '[color=$1]$2[/color]')
  );
};

const convertToTRES = (dialogueTree: DialogueTree): string => {
  // Helper to convert any object to Godot resource syntax
  const objectToTRES = (obj: object, indent: string = ''): string => {
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return `[${obj.map((item) => objectToTRES(item, indent)).join(', ')}]`;
    }

    if (typeof obj === 'object' && obj !== null) {
      const entries = Object.entries(obj).filter(([, value]) => value !== undefined);
      if (entries.length === 0) return '{}';
      return `{${entries
        .map(([key, value]) => {
          // Convert text fields to BBCode
          if (key === 'text') {
            return `"${key}": "${markdownToBBCode(value as string)}"`;
          }
          return `"${key}": ${objectToTRES(value, indent)}`;
        })
        .join(', ')}}`;
    }

    if (typeof obj === 'string') return `"${(obj as string).replace(/"/g, '\\"')}"`;
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    return String(obj);
  };

  return `[gd_resource type="Resource" script_class="DialogueTree" load_steps=2 format=3]

[ext_resource type="Script" path="res://scripts/dialogue_tree.gd" id="1_script"]

[resource]
script = ExtResource("1_script")
name = "${dialogueTree.name}"
character = "${dialogueTree.character}"
character_name = "${dialogueTree.characterName}"
character_picture = "${dialogueTree.characterPicture}"
start_node_id = "${dialogueTree.startNodeId}"
emotions = ${objectToTRES(dialogueTree.emotions)}
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
  const tresContent = convertToTRES(dialogueTree);
  const fileName = `${dialogueTree.name.toLowerCase().replace(/\s+/g, '_')}.tres`;

  await saveFileWithDialog(tresContent, fileName, {
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
