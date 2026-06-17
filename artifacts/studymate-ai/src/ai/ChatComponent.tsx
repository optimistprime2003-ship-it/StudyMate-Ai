import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
  Clipboard,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { chatService, ChatMessage } from './ChatService';
import { QUICK_PROMPTS, QUICK_PROMPT_LABELS, QuickPromptKey } from './PromptTemplates';

interface Props {
  sessionId: string;
  documentTitle: string;
  onModelNotLoaded?: () => void;
}

function TypingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 200);
    const a3 = animate(dot3, 400);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const dotStyle = (anim: Animated.Value) => ({
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#999',
    marginHorizontal: 2,
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }}>
      <Animated.View style={dotStyle(dot1)} />
      <Animated.View style={dotStyle(dot2)} />
      <Animated.View style={dotStyle(dot3)} />
    </View>
  );
}

export default function ChatComponent({ sessionId, documentTitle, onModelNotLoaded }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const streamingContentRef = useRef<Map<string, string>>(new Map());
  const [streamingIds, setStreamingIds] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const session = chatService.getSession(sessionId);
    if (session) setMessages([...session.messages]);
  }, [sessionId]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isGenerating) return;

      setInputText('');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const userMsg = chatService.addUserMessage(sessionId, trimmed);
      setMessages((prev) => [...prev, userMsg]);

      setIsGenerating(true);
      const tempId = `streaming_${Date.now()}`;
      setStreamingIds((prev) => new Set(prev).add(tempId));

      try {
        const aiMsg = await chatService.getAIResponse(
          sessionId,
          trimmed,
          (token, msgId) => {
            const current = streamingContentRef.current.get(msgId) ?? '';
            streamingContentRef.current.set(msgId, current + token);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId ? { ...m, content: streamingContentRef.current.get(msgId) ?? '' } : m
              )
            );
          }
        );

        streamingContentRef.current.delete(tempId);
        setStreamingIds((prev) => {
          const next = new Set(prev);
          next.delete(tempId);
          return next;
        });

        setMessages((prev) => {
          const exists = prev.find((m) => m.id === aiMsg.id);
          if (exists) return prev.map((m) => (m.id === aiMsg.id ? aiMsg : m));
          return [...prev, aiMsg];
        });
      } catch (err) {
        const errMsg = String(err);
        if (errMsg.includes('not loaded') || errMsg.includes('model')) {
          onModelNotLoaded?.();
        }
        const errorMessage: ChatMessage = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: 'Sorry, I could not generate a response. Please make sure the AI model is loaded.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsGenerating(false);
      }
    },
    [sessionId, isGenerating, onModelNotLoaded]
  );

  const handleClearChat = () => {
    chatService.clearHistory(sessionId);
    setMessages([]);
    streamingContentRef.current.clear();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCopy = (content: string) => {
    Clipboard.setString(content);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const styles = createStyles(colors);
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageBubbleRow, isUser && styles.messageBubbleRowRight]}>
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          {item.isStreaming && item.content === '' ? (
            <TypingDots />
          ) : (
            <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
              {item.content}
            </Text>
          )}
          {!isUser && item.content.length > 0 && (
            <TouchableOpacity
              style={styles.copyButton}
              onPress={() => handleCopy(item.content)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="copy" size={11} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const typingIndicator = isGenerating ? (
    <View style={styles.messageBubbleRow}>
      <View style={[styles.bubble, styles.aiBubble]}>
        <TypingDots />
      </View>
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderLeft}>
          <Feather name="message-circle" size={14} color={colors.primary} />
          <Text style={styles.chatHeaderText} numberOfLines={1}>
            {documentTitle}
          </Text>
        </View>
        <TouchableOpacity onPress={handleClearChat} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="trash-2" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        inverted
        contentContainerStyle={styles.messageList}
        ListHeaderComponent={typingIndicator}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!!messages.length}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.quickPromptsBar]}>
        <FlatList
          horizontal
          data={Object.keys(QUICK_PROMPTS) as QuickPromptKey[]}
          keyExtractor={(k) => k}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.quickPromptChip}
              onPress={() => sendMessage(QUICK_PROMPTS[item])}
              disabled={isGenerating}
              activeOpacity={0.7}
            >
              <Text style={styles.quickPromptText}>{QUICK_PROMPT_LABELS[item]}</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={[styles.inputBar, { paddingBottom: bottomPad + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Ask anything about this document..."
          placeholderTextColor={colors.mutedForeground}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(inputText)}
          editable={!isGenerating}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isGenerating) && styles.sendButtonDisabled]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isGenerating}
          activeOpacity={0.75}
        >
          <Feather name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    chatHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    chatHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    chatHeaderText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: colors.mutedForeground,
      flex: 1,
    },
    messageList: {
      padding: 12,
      gap: 8,
    },
    messageBubbleRow: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      marginVertical: 3,
    },
    messageBubbleRowRight: {
      justifyContent: 'flex-end',
    },
    bubble: {
      maxWidth: '80%',
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    userBubble: {
      backgroundColor: '#7C3AED',
      borderBottomRightRadius: 4,
    },
    aiBubble: {
      backgroundColor: colors.card,
      borderBottomLeftRadius: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bubbleText: {
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    },
    userBubbleText: {
      color: '#fff',
    },
    copyButton: {
      alignSelf: 'flex-end',
      marginTop: 4,
      opacity: 0.6,
    },
    quickPromptsBar: {
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    quickPromptChip: {
      backgroundColor: colors.secondary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quickPromptText: {
      fontSize: 12,
      color: colors.foreground,
      fontWeight: '500' as const,
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      paddingHorizontal: 12,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      backgroundColor: colors.background,
    },
    input: {
      flex: 1,
      minHeight: 40,
      maxHeight: 100,
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 10,
      fontSize: 14,
      color: colors.foreground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: '#7C3AED',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendButtonDisabled: {
      backgroundColor: colors.muted,
    },
  });
