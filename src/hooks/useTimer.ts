import { useState, useEffect, useCallback } from 'react';

interface UseTimerProps {
    initialTime: number;
    onTimerExpired: () => void;
}

interface UseTimerReturn {
    timeLeft: number;
    formatTime: (seconds: number) => string;
    resetTimer: () => void;
}

export function useTimer({ initialTime, onTimerExpired }: UseTimerProps): UseTimerReturn {
    const [timeLeft, setTimeLeft] = useState(initialTime);

    // Timer countdown with fallback logic
    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0) {
            // Time's up - handle fallback for any currently editing cells
            onTimerExpired();
        }
    }, [timeLeft, onTimerExpired]);

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const resetTimer = useCallback(() => {
        setTimeLeft(initialTime);
    }, [initialTime]);

    return {
        timeLeft,
        formatTime,
        resetTimer,
    };
}
