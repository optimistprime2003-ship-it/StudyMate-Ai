import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

export interface OCRProgressProps {
  currentPage: number;
  totalPages: number;
  extractedTextPreview?: string;
  onCancel: () => void;
  isVisible: boolean;
}

export function OCRProgressComponent({
  currentPage,
  totalPages,
  extractedTextPreview,
  onCancel,
  isVisible,
}: OCRProgressProps) {
  const colors = useColors();

  if (!isVisible) return null;

  const progress = totalPages > 0 ? currentPage / totalPages : 0;
  const progressPercent = Math.round(progress * 100);

  return (
    <View
      style={[styles.overlay, { backgroundColor: "rgba(0,0,0,0.65)" }]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderRadius: colors.radius * 1.5,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.header}>
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={styles.spinner}
          />
          <Text style={[styles.title, { color: colors.foreground }]}>
            {totalPages > 1
              ? `Scanning page ${currentPage} of ${totalPages}...`
              : "Scanning document..."}
          </Text>
        </View>

        <View
          style={[
            styles.progressTrack,
            { backgroundColor: colors.muted, borderRadius: colors.radius },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%` as `${number}%`,
                backgroundColor: colors.primary,
                borderRadius: colors.radius,
              },
            ]}
          />
        </View>

        <Text style={[styles.percentLabel, { color: colors.mutedForeground }]}>
          {progressPercent}%
        </Text>

        {extractedTextPreview ? (
          <View
            style={[
              styles.previewBox,
              {
                backgroundColor: colors.secondary,
                borderRadius: colors.radius,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.previewLabel, { color: colors.mutedForeground }]}
            >
              Detected text:
            </Text>
            <Text
              style={[styles.previewText, { color: colors.foreground }]}
              numberOfLines={4}
              ellipsizeMode="tail"
            >
              {extractedTextPreview}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[
            styles.cancelButton,
            {
              backgroundColor: colors.destructive,
              borderRadius: colors.radius,
            },
          ]}
          onPress={onCancel}
          activeOpacity={0.75}
        >
          <Text
            style={[
              styles.cancelText,
              { color: colors.destructiveForeground },
            ]}
          >
            Cancel
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  card: {
    width: "86%",
    maxWidth: 380,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  spinner: {
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
    flexWrap: "wrap",
  },
  progressTrack: {
    height: 8,
    width: "100%",
    marginBottom: 6,
    overflow: "hidden",
  },
  progressFill: {
    height: 8,
  },
  percentLabel: {
    fontSize: 12,
    textAlign: "right",
    marginBottom: 14,
  },
  previewBox: {
    padding: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 19,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
