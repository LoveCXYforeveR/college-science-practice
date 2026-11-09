/* 薄弱章节补充选择题（人工编写，逐题核对）
   按学科/大类名自动并入 BANK —— 与已有同名大类合并，不新增重复卡片
   字段与原 bank.js 完全一致：{type, q, options, answer, explanation} */
var BANK_EXTRA = {
  "高等数学": [
    {
      "id": "gs_int_geo",
      "name": "定积分的几何应用",
      "desc": "面积、旋转体体积的定积分计算",
      "questions": [
        {
          "type": "single",
          "q": "曲线 y=x² 与直线 y=4 围成图形的面积是（　　）",
          "options": { "A": "32/3", "B": "16/3", "C": "8/3", "D": "4/3" },
          "answer": "A",
          "explanation": "交点 x=±2，面积=∫₋₂²(4−x²)dx=[4x−x³/3]₋₂²=32/3。"
        },
        {
          "type": "single",
          "q": "由 y=√x、x=0、x=4 及 x 轴围成的图形绕 x 轴旋转，体积为（　　）",
          "options": { "A": "4π", "B": "8π", "C": "16π", "D": "32π" },
          "answer": "B",
          "explanation": "圆盘法：V=π∫₀⁴(√x)²dx=π∫₀⁴x dx=π·8=8π。"
        },
        {
          "type": "single",
          "q": "曲线 y=ln x 与 x 轴、直线 x=e 围成图形的面积是（　　）",
          "options": { "A": "1", "B": "2", "C": "e", "D": "e−1" },
          "answer": "A",
          "explanation": "积分限 1 到 e（ln1=0）：∫₁ᵉln x dx=[x ln x−x]₁ᵉ=(e−e)−(0−1)=1。"
        }
      ]
    }
  ],
  "线性代数": [
    {
      "id": "la_space",
      "name": "线性空间与线性变换",
      "desc": "子空间判定、线性变换的矩阵、向量组秩",
      "questions": [
        {
          "type": "single",
          "q": "下列集合中构成 R³ 子空间的是（　　）",
          "options": {
            "A": "{(x,y,z) | x+y=1}",
            "B": "{(x,y,z) | xyz=0}",
            "C": "{(x,y,z) | x=2y}",
            "D": "{(x,y,z) | x≥0}"
          },
          "answer": "C",
          "explanation": "C 是过原点的平面，含零向量且对加法、数乘封闭；A 不含零向量，B、D 对加法或数乘不封闭。"
        },
        {
          "type": "single",
          "q": "设线性变换 T 在基 e₁,e₂ 下的矩阵为 [0 1; 1 0]，则 T(e₁)=（　　）",
          "options": { "A": "e₁", "B": "e₂", "C": "e₁+e₂", "D": "0" },
          "answer": "B",
          "explanation": "变换矩阵的第一列就是 T(e₁) 的坐标 (0,1)ᵀ，即 e₂。"
        },
        {
          "type": "single",
          "q": "R³ 中向量组 {(1,0,0),(0,1,0),(0,0,1)} 的秩为（　　）",
          "options": { "A": "0", "B": "1", "C": "2", "D": "3" },
          "answer": "D",
          "explanation": "三个向量线性无关，构成 R³ 的一组基，秩为 3。"
        }
      ]
    }
  ],
  "大学化学": [
    {
      "id": "chem_amount",
      "name": "物质的量与化学计量",
      "desc": "摩尔、摩尔质量、气体摩尔体积、物质的量浓度",
      "questions": [
        {
          "type": "single",
          "q": "1.5 mol H₂SO₄ 的质量是（　　）",
          "options": { "A": "98 g", "B": "147 g", "C": "49 g", "D": "196 g" },
          "answer": "B",
          "explanation": "M(H₂SO₄)=2+32+64=98 g/mol，m=nM=1.5×98=147 g。"
        },
        {
          "type": "single",
          "q": "标准状况下，2.24 L CO₂ 的物质的量是（　　）",
          "options": { "A": "0.1 mol", "B": "0.2 mol", "C": "1 mol", "D": "2.24 mol" },
          "answer": "A",
          "explanation": "标准状况下气体摩尔体积 22.4 L/mol，n=2.24/22.4=0.1 mol。"
        },
        {
          "type": "single",
          "q": "配制 250 mL 0.2 mol/L NaCl 溶液，需称取 NaCl 的质量为（　　）",
          "options": { "A": "2.925 g", "B": "5.85 g", "C": "1.17 g", "D": "11.7 g" },
          "answer": "A",
          "explanation": "n=cV=0.2×0.25=0.05 mol，m=nM=0.05×58.5=2.925 g。"
        },
        {
          "type": "single",
          "q": "同温同压下，相同体积的 O₂ 与 CO₂，下列一定相同的是（　　）",
          "options": { "A": "质量", "B": "分子数", "C": "密度", "D": "原子总数" },
          "answer": "B",
          "explanation": "阿伏加德罗定律：同温同压同体积的气体含相同数目的分子；两者摩尔质量不同，故质量、密度不同，原子数也不同。"
        },
        {
          "type": "single",
          "q": "0.5 mol Na₂SO₄ 中含 Na⁺ 的物质的量为（　　）",
          "options": { "A": "0.5 mol", "B": "1 mol", "C": "1.5 mol", "D": "2 mol" },
          "answer": "B",
          "explanation": "每 1 mol Na₂SO₄ 含 2 mol Na⁺，故 n(Na⁺)=2×0.5=1 mol。"
        },
        {
          "type": "single",
          "q": "下列说法正确的是（　　）",
          "options": {
            "A": "1 mol 任何物质都含 6.02×10²³ 个分子",
            "B": "摩尔是七个基本物理量之一",
            "C": "1 mol H₂O 的质量是 18 g",
            "D": "标准状况下 1 mol 任何物质的体积都是 22.4 L"
          },
          "answer": "C",
          "explanation": "A 错：离子晶体、金属中不存在分子；B 错：物质的量是基本物理量，摩尔是其单位；D 错：22.4 L/mol 只适用于标准状况下的气体。"
        },
        {
          "type": "single",
          "q": "标准状况下 11.2 L N₂ 的质量是（　　）",
          "options": { "A": "7 g", "B": "14 g", "C": "28 g", "D": "56 g" },
          "answer": "B",
          "explanation": "n=11.2/22.4=0.5 mol，M(N₂)=28 g/mol，m=0.5×28=14 g。"
        },
        {
          "type": "single",
          "q": "1 mol/L H₂SO₄ 溶液（完全电离）中 c(H⁺) 为（　　）",
          "options": { "A": "1 mol/L", "B": "2 mol/L", "C": "0.5 mol/L", "D": "4 mol/L" },
          "answer": "B",
          "explanation": "H₂SO₄ 完全电离出 2 个 H⁺，故 c(H⁺)=2×1=2 mol/L。"
        },
        {
          "type": "single",
          "q": "将 4 g NaOH 溶于水配成 100 mL 溶液，c(NaOH) 为（　　）",
          "options": { "A": "0.1 mol/L", "B": "0.4 mol/L", "C": "1 mol/L", "D": "4 mol/L" },
          "answer": "C",
          "explanation": "n=4/40=0.1 mol，V=0.1 L，c=0.1/0.1=1 mol/L。"
        }
      ]
    }
  ],
  "大学物理": [
    {
      "id": "wl_pendulum",
      "name": "单摆与振动合成",
      "desc": "单摆周期、影响因素、同频振动合成",
      "questions": [
        {
          "type": "single",
          "q": "单摆周期 T=2π√(l/g)。若摆长变为原来的 4 倍，周期变为原来的（　　）",
          "options": { "A": "2 倍", "B": "4 倍", "C": "1/2", "D": "不变" },
          "answer": "A",
          "explanation": "T∝√l，摆长 4 倍则周期 √4=2 倍。"
        },
        {
          "type": "single",
          "q": "单摆的周期与下列哪个量无关（　　）",
          "options": { "A": "摆长", "B": "重力加速度", "C": "摆球质量", "D": "以上都有关" },
          "answer": "C",
          "explanation": "T=2π√(l/g) 中不含质量，周期与摆球质量无关（小角度近似下也与振幅无关）。"
        },
        {
          "type": "single",
          "q": "两个同方向同频率、振幅均为 A、相位差为 π/2 的简谐振动合成后，合振幅为（　　）",
          "options": { "A": "A", "B": "√2 A", "C": "2A", "D": "0" },
          "answer": "B",
          "explanation": "A合=√(A²+A²+2A²cos(π/2))=√(2A²)=√2 A。"
        }
      ]
    },
    {
      "id": "wl_mech_multi",
      "name": "力学综合应用",
      "desc": "多过程受力、运动学与动量能量综合",
      "questions": [
        {
          "type": "single",
          "q": "质量 2 kg 的物体静止在光滑水平面上，受 6 N 水平恒力作用，3 s 内的位移为（　　）",
          "options": { "A": "4.5 m", "B": "9 m", "C": "13.5 m", "D": "18 m" },
          "answer": "C",
          "explanation": "a=F/m=3 m/s²，s=½at²=½×3×9=13.5 m。"
        },
        {
          "type": "single",
          "q": "物体从 20 m 高处自由下落（g 取 10 m/s²），落地速度大小为（　　）",
          "options": { "A": "10 m/s", "B": "20 m/s", "C": "30 m/s", "D": "40 m/s" },
          "answer": "B",
          "explanation": "由 v²=2gh 得 v=√(2×10×20)=20 m/s。"
        },
        {
          "type": "single",
          "q": "质量 1 kg 的物体以 4 m/s 与静止的 3 kg 物体发生完全非弹性碰撞，碰后共同速度为（　　）",
          "options": { "A": "1 m/s", "B": "1.5 m/s", "C": "2 m/s", "D": "2.5 m/s" },
          "answer": "A",
          "explanation": "动量守恒：1×4=(1+3)v，得 v=1 m/s。"
        }
      ]
    }
  ]
};
if (typeof window !== "undefined") { window.BANK_EXTRA = BANK_EXTRA; }
