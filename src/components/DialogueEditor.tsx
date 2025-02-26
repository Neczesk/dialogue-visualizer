import React, { useState, useEffect } from 'react';
import { DialogueNode, DialogueTree } from '../types/DialogueTypes';
import { getDialogueFiles, DialogueFile } from '../utils/dialogueLoader';

import { DialogueFlow } from './DialogueFlow';
import { DialoguePreview } from './DialoguePreview';
import { DialogueNodeEditor } from './DialogueNodeEditor';
import { downloadAsGodotResource, downloadDialogueTreeScript } from '../utils/godotExporter';
import { CharacterManager } from './CharacterManager';
import { ReactFlowProvider } from 'reactflow';

const STORAGE_KEY = 'dialogue_tree_data';
const DEFAULT_PORTRAIT = import.meta.env.BASE_URL + 'characters/default/default.webp';

export const DialogueEditor: React.FC = () => {
  const [dialogueTree, setDialogueTree] = useState<DialogueTree | null>(null);
  const [selectedNode, setSelectedNode] = useState<DialogueNode | null>(null);
  const [isNodeEditorOpen, setIsNodeEditorOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isEditingPicture, setIsEditingPicture] = useState(false);
  const [pictureUrl, setPictureUrl] = useState('');
  const [templates] = useState<DialogueFile[]>(getDialogueFiles());
  const [selectedTemplatePath, setSelectedTemplatePath] = useState<string>(templates[0]?.path || '');
  const [isCharacterManagerOpen, setIsCharacterManagerOpen] = useState(false);

  // Load saved data on mount
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        setDialogueTree(JSON.parse(savedData));
      } catch (e) {
        console.error('Error loading saved data:', e);
        loadSelectedTemplate(); // Only load template if save fails
      }
    } else {
      loadSelectedTemplate(); // Only load template if no save exists
    }
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (dialogueTree) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dialogueTree));
    }
  }, [dialogueTree]);

  const saveDialogueTree = async () => {
    if (!dialogueTree) return;

    const content = JSON.stringify(dialogueTree, null, 2);
    const fileName = `${dialogueTree.name}.json`;

    try {
      if (!('showSaveFilePicker' in window)) {
        throw new Error('File system API not supported');
      } else {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: 'JSON File',
              accept: {
                'application/json': ['.json'],
              },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      }
    } catch (err) {
      if (err && typeof err === 'object' && 'name' in err && err.name !== 'AbortError') {
        console.error('Error saving file:', err);
        // Fallback to old download method
        const element = document.createElement('a');
        const file = new Blob([content], { type: 'application/json' });
        element.href = URL.createObjectURL(file);
        element.download = fileName;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
      }
    }
  };

  const handleFileLoad = async (file: File) => {
    if (!file) return;

    if (window.confirm('Loading a file will discard any unsaved changes. Continue?')) {
      try {
        const content = await file.text();

        // Determine file type by extension
        if (file.name.endsWith('.tres')) {
          console.log('Not yet implemented');
        } else {
          // Existing JSON handling
          const loadedTree = JSON.parse(content);
          setDialogueTree(loadedTree);
        }

        setSelectedNode(null);
        localStorage.removeItem(STORAGE_KEY); // Clear saved data when loading file
      } catch (error) {
        console.error('Error loading file:', error);
        // Add error handling UI feedback here
      }
    }
  };

  const handlePictureEdit = () => {
    if (!dialogueTree) return;

    // Ensure default character exists
    if (!dialogueTree.characters.default) {
      setDialogueTree({
        ...dialogueTree,
        characters: {
          ...dialogueTree.characters,
          default: {
            name: 'Default',
            defaultEmotion: 'default',
            portraits: {
              default: DEFAULT_PORTRAIT,
            },
          },
        },
      });
      return;
    }

    if (isEditingPicture) {
      setDialogueTree({
        ...dialogueTree,
        characters: {
          ...dialogueTree.characters,
          default: {
            ...dialogueTree.characters.default,
            portraits: {
              ...dialogueTree.characters.default.portraits,
              default: pictureUrl,
            },
          },
        },
      });
      setIsEditingPicture(false);
    } else {
      // Safe access with optional chaining and fallback
      setPictureUrl(dialogueTree?.characters?.default?.portraits?.default || DEFAULT_PORTRAIT);
      setIsEditingPicture(true);
    }
  };

  const handleNodeSelect = (node: DialogueNode) => {
    setSelectedNode(node);
    setIsNodeEditorOpen(true);
  };

  const handleNodeSave = (updatedNode: DialogueNode) => {
    console.log('DialogueEditor handleNodeSave called');
    console.log('DialogueEditor handleNodeSave - before:', dialogueTree?.nodes[updatedNode.id]);
    console.log('DialogueEditor handleNodeSave - update:', updatedNode);

    if (!dialogueTree) return;

    // Create a completely new tree to ensure state update
    const newTree = {
      ...dialogueTree,
      nodes: {
        ...dialogueTree.nodes,
        [updatedNode.id]: {
          ...updatedNode, // Ensure we spread the updated node
        },
      },
    };

    console.log('DialogueEditor handleNodeSave - after:', newTree.nodes[updatedNode.id]);

    // Force a new reference to trigger state update
    setDialogueTree(newTree);
    setSelectedNode(null);
    setIsNodeEditorOpen(false);
  };

  const handleCreateNode = (id: string) => {
    if (!dialogueTree) return;

    const newNode: DialogueNode = {
      id,
      character: Object.keys(dialogueTree.characters)[0],
      speaker: dialogueTree.characters[Object.keys(dialogueTree.characters)[0]].name,
      text: 'New dialogue node',
      choices: [
        {
          id: `choice_${Date.now()}`,
          text: 'Continue',
          nextNodeId: '',
        },
      ],
    };

    setDialogueTree((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        nodes: {
          ...prev.nodes,
          [id]: newNode,
        },
      };
    });
  };

  const loadSelectedTemplate = async () => {
    try {
      const template = templates.find((t) => t.path === selectedTemplatePath);
      if (template) {
        const response = await fetch(template.path);
        const data = await response.json();
        // Add default character if none exists
        if (!data.characters) {
          data.characters = {
            default: {
              name: 'Default',
              defaultEmotion: 'default',
              portraits: {
                default: DEFAULT_PORTRAIT,
              },
            },
          };
        }
        setDialogueTree(data);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      // Set a minimal valid tree on error
      setDialogueTree({
        name: 'New Dialogue',
        characters: {
          default: {
            name: 'Default',
            defaultEmotion: 'default',
            portraits: {
              default: DEFAULT_PORTRAIT,
            },
          },
        },
        startNodeId: 'start',
        nodes: {},
      });
    }
  };

  if (!dialogueTree) return <div>Loading...</div>;

  return (
    <div className='dialogue-editor'>
      <ReactFlowProvider>
        <div className='editor-header'>
          <div className='editor-controls'>
            <select
              value={selectedTemplatePath}
              onChange={(e) => setSelectedTemplatePath(e.target.value)}
              className='template-select'
            >
              {templates.map((file) => (
                <option
                  key={file.path}
                  value={file.path}
                >
                  {file.name}
                </option>
              ))}
            </select>
            <button
              onClick={loadSelectedTemplate}
              className='template-button'
            >
              New from Template
            </button>
            <div className='editor-controls-divider' />
            <div className='picture-edit-container'>
              {isEditingPicture ? (
                <input
                  type='text'
                  value={pictureUrl}
                  onChange={(e) => setPictureUrl(e.target.value)}
                  placeholder='Character picture URL...'
                  className='picture-url-input'
                />
              ) : (
                <span className='current-picture'>
                  {dialogueTree?.characters?.default?.portraits?.default || 'No picture set'}
                </span>
              )}
              <button
                onClick={handlePictureEdit}
                className='picture-edit-button'
              >
                {isEditingPicture ? 'Save' : 'Edit Picture'}
              </button>
            </div>
            <div className='editor-controls-divider' />
            <button
              onClick={saveDialogueTree}
              className='save-button'
            >
              Save
            </button>
            <input
              type='file'
              accept='.json,.tres'
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileLoad(file);
                // Reset the input so the same file can be loaded again
                e.target.value = '';
              }}
              style={{ display: 'none' }}
              id='load-file'
            />
            <label
              htmlFor='load-file'
              className='load-button'
            >
              Load
            </label>
            <button
              onClick={() => setIsPreviewOpen(true)}
              className='preview-button'
            >
              Preview
            </button>
            <button
              onClick={() => downloadAsGodotResource(dialogueTree)}
              className='export-button'
            >
              Export Resource
            </button>
            <button
              onClick={downloadDialogueTreeScript}
              className='export-button'
            >
              Export Script
            </button>
            <button
              onClick={() => setIsCharacterManagerOpen(true)}
              className='character-manager-button'
            >
              👥 Characters
            </button>
          </div>
        </div>

        <div className='editor-content'>
          <DialogueFlow
            dialogueTree={dialogueTree}
            onNodeSelect={handleNodeSelect}
            onCreateNode={handleCreateNode}
            onUpdate={(newTree) => {
              console.log('DialogueEditor onUpdate called with:', newTree);
              setDialogueTree(newTree);
            }}
          />
        </div>

        {selectedNode && (
          <DialogueNodeEditor
            node={selectedNode}
            dialogueTree={dialogueTree}
            isOpen={isNodeEditorOpen}
            onClose={() => setIsNodeEditorOpen(false)}
            onSave={handleNodeSave}
            availableNodes={Object.keys(dialogueTree.nodes)}
            onCreateNode={handleCreateNode}
          />
        )}

        <DialoguePreview
          dialogueTree={dialogueTree}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
        />

        <CharacterManager
          dialogueTree={dialogueTree}
          isOpen={isCharacterManagerOpen}
          onClose={() => setIsCharacterManagerOpen(false)}
          onUpdate={setDialogueTree}
        />
      </ReactFlowProvider>
    </div>
  );
};
