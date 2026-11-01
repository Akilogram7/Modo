import LoadingScreen from "./src/screens/loadingScreen";
import { useFonts } from 'expo-font';
import { DynaPuff_400Regular } from '@expo-google-fonts/dynapuff';
import { Nunito_400Regular, Nunito_700Bold } from '@expo-google-fonts/nunito';
import { Baloo2_600SemiBold, Baloo2_700Bold } from '@expo-google-fonts/baloo-2';

export default function App() {
  const [fontsLoaded] = useFonts({
  DynaPuff_400Regular,
  Nunito_400Regular,
  Nunito_700Bold,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  });

  return <LoadingScreen />;
}