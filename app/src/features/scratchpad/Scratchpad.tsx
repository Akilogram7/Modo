import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';

import { fonts, shadows } from '../../../assets/theme';
import DrawingCanvas from './drawingCanvas';

import {
  loadScratchpad,
  saveScratchpad,
} from './scratchpadServices';

import type {
  DrawingStroke,
  ScratchpadData,
} from './scratchpadTypes';

type Props = {
  modeId: string;
};

type Tab = 'notes' | 'sketches';

export default function Scratchpad({ modeId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const [notes, setNotes] = useState('');
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [inputHeight, setInputHeight] = useState(220);

  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState('Loading...');

  const notesRef = useRef('');
  const strokesRef = useRef<DrawingStroke[]>([]);
  const dirtyRef = useRef(false);
  const loadedRef = useRef(false);
  const revisionRef = useRef(0);
  const sessionRef = useRef(0);

  const saveQueueRef = useRef<Promise<unknown>>(
    Promise.resolve()
  );

  // Save a snapshot of both tabs.
  const saveNow = (
    targetModeId: string,
    sessionNumber: number
  ) => {
    if (!loadedRef.current || !dirtyRef.current) {
      return;
    }

    const revision = revisionRef.current;

    const content: ScratchpadData = {
      notes: notesRef.current,
      drawingData: [...strokesRef.current],
    };

    if (sessionRef.current === sessionNumber) {
      setSaveStatus('Saving...');
    }

    // Queue saves to prevent older requests from
    // overwriting more recent changes.
    const nextSave = saveQueueRef.current
      .catch(() => {})
      .then(() => saveScratchpad(targetModeId, content));

    saveQueueRef.current = nextSave;

    void nextSave
      .then(() => {
        if (sessionRef.current !== sessionNumber) {
          return;
        }

        if (revisionRef.current === revision) {
          dirtyRef.current = false;
          setSaveStatus('Saved');
        } else {
          setSaveStatus('Unsaved changes');
        }
      })
      .catch((error) => {
        console.error('Scratchpad save failed:', error);

        if (sessionRef.current === sessionNumber) {
          setSaveStatus('Save failed');
        }
      });
  };

  // Load saved notes AND drawings.
  useEffect(() => {
    let cancelled = false;
    const sessionNumber = ++sessionRef.current;

    setLoaded(false);
    setNotes('');
    setStrokes([]);
    setInputHeight(220);
    setSaveStatus('Loading...');

    notesRef.current = '';
    strokesRef.current = [];
    dirtyRef.current = false;
    loadedRef.current = false;
    revisionRef.current = 0;

    async function load() {
      try {
        const saved = await loadScratchpad(modeId);

        if (
          cancelled ||
          sessionRef.current !== sessionNumber
        ) {
          return;
        }

        const savedNotes = saved?.notes ?? '';
        const savedStrokes = saved?.drawingData ?? [];

        notesRef.current = savedNotes;
        strokesRef.current = savedStrokes;

        setNotes(savedNotes);
        setStrokes(savedStrokes);

        loadedRef.current = true;
        setLoaded(true);
        setSaveStatus('Saved');
      } catch (error) {
        if (cancelled) return;

        console.error('Scratchpad load failed:', error);
        setSaveStatus('Unable to load Scratchpad');
      }
    }

    void load();

    return () => {
      cancelled = true;

      // Attempt a final save if the mode closes
      // before the autosave delay finishes.
      if (loadedRef.current && dirtyRef.current) {
        saveNow(modeId, sessionNumber);
      }

      sessionRef.current++;
    };
  }, [modeId]);

  // Autosave after notes OR drawings change.
  useEffect(() => {
    if (!loaded || !dirtyRef.current) return;

    const sessionNumber = sessionRef.current;

    const timer = setTimeout(() => {
      saveNow(modeId, sessionNumber);
    }, 800);

    return () => clearTimeout(timer);
  }, [notes, strokes, loaded, modeId]);

  const updateNotes = (text: string) => {
    notesRef.current = text;
    dirtyRef.current = true;
    revisionRef.current++;

    setNotes(text);
    setSaveStatus('Unsaved changes');
  };

  const updateStrokes = (updated: DrawingStroke[]) => {
    strokesRef.current = updated;
    dirtyRef.current = true;
    revisionRef.current++;

    setStrokes(updated);
    setSaveStatus('Unsaved changes');
  };

  const clearNotes = () => {
    updateNotes('');
    setInputHeight(220);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Scratchpad</Text>

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
          <Text style={styles.tabText}>Notes</Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('sketches')}
          style={[
            styles.tab,
            activeTab === 'sketches' && styles.activeTab,
          ]}
        >
          <Text style={styles.tabText}>Sketches</Text>
        </Pressable>
      </View>

      {/* NOTES */}
      {activeTab === 'notes' && (
        <View style={styles.paper}>
          <View style={styles.notesHeader}>
            <Text style={styles.notesLabel}>Notes</Text>

            <Pressable
              onPress={clearNotes}
              disabled={!loaded || notes.length === 0}
              style={[
                styles.clearButton,
                (!loaded || notes.length === 0) &&
                  styles.disabledButton,
              ]}
            >
              <Text style={styles.clearButtonText}>
                Clear All
              </Text>
            </Pressable>
          </View>

          <TextInput
            value={notes}
            editable={loaded}
            onChangeText={updateNotes}
            placeholder={
              loaded
                ? 'Write something...'
                : 'Loading your notes...'
            }
            placeholderTextColor="#888888"
            multiline
            scrollEnabled={false}
            textAlignVertical="top"
            onContentSizeChange={(event) => {
              const height =
                event.nativeEvent.contentSize.height;

              setInputHeight(
                Math.max(220, Math.ceil(height) + 24)
              );
            }}
            style={[
              styles.noteInput,
              { height: inputHeight },
            ]}
          />
        </View>
      )}

      {/* SKETCHES */}
      <View
        style={
          activeTab === 'sketches'
            ? styles.visible
            : styles.hidden
        }
      >
        <DrawingCanvas
          strokes={strokes}
          onChange={updateStrokes}
          disabled={!loaded}
        />
      </View>

      <Text style={styles.status}>
        {saveStatus}
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

  disabledButton: {
    opacity: 0.45,
  },

  clearButtonText: {
    fontFamily: fonts.heading,
    fontSize: 13,
    color: '#000000',
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
});