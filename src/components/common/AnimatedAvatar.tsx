import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
    Text
} from 'react-native';
import Svg, {
    Circle,
    Ellipse,
    Path,
    Rect,
    Line,
    Text as SvgText,
    Polygon,
    Defs,
    LinearGradient,
    RadialGradient,
    Stop,
    G
} from 'react-native-svg';

const { width } = Dimensions.get('window');

interface AnimatedAvatarProps {
    size?: 'sm' | 'md' | 'lg';
    mood?: 'happy' | 'excited' | 'focused' | 'sleepy' | 'surprised';
    interactive?: boolean;
}

export const AnimatedAvatar = ({
    size = 'lg',
    mood = 'happy',
    interactive = true
}: AnimatedAvatarProps) => {
    const [isBlinking, setIsBlinking] = useState(false);
    const [isWriting, setIsWriting] = useState(false);
    const [shouldWave, setShouldWave] = useState(false);
    const [eyeDirection, setEyeDirection] = useState<'center' | 'left' | 'right' | 'up'>('center');
    const [headTilt, setHeadTilt] = useState(0);
    const [expression, setExpression] = useState<'smile' | 'laugh' | 'surprise' | 'wink'>('smile');
    const [writingWords, setWritingWords] = useState<Array<{ id: number, word: string, x: number, y: number }>>([]);

    // Animation values
    const floatAnim = useRef(new Animated.Value(0)).current;
    const sparkleAnim = useRef(new Animated.Value(0)).current;
    const breatheAnim = useRef(new Animated.Value(0)).current;
    const clickAnim = useRef(new Animated.Value(1)).current;
    const headTiltAnim = useRef(new Animated.Value(0)).current;
    const bobbingAnim = useRef(new Animated.Value(0)).current;
    const writingAnim = useRef(new Animated.Value(0)).current;

    const interactionCount = useRef(0);

    // Size configurations
    const sizeConfig = {
        sm: { width: 80, height: 100, viewBox: '0 0 160 200' },
        md: { width: 120, height: 150, viewBox: '0 0 160 200' },
        lg: { width: 160, height: 200, viewBox: '0 0 160 200' }
    };

    const currentSize = sizeConfig[size];

    // Enhanced floating animation
    useEffect(() => {
        const createFloatingAnimation = () => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(floatAnim, {
                        toValue: 1,
                        duration: 2000 + Math.random() * 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatAnim, {
                        toValue: 0,
                        duration: 2000 + Math.random() * 1000,
                        useNativeDriver: true,
                    }),
                ]),
            );
        };

        const floatingAnimation = createFloatingAnimation();
        floatingAnimation.start();

        return () => floatingAnimation.stop();
    }, [floatAnim]);

    // Breathing animation
    useEffect(() => {
        const createBreathingAnimation = () => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(breatheAnim, {
                        toValue: 1,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(breatheAnim, {
                        toValue: 0,
                        duration: 3000,
                        useNativeDriver: true,
                    }),
                ]),
            );
        };

        const breathingAnimation = createBreathingAnimation();
        breathingAnimation.start();

        return () => breathingAnimation.stop();
    }, [breatheAnim]);

    // Ambient bobbing
    useEffect(() => {
        const createBobbingAnimation = () => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(bobbingAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bobbingAnim, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ]),
            );
        };

        const bobbingAnimation = createBobbingAnimation();
        bobbingAnimation.start();

        return () => bobbingAnimation.stop();
    }, [bobbingAnim]);

    // Sparkle animation
    useEffect(() => {
        const createSparkleAnimation = () => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(sparkleAnim, {
                        toValue: 1,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(sparkleAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ]),
            );
        };

        const sparkleAnimation = createSparkleAnimation();
        sparkleAnimation.start();

        return () => sparkleAnimation.stop();
    }, [sparkleAnim]);

    // Enhanced blinking with varied timing
    useEffect(() => {
        const blinkInterval = setInterval(() => {
            setIsBlinking(true);
            setTimeout(() => setIsBlinking(false), Math.random() * 100 + 100);
        }, Math.random() * 3000 + 2000);

        return () => clearInterval(blinkInterval);
    }, []);

    // Writing animation
    useEffect(() => {
        const writingInterval = setInterval(() => {
            setIsWriting(true);
            Animated.sequence([
                Animated.timing(writingAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(writingAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ]).start();

            setTimeout(() => setIsWriting(false), 2000);
        }, 8000 + Math.random() * 4000);

        return () => clearInterval(writingInterval);
    }, []);

    // Eye movement
    useEffect(() => {
        const eyeMovementInterval = setInterval(() => {
            const directions: Array<'center' | 'left' | 'right' | 'up'> = ['center', 'left', 'right', 'up'];
            const randomDirection = directions[Math.floor(Math.random() * directions.length)];
            setEyeDirection(randomDirection);

            setTimeout(() => setEyeDirection('center'), 1000 + Math.random() * 2000);
        }, 3000 + Math.random() * 5000);

        return () => clearInterval(eyeMovementInterval);
    }, []);

    // Head movement
    useEffect(() => {
        const headMovementInterval = setInterval(() => {
            const tilt = (Math.random() - 0.5) * 8;
            setHeadTilt(tilt);

            Animated.timing(headTiltAnim, {
                toValue: tilt,
                duration: 500,
                useNativeDriver: true,
            }).start();

            setTimeout(() => {
                setHeadTilt(0);
                Animated.timing(headTiltAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            }, 2000 + Math.random() * 3000);
        }, 8000 + Math.random() * 7000);

        return () => clearInterval(headMovementInterval);
    }, []);

    // Random expressions
    useEffect(() => {
        const expressionInterval = setInterval(() => {
            const expressions: Array<'smile' | 'laugh' | 'surprise' | 'wink'> = ['smile', 'laugh', 'surprise', 'wink'];
            const randomExpression = expressions[Math.floor(Math.random() * expressions.length)];
            setExpression(randomExpression);

            setTimeout(() => setExpression('smile'), 2000 + Math.random() * 3000);
        }, 10000 + Math.random() * 10000);

        return () => clearInterval(expressionInterval);
    }, []);

    // Welcome wave on mount
    useEffect(() => {
        const timer = setTimeout(() => {
            setExpression('laugh');
            setIsWriting(true);

            setTimeout(() => {
                setExpression('smile');
                setIsWriting(false);
            }, 2000);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const handlePress = () => {
        if (!interactive) return;

        interactionCount.current++;

        // Click animation
        Animated.sequence([
            Animated.timing(clickAnim, {
                toValue: 1.1,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(clickAnim, {
                toValue: 1,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start();

        // Different reactions based on interaction count
        if (interactionCount.current % 3 === 0) {
            // Big celebration
            setExpression('laugh');
            setTimeout(() => setExpression('smile'), 2000);
        } else if (interactionCount.current % 2 === 0) {
            // Wink
            setExpression('wink');
            setTimeout(() => setExpression('smile'), 1500);
        } else {
            // Surprise and write
            setExpression('surprise');
            const randomTilt = (Math.random() - 0.5) * 15;
            Animated.timing(headTiltAnim, {
                toValue: randomTilt,
                duration: 200,
                useNativeDriver: true,
            }).start();

            setIsWriting(true);

            setTimeout(() => {
                setExpression('smile');
                setIsWriting(false);
                Animated.timing(headTiltAnim, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }).start();
            }, 2000);
        }
    };

    const getEyePosition = (baseX: number, baseY: number) => {
        switch (eyeDirection) {
            case 'left': return { x: baseX - 1, y: baseY };
            case 'right': return { x: baseX + 1, y: baseY };
            case 'up': return { x: baseX, y: baseY - 1 };
            default: return { x: baseX, y: baseY };
        }
    };

    const getMouthPath = () => {
        switch (expression) {
            case 'laugh':
                return 'M 70 85 Q 80 95 90 85 Q 80 92 70 85';
            case 'surprise':
                return 'M 78 89 Q 80 92 82 89';
            case 'wink':
                return 'M 74 87 Q 80 92 86 87';
            default:
                return 'M 74 87 Q 80 92 86 87';
        }
    };

    const floatTranslateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -8],
    });

    const breatheScale = breatheAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.02],
    });

    const bobbingTranslateY = bobbingAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 3],
    });

    const sparkleOpacity = sparkleAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 1, 0.3],
    });

    const sparkleScale = sparkleAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.8, 1.2, 0.8],
    });

    const leftEyePos = getEyePosition(70, 75);
    const rightEyePos = getEyePosition(90, 75);

    return (
        <View style={[styles.container, { width: currentSize.width, height: currentSize.height }]}>
            <TouchableOpacity onPress={handlePress} disabled={!interactive} style={styles.touchable}>
                <Animated.View
                    style={[
                        styles.avatarContainer,
                        {
                            transform: [
                                { translateY: floatTranslateY },
                                { translateY: bobbingTranslateY },
                                { scale: clickAnim },
                                { scale: breatheScale },
                                {
                                    rotateZ: headTiltAnim.interpolate({
                                        inputRange: [-15, 15],
                                        outputRange: ['-15deg', '15deg'],
                                        extrapolate: 'clamp',
                                    })
                                },
                            ],
                        },
                    ]}
                >
                    <Svg
                        width={currentSize.width}
                        height={currentSize.height}
                        viewBox={currentSize.viewBox}
                        style={styles.svg}
                    >
                        <Defs>
                            <LinearGradient id="pencilBodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <Stop offset="0%" stopColor="#f4a460" />
                                <Stop offset="50%" stopColor="#daa520" />
                                <Stop offset="100%" stopColor="#b8860b" />
                            </LinearGradient>
                            <LinearGradient id="ferruleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <Stop offset="0%" stopColor="#c0c0c0" />
                                <Stop offset="50%" stopColor="#e6e6e6" />
                                <Stop offset="100%" stopColor="#b8b8b8" />
                            </LinearGradient>
                            <LinearGradient id="eraserGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#ff69b4" />
                                <Stop offset="100%" stopColor="#ff1493" />
                            </LinearGradient>
                            <LinearGradient id="tipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor="#2d2016" />
                                <Stop offset="100%" stopColor="#1a1a1a" />
                            </LinearGradient>
                            <RadialGradient id="blushGradient" cx="50%" cy="50%" r="50%">
                                <Stop offset="0%" stopColor="#ffc0cb" stopOpacity="0.6" />
                                <Stop offset="100%" stopColor="#ffc0cb" stopOpacity="0.2" />
                            </RadialGradient>
                        </Defs>

                        {/* Pencil Tip */}
                        <Polygon
                            points="75,180 85,180 80,195"
                            fill="url(#tipGradient)"
                            stroke="rgba(45, 32, 22, 0.3)"
                            strokeWidth="1"
                        />

                        {/* Wood Body */}
                        <Rect
                            x="70"
                            y="110"
                            width="20"
                            height="70"
                            fill="url(#pencilBodyGradient)"
                            stroke="rgba(139, 69, 19, 0.3)"
                            strokeWidth="1"
                            rx="2"
                        />

                        {/* Wood texture lines */}
                        <G opacity="0.3">
                            <Line x1="72" y1="115" x2="72" y2="175" stroke="#8b4513" strokeWidth="0.5" />
                            <Line x1="75" y1="115" x2="75" y2="175" stroke="#daa520" strokeWidth="0.5" />
                            <Line x1="85" y1="115" x2="85" y2="175" stroke="#daa520" strokeWidth="0.5" />
                            <Line x1="88" y1="115" x2="88" y2="175" stroke="#8b4513" strokeWidth="0.5" />
                        </G>

                        {/* Ferrule */}
                        <Rect
                            x="69"
                            y="100"
                            width="22"
                            height="15"
                            fill="url(#ferruleGradient)"
                            stroke="rgba(139, 69, 19, 0.3)"
                            strokeWidth="1"
                            rx="1"
                        />

                        {/* Ferrule ridges */}
                        <G opacity="0.6">
                            <Line x1="69" y1="103" x2="91" y2="103" stroke="#a0a0a0" strokeWidth="0.5" />
                            <Line x1="69" y1="107" x2="91" y2="107" stroke="#a0a0a0" strokeWidth="0.5" />
                            <Line x1="69" y1="111" x2="91" y2="111" stroke="#a0a0a0" strokeWidth="0.5" />
                        </G>

                        {/* Eraser */}
                        <Ellipse
                            cx="80"
                            cy="95"
                            rx="12"
                            ry="8"
                            fill="url(#eraserGradient)"
                            stroke="rgba(139, 69, 19, 0.3)"
                            strokeWidth="1"
                        />

                        {/* Eraser highlight */}
                        <Ellipse cx="76" cy="92" rx="3" ry="2" fill="#ffffff" opacity="0.4" />

                        {/* Eyes */}
                        <G>
                            {/* Left Eye */}
                            {expression === 'wink' && Math.floor(Date.now() / 1000) % 2 ? (
                                <Path
                                    d="M 72 90 Q 75 93 78 90"
                                    stroke="#2d2016"
                                    strokeWidth="1.5"
                                    fill="none"
                                    strokeLinecap="round"
                                />
                            ) : (
                                <G>
                                    <Ellipse
                                        cx={leftEyePos.x}
                                        cy={leftEyePos.y}
                                        rx="3"
                                        ry={isBlinking ? "0.5" : "3"}
                                        fill="#2d2016"
                                    />
                                    {!isBlinking && (
                                        <G>
                                            <Circle cx={leftEyePos.x + 0.5} cy={leftEyePos.y - 0.5} r="1" fill="#ffffff" />
                                            <Circle cx={leftEyePos.x + 0.3} cy={leftEyePos.y - 0.3} r="0.3" fill="#ffffff" opacity="0.8" />
                                        </G>
                                    )}
                                </G>
                            )}

                            {/* Right Eye */}
                            <Ellipse
                                cx={rightEyePos.x}
                                cy={rightEyePos.y}
                                rx="3"
                                ry={isBlinking ? "0.5" : "3"}
                                fill="#2d2016"
                            />
                            {!isBlinking && (
                                <G>
                                    <Circle cx={rightEyePos.x + 0.5} cy={rightEyePos.y - 0.5} r="1" fill="#ffffff" />
                                    <Circle cx={rightEyePos.x + 0.3} cy={rightEyePos.y - 0.3} r="0.3" fill="#ffffff" opacity="0.8" />
                                </G>
                            )}
                        </G>

                        {/* Nose */}
                        <Circle cx="80" cy="82" r="0.8" fill="#ff1493" opacity="0.6" />

                        {/* Mouth */}
                        <Path
                            d={getMouthPath()}
                            stroke="#2d2016"
                            strokeWidth="1.5"
                            fill={expression === 'laugh' ? '#ff69b4' : 'none'}
                            fillOpacity={expression === 'laugh' ? '0.3' : '0'}
                            strokeLinecap="round"
                        />

                        {/* Cheeks */}
                        <Circle cx="65" cy="82" r="3" fill="url(#blushGradient)" />
                        <Circle cx="95" cy="82" r="3" fill="url(#blushGradient)" />

                        {expression === 'laugh' && (
                            <G>
                                <Circle cx="63" cy="80" r="1.5" fill="#ffc0cb" opacity="0.4" />
                                <Circle cx="97" cy="80" r="1.5" fill="#ffc0cb" opacity="0.4" />
                            </G>
                        )}

                        {/* Brand text */}
                        <SvgText
                            x="80"
                            y="140"
                            textAnchor="middle"
                            fontSize="6"
                            fill="#2d2016"
                            fontWeight="bold"
                            opacity="0.7"
                            transform="rotate(-90 80 140)"
                        >
                            WORD GAME
                        </SvgText>

                        {/* Writing sparkles */}
                        {isWriting && (
                            <G>
                                <Circle cx="85" cy="190" r="1" fill="#ffd700" opacity="0.8" />
                                <Circle cx="90" cy="185" r="0.8" fill="#ffd700" opacity="0.6" />
                                <Circle cx="75" cy="188" r="0.6" fill="#ffd700" opacity="0.7" />
                            </G>
                        )}

                        {/* Pencil shavings when excited */}
                        {mood === 'excited' && (
                            <G>
                                <Path d="M 75 175 Q 70 178 72 180" stroke="#daa520" strokeWidth="1" fill="none" opacity="0.6" />
                                <Path d="M 85 175 Q 90 178 88 180" stroke="#daa520" strokeWidth="1" fill="none" opacity="0.6" />
                                <Circle cx="68" cy="182" r="0.5" fill="#b8860b" opacity="0.5" />
                                <Circle cx="92" cy="182" r="0.5" fill="#b8860b" opacity="0.5" />
                            </G>
                        )}
                    </Svg>
                </Animated.View>
            </TouchableOpacity>

            {/* Writing Words */}
            {writingWords.map(word => (
                <View
                    key={word.id}
                    style={[
                        styles.writingWord,
                        {
                            left: currentSize.width / 2 + word.x,
                            top: currentSize.height / 2 + word.y,
                        }
                    ]}
                >
                    <Text style={styles.wordText}>{word.word}</Text>
                </View>
            ))}

            {/* Mood indicator */}
            {mood !== 'happy' && (
                <View style={styles.moodIndicator}>
                    <View style={styles.moodBadge}>
                        <Text style={styles.moodText}>
                            {mood === 'excited' && '🎉'}
                            {mood === 'focused' && '🎯'}
                            {mood === 'sleepy' && '😴'}
                            {mood === 'surprised' && '😲'}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    touchable: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarContainer: {
        elevation: 8,
    },
    svg: {
        borderRadius: 20,
    },
    sparkle: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    sparkleText: {
        fontSize: 12,
    },
    bookEmoji: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiText: {
        fontSize: 8,
    },
    ambientEmoji: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    smallEmojiText: {
        fontSize: 6,
    },
    writingWord: {
        position: 'absolute',
        pointerEvents: 'none',
    },
    wordText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#8b4513',
        opacity: 0.8,
    },
    moodIndicator: {
        position: 'absolute',
        top: -4,
        left: '50%',
        transform: [{ translateX: -20 }],
    },
    moodBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 1,
        borderColor: 'rgba(139, 69, 19, 0.2)',
        shadowColor: '#2d2016',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    moodText: {
        fontSize: 12,
    },
});

export default AnimatedAvatar;