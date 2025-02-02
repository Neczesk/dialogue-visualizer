import petraDialogue from '../assets/petraDialogue.json';
import tutorialDialogue from '../assets/tutorialDialogue.json';

export const dialogueFiles = [
  {
    name: 'Tutorial',
    path: 'tutorial',
    content: tutorialDialogue,
  },
  {
    name: 'Petra Example',
    path: 'petra',
    content: petraDialogue,
  },
];

export const defaultTemplate = tutorialDialogue;
