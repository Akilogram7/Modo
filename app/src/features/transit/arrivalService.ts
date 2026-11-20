import scheduleData from './data/drt-schedules.json';

const TIME_ZONE = 'America/Toronto';

type ScheduleEntry = [
  number, // Route index
  number, // Destination index
  number, // Service index
  number, // Arrival minutes after service-day midnight
  number, // Pickup type
];

type ServiceCalendar = {
  service_id: string;
  monday: string;
  tuesday: string;
  wednesday: string;
  thursday: string;
  friday: string;
  saturday: string;
  sunday: string;
  start_date: string;
  end_date: string;
};

type CalendarException = {
  service_id: string;
  date: string;
  exception_type: string;
};

export type BusArrival = {
  route: string;
  destination: string;
  arrivalTime: string;
  minutesUntilArrival: number;
  serviceId: string;
};

const stops = scheduleData.stops as unknown as Record<string, ScheduleEntry[]>;
const calendar = scheduleData.calendar as ServiceCalendar[];
const exceptions = scheduleData.calendarDates as CalendarException[];

const weekdays = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function getTorontoTime(now: Date) {
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [
      part.type,
      part.value,
    ])
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

function getServiceDate(
  year: number,
  month: number,
  day: number,
  offset: number
) {
  // UTC is used here only for calendar arithmetic.
  const date = new Date(Date.UTC(year, month - 1, day + offset));

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');

  return {
    key: `${y}${m}${d}`,
    weekday: weekdays[date.getUTCDay()],
  };
}

function isServiceActive(
  serviceId: string,
  dateKey: string,
  weekday: (typeof weekdays)[number]
): boolean {
  const exception = exceptions.find(
    (entry) =>
      entry.service_id === serviceId &&
      entry.date === dateKey
  );

  if (exception) {
    return exception.exception_type === '1';
  }

  const service = calendar.find(
    (entry) => entry.service_id === serviceId
  );

  if (!service) return false;

  if (
    dateKey < service.start_date ||
    dateKey > service.end_date
  ) {
    return false;
  }

  return service[weekday] === '1';
}

function formatArrivalTime(totalMinutes: number): string {
  const minutesInDay = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function getUpcomingArrivals(
  stopId: string,
  now = new Date(),
  limit = 5
): BusArrival[] {
  const entries = stops[String(stopId)] ?? [];

  if (entries.length === 0 || limit <= 0) return [];

  const local = getTorontoTime(now);

  const currentMinutes =
    local.hour * 60 +
    local.minute +
    local.second / 60;

  const results: BusArrival[] = [];

  // Include yesterday for overnight GTFS trips and
  // tomorrow for early-morning upcoming departures.
  for (const dayOffset of [-1, 0, 1]) {
    const serviceDate = getServiceDate(
      local.year,
      local.month,
      local.day,
      dayOffset
    );

    for (const entry of entries) {
      const [
        routeIndex,
        destinationIndex,
        serviceIndex,
        arrivalMinutes,
        pickupType,
      ] = entry;

      // Only include stops where normal passenger pickup is allowed.
      if (pickupType !== 0) continue;

      const serviceId = scheduleData.services[serviceIndex];

      if (
        !isServiceActive(
          serviceId,
          serviceDate.key,
          serviceDate.weekday
        )
      ) {
        continue;
      }

      const minutesUntilArrival =
        dayOffset * 1440 +
        arrivalMinutes -
        currentMinutes;

      if (
        minutesUntilArrival < 0 ||
        minutesUntilArrival > 1440
      ) {
        continue;
      }

      results.push({
        route: scheduleData.routes[routeIndex],
        destination: scheduleData.destinations[destinationIndex],
        arrivalTime: formatArrivalTime(arrivalMinutes),
        minutesUntilArrival: Math.ceil(minutesUntilArrival),
        serviceId,
      });
    }
  }

  return results
    .sort(
      (a, b) =>
        a.minutesUntilArrival - b.minutesUntilArrival
    )
    .slice(0, limit);
}
