import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradientStops } from '../mainTheme';

const { width, height } = Dimensions.get('window');
const SIZE = Math.sqrt(width * width + height * height) * 2;

export default function LoadingScreen() {
  const spin = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.timing(spin, {
    toValue: 50,
    duration: 2000 * 50, // 8000 is still one circle. Change it to adjust speed
    easing: Easing.linear,
    useNativeDriver: true,
    });
    spinLoop.start();

    const driftLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    driftLoop.start();

    return () => {
      spinLoop.stop();
      driftLoop.stop();
    };
  }, []);

  const rotate = spin.interpolate({
  inputRange: [0, 50],
  outputRange: ['0deg', '18000deg'], // 50 full circles (360 x 50)
  });

  const translateY = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [-8, 10], // pixels up and down
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          position: 'absolute',
          width: SIZE,
          height: SIZE,
          transform: [{ rotate }],
        }}
      >
        <LinearGradient
          colors={[colors.gradientLight, colors.gradientMain, colors.gradientMain]}
          locations={[0.1, 0.75, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <View style={styles.logo}>
        <Image
          source={require('../../assets/logo/LogoText.png')}
          style={styles.text}
          resizeMode="contain"
        />
        <Animated.Image
          source={require('../../assets/logo/ModoWave.png')}
          style={[styles.character, { transform: [{ translateY }] }]}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logo: { width: width * 0.88, aspectRatio: 1314 / 460 },
  text: { width: '100%', height: '100%' },
  character: { position: 'absolute', left: '24.8%', top: '-10%', width: '29%', height: '100%' },
});