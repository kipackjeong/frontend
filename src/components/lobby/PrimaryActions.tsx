import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';

interface PrimaryActionsProps {
  onQuickPlay: () => void;
  onCreateRoom: () => void;
  onJoinWithCode: () => void;
  loadingCreate?: boolean;
}

type GradientTuple = [string, string];
const ButtonGradient: React.FC<{ colors: GradientTuple; children: React.ReactNode; style?: any }> = ({ colors, children, style }) => (
  <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btnGrad, style]}>
    {children}
  </LinearGradient>
);

const PrimaryActions: React.FC<PrimaryActionsProps> = ({ onQuickPlay, onCreateRoom, onJoinWithCode, loadingCreate }) => {
  const QUICK: GradientTuple = ['#8b4513', '#228b22'];
  const JOIN: GradientTuple = ['#059669', '#047857'];
  const CREATE: GradientTuple = loadingCreate ? ['#9ca3af', '#6b7280'] : ['#eab308', '#d97706'];
  return (
    <View style={styles.container}>
      {/* TODO: feature 빠른시작 구현 */}
      {/* <TouchableOpacity activeOpacity={0.9} onPress={onQuickPlay} style={styles.btnShadow}>
        <ButtonGradient colors={QUICK}>
          <Icon name="zap" size={18} color="#fff" />
          <Text style={styles.btnText}>빠른 시작</Text>
        </ButtonGradient>
      </TouchableOpacity> */}

      <View style={styles.row}>
        <TouchableOpacity activeOpacity={0.9} onPress={onCreateRoom} style={[styles.btnShadow, styles.half]}>
          <ButtonGradient colors={CREATE}>
            <Icon name="plus" size={18} color="#fff" />
            <Text style={styles.btnText}>방 만들기</Text>
          </ButtonGradient>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.9} onPress={onJoinWithCode} style={[styles.btnShadow, styles.half]}>
          <ButtonGradient colors={JOIN}>
            <Icon name="key" size={18} color="#fff" />
            <Text style={styles.btnText}>코드로 참가</Text>
          </ButtonGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  btnShadow: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  btnGrad: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default PrimaryActions;
