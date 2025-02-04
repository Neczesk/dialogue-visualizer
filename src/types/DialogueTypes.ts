export type ComparisonOperator = '=' | '>' | '<' | '>=' | '<=';

export interface StateCondition {
  key: string;
  operator: ComparisonOperator;
  value: number;
}

export interface EmotionPortraits {
  [key: string]: string; // emotion name -> portrait URL
  default: string; // default portrait URL
}

export interface Character {
  name: string;
  defaultEmotion: string;
  portraits: {
    [emotion: string]: string;
  };
}

export interface DialogueNode {
  id: string;
  character: string; // References character ID
  speaker: string; // Display name (can be different from character name)
  text: string;
  emotion?: string;
  alternateTexts?: AlternateText[];
  choices: DialogueChoice[];
}

export interface DialogueChoice {
  id: string;
  text: string;
  nextNodeId: string;
  prerequisites?: Prerequisites;
  flagChanges?: FlagChanges;
  stateChanges?: StateChange[];
  alternateDestinations?: AlternateDestination[];
  exit?: {
    status: string; // e.g., "continue", "shop", "battle", etc.
  };
}

export interface DialogueTree {
  name: string;
  characters: {
    [characterId: string]: Character;
  };
  startNodeId: string;
  nodes: {
    [nodeId: string]: DialogueNode;
  };
}

interface AlternateText {
  text: string;
  emotion?: string;
  prerequisites?: Prerequisites;
}

export interface Prerequisites {
  requiredFlags?: string[];
  blockedFlags?: string[];
  stateConditions?: StateCondition[];
}

export interface AlternateDestination {
  nextNodeId: string;
  prerequisites: Prerequisites;
}

export interface FlagChanges {
  add?: string[];
  remove?: string[];
}

export interface StateChange {
  key: string;
  value: number;
  operation?: 'add' | 'subtract' | 'set'; // defaults to 'set' if not specified
}
