import { describe, it, expect } from "vitest";
import {
  calculateBMI,
  getBMICategory,
  calculateBMR,
  calculateDailyCalories,
  calculateTargetDate,
  generatePredictionCurve,
} from "@/lib/algorithm";

describe("calculateBMI", () => {
  it("标准 BMI: 70kg / 175cm → 22.9", () => {
    expect(calculateBMI(70, 175)).toBeCloseTo(22.9, 1);
  });
  it("边界: 身高 100cm, 体重 30kg → 30.0", () => {
    expect(calculateBMI(30, 100)).toBe(30.0);
  });
  it("边界: 身高 250cm, 体重 300kg → 48.0", () => {
    expect(calculateBMI(300, 250)).toBe(48.0);
  });
  it("边界: 体重 30kg / 170cm", () => {
    expect(calculateBMI(30, 170)).toBeCloseTo(10.4, 1);
  });
  it("边界: 体重 300kg / 170cm", () => {
    expect(calculateBMI(300, 170)).toBeCloseTo(103.8, 1);
  });
});

describe("getBMICategory", () => {
  it("Underweight: BMI = 17.0, 18.4", () => {
    expect(getBMICategory(17.0)).toBe("Underweight");
    expect(getBMICategory(18.4)).toBe("Underweight");
  });
  it("Normal: BMI = 18.5, 22.0, 24.9", () => {
    expect(getBMICategory(18.5)).toBe("Normal");
    expect(getBMICategory(22.0)).toBe("Normal");
    expect(getBMICategory(24.9)).toBe("Normal");
  });
  it("Overweight: BMI = 25.0, 27.5, 29.9", () => {
    expect(getBMICategory(25.0)).toBe("Overweight");
    expect(getBMICategory(27.5)).toBe("Overweight");
    expect(getBMICategory(29.9)).toBe("Overweight");
  });
  it("Obese: BMI = 30.0, 50.0", () => {
    expect(getBMICategory(30.0)).toBe("Obese");
    expect(getBMICategory(50.0)).toBe("Obese");
  });
});

describe("calculateBMR", () => {
  it("男性: 70kg/175cm/30岁 → 1648.75", () => {
    expect(calculateBMR("male", 70, 175, 30)).toBeCloseTo(1648.75, 1);
  });
  it("女性: 60kg/165cm/25岁 → 1345.25", () => {
    expect(calculateBMR("female", 60, 165, 25)).toBeCloseTo(1345.25, 1);
  });
});

describe("calculateDailyCalories", () => {
  const bmr = 1500;
  it("sedentary: ×1.2 = 1800", () => {
    expect(calculateDailyCalories(bmr, "sedentary")).toBe(1800);
  });
  it("light: ×1.375 = 2063", () => {
    expect(calculateDailyCalories(bmr, "light")).toBe(2063);
  });
  it("moderate: ×1.55 = 2325", () => {
    expect(calculateDailyCalories(bmr, "moderate")).toBe(2325);
  });
  it("active: ×1.725 = 2588", () => {
    expect(calculateDailyCalories(bmr, "active")).toBe(2588);
  });
});

describe("calculateTargetDate", () => {
  it("减重 5kg → 77 天", () => {
    const d = calculateTargetDate(70, 65);
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    expect(days).toBe(77);
  });
  it("增重 5kg → 77 天", () => {
    const d = calculateTargetDate(65, 70);
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    expect(days).toBe(77);
  });
  it("体重不变 → 0 天", () => {
    const d = calculateTargetDate(70, 70);
    const days = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
    expect(days).toBe(0);
  });
});

describe("generatePredictionCurve", () => {
  it("曲线包含起点和终点，长度 >= 2", () => {
    const td = new Date(); td.setDate(td.getDate() + 30);
    const curve = generatePredictionCurve(70, 65, td.toISOString().split("T")[0]);
    expect(curve.length).toBeGreaterThanOrEqual(2);
    expect(curve[0].predictedWeight).toBe(70);
    expect(curve[curve.length - 1].predictedWeight).toBe(65);
  });
  it("日期递增", () => {
    const td = new Date(); td.setDate(td.getDate() + 30);
    const curve = generatePredictionCurve(70, 65, td.toISOString().split("T")[0]);
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].date >= curve[i - 1].date).toBe(true);
    }
  });
});
