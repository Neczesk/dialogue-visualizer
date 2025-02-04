import React, { useState, useEffect } from 'react';
import { DialogueNode, DialogueTree } from '../types/DialogueTypes';
import { InspectorTarget } from '../types/EditorTypes';
import { Inspector } from './Inspector';

import { BBCodeRenderer } from './BBCodeRenderer';

interface DialogueNodeEditorProps {
  node: DialogueNode;
  dialogueTree: DialogueTree;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedNode: DialogueNode) => void;
  availableNodes: string[];
  onCreateNode?: (id: string) => void;
}

export const DialogueNodeEditor: React.FC<DialogueNodeEditorProps> = ({
  node,
  dialogueTree,
  isOpen,
  onClose,
  onSave,
  availableNodes,
  onCreateNode,
}) => {
  const [editedNode, setEditedNode] = useState<DialogueNode>({ ...node });
  const [inspectorTarget, setInspectorTarget] = useState<InspectorTarget | null>(null);
  const [emotion, setEmotion] = useState(node.emotion || '');
  const [selectedCharacter, setSelectedCharacter] = useState(node.character || Object.keys(dialogueTree.characters)[0]);
  const [speakerName, setSpeakerName] = useState(
    node.speaker || dialogueTree.characters[selectedCharacter]?.name || ''
  );

  const availableEmotions = Object.keys(dialogueTree.characters[selectedCharacter]?.portraits || {});

  // Collect all flags and state values from the dialogue tree
  const { existingFlags, existingStateKeys } = React.useMemo(() => {
    const flags = new Set<string>();
    const stateKeys = new Set<string>();

    Object.values(dialogueTree.nodes).forEach((node) => {
      // Collect from alternate texts
      node.alternateTexts?.forEach((alt) => {
        alt.prerequisites?.requiredFlags?.forEach((flag) => flags.add(flag));
        alt.prerequisites?.blockedFlags?.forEach((flag) => flags.add(flag));
        alt.prerequisites?.stateConditions?.forEach((condition) => {
          stateKeys.add(condition.key);
        });
      });

      // Collect from choices
      node.choices.forEach((choice) => {
        choice.prerequisites?.requiredFlags?.forEach((flag) => flags.add(flag));
        choice.prerequisites?.blockedFlags?.forEach((flag) => flags.add(flag));
        choice.prerequisites?.stateConditions?.forEach((condition) => {
          stateKeys.add(condition.key);
        });
        choice.flagChanges?.add?.forEach((flag) => flags.add(flag));
        choice.flagChanges?.remove?.forEach((flag) => flags.add(flag));
        choice.stateChanges?.forEach((change) => {
          stateKeys.add(change.key);
        });
      });
    });

    return {
      existingFlags: Array.from(flags).sort(),
      existingStateKeys: Array.from(stateKeys).sort(),
    };
  }, [dialogueTree]);

  const addChoice = () => {
    setEditedNode((prev) => ({
      ...prev,
      choices: [
        ...prev.choices,
        {
          id: `choice_${Date.now()}`,
          text: 'New choice',
          nextNodeId: availableNodes[0] || '',
        },
      ],
    }));
  };

  const handleInspectorUpdate = (updatedNode: DialogueNode) => {
    console.log('DialogueNodeEditor handleInspectorUpdate - before:', editedNode);
    console.log('DialogueNodeEditor handleInspectorUpdate - update:', updatedNode);
    setEditedNode(updatedNode);
    console.log('DialogueNodeEditor handleInspectorUpdate - after state set');
  };

  const handleSave = () => {
    console.log('DialogueNodeEditor handleSave - before:', editedNode);

    // Include emotion in the save
    const nodeToSave = {
      ...editedNode,
      emotion,
      character: selectedCharacter,
      speaker: speakerName,
    };

    console.log('DialogueNodeEditor handleSave - after:', nodeToSave);
    console.log('DialogueNodeEditor calling onSave with:', nodeToSave);
    onSave(nodeToSave);
    console.log('DialogueNodeEditor onSave called');
    onClose();
  };

  useEffect(() => {
    setEmotion(node.emotion || '');
  }, [node]);

  useEffect(() => {
    setEditedNode((prev) => ({
      ...prev,
      emotion,
    }));
  }, [emotion]);

  useEffect(() => {
    setEditedNode({ ...node });
  }, [node]);

  // Add an effect to log editedNode changes
  useEffect(() => {
    console.log('DialogueNodeEditor editedNode changed:', editedNode);
  }, [editedNode]);

  // Update speaker name when character changes
  useEffect(() => {
    if (!node.speaker) {
      setSpeakerName(dialogueTree.characters[selectedCharacter]?.name || '');
    }
  }, [selectedCharacter]);

  if (!isOpen) return null;

  return (
    <div className='modal-overlay'>
      <div className='node-editor-modal'>
        <div className='node-editor-header'>
          <div className='node-editor-title'>
            <h3>Edit Node</h3>
            <span className='node-id'>{editedNode.id}</span>
          </div>
          <button
            onClick={onClose}
            className='close-button'
          >
            ×
          </button>
        </div>

        <div className='node-editor-content'>
          <div className='node-editor-main'>
            <div className='editor-section'>
              <div className='editor-section-header'>
                <h4>Character</h4>
              </div>
              <div className='input-group'>
                <label>Character:</label>
                <select
                  value={selectedCharacter}
                  onChange={(e) => setSelectedCharacter(e.target.value)}
                >
                  {Object.entries(dialogueTree.characters).map(([id, char]) => (
                    <option
                      key={id}
                      value={id}
                    >
                      {char.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className='input-group'>
                <label>Display Name:</label>
                <input
                  type='text'
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder='Custom speaker name...'
                />
              </div>
              <div className='input-group'>
                <label>Emotion</label>
                <select
                  value={emotion}
                  onChange={(e) => setEmotion(e.target.value)}
                >
                  <option value=''>Default</option>
                  {availableEmotions.map((e) => (
                    <option
                      key={e}
                      value={e}
                    >
                      {e}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className='editor-section'>
              <div className='editor-section-header'>
                <h4>Default Text</h4>
              </div>
              <div
                className='node-preview'
                onClick={() => setInspectorTarget({ type: 'node', id: editedNode.id })}
              >
                <div className='node-speaker'>{editedNode.speaker}</div>
                <div className='node-text'>
                  <BBCodeRenderer text={editedNode.text} />
                </div>
              </div>
            </div>

            <div className='editor-section'>
              <div className='editor-section-header'>
                <h4>Alternate Texts</h4>
                <button
                  onClick={() => {
                    setEditedNode((prev) => ({
                      ...prev,
                      alternateTexts: [...(prev.alternateTexts || []), { text: '', prerequisites: {} }],
                    }));
                  }}
                  className='add-section-button'
                >
                  Add Alternate Text
                </button>
              </div>
              {editedNode.alternateTexts?.map((alt, index) => (
                <div
                  key={index}
                  className='alternate-text-preview'
                  onClick={() => setInspectorTarget({ type: 'alternateText', id: editedNode.id, index })}
                >
                  <div className='alternate-text-content'>
                    <BBCodeRenderer text={alt.text || '(Empty text)'} />
                    {alt.emotion && <span className='alternate-text-emotion'>• {alt.emotion}</span>}
                  </div>
                  <div className='alternate-text-conditions'>
                    {alt.prerequisites?.requiredFlags?.length ? (
                      <div className='condition-tag'>Required: {alt.prerequisites.requiredFlags.join(', ')}</div>
                    ) : null}
                    {alt.prerequisites?.stateConditions?.length ? (
                      <div className='condition-tag'>{alt.prerequisites.stateConditions.length} condition(s)</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            <div className='editor-section'>
              <div className='editor-section-header'>
                <h4>Choices</h4>
                <button
                  onClick={addChoice}
                  className='add-section-button'
                >
                  Add Choice
                </button>
              </div>
              {editedNode.choices.map((choice, index) => (
                <div
                  key={choice.id}
                  className={`choice-preview ${choice.exit ? 'choice-preview-exit' : ''}`}
                  onClick={() => setInspectorTarget({ type: 'choice', id: choice.id, index })}
                >
                  <div className='choice-text'>{choice.text}</div>
                  <div className='choice-meta'>
                    {choice.prerequisites && <span className='condition-badge'>⚡</span>}
                    {choice.flagChanges && <span className='flag-badge'>🚩</span>}
                    {choice.stateChanges && choice.stateChanges.length > 0 && <span className='state-badge'>📊</span>}
                    {choice.exit ? (
                      <span className='exit-badge'>🚪 {choice.exit.status}</span>
                    ) : (
                      `→ ${choice.nextNodeId || '???'}`
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inspector pane */}
          {inspectorTarget && (
            <div className='node-editor-inspector'>
              <Inspector
                target={inspectorTarget}
                node={editedNode}
                onUpdate={handleInspectorUpdate}
                availableNodes={availableNodes}
                onCreateNode={onCreateNode}
                existingFlags={existingFlags}
                existingStateKeys={existingStateKeys}
              />
            </div>
          )}
        </div>

        <div className='node-editor-footer'>
          <button
            onClick={handleSave}
            className='save-button'
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className='cancel-button'
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
