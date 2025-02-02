import { DialogueTree } from '../types/DialogueTypes';

// Import all dialogue files from assets folder
const dialogueFiles = import.meta.glob('../assets/*.json', { eager: true });

export interface DialogueFile {
  name: string;
  path: string;
  content: DialogueTree;
}

export const getDialogueFiles = (): DialogueFile[] => {
  return Object.entries(dialogueFiles).map(([path, module]) => ({
    name: path.split('/').pop()?.replace('.json', '') || '',
    path,
    content: module as DialogueTree,
  }));
};
