export type InspectorTarget = {
  type: 'node' | 'choice' | 'alternateText';
  id: string;
  index?: number; // For choices and alternate texts
};
