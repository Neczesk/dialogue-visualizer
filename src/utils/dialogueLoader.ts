import { DialogueTree } from '../types/DialogueTypes';

// Import all dialogue files from assets folder
const dialogueFiles = import.meta.glob('../assets/*.json', { eager: true });

export interface DialogueFile {
  name: string;
  path: string;
  content: DialogueTree;
}

const formatTitle = (filename: string): string => {
  return filename
    .replace('.json', '')
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getDialogueFiles = (): DialogueFile[] => {
  return Object.entries(dialogueFiles).map(([path, module]) => ({
    name: formatTitle(path.split('/').pop() || ''),
    path,
    content: module as DialogueTree,
  }));
};
