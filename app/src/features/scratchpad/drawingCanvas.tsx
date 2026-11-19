
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
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] =
    useState<Stroke | null>(null);

  const toolRef = useRef<Tool>('pen');
  const currentRef = useRef<Stroke | null>(null);

  const chooseTool = (nextTool: Tool) => {
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
            d: `M ${locationX} ${locationY} L ${locationX + 0.1} ${locationY + 0.1}`,
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

  const renderStroke = (stroke: Stroke, index: number) => (
    <Path
      key={index}
      d={stroke.d}
      stroke={stroke.tool === 'pen' ? '#000000' : '#FFFFFF'}
      strokeWidth={stroke.tool === 'pen' ? 3 : 22}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>
        Doodle Space
      </Text>

      <View
        style={styles.canvas}
        {...panResponder.panHandlers}
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
        <Pressable
          onPress={() => chooseTool('pen')}
          style={[
            styles.toolButton,
            tool === 'pen' && styles.selectedTool,
          ]}
        >
          <Ionicons
            name="pencil"
            size={21}
            color="#000000"
          />
          <Text style={styles.toolText}>Pen</Text>
        </Pressable>

        <Pressable
          onPress={() => chooseTool('eraser')}
          style={[
            styles.toolButton,
            tool === 'eraser' && styles.selectedTool,
          ]}
        >
          <Ionicons
            name="color-wand-outline"
            size={21}
            color="#000000"
          />
          <Text style={styles.toolText}>Erase</Text>
        </Pressable>

        <Pressable
          onPress={undo}
          style={styles.toolButton}
        >
          <Ionicons
            name="arrow-undo"
            size={21}
            color="#000000"
          />
          <Text style={styles.toolText}>Undo</Text>
        </Pressable>

        <Pressable
          onPress={clear}
          style={styles.toolButton}
        >
          <Ionicons
            name="trash-outline"
            size={21}
            color="#000000"
          />
          <Text style={styles.toolText}>Clear</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
  },

  heading: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: '#000000',
    marginBottom: 10,
  },

  canvas: {
    height: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8DED7',
    overflow: 'hidden',
  },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },

  toolButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 58,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 12,
  },

  selectedTool: {
    backgroundColor: '#E8DED7',
  },

  toolText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: '#000000',
    marginTop: 2,
  },
});