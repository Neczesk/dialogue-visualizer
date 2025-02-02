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

export interface DialogueNode {
  id: string;
  text: string;
  alternateTexts?: AlternateText[];
  speaker: string;
  emotion?: string;
  choices: DialogueChoice[];
}

export interface DialogueChoice {
  id: string;
  text: string;
  nextNodeId: string;
  alternateDestinations?: Array<{
    nextNodeId: string;
    prerequisites: {
      requiredFlags?: string[];
      blockedFlags?: string[];
      stateConditions?: StateCondition[];
    };
  }>;
  prerequisites?: {
    requiredFlags?: string[];
    blockedFlags?: string[];
    stateConditions?: StateCondition[];
  };
  flagChanges?: {
    add?: string[];
    remove?: string[];
  };
  stateChanges?: {
    key: string;
    value: number;
  }[];
}

export interface DialogueTree {
  name: string;
  character: string;
  characterName: string;
  characterPicture: string;
  startNodeId: string;
  nodes: { [key: string]: DialogueNode };
  emotions: EmotionPortraits;
}

interface AlternateText {
  text: string;
  emotion?: string;
  prerequisites: {
    requiredFlags?: string[];
    blockedFlags?: string[];
    stateConditions?: StateCondition[];
  };
}
