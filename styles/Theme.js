import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const colors = {
  bg: '#efe6d6', // light tan
  card: '#fffdf8',
  // primary accents moved toward brown to match football leather
  accent: '#7a4b2a', // warm brown
  accentLight: '#b98963ff',
  dark: '#3b2b22', // deep brown
  muted: '#8b6f5f',
  border: '#e6d0bb',
  nameBg: '#fff7e6'
};

export function Icon({name, size=20, color, style}){
  return <MaterialCommunityIcons name={name} size={size} color={color || colors.dark} style={style} />
}

export default { colors, Icon };
