import React, { useState, useEffect } from 'react';
import { Character, DialogueTree } from '../types/DialogueTypes';
import '../styles/character-manager.css';

interface CharacterManagerProps {
  dialogueTree: DialogueTree;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (newTree: DialogueTree) => void;
}

export const CharacterManager: React.FC<CharacterManagerProps> = ({ dialogueTree, isOpen, onClose, onUpdate }) => {
  const [editedCharacters, setEditedCharacters] = useState(dialogueTree.characters);
  const [newPortraitEmotion, setNewPortraitEmotion] = useState('');
  const [newPortraitUrl, setNewPortraitUrl] = useState('');

  // Reset edited characters when dialog opens
  useEffect(() => {
    if (isOpen) {
      setEditedCharacters(dialogueTree.characters);
    }
  }, [isOpen, dialogueTree.characters]);

  const addCharacter = () => {
    const id = `character_${Date.now()}`;
    setEditedCharacters((prev) => ({
      ...prev,
      [id]: {
        name: 'New Character',
        defaultEmotion: 'default',
        portraits: {
          default: '/characters/default/default.png',
        },
      },
    }));
  };

  const updateCharacter = (id: string, updates: Partial<Character>) => {
    setEditedCharacters((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...updates,
      },
    }));
  };

  const addPortrait = (characterId: string) => {
    if (!newPortraitEmotion || !newPortraitUrl) return;

    setEditedCharacters((prev) => ({
      ...prev,
      [characterId]: {
        ...prev[characterId],
        portraits: {
          ...prev[characterId].portraits,
          [newPortraitEmotion]: newPortraitUrl,
        },
      },
    }));
    setNewPortraitEmotion('');
    setNewPortraitUrl('');
  };

  const deleteCharacter = (id: string) => {
    setEditedCharacters((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleSave = () => {
    onUpdate({
      ...dialogueTree,
      characters: editedCharacters,
    });
    onClose();
  };

  const handleCancel = () => {
    setEditedCharacters(dialogueTree.characters);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className='modal-overlay'>
      <div className='character-manager-modal'>
        <div className='character-manager-header'>
          <h3>Character Manager</h3>
          <button
            onClick={handleCancel}
            className='close-button'
          >
            ×
          </button>
        </div>
        <div className='character-manager-content'>
          <button
            onClick={addCharacter}
            className='add-character-button'
          >
            Add Character
          </button>
          <div className='character-list'>
            {Object.entries(editedCharacters).map(([id, character]) => (
              <div
                key={id}
                className='character-item'
              >
                <div className='character-header'>
                  <input
                    type='text'
                    value={character.name}
                    onChange={(e) => updateCharacter(id, { name: e.target.value })}
                    className='character-name-input'
                  />
                  <select
                    value={character.defaultEmotion}
                    onChange={(e) => updateCharacter(id, { defaultEmotion: e.target.value })}
                    className='default-emotion-select'
                  >
                    {Object.keys(character.portraits).map((emotion) => (
                      <option
                        key={emotion}
                        value={emotion}
                      >
                        {emotion}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => deleteCharacter(id)}
                    className='delete-character-button'
                    title='Delete Character'
                  >
                    🗑️
                  </button>
                </div>
                <div className='portrait-list'>
                  {Object.entries(character.portraits).map(([emotion, url]) => (
                    <div
                      key={emotion}
                      className='portrait-item'
                    >
                      <span className='portrait-emotion'>{emotion}</span>
                      <input
                        type='text'
                        value={url}
                        onChange={(e) =>
                          updateCharacter(id, {
                            portraits: { ...character.portraits, [emotion]: e.target.value },
                          })
                        }
                        className='portrait-url-input'
                      />
                    </div>
                  ))}
                  <div className='add-portrait'>
                    <input
                      type='text'
                      value={newPortraitEmotion}
                      onChange={(e) => setNewPortraitEmotion(e.target.value)}
                      placeholder='Emotion name...'
                      className='new-emotion-input'
                    />
                    <input
                      type='text'
                      value={newPortraitUrl}
                      onChange={(e) => setNewPortraitUrl(e.target.value)}
                      placeholder='Portrait URL...'
                      className='new-url-input'
                    />
                    <button
                      onClick={() => addPortrait(id)}
                      className='add-portrait-button'
                    >
                      Add Portrait
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className='character-manager-footer'>
          <button
            onClick={handleCancel}
            className='cancel-button'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className='save-button'
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
