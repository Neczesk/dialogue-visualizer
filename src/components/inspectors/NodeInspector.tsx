import React from 'react';
import { DialogueNode } from '../../types/DialogueTypes';
import { TextInput } from '../TextInput';

interface NodeInspectorProps {
  node: DialogueNode;
  onUpdate: (node: DialogueNode) => void;
}

export const NodeInspector: React.FC<NodeInspectorProps> = ({ node, onUpdate }) => {
  const handleTextChange = (text: string) => {
    const updatedNode = {
      ...node,
      text,
    };
    console.log('NodeInspector handleTextChange - after:', updatedNode);
    onUpdate(updatedNode);
  };

  return (
    <div className='inspector-content'>
      <h3 className='inspector-title'>Node Settings</h3>

      <div className='form-group'>
        <label>Speaker:</label>
        <input
          type='text'
          value={node.speaker}
          onChange={(e) => onUpdate({ ...node, speaker: e.target.value })}
          placeholder='Who is speaking...'
        />
      </div>

      <div className='form-group'>
        <label>Default Text:</label>
        <TextInput
          value={node.text}
          onChange={handleTextChange}
          placeholder='Enter node text...'
          className='node-text-input'
        />
        <div className='help-text'>
          Supports BBCode formatting: [b]bold[/b], [i]italic[/i], [s]strikethrough[/s], [color=red]colors[/color], and
          variables using {'{'}
          {`$$variable_name`}
          {'}'}
        </div>
      </div>
    </div>
  );
};
