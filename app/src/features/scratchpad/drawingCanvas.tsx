import { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import { fonts } from '../../../assets/theme';
import { useScrollLock } from '../../components/ScrollLock';
import type {
  DrawingStroke,
  DrawingTool,
} from './scratchpadTypes';

type Props = {
  strokes: DrawingStroke[];
  onChange: (strokes: DrawingStroke[]) => void;
  disabled?: boolean;
};

export default function DrawingCanvas({
  strokes,
  onChange,
  disabled = false,
}: Props) {
  const [tool, setTool] = useState<DrawingTool>('pen');
  const [expanded, setExpanded] = useState(false);
  const [currentStroke, setCurrentStroke] =
    useState<DrawingStroke | null>(null);

  const toolRef = useRef<DrawingTool>('pen');
  const strokesRef = useRef(strokes);
  const onChangeRef = useRef(onChange);
  const currentRef = useRef<DrawingStroke | null>(null);
  const disabledRef = useRef(disabled);
  // Stops the screen from scrolling while you draw
  const { lock, unlockSoon } = useScrollLock();

  // Keep touch handlers up to date.
  strokesRef.current = strokes;
  onChangeRef.current = onChange;
  disabledRef.current = disabled;

  const chooseTool = (nextTool: DrawingTool) => {
    toolRef.current = nextTool;
    setTool(nextTool);
  };

  const finishStroke = () => {
    const finished = currentRef.current;
    if (!finished) return;

    const updated = [
      ...strokesRef.current,
      finished,
    ];

    strokesRef.current = updated;
    onChangeRef.current(updated);

    currentRef.current = null;
    setCurrentStroke(null);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !disabledRef.current,

        onMoveShouldSetPanResponder: () =>
          !disabledRef.current,

        onPanResponderGrant: (event) => {
          const { locationX, locationY } =
            event.nativeEvent;

          const stroke: DrawingStroke = {
            d: `M ${locationX} ${locationY} L ${
              locationX + 0.1
            } ${locationY + 0.1}`,
            tool: toolRef.current,
          };

          currentRef.current = stroke;
          setCurrentStroke(stroke);
        },

        onPanResponderMove: (event) => {
          const previous = currentRef.current;
          if (!previous) return;

          const { locationX, locationY } =
            event.nativeEvent;

          const updated: DrawingStroke = {
            ...previous,
            d: `${previous.d} L ${locationX} ${locationY}`,
          };

          currentRef.current = updated;
          setCurrentStroke(updated);
        },

        onPanResponderRelease: finishStroke,
        onPanResponderTerminate: finishStroke,
        onPanResponderTerminationRequest: () => false,
      }),
    []
  );

  const updateStrokes = (next: DrawingStroke[]) => {
    strokesRef.current = next;
    onChangeRef.current(next);
  };

  const undo = () => {
    if (disabled) return;
    updateStrokes(strokesRef.current.slice(0, -1));
  };

  const clear = () => {
    if (disabled) return;
    currentRef.current = null;
    setCurrentStroke(null);
    updateStrokes([]);
  };

  const renderStroke = (
    stroke: DrawingStroke,
    index: number
  ) => (
    <Path
      key={index}
      d={stroke.d}
      stroke={
        stroke.tool === 'pen'
          ? '#000000'
          : '#FFFFFF'
      }
      strokeWidth={
        stroke.tool === 'pen' ? 3 : 22
      }
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.canvas,
          { height: expanded ? 600 : 260 },
        ]}
        {...panResponder.panHandlers}
        onTouchStart={lock}
        onTouchEnd={unlockSoon}
        onTouchCancel={unlockSoon}
      >
        <Svg
          width="100%"
          height="100%"
          pointerEvents="none"
        >
          {strokes.map(renderStroke)}

          {currentStroke &&
            renderStroke(currentStroke, strokes.length)}
        </Svg>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.tools}>
          <Pressable
            disabled={disabled}
            onPress={() => chooseTool('pen')}
            style={[
              styles.toolButton,
              tool === 'pen' && styles.activeTool,
            ]}
          >
            <Ionicons
              name="pencil"
              size={22}
              color="#000000"
            />
          </Pressable>

          <Pressable
            disabled={disabled}
            onPress={() => chooseTool('eraser')}
            style={[
              styles.toolButton,
              tool === 'eraser' && styles.activeTool,
            ]}
          >
            <Ionicons
              name="color-wand-outline"
              size={22}
              color="#000000"
            />
          </Pressable>

          <Pressable
            disabled={disabled}
            onPress={undo}
            style={styles.toolButton}
          >
            <Ionicons
              name="arrow-undo"
              size={22}
              color="#000000"
            />
          </Pressable>

          <Pressable
            disabled={disabled}
            onPress={clear}
            style={styles.toolButton}
          >
            <Ionicons
              name="trash-outline"
              size={22}
              color="#000000"
            />
          </Pressable>
        </View>

        <Pressable
          onPress={() => setExpanded((prev) => !prev)}
          style={styles.expandButton}
        >
          <Ionicons
            name={
              expanded
                ? 'contract-outline'
                : 'expand-outline'
            }
            size={17}
            color="#000000"
          />

          <Text style={styles.expandText}>
            {expanded ? 'Collapse' : 'Expand'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  canvas: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5DED5',
    overflow: 'hidden',
  },

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },

  tools: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  toolButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeTool: {
    backgroundColor: '#E9E1D6',
  },

  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1EAE0',
  },

  expandText: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: '#000000',
  },
});