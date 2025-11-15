import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { LOTTIE_CONFIG } from '../../constants/config';

interface Props {
    visible: boolean;
    onFinish?: () => void;
}

const ConfettiOverlay: React.FC<Props> = ({ visible, onFinish }) => {
    if (!visible) return null;
    const uri = LOTTIE_CONFIG.CONFETTI_URL;
    console.log("ConfettiOverlay uri", uri)
    if (!uri) return null;

    return (
        <View pointerEvents="none" style={styles.overlay}>
            <LottieView
                source={{ uri }}
                autoPlay
                loop={false}
                onAnimationFinish={onFinish}
                style={styles.animation}
            />
        </View>
    );
};

export default ConfettiOverlay;

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'flex-start',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    animation: {
        width: '100%',
        height: 400,
        alignSelf: 'center',
        marginTop: 24,
    },
});
