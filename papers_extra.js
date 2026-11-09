/* ===================================================================
   多学科题库
   - G1：高等数学 多选/判断专项（复用已有考点）
   - L1：线性代数
   - P1：大学物理
   - C1：大学化学
   题型：single 单选 / multi 多选 / judge 判断（选项固定 正确 / 错误）
   =================================================================== */

var SUBJECTS = ["高等数学", "线性代数", "大学物理", "大学化学"];

["A", "B", "C", "D"].forEach(function (c) {
  if (PAPERS[c]) PAPERS[c].subject = "高等数学";
});

PAPERS["G1"] = {
  subject: "高等数学",
  label: "多选判断专项 · 极限与微分",
  tabCode: "专项",
  title: "高等数学 第一章、第二章 多选与判断专项训练",
  questions: [
    { num: 1, type: "multi", question: "当 x→0 时，下列无穷小中是 x 的高阶无穷小的有（　　）",
      options: { A: "x²", B: "sin(x²)", C: "1 − cos x", D: "ln(1+x)" }, answer: "ABC",
      explanation: "x² 是二阶；sin(x²) ~ x² 二阶；1−cos x ~ x²/2 二阶；ln(1+x) ~ x 是一阶，与 x 等价。" },
    { num: 2, type: "multi", question: "下列函数在 x = 0 处连续的有（　　）（B、C 中补定义 f(0)=0）",
      options: { A: "|x|", B: "sin(1/x)", C: "x·sin(1/x)", D: "1/x" }, answer: "AC",
      explanation: "|x| 连续；sin(1/x) 振荡无极限；x sin(1/x) 由夹逼趋于 0，连续；1/x 无定义且为无穷。" },
    { num: 3, type: "multi", question: "下列函数在其定义域内单调递增的有（　　）",
      options: { A: "x³", B: "e^x", C: "ln x", D: "1/x" }, answer: "ABC",
      explanation: "x³、e^x、ln x 均单调递增；1/x 在 (−∞,0) 与 (0,+∞) 上分别递减。" },
    { num: 4, type: "multi", question: "关于可导与连续，下列说法正确的有（　　）",
      options: { A: "可导必连续", B: "连续必可导", C: "|x| 在 x = 0 处连续但不可导", D: "在 x₀ 可导则 f′(x₀) 唯一" }, answer: "ACD",
      explanation: "可导是连续的充分不必要条件，B 错；C 是经典反例；D 由极限唯一性成立。" },
    { num: 5, type: "multi", question: "设 f(x) = x³ − 3x，则（　　）",
      options: { A: "f′(−1) = 0", B: "x = −1 是极大值点", C: "x = 1 是极小值点", D: "f 在 (−1, 1) 上单调递减" }, answer: "ABCD",
      explanation: "f′ = 3x² − 3，f′(±1)=0；f″ = 6x，f″(−1)<0 极大、f″(1)>0 极小；(−1,1) 内 f′<0 递减。" },
    { num: 6, type: "judge", question: "若 lim f(x) 与 lim g(x) 都不存在，则 lim[f(x) + g(x)] 一定不存在。",
      options: { A: "正确", B: "错误" }, answer: "B",
      explanation: "反例：f(x)=1/x，g(x)=−1/x，两者在 x→0 时都不存在极限，但和为 0，极限存在。" },
    { num: 7, type: "judge", question: "若 f 在 x₀ 处可导，则 f 在 x₀ 处一定连续。",
      options: { A: "正确", B: "错误" }, answer: "A",
      explanation: "可导必连续，这是可导的必要结论。" },
    { num: 8, type: "judge", question: "若 f′(x₀) = 0，则 x₀ 一定是 f 的极值点。",
      options: { A: "正确", B: "错误" }, answer: "B",
      explanation: "反例 f(x)=x³，f′(0)=0 但 x=0 不是极值点（驻点只是可疑点）。" },
    { num: 9, type: "judge", question: "闭区间上连续的函数一定在该区间上取得最大值和最小值。",
      options: { A: "正确", B: "错误" }, answer: "A",
      explanation: "闭区间连续函数的最值定理（有界性与最值定理）。" },
    { num: 10, type: "judge", question: "单调有界数列必有极限。",
      options: { A: "正确", B: "错误" }, answer: "A",
      explanation: "单调有界准则：单调递增且有上界（或单调递减且有下界）的数列收敛。" }
  ]
};
