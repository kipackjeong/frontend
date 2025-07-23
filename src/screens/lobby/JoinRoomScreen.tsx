/**
 * Join room screen - allows users to join existing rooms by code
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { socketService } from '../../services/socket';
import { Button, Input, Card } from '../../components/common';
import { UI_CONFIG } from '../../constants/config';

export default function JoinRoomScreen() {
  const navigation = useNavigation();
  const [roomCode, setRoomCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  const handleJoinRoom = async () => {
    const code = roomCode.trim().toUpperCase();

    if (code.length !== 6) {
      Alert.alert('Error', 'Room code must be 6 characters');
      return;
    }

    try {
      setIsJoining(true);

      socketService.emit('room:join', { code }, (response: any) => {
        setIsJoining(false);

        if (response.success) {
          Alert.alert(
            'Joined Room!',
            `Successfully joined "${response.data.name}"`,
            [
              {
                text: 'OK',
                onPress: () => navigation.navigate('RoomScreen' as never),
              },
            ]
          );
        } else {
          Alert.alert('Error', response.message || 'Failed to join room');
        }
      });
    } catch (error) {
      setIsJoining(false);
      console.error('Failed to join room:', error);
      Alert.alert('Error', 'Failed to join room');
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    // Only allow alphanumeric characters
    const cleanText = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    if (cleanText.length <= 1) {
      const newCode = roomCode.split('');
      newCode[index] = cleanText;
      setRoomCode(newCode.join(''));

      // Move to next input if character entered and not last input
      if (cleanText.length === 1 && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    } else if (cleanText.length === 6) {
      // Handle pasted full code
      setRoomCode(cleanText);
      inputRefs.current[5]?.focus();
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !roomCode[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleQuickCode = (text: string) => {
    const cleanText = text.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (cleanText.length <= 6) {
      setRoomCode(cleanText.padEnd(6, ''));
      // Focus appropriate input
      const focusIndex = Math.min(cleanText.length, 5);
      setTimeout(() => inputRefs.current[focusIndex]?.focus(), 100);
    }
  };

  const renderCodeInputs = () => {
    const inputs = [];
    for (let i = 0; i < 6; i++) {
      inputs.push(
        <TextInput
          key={i}
          ref={(ref) => (inputRefs.current[i] = ref as TextInput)}
          style={[
            styles.codeInput,
            roomCode[i] ? styles.codeInputFilled : null
          ]}
          value={roomCode[i] || ''}
          onChangeText={(text) => handleCodeChange(text, i)}
          onKeyPress={({ nativeEvent: { key } }) => handleKeyPress(key, i)}
          maxLength={1}
          autoCapitalize="characters"
          autoCorrect={false}
          keyboardType="default"
          textAlign="center"
          selectTextOnFocus
        />
      );
    }
    return inputs;
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <Button
          title="← Back"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={styles.backButton}
        />
        <Text style={styles.title}>Join Room</Text>
      </View>

      <View style={styles.content}>
        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Card>
            <Text style={styles.instructionsTitle}>Enter Room Code</Text>
            <Text style={styles.instructionsText}>
              Ask the room creator for the 6-character room code to join their game.
            </Text>
          </Card>
        </View>

        {/* Code Input */}
        <View style={styles.codeCard}>
          <Card>
            <Text style={styles.codeLabel}>Room Code</Text>
            <View style={styles.codeInputContainer}>
              {renderCodeInputs()}
            </View>

            {/* Quick Input for Pasting */}
            <Text style={styles.orText}>or paste code below:</Text>
            <Input
              placeholder="Paste 6-character code here"
              value={roomCode}
              onChangeText={handleQuickCode}
              maxLength={6}
              autoCapitalize="characters"
            />
          </Card>
        </View>

        {/* Join Button */}
        <Button
          title={isJoining ? 'Joining...' : 'Join Room'}
          onPress={handleJoinRoom}
          disabled={isJoining || roomCode.replace(/\s/g, '').length !== 6}
          style={styles.joinButton}
          variant="primary"
        />

        {/* Help Text */}
        <Text style={styles.helpText}>
          Don't have a room code? Go back and create a new room or browse available rooms.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: UI_CONFIG.COLORS.BACKGROUND,
    paddingTop: 50, // Status bar padding
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: UI_CONFIG.SPACING.lg,
    paddingVertical: UI_CONFIG.SPACING.md,
  },
  backButton: {
    marginRight: UI_CONFIG.SPACING.md,
    paddingHorizontal: UI_CONFIG.SPACING.md,
  },
  title: {
    ...UI_CONFIG.TYPOGRAPHY.h1,
    color: UI_CONFIG.COLORS.PRIMARY,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: UI_CONFIG.SPACING.lg,
    justifyContent: 'center',
  },
  instructionsCard: {
    padding: UI_CONFIG.SPACING.lg,
    marginBottom: UI_CONFIG.SPACING.lg,
    alignItems: 'center',
  },
  instructionsTitle: {
    ...UI_CONFIG.TYPOGRAPHY.h2,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: UI_CONFIG.SPACING.sm,
  },
  instructionsText: {
    ...UI_CONFIG.TYPOGRAPHY.body,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
  codeCard: {
    padding: UI_CONFIG.SPACING.lg,
    marginBottom: UI_CONFIG.SPACING.lg,
    alignItems: 'center',
  },
  codeLabel: {
    ...UI_CONFIG.TYPOGRAPHY.h3,
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    marginBottom: UI_CONFIG.SPACING.md,
  },
  codeInputContainer: {
    flexDirection: 'row',
    gap: UI_CONFIG.SPACING.sm,
    marginBottom: UI_CONFIG.SPACING.lg,
  },
  codeInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: UI_CONFIG.COLORS.BORDER,
    borderRadius: 8,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
    fontSize: 20,
    fontWeight: 'bold',
    color: UI_CONFIG.COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  codeInputFilled: {
    borderColor: UI_CONFIG.COLORS.PRIMARY,
    backgroundColor: UI_CONFIG.COLORS.SURFACE,
  },
  orText: {
    ...UI_CONFIG.TYPOGRAPHY.caption,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    marginBottom: UI_CONFIG.SPACING.sm,
  },

  joinButton: {
    paddingVertical: UI_CONFIG.SPACING.md,
    marginBottom: UI_CONFIG.SPACING.lg,
  },
  helpText: {
    ...UI_CONFIG.TYPOGRAPHY.body,
    color: UI_CONFIG.COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
});
