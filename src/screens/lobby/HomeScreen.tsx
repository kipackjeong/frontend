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
import HomeHeader from '../../components/lobby/HomeHeader';
import PrimaryActions from '../../components/lobby/PrimaryActions';
import HowToPlayCard from '../../components/lobby/HowToPlayCard';
import { useNavigation } from '@react-navigation/native';
import { useUser, useAuthActions, useStore } from '../../store';
import { HomeScreenNavigationProp } from '../../types/navigation';
import { apiService } from '../../services/api';
import { socketService } from '../../services/socket';
import { KS_DEV_BOARD } from '../../constants/devBoards';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    gamesPlayed: number;
    winRate: number;
}

const DEV_KS_CODE_KEY = '@dev_ks_room_code';

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
                colors={['#FFFFFF', '#f5f1eb']}
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
                    <HomeHeader mood={avatarMood} />
                    <PrimaryActions
                        onQuickPlay={handleJoinGame}
                        onCreateRoom={handleCreateRoom}
                        onJoinWithCode={handleShowRoomCodeInput}
                        loadingCreate={isCreatingRoom}
                    />
                    <HowToPlayCard />

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
                                        winnerConsonant: 'ㄱㅅ'
                                    })}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="grid" size={16} color="#8b4513" />
                                    <Text style={styles.devButtonText}>Bingo Board (dev-room)</Text>
                                </TouchableOpacity>
                                
                                {/* Dev: Auto-join ㄱㅅ room (use canonical code if present, else discover/create) */}
                                <TouchableOpacity
                                    style={styles.devButton}
                                    onPress={async () => {
                                        try {
                                            if (!user?.id) {
                                                Alert.alert('Not signed in', 'User ID is missing. Please login.');
                                                return;
                                            }

                                            // Ensure socket connection for room join emit
                                            if (!socketService.isConnected()) {
                                                try {
                                                    await socketService.connect(user.id);
                                                } catch (e) {
                                                    console.warn('Socket connect failed, continuing with API step first:', e);
                                                }
                                            }

                                            // Find the latest DEV_ㄱㅅ room
                                            const rooms = await apiService.getAvailableRooms();
                                            const devRooms = (rooms || []).filter((r: any) => typeof r?.name === 'string' && r.name.startsWith('DEV_ㄱㅅ'));
                                            let targetRoom: any | null = null;

                                            if (devRooms.length > 0) {
                                                // Prefer most recently updated if timestamps exist, else take the last
                                                targetRoom = devRooms.sort((a: any, b: any) => {
                                                    const aT = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
                                                    const bT = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
                                                    return aT - bT;
                                                })[devRooms.length - 1];
                                            }

                                            if (targetRoom) {
                                                // Join via REST and socket
                                                const joined = await apiService.joinRoom(targetRoom.code);
                                                setCurrentRoom(joined);
                                                socketService.emit('room:join', { code: joined.code });
                                                navigation.navigate('PreGameBoardScreen', {
                                                    roomId: joined.id,
                                                    winnerConsonant: 'ㄱㅅ'
                                                });
                                                return;
                                            }

                                            // If not found, create a new DEV_ㄱㅅ room and go
                                            const newRoom = await apiService.createRoom({ name: 'DEV_ㄱㅅ' });
                                            setCurrentRoom(newRoom);
                                            socketService.emit('room:join', { code: newRoom.code });
                                            navigation.navigate('PreGameBoardScreen', {
                                                roomId: newRoom.id,
                                                winnerConsonant: 'ㄱㅅ'
                                            });
                                        } catch (err) {
                                            const msg = err instanceof Error ? err.message : 'Failed to auto-join ㄱㅅ dev room';
                                            Alert.alert('Error', msg);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="log-in" size={16} color="#8b4513" />
                                    <Text style={styles.devButtonText}>Join ㄱㅅ Dev Room (auto)</Text>
                                </TouchableOpacity>

                                {/* Dev: Create a DEV_ㄱㅅ room then go straight to ㄱㅅ board (also persist canonical code) */}
                                <TouchableOpacity
                                    style={styles.devButton}
                                    onPress={async () => {
                                        try {
                                            const newRoom = await apiService.createRoom({ name: 'DEV_ㄱㅅ' });
                                            setCurrentRoom(newRoom);
                                            socketService.emit('room:join', { code: newRoom.code });
                                            try { await AsyncStorage.setItem(DEV_KS_CODE_KEY, (newRoom.code || '').toUpperCase()); } catch {}
                                            navigation.navigate('PreGameBoardScreen', {
                                                roomId: newRoom.id,
                                                winnerConsonant: 'ㄱㅅ'
                                            });
                                        } catch (err) {
                                            const msg = err instanceof Error ? err.message : 'Failed to create room';
                                            Alert.alert('Error', msg);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="plus-circle" size={16} color="#8b4513" />
                                    <Text style={styles.devButtonText}>Create Room → ㄱㅅ Board</Text>
                                </TouchableOpacity>

                                {/* Dev: Jump straight to In-Game with prefilled ㄱㅅ board */}
                                <TouchableOpacity
                                    style={styles.devButton}
                                    onPress={async () => {
                                        try {
                                            if (!user?.id) {
                                                Alert.alert('Not signed in', 'User ID is missing. Please login.');
                                                return;
                                            }

                                            // 1) Ensure socket is connected (with token if available)
                                            if (!socketService.isConnected()) {
                                                const token = (apiService as any)?.getAccessToken?.() || undefined;
                                                try {
                                                    await socketService.connect(user.id, token);
                                                } catch (e) {
                                                    console.warn('Socket connect failed, continuing...', e);
                                                }
                                            }

                                            // 2) Use canonical code if available; else discover/create and persist
                                            let activeRoom: any | null = null;
                                            let storedCode = (await AsyncStorage.getItem(DEV_KS_CODE_KEY)) || '';
                                            storedCode = storedCode.trim().toUpperCase();
                                            if (storedCode) {
                                                try {
                                                    activeRoom = await apiService.joinRoom(storedCode);
                                                } catch {
                                                    await AsyncStorage.removeItem(DEV_KS_CODE_KEY);
                                                }
                                            }
                                            if (!activeRoom) {
                                                const rooms = await apiService.getAvailableRooms();
                                                const devRooms = (rooms || []).filter((r: any) => typeof r?.name === 'string' && r.name.startsWith('DEV_ㄱㅅ'));
                                                if (devRooms.length > 0) {
                                                    const oldest = devRooms.sort((a: any, b: any) => {
                                                        const aT = Date.parse(a.createdAt || a.updatedAt || 0) || 0;
                                                        const bT = Date.parse(b.createdAt || b.updatedAt || 0) || 0;
                                                        return aT - bT;
                                                    })[0];
                                                    activeRoom = await apiService.joinRoom(oldest.code);
                                                    await AsyncStorage.setItem(DEV_KS_CODE_KEY, (activeRoom.code || '').toUpperCase());
                                                }
                                            }
                                            if (!activeRoom) {
                                                const created = await apiService.createRoom({ name: 'DEV_ㄱㅅ' });
                                                activeRoom = await apiService.joinRoom(created.code);
                                                await AsyncStorage.setItem(DEV_KS_CODE_KEY, (activeRoom.code || '').toUpperCase());
                                            }

                                            // 3) Join socket room (no-ack) and set store, then allow a short settle time
                                            setCurrentRoom(activeRoom);
                                            socketService.emit('room:join', { code: activeRoom.code });
                                            await new Promise(r => setTimeout(r, 200));

                                            // 4) Join pregame and set ready + progress
                                            socketService.joinPreGame(activeRoom.id, 'ㄱㅅ');
                                            // Ensure UI knows the selected pair for display (ㄱㅅ)
                                            try {
                                                useStore.setState({
                                                    selectedChoseongPair: {
                                                        id: 'dev-ks',
                                                        korean: 'ㄱㅅ',
                                                        english: 'KS',
                                                        votes: 0,
                                                        votedBy: [],
                                                    }
                                                } as any);
                                            } catch {}
                                            const boardData = {
                                                board: KS_DEV_BOARD,
                                                completedCells: 25,
                                                timestamp: new Date().toISOString(),
                                                playerId: user.id,
                                                consonant: 'ㄱㅅ',
                                            };
                                            await socketService.setPreGameReady(activeRoom.id, true, boardData);
                                            await socketService.updatePregameBoardStatus(activeRoom.id, user.id, 25, 25, true, boardData);

                                            // 4.5) Bootstrap local in-game board so screen has data immediately
                                            try {
                                                // Freeze my board locally; server payload will override when available
                                                useStore.getState().setInGameBoards({ [user.id]: KS_DEV_BOARD });
                                                // Set status to playing for UI context (optional)
                                                (useStore.getState() as any).setGameStatus?.('playing');
                                                console.log('🧪 [DEV] Bootstrapped local in-game board for quick navigation');
                                            } catch (e) {
                                                console.warn('Bootstrap setInGameBoards failed:', e);
                                            }

                                            // 4.6) Refresh room players to build confirmed order for server
                                            let confirmedOrder: string[] = [];
                                            try {
                                                const latest = await apiService.getRoom(activeRoom.id);
                                                const ids = Array.isArray(latest?.players) ? latest.players.map((p: any) => p.id) : [];
                                                confirmedOrder = Array.from(new Set(ids));
                                            } catch {
                                                const ids = Array.isArray(activeRoom?.players) ? activeRoom.players.map((p: any) => p.id) : [];
                                                confirmedOrder = Array.from(new Set(ids));
                                            }

                                            // 5) Navigate when server actually starts the game (with short fallback)
                                            await new Promise<void>((resolve) => {
                                                const onStarted = (_data: any) => {
                                                    socketService.off('game-phase-started', onStarted);
                                                    navigation.navigate('InGameBoardScreen' as never);
                                                    resolve();
                                                };
                                                socketService.on('game-phase-started', onStarted);
                                                // Request server start after listeners are set
                                                socketService.requestGameStart(activeRoom.id, { reason: 'all_ready', confirmedOrder });
                                                // Fallback: navigate after 1.5s if no event (dev convenience)
                                                setTimeout(() => {
                                                    socketService.off('game-phase-started', onStarted);
                                                    navigation.navigate('InGameBoardScreen' as never);
                                                    resolve();
                                                }, 1500);
                                            });
                                        } catch (err) {
                                            const msg = err instanceof Error ? err.message : 'Failed to jump to in-game';
                                            Alert.alert('Error', msg);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="zap" size={16} color="#8b4513" />
                                    <Text style={styles.devButtonText}>Jump to In-Game (Dev ㄱㅅ)</Text>
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
        backgroundColor: '#FFFFFF',
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
        flexDirection: 'column',
        gap: 12,
        marginBottom: 12,
        width: '100%',
    },
    devButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
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
        textAlign: 'left',
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