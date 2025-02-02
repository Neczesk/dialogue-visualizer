import React, { useRef, useEffect } from 'react';
import { TextFormatToolbar } from './TextFormatToolbar';
import { formatSelectedText } from '../utils/textFormatter';

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const TextInput: React.FC<TextInputProps> = ({ value, onChange, placeholder, className = '' }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [localValue, setLocalValue] = React.useState(value);

  // Keep local value in sync with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleFormat = (format: string, color?: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    const { text: newText, newCursorPos } = formatSelectedText(localValue, selectionStart, selectionEnd, format, color);

    setLocalValue(newText);
    onChange(newText); // Propagate change to parent

    // Restore focus and cursor position after React updates the DOM
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    console.log('TextInput handleChange:', newValue);
    onChange(newValue); // Propagate change to parent
  };

  return (
    <div className='text-input-with-toolbar'>
      <TextFormatToolbar onFormat={handleFormat} />
      <textarea
        ref={textareaRef}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={`text-input ${className}`}
      />
    </div>
  );
};
