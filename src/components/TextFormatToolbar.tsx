import React, { useState } from 'react';

interface TextFormatToolbarProps {
  onFormat: (format: string, color?: string) => void;
}

export const TextFormatToolbar: React.FC<TextFormatToolbarProps> = ({ onFormat }) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const formatButtons = [
    { label: 'B', format: 'b', title: 'Bold' },
    { label: 'I', format: 'i', title: 'Italic' },
    { label: '~', format: 's', title: 'Strikethrough' },
  ];

  const colors = {
    'Text Colors': [
      'black',
      'white',
      'gray',
      'silver',
      'maroon',
      'red',
      'purple',
      'fuchsia',
      'green',
      'lime',
      'olive',
      'yellow',
      'navy',
      'blue',
      'teal',
      'aqua',
    ],
    'Extended Colors': [
      'darkred',
      'crimson',
      'tomato',
      'coral',
      'indianred',
      'lightcoral',
      'darkorange',
      'orange',
      'darkgreen',
      'forestgreen',
      'seagreen',
      'darkseagreen',
      'darkcyan',
      'lightseagreen',
      'darkturquoise',
      'turquoise',
      'darkblue',
      'mediumblue',
      'royalblue',
      'cornflowerblue',
      'darkviolet',
      'blueviolet',
      'darkorchid',
      'mediumorchid',
    ],
  };

  return (
    <div className='text-format-toolbar'>
      {formatButtons.map(({ label, format, title }) => (
        <button
          key={format}
          onClick={() => onFormat(format)}
          title={title}
          className='format-button'
        >
          {label}
        </button>
      ))}
      <div className='format-divider' />
      <div className='color-picker-container'>
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className='format-button color-picker-button'
          title='Text Color'
        >
          <span className='color-icon'>A</span>
          <span className='color-dropdown-arrow'>▼</span>
        </button>
        {showColorPicker && (
          <div className='color-picker-dropdown'>
            {Object.entries(colors).map(([category, categoryColors]) => (
              <div
                key={category}
                className='color-category'
              >
                <div className='color-category-label'>{category}</div>
                <div className='color-grid'>
                  {categoryColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        onFormat('color', color);
                        setShowColorPicker(false);
                      }}
                      className='color-option'
                      style={{ backgroundColor: color }}
                      title={color.charAt(0).toUpperCase() + color.slice(1)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
