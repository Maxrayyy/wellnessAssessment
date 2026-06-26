export type Gender = "male" | "female";

export type ActivityLevel = "sedentary" | "light" | "moderate" | "active";

export type Goal = "lose_weight" | "gain_weight" | "maintain" | "improve_health";

export type SubscriptionStatus = "FREE" | "PREMIUM";

export interface Step1Data { gender: Gender; }
export interface Step2Data { goal: Goal; }
export interface Step3Data { age: number; height: number; weight: number; targetWeight: number; }
export interface Step4Data { activityLevel: ActivityLevel; }
export type StepData = Step1Data | Step2Data | Step3Data | Step4Data;

export interface AssessmentState {
  currentStep: number;
  completed: boolean;
  data: {
    gender?: Gender;
    goal?: Goal;
    age?: number;
    height?: number;
    weight?: number;
    targetWeight?: number;
    activityLevel?: ActivityLevel;
  };
}

export interface PredictionPoint {
  date: string;
  predictedWeight: number;
}

export interface CalculationResult {
  bmi: number;
  bmiCategory: string;
  recommendedCalories: number;
  targetDate: string;
  predictionCurve?: PredictionPoint[] | null;
  upsell?: string;
}

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
