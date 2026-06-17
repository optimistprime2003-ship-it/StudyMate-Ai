import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme, Divider } from 'react-native-paper';
import SearchBar from '../components/SearchBar';
import DocumentCard from '../components/DocumentCard';
import EmptyState from '../components/EmptyState';
import { useAppStore } from '../store/appStore';
import type { Document } from '../components/ModuleConnector';

const SAMPLE_DOCS: Document[] = [
  { id: '1', title: 'Introduction to Machine Learning', type: 'pdf', path: '/docs/ml-intro.pdf', size: 2400000, createdAt: Date.now() - 86400000 * 3, lastOpened: Date.now() - 3600000 },
  { id: '2', title: 'Organic Chemistry Notes', type: 'docx', path: '/docs/chem-notes.docx', size: 890000, createdAt: Date.now() - 86400000 * 7, lastOpened: Date.now() - 86400000 },
  { id: '3', title: 'Calculus II Lecture Slides', type: 'pptx', path: '/docs/calc2-slides.pptx', size: 5200000, createdAt: Date.now() - 86400000 * 14, lastOpened: Date.now() - 86400000 * 2 },
  { id: '4', title: 'Machine Learning Lab Report', type: 'pdf', path: '/docs/ml-lab.pdf', size: 1200000, createdAt: Date.now() - 86400000, lastOpened: Date.now() - 43200000 },
];

export default function SearchScreen() {
  const theme = useTheme();
  const { documents } = useAppStore();
  const [query, setQuery] = useState('');

  const allDocs = documents.length > 0 ? documents : SAMPLE_DOCS;
  const results = query.trim()
    ? allDocs.filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SearchBar value={query} onQueryChange={setQuery} placeholder="Search all documents..." />

      {query.trim() && (
        <Text variant="labelMedium" style={[styles.resultCount, { color: theme.colors.onSurfaceVariant }]}>
          {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
        </Text>
      )}

      <ScrollView contentContainerStyle={styles.list}>
        {query.trim().length === 0 ? (
          <EmptyState
            title="Search your documents"
            message="Type a keyword to find documents, notes, and study materials"
          />
        ) : results.length === 0 ? (
          <EmptyState
            title="No results found"
            message={`No documents matching "${query}"`}
          />
        ) : (
          results.map((doc) => <DocumentCard key={doc.id} document={doc} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  resultCount: { paddingHorizontal: 16, paddingVertical: 4 },
  list: { paddingBottom: 24 },
});
