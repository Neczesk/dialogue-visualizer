import React, { useState, useRef, useEffect, useMemo } from 'react';
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

export const DialoguePreview: React.FC<DialoguePreviewProps> = ({ dialogueTree, isOpen, onClose }) => {
  const [currentNodeId, setCurrentNodeId] = useState(dialogueTree.startNodeId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [gameFlags, setGameFlags] = useState(new Set<string>());
  const [gameState, setGameState] = useState<Record<string, number>>(() => ({
    gold: 100,
    jonas_weight: 450,
  }));
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

  // Add this near the top of the component to debug
  console.log('Game State:', gameState);

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

  const currentNode = dialogueTree.nodes[currentNodeId];

  const checkStateCondition = (condition: StateCondition): boolean => {
    const currentValue = gameState[condition.key] ?? 0;
    switch (condition.operator) {
      case '=':
        return currentValue === condition.value;
      case '>':
        return currentValue > condition.value;
      case '<':
        return currentValue < condition.value;
      case '>=':
        return currentValue >= condition.value;
      case '<=':
        return currentValue <= condition.value;
      default:
        return false;
    }
  };

  const isChoiceAvailable = (choice: DialogueChoice | undefined) => {
    if (!choice?.prerequisites) return true;

    const { requiredFlags = [], blockedFlags = [], stateConditions = [] } = choice.prerequisites;

    return (
      requiredFlags.every((flag) => gameFlags.has(flag)) &&
      !blockedFlags.some((flag) => gameFlags.has(flag)) &&
      stateConditions.every(checkStateCondition)
    );
  };

  const handleChoice = (choice: DialogueChoice) => {
    // Add player's choice to messages first
    setMessages((prev) => [...prev, { text: choice.text, speaker: 'Player', isPlayer: true }]);

    // Handle flag changes
    if (choice.flagChanges) {
      if (choice.flagChanges.add) {
        setGameFlags((prev) => {
          const next = new Set(prev);
          choice.flagChanges?.add?.forEach((flag) => next.add(flag));
          return next;
        });
      }
      if (choice.flagChanges.remove) {
        setGameFlags((prev) => {
          const next = new Set(prev);
          choice.flagChanges?.remove?.forEach((flag) => next.delete(flag));
          return next;
        });
      }
    }

    // Handle state changes
    if (choice.stateChanges) {
      setGameState((prev) => {
        const next = { ...prev };
        choice.stateChanges?.forEach((change) => {
          next[change.key] = (next[change.key] || 0) + change.value;
        });
        return next;
      });
    }

    // Find the first matching alternate destination
    const alternateDestination = choice.alternateDestinations?.find((dest) => {
      const { requiredFlags = [], blockedFlags = [], stateConditions = [] } = dest.prerequisites;

      const flagsMatch =
        requiredFlags.every((flag) => gameFlags.has(flag)) && !blockedFlags.some((flag) => gameFlags.has(flag));

      const stateConditionsMatch = stateConditions.every((condition) => {
        const currentValue = gameState[condition.key] || 0;
        switch (condition.operator) {
          case '=':
            return currentValue === condition.value;
          case '>':
            return currentValue > condition.value;
          case '<':
            return currentValue < condition.value;
          case '>=':
            return currentValue >= condition.value;
          case '<=':
            return currentValue <= condition.value;
          default:
            return false;
        }
      });

      return flagsMatch && stateConditionsMatch;
    });

    // Use alternate destination if conditions match, otherwise use default
    const nextNodeId = alternateDestination?.nextNodeId || choice.nextNodeId;
    const nextNode = dialogueTree.nodes[nextNodeId];

    if (nextNode) {
      const { text, emotion } = getNodeTextAndEmotion(nextNode);

      setMessages((prev) => [
        ...prev,
        {
          text,
          originalText: nextNode.text,
          speaker: nextNode.speaker,
          emotion,
          isPlayer: false,
        },
      ]);

      setCurrentNodeId(nextNodeId);
    }
  };

  const getChoiceTooltip = (choice: DialogueChoice): string => {
    const conditions: string[] = [];

    if (choice.prerequisites) {
      if (choice.prerequisites.requiredFlags?.length) {
        const missing = choice.prerequisites.requiredFlags.filter((flag) => !gameFlags.has(flag));
        if (missing.length) {
          conditions.push(`Missing flags: ${missing.join(', ')}`);
        }
      }

      if (choice.prerequisites.blockedFlags?.length) {
        const blocking = choice.prerequisites.blockedFlags.filter((flag) => gameFlags.has(flag));
        if (blocking.length) {
          conditions.push(`Blocked by flags: ${blocking.join(', ')}`);
        }
      }

      if (choice.prerequisites.stateConditions?.length) {
        const failedConditions = choice.prerequisites.stateConditions.filter(
          (condition) => !checkStateCondition(condition)
        );
        if (failedConditions.length) {
          conditions.push(
            'Required states:\n' +
              failedConditions
                .map((condition) => `${condition.key} ${condition.operator} ${condition.value}`)
                .join('\n')
          );
        }
      }
    }

    return conditions.join('\n');
  };

  const getNodeTextAndEmotion = (node: DialogueNode): { text: string; emotion?: string } => {
    if (!node.alternateTexts?.length) {
      return {
        text: replaceVariables(node.text, gameState),
        emotion: node.emotion,
      };
    }

    // Find the first matching alternate text
    const matchingAlternate = node.alternateTexts.find((alt) => {
      if (!alt.prerequisites) return false;

      const { requiredFlags = [], blockedFlags = [], stateConditions = [] } = alt.prerequisites;

      const flagsMatch =
        requiredFlags.every((flag) => gameFlags.has(flag)) && !blockedFlags.some((flag) => gameFlags.has(flag));

      const stateConditionsMatch = stateConditions.every((condition) => {
        const currentValue = gameState[condition.key] || 0;
        switch (condition.operator) {
          case '=':
            return currentValue === condition.value;
          case '>':
            return currentValue > condition.value;
          case '<':
            return currentValue < condition.value;
          case '>=':
            return currentValue >= condition.value;
          case '<=':
            return currentValue <= condition.value;
          default:
            return false;
        }
      });

      return flagsMatch && stateConditionsMatch;
    });

    return {
      text: replaceVariables(matchingAlternate?.text || node.text, gameState),
      emotion: matchingAlternate?.emotion || node.emotion,
    };
  };

  // Update the getPortraitUrl function with better null checks
  const getPortraitUrl = (node: DialogueNode, message: Message | null): string => {
    if (!dialogueTree.emotions) return dialogueTree.characterPicture;

    const emotionToUse = message?.emotion || node?.emotion;

    if (
      emotionToUse &&
      dialogueTree.emotions[emotionToUse] &&
      !failedEmotionUrls.has(dialogueTree.emotions[emotionToUse])
    ) {
      return dialogueTree.emotions[emotionToUse];
    }
    return dialogueTree.emotions.default || dialogueTree.characterPicture;
  };

  // Update the portrait URL memo with null checks
  const portraitUrl = useMemo(() => {
    if (!currentNode || !messages.length) return dialogueTree.characterPicture;

    const currentMessage = messages[messages.length - 1];
    return getPortraitUrl(currentNode, currentMessage);
  }, [currentNode, messages, dialogueTree, failedEmotionUrls]);

  if (!isOpen) return null;

  return (
    <div className='modal-overlay'>
      <div className='dialogue-preview-modal'>
        <div className='preview-header'>
          <h3>Dialogue Preview - {dialogueTree.characterName}</h3>
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
              alt={dialogueTree.characterName}
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const failedUrl = target.src;

                // Only update if we haven't already marked this URL as failed
                if (!failedEmotionUrls.has(failedUrl)) {
                  setFailedEmotionUrls((prev) => new Set([...prev, failedUrl]));

                  // Set the fallback URL directly
                  const fallbackUrl = dialogueTree.emotions.default || dialogueTree.characterPicture;
                  if (fallbackUrl !== failedUrl) {
                    target.src = fallbackUrl;
                  }
                }
              }}
            />
            <div className='character-portrait-info'>
              <div className='character-portrait-name'>{dialogueTree.characterName}</div>
              {messages[messages.length - 1]?.emotion && dialogueTree.emotions && (
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
                const isAvailable = isChoiceAvailable(choice);
                const tooltip = !isAvailable ? getChoiceTooltip(choice) : '';
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
