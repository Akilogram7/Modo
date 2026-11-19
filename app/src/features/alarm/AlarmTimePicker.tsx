import { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
  type ScrollViewProps,
} from 'react-native';
import { fonts } from '../../../assets/theme';
import { parseAlarmTime, toAlarmTime } from './alarmTime';

// Pick a time by sliding three wheels with your finger: hour, minute and AM/PM.
// Each wheel snaps to the number in the middle when you let go.

type Props = {
  value: string; // "HH:MM", 24 hour clock
  onChange: (time: string) => void;
  textColor: string;
  accentColor: string;
};

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1)); // 1 to 12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')); // 00 to 59
const PERIODS = ['AM', 'PM'];

// ---------- Scroll lock ----------
// The wheels sit inside screens that also scroll, so a swipe that lands a little off a wheel
// would move the whole page. While a finger is on the picker, the screen behind it holds still.

const ScrollLockContext = createContext<(locked: boolean) => void>(() => {});
const UNLOCK_MS = 300; // how long after letting go (or the wheel stopping) the screen can scroll again

// Use this instead of ScrollView on any screen that has a time picker in it
export function PickerScrollView(props: ScrollViewProps) {
  const [locked, setLocked] = useState(false);
  return (
    <ScrollLockContext.Provider value={setLocked}>
      <ScrollView {...props} scrollEnabled={!locked && props.scrollEnabled !== false} />
    </ScrollLockContext.Provider>
  );
}

function useScrollLock() {
  const setLocked = useContext(ScrollLockContext);
  const locked = useRef(false);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelUnlock = () => {
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    unlockTimer.current = null;
  };

  // Finger is on the picker (or a wheel is still spinning): hold the screen still
  const lock = () => {
    cancelUnlock();
    if (!locked.current) {
      locked.current = true;
      setLocked(true);
    }
  };

  // Let the screen scroll again once everything has been quiet for a moment
  const unlockSoon = () => {
    cancelUnlock();
    unlockTimer.current = setTimeout(() => {
      unlockTimer.current = null;
      locked.current = false;
      setLocked(false);
    }, UNLOCK_MS);
  };

  // If the picker disappears (like tapping DONE), never leave the screen stuck
  useEffect(
    () => () => {
      if (unlockTimer.current) clearTimeout(unlockTimer.current);
      if (locked.current) setLocked(false);
    },
    [setLocked],
  );

  return { lock, unlockSoon };
}

export default function AlarmTimePicker({ value, onChange, textColor, accentColor }: Props) {
  const { hour, minute } = parseAlarmTime(value);
  const isPm = hour >= 12;
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const { lock, unlockSoon } = useScrollLock();
  // A wheel moved: keep the screen still until it settles
  const onSpin = () => {
    lock();
    unlockSoon();
  };

  return (
    <View
      style={styles.row}
      onTouchStart={lock}
      onTouchEnd={unlockSoon}
      onTouchCancel={unlockSoon}
    >
      <Wheel
        label="Hour"
        items={HOURS}
        index={hour12 - 1}
        onChange={(i) => onChange(toAlarmTime(((i + 1) % 12) + (isPm ? 12 : 0), minute))}
        textColor={textColor}
        accentColor={accentColor}
        onSpin={onSpin}
      />
      <Text style={[styles.colon, { color: textColor }]}>:</Text>
      <Wheel
        label="Minute"
        items={MINUTES}
        index={minute}
        onChange={(i) => onChange(toAlarmTime(hour, i))}
        textColor={textColor}
        accentColor={accentColor}
        onSpin={onSpin}
      />
      <Wheel
        label="AM or PM"
        items={PERIODS}
        index={isPm ? 1 : 0}
        onChange={(i) => onChange(toAlarmTime((hour % 12) + (i === 1 ? 12 : 0), minute))}
        textColor={textColor}
        accentColor={accentColor}
        onSpin={onSpin}
      />
    </View>
  );
}

// ---------- One wheel ----------

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 3; // the picked one in the middle, one above, one below
const SETTLE_MS = 150; // how long the wheel has to stop moving before the number counts

function Wheel({
  label,
  items,
  index,
  onChange,
  textColor,
  accentColor,
  onSpin,
}: {
  label: string;
  items: string[];
  index: number;
  onChange: (index: number) => void;
  textColor: string;
  accentColor: string;
  onSpin: () => void;
}) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollY = useRef(index * ITEM_HEIGHT);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The number in the middle right now (changes while sliding, before letting go)
  const [middle, setMiddle] = useState(index);

  const clamp = (i: number) => Math.max(0, Math.min(items.length - 1, i));
  const indexAt = (y: number) => clamp(Math.round(y / ITEM_HEIGHT));

  const commit = (i: number) => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
    if (i !== index) onChange(i);
  };

  // If the time changes from somewhere else, roll the wheel to it
  useEffect(() => {
    if (indexAt(scrollY.current) !== index) {
      scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: true });
    }
    // indexAt only depends on items.length, which never changes for a wheel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, []);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    scrollY.current = y;
    const i = indexAt(y);
    setMiddle(i);
    onSpin();

    // Some phones don't say when the wheel stops, so also wait for it to go quiet
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => commit(i), SETTLE_MS);
  };

  const onStop = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    commit(indexAt(event.nativeEvent.contentOffset.y));
  };

  return (
    <View
      style={styles.wheel}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => {
        const step = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        commit(clamp(index + step));
      }}
    >
      {/* The band that shows which number is picked */}
      <View pointerEvents="none" style={[styles.band, { borderColor: accentColor }]} />

      <ScrollView
        ref={scrollRef}
        style={styles.wheelScroll}
        contentContainerStyle={styles.wheelContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled // lets the wheel spin inside a screen that also scrolls (Android)
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onStop}
        onLayout={() => scrollRef.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false })}
        testID={`wheel-${label}`}
      >
        {items.map((item, i) => (
          <View key={item} style={styles.item}>
            <Text
              style={[
                styles.itemText,
                { color: textColor },
                i === middle ? styles.itemPicked : styles.itemOther,
              ]}
            >
              {item}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  colon: {
    fontSize: 34,
    lineHeight: 42,
    fontFamily: fonts.headingBold,
  },
  wheel: {
    flex: 1, // wider wheels are easier to grab, but they still shrink to fit small phones
    minWidth: 56,
    maxWidth: 84,
    height: ITEM_HEIGHT * VISIBLE_ITEMS,
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT,
    height: ITEM_HEIGHT,
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderRadius: 4,
  },
  wheelScroll: {
    flex: 1,
  },
  wheelContent: {
    paddingVertical: ITEM_HEIGHT, // so the first and last numbers can sit in the middle
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontFamily: fonts.headingBold,
  },
  itemPicked: {
    fontSize: 32,
    lineHeight: 40,
  },
  itemOther: {
    fontSize: 22,
    lineHeight: 30,
    opacity: 0.4,
  },
});
