import type { Gender, ActivityLevel, PredictionPoint } from "@/types";

export function calculateBMI(weight: number, height: number): number {
  const heightM = height / 100;
  return Math.round((weight / (heightM * heightM)) * 10) / 10;
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export function calculateBMR(gender: Gender, weight: number, height: number, age: number): number {
  if (gender === "male") return 10 * weight + 6.25 * height - 5 * age + 5;
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calculateDailyCalories(bmr: number, activityLevel: ActivityLevel): number {
  const multipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };
  return Math.round(bmr * multipliers[activityLevel]);
}

export function calculateTargetDate(currentWeight: number, targetWeight: number): string {
  const weightDiff = Math.abs(targetWeight - currentWeight);
  const days = (weightDiff * 7700) / 500;
  const target = new Date();
  target.setDate(target.getDate() + Math.round(days));
  return target.toISOString();
}

export function generatePredictionCurve(
  currentWeight: number, targetWeight: number, targetDate: string
): PredictionPoint[] {
  const today = new Date();
  const totalDays = Math.max(1, Math.ceil(
    (new Date(targetDate).getTime() - today.getTime()) / 86400000
  ));
  const points = Math.min(totalDays, 30);
  const interval = Math.max(1, Math.floor(totalDays / points));
  const curve: PredictionPoint[] = [];
  for (let i = 0; i <= points; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i * interval);
    const progress = (i * interval) / totalDays;
    curve.push({
      date: date.toISOString().split("T")[0],
      predictedWeight: Math.round((currentWeight + (targetWeight - currentWeight) * progress) * 10) / 10,
    });
  }
  return curve;
}
