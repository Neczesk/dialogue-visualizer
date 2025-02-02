import React from 'react';
import { DialogueNode, ComparisonOperator } from '../../types/DialogueTypes';
import { AutocompleteInput } from '../AutocompleteInput';
import { TextInput } from '../TextInput';

interface AlternateTextInspectorProps {
  alternateText: NonNullable<DialogueNode['alternateTexts']>[number];
  onUpdate: (alternateText: NonNullable<DialogueNode['alternateTexts']>[number]) => void;
  existingFlags: string[];
  existingStateKeys: string[];
}

export const AlternateTextInspector: React.FC<AlternateTextInspectorProps> = ({
  alternateText,
  onUpdate,
  existingFlags = [],
  existingStateKeys = [],
}) => {
  return (
    <div className='inspector-content'>
      <h3 className='inspector-title'>Alternate Text Settings</h3>

      <div className='form-group'>
        <label>Text:</label>
        <TextInput
          value={alternateText.text}
          onChange={(text) => onUpdate({ ...alternateText, text })}
          placeholder='Enter alternate text...'
          className='alternate-text-input'
        />
        <div className='help-text'>
          Supports markdown and variables using {'{'}
          {`$$variable_name`}
          {'}'}
        </div>
      </div>

      <div className='prerequisites-section'>
        <h4>Prerequisites</h4>
        <div className='form-group'>
          <label>Required Flags:</label>
          <AutocompleteInput
            value=''
            onChange={(flag) => {
              const current = alternateText.prerequisites?.requiredFlags || [];
              const updatedPrerequisites = {
                ...alternateText.prerequisites,
                requiredFlags: current.filter((f) => f !== flag) || [],
              };
              onUpdate({
                ...alternateText,
                prerequisites: updatedPrerequisites,
              });
            }}
            suggestions={existingFlags}
            placeholder='Add required flag...'
          />
          <div className='flag-chips'>
            {alternateText.prerequisites?.requiredFlags?.map((flag) => (
              <div
                key={flag}
                className='flag-chip'
              >
                {flag}
                <button
                  onClick={() =>
                    onUpdate({
                      ...alternateText,
                      prerequisites: {
                        ...alternateText.prerequisites,
                        requiredFlags: alternateText?.prerequisites?.requiredFlags?.filter((f) => f !== flag) || [],
                      },
                    })
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className='form-group'>
          <label>State Conditions:</label>
          <button
            onClick={() =>
              onUpdate({
                ...alternateText,
                prerequisites: {
                  ...alternateText.prerequisites,
                  stateConditions: [
                    ...(alternateText.prerequisites?.stateConditions || []),
                    { key: '', operator: '=', value: 0 },
                  ],
                },
              })
            }
            className='add-condition-button'
          >
            Add Condition
          </button>
          {alternateText.prerequisites?.stateConditions?.map((condition, index) => (
            <div
              key={index}
              className='state-condition'
            >
              <AutocompleteInput
                value={condition.key}
                onChange={(value) =>
                  onUpdate({
                    ...alternateText,
                    prerequisites: {
                      ...alternateText.prerequisites,
                      stateConditions: alternateText?.prerequisites?.stateConditions?.map((c, i) =>
                        i === index ? { ...c, key: value } : c
                      ),
                    },
                  })
                }
                suggestions={existingStateKeys}
                placeholder='State key'
              />
              <select
                value={condition.operator}
                onChange={(e) =>
                  onUpdate({
                    ...alternateText,
                    prerequisites: {
                      ...alternateText.prerequisites,
                      stateConditions: alternateText?.prerequisites?.stateConditions?.map((c, i) =>
                        i === index ? { ...c, operator: e.target.value as ComparisonOperator } : c
                      ),
                    },
                  })
                }
              >
                <option value='='>=</option>
                <option value='>'>{'>'}</option>
                <option value='<'>{'<'}</option>
                <option value='>='>{'≥'}</option>
                <option value='<='>{'≤'}</option>
              </select>
              <input
                type='number'
                value={condition.value}
                onChange={(e) =>
                  onUpdate({
                    ...alternateText,
                    prerequisites: {
                      ...alternateText.prerequisites,
                      stateConditions: alternateText?.prerequisites?.stateConditions?.map((c, i) =>
                        i === index ? { ...c, value: Number(e.target.value) } : c
                      ),
                    },
                  })
                }
              />
              <button
                onClick={() =>
                  onUpdate({
                    ...alternateText,
                    prerequisites: {
                      ...alternateText.prerequisites,
                      stateConditions:
                        alternateText?.prerequisites?.stateConditions?.filter((_, i) => i !== index) || [],
                    },
                  })
                }
                className='remove-condition-button'
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
