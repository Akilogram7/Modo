import { createContext, memo, useContext, useEffect, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewInstance,
} from 'react-native';
import { fonts } from '../../../assets/theme';
import { useScrollLock } from '../../components/ScrollLock';
import { parseAlarmTime, toAlarmTime } from './alarmTime';

// Pick a time by sliding three wheels with your finger: hour, minute and AM/PM.
// Each wheel snaps to the number in the middle when you let go.
// The hour and minute wheels loop: after 12 comes 1 again, after 59 comes 00.

type Props = {
  value: string; // "HH:MM", 24 hour clock
  onChange: (time: string) => void;
  textColor: string;
  accentColor: string;
};

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1)); // 1 to 12
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')); // 00 to 59
const PERIODS = ['AM', 'PM'];

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
        loop
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
        loop
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

const ITEM_HEIGHT = 50;
const VISIBLE_ITEMS = 3; // the picked one in the middle, one above, one below
const SETTLE_MS = 150; // how long the wheel has to stop moving before the number counts

const PICKED_SIZE = 32;
const OTHER_SIZE = 22;

// The Baloo font sits a little high inside its line on iPhone, so the numbers are nudged down
// to the middle of the band. Raise this if they still look high, lower it if they look low.
// 0 = no nudge. (Set it to 0.18 for Android too if Android also looks high.)
const NUDGE_RATIO = Platform.OS === 'ios' ? 0.18 : 0;

// A looping wheel lays the numbers out many times over and starts in the middle copy,
// so you can spin either way. Roughly this many numbers in total:
const LOOP_TARGET_ITEMS = 240;

function copiesFor(count: number) {
  const copies = Math.max(3, Math.ceil(LOOP_TARGET_ITEMS / count));
  return copies % 2 === 0 ? copies + 1 : copies; // odd, so there is a true middle copy
}

// One number on a wheel (memo so only the numbers that change get redrawn)
const WheelItem = memo(function WheelItem({
  text,
  picked,
  color,
}: {
  text: string;
  picked: boolean;
  color: string;
}) {
  const size = picked ? PICKED_SIZE : OTHER_SIZE;

  return (
    <View style={styles.item}>
      <Text
        style={[
          styles.itemText,
          {
            color,
            fontSize: size,
            lineHeight: size + 8,
            transform: [{ translateY: 4 }],
          },
          picked ? styles.itemPicked : styles.itemOther,
        ]}
      >
        {text}
      </Text>
    </View>
  );
});

function Wheel({
  label,
  items,
  index,
  onChange,
  textColor,
  accentColor,
  onSpin,
  loop = false,
}: {
  label: string;
  items: string[];
  index: number; // which number is picked (0 = the first item)
  onChange: (index: number) => void;
  textColor: string;
  accentColor: string;
  onSpin: () => void;
  loop?: boolean; // goes round and round instead of stopping at the ends
}) {
  const count = items.length;
  const copies = loop ? copiesFor(count) : 1;
  const total = count * copies;
  const home = Math.floor(copies / 2) * count; // where the middle copy starts

  const scrollRef = useRef<ScrollViewInstance>(null);
  const scrollY = useRef((home + index) * ITEM_HEIGHT);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const placed = useRef(false);
  const dragging = useRef(false);

  const [middle, setMiddle] = useState(home + index);

  const posAt = (y: number) =>
    Math.max(0, Math.min(total - 1, Math.round(y / ITEM_HEIGHT)));

  const valueOf = (pos: number) => pos % count;
  // Jump back to the middle copy (it looks identical, so nobody sees it) so the wheel never runs out
  const recenter = (pos: number) => {
    if (!loop || dragging.current) return;
    if (pos >= home && pos < home + count) return; // already in the middle copy
    const target = home + valueOf(pos);
    scrollY.current = target * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y: target * ITEM_HEIGHT, animated: false });
    setMiddle(target);
  };

  const commit = (pos: number) => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
    const value = valueOf(pos);
    if (value !== index) onChange(value);
    recenter(pos);
  };

  // If the time changes from somewhere else, roll the wheel to it (the short way round)
  useEffect(() => {
    const pos = posAt(scrollY.current);
    const current = valueOf(pos);
    if (current === index) return;

    let delta = index - current;
    if (loop) {
      if (delta > count / 2) delta -= count;
      else if (delta < -count / 2) delta += count;
    }
    const target = Math.max(0, Math.min(total - 1, pos + delta));
    scrollRef.current?.scrollTo({ y: target * ITEM_HEIGHT, animated: true });
    // the helpers only depend on count, total and loop, which never change for a wheel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    },
    [],
  );

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    scrollY.current = y;
    const pos = posAt(y);
    setMiddle(pos);
    onSpin();

    // Some phones don't say when the wheel stops, so also wait for it to go quiet
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => commit(pos), SETTLE_MS);
  };

  const onStop = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pos = posAt(event.nativeEvent.contentOffset.y);
    const targetY = pos * ITEM_HEIGHT;

    scrollY.current = targetY;
    scrollRef.current?.scrollTo({
      y: targetY,
      animated: false,
    });

    setMiddle(pos);
    commit(pos);
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
        const next = loop
          ? (index + step + count) % count
          : Math.max(0, Math.min(count - 1, index + step));
        if (next !== index) onChange(next);
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
        onScrollBeginDrag={() => {
          dragging.current = true;
        }}
        onScrollEndDrag={() => {
          dragging.current = false;
        }}
        onMomentumScrollEnd={onStop}
        onLayout={() => {
          if (placed.current) return;
          placed.current = true;
          scrollRef.current?.scrollTo({ y: (home + index) * ITEM_HEIGHT, animated: false });
        }}
        testID={`wheel-${label}`}
      >
        {Array.from({ length: total }, (_, pos) => (
          <WheelItem key={pos} text={items[pos % count]} picked={pos === middle} color={textColor} />
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
    transform: [{ translateY: 34 * NUDGE_RATIO * 0.7 }], // lines the colon up with the numbers
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
    fontFamily: Platform.OS === 'android' ? 'sans-serif' : fonts.headingBold,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  itemPicked: {},
  itemOther: {
    opacity: 0.4,
  },
});