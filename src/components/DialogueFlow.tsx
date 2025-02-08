import React, { useCallback, useState, useMemo, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  ConnectionLineType,
  Handle,
  Position,
  OnNodesChange,
  NodeChange,
  applyNodeChanges,
  MarkerType,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DialogueNode, DialogueTree, DialogueChoice } from '../types/DialogueTypes';
import { DialogueNodeEditor } from './DialogueNodeEditor';
import { BBCodeRenderer } from './BBCodeRenderer';
import { Button } from './Button';

interface DialogueNodeData {
  text: string;
  speaker: string;
  emotion?: string;
  choices: Array<DialogueChoice>;
}

interface DialogueFlowProps {
  dialogueTree: DialogueTree;
  onNodeSelect?: (node: DialogueNode) => void;
  onCreateNode?: (nodeId: string) => void;
  onUpdate: (newTree: DialogueTree) => void;
}

type ConnectedNodes = Set<string>;

interface DialogueNodeProps {
  data: DialogueNodeData;
  id: string;
  style?: React.CSSProperties;
  dialogueTree: DialogueTree;
}

const DialogueNodeComponent: React.FC<DialogueNodeProps> = ({ data, id, style, dialogueTree }) => {
  const isBroken = (choice: DialogueChoice) =>
    (!choice.nextNodeId || !dialogueTree.nodes[choice.nextNodeId]) && !choice.exit;

  const getTooltipText = (choice: DialogueChoice) =>
    choice.exit
      ? `Exit: ${choice.exit.status}`
      : isBroken(choice)
      ? 'Missing target node!'
      : !!choice.prerequisites?.requiredFlags?.length || !!choice.prerequisites?.stateConditions?.length
      ? `Required: ${choice.prerequisites?.requiredFlags?.join(', ')}${
          choice.prerequisites?.blockedFlags ? `\nBlocked by: ${choice.prerequisites.blockedFlags.join(', ')}` : ''
        }`
      : choice.prerequisites?.blockedFlags?.length
      ? `Can be blocked by: ${choice.prerequisites?.blockedFlags?.join(', ')}`
      : '';

  return (
    <div
      className='dialogue-node'
      style={style}
    >
      <Handle
        type='target'
        position={Position.Left}
      />
      <div className='dialogue-node-header'>
        <div className='dialogue-node-speaker'>
          {data.speaker}
          {data.emotion && <span className='dialogue-node-emotion'>• {data.emotion}</span>}
        </div>
        <div className='dialogue-node-id'>{id}</div>
      </div>
      <div className='dialogue-node-text'>
        <BBCodeRenderer text={data.text} />
      </div>
      <div className='dialogue-node-choices'>
        <div className='dialogue-node-choices-label'>Player options:</div>
        {data.choices.map((choice, index) => {
          const isLocked =
            !!choice.prerequisites?.requiredFlags?.length || !!choice.prerequisites?.stateConditions?.length;
          const isBlockable = !!choice.prerequisites?.blockedFlags?.length;

          return (
            <div
              key={index}
              className={`dialogue-node-choice ${isLocked ? 'locked' : ''} ${isBlockable ? 'blockable' : ''} ${
                choice.exit ? 'exit' : ''
              } ${isBroken(choice) ? 'broken' : ''}`}
              title={getTooltipText(choice)}
            >
              • {choice.text}
              {isLocked && <span className='lock-icon'>🔒</span>}
              {isBlockable && <span className='block-icon'>⚠️</span>}
              {isBroken(choice) && <span className='broken-icon'>⚡</span>}
              {choice.exit && <span className='exit-icon'>🚪</span>}
            </div>
          );
        })}
      </div>
      <Handle
        type='source'
        position={Position.Right}
      />
    </div>
  );
};

export const DialogueFlow: React.FC<DialogueFlowProps> = ({ dialogueTree, onCreateNode, onUpdate }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const HORIZONTAL_SPACING = 400;
  const VERTICAL_SPACING = 200;
  const NODE_MARGIN = 50; // Extra margin for visual spacing

  const { fitView } = useReactFlow();

  const initializeGraph = useCallback(() => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    const nodePositions = new Map<string, { x: number; y: number }>();
    const nodeHeights = new Map<string, number>();
    const levelNodes = new Map<number, string[]>();

    // First calculate all node heights
    Object.entries(dialogueTree.nodes).forEach(([id, node]) => {
      nodeHeights.set(id, calculateNodeHeight(node));
    });

    // First pass: assign nodes to levels
    const assignLevels = (nodeId: string, level: number, visited: Set<string>) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = dialogueTree.nodes[nodeId];
      if (!node) return;

      if (!levelNodes.has(level)) {
        levelNodes.set(level, []);
      }
      levelNodes.get(level)!.push(nodeId);

      // Process all choices and alternate destinations
      node.choices.forEach((choice) => {
        if (choice.nextNodeId && dialogueTree.nodes[choice.nextNodeId]) {
          assignLevels(choice.nextNodeId, level + 1, visited);
        }
        choice.alternateDestinations?.forEach((altDest) => {
          if (altDest.nextNodeId && dialogueTree.nodes[altDest.nextNodeId]) {
            assignLevels(altDest.nextNodeId, level + 1, visited);
          }
        });
      });
    };

    assignLevels(dialogueTree.startNodeId, 0, new Set());

    // Second pass: calculate positions with better distribution
    levelNodes.forEach((nodes, level) => {
      const levelWidth = nodes.length;
      nodes.forEach((nodeId, index) => {
        const x = level * HORIZONTAL_SPACING;

        // Start with basic vertical centering
        let y = (index - (levelWidth - 1) / 2) * VERTICAL_SPACING;

        // Adjust y position based on actual node heights
        const prevNode = nodePositions.get(nodes[index - 1]);
        if (prevNode) {
          const prevNodeHeight = nodeHeights.get(nodes[index - 1]) || 0;
          const minY = prevNode.y + prevNodeHeight + NODE_MARGIN;
          if (y < minY) {
            y = minY;
          }
        }

        // If this is not the first node in a level, ensure minimum spacing
        if (index > 0) {
          const prevNodeY = nodePositions.get(nodes[index - 1])?.y || 0;
          const prevNodeHeight = nodeHeights.get(nodes[index - 1]) || 0;
          const minSpacing = prevNodeHeight + NODE_MARGIN;
          if (y - prevNodeY < minSpacing) {
            y = prevNodeY + minSpacing;
          }
        }

        nodePositions.set(nodeId, { x, y });
      });

      // Center the level vertically
      const levelYPositions = nodes.map((id) => {
        const pos = nodePositions.get(id);
        const height = nodeHeights.get(id) || 0;
        return { y: pos?.y || 0, height };
      });

      const levelTop = Math.min(...levelYPositions.map((p) => p.y));
      const levelBottom = Math.max(...levelYPositions.map((p) => p.y + p.height));
      const levelHeight = levelBottom - levelTop;
      const offset = -levelHeight / 2;

      // Center the entire level vertically
      nodes.forEach((nodeId) => {
        const pos = nodePositions.get(nodeId);
        if (pos) {
          nodePositions.set(nodeId, {
            x: pos.x,
            y: pos.y + offset,
          });
        }
      });
    });

    // Create nodes with calculated positions
    Object.entries(dialogueTree.nodes).forEach(([id, node]) => {
      const position = nodePositions.get(id) || { x: 0, y: 0 };

      newNodes.push({
        id,
        type: 'dialogueNode',
        position,
        data: {
          text: node.text,
          speaker: node.speaker,
          emotion: node.emotion,
          choices: node.choices.map((choice) => ({
            ...choice,
            prerequisites: choice.prerequisites,
            exit: choice.exit,
          })),
        },
        style: {
          width: 250,
        },
        draggable: true,
      });

      // Create edges for each choice
      node.choices.forEach((choice, index) => {
        const isLocked =
          choice.prerequisites?.requiredFlags?.length ||
          choice.prerequisites?.blockedFlags?.length ||
          choice.prerequisites?.stateConditions?.length;

        // Common edge styles
        const baseEdgeStyle = {
          type: 'smoothstep' as const,
          sourceHandle: Position.Right,
          targetHandle: Position.Left,
          labelStyle: {
            fill: 'var(--color-text)',
            fontWeight: 500,
          },
          labelBgStyle: {
            fill: 'var(--color-background-tertiary)',
            stroke: 'var(--color-border)',
            strokeWidth: 1,
            color: 'white',
            rx: 4,
            ry: 4,
          },
          labelBgPadding: [4, 4] as [number, number],
          labelBgBorderRadius: 4,
        };

        // If there are alternate destinations, create those edges
        if (choice.alternateDestinations?.length) {
          choice.alternateDestinations.forEach((altDest, altIndex) => {
            newEdges.push({
              ...baseEdgeStyle,
              id: `${id}-${altDest.nextNodeId}-alt-${altIndex}`,
              source: id,
              target: altDest.nextNodeId,
              label: choice.text,
              animated: true, // Always animated for alternate paths
              style: {
                strokeWidth: 2,
                stroke: isLocked ? 'var(--color-text-tertiary)' : 'var(--color-border)',
                strokeDasharray: isLocked ? '5 5' : undefined,
              },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 20,
                height: 20,
                color: isLocked ? 'var(--color-text-tertiary)' : 'var(--color-primary)',
              },
            });
          });
        } else {
          // Create normal edge
          newEdges.push({
            ...baseEdgeStyle,
            id: `${id}-${choice.nextNodeId}-${index}`,
            source: id,
            target: choice.nextNodeId,
            label: choice.text,
            style: {
              strokeWidth: 2,
              stroke: isLocked ? 'var(--color-text-tertiary)' : 'var(--color-border)',
              strokeDasharray: isLocked ? '5 5' : undefined,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: isLocked ? 'var(--color-text-tertiary)' : 'var(--color-border)',
            },
          });
        }
      });
    });

    // Move createExitNodes inside here
    const createExitNodes = (nodes: DialogueNode[]) => {
      const exitNodes: Node[] = [];
      const exitEdges: Edge[] = [];

      // Find the rightmost x position of all nodes
      const rightmostX = Math.max(
        ...nodes.map((node) => {
          const position = nodePositions.get(node.id);
          return position ? position.x : 0;
        })
      );

      // Place exit nodes to the right with vertical spacing
      let currentY = 0;
      const EXIT_SPACING = 150;
      const EXIT_X_OFFSET = 400;

      nodes.forEach((node) => {
        node.choices.forEach((choice) => {
          if (choice.exit) {
            const exitNodeId = `exit_${choice.exit.status}`;

            if (!exitNodes.find((n) => n.id === exitNodeId)) {
              exitNodes.push({
                id: exitNodeId,
                type: 'exit',
                data: { label: `Exit: ${choice.exit.status}` },
                position: {
                  x: rightmostX + EXIT_X_OFFSET,
                  y: currentY,
                },
                style: {
                  background: 'var(--color-error-light)',
                  border: '2px solid var(--color-error)',
                  borderRadius: '8px',
                  padding: '10px',
                },
              });
              currentY += EXIT_SPACING;
            }

            exitEdges.push({
              id: `${node.id}-${exitNodeId}`,
              source: node.id,
              target: exitNodeId,
              label: choice.text,
              type: 'exit',
              style: {
                stroke: '#ff6666',
              },
            });
          }
        });
      });

      return { exitNodes, exitEdges };
    };

    // Add exit nodes and edges
    const { exitNodes, exitEdges } = createExitNodes(Object.values(dialogueTree.nodes));

    setNodes([...newNodes, ...exitNodes]);
    setEdges([...newEdges, ...exitEdges]);
  }, [dialogueTree]);

  // Initialize on mount or when dialogueTree changes
  React.useEffect(() => {
    initializeGraph();
  }, [dialogueTree, initializeGraph]);

  // Handle node position changes
  const onNodesChange: OnNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const handleNodeDoubleClick = useCallback((_: unknown, node: unknown) => {
    if (node && typeof node === 'object' && 'id' in node && typeof node.id === 'string') {
      setEditingNodeId(node.id);
      setSelectedNodeId(node.id);
    }
  }, []);

  const handleNodeSave = useCallback(
    (updatedNode: DialogueNode) => {
      if (!dialogueTree) return;

      // Update the tree with the new node
      const newTree = {
        ...dialogueTree,
        nodes: {
          ...dialogueTree.nodes,
          [updatedNode.id]: updatedNode,
        },
      };

      onUpdate(newTree);
      setEditingNodeId(null);
    },
    [dialogueTree, onUpdate]
  );

  const handleCreateNode = useCallback(
    (nodeId: string) => {
      if (editingNodeId) {
        onCreateNode?.(nodeId);
      }
    },
    [editingNodeId, onCreateNode]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node && typeof node.id === 'string') {
      setSelectedNodeId(node.id);
    }
  }, []);

  const onNodeDragStart = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node && typeof node.id === 'string') {
      setSelectedNodeId(node.id);
    }
  }, []);

  useEffect(() => {
    if (!editingNodeId) {
      setSelectedNodeId(null);
    }
  }, [editingNodeId]);

  const getConnectedNodes = (
    nodeId: string,
    edges: Edge[],
    direction: 'incoming' | 'outgoing' | 'both' = 'both'
  ): ConnectedNodes => {
    const connected = new Set<string>();
    connected.add(nodeId);

    edges.forEach((edge) => {
      if (direction === 'outgoing' || direction === 'both') {
        if (edge.source === nodeId) {
          connected.add(edge.target);
        }
      }
      if (direction === 'incoming' || direction === 'both') {
        if (edge.target === nodeId) {
          connected.add(edge.source);
        }
      }
    });

    return connected;
  };

  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) return null;
    return getConnectedNodes(selectedNodeId, edges);
  }, [selectedNodeId, edges]);

  const nodesWithOpacity = useMemo(() => {
    if (!connectedNodes) return nodes;

    return nodes.map((node) => ({
      ...node,
      style: {
        ...node.style,
        opacity: connectedNodes.has(node.id) ? 1 : 0.2,
        transition: 'opacity 0.3s ease-in-out',
      },
      className: connectedNodes.has(node.id) ? 'connected-node' : 'unconnected-node',
    }));
  }, [nodes, connectedNodes]);

  const edgesWithOpacity = useMemo(() => {
    if (!connectedNodes) return edges;

    return edges.map((edge) => ({
      ...edge,
      style: {
        ...edge.style,
        opacity: connectedNodes.has(edge.source) && connectedNodes.has(edge.target) ? 1 : 0.2,
        transition: 'opacity 0.3s ease-in-out',
      },
      className:
        connectedNodes.has(edge.source) && connectedNodes.has(edge.target) ? 'connected-edge' : 'unconnected-edge',
    }));
  }, [edges, connectedNodes]);

  // Add a new handler for pane clicks
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const arrangeNodes = useCallback(() => {
    if (!dialogueTree) return;

    const HORIZONTAL_SPACING = 300;
    const VERTICAL_SPACING = 150;
    const START_X = 50; // Initial x offset
    const START_Y = 100; // Initial y offset

    // Build a map of node depths (distance from start node)
    const nodeDepths = new Map<string, number>();
    const visited = new Set<string>();

    const calculateDepth = (nodeId: string, depth: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      nodeDepths.set(nodeId, Math.max(nodeDepths.get(nodeId) || 0, depth));

      const node = dialogueTree.nodes[nodeId];
      if (!node) return;

      node.choices.forEach((choice) => {
        if (choice.nextNodeId) {
          calculateDepth(choice.nextNodeId, depth + 1);
        }
        choice.alternateDestinations?.forEach((alt) => {
          if (alt.nextNodeId) {
            calculateDepth(alt.nextNodeId, depth + 1);
          }
        });
      });
    };

    // Start from the root node
    calculateDepth(dialogueTree.startNodeId, 0);

    // Group nodes by depth
    const nodesByDepth = new Map<number, string[]>();
    nodeDepths.forEach((depth, nodeId) => {
      if (!nodesByDepth.has(depth)) {
        nodesByDepth.set(depth, []);
      }
      nodesByDepth.get(depth)?.push(nodeId);
    });

    // Position nodes
    const newNodes = [...nodes];
    nodesByDepth.forEach((nodesAtDepth, depth) => {
      const totalHeight = (nodesAtDepth.length - 1) * VERTICAL_SPACING;

      nodesAtDepth.forEach((nodeId, index) => {
        const node = newNodes.find((n) => n.id === nodeId);
        if (node) {
          node.position = {
            x: START_X + depth * HORIZONTAL_SPACING,
            y: START_Y + index * VERTICAL_SPACING - totalHeight / 2,
          };
        }
      });
    });

    // Position exit nodes to the right of the deepest nodes
    const maxDepth = Math.max(...nodesByDepth.keys(), 0);
    const exitNodes = newNodes.filter((node) => node.type === 'exit');
    const totalExitHeight = (exitNodes.length - 1) * VERTICAL_SPACING;

    exitNodes.forEach((node, index) => {
      node.position = {
        x: START_X + (maxDepth + 1) * HORIZONTAL_SPACING,
        y: START_Y + index * VERTICAL_SPACING - totalExitHeight / 2,
      };
    });

    setNodes(newNodes);

    // Center the view after arranging
    setTimeout(() => {
      fitView({ padding: 0.2 });
    }, 100);
  }, [dialogueTree, fitView]);

  const nodeTypes = useMemo(
    () => ({
      dialogueNode: (props: any) => (
        <DialogueNodeComponent
          {...props}
          dialogueTree={dialogueTree}
        />
      ),
    }),
    [dialogueTree]
  );

  const calculateNodeHeight = (node: DialogueNode): number => {
    const BASE_HEIGHT = 80; // Base height for padding and speaker
    const TEXT_LINE_HEIGHT = 20;
    const CHOICE_HEIGHT = 30;
    const CHOICES_PADDING = 20;

    // Calculate text height (rough estimate based on character count and width)
    const CHARS_PER_LINE = 35; // Approximate characters per line
    const textLines = Math.ceil(node.text.length / CHARS_PER_LINE);
    const textHeight = textLines * TEXT_LINE_HEIGHT;

    // Calculate choices height
    const choicesHeight = node.choices.length * CHOICE_HEIGHT;

    // Only add choices padding if there are choices
    const totalChoicesHeight = node.choices.length > 0 ? choicesHeight + CHOICES_PADDING : 0;

    return BASE_HEIGHT + textHeight + totalChoicesHeight;
  };

  return (
    <>
      <div style={{ height: 'calc(100vh - 160px)', width: '100%', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1 }}>
          <Button onClick={arrangeNodes}>Arrange Nodes</Button>
        </div>
        <ReactFlow
          nodes={nodesWithOpacity}
          edges={edgesWithOpacity}
          nodeTypes={nodeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          onNodesChange={onNodesChange}
          onNodeDoubleClick={handleNodeDoubleClick}
          onNodeClick={onNodeClick}
          onNodeDragStart={onNodeDragStart}
          onPaneClick={onPaneClick}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {editingNodeId && (
        <DialogueNodeEditor
          node={dialogueTree.nodes[editingNodeId]}
          dialogueTree={dialogueTree}
          isOpen={true}
          onClose={() => setEditingNodeId(null)}
          onSave={handleNodeSave}
          availableNodes={Object.keys(dialogueTree.nodes)}
          onCreateNode={handleCreateNode}
        />
      )}
    </>
  );
};
