import { DialogueTree } from '../types/DialogueTypes';

const convertToTRES = (dialogueTree: DialogueTree): string => {
  // Helper to convert any object to Godot resource syntax

  return `[gd_resource type="Resource" script_class="DialogueTree" load_steps=2 format=3]

[ext_resource type="Script" path="res://addons/dialogue_tree/dialogue_tree.gd" id="1_script"]

[resource]
script = ExtResource("1_script")
name = "${dialogueTree.name}"
characters = {
${Object.entries(dialogueTree.characters)
  .map(
    ([id, char]) => `
"${id}": {
  "name": "${char.name}",
  "default_emotion": "${char.defaultEmotion}",
  "portraits": {
    ${Object.entries(char.portraits)
      .map(([emotion, url]) => `"${emotion}": "${url.replace(/^\//, 'res://')}"`)
      .join(',\n    ')}
  }
}`
  )
  .join(',\n')}
}
start_node_id = "${dialogueTree.startNodeId}"
nodes = {
${Object.entries(dialogueTree.nodes)
  .map(
    ([id, node]) => `
"${id}": {
  "id": "${node.id}",
  "character": "${node.character}",
  "speaker": "${node.speaker}",
  "text": "${node.text.replace(/"/g, '\\"')}",
  "emotion": "${node.emotion || 'default'}",
  ${
    node.alternateTexts
      ? `"alternate_texts": [
    ${node.alternateTexts
      .map(
        (alt) => `{
      "text": "${alt.text.replace(/"/g, '\\"')}",
      "emotion": "${alt.emotion || 'default'}",
      ${alt.prerequisites ? `"prerequisites": ${JSON.stringify(alt.prerequisites)}` : ''}
    }`
      )
      .join(',\n    ')}
  ],`
      : ''
  }
  "choices": [
    ${node.choices
      .map(
        (choice) => `{
      "id": "${choice.id}",
      "text": "${choice.text.replace(/"/g, '\\"')}",
      "next_node_id": "${choice.nextNodeId}",
      ${choice.prerequisites ? `"prerequisites": ${JSON.stringify(choice.prerequisites)},` : ''}
      ${
        choice.alternateDestinations ? `"alternate_destinations": ${JSON.stringify(choice.alternateDestinations)},` : ''
      }
      ${choice.flagChanges ? `"flag_changes": ${JSON.stringify(choice.flagChanges)},` : ''}
      ${choice.stateChanges ? `"state_changes": ${JSON.stringify(choice.stateChanges)}` : ''}
    }`
      )
      .join(',\n    ')}
  ]
}`
  )
  .join(',\n')}
}`;
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
