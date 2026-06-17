import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, useTheme, TextInput, IconButton, Surface } from 'react-native-paper';
import { useAppStore } from '../store/appStore';
import EmptyState from '../components/EmptyState';
import type { ChatMessage } from '../components/ModuleConnector';

const SAMPLE_MESSAGES: ChatMessage[] = [
  { id: '1', role: 'ai', content: 'Hi! I\'m your AI study assistant. Ask me anything about your documents!', timestamp: Date.now() - 60000 },
  { id: '2', role: 'user', content: 'Can you summarize the key concepts from my Machine Learning notes?', timestamp: Date.now() - 30000 },
  { id: '3', role: 'ai', content: 'AI module coming soon! I\'ll be able to answer questions, summarize, and generate study materials from your documents.', timestamp: Date.now() - 15000 },
];

export default function ChatScreen() {
  const theme = useTheme();
  const { chatMessages, addChatMessage } = useAppStore();
  const [input, setInput] = useState('');

  const messages = chatMessages.length > 0 ? chatMessages : SAMPLE_MESSAGES;

  const handleSend = () => {
    if (!input.trim()) return;
    addChatMessage({
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    });
    setInput('');

    setTimeout(() => {
      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: 'AI module is coming soon! I\'ll be able to help you study more effectively.',
        timestamp: Date.now(),
      });
    }, 500);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.role === 'user'
                ? [styles.userBubble, { backgroundColor: theme.colors.primary }]
                : [styles.aiBubble, { backgroundColor: theme.colors.surfaceVariant }],
            ]}
          >
            <Text
              variant="bodyMedium"
              style={{ color: msg.role === 'user' ? '#FFFFFF' : theme.colors.onSurface }}
            >
              {msg.content}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Surface style={[styles.inputBar, { backgroundColor: theme.colors.surface }]} elevation={4}>
        <TextInput
          mode="flat"
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your documents..."
          style={styles.input}
          dense
          right={
            <TextInput.Icon
              icon="send"
              onPress={handleSend}
              color={theme.colors.primary}
            />
          }
        />
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  messages: { flex: 1 },
  messagesContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  messageBubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  inputBar: { paddingHorizontal: 12, paddingVertical: 8 },
  input: { borderRadius: 24, backgroundColor: 'transparent' },
});
