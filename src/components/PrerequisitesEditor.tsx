import React, { useState } from 'react';
import { AutocompleteInput } from './AutocompleteInput';
import { DialogueChoice } from '../types/DialogueTypes';
type Prerequisites = NonNullable<DialogueChoice['prerequisites']>;

interface PrerequisitesEditorProps {
  prerequisites: Prerequisites;
  onChange: (prerequisites: Prerequisites) => void;
  existingFlags: string[];
  existingStateKeys: string[];
}

export const PrerequisitesEditor: React.FC<PrerequisitesEditorProps> = ({
  prerequisites,
  onChange,
  existingFlags,
  existingStateKeys,
}) => {
  const [newFlag, setNewFlag] = useState('');

  return (
    <div className='prerequisites-section'>
      <h4>Prerequisites</h4>
      <div className='form-group'>
        <label>Required Flags:</label>
        <div className='flag-input-container'>
          <AutocompleteInput
            value={newFlag}
            onChange={setNewFlag}
            onEnter={(flag) => {
              if (!flag) return;
              const current = prerequisites.requiredFlags || [];
              onChange({
                ...prerequisites,
                requiredFlags: [...current, flag],
              });
              setNewFlag('');
            }}
            suggestions={existingFlags}
            placeholder='Add required flag...'
          />
          <button
            onClick={() => {
              if (!newFlag) return;
              const current = prerequisites.requiredFlags || [];
              onChange({
                ...prerequisites,
                requiredFlags: [...current, newFlag],
              });
              setNewFlag('');
            }}
            className='add-flag-button'
            disabled={!newFlag}
          >
            Add
          </button>
        </div>
        {/* ... rest of flags section ... */}
      </div>

      <div className='form-group'>
        <label>State Conditions:</label>
        <button
          onClick={() =>
            onChange({
              ...prerequisites,
              stateConditions: [...(prerequisites.stateConditions || []), { key: '', operator: '=', value: 0 }],
            })
          }
          className='add-condition-button'
        >
          Add Condition
        </button>
        {prerequisites.stateConditions?.map((condition, index) => (
          <div
            key={index}
            className='state-condition'
          >
            <AutocompleteInput
              value={condition.key}
              onChange={(value) =>
                onChange({
                  ...prerequisites,
                  stateConditions: prerequisites.stateConditions?.map((c, i) =>
                    i === index ? { ...c, key: value } : c
                  ),
                })
              }
              suggestions={existingStateKeys}
              placeholder='State key'
            />
            {/* ... rest of condition inputs ... */}
          </div>
        ))}
      </div>
    </div>
  );
};
