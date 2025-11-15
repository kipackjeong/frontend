import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { Card, CardContent, CardHeader } from '../../components/common';
import { Button } from '../../components/common';
import { Input } from '../../components/common';
import { Badge } from '../../components/common';
import { useAuthActions, useStore } from '../../store';
import { AuthCredentials } from '../../types';

const { width, height } = Dimensions.get('window');

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
}

const LoginScreen = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Authentication state from store
  const { login, register } = useAuthActions();
  const { isLoading, error: authError, user } = useStore();

  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    username: ''
  });

  const [errors, setErrors] = useState<Partial<AuthFormData>>({});

  // Handle authentication success
  useEffect(() => {
    if (user?.isAuthenticated) {
      Alert.alert(
        'Success!',
        activeTab === 'login' ? '📚 Welcome back!' : '🎉 Welcome to Word Game!',
        [{
          text: 'OK', onPress: () => {
            // Navigation will be handled by App.tsx based on authentication state
          }
        }]
      );
    }
  }, [user?.isAuthenticated, activeTab]);

  const handleInputChange = (field: keyof AuthFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (isSignup: boolean) => {
    const newErrors: Partial<AuthFormData> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignup) {
      if (!formData.username) {
        newErrors.username = 'Username is required';
      } else if (formData.username.length < 3) {
        newErrors.username = 'Username must be at least 3 characters';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords don't match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm(false)) return;

    try {
      const credentials: AuthCredentials = {
        email: formData.email,
        password: formData.password,
      };
      await login(credentials);
      // Success handling is done by useEffect watching user state
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Login failed. Please try again.');
    }
  };

  const handleSignup = async () => {
    if (!validateForm(true)) return;

    try {
      const credentials = {
        email: formData.email,
        password: formData.password,
        username: formData.username,
      };
      await register(credentials);
      // Success handling is done by useEffect watching user state
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Signup failed. Please try again.');
    }
  };

  const handleSubmit = async (isSignup: boolean) => {
    if (isSignup) {
      await handleSignup();
    } else {
      await handleLogin();
    }
  };

  // Mock credentials for quick testing (development only)
  const fillMockCredentials = () => {
    setFormData(prev => ({
      ...prev,
      email: 'player1@example.com',
      password: 'password123',
    }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#FFFFFF', '#f5f1eb']}
        style={styles.backgroundGradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <Text style={styles.title}>초성 빙고</Text>
            </View>

            {/* Auth Card */}
            <Card style={styles.authCard}>
              <CardHeader style={styles.authHeader}>
                <Text style={styles.authTitle}>
                  {activeTab === 'login' ? 'Welcome Back!' : 'Join the Café'}
                </Text>
                <Text style={styles.authSubtitle}>
                  {activeTab === 'login'
                    ? 'Ready for another word adventure?'
                    : 'Create your account to start playing'
                  }
                </Text>
              </CardHeader>

              <CardContent style={styles.authContent}>
                {/* Tab Selector */}
                <View style={styles.tabContainer}>
                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'login' && styles.activeTab]}
                    onPress={() => setActiveTab('login')}
                  >
                    <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>
                      Sign In
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tab, activeTab === 'signup' && styles.activeTab]}
                    onPress={() => setActiveTab('signup')}
                  >
                    <Text style={[styles.tabText, activeTab === 'signup' && styles.activeTabText]}>
                      Sign Up
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Login Form */}
                {activeTab === 'login' && (
                  <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Email Address</Text>
                      <Input
                        value={formData.email}
                        onChangeText={(text: string) => handleInputChange('email', text)}
                        placeholder="your.email@example.com"
                        style={StyleSheet.flatten([styles.input, errors.email ? styles.inputError : undefined])}
                        textStyle={styles.inputText}
                      />
                      {errors.email && (
                        <Text style={styles.errorText}>{errors.email}</Text>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.passwordContainer}>
                        <Input
                          value={formData.password}
                          onChangeText={(text: string) => handleInputChange('password', text)}
                          placeholder="Enter your password"
                          secureTextEntry={!showPassword}
                          style={StyleSheet.flatten([styles.passwordInput, errors.password ? styles.inputError : undefined])}
                          textStyle={styles.inputText}
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Icon
                            name={showPassword ? 'eye-off' : 'eye'}
                            size={16}
                            color="#6b5b47"
                          />
                        </TouchableOpacity>
                      </View>
                      {errors.password && (
                        <Text style={styles.errorText}>{errors.password}</Text>
                      )}
                    </View>

                    {/* Authentication Error Display */}
                    {authError && (
                      <View style={styles.authErrorContainer}>
                        <Text style={styles.errorText}>{authError}</Text>
                      </View>
                    )}

                    <Button
                      onPress={() => handleSubmit(false)}
                      disabled={isLoading}
                      style={styles.submitButton}
                      gradient={true}
                      gradientColors={['#8b4513', '#228b22']}
                    >
                      <View style={styles.buttonContent}>
                        {isLoading ? (
                          <>
                            <View style={styles.loadingSpinner} />
                            <Text style={styles.buttonText}>Signing In...</Text>
                          </>
                        ) : (
                          <>
                            <Icon name="coffee" size={16} color="#ffffff" />
                            <Text style={styles.buttonText}>Sign in</Text>
                          </>
                        )}
                      </View>
                    </Button>

                    <TouchableOpacity style={styles.forgotPassword}>
                      <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                    </TouchableOpacity>

                    {/* Development Mock Credentials */}
                    {__DEV__ && (
                      <View style={styles.devSection}>
                        <View style={styles.devDivider} />
                        <Text style={styles.devSectionTitle}>Development Testing</Text>
                        <TouchableOpacity
                          style={styles.devButton}
                          onPress={fillMockCredentials}
                        >
                          <Icon name="zap" size={14} color="#8b4513" />
                          <Text style={styles.devButtonText}>Fill Test Credentials</Text>
                        </TouchableOpacity>
                        <Text style={styles.devHint}>Email: player1@example.com | Password: password123</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Signup Form */}
                {activeTab === 'signup' && (
                  <View style={styles.formContainer}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Username</Text>
                      <Input
                        value={formData.username}
                        onChangeText={(text: string) => handleInputChange('username', text)}
                        placeholder="Your game name"
                        style={StyleSheet.flatten([styles.input, errors.username ? styles.inputError : undefined])}
                        textStyle={styles.inputText}
                      />
                      {errors.username && (
                        <Text style={styles.errorText}>{errors.username}</Text>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Email Address</Text>
                      <Input
                        value={formData.email}
                        onChangeText={(text: string) => handleInputChange('email', text)}
                        placeholder="your.email@example.com"
                        style={[styles.input, errors.email && styles.inputError]}
                        textStyle={styles.inputText}
                      />
                      {errors.email && (
                        <Text style={styles.errorText}>{errors.email}</Text>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.passwordContainer}>
                        <Input
                          value={formData.password}
                          onChangeText={(text: string) => handleInputChange('password', text)}
                          placeholder="Create a password"
                          secureTextEntry={!showPassword}
                          style={StyleSheet.flatten([styles.passwordInput, errors.password ? styles.inputError : undefined])}
                          textStyle={styles.inputText}
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowPassword(!showPassword)}
                        >
                          <Icon
                            name={showPassword ? 'eye-off' : 'eye'}
                            size={16}
                            color="#6b5b47"
                          />
                        </TouchableOpacity>
                      </View>
                      {errors.password && (
                        <Text style={styles.errorText}>{errors.password}</Text>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Confirm Password</Text>
                      <View style={styles.passwordContainer}>
                        <Input
                          value={formData.confirmPassword}
                          onChangeText={(text: string) => handleInputChange('confirmPassword', text)}
                          placeholder="Confirm your password"
                          secureTextEntry={!showConfirmPassword}
                          style={StyleSheet.flatten([styles.passwordInput, errors.confirmPassword ? styles.inputError : undefined])}
                          textStyle={styles.inputText}
                        />
                        <TouchableOpacity
                          style={styles.eyeButton}
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <Icon
                            name={showConfirmPassword ? 'eye-off' : 'eye'}
                            size={16}
                            color="#6b5b47"
                          />
                        </TouchableOpacity>
                      </View>
                      {errors.confirmPassword && (
                        <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                      )}
                    </View>

                    {/* Authentication Error Display */}
                    {authError && (
                      <View style={styles.authErrorContainer}>
                        <Text style={styles.errorText}>{authError}</Text>
                      </View>
                    )}

                    <Button
                      onPress={() => handleSubmit(true)}
                      disabled={isLoading}
                      style={styles.submitButton}
                      gradient={true}
                      gradientColors={['#8b4513', '#228b22']}
                    >
                      <View style={styles.buttonContent}>
                        {isLoading ? (
                          <>
                            <View style={styles.loadingSpinner} />
                            <Text style={styles.buttonText}>Creating Account...</Text>
                          </>
                        ) : (
                          <>
                            <Icon name="book-open" size={16} color="#ffffff" />
                            <Text style={styles.buttonText}>Join the Café</Text>
                          </>
                        )}
                      </View>
                    </Button>

                    <View style={styles.termsContainer}>
                      <Text style={styles.termsText}>
                        By signing up, you agree to our{' '}
                        <Text style={styles.termsLink}>Terms</Text>
                        {' '}and{' '}
                        <Text style={styles.termsLink}>Privacy Policy</Text>
                      </Text>
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Bottom gradient line */}
        <LinearGradient
          colors={['#8b4513', '#228b22', '#8b4513']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomLine}
        />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  backgroundGradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 24,
  },
  mainIcon: {
    position: 'relative',
  },
  iconGradient: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(139, 69, 19, 0.2)',
    shadowColor: '#2d2016',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  smallIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  smallIconGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(34, 139, 34, 0.2)',
    shadowColor: '#2d2016',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8b4513',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#6b5b47',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.1)',
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b4513',
  },
  statTextAccent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#228b22',
  },
  featuresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  featureBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  featureBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d2016',
  },
  authCard: {
    marginHorizontal: 16,
    maxWidth: 400,
    alignSelf: 'center',
    width: width - 32,
  },
  authHeader: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#8b4513',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#6b5b47',
    textAlign: 'center',
    lineHeight: 18,
  },
  authContent: {
    gap: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 241, 235, 0.5)',
    borderRadius: 12,
    padding: 4,
    height: 48,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#8b4513',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b5b47',
  },
  activeTabText: {
    color: '#ffffff',
  },
  formContainer: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d2016',
  },
  input: {
    height: 48,
    borderColor: 'rgba(45, 32, 22, 0.12)',
    borderRadius: 8,
  },
  inputError: {
    borderColor: '#dc2626',
    borderWidth: 2,
  },
  inputText: {
    fontSize: 16,
    color: '#2d2016',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    height: 48,
    paddingRight: 48,
    borderColor: 'rgba(45, 32, 22, 0.12)',
    borderRadius: 8,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
  errorText: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 4,
  },
  authErrorContainer: {
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  submitButton: {
    height: 48,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSpinner: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderTopColor: 'transparent',
    borderRadius: 8,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#8b4513',
    fontWeight: '600',
  },
  termsContainer: {
    marginTop: 8,
  },
  termsText: {
    fontSize: 12,
    color: '#6b5b47',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#8b4513',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  bottomLine: {
    height: 8,
    opacity: 0.2,
  },
  // Development testing styles
  devSection: {
    marginTop: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  devDivider: {
    width: '60%',
    height: 1,
    backgroundColor: 'rgba(139, 69, 19, 0.2)',
    marginBottom: 12,
  },
  devSectionTitle: {
    fontSize: 12,
    color: '#8b4513',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 69, 19, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 69, 19, 0.2)',
    gap: 6,
    marginBottom: 6,
  },
  devButtonText: {
    fontSize: 12,
    color: '#8b4513',
    fontWeight: '500',
  },
  devHint: {
    fontSize: 10,
    color: '#6b5b47',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default LoginScreen;