import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
} from 'react-native';

import { fonts, shadows } from '../../../assets/theme';
import DrawingCanvas from './drawingCanvas';

type Props = {
  modeId: string;
};

export default function Scratchpad({ modeId }: Props) {
  const [notes, setNotes] = useState('');
  const [inputHeight, setInputHeight] = useState(220);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Scratchpad</Text>

      <Text style={styles.sectionTitle}>Notes</Text>

      <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Write something..."
        placeholderTextColor="#888888"
        multiline={true}
        scrollEnabled={false}
        textAlignVertical="top"
        onContentSizeChange={(event) => {
          const nextHeight =
            event.nativeEvent.contentSize.height;

          setInputHeight(
            Math.max(220, Math.ceil(nextHeight) + 24)
          );
        }}
        style={[
          styles.input,
          { height: inputHeight },
        ]}
      />

      <DrawingCanvas key={modeId} />

      <Text style={styles.status}>
        Draft only — not saved yet
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF6F3',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    ...shadows.raised,
  },

  title: {
    fontFamily: fonts.headingBold,
    fontSize: 23,
    color: '#000000',
    marginBottom: 12,
  },

  sectionTitle: {
    fontFamily: fonts.headingBold,
    fontSize: 20,
    color: '#000000',
    marginBottom: 8,
  },

  input: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: '#000000',
    minHeight: 220,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
  },

  status: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: '#555555',
    marginTop: 12,
    textAlign: 'right',
  },
});