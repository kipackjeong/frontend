/**
 * Login Screen - User authentication
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Button, Input, Card, Text } from '../../components/common';
import { useAuthActions, useStore } from '../../store';
import { AuthCredentials } from '../../types';

interface LoginScreenProps {
  navigation: any; // Replace with proper navigation type
  onLoginSuccess?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({
  navigation,
  onLoginSuccess,
}) => {
  const [credentials, setCredentials] = useState<AuthCredentials>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Partial<AuthCredentials>>({});

  const { login } = useAuthActions();
  const { isLoading, error: authError, user } = useStore();

  // Navigate on successful login
  useEffect(() => {
    if (user?.isAuthenticated) {
      onLoginSuccess?.();
    }
  }, [user?.isAuthenticated, onLoginSuccess]);

  const validateForm = (): boolean => {
    const newErrors: Partial<AuthCredentials> = {};

    // Email validation
    if (!credentials.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credentials.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    // Password validation
    if (!credentials.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (credentials.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await login(credentials);
      // Success is handled by useEffect
    } catch (error: any) {
      Alert.alert('로그인 실패', error.message || '로그인에 실패했습니다');
    }
  };

  const handleSignupNavigation = () => {
    navigation?.navigate('Signup');
  };

  // Mock credentials for quick testing
  const fillMockCredentials = () => {
    setCredentials({
      email: 'player1@example.com',
      password: 'password123',
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text variant="h1" weight="bold" align="center">
            초성빙고
          </Text>
          <Text variant="body" color="secondary" align="center">
            친구들과 함께하는 단어 빙고 게임
          </Text>
        </View>

        <Card variant="elevated" padding="large">
          <Text variant="h3" weight="semibold" style={styles.formTitle}>
            로그인
          </Text>

          <Input
            value={credentials.email}
            onChangeText={(email) => setCredentials({ ...credentials, email })}
            placeholder="your@email.com"
            error={errors.email}
          />

          <Input
            value={credentials.password}
            onChangeText={(password) => setCredentials({ ...credentials, password })}
            placeholder="비밀번호를 입력하세요"
            secureTextEntry
            error={errors.password}
          />

          {authError && (
            <Text color="error" style={styles.errorMessage}>
              {authError}
            </Text>
          )}

          <Button
            onPress={handleLogin}
            disabled={isLoading}
            size="lg"
          >
            로그인
          </Button>

          <View style={styles.signupSection}>
            <Text color="secondary">
              계정이 없으신가요?{' '}
            </Text>
            <Button
              variant="default"
              onPress={handleSignupNavigation}
            >
              회원가입
            </Button>
          </View>

          {__DEV__ && (
            <View style={styles.devSection}>
              <Text variant="caption" color="secondary" align="center">
                개발 모드 - 빠른 테스트
              </Text>
              <Button
                variant="outline"
                size="sm"
                onPress={fillMockCredentials}
              >
                테스트 계정으로 로그인
              </Button>
            </View>
          )}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },

  header: {
    alignItems: 'center',
    marginBottom: 40,
  },

  formTitle: {
    marginBottom: 24,
  },

  errorMessage: {
    marginBottom: 16,
    textAlign: 'center',
  },

  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },

  devSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    gap: 8,
  },
});

export default LoginScreen;
