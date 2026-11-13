import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradientStops, gradientDirection, fonts, shadows } from '../theme';
import {
  SAMPLE_GOALS,
  SAMPLE_IMPACT,
  STAT_MODES,
  makeSampleSessions,
  type StatMode,
} from '../stats/sampleStats';
import { fetchSessions } from '../stats/modeSessions';
import {
  TIME_BUCKET_LABELS,
  addDays,
  currentStreak,
  dailyBreakdown,
  formatChange,
  formatMinutes,
  goalProgress,
  pickHeadline,
  recentSessions,
  startOfDay,
  summarizeWeek,
  timeOfDayPattern,
  type DayBreakdown,
  type Headline,
  type ModeSession,
  type ModeWeekSummary,
} from '../stats/statsMath';

const CHART_HEIGHT = 140;
const MODE_BY_ID: Record<string, StatMode> = Object.fromEntries(
  STAT_MODES.map((m) => [m.id, m] as const),
);

// Set this to true to see the fake demo data again (handy for testing or showing off the app)
const USE_SAMPLE_DATA: boolean = false;

export default function StatsScreen() {
  const [data, setData] = useState<{ sessions: ModeSession[]; now: Date } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const now = new Date();

    if (USE_SAMPLE_DATA) {
      setData({ sessions: makeSampleSessions(now), now });
      return;
    }

    try {
      // The last 4 weeks covers everything this screen shows
      const sessions = await fetchSessions(addDays(startOfDay(now), -27), now);
      setData({ sessions, now });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    }
  }

  // Loads fresh stats every time the Stats tab is opened
  useEffect(() => {
    load();
  }, []);

  return (
    <LinearGradient
      colors={[colors.gradientLight, colors.gradientMain]}
      locations={[...gradientStops]}
      start={gradientDirection.start}
      end={gradientDirection.end}
      style={styles.bg}
    >
      {/* Background */}
      <Image
        source={require('../../assets/HomePage/Cloud Background.png')}
        style={styles.backgroundImage}
        resizeMode="stretch"
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Your Stats</Text>

          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : !data ? (
            <ActivityIndicator size="large" color={colors.text} style={styles.loading} />
          ) : data.sessions.length === 0 ? (
            <EmptyState />
          ) : (
            <StatsContent sessions={data.sessions} now={data.now} />
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Everything on the screen once the sessions have loaded
function StatsContent({ sessions, now }: { sessions: ModeSession[]; now: Date }) {
  const modeIds = STAT_MODES.map((m) => m.id);
  const summaries = summarizeWeek(sessions, modeIds, now);
  const days = dailyBreakdown(sessions, modeIds, now);
  const headline = pickHeadline(summaries);
  const lastFourWeeks = recentSessions(sessions, now, 4);

  return (
    <>
      {headline && <HeadlineCard headline={headline} />}

      <Text style={styles.sectionTitle}>Your week</Text>
      <WeekCard days={days} summaries={summaries} />

      <Text style={styles.sectionTitle}>Streaks</Text>
      <StreaksCard sessions={sessions} now={now} />

      <Text style={styles.sectionTitle}>Weekly goals</Text>
      <GoalsCard summaries={summaries} now={now} />

      <Text style={styles.sectionTitle}>When you use your modes</Text>
      <TimeOfDayCard sessions={lastFourWeeks} />

      {/* Only shown with the demo data until Modo really tracks these */}
      {USE_SAMPLE_DATA && (
        <>
          <Text style={styles.sectionTitle}>What Modo did for you</Text>
          <ImpactRow />
        </>
      )}
    </>
  );
}

// ---------- The big card at the top ----------

function HeadlineCard({ headline }: { headline: NonNullable<Headline> }) {
  const s = headline.summary;
  const mode = MODE_BY_ID[s.modeId];
  if (!mode) return null;

  const title =
    headline.kind === 'up'
      ? `${mode.label} is up ${formatMinutes(headline.change)} this week`
      : `${formatMinutes(s.minutes)} of ${mode.label} this week`;

  const subtitle =
    headline.kind === 'up'
      ? `${formatMinutes(s.minutes)} so far, compared to ${formatMinutes(s.lastWeekMinutes)} by this time last week.`
      : `${mode.label} is your most used mode so far.`;

  return (
    <View style={[styles.headline, { backgroundColor: mode.color }]}>
      <View style={styles.headlineText}>
        <Text style={styles.headlineTitle}>{title}</Text>
        <Text style={styles.headlineSub}>{subtitle}</Text>
      </View>
      <Image source={mode.image} style={styles.headlineImg} resizeMode="contain" />
    </View>
  );
}

// ---------- Bar chart + time per mode ----------

function WeekCard({ days, summaries }: { days: DayBreakdown[]; summaries: ModeWeekSummary[] }) {
  const maxDay = Math.max(...days.map((d) => d.total), 1);
  const weekTotal = summaries.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <View style={styles.card}>
      <Text style={styles.cardBig}>{formatMinutes(weekTotal)}</Text>
      <Text style={styles.cardSub}>in modes so far this week</Text>

      {/* Stacked bars, Monday to Sunday */}
      <View style={styles.chart}>
        {days.map((day, i) => (
          <View key={i} style={styles.chartColumn}>
            <View style={[styles.barTrack, day.isFuture && styles.barTrackFuture]}>
              {day.total > 0 && (
                <View style={[styles.barStack, { height: (day.total / maxDay) * CHART_HEIGHT }]}>
                  {STAT_MODES.map((m) =>
                    day.byMode[m.id] > 0 ? (
                      <View key={m.id} style={{ flex: day.byMode[m.id], backgroundColor: m.color }} />
                    ) : null,
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{day.label}</Text>
          </View>
        ))}
      </View>

      {/* Each mode's total, which also works as the chart's colour key */}
      {summaries.map((s) => {
        const mode = MODE_BY_ID[s.modeId];
        if (!mode) return null;
        return (
          <View key={s.modeId} style={styles.modeRow}>
            <View style={[styles.modeIcon, { backgroundColor: mode.color }]}>
              <Image source={mode.image} style={styles.modeIconImg} resizeMode="contain" />
            </View>
            <View style={styles.modeInfo}>
              <Text style={styles.modeName}>{mode.label}</Text>
              <Text style={styles.modeMeta}>
                Used {s.timesUsed} {s.timesUsed === 1 ? 'time' : 'times'}
              </Text>
            </View>
            <View style={styles.modeRight}>
              <Text style={styles.modeTime}>{formatMinutes(s.minutes)}</Text>
              <ChangePill change={s.minutes - s.lastWeekMinutes} />
            </View>
          </View>
        );
      })}

      <Text style={styles.footnote}>Changes are compared to this time last week.</Text>
    </View>
  );
}

// Green when up, plain grey when down (no guilt trips)
function ChangePill({ change }: { change: number }) {
  const up = change >= 1;
  return (
    <View style={[styles.pill, up ? styles.pillUp : styles.pillNeutral]}>
      {up && <Ionicons name="trending-up" size={13} color={UP_TEXT} />}
      <Text style={[styles.pillText, { color: up ? UP_TEXT : NEUTRAL_TEXT }]}>
        {formatChange(change)}
      </Text>
    </View>
  );
}

// ---------- Streaks ----------

function StreaksCard({ sessions, now }: { sessions: ModeSession[]; now: Date }) {
  return (
    <View style={[styles.card, styles.streakCard]}>
      {STAT_MODES.map((m) => {
        const streak = currentStreak(sessions, m.id, now);
        return (
          <View key={m.id} style={styles.streakItem}>
            <Ionicons name="flame" size={28} color={streak > 0 ? m.color : '#C9C9D1'} />
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>
              {streak > 0 ? `${streak === 1 ? 'day' : 'days'} of ${m.label}` : `Start a ${m.label} streak`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Goals ----------

function GoalsCard({ summaries, now }: { summaries: ModeWeekSummary[]; now: Date }) {
  return (
    <View style={styles.card}>
      {SAMPLE_GOALS.map((goal, i) => {
        const mode = MODE_BY_ID[goal.modeId];
        if (!mode) return null;

        const p = goalProgress(goal, summaries.find((s) => s.modeId === goal.modeId), now);
        const goalText =
          goal.kind === 'hours'
            ? `${mode.label} for ${goal.target}h a week`
            : `${mode.label} ${goal.target} days a week`;
        const progressText =
          goal.kind === 'hours'
            ? `${formatMinutes(p.current)} of ${goal.target}h`
            : `${p.current} of ${goal.target} days`;

        return (
          <View key={goal.modeId} style={i > 0 && styles.goalSpacing}>
            <View style={styles.goalTop}>
              <Text style={styles.goalName}>{goalText}</Text>
              {p.done ? (
                <View style={styles.goalStatus}>
                  <Ionicons name="checkmark-circle" size={16} color={UP_TEXT} />
                  <Text style={[styles.goalStatusText, { color: UP_TEXT }]}>Goal reached</Text>
                </View>
              ) : p.onTrack ? (
                <Text style={[styles.goalStatusText, { color: UP_TEXT }]}>On track</Text>
              ) : null}
            </View>

            <View style={styles.progressTrack}>
              <View style={{ flex: p.fraction, backgroundColor: mode.color, borderRadius: 999 }} />
              <View style={{ flex: 1 - p.fraction }} />
            </View>

            <Text style={styles.goalProgressText}>{progressText}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ---------- Time of day ----------

function TimeOfDayCard({ sessions }: { sessions: ModeSession[] }) {
  return (
    <View style={styles.card}>
      {STAT_MODES.map((m, i) => {
        const pattern = timeOfDayPattern(sessions, m.id);
        return (
          <View key={m.id} style={i > 0 && styles.timeSpacing}>
            <View style={styles.timeTop}>
              <Text style={styles.modeName}>{m.label}</Text>
              <Text style={styles.timeUsual}>
                {pattern.usualTime ? `Usually ${pattern.usualTime}` : 'Not used yet'}
              </Text>
            </View>
            {/* Darker blocks = more often */}
            <View style={styles.heatRow}>
              {pattern.counts.map((count, b) => (
                <View
                  key={b}
                  style={[
                    styles.heatCell,
                    {
                      backgroundColor: m.color,
                      opacity: pattern.max > 0 ? 0.12 + 0.88 * (count / pattern.max) : 0.12,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        );
      })}

      <View style={styles.heatLabels}>
        {TIME_BUCKET_LABELS.map((label) => (
          <Text key={label} style={styles.heatLabel}>
            {label}
          </Text>
        ))}
      </View>
      <Text style={styles.footnote}>Based on the last 4 weeks.</Text>
    </View>
  );
}

// ---------- What Modo did ----------

function ImpactRow() {
  return (
    <View style={styles.impactRow}>
      {SAMPLE_IMPACT.map((item) => (
        <View key={item.label} style={[styles.impactTile, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={26} color="#fff" />
          <Text style={styles.impactValue}>{item.value}</Text>
          <Text style={styles.impactLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

// ---------- No data yet ----------

function EmptyState() {
  return (
    <View style={[styles.card, styles.empty]}>
      <Image
        source={require('../../assets/HomePage/ClassicModo 1.png')}
        style={styles.emptyImg}
        resizeMode="contain"
      />
      <Text style={styles.emptyTitle}>No stats yet</Text>
      <Text style={styles.emptyText}>
        Turn on a mode and Modo will start keeping track for you.
      </Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={[styles.card, styles.empty]}>
      <Text style={styles.emptyTitle}>Couldn’t load your stats</Text>
      <Text style={styles.emptyText}>{message}</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => [styles.retry, pressed && styles.retryPressed]}
        accessibilityRole="button"
      >
        <Text style={styles.retryText}>Try again</Text>
      </Pressable>
    </View>
  );
}

// ---------- Styles ----------

const UP_TEXT = '#2E8B60';
const NEUTRAL_TEXT = '#6B6B76';
const TRACK = '#F1F1F4';

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },

  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    aspectRatio: 786 / 1602,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  title: {
    fontSize: 34,
    fontFamily: fonts.headingBold,
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 22,
    fontFamily: fonts.headingBold,
    color: colors.text,
    marginTop: 24,
    marginBottom: 10,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    ...shadows.raised,
  },

  footnote: {
    marginTop: 14,
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.5,
  },

  // Headline
  headline: {
    borderRadius: 28,
    paddingVertical: 22,
    paddingLeft: 20,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.raised,
  },

  headlineText: {
    flex: 1,
    paddingRight: 8,
  },

  headlineTitle: {
    color: '#fff',
    fontSize: 28,
    lineHeight: 32,
    fontFamily: fonts.headingBold,
  },

  headlineSub: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.bodyBold,
    marginTop: 8,
    opacity: 0.92,
  },

  headlineImg: {
    width: 110,
    height: 110,
  },

  // Week chart
  cardBig: {
    fontSize: 32,
    fontFamily: fonts.headingBold,
    color: colors.text,
  },

  cardSub: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.6,
    marginTop: -4,
  },

  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 6,
  },

  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },

  barTrack: {
    height: CHART_HEIGHT,
    width: 24,
    borderRadius: 8,
    backgroundColor: TRACK,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },

  barTrackFuture: {
    opacity: 0.5,
  },

  barStack: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },

  dayLabel: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.5,
  },

  dayLabelToday: {
    opacity: 1,
  },

  // Mode rows
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modeIconImg: {
    width: 34,
    height: 34,
  },

  modeInfo: {
    flex: 1,
    marginLeft: 12,
  },

  modeName: {
    fontSize: 17,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },

  modeMeta: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.55,
  },

  modeRight: {
    alignItems: 'flex-end',
  },

  modeTime: {
    fontSize: 17,
    fontFamily: fonts.headingBold,
    color: colors.text,
  },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginTop: 2,
  },

  pillUp: {
    backgroundColor: '#E3F5EC',
  },

  pillNeutral: {
    backgroundColor: TRACK,
  },

  pillText: {
    fontSize: 12,
    fontFamily: fonts.bodyBold,
  },

  // Streaks
  streakCard: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },

  streakItem: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 4,
  },

  streakNumber: {
    fontSize: 30,
    lineHeight: 36,
    fontFamily: fonts.headingBold,
    color: colors.text,
    marginTop: 2,
  },

  streakLabel: {
    fontSize: 13,
    lineHeight: 17,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.6,
    textAlign: 'center',
  },

  // Goals
  goalSpacing: {
    marginTop: 18,
  },

  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  goalName: {
    flexShrink: 1,
    fontSize: 16,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },

  goalStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  goalStatusText: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
  },

  progressTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 999,
    backgroundColor: TRACK,
    overflow: 'hidden',
  },

  goalProgressText: {
    marginTop: 6,
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.55,
  },

  // Time of day
  timeSpacing: {
    marginTop: 16,
  },

  timeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },

  timeUsual: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.6,
  },

  heatRow: {
    flexDirection: 'row',
    gap: 4,
  },

  heatCell: {
    flex: 1,
    height: 22,
    borderRadius: 6,
  },

  heatLabels: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 6,
  },

  heatLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.5,
  },

  // Impact
  impactRow: {
    flexDirection: 'row',
    gap: 12,
  },

  impactTile: {
    flex: 1,
    borderRadius: 22,
    padding: 16,
    ...shadows.raised,
  },

  impactValue: {
    color: '#fff',
    fontSize: 30,
    lineHeight: 36,
    fontFamily: fonts.headingBold,
    marginTop: 6,
  },

  impactLabel: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
    fontFamily: fonts.bodyBold,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
  },

  emptyImg: {
    width: 110,
    height: 110,
  },

  emptyTitle: {
    marginTop: 10,
    fontSize: 22,
    fontFamily: fonts.headingBold,
    color: colors.text,
  },

  emptyText: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.7,
    textAlign: 'center',
  },

  // Loading and errors
  loading: {
    marginTop: 60,
  },

  retry: {
    marginTop: 16,
    backgroundColor: '#5B6BB5',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },

  retryPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },

  retryText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },
});