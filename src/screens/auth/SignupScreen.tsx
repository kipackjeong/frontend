/**
 * Signup Screen - User registration
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
import { RegisterData } from '../../types';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../../types/navigation';

type SignupScreenProps = StackScreenProps<RootStackParamList, 'Signup'>;

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState<RegisterData>({
    username: '',
    email: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<RegisterData & { confirmPassword: string }>>({});
  
  const { register } = useAuthActions();
  const { isLoading, error: authError, user } = useStore();

  // Navigate on successful registration
  useEffect(() => {
    // App navigation switches to authenticated stack when user is set
  }, [user?.isAuthenticated]);

  const validateForm = (): boolean => {
    const newErrors: Partial<RegisterData & { confirmPassword: string }> = {};

    // Username validation
    if (!formData.username) {
      newErrors.username = '사용자명을 입력해주세요';
    } else if (formData.username.length < 2) {
      newErrors.username = '사용자명은 최소 2자 이상이어야 합니다';
    } else if (formData.username.length > 20) {
      newErrors.username = '사용자명은 최대 20자까지 입력 가능합니다';
    } else if (!/^[a-zA-Z0-9가-힣_]+$/.test(formData.username)) {
      newErrors.username = '사용자명은 영문, 한글, 숫자, 밑줄(_)만 사용 가능합니다';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다';
    } else if (formData.password.length > 50) {
      newErrors.password = '비밀번호는 최대 50자까지 입력 가능합니다';
    }

    // Confirm password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
    } else if (formData.password !== confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      await register(formData);
      // Success is handled by useEffect
    } catch (error: any) {
      Alert.alert('회원가입 실패', error.message || '회원가입에 실패했습니다');
    }
  };

  const handleLoginNavigation = () => {
    navigation?.navigate('Login');
  };

  // Mock data for quick testing
  const fillMockData = () => {
    setFormData({
      username: 'TestUser',
      email: 'newuser@example.com',
      password: 'password123',
    });
    setConfirmPassword('password123');
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
            새 계정을 만들어보세요
          </Text>
        </View>

        <Card variant="elevated" padding="large">
          <Text variant="h3" weight="semibold" style={styles.formTitle}>
            회원가입
          </Text>

          <Input
            label="사용자명"
            value={formData.username}
            onChangeText={(username) => setFormData({ ...formData, username })}
            placeholder="게임에서 사용할 이름"
            maxLength={20}
            error={errors.username}
          />

          <Input
            label="이메일"
            value={formData.email}
            onChangeText={(email) => setFormData({ ...formData, email })}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Input
            label="비밀번호"
            value={formData.password}
            onChangeText={(password) => setFormData({ ...formData, password })}
            placeholder="비밀번호를 입력하세요"
            secureTextEntry
            maxLength={50}
            error={errors.password}
          />

          <Input
            label="비밀번호 확인"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="비밀번호를 다시 입력하세요"
            secureTextEntry
            maxLength={50}
            error={errors.confirmPassword}
          />

          {authError && (
            <Text color="error" style={styles.errorMessage}>
              {authError}
            </Text>
          )}

          <Button
            title="회원가입"
            onPress={handleSignup}
            loading={isLoading}
            fullWidth
            size="large"
          />

          <View style={styles.loginSection}>
            <Text color="secondary">
              이미 계정이 있으신가요?{' '}
            </Text>
            <Button
              title="로그인"
              variant="text"
              onPress={handleLoginNavigation}
            />
          </View>

          {__DEV__ && (
            <View style={styles.devSection}>
              <Text variant="caption" color="secondary" align="center">
                개발 모드 - 빠른 테스트
              </Text>
              <Button
                title="테스트 데이터로 채우기"
                variant="outline"
                size="small"
                onPress={fillMockData}
              />
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
  
  loginSection: {
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

export default SignupScreen;
