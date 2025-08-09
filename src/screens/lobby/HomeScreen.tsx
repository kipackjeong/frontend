import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Alert,
    Dimensions,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { Card, CardContent } from '../../components/common';
import { Input } from '../../components/common';
import { AnimatedAvatar } from '../../components/common';
import { useNavigation } from '@react-navigation/native';
import { useUser, useAuthActions, useStore } from '../../store';
import { HomeScreenNavigationProp } from '../../types/navigation';
import LobbyButton from './LobbyButton';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';

const { width, height } = Dimensions.get('window');

interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    gamesPlayed: number;
    winRate: number;
}

const HomeScreen = () => {
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const user = useUser();
    const { logout } = useAuthActions();
    const { setCurrentRoom } = useStore();

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showJoinGamePopup, setShowJoinGamePopup] = useState(false);
    const [showRoomCodeInput, setShowRoomCodeInput] = useState(false);
    const [roomCodeInput, setRoomCodeInput] = useState('');
    const [isJoiningRoom, setIsJoiningRoom] = useState(false);
    const [joinError, setJoinError] = useState<string | null>(null);
    const [isCreatingRoom, setIsCreatingRoom] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [avatarMood, setAvatarMood] = useState<'happy' | 'excited' | 'focused' | 'sleepy' | 'surprised'>('happy');

    const handleJoinGame = () => {
        setAvatarMood('focused');
        setTimeout(() => setAvatarMood('happy'), 3000);
        setShowJoinGamePopup(true);
    };

    const handleCloseJoinGamePopup = () => {
        setShowJoinGamePopup(false);
        setShowRoomCodeInput(false);
        setRoomCodeInput('');
    };

    const handleShowRoomCodeInput = () => {
        setShowRoomCodeInput(true);
    };

    const handleBackToOptions = () => {
        setShowRoomCodeInput(false);
        setRoomCodeInput('');
    };

    const handleJoinWithCode = async () => {
        if (!roomCodeInput.trim()) {
            setJoinError('Please enter a room code');
            return;
        }

        setIsJoiningRoom(true);
        setJoinError(null);

        try {
            const joinedRoom = await apiService.joinRoom(roomCodeInput.trim().toUpperCase());
            console.log('💕 Join room api result:', joinedRoom);

            setCurrentRoom(joinedRoom);
            // Join the room via Socket.IO for real-time updates
            socketService.emit('room:join', { code: roomCodeInput.trim().toUpperCase() });

            // Close popup and navigate to RoomLobby
            handleCloseJoinGamePopup();
            navigation.navigate('RoomLobby', {
                roomId: joinedRoom.id,
                roomCode: joinedRoom.code
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to join room';
            setJoinError(errorMessage);
            Alert.alert('Error', errorMessage);
        } finally {
            setIsJoiningRoom(false);
        }
    };

    const handleCreateRoom = async () => {
        setIsCreatingRoom(true);
        setCreateError(null);

        try {
            // Create room with hardcoded empty title and default max_players (6)
            const newRoom = await apiService.createRoom({ name: '' });
            console.log('💕 newRoom:', newRoom);

            // Populate room store with created room data
            setCurrentRoom(newRoom);
            socketService.emit('room:join', { code: newRoom.code });

            // Close popup and navigate to RoomLobby
            handleCloseJoinGamePopup();
            navigation.navigate('RoomLobby', {
                roomId: newRoom.id,
                roomCode: newRoom.code
            });

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create room';
            setCreateError(errorMessage);
            Alert.alert('Error', errorMessage);
        } finally {
            setIsCreatingRoom(false);
        }
    };

    const handleSettings = () => {
        setAvatarMood('surprised');
        Alert.alert('Settings', '⚙️ Settings coming soon!');
        setTimeout(() => setAvatarMood('happy'), 2000);
        setShowUserMenu(false);
    };

    const handleLogout = async () => {
        console.log('🚨 DEBUG: handleLogout called!');
        try {
            console.log('🚨 DEBUG: Starting logout process...');
            setAvatarMood('sleepy');
            setShowUserMenu(false);

            // Call the real logout function from the store
            console.log('🚨 DEBUG: About to call logout() from store...');
            await logout();
            console.log('🚨 DEBUG: logout() completed');

            // Success feedback
            Alert.alert(
                '👋 Sign Out',
                'You have been logged out successfully!',
                [{ text: 'OK', style: 'default' }]
            );
        } catch (error) {
            console.error('Logout error:', error);
            Alert.alert(
                'Sign Out Error',
                'There was an issue signing out. Please try again.',
                [{ text: 'OK', style: 'default' }]
            );
        }
    };

    const getUserInitials = (username: string) => {
        return username.slice(0, 2).toUpperCase();
    };

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['##FFFFFF', '#f5f1eb']}
                style={styles.backgroundGradient}
            >
                {/* App Bar */}
                <View style={styles.appBar}>

                    <View style={styles.appBarContent}>
                        {/* User Avatar */}
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={() => setShowUserMenu(!showUserMenu)}
                        >
                            <View style={styles.avatar}>
                                <LinearGradient
                                    colors={['rgba(139, 69, 19, 0.1)', 'rgba(34, 139, 34, 0.1)']}
                                    style={styles.avatarGradient}
                                >
                                    <Text style={styles.avatarText}>
                                        {getUserInitials(user?.username || '')}
                                    </Text>
                                </LinearGradient>
                            </View>
                            <View style={styles.onlineIndicator} />
                        </TouchableOpacity>
                    </View>

                    {/* User Menu Dropdown */}
                    {showUserMenu && (
                        <>
                            {/* Transparent overlay to close menu when clicking outside */}
                            <TouchableOpacity
                                style={styles.menuOverlay}
                                activeOpacity={1}
                                onPress={() => setShowUserMenu(false)}
                            />
                            <View style={styles.userMenuContainer}>
                                <Card style={styles.userMenu}>
                                    <CardContent style={styles.userMenuContent}>
                                        <View style={styles.userInfo}>
                                            <View style={styles.userInfoHeader}>
                                                <View style={styles.avatar}>
                                                    <LinearGradient
                                                        colors={['rgba(139, 69, 19, 0.1)', 'rgba(34, 139, 34, 0.1)']}
                                                        style={styles.avatarGradient}
                                                    >
                                                        <Text style={styles.avatarText}>
                                                            {getUserInitials(user?.username || '')}
                                                        </Text>
                                                    </LinearGradient>
                                                </View>
                                                <View style={styles.userTextInfo}>
                                                    <Text style={styles.username}>{user?.username}</Text>
                                                    <Text style={styles.userEmail}>{user?.email}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.userMenuSeparator} />

                                        <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
                                            <Icon name="settings" size={16} color="#6b5b47" />
                                            <Text style={styles.menuItemText}>Settings</Text>
                                        </TouchableOpacity>

                                        <View style={styles.userMenuSeparator} />

                                        <TouchableOpacity
                                            style={styles.menuItem}
                                            onPress={handleLogout}
                                            onPressIn={() => console.log('🚨 DEBUG: TouchableOpacity PRESSED IN!')}
                                            onPressOut={() => console.log('🚨 DEBUG: TouchableOpacity PRESSED OUT!')}
                                            activeOpacity={0.7}
                                        >
                                            <Icon name="log-out" size={16} color="#dc2626" />
                                            <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>Sign Out</Text>
                                        </TouchableOpacity>
                                    </CardContent>
                                </Card>
                            </View>
                        </>
                    )}
                </View>

                {/* Main Content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Welcome Section with Enhanced Animated Avatar */}
                    <View style={styles.welcomeSection}>
                        {/* Enhanced Animated Avatar Character */}
                        <View style={styles.avatarSection}>
                            <AnimatedAvatar
                                size="lg"
                                mood={avatarMood}
                                interactive={true}
                            />
                        </View>

                        <Text style={styles.welcomeTitle}>
                            초성 빙고
                        </Text>
                        <Text style={styles.welcomeSubtitle}>
                            Ready to test your Korean consonant skills? Master the art of 초성 (choseong) and compete in exciting bingo matches!
                        </Text>
                    </View>

                    <View style={styles.buttonsContainer}>
                        <LobbyButton
                            style={styles.gameStartButton}
                            onPress={handleJoinGame}
                            gradient={true}
                            gradientColors={['#8b4513', '#228b22']}
                        >
                            <Text style={styles.buttonText}>게임 시작</Text>
                        </LobbyButton>
                    </View>

                    {/* Development Section - Only visible in development mode */}
                    {__DEV__ && (
                        <View style={styles.developmentSection}>
                            <View style={styles.developmentHeader}>
                                <Icon name="code" size={16} color="#dc2626" />
                                <Text style={styles.developmentTitle}>Development Tools</Text>
                            </View>

                            <View style={styles.developmentButtons}>
                                <TouchableOpacity
                                    style={styles.devButton}
                                    onPress={() => navigation.navigate('VotingScreen', {
                                        roomId: 'dev-room',
                                        votingSession: {
                                            room_id: 'dev-room',
                                            consonant_options: [],
                                            votes: [],
                                            voting_started_at: new Date().toISOString(),
                                            voting_duration: 30,
                                            total_players: 1,
                                            status: 'active'
                                        }
                                    })}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="check-circle" size={16} color="#8b4513" />
                                    <Text style={styles.devButtonText}>Voting Screen</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.devButton}
                                    onPress={() => navigation.navigate('PreGameBoardScreen', {
                                        roomId: 'dev-room',
                                        winnerConsonant: 'ㅇㅅ'
                                    })}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="grid" size={16} color="#8b4513" />
                                    <Text style={styles.devButtonText}>Bingo Board</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.developmentNote}>
                                🚧 These screens are only accessible in development mode
                            </Text>
                        </View>
                    )}
                </ScrollView>

                {/* Join Game Popup */}
                {showJoinGamePopup && (
                    <>
                        {/* Overlay */}
                        <TouchableOpacity
                            style={styles.popupOverlay}
                            activeOpacity={1}
                            onPress={handleCloseJoinGamePopup}
                        />

                        {/* Popup Card */}
                        <View style={styles.popupContainer}>
                            <Card style={styles.popupCard}>
                                <CardContent style={styles.popupContent}>
                                    {!showRoomCodeInput ? (
                                        /* Options View */
                                        <>
                                            <Text style={styles.popupTitle}>게임 참가하기</Text>
                                            <Text style={styles.popupSubtitle}>어떤 방식으로 참가하시겠어요?</Text>

                                            <View style={styles.popupButtonsContainer}>
                                                {/* Random Search Button */}
                                                <TouchableOpacity
                                                    style={[styles.popupButton, styles.randomButton]}
                                                    activeOpacity={0.8}
                                                >
                                                    <LinearGradient
                                                        colors={['#3b82f6', '#1d4ed8']}
                                                        style={styles.popupButtonGradient}
                                                    >
                                                        <Icon name="shuffle" size={20} color="#ffffff" />
                                                        <Text style={styles.popupButtonText}>랜덤 찾기</Text>
                                                    </LinearGradient>
                                                </TouchableOpacity>

                                                {/* Join with Code Button */}
                                                <TouchableOpacity
                                                    style={[styles.popupButton, styles.codeButton]}
                                                    onPress={handleShowRoomCodeInput}
                                                    activeOpacity={0.8}
                                                >
                                                    <LinearGradient
                                                        colors={['#059669', '#047857']}
                                                        style={styles.popupButtonGradient}
                                                    >
                                                        <Icon name="key" size={20} color="#ffffff" />
                                                        <Text style={styles.popupButtonText}>방 코드로 참가</Text>
                                                    </LinearGradient>
                                                </TouchableOpacity>

                                                {/* Create Room Button */}
                                                <TouchableOpacity
                                                    style={[styles.popupButton, styles.createButton, isCreatingRoom && styles.popupButtonDisabled]}
                                                    onPress={handleCreateRoom}
                                                    disabled={isCreatingRoom}
                                                    activeOpacity={0.8}
                                                >
                                                    <LinearGradient
                                                        colors={isCreatingRoom ? ['#9ca3af', '#6b7280'] : ['#8b4513', '#d97706']}
                                                        style={styles.popupButtonGradient}
                                                    >
                                                        {isCreatingRoom ? (
                                                            <>
                                                                <ActivityIndicator size="small" color="#ffffff" />
                                                                <Text style={styles.popupButtonText}>방 만드는 중...</Text>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Icon name="plus" size={20} color="#ffffff" />
                                                                <Text style={styles.popupButtonText}>방 만들기</Text>
                                                            </>
                                                        )}
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    ) : (
                                        /* Room Code Input View */
                                        <>
                                            <View style={styles.codeInputHeader}>
                                                <TouchableOpacity
                                                    style={styles.backButton}
                                                    onPress={handleBackToOptions}
                                                >
                                                    <Icon name="arrow-left" size={20} color="#8b4513" />
                                                </TouchableOpacity>
                                                <Text style={styles.popupTitle}>방 코드 입력</Text>
                                            </View>

                                            <Text style={styles.popupSubtitle}>참가하실 방의 코드를 입력해주세요</Text>

                                            <View style={styles.codeInputContainer}>
                                                <Input
                                                    value={roomCodeInput}
                                                    onChangeText={setRoomCodeInput}
                                                    placeholder="방 코드 입력"
                                                    style={styles.codeInput}
                                                    maxLength={8}
                                                    autoCapitalize="characters"
                                                />

                                                {joinError && (
                                                    <Text style={styles.errorText}>{joinError}</Text>
                                                )}

                                                <TouchableOpacity
                                                    style={[styles.joinButton, (!roomCodeInput.trim() || isJoiningRoom) && styles.joinButtonDisabled]}
                                                    onPress={handleJoinWithCode}
                                                    disabled={!roomCodeInput.trim() || isJoiningRoom}
                                                    activeOpacity={0.8}
                                                >
                                                    <LinearGradient
                                                        colors={(roomCodeInput.trim() && !isJoiningRoom)
                                                            ? ['#059669', '#047857']
                                                            : ['#9ca3af', '#6b7280']
                                                        }
                                                        style={styles.joinButtonGradient}
                                                    >
                                                        {isJoiningRoom ? (
                                                            <>
                                                                <ActivityIndicator size="small" color="#ffffff" />
                                                                <Text style={styles.joinButtonText}>참가 중...</Text>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Icon name="log-in" size={18} color="#ffffff" />
                                                                <Text style={styles.joinButtonText}>참가하기</Text>
                                                            </>
                                                        )}
                                                    </LinearGradient>
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </View>
                    </>
                )}

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
        backgroundColor: '##FFFFFF',
    },
    backgroundGradient: {
        flex: 1,
    },
    appBar: {
        position: 'relative',
        zIndex: 10,
    },
    appBarContent: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    logoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoIcon: {
        position: 'relative',
    },
    logoIconGradient: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(139, 69, 19, 0.2)',
        shadowColor: '#2d2016',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    logoText: {
        gap: 2,
    },
    logoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#8b4513',
    },
    logoSubtitle: {
        fontSize: 10,
        color: '#6b5b47',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(139, 69, 19, 0.2)',
        overflow: 'hidden',
    },
    avatarGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8b4513',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22c55e',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    userMenuContainer: {
        position: 'absolute',
        top: '100%',
        right: 24,
        zIndex: 100,
        width: 240,
    },
    userMenu: {
        marginTop: 8,
        shadowColor: '#2d2016',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 100,
    },
    userMenuContent: {
        padding: 16,
    },
    userInfo: {
        gap: 12,
    },
    userInfoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userTextInfo: {
        flex: 1,
        gap: 2,
    },
    username: {
        fontSize: 14,
        fontWeight: '600',
        color: '#2d2016',
    },
    userEmail: {
        fontSize: 12,
        color: '#6b5b47',
    },
    userStatsContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    userMenuSeparator: {
        height: 1,
        backgroundColor: 'rgba(45, 32, 22, 0.08)',
        marginVertical: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        zIndex: 100,
    },
    menuItemText: {
        fontSize: 14,
        color: '#2d2016',
        fontWeight: '500',
    },
    menuItemTextDanger: {
        color: '#dc2626',
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 15,
    },
    menuOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 50,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
        maxWidth: 400,
        alignSelf: 'center',
        width: '100%',
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarSection: {
        marginBottom: 24,
        alignItems: 'center',
    },
    welcomeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#8b4513',
        textAlign: 'center',
        marginBottom: 12,
    },
    welcomeSubtitle: {
        fontSize: 14,
        color: '#6b5b47',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 16,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        borderWidth: 1,
        borderColor: 'rgba(139, 69, 19, 0.1)',
    },
    statText: {
        fontSize: 14,
    },
    statNumber: {
        fontWeight: '600',
        color: '#2d2016',
    },
    statLabel: {
        color: '#6b5b47',
    },
    buttonsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 32,
    },
    gameStartButton: {
        width: '60%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 12,
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 12,
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    tipSection: {
        marginBottom: 16,
    },
    tipCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(45, 32, 22, 0.08)',
    },
    tipCardContent: {
        padding: 24,
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    tipIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#bfdbfe',
        overflow: 'hidden',
    },
    tipIconGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#2d2016',
    },
    tipContent: {
        fontSize: 14,
        color: '#6b5b47',
        lineHeight: 20,
    },
    tipBold: {
        fontWeight: '600',
    },
    bottomLine: {
        height: 8,
        opacity: 0.2,
    },
    // Development section styles
    developmentSection: {
        marginTop: 32,
        padding: 20,
        backgroundColor: 'rgba(220, 38, 38, 0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(220, 38, 38, 0.2)',
        borderStyle: 'dashed',
    },
    developmentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    developmentTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#dc2626',
    },
    developmentButtons: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    devButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#ffffff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(139, 69, 19, 0.2)',
        shadowColor: '#2d2016',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    devButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8b4513',
    },
    developmentNote: {
        fontSize: 12,
        color: '#6b5b47',
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: 8,
    },
    // Popup styles
    popupOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        justifyContent: 'center',
        alignItems: 'center',
    },
    popupContainer: {
        position: 'absolute',
        top: "30%",
        width: '85%',
        maxWidth: 340,
        zIndex: 1001,
        alignSelf: 'center'
    },
    popupCard: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
    },
    popupContent: {
        padding: 24,
        alignItems: 'center',
    },
    popupTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2d2016',
        textAlign: 'center',
        marginBottom: 8,
    },
    popupSubtitle: {
        fontSize: 14,
        color: '#6b5b47',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    popupButtonsContainer: {
        width: '100%',
        gap: 12,
    },
    popupButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginVertical: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    popupButtonDisabled: {
        opacity: 0.6,
    },
    popupButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 10,
    },
    popupButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    randomButton: {},
    codeButton: {},
    createButton: {},
    // Room code input styles
    codeInputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        width: '100%',
    },
    backButton: {
        padding: 8,
        borderRadius: 8,
        marginRight: 12,
    },
    codeInputContainer: {
        width: '100%',
        gap: 16,
    },
    codeInput: {
        borderWidth: 2,
        borderColor: '#d4b896',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        backgroundColor: '#faf8f3',
        letterSpacing: 2,
    },
    joinButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    joinButtonDisabled: {
        opacity: 0.6,
    },
    joinButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 8,
    },
    joinButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    errorText: {
        color: '#dc2626',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 8,
    },
});

export default HomeScreen;