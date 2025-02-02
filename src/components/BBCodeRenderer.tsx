import React from 'react';

interface BBCodeRendererProps {
  text: string;
}

export const BBCodeRenderer: React.FC<BBCodeRendererProps> = ({ text }) => {
  const renderBBCode = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentText = '';
    let currentIndex = 0;

    // Regular expression to match BBCode tags
    const bbCodeRegex = /\[(\/?)(b|i|s|color=([^\]]+))\]/g;
    let match;

    while ((match = bbCodeRegex.exec(text)) !== null) {
      // Add any text before the tag
      const beforeTag = text.slice(currentIndex, match.index);
      if (beforeTag) {
        currentText += beforeTag;
      }

      const [fullMatch, isClosing, tag, colorValue] = match;

      if (isClosing) {
        // If we have accumulated text, add it with current styling
        if (currentText) {
          parts.push(<span key={parts.length}>{currentText}</span>);
          currentText = '';
        }
      } else {
        // Handle opening tags
        if (currentText) {
          parts.push(<span key={parts.length}>{currentText}</span>);
          currentText = '';
        }

        // Start new styled section
        if (tag.startsWith('color=')) {
          const color = colorValue;
          const endIndex = text.indexOf('[/color]', match.index);
          if (endIndex !== -1) {
            const content = text.slice(match.index + fullMatch.length, endIndex);
            parts.push(
              <span
                key={parts.length}
                style={{ color }}
              >
                {content}
              </span>
            );
            bbCodeRegex.lastIndex = endIndex + 8; // Skip past [/color]
          }
        } else {
          const styleMap: { [key: string]: React.CSSProperties } = {
            b: { fontWeight: 'bold' },
            i: { fontStyle: 'italic' },
            s: { textDecoration: 'line-through' },
          };

          const endIndex = text.indexOf(`[/${tag}]`, match.index);
          if (endIndex !== -1) {
            const content = text.slice(match.index + fullMatch.length, endIndex);
            parts.push(
              <span
                key={parts.length}
                style={styleMap[tag]}
              >
                {content}
              </span>
            );
            bbCodeRegex.lastIndex = endIndex + tag.length + 3; // Skip past closing tag
          }
        }
      }
      currentIndex = bbCodeRegex.lastIndex;
    }

    // Add any remaining text
    const remainingText = text.slice(currentIndex);
    if (remainingText) {
      parts.push(<span key={parts.length}>{remainingText}</span>);
    }

    return parts;
  };

  return <div className='bbcode-text'>{renderBBCode(text)}</div>;
};
