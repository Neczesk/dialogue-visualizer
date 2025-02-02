import React from 'react';
import { DialogueChoice, ComparisonOperator } from '../../types/DialogueTypes';
import { AutocompleteInput } from '../AutocompleteInput';
import { TextInput } from '../TextInput';

interface ChoiceInspectorProps {
  choice: DialogueChoice;
  onUpdate: (choice: DialogueChoice) => void;
  availableNodes: string[];
  onCreateNode?: (id: string) => void;
  existingFlags: string[];
  existingStateKeys: string[];
}

export const ChoiceInspector: React.FC<ChoiceInspectorProps> = ({
  choice,
  onUpdate,
  availableNodes,
  onCreateNode,
  existingFlags = [],
  existingStateKeys = [],
}) => {
  const handleNodeSelect = (nodeId: string, isAlternate: boolean = false, alternateIndex?: number) => {
    if (!nodeId) return;

    if (availableNodes.includes(nodeId)) {
      // Update with existing node
      if (isAlternate && alternateIndex !== undefined) {
        onUpdate({
          ...choice,
          alternateDestinations: choice.alternateDestinations?.map((d, i) =>
            i === alternateIndex ? { ...d, nextNodeId: nodeId } : d
          ),
        });
      } else {
        onUpdate({ ...choice, nextNodeId: nodeId });
      }
    } else {
      // Create new node
      onCreateNode?.(nodeId);
    }
  };

  const addAlternateDestination = () => {
    onUpdate({
      ...choice,
      alternateDestinations: [
        ...(choice.alternateDestinations || []),
        {
          nextNodeId: '', // Empty to start
          prerequisites: {
            requiredFlags: [],
            blockedFlags: [],
            stateConditions: [],
          },
        },
      ],
    });
  };

  return (
    <div className='inspector-content'>
      <h3 className='inspector-title'>Choice Settings</h3>

      <div className='form-group'>
        <label>Text:</label>
        <TextInput
          value={choice.text}
          onChange={(text) => onUpdate({ ...choice, text })}
          placeholder='Enter choice text...'
          className='choice-text-input'
        />
      </div>

      <div className='form-group'>
        <label>Next Node:</label>
        <div className='next-node-selector'>
          <div className='node-id-input'>
            <AutocompleteInput
              value={choice.nextNodeId}
              onChange={(value) => onUpdate({ ...choice, nextNodeId: value })}
              onEnter={(value) => handleNodeSelect(value)}
              suggestions={availableNodes}
              placeholder='Select or create node...'
            />
            <button
              onClick={() => handleNodeSelect(choice.nextNodeId)}
              className='quick-create-button'
              disabled={!choice.nextNodeId || availableNodes.includes(choice.nextNodeId)}
            >
              Create Node
            </button>
          </div>
        </div>
      </div>

      <div className='prerequisites-section'>
        <h4>Prerequisites</h4>
        <div className='form-group'>
          <label>Required Flags:</label>
          <AutocompleteInput
            value=''
            onChange={(flag) => {
              onUpdate({
                ...choice,
                prerequisites: {
                  ...(choice.prerequisites || {}),
                  requiredFlags: choice.prerequisites?.requiredFlags?.filter((f) => f !== flag) || [],
                },
              });
            }}
            suggestions={existingFlags}
            placeholder='Add required flag...'
          />
          <div className='flag-chips'>
            {choice.prerequisites?.requiredFlags?.map((flag) => (
              <div
                key={flag}
                className='flag-chip'
              >
                {flag}
                <button
                  onClick={() =>
                    onUpdate({
                      ...choice,
                      prerequisites: {
                        ...choice.prerequisites,
                        requiredFlags: choice.prerequisites?.requiredFlags?.filter((f) => f !== flag) || [],
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
                ...choice,
                prerequisites: {
                  ...choice.prerequisites,
                  stateConditions: [
                    ...(choice.prerequisites?.stateConditions || []),
                    { key: '', operator: '=', value: 0 },
                  ],
                },
              })
            }
            className='add-condition-button'
          >
            Add Condition
          </button>
          {choice.prerequisites?.stateConditions?.map((condition, index) => (
            <div
              key={index}
              className='state-condition'
            >
              <AutocompleteInput
                value={condition.key}
                onChange={(value) =>
                  onUpdate({
                    ...choice,
                    prerequisites: {
                      ...choice.prerequisites,
                      stateConditions: choice.prerequisites?.stateConditions?.map((c, i) =>
                        i === index ? { ...c, key: value } : c
                      ),
                    },
                  })
                }
                suggestions={existingStateKeys}
                placeholder='State key'
              />
              <select
                className='operator-select'
                value={condition.operator}
                onChange={(e) =>
                  onUpdate({
                    ...choice,
                    prerequisites: {
                      ...choice.prerequisites,
                      stateConditions: choice.prerequisites?.stateConditions?.map((c, i) =>
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
                    ...choice,
                    prerequisites: {
                      ...choice.prerequisites,
                      stateConditions: choice.prerequisites?.stateConditions?.map((c, i) =>
                        i === index ? { ...c, value: Number(e.target.value) } : c
                      ),
                    },
                  })
                }
              />
              <button
                onClick={() =>
                  onUpdate({
                    ...choice,
                    prerequisites: {
                      ...choice.prerequisites,
                      stateConditions: choice.prerequisites?.stateConditions?.filter((_, i) => i !== index),
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

      <div className='alternate-destinations-section'>
        <div className='section-header'>
          <h4>Alternate Destinations</h4>
          <button
            onClick={addAlternateDestination}
            className='add-section-button'
          >
            Add Alternate Path
          </button>
        </div>

        {choice.alternateDestinations?.map((dest, index) => (
          <div
            key={index}
            className='alternate-destination'
          >
            <div className='destination-header'>
              <h5>Alternate Path {index + 1}</h5>
              <button
                onClick={() =>
                  onUpdate({
                    ...choice,
                    alternateDestinations: choice.alternateDestinations?.filter((_, i) => i !== index),
                  })
                }
                className='remove-destination-button'
              >
                Remove
              </button>
            </div>

            <div className='form-group'>
              <label>Next Node:</label>
              <div className='next-node-selector'>
                <div className='node-id-input'>
                  <AutocompleteInput
                    value={dest.nextNodeId}
                    onChange={(value) =>
                      onUpdate({
                        ...choice,
                        alternateDestinations: choice.alternateDestinations?.map((d, i) =>
                          i === index ? { ...d, nextNodeId: value } : d
                        ),
                      })
                    }
                    onEnter={(value) => handleNodeSelect(value, true, index)}
                    suggestions={availableNodes}
                    placeholder='Select or create node...'
                  />
                  <button
                    onClick={() => handleNodeSelect(dest.nextNodeId, true, index)}
                    className='quick-create-button'
                    disabled={!dest.nextNodeId || availableNodes.includes(dest.nextNodeId)}
                  >
                    Create Node
                  </button>
                </div>
              </div>
            </div>

            <div className='prerequisites-section'>
              <h4>Prerequisites</h4>
              <div className='form-group'>
                <label>Required Flags:</label>
                <AutocompleteInput
                  value=''
                  onChange={(flag) => {
                    const current = dest.prerequisites?.requiredFlags || [];
                    onUpdate({
                      ...choice,
                      alternateDestinations: choice.alternateDestinations?.map((d, i) =>
                        i === index
                          ? { ...d, prerequisites: { ...d.prerequisites, requiredFlags: [...current, flag] } }
                          : d
                      ),
                    });
                  }}
                  suggestions={existingFlags}
                  placeholder='Add required flag...'
                />
                <div className='flag-chips'>
                  {dest.prerequisites?.requiredFlags?.map((flag) => (
                    <div
                      key={flag}
                      className='flag-chip'
                    >
                      {flag}
                      <button
                        onClick={() =>
                          onUpdate({
                            ...choice,
                            alternateDestinations: choice.alternateDestinations?.map((d, i) =>
                              i === index
                                ? {
                                    ...d,
                                    prerequisites: {
                                      ...d.prerequisites,
                                      requiredFlags: d.prerequisites.requiredFlags?.filter((f) => f !== flag),
                                    },
                                  }
                                : d
                            ),
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
                      ...choice,
                      alternateDestinations: choice.alternateDestinations?.map((d, i) =>
                        i === index
                          ? {
                              ...d,
                              prerequisites: {
                                ...d.prerequisites,
                                stateConditions: [
                                  ...(d.prerequisites?.stateConditions || []),
                                  { key: '', operator: '=', value: 0 },
                                ],
                              },
                            }
                          : d
                      ),
                    })
                  }
                  className='add-condition-button'
                >
                  Add Condition
                </button>
                {dest.prerequisites?.stateConditions?.map((condition, condIndex) => (
                  <div
                    key={condIndex}
                    className='state-condition'
                  >
                    <AutocompleteInput
                      value={condition.key}
                      onChange={(value) =>
                        onUpdate({
                          ...choice,
                          alternateDestinations: choice.alternateDestinations?.map((d, i) =>
                            i === index
                              ? {
                                  ...d,
                                  prerequisites: {
                                    ...d.prerequisites,
                                    stateConditions: d.prerequisites.stateConditions?.map((c, i) =>
                                      i === condIndex ? { ...c, key: value } : c
                                    ),
                                  },
                                }
                              : d
                          ),
                        })
                      }
                      suggestions={existingStateKeys}
                      placeholder='State key'
                    />
                    <select
                      className='operator-select'
                      value={condition.operator}
                      onChange={(e) =>
                        onUpdate({
                          ...choice,
                          alternateDestinations: choice.alternateDestinations?.map((d, i) =>
                            i === index
                              ? {
                                  ...d,
                                  prerequisites: {
                                    ...d.prerequisites,
                                    stateConditions: d.prerequisites.stateConditions?.map((c, i) =>
                                      i === condIndex ? { ...c, operator: e.target.value as ComparisonOperator } : c
                                    ),
                                  },
                                }
                              : d
                          ),
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
                          ...choice,
                          alternateDestinations: choice.alternateDestinations?.map((d, i) =>
                            i === index
                              ? {
                                  ...d,
                                  prerequisites: {
                                    ...d.prerequisites,
                                    stateConditions: d.prerequisites.stateConditions?.map((c, i) =>
                                      i === condIndex ? { ...c, value: Number(e.target.value) } : c
                                    ),
                                  },
                                }
                              : d
                          ),
                        })
                      }
                    />
                    <button
                      onClick={() =>
                        onUpdate({
                          ...choice,
                          alternateDestinations: choice.alternateDestinations?.map((d, i) =>
                            i === index
                              ? {
                                  ...d,
                                  prerequisites: {
                                    ...d.prerequisites,
                                    stateConditions: d.prerequisites.stateConditions?.filter((_, i) => i !== condIndex),
                                  },
                                }
                              : d
                          ),
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
        ))}
      </div>
    </div>
  );
};
