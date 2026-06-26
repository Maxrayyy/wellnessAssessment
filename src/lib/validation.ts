import type { Gender, ActivityLevel, Goal } from "@/types";

export interface ValidationError {
  field: string;
  message: string;
}

const VALID_GENDERS: Gender[] = ["male", "female"];
const VALID_GOALS: Goal[] = ["lose_weight", "gain_weight", "maintain", "improve_health"];
const VALID_ACTIVITY_LEVELS: ActivityLevel[] = ["sedentary", "light", "moderate", "active"];

export function validateStep1(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!data || typeof data !== "object") return [{ field: "data", message: "缺少数据" }];
  const d = data as Record<string, unknown>;
  if (!d.gender || !VALID_GENDERS.includes(d.gender as Gender)) {
    errors.push({ field: "gender", message: "请选择性别 (male/female)" });
  }
  return errors;
}

export function validateStep2(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!data || typeof data !== "object") return [{ field: "data", message: "缺少数据" }];
  const d = data as Record<string, unknown>;
  if (!d.goal || !VALID_GOALS.includes(d.goal as Goal)) {
    errors.push({ field: "goal", message: "请选择目标 (lose_weight/gain_weight/maintain/improve_health)" });
  }
  return errors;
}

export function validateStep3(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!data || typeof data !== "object") return [{ field: "data", message: "缺少数据" }];
  const d = data as Record<string, unknown>;

  const age = Number(d.age);
  if (isNaN(age) || age < 18 || age > 100) {
    errors.push({ field: "age", message: "年龄需在 18-100 之间" });
  }

  const height = Number(d.height);
  if (isNaN(height) || height < 100 || height > 250) {
    errors.push({ field: "height", message: "身高需在 100-250 cm 之间" });
  }

  const weight = Number(d.weight);
  if (isNaN(weight) || weight < 30 || weight > 300) {
    errors.push({ field: "weight", message: "体重需在 30-300 kg 之间" });
  }

  const targetWeight = Number(d.targetWeight);
  if (isNaN(targetWeight) || targetWeight < 30 || targetWeight > 300) {
    errors.push({ field: "targetWeight", message: "目标体重需在 30-300 kg 之间" });
  }

  if (!isNaN(weight) && !isNaN(targetWeight) && Math.abs(targetWeight - weight) > 50) {
    errors.push({ field: "targetWeight", message: "目标体重与当前体重差距不能超过 50 kg" });
  }

  return errors;
}

export function validateStep4(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!data || typeof data !== "object") return [{ field: "data", message: "缺少数据" }];
  const d = data as Record<string, unknown>;
  if (!d.activityLevel || !VALID_ACTIVITY_LEVELS.includes(d.activityLevel as ActivityLevel)) {
    errors.push({ field: "activityLevel", message: "请选择运动频率 (sedentary/light/moderate/active)" });
  }
  return errors;
}

export function validateStep(step: number, data: unknown): ValidationError[] {
  switch (step) {
    case 1: return validateStep1(data);
    case 2: return validateStep2(data);
    case 3: return validateStep3(data);
    case 4: return validateStep4(data);
    default: return [{ field: "step", message: "无效的步骤编号，需为 1-4" }];
  }
}
