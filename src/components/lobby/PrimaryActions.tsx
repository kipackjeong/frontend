import React from 'react';
import { View, StyleSheet } from 'react-native';
import GradientActionButton, { GradientTuple } from '../common/GradientActionButton';

interface PrimaryActionsProps {
  onQuickPlay: () => void;
  onCreateRoom: () => void;
  onJoinWithCode: () => void;
  loadingCreate?: boolean;
}

type GradientTupleLocal = GradientTuple;

const PrimaryActions: React.FC<PrimaryActionsProps> = ({ onQuickPlay, onCreateRoom, onJoinWithCode, loadingCreate }) => {
  const QUICK: GradientTupleLocal = ['#8b4513', '#228b22'];
  const JOIN: GradientTupleLocal = ['#059669', '#047857'];
  const CREATE: GradientTupleLocal = ['#eab308', '#d97706'];
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
        <GradientActionButton
          label="방 만들기"
          icon="plus"
          colors={CREATE}
          disabled={!!loadingCreate}
          onPress={onCreateRoom}
          style={styles.half}
        />
        <GradientActionButton
          label="코드로 참가"
          icon="key"
          colors={JOIN}
          onPress={onJoinWithCode}
          style={styles.half}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});

export default PrimaryActions;
