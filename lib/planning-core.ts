export type PlanningRisk = "none" | "low" | "medium" | "high";
export type PlanningConfidence = "low" | "medium" | "high";

export type PlanningOccupancy = {
  laneId: string;
  startsAt: Date;
  endsAt: Date;
  kind: "booking" | "block" | "assignment";
};

export function compareNullableDatesAsc(a: string | null, b: string | null) {
  if (a && b) {
    return new Date(a).getTime() - new Date(b).getTime();
  }

  if (a) return -1;
  if (b) return 1;
  return 0;
}

export function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

export function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function toDateInputValue(value: Date) {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${value.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function diffInDays(start: Date, end: Date) {
  const startDate = startOfDay(start).getTime();
  const endDate = startOfDay(end).getTime();
  return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
}

export function rangesOverlap(
  rangeAStart: Date,
  rangeAEnd: Date,
  rangeBStart: Date,
  rangeBEnd: Date,
) {
  return rangeAStart <= rangeBEnd && rangeAEnd >= rangeBStart;
}

export function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

export function buildOccupancies<
  T extends { laneId: string | null; startsAt: string; endsAt: string },
>(items: T[], kind: PlanningOccupancy["kind"]) {
  const occupancies: PlanningOccupancy[] = [];

  for (const item of items) {
    if (!item.laneId) {
      continue;
    }

    const startsAt = parseDate(item.startsAt);
    const endsAt = parseDate(item.endsAt);

    if (!startsAt || !endsAt) {
      continue;
    }

    occupancies.push({
      laneId: item.laneId,
      startsAt,
      endsAt,
      kind,
    });
  }

  return occupancies;
}

export function findEarliestWindowForLane(
  laneId: string,
  durationDays: number,
  occupancies: PlanningOccupancy[],
  fromDate: Date,
  horizonDays = 180,
) {
  const laneOccupancies = occupancies
    .filter((item) => item.laneId === laneId)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const candidateStart = startOfDay(addDays(fromDate, offset));
    const candidateEnd = endOfDay(
      addDays(candidateStart, Math.max(durationDays, 1) - 1),
    );

    const hasConflict = laneOccupancies.some((occupancy) =>
      rangesOverlap(
        candidateStart,
        candidateEnd,
        occupancy.startsAt,
        occupancy.endsAt,
      ),
    );

    if (!hasConflict) {
      return {
        startsAt: candidateStart,
        endsAt: candidateEnd,
      };
    }
  }

  return null;
}

export function getRiskLevel(
  suggestedEndDate: Date | null,
  dueDate: Date | null,
): PlanningRisk {
  if (!suggestedEndDate || !dueDate) {
    return "medium";
  }

  const daysDelta = diffInDays(suggestedEndDate, dueDate);

  if (daysDelta < 0) {
    return "none";
  }

  if (daysDelta === 0) {
    return "low";
  }

  if (daysDelta <= 3) {
    return "medium";
  }

  return "high";
}

export function getConfidenceFromFitAndRisk(
  fitScore: number,
  riskLevel: PlanningRisk,
): PlanningConfidence {
  if (fitScore >= 3 && riskLevel !== "high") {
    return "high";
  }

  if (fitScore >= 2) {
    return "medium";
  }

  return "low";
}

export function getOverloadedLaneCount(
  laneIds: string[],
  occupancies: PlanningOccupancy[],
  rangeStart: Date,
  rangeEnd: Date,
  thresholdPercent = 85,
) {
  const rangeDays = Math.max(diffInDays(rangeStart, rangeEnd) + 1, 1);
  let overloaded = 0;

  for (const laneId of laneIds) {
    let occupiedDays = 0;

    for (const occupancy of occupancies) {
      if (occupancy.laneId !== laneId) {
        continue;
      }

      if (
        !rangesOverlap(
          rangeStart,
          rangeEnd,
          occupancy.startsAt,
          occupancy.endsAt,
        )
      ) {
        continue;
      }

      const overlapStart =
        occupancy.startsAt > rangeStart ? occupancy.startsAt : rangeStart;
      const overlapEnd =
        occupancy.endsAt < rangeEnd ? occupancy.endsAt : rangeEnd;

      occupiedDays += diffInDays(overlapStart, overlapEnd) + 1;
    }

    const utilization = Math.min(
      100,
      Math.round((occupiedDays / rangeDays) * 100),
    );

    if (utilization >= thresholdPercent) {
      overloaded += 1;
    }
  }

  return overloaded;
}

export function getUnderusedLaneCount(
  laneIds: string[],
  occupancies: PlanningOccupancy[],
  rangeStart: Date,
  rangeEnd: Date,
  thresholdPercent = 20,
) {
  const rangeDays = Math.max(diffInDays(rangeStart, rangeEnd) + 1, 1);
  let underused = 0;

  for (const laneId of laneIds) {
    let occupiedDays = 0;

    for (const occupancy of occupancies) {
      if (occupancy.laneId !== laneId) {
        continue;
      }

      if (
        !rangesOverlap(
          rangeStart,
          rangeEnd,
          occupancy.startsAt,
          occupancy.endsAt,
        )
      ) {
        continue;
      }

      const overlapStart =
        occupancy.startsAt > rangeStart ? occupancy.startsAt : rangeStart;
      const overlapEnd =
        occupancy.endsAt < rangeEnd ? occupancy.endsAt : rangeEnd;

      occupiedDays += diffInDays(overlapStart, overlapEnd) + 1;
    }

    const utilization = Math.min(
      100,
      Math.round((occupiedDays / rangeDays) * 100),
    );

    if (utilization <= thresholdPercent) {
      underused += 1;
    }
  }

  return underused;
}