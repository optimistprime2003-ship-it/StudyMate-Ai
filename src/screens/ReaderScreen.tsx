import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Button, Icon } from 'react-native-paper';
import EmptyState from '../components/EmptyState';

export default function ReaderScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <EmptyState
        title="Reader Module"
        message="The PDF reader will be available in a future module. Open a document from the Library to start reading."
        icon="file-document-outline"
        actionLabel="Go to Library"
        onAction={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
