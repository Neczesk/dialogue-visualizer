export const formatSelectedText = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  format: string,
  color?: string
): { text: string; newCursorPos: number } => {
  const selectedText = text.slice(selectionStart, selectionEnd);
  const beforeText = text.slice(0, selectionStart);
  const afterText = text.slice(selectionEnd);

  if (format === 'color' && color) {
    const startTag = `[color=${color}]`;
    const endTag = '[/color]';

    // If no text is selected, insert tags and place cursor between them
    if (selectionStart === selectionEnd) {
      const newText = `${beforeText}${startTag}${endTag}${afterText}`;
      return {
        text: newText,
        newCursorPos: selectionStart + startTag.length,
      };
    }

    const newText = `${beforeText}${startTag}${selectedText}${endTag}${afterText}`;
    return {
      text: newText,
      newCursorPos: selectionEnd + startTag.length + endTag.length,
    };
  }

  // Regular BBCode formatting
  const startTag = `[${format}]`;
  const endTag = `[/${format}]`;

  if (selectionStart === selectionEnd) {
    const newText = `${beforeText}${startTag}${endTag}${afterText}`;
    return {
      text: newText,
      newCursorPos: selectionStart + startTag.length,
    };
  }

  const newText = `${beforeText}${startTag}${selectedText}${endTag}${afterText}`;
  return {
    text: newText,
    newCursorPos: selectionEnd + startTag.length + endTag.length,
  };
};
