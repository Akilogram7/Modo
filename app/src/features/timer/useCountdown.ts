
import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export function useCountdown(initialSeconds: number) {
    const [timeLeft, setTimeLeft] = useState(initialSeconds);
    const [isRunning, setIsRunning] = useState(false);
    const deadlineRef = useRef<number | null>(null);

    useEffect(() => {
        deadlineRef.current = null;
        setTimeLeft(initialSeconds);
        setIsRunning(false);
    }, [initialSeconds]);

    useEffect(() => {
        if (!isRunning) return;

        const updateTime = () => {
            if (deadlineRef.current === null) return;

            const remaining = Math.max(
                0,
                Math.ceil((deadlineRef.current - Date.now()) / 1000)
            );

            setTimeLeft(remaining);

            if (remaining === 0) {
                deadlineRef.current = null;
                setIsRunning(false);
            }
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);

        const subscription = AppState.addEventListener('change', state => {
            if (state === 'active') updateTime();
        });

        return () => {
            clearInterval(interval);
            subscription.remove();
        };
    }, [isRunning]);

    const start = () => {
        if (timeLeft <= 0 || isRunning) return;
        deadlineRef.current = Date.now() + timeLeft * 1000;
        setIsRunning(true);
    };

    const pause = () => {
        if (deadlineRef.current !== null) {
            setTimeLeft(Math.max(
                0,
                Math.ceil((deadlineRef.current - Date.now()) / 1000)
            ));
        }
        deadlineRef.current = null;
        setIsRunning(false);
    };

    const reset = () => {
        deadlineRef.current = null;
        setIsRunning(false);
        setTimeLeft(initialSeconds);
    };

    const hours = Math.floor(timeLeft / 3600);
    const minutes = Math.floor((timeLeft % 3600) / 60);
    const seconds = timeLeft % 60;

    const formattedTime = [hours, minutes, seconds]
        .map(value => value.toString().padStart(2, '0'))
        .join(':');

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
