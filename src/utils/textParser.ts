export const replaceVariables = (text: string, variables: Record<string, number>): string => {
  console.log('Input text:', text);
  console.log('Variables:', variables);

  // Use a simpler regex pattern and escape special characters
  const pattern = /\{\$\$([^}]+)\}/g;

  const result = text.replace(pattern, (match, variableName) => {
    const trimmedName = variableName.trim();
    const value = variables[trimmedName];
    console.log(`Matching: "${match}"`);
    console.log(`Variable name: "${trimmedName}"`);
    console.log(`Value found: ${value}`);
    return value !== undefined ? value.toString() : 'VALUE_NOT_FOUND';
  });

  console.log('Output text:', result);
  return result;
};

export const extractVariables = (text: string): string[] => {
  const pattern = /\{\$\$([^}]+)\}/g;
  const matches = text.match(pattern) || [];
  return matches.map((match) => match.slice(3, -1).trim());
};
