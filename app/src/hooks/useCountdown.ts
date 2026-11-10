
import { useState, useEffect } from 'react';

export function useCountdown(initialSeconds: number) {
    const [timeLeft, setTimeLeft] = useState<number>(initialSeconds);
    const [isRunning, setIsRunning] = useState<boolean>(false);

    //timer changes
    useEffect(() => {
        setTimeLeft(initialSeconds);
        setIsRunning(false);
    }, [initialSeconds]);

    // Countdown logic
    useEffect(() => {
        if (!isRunning || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft(prev => Math.max(0, prev - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [isRunning, timeLeft]);

    //timer controls
    const start = () => {
        if (timeLeft > 0) {
            setIsRunning(true);
        }
    };

    const pause = () => {
        setIsRunning(false);
    };

    const reset = () => {
        setIsRunning(false);
        setTimeLeft(initialSeconds);
    };

    // Convert remaining seconds into hours, minutes, and seconds
    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    // Format each value to two digits
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    // Final formatted timer
    const formattedTime = `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;

    return {
        timeLeft,
        setTimeLeft,
        formattedTime,
        isRunning,
        start,
        pause,
        reset,
    };
}
