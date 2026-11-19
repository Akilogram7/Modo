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

type Tool = 'pen' | 'eraser';

type Stroke = {
  d: string;
  tool: Tool;
};

export default function DrawingCanvas() {
  const [tool, setTool] = useState<Tool>('pen');
  const [expanded, setExpanded] = useState(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] =
    useState<Stroke | null>(null);

  const toolRef = useRef<Tool>('pen');
  const currentRef = useRef<Stroke | null>(null);

  const changeTool = (nextTool: Tool) => {
    toolRef.current = nextTool;
    setTool(nextTool);
  };

  const finishStroke = () => {
    const finished = currentRef.current;

    if (finished) {
      setStrokes((previous) => [
        ...previous,
        finished,
      ]);
    }

    currentRef.current = null;
    setCurrentStroke(null);
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,

        onPanResponderGrant: (event) => {
          const { locationX, locationY } =
            event.nativeEvent;

          const stroke: Stroke = {
            d: `M ${locationX} ${locationY} L ${
              locationX + 0.1
            } ${locationY + 0.1}`,
            tool: toolRef.current,
          };

          currentRef.current = stroke;
          setCurrentStroke(stroke);
        },

        onPanResponderMove: (event) => {
          const { locationX, locationY } =
            event.nativeEvent;

          const previous = currentRef.current;

          if (!previous) return;

          const updated: Stroke = {
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

  const undo = () => {
    setStrokes((previous) => previous.slice(0, -1));
  };

  const clear = () => {
    setStrokes([]);
    currentRef.current = null;
    setCurrentStroke(null);
  };

  const renderStroke = (
    stroke: Stroke,
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
      >
        <Svg
          width="100%"
          height="100%"
          pointerEvents="none"
        >
          {strokes.map(renderStroke)}

          {currentStroke &&
            renderStroke(
              currentStroke,
              strokes.length
            )}
        </Svg>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.tools}>
          <Pressable
            onPress={() => changeTool('pen')}
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
            onPress={() => changeTool('eraser')}
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
          onPress={() =>
            setExpanded((previous) => !previous)
          }
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