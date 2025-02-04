import { DialogueTree } from '../types/DialogueTypes';

// Import all dialogue files from assets folder

export interface DialogueFile {
  name: string;
  path: string;
  content: DialogueTree;
}

export const getDialogueFiles = (): DialogueFile[] => [
  {
    name: 'Tutorial',
    path: import.meta.env.BASE_URL + 'templates/tutorialDialogue.json',
    content: {
      name: '',
      characters: {},
      startNodeId: '',
      nodes: {},
    },
  },
];
