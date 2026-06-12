export type GoalStatus = "on_track" | "behind" | "ahead" | "completed";

export interface GoalMetrics {
  pct: number;
  remaining: number;
  monthsLeft: number;
  monthlyRequired: number | null;
  projectedDate: string | null;
  status: GoalStatus;
  statusLabel: string;
}

export function computeGoalMetrics(
  current: number,
  target: number,
  targetDate: string | null,
  monthlySurplus: number
): GoalMetrics {
  if (target <= 0) {
    return {
      pct: 0,
      remaining: 0,
      monthsLeft: 0,
      monthlyRequired: null,
      projectedDate: null,
      status: "on_track",
      statusLabel: "Ustaw cel w ustawieniach",
    };
  }

  if (current < 0) {
    const monthsLeft = targetDate
      ? Math.max(
          0,
          (new Date(targetDate + "T00:00:00").getFullYear() - new Date().getFullYear()) * 12 +
            (new Date(targetDate + "T00:00:00").getMonth() - new Date().getMonth())
        )
      : 0;
    const remaining = target - current;
    return {
      pct: 0,
      remaining,
      monthsLeft,
      monthlyRequired: monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : null,
      projectedDate: null,
      status: "behind",
      statusLabel: "Cel nie został jeszcze rozpoczęty według aktualnego majątku netto",
    };
  }

  const pct = Math.min(100, Math.round((current / target) * 1000) / 10);
  const remaining = Math.max(0, target - current);

  if (remaining <= 0) {
    return {
      pct: 100,
      remaining: 0,
      monthsLeft: 0,
      monthlyRequired: 0,
      projectedDate: null,
      status: "completed",
      statusLabel: "Cel osiągnięty",
    };
  }

  const now = new Date();
  let monthsLeft = 0;
  if (targetDate) {
    const end = new Date(targetDate + "T00:00:00");
    monthsLeft = Math.max(
      0,
      (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth())
    );
  }

  const monthlyRequired =
    monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining > 0 ? remaining : null;

  let projectedDate: string | null = null;
  if (monthlySurplus > 0 && remaining > 0) {
    const monthsToGoal = Math.ceil(remaining / monthlySurplus);
    const proj = new Date(now.getFullYear(), now.getMonth() + monthsToGoal, 1);
    projectedDate = proj.toISOString().slice(0, 10);
  }

  let status: GoalStatus = "on_track";
  let statusLabel = "Zgodnie z planem";

  if (targetDate && monthlyRequired != null && monthlySurplus > 0) {
    if (monthlySurplus >= monthlyRequired * 1.1) {
      status = "ahead";
      statusLabel = "Wyprzedzenie planu";
    } else if (monthlySurplus < monthlyRequired * 0.85) {
      status = "behind";
      statusLabel = "Opóźnienie względem planu";
    }
  } else if (monthlySurplus <= 0 && remaining > 0) {
    status = "behind";
    statusLabel = "Brak nadwyżki w okresie";
  }

  return {
    pct,
    remaining,
    monthsLeft,
    monthlyRequired,
    projectedDate,
    status,
    statusLabel,
  };
}
