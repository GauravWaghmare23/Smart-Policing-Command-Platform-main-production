import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const isDanger = variant === 'danger';
  const isSecondary = variant === 'secondary';
  const isOutline = variant === 'outline';

  const backgroundColor = isDanger
    ? '#DC2626'
    : isSecondary
    ? '#F1F5F9'
    : isOutline
    ? 'transparent'
    : '#1D4ED8';

  const textColor = isSecondary
    ? '#1E293B'
    : isOutline
    ? '#1D4ED8'
    : '#FFFFFF';

  const borderColor = isOutline ? '#1D4ED8' : isSecondary ? '#E2E8F0' : 'transparent';

  const paddingVertical = size === 'lg' ? 14 : size === 'sm' ? 8 : 12;
  const paddingHorizontal = size === 'lg' ? 24 : size === 'sm' ? 12 : 18;
  const fontSize = size === 'lg' ? 16 : size === 'sm' ? 13 : 15;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor,
          borderWidth: isOutline || isSecondary ? 1.5 : 0,
          paddingVertical,
          paddingHorizontal,
          opacity: disabled || loading ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor, fontSize }, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '700',
  },
});
