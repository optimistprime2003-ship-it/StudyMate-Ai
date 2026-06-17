import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Send, Copy, Trash2, BookOpen, MessageCircle } from 'lucide-react-native';
import { chatService } from './ChatService';
import { QUICK_PROMPTS } from './PromptTemplates';
import type { ChatMessage } from './types';

interface Props {
  documentTitle?: string;
  documentId?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(text);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  };

  return (
    <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
      <Copy size={14} color={copied ? '#16a34a' : '#94a3b8'} />
      <Text style={[styles.copyBtnText, copied && styles.copiedText]}>
        {copied ? 'Copied' : 'Copy'}
      </Text>
    </TouchableOpacity>
  );
}

function TypingIndicator() {
  const [dots, setDots] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d % 3) + 1);
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.typingBubble}>
      <Text style={styles.typingDots}>{'.'.repeat(dots)}</Text>
    </View>
  );
}

export default function ChatComponent({ documentTitle, documentId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (documentId) {
      chatService.setActiveDocument(documentId, documentTitle || 'Document');
    }
    return () => {
      chatService.setActiveDocument(null, '');
    };
  }, [documentId, documentTitle]);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleSend = async (messageText?: string) => {
    const text = (messageText || input).trim();
    if (!text || isStreaming) return;

    setInput('');
    chatService.addUserMessage(text);
    const currentMessages = chatService.getHistory();
    setMessages([...currentMessages]);
    scrollToBottom();

    setIsStreaming(true);
    setStreamingText('');

    try {
      const accumulated: string[] = [];

      await chatService.getAIResponse(text, (token) => {
        accumulated.push(token);
        setStreamingText(accumulated.join(''));
        scrollToBottom();
      });

      const updatedMessages = chatService.getHistory();
      setMessages([...updatedMessages]);
      setStreamingText('');
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: 'Sorry, I could not generate a response. Please ensure a model is loaded.',
        timestamp: Date.now(),
      };
      chatService.addUserMessage('');
      setMessages([...chatService.getHistory(), errorMsg]);
    } finally {
      setIsStreaming(false);
      scrollToBottom();
    }
  };

  const handleClear = () => {
    chatService.clearHistory();
    setMessages([]);
    setStreamingText('');
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSend(prompt);
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    return (
      <View style={[styles.messageRow, isUser && styles.userRow]}>
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
            {item.content}
          </Text>
        </View>
        {!isUser && <CopyButton text={item.content} />}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <BookOpen size={18} color="#2563eb" />
        <Text style={styles.headerTitle}>
          Chatting about: {documentTitle || 'General'}
        </Text>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Trash2 size={18} color="#64748b" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MessageCircle size={48} color="#cbd5e1" />
            <Text style={styles.emptyText}>Ask a question about your document</Text>
          </View>
        }
      />

      {isStreaming && streamingText && (
        <View style={[styles.messageRow, styles.aiRow]}>
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <Text style={styles.aiMessageText}>{streamingText}</Text>
          </View>
        </View>
      )}

      {isStreaming && !streamingText && <TypingIndicator />}

      <View style={styles.quickPrompts}>
        {Object.entries(QUICK_PROMPTS).map(([key, prompt]) => (
          <TouchableOpacity
            key={key}
            style={styles.quickBtn}
            onPress={() => handleQuickPrompt(prompt)}
            disabled={isStreaming}
          >
            <Text style={styles.quickBtnText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything about the document..."
          placeholderTextColor="#94a3b8"
          multiline
          maxLength={2000}
          editable={!isStreaming}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || isStreaming) && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!input.trim() || isStreaming}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  clearBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  userRow: {
    alignItems: 'flex-end',
  },
  aiRow: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: '#7c3aed',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#fff',
  },
  aiMessageText: {
    color: '#0f172a',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    marginLeft: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  copyBtnText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  copiedText: {
    color: '#16a34a',
  },
  typingBubble: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  typingDots: {
    fontSize: 20,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  quickPrompts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  quickBtn: {
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  quickBtnText: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#0f172a',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
});
