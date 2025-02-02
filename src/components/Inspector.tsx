import React from 'react';
import { DialogueNode } from '../types/DialogueTypes';
import { InspectorTarget } from '../types/EditorTypes';
import { NodeInspector } from './inspectors/NodeInspector';
import { ChoiceInspector } from './inspectors/ChoiceInspector';
import { AlternateTextInspector } from './inspectors/AlternateTextInspector';

interface InspectorProps {
  target: InspectorTarget;
  node: DialogueNode;
  onUpdate: (node: DialogueNode) => void;
  availableNodes: string[];
  onCreateNode?: (id: string) => void;
  existingFlags?: string[];
  existingStateKeys?: string[];
}

export const Inspector: React.FC<InspectorProps> = ({
  target,
  node,
  onUpdate,
  availableNodes,
  onCreateNode,
  existingFlags,
  existingStateKeys,
}) => {
  console.log('Inspector render - target:', target);
  console.log('Inspector render - node:', node);

  const renderInspector = () => {
    switch (target.type) {
      case 'node':
        return (
          <NodeInspector
            node={node}
            onUpdate={onUpdate}
          />
        );
      case 'choice':
        return (
          <ChoiceInspector
            choice={node.choices[target.index!]}
            onUpdate={(updatedChoice) =>
              onUpdate({
                ...node,
                choices: node.choices.map((c, i) => (i === target.index ? updatedChoice : c)),
              })
            }
            availableNodes={availableNodes}
            onCreateNode={onCreateNode}
            existingFlags={existingFlags!}
            existingStateKeys={existingStateKeys!}
          />
        );
      case 'alternateText':
        return (
          <AlternateTextInspector
            alternateText={node.alternateTexts![target.index!]}
            onUpdate={(updatedAlt) => {
              onUpdate({
                ...node,
                alternateTexts: node.alternateTexts!.map((a, i) => (i === target.index ? updatedAlt : a)),
              });
            }}
            existingFlags={existingFlags!}
            existingStateKeys={existingStateKeys!}
          />
        );
      default:
        return null;
    }
  };

  return <div className='inspector'>{renderInspector()}</div>;
};
