import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme, Chip } from 'react-native-paper';
import { useAppStore } from '../store/appStore';
import DocumentCard from '../components/DocumentCard';
import SearchBar from '../components/SearchBar';
import EmptyState from '../components/EmptyState';
import type { Document, DocumentType } from '../components/ModuleConnector';

const SAMPLE_DOCS: Document[] = [
  { id: '1', title: 'Introduction to Machine Learning', type: 'pdf', path: '/docs/ml-intro.pdf', size: 2400000, createdAt: Date.now() - 86400000 * 3, lastOpened: Date.now() - 3600000 },
  { id: '2', title: 'Organic Chemistry Notes', type: 'docx', path: '/docs/chem-notes.docx', size: 890000, createdAt: Date.now() - 86400000 * 7, lastOpened: Date.now() - 86400000 },
  { id: '3', title: 'Calculus II Lecture Slides', type: 'pptx', path: '/docs/calc2-slides.pptx', size: 5200000, createdAt: Date.now() - 86400000 * 14, lastOpened: Date.now() - 86400000 * 2 },
  { id: '4', title: 'World History Textbook', type: 'epub', path: '/docs/history.epub', size: 8100000, createdAt: Date.now() - 86400000 * 5, lastOpened: Date.now() - 86400000 * 1 },
  { id: '5', title: 'Python Scripts Collection', type: 'txt', path: '/docs/python.txt', size: 320000, createdAt: Date.now() - 86400000 * 10, lastOpened: Date.now() - 86400000 * 4 },
  { id: '6', title: 'Biology Diagram', type: 'image', path: '/docs/bio-diagram.png', size: 1500000, createdAt: Date.now() - 86400000 * 2, lastOpened: Date.now() - 7200000 },
];

const FILTER_TYPES: DocumentType[] = ['pdf', 'docx', 'pptx', 'txt', 'image', 'epub'];

export default function LibraryScreen() {
  const theme = useTheme();
  const { documents } = useAppStore();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DocumentType | null>(null);

  const allDocs = documents.length > 0 ? documents : SAMPLE_DOCS;

  const filtered = allDocs.filter((doc) => {
    const matchesQuery = doc.title.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = !activeFilter || doc.type === activeFilter;
    return matchesQuery && matchesFilter;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SearchBar value={query} onQueryChange={setQuery} placeholder="Search library..." />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        <Chip
          selected={!activeFilter}
          onPress={() => setActiveFilter(null)}
          style={styles.chip}
          mode={!activeFilter ? 'flat' : 'outlined'}
        >
          All
        </Chip>
        {FILTER_TYPES.map((type) => (
          <Chip
            key={type}
            selected={activeFilter === type}
            onPress={() => setActiveFilter(activeFilter === type ? null : type)}
            style={styles.chip}
            mode={activeFilter === type ? 'flat' : 'outlined'}
          >
            {type.toUpperCase()}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {filtered.length === 0 ? (
          <EmptyState
            title="No documents found"
            message="Try a different search or filter"
          />
        ) : (
          filtered.map((doc) => <DocumentCard key={doc.id} document={doc} />)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filters: { paddingHorizontal: 16, maxHeight: 48 },
  chip: { marginRight: 8 },
  list: { paddingBottom: 24 },
});
