import React, { useState, useRef, useEffect, useMemo } from 'react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onEnter?: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChange,
  onEnter,
  suggestions = [],
  placeholder,
  className,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedSuggestion, setFocusedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!value) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(value.toLowerCase()));
  }, [value, suggestions]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedSuggestion((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedSuggestion((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter(value);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className='autocomplete-container'>
      <input
        ref={inputRef}
        type='text'
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className='suggestions-list'
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`suggestion-item ${index === focusedSuggestion ? 'focused' : ''}`}
              onClick={() => {
                onChange(suggestion);
                setShowSuggestions(false);
              }}
              onMouseEnter={() => setFocusedSuggestion(index)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
