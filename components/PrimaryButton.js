import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../styles/Theme';

export default function PrimaryButton({ title, onPress, style, textStyle, disabled }){
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.btn, disabled && styles.disabled, style]}
    >
      <Text style={[styles.txt, textStyle]}>{title}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  txt: {
    color: '#fff',
    fontWeight: '700'
  },
  disabled: {
    opacity: 0.5
  }
});
