import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

const frames = [
  require('../../assets/LoadingScreen/LoadingPage1.png'),
  require('../../assets/LoadingScreen/LoadingPage2.png'),
  require('../../assets/LoadingScreen/LoadingPage3.png'),
  require('../../assets/LoadingScreen/LoadingPage4.png'),
  require('../../assets/LoadingScreen/LoadingPage5.png'),
  require('../../assets/LoadingScreen/LoadingPage6.png'),
  require('../../assets/LoadingScreen/LoadingPage7.png'),
  require('../../assets/LoadingScreen/LoadingPage8.png'),
];

const FRAME_MS = 300; // time each frame shows. Lower = faster

export default function LoadingScreen() {
  const [current, setCurrent] = useState(0);

  const opacities = useRef(
  frames.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))
).current;

useEffect(() => {
  frames.forEach((_, i) => {
    Animated.timing(opacities[i], {
      toValue: i === current ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  });
}, [current]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((i) => (i + 1) % frames.length);
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={styles.container}>
      {frames.map((img, i) => (
        <Animated.Image
          key={i}
          source={img}
          style={[StyleSheet.absoluteFill, { opacity: opacities[i] }]}
          resizeMode="cover"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDB98A' },
});