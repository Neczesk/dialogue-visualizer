import React, { useState, useRef, useEffect } from 'react';
import { DialogueTree, DialogueChoice, StateCondition, DialogueNode } from '../types/DialogueTypes';
import { replaceVariables, extractVariables } from '../utils/textParser';
import { BBCodeRenderer } from './BBCodeRenderer';

interface Message {
  text: string;
  originalText?: string;
  speaker: string;
  isPlayer: boolean;
  emotion?: string;
}

interface DialoguePreviewProps {
  dialogueTree: DialogueTree;
  isOpen: boolean;
  onClose: () => void;
}

// Add these helper functions at the top
const getCharacterPortrait = (
  node: DialogueNode | undefined,
  characters: DialogueTree['characters']
): string | undefined => {
  if (!node?.character) return undefined;
  const character = characters[node.character];
  if (!character?.portraits) return undefined;

  if (node.emotion && character.portraits[node.emotion]) {
    return character.portraits[node.emotion];
  }
  return character.portraits[character.defaultEmotion];
};

const isChoiceAvailable = (
  choice: DialogueChoice,
  gameFlags: Set<string>,
  gameState: Record<string, number>
): boolean => {
  if (!choice.prerequisites) return true;

  const { requiredFlags, blockedFlags, stateConditions } = choice.prerequisites;

  // Check required flags
  if (requiredFlags?.some((flag) => !gameFlags.has(flag))) return false;

  // Check blocked flags
  if (blockedFlags?.some((flag) => gameFlags.has(flag))) return false;

  // Check state conditions
  if (stateConditions?.some((condition) => !checkStateCondition(condition, gameState))) return false;

  return true;
};

const checkStateCondition = (condition: StateCondition, gameState: Record<string, number>): boolean => {
  const value = gameState[condition.key] ?? 0;
  switch (condition.operator) {
    case '=':
      return value === condition.value;
    case '>':
      return value > condition.value;
    case '<':
      return value < condition.value;
    case '>=':
      return value >= condition.value;
    case '<=':
      return value <= condition.value;
    default:
      return false;
  }
};

const getChoiceTooltip = (choice: DialogueChoice, gameFlags: Set<string>): string => {
  if (!choice.prerequisites) return '';
  const { requiredFlags, blockedFlags, stateConditions } = choice.prerequisites;
  const reasons: string[] = [];

  if (requiredFlags?.some((flag) => !gameFlags.has(flag))) {
    reasons.push(`Required flags: ${requiredFlags.join(', ')}`);
  }

  if (blockedFlags?.some((flag) => gameFlags.has(flag))) {
    reasons.push(`Blocked by flags: ${blockedFlags.join(', ')}`);
  }

  if (stateConditions?.length) {
    reasons.push(`State conditions not met`);
  }

  return reasons.join('\n');
};

export const DialoguePreview: React.FC<DialoguePreviewProps> = ({ dialogueTree, isOpen, onClose }) => {
  const [currentNodeId, setCurrentNodeId] = useState(dialogueTree.startNodeId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [gameFlags, setGameFlags] = useState(new Set<string>());
  const [gameState, setGameState] = useState<Record<string, number>>({});
  const [showFlagManager, setShowFlagManager] = useState(false);
  const [failedEmotionUrls, setFailedEmotionUrls] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Collect all state variables and flags from the dialogue tree
  const { allFlags, allStateKeys } = React.useMemo(() => {
    const flags = new Set<string>();
    const stateKeys = new Set<string>();

    Object.values(dialogueTree.nodes).forEach((node) => {
      // Check text variables
      extractVariables(node.text).forEach((v) => stateKeys.add(v));

      // Check alternate texts
      node.alternateTexts?.forEach((alt) => {
        // Check variables in alternate text
        extractVariables(alt.text).forEach((v) => stateKeys.add(v));

        // Check flags in prerequisites
        alt.prerequisites?.requiredFlags?.forEach((flag) => flags.add(flag));
        alt.prerequisites?.blockedFlags?.forEach((flag) => flags.add(flag));

        // Check state conditions
        alt.prerequisites?.stateConditions?.forEach((condition) => {
          stateKeys.add(condition.key);
        });
      });

      node.choices.forEach((choice) => {
        // Check variables in choice text
        extractVariables(choice.text).forEach((v) => stateKeys.add(v));

        // Collect flags from prerequisites
        if (choice.prerequisites) {
          choice.prerequisites.requiredFlags?.forEach((flag) => flags.add(flag));
          choice.prerequisites.blockedFlags?.forEach((flag) => flags.add(flag));
          choice.prerequisites.stateConditions?.forEach((condition) => {
            stateKeys.add(condition.key);
          });
        }

        // Collect flags from flag changes
        if (choice.flagChanges) {
          choice.flagChanges.add?.forEach((flag) => flags.add(flag));
          choice.flagChanges.remove?.forEach((flag) => flags.add(flag));
        }

        // Collect state changes
        choice.stateChanges?.forEach((change) => {
          stateKeys.add(change.key);
        });
      });
    });

    return {
      allFlags: Array.from(flags).sort(),
      allStateKeys: Array.from(stateKeys).sort(),
    };
  }, [dialogueTree]);

  // Initialize state with all state variables
  React.useEffect(() => {
    setGameState((prev) => {
      const next = { ...prev };
      allStateKeys.forEach((key) => {
        if (!(key in next)) {
          // Set default values for known variables
          if (key === 'jonas_weight') {
            next[key] = 450;
          } else {
            next[key] = 0;
          }
        }
      });
      return next;
    });
  }, [allStateKeys]);

  const toggleFlag = (flag: string) => {
    setGameFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flag)) {
        next.delete(flag);
      } else {
        next.add(flag);
      }
      return next;
    });
  };

  const getNodeTextAndEmotion = (node: DialogueNode | undefined) => {
    if (!node) return { text: '' };

    const alternateText = node.alternateTexts?.find((alt) => {
      if (!alt.prerequisites) return false;
      const { requiredFlags, blockedFlags, stateConditions } = alt.prerequisites;

      if (requiredFlags?.some((flag) => !gameFlags.has(flag))) return false;
      if (blockedFlags?.some((flag) => gameFlags.has(flag))) return false;
      if (stateConditions?.some((condition) => !checkStateCondition(condition, gameState))) return false;

      return true;
    });

    if (alternateText) {
      return {
        text: alternateText.text,
        emotion: alternateText.emotion || node.emotion,
      };
    }

    return {
      text: node.text,
      emotion: node.emotion,
    };
  };

  // Update messages when flags or state changes
  React.useEffect(() => {
    if (!currentNodeId) return;

    // Rebuild messages with current state/flags
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.isPlayer) return msg;

        const node = Object.values(dialogueTree.nodes).find(
          (n) => n.speaker === msg.speaker && n.text === msg.originalText
        );
        if (!node) return msg;

        return {
          ...msg,
          text: getNodeTextAndEmotion(node).text,
          originalText: node.text, // Store original text to find the node later
          emotion: node.emotion,
        };
      })
    );
  }, [gameFlags, gameState, currentNodeId, dialogueTree.nodes]);

  // Modify message setting to include originalText
  const resetConversation = React.useCallback(() => {
    const startNode = dialogueTree.nodes[dialogueTree.startNodeId];
    setCurrentNodeId(dialogueTree.startNodeId);
    setMessages([
      {
        text: getNodeTextAndEmotion(startNode).text,
        originalText: startNode.text, // Store original text
        speaker: startNode.speaker,
        emotion: startNode.emotion,
        isPlayer: false,
      },
    ]);
  }, [dialogueTree]);

  // Initialize messages with the first node when preview opens
  React.useEffect(() => {
    if (isOpen) {
      resetConversation();
    }
  }, [isOpen, dialogueTree, resetConversation]);

  const currentNode = dialogueTree?.nodes[currentNodeId];
  const portraitUrl = getCharacterPortrait(currentNode, dialogueTree?.characters || {});

  const handleChoice = (choice: DialogueChoice) => {
    const nextNode = dialogueTree.nodes[choice.nextNodeId];
    if (!nextNode) return;

    // Apply flag changes
    if (choice.flagChanges) {
      setGameFlags((prev) => {
        const next = new Set(prev);
        choice.flagChanges?.add?.forEach((flag) => next.add(flag));
        choice.flagChanges?.remove?.forEach((flag) => next.delete(flag));
        return next;
      });
    }

    // Apply state changes
    if (choice.stateChanges) {
      setGameState((prev) => {
        const next = { ...prev };
        choice.stateChanges?.forEach((change) => {
          const currentValue = next[change.key] ?? 0;
          if (change.operation === 'add') {
            next[change.key] = currentValue + change.value;
          } else if (change.operation === 'subtract') {
            next[change.key] = currentValue - change.value;
          } else {
            next[change.key] = change.value;
          }
        });
        return next;
      });
    }

    // Add messages
    setMessages((prev) => [
      ...prev,
      {
        text: choice.text,
        speaker: 'You',
        isPlayer: true,
      },
      {
        text: getNodeTextAndEmotion(nextNode).text,
        originalText: nextNode.text,
        speaker: nextNode.speaker,
        emotion: nextNode.emotion,
        isPlayer: false,
      },
    ]);

    // Update current node
    setCurrentNodeId(choice.nextNodeId);
  };

  if (!isOpen || !dialogueTree || !currentNode) return null;

  return (
    <div className='modal-overlay'>
      <div className='dialogue-preview-modal'>
        <div className='preview-header'>
          <h3>Dialogue Preview - {currentNode?.speaker}</h3>
          <div className='preview-controls'>
            <button
              onClick={() => setShowFlagManager(!showFlagManager)}
              className='flag-manager-button'
              title='Toggle game flags'
            >
              🚩 Game Flags
            </button>
            <button
              onClick={onClose}
              className='close-button'
            >
              ×
            </button>
          </div>
        </div>
        <div className='preview-content'>
          {showFlagManager && (
            <div className='flag-manager'>
              <div className='flag-manager-header'>
                <h4>Game State</h4>
                <button
                  onClick={() => {
                    setGameFlags(new Set());
                    setGameState(Object.fromEntries([...allStateKeys].map((key) => [key, 0])));
                  }}
                  className='clear-flags-button'
                >
                  Reset All
                </button>
              </div>
              <div className='state-list'>
                {allStateKeys.length > 0 && (
                  <>
                    <div className='state-section-header'>State Values</div>
                    {allStateKeys.map((key) => (
                      <div
                        key={key}
                        className={`state-item ${key === 'jonas_weight' ? 'variable-item' : ''}`}
                      >
                        <span className='state-name'>{key}</span>
                        <input
                          type='number'
                          value={gameState[key] ?? 0}
                          onChange={(e) =>
                            setGameState((prev) => ({
                              ...prev,
                              [key]: Number(e.target.value),
                            }))
                          }
                          className='state-input'
                        />
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className='flag-list'>
                {allFlags.map((flag) => (
                  <label
                    key={flag}
                    className='flag-item'
                  >
                    <input
                      type='checkbox'
                      checked={gameFlags.has(flag)}
                      onChange={() => toggleFlag(flag)}
                    />
                    <span className='flag-name'>{flag}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className='character-portrait-container'>
            <img
              className='character-portrait'
              src={portraitUrl}
              alt={`${currentNode?.speaker || 'Unknown'} - ${currentNode?.emotion || 'default'}`}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const failedUrl = target.src;

                if (!failedEmotionUrls.has(failedUrl)) {
                  setFailedEmotionUrls((prev) => new Set([...prev, failedUrl]));
                  const character = dialogueTree.characters[currentNode.character];
                  if (character?.portraits?.default !== failedUrl) {
                    target.src = character?.portraits?.default;
                  }
                }
              }}
            />
            <div className='character-portrait-info'>
              <div className='character-portrait-name'>{currentNode?.speaker}</div>
              {messages[messages.length - 1]?.emotion && (
                <div className='character-portrait-emotion'>{messages[messages.length - 1].emotion}</div>
              )}
            </div>
          </div>
          <div className='dialogue-container'>
            <div className='messages-container'>
              {messages.map((msg, index) => {
                const processedText = replaceVariables(msg.text, gameState);
                return (
                  <div
                    key={index}
                    className={`message ${msg.isPlayer ? 'player' : 'npc'}`}
                  >
                    <div className='message-speaker'>{msg.speaker}</div>
                    <div className='message-text'>
                      <BBCodeRenderer text={processedText} />
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} /> {/* Scroll anchor */}
            </div>
            <div className='choices-container'>
              {currentNode?.choices?.map((choice) => {
                const isAvailable = isChoiceAvailable(choice, gameFlags, gameState);
                const tooltip = !isAvailable ? getChoiceTooltip(choice, gameFlags) : '';
                const processedText = replaceVariables(choice.text, gameState);

                return (
                  <button
                    key={choice.id}
                    onClick={() => isAvailable && handleChoice(choice)}
                    className={`choice-button ${!isAvailable ? 'locked' : ''}`}
                    disabled={!dialogueTree.nodes[choice.nextNodeId]}
                    title={tooltip}
                  >
                    {!isAvailable && <span className='lock-icon'>🔒</span>}
                    <div className='choice-text'>
                      <BBCodeRenderer text={processedText} />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className='preview-footer'>
              <button
                onClick={resetConversation}
                className='reset-button'
              >
                Reset Conversation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
