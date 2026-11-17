import Svg, { Line } from 'react-native-svg';

const CREAM = '#FFF3E6';
const SHADE = '#E8CDB3'; // the soft puffy edge underneath

export default function BubblyPlus({ size = 80 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Line x1="50" y1="30" x2="50" y2="70" stroke={CREAM} strokeWidth="20" strokeLinecap="round" />
      <Line x1="30" y1="50" x2="70" y2="50" stroke={CREAM} strokeWidth="20" strokeLinecap="round" />
    </Svg>
  );
}