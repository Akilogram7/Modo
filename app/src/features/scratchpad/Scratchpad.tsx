import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';

import { fonts, shadows } from '../../../assets/theme';
import DrawingCanvas from './drawingCanvas';

type Props = {
  modeId: string;
};

type Tab = 'notes' | 'sketches';

export default function Scratchpad({ modeId }: Props) {
  const [activeTab, setActiveTab] =
    useState<Tab>('notes');

  const [notes, setNotes] = useState('');
  const [inputHeight, setInputHeight] = useState(220);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        My Scratchpad
      </Text>

      <Text style={styles.subtitle}>
        Your thoughts, all in one place.
      </Text>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setActiveTab('notes')}
          style={[
            styles.tab,
            activeTab === 'notes' && styles.activeTab,
          ]}
        >
          <Text style={styles.tabText}>
            Notes
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('sketches')}
          style={[
            styles.tab,
            activeTab === 'sketches' && styles.activeTab,
          ]}
        >
          <Text style={styles.tabText}>
            Sketches
          </Text>
        </Pressable>
      </View>


    {activeTab === 'notes' && (
    <View style={styles.paper}>
        <View style={styles.notesHeader}>
        <Text style={styles.notesLabel}>Notes</Text>

        <Pressable
            onPress={() => {
            setNotes('');
            setInputHeight(220);
            }}
            disabled={notes.length === 0}
            style={styles.clearButton}
        >
            <Text style={styles.clearButtonText}>
            Clear All
            </Text>
        </Pressable>
        </View>

        <TextInput
        value={notes}
        onChangeText={setNotes}
        placeholder="Write something..."
        placeholderTextColor="#888888"
        multiline
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
            styles.noteInput,
            { height: inputHeight },
        ]}
        />
    </View>
    )}


      <View
        style={
          activeTab === 'sketches'
            ? styles.visible
            : styles.hidden
        }
      >
        <DrawingCanvas key={modeId} />
      </View>

      <Text style={styles.status}>
        Draft only — not saved yet
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F2E7',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    ...shadows.raised,
  },

  title: {
    fontFamily: fonts.headingBold,
    fontSize: 24,
    color: '#000000',
  },

  subtitle: {
    fontFamily: fonts.heading,
    fontSize: 14,
    color: '#777777',
    marginBottom: 16,
  },

  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },

  activeTab: {
    backgroundColor: '#D8C58A',
  },

  tabText: {
    fontFamily: fonts.headingBold,
    fontSize: 15,
    color: '#000000',
  },

  paper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
  },

  noteInput: {
    fontFamily: fonts.heading,
    fontSize: 17,
    color: '#000000',
    minHeight: 220,
    padding: 4,
  },

  visible: {
    display: 'flex',
  },

  hidden: {
    display: 'none',
  },

  status: {
    fontFamily: fonts.heading,
    fontSize: 12,
    color: '#777777',
    marginTop: 12,
    textAlign: 'right',
  },

notesHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 8,
},

notesLabel: {
  fontFamily: fonts.headingBold,
  fontSize: 16,
  color: '#000000',
},

clearButton: {
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 12,
  backgroundColor: '#F1EAE0',
},

clearButtonText: {
  fontFamily: fonts.heading,
  fontSize: 13,
  color: '#000000',
},
});