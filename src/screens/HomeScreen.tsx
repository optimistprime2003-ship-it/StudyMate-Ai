import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Button } from 'react-native-paper';
import { useAppStore } from '../store/appStore';
import DocumentCard from '../components/DocumentCard';
import EmptyState from '../components/EmptyState';
import type { Document } from '../components/ModuleConnector';

const SAMPLE_DOCS: Document[] = [
  { id: '1', title: 'Introduction to Machine Learning', type: 'pdf', path: '/docs/ml-intro.pdf', size: 2400000, createdAt: Date.now() - 86400000 * 3, lastOpened: Date.now() - 3600000 },
  { id: '2', title: 'Organic Chemistry Notes', type: 'docx', path: '/docs/chem-notes.docx', size: 890000, createdAt: Date.now() - 86400000 * 7, lastOpened: Date.now() - 86400000 },
  { id: '3', title: 'Calculus II Lecture Slides', type: 'pptx', path: '/docs/calc2-slides.pptx', size: 5200000, createdAt: Date.now() - 86400000 * 14, lastOpened: Date.now() - 86400000 * 2 },
];

export default function HomeScreen() {
  const theme = useTheme();
  const { documents, addDocument } = useAppStore();
  const recentDocs = documents.length > 0 ? documents.slice(-5).reverse() : SAMPLE_DOCS;

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
          Welcome back!
        </Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          Continue where you left off
        </Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
          Recent Documents
        </Text>
        <Button mode="text" compact onPress={() => addDocument({
          id: Date.now().toString(),
          title: 'New Document',
          type: 'pdf',
          path: '/docs/new.pdf',
          size: 1000000,
          createdAt: Date.now(),
          lastOpened: Date.now(),
        })}>
          Add
        </Button>
      </View>

      {recentDocs.length === 0 ? (
        <EmptyState
          title="No documents yet"
          message="Import your first document to get started with StudyMate AI"
          actionLabel="Import Document"
          onAction={() => {}}
        />
      ) : (
        recentDocs.map((doc) => (
          <DocumentCard key={doc.id} document={doc} />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 24 },
  hero: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
});
