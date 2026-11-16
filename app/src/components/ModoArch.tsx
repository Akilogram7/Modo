
import Svg, {
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
} from 'react-native-svg';

export default function ModoArch({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient
          id="archFade"
          cx="50%"
          cy="48%"
          rx="50%"
          ry="50%"
          fx="50%"
          fy="48%"
        >
          <Stop
            offset="0%"
            stopColor="#FFB67E"
            stopOpacity={0.65}
          />
          <Stop
            offset="32%"
            stopColor="#FFB67E"
            stopOpacity={0.55}
          />
          <Stop
            offset="61%"
            stopColor="#FFE1CA"
            stopOpacity={0.4}
          />
          <Stop
            offset="85%"
            stopColor="#FFE1CA"
            stopOpacity={0.12}
          />
          <Stop
            offset="100%"
            stopColor="#FFE1CA"
            stopOpacity={0}
          />
        </RadialGradient>
      </Defs>

      {/* Left arch */}
      <Ellipse
        cx="34"
        cy="60"
        rx="25"
        ry="36"
        fill="url(#archFade)"
        />

        {/* Right arch */}
        <Ellipse
        cx="66"
        cy="60"
        rx="25"
        ry="36"
        fill="url(#archFade)"
        />

        {/* Taller middle arch */}
        <Ellipse
        cx="50"
        cy="49"
        rx="29"
        ry="47"
        fill="url(#archFade)"
        />
    </Svg>
  );
}