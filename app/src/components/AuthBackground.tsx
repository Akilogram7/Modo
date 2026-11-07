import { useEffect, useRef, type PropsWithChildren } from 'react';
import { Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradientStops, gradientDirection } from '../theme';

// One cloud that drifts from left to right, then loops
function FloatingCloud({
  top,
  size,
  opacity,
  duration,
  startAt = 0,
  from = 'left',
}: {
  top: number;
  size: number;
  opacity: number;
  duration: number;
  startAt?: number; // 0 to 1: how far across the screen it begins
  from?: 'left' | 'right';
}) {
  const { width, height } = useWindowDimensions();
  const x = useRef(new Animated.Value(0)).current;
  const cloudW = width * size;

  useEffect(() => {
    // plays the first (partial) trip, then repeats full trips forever
    const run = (begin: number, ms: number) => {
      x.setValue(begin);
      Animated.timing(x, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver: true }).start(
        ({ finished }) => {
          if (finished) run(0, duration);
        }
      );
    };
    run(startAt, duration * (1 - startAt));
    return () => x.stopAnimation();
  }, []);

  const translateX = x.interpolate({
    inputRange: [0, 1],
    outputRange: from === 'left' ? [-cloudW, width] : [width, -cloudW],
  });

  return (
    <Animated.Image
      source={require('../../assets/Log In Page/cloud.png')}
      resizeMode="contain"
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: height * top,
        width: cloudW,
        height: cloudW,
        opacity,
        transform: [{ translateX }],
      }}
    />
  );
}

export default function AuthBackground({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = drift.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] });

  return (
    <LinearGradient
      colors={[colors.gradientLight, colors.gradientMain]}
      locations={[...gradientStops]}
      start={gradientDirection.start}
      end={gradientDirection.end}
      style={{ flex: 1 }}
    >
  {/* top cluster, behind and around the logo */}
  <FloatingCloud top={0.75} size={1.5} opacity={0.5} duration={50000} startAt={0.2} from="left" />
  <FloatingCloud top={0.9} size={2.0} opacity={0.7} duration={45000} startAt={0.6} from="right" />
  <FloatingCloud top={0.65} size={1.0} opacity={0.35} duration={75000} startAt={0.4} from="left" />

  {/* middle, faint, behind the form */}
  <FloatingCloud top={0.5} size={2.0} opacity={0.05} duration={20000} startAt={0.1} from="right" />
  <FloatingCloud top={0.45} size={1.5} opacity={0.1} duration={20000} startAt={0.1} from="left" />

  {/* bottom cluster */}
  <FloatingCloud top={0.15} size={1.5} opacity={0.35} duration={75000} startAt={0.7} from="right" />
  <FloatingCloud top={0.2} size={2.0} opacity={0.50} duration={50000} startAt={0.3} from="left" />
  <FloatingCloud top={0.25} size={1.} opacity={0.40} duration={45000} startAt={0.5} from="right" />
  

      <View style={{ flex: 1, paddingTop: insets.top + 20 }}>
        <View style={[styles.logo, { width: width * 0.85 }]}>
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

        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  logo: { alignSelf: 'center', aspectRatio: 1314 / 460 },
  text: { width: '100%', height: '100%' },
  character: { position: 'absolute', left: '24.8%', top: '-10%', width: '29%', height: '100%' },
});