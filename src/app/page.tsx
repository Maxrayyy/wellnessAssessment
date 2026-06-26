"use client";

import { useState, useEffect, useCallback } from "react";

type Step = 1 | 2 | 3 | 4;

interface AssessmentData {
  gender?: string;
  goal?: string;
  age?: number;
  height?: number;
  weight?: number;
  targetWeight?: number;
  activityLevel?: string;
}

interface ResultData {
  bmi: number;
  bmiCategory: string;
  recommendedCalories: number;
  targetDate: string;
  predictionCurve?: { date: string; predictedWeight: number }[] | null;
  upsell?: string;
}

const STEP_LABELS = [
  { step: 1, title: "你的生理性别", subtitle: "不同性别的代谢基准不同，这将用于后续计算。" },
  { step: 2, title: "你希望达成什么", subtitle: "每个目标都值得被认真对待。" },
  { step: 3, title: "身体数据", subtitle: "这些数据将用于精确计算你的健康指标。" },
  { step: 4, title: "运动习惯", subtitle: "最后一步了。" },
];

export default function Home() {
  const [step, setStep] = useState<Step>(1);
  const [data, setData] = useState<AssessmentData>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [subStatus, setSubStatus] = useState<string>("FREE");
  const [error, setError] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    fetch("/api/assessment")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok && res.data) {
          if (res.data.completed) {
            setData(res.data.data);
            setStep(4);
            fetchResult();
          } else if (res.data.currentStep > 1) {
            setData(res.data.data || {});
            setStep(res.data.currentStep as Step);
          }
        }
      })
      .catch(() => {})
      .finally(() => setInitialized(true));
  }, []);

  const fetchResult = async () => {
    const r = await fetch("/api/assessment/result");
    const res = await r.json();
    if (res.bmi) setResult(res);
    if (res.upsell) setShowPaywall(true);
  };

  const transitionStep = (nextStep: Step) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(nextStep);
      setAnimating(false);
    }, 180);
  };

  const handleNext = async (stepData: Record<string, unknown>) => {
    setLoading(true);
    setError("");

    const newData = { ...data, ...stepData };
    setData(newData);

    const r = await fetch("/api/assessment", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, data: stepData }),
    });
    const res = await r.json();

    if (!res.ok) {
      setError(res.error || "提交失败，请检查输入。");
      setLoading(false);
      return;
    }

    if (step < 4) {
      transitionStep((step + 1) as Step);
    } else {
      const cr = await fetch("/api/assessment/complete", { method: "POST" });
      const cRes = await cr.json();
      if (cRes.bmi) {
        setResult(cRes);
        if (cRes.upsell) setShowPaywall(true);
      }
    }
    setLoading(false);
  };

  const handlePay = async () => {
    setLoading(true);
    await fetch("/api/pay", { method: "POST" });
    setSubStatus("PREMIUM");
    const r = await fetch("/api/assessment/result");
    const res = await r.json();
    setResult(res);
    setShowPaywall(false);
    setLoading(false);
  };

  const handleRestart = () => {
    setResult(null);
    setShowPaywall(false);
    setData({});
    setStep(1);
    setError("");
  };

  if (!initialized) return null;

  // ── 结果页 ──
  if (result) {
    const isBmiHigh = result.bmiCategory === "Overweight" || result.bmiCategory === "Obese";
    const isBmiLow = result.bmiCategory === "Underweight";

    return (
      <main style={styles.wrapper}>
        <div style={styles.card}>
          <div style={styles.resultHeader}>
            <p style={styles.resultLabel}>你的健康评估报告</p>
            <h2 style={styles.resultBmi}>
              {result.bmi}
              <span style={styles.resultBmiUnit}> BMI</span>
            </h2>
            <span style={{
              ...styles.badge,
              background: isBmiHigh ? "#fef2f2" : isBmiLow ? "#fffbeb" : "#f0fdf4",
              color: isBmiHigh ? "#dc2626" : isBmiLow ? "#d97706" : "#16a34a",
            }}>
              {result.bmiCategory}
            </span>
          </div>

          <div style={styles.resultGrid}>
            <ResultTile label="每日推荐摄入" value={result.recommendedCalories} unit=" kcal" />
            <ResultTile label="预计达成日期" value={result.targetDate} unit="" />
          </div>

          {result.predictionCurve ? (
            <div style={styles.curveSection}>
              <p style={styles.curveTitle}>30 天体重预测</p>
              <div style={styles.curve}>
                {result.predictionCurve.map((p, i) => (
                  <div key={i} style={styles.curveBar}>
                    <div style={{
                      ...styles.curveFill,
                      height: `${Math.max(2, ((p.predictedWeight - 60) / 30) * 100)}%`,
                      background: i === result.predictionCurve!.length - 1
                        ? "var(--primary, #8B5CF6)" : "#e9d5ff",
                    }} />
                    <span style={styles.curveDate}>{p.date.slice(5)}</span>
                    <span style={styles.curveVal}>{p.predictedWeight}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {showPaywall && (
            <div style={styles.paywall}>
              <div style={styles.paywallIcon}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </div>
              <h3 style={styles.paywallTitle}>解锁完整报告</h3>
              <p style={styles.paywallDesc}>
                订阅后查看 30 天体重预测曲线、每日营养建议和定制化运动计划。
              </p>
              <button style={styles.payBtn} onClick={handlePay} disabled={loading}>
                {loading ? "处理中..." : "订阅 Premium · ¥9.9/月"}
              </button>
              {subStatus === "PREMIUM" && (
                <p style={{ marginTop: 10, color: "#16a34a", fontSize: 14, fontWeight: 500 }}>
                  已解锁全部功能
                </p>
              )}
            </div>
          )}

          <button onClick={handleRestart} style={styles.restartBtn}>重新测评</button>
        </div>
      </main>
    );
  }

  // ── 测评表单 ──
  const current = STEP_LABELS[step - 1];

  return (
    <main style={styles.wrapper}>
      <div style={styles.card}>
        {/* 进度 */}
        <div style={styles.progressRow}>
          {[1, 2, 3, 4].map((s) => (
            <div key={s} style={styles.progressTrack}>
              <div style={{
                ...styles.progressDot,
                background: s <= step ? "#8B5CF6" : "transparent",
                borderColor: s <= step ? "#8B5CF6" : "#d4d4d8",
              }} />
            </div>
          ))}
          <span style={styles.progressText}>步骤 {step} / 4</span>
        </div>

        <div style={{
          ...styles.stepBody,
          opacity: animating ? 0 : 1,
          transform: animating ? "translateY(8px)" : "translateY(0)",
          transition: "opacity 180ms ease, transform 180ms ease",
        }}>
          <h1 style={styles.title}>{current.title}</h1>
          <p style={styles.subtitle}>{current.subtitle}</p>

          {error && <p style={styles.errorMsg}>{error}</p>}

          {step === 1 && <Step1 onNext={handleNext} loading={loading} defaultVal={data.gender} />}
          {step === 2 && <Step2 onNext={handleNext} loading={loading} defaultVal={data.goal} />}
          {step === 3 && <Step3 onNext={handleNext} loading={loading} defaultData={data} />}
          {step === 4 && <Step4 onNext={handleNext} loading={loading} defaultVal={data.activityLevel} />}
        </div>
      </div>
    </main>
  );
}

// ── Result Components ──

function ResultTile({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div style={styles.tile}>
      <span style={styles.tileLabel}>{label}</span>
      <span style={styles.tileValue}>{value}{unit}</span>
    </div>
  );
}

// ── Step Components ──

function Step1({ onNext, loading, defaultVal }: { onNext: (d: any) => void; loading: boolean; defaultVal?: string }) {
  const [val, setVal] = useState(defaultVal || "");
  const opts = [
    { value: "male", label: "男性" },
    { value: "female", label: "女性" },
  ];
  return (
    <div>
      {opts.map((o) => (
        <button
          key={o.value}
          style={{ ...styles.option, ...(val === o.value ? styles.optionOn : {}) }}
          onClick={() => setVal(o.value)}
        >
          {o.label}
        </button>
      ))}
      <button style={styles.cta} disabled={!val || loading} onClick={() => onNext({ gender: val })}>
        {loading ? "保存中..." : "继续"}
      </button>
    </div>
  );
}

function Step2({ onNext, loading, defaultVal }: { onNext: (d: any) => void; loading: boolean; defaultVal?: string }) {
  const [val, setVal] = useState(defaultVal || "");
  const opts = [
    { value: "lose_weight", label: "减重" },
    { value: "gain_weight", label: "增重" },
    { value: "maintain", label: "维持体重" },
    { value: "improve_health", label: "改善整体健康" },
  ];
  return (
    <div>
      {opts.map((o) => (
        <button
          key={o.value}
          style={{ ...styles.option, ...(val === o.value ? styles.optionOn : {}) }}
          onClick={() => setVal(o.value)}
        >
          {o.label}
        </button>
      ))}
      <button style={styles.cta} disabled={!val || loading} onClick={() => onNext({ goal: val })}>
        {loading ? "保存中..." : "继续"}
      </button>
    </div>
  );
}

function Step3({ onNext, loading, defaultData }: { onNext: (d: any) => void; loading: boolean; defaultData: AssessmentData }) {
  const [age, setAge] = useState(defaultData.age?.toString() || "");
  const [height, setHeight] = useState(defaultData.height?.toString() || "");
  const [weight, setWeight] = useState(defaultData.weight?.toString() || "");
  const [target, setTarget] = useState(defaultData.targetWeight?.toString() || "");

  const fields = [
    { k: "age", label: "年龄", val: age, set: setAge, unit: "岁", ph: "18-100" },
    { k: "height", label: "身高", val: height, set: setHeight, unit: "cm", ph: "100-250" },
    { k: "weight", label: "体重", val: weight, set: setWeight, unit: "kg", ph: "30-300" },
    { k: "target", label: "目标体重", val: target, set: setTarget, unit: "kg", ph: "30-300" },
  ];

  const filled = age && height && weight && target;
  return (
    <div>
      {fields.map((f) => (
        <div key={f.k} style={styles.field}>
          <label style={styles.fieldLabel}>{f.label}</label>
          <div style={styles.inputRow}>
            <input
              type="number"
              style={styles.input}
              placeholder={f.ph}
              value={f.val}
              onChange={(e) => f.set(e.target.value)}
              inputMode="numeric"
            />
            <span style={styles.fieldUnit}>{f.unit}</span>
          </div>
        </div>
      ))}
      <button style={styles.cta} disabled={!filled || loading} onClick={() =>
        onNext({ age: Number(age), height: Number(height), weight: Number(weight), targetWeight: Number(target) })
      }>
        {loading ? "保存中..." : "继续"}
      </button>
    </div>
  );
}

function Step4({ onNext, loading, defaultVal }: { onNext: (d: any) => void; loading: boolean; defaultVal?: string }) {
  const [val, setVal] = useState(defaultVal || "");
  const opts = [
    { value: "sedentary", label: "久坐不动", desc: "几乎不运动" },
    { value: "light", label: "轻度活动", desc: "每周 1-3 天" },
    { value: "moderate", label: "中度活动", desc: "每周 3-5 天" },
    { value: "active", label: "高强度运动", desc: "每天运动" },
  ];
  return (
    <div>
      {opts.map((o) => (
        <button
          key={o.value}
          style={{ ...styles.option, flexDirection: "column", alignItems: "flex-start", ...(val === o.value ? styles.optionOn : {}) }}
          onClick={() => setVal(o.value)}
        >
          <span style={{ fontWeight: 500 }}>{o.label}</span>
          <span style={{ fontSize: 13, color: val === o.value ? "#7c3aed" : "#a1a1aa", marginTop: 2 }}>{o.desc}</span>
        </button>
      ))}
      <button
        style={{ ...styles.cta, background: val ? "#10B981" : "#e5e7eb", color: val ? "#fff" : "#a1a1aa" }}
        disabled={!val || loading}
        onClick={() => onNext({ activityLevel: val })}
      >
        {loading ? "计算中..." : "查看我的健康报告"}
      </button>
    </div>
  );
}

// ── Inline Styles ──

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Helvetica Neue", sans-serif';

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#FAF5FF",
    fontFamily: FONT,
    padding: "24px 16px",
  },
  card: {
    background: "#fff",
    borderRadius: 20,
    padding: "36px 28px",
    maxWidth: 420,
    width: "100%",
    boxShadow: "0 2px 20px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)",
    fontFamily: FONT,
  },
  progressRow: {
    display: "flex",
    alignItems: "center",
    gap: 0,
    marginBottom: 28,
  },
  progressTrack: {
    flex: 1,
    height: 2,
    background: "#e5e7eb",
    position: "relative" as any,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    border: "2px solid",
    position: "absolute" as any,
    top: -5,
    left: "50%",
    transform: "translateX(-50%)",
    transition: "all 200ms ease",
    background: "#fff",
  },
  progressText: {
    fontSize: 12,
    color: "#a1a1aa",
    marginLeft: 12,
    whiteSpace: "nowrap" as any,
  },
  stepBody: {},
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: "#18181b",
    letterSpacing: "-0.02em",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#71717a",
    lineHeight: 1.6,
    marginBottom: 28,
  },
  option: {
    display: "flex",
    width: "100%",
    padding: "15px 18px",
    border: "1.5px solid #e4e4e7",
    borderRadius: 12,
    background: "#fff",
    fontSize: 15,
    color: "#3f3f46",
    cursor: "pointer",
    marginBottom: 10,
    transition: "all 180ms ease",
    fontFamily: FONT,
    textAlign: "left" as any,
  },
  optionOn: {
    borderColor: "#8B5CF6",
    background: "#faf5ff",
    color: "#6d28d9",
  },
  cta: {
    width: "100%",
    padding: "14px 20px",
    background: "#8B5CF6",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    marginTop: 12,
    transition: "all 180ms ease",
    fontFamily: FONT,
    letterSpacing: "-0.01em",
  },
  field: {
    marginBottom: 18,
  },
  fieldLabel: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    color: "#52525b",
    marginBottom: 6,
    fontFamily: FONT,
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
  },
  input: {
    flex: 1,
    padding: "12px 16px",
    border: "1.5px solid #e4e4e7",
    borderRadius: 10,
    fontSize: 16,
    fontFamily: FONT,
    outline: "none",
    transition: "border-color 180ms ease",
    background: "#fafafa",
  },
  fieldUnit: {
    fontSize: 14,
    color: "#a1a1aa",
    marginLeft: 10,
    minWidth: 30,
    fontFamily: FONT,
  },
  errorMsg: {
    fontSize: 13,
    color: "#dc2626",
    background: "#fef2f2",
    padding: "10px 14px",
    borderRadius: 8,
    marginBottom: 16,
  },
  // Results
  resultHeader: {
    textAlign: "center" as any,
    marginBottom: 24,
  },
  resultLabel: {
    fontSize: 13,
    color: "#a1a1aa",
    textTransform: "uppercase" as any,
    letterSpacing: "0.08em",
    marginBottom: 8,
  },
  resultBmi: {
    fontSize: 48,
    fontWeight: 600,
    color: "#18181b",
    letterSpacing: "-0.03em",
    margin: "8px 0",
  },
  resultBmiUnit: {
    fontSize: 18,
    fontWeight: 400,
    color: "#71717a",
  },
  badge: {
    display: "inline-block",
    padding: "4px 14px",
    borderRadius: 20,
    fontSize: 13,
    fontWeight: 500,
  },
  resultGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 24,
  },
  tile: {
    background: "#fafafa",
    borderRadius: 14,
    padding: "18px 16px",
    display: "flex",
    flexDirection: "column" as any,
    gap: 6,
  },
  tileLabel: {
    fontSize: 12,
    color: "#a1a1aa",
  },
  tileValue: {
    fontSize: 20,
    fontWeight: 600,
    color: "#18181b",
    letterSpacing: "-0.02em",
  },
  curveSection: {
    marginBottom: 24,
  },
  curveTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: "#52525b",
    marginBottom: 14,
  },
  curve: {
    display: "flex",
    gap: 3,
    alignItems: "flex-end",
    height: 80,
    padding: "0 4px",
    overflowX: "auto",
  },
  curveBar: {
    flex: 1,
    minWidth: 20,
    display: "flex",
    flexDirection: "column" as any,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  curveFill: {
    width: "100%",
    borderRadius: "3px 3px 0 0",
    minHeight: 2,
    transition: "height 300ms ease",
  },
  curveDate: {
    fontSize: 9,
    color: "#a1a1aa",
    marginTop: 4,
  },
  curveVal: {
    fontSize: 9,
    color: "#52525b",
    fontWeight: 500,
  },
  paywall: {
    padding: "24px 20px",
    background: "#faf5ff",
    borderRadius: 16,
    border: "1.5px solid #ede9fe",
    textAlign: "center" as any,
    marginBottom: 16,
  },
  paywallIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    background: "#ede9fe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 14px",
  },
  paywallTitle: {
    fontSize: 17,
    fontWeight: 600,
    color: "#18181b",
    marginBottom: 6,
  },
  paywallDesc: {
    fontSize: 13,
    color: "#71717a",
    lineHeight: 1.6,
    marginBottom: 18,
  },
  payBtn: {
    padding: "14px 28px",
    background: "#8B5CF6",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: FONT,
    transition: "all 180ms ease",
  },
  restartBtn: {
    width: "100%",
    padding: "12px",
    background: "transparent",
    color: "#71717a",
    border: "1.5px solid #e4e4e7",
    borderRadius: 12,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: FONT,
    transition: "all 180ms ease",
  },
};
