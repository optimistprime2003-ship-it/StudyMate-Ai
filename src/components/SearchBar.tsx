import React, { useState } from 'react';
import { TextInput, useTheme } from 'react-native-paper';
import { StyleSheet } from 'react-native';

interface SearchBarProps {
  value?: string;
  onQueryChange?: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onQueryChange, placeholder = 'Search documents...' }: SearchBarProps) {
  const [internalValue, setInternalValue] = useState('');
  const query = value ?? internalValue;
  const theme = useTheme();

  return (
    <TextInput
      mode="outlined"
      value={query}
      onChangeText={(text) => {
        setInternalValue(text);
        onQueryChange?.(text);
      }}
      placeholder={placeholder}
      left={<TextInput.Icon icon="magnify" />}
      right={query.length > 0 ? <TextInput.Icon icon="close" onPress={() => { setInternalValue(''); onQueryChange?.(''); }} /> : undefined}
      outlineColor={theme.colors.outline}
      activeOutlineColor={theme.colors.primary}
      style={styles.input}
      dense
      theme={{ roundness: 12 }}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    marginHorizontal: 16,
    marginVertical: 8,
  },
});
