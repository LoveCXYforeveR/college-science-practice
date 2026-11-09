/* ===================================================================
   内置解答题解法库（结构化）
   ------------------------------------------------------------------
   设计要点：
   · 每题分「小问 parts」，每个小问有答案 answer 与分步 steps
   · 每个 step 有标题 t 与正文 b，正文里的 $...$ 用 KaTeX 渲染
   · traps 记录易错点；diff 1–5；atom 用于和考点掌握度挂钩
   · 这里不做批改：用户先自评「会不会」，再展开步骤，可对任一步追问
   =================================================================== */
var SOLUTIONS = [
  /* ---------------- 高等数学 ---------------- */
  {
    id: "s_gs_01", subject: "高等数学", atom: "等价无穷小替换", diff: 2,
    stem: "求 $\\lim\\limits_{x\\to 0}\\dfrac{\\sqrt{1+3x}-1}{x}$。",
    parts: [{
      ask: "求该极限",
      answer: "$\\dfrac{3}{2}$",
      steps: [
        { t: "先判类型", b: "把 $x=0$ 代入，分子、分母都是 $0$，属于 $\\dfrac{0}{0}$ 型未定式，可以用等价无穷小或有理化。" },
        { t: "找等价无穷小", b: "当 $u\\to 0$ 时 $(1+u)^a-1\\sim au$。取 $u=3x,\\ a=\\tfrac12$，得 $\\sqrt{1+3x}-1\\sim\\dfrac{3x}{2}$。" },
        { t: "代换并约分", b: "原式 $=\\lim\\limits_{x\\to0}\\dfrac{3x/2}{x}=\\dfrac{3}{2}$。" },
        { t: "换一种写法验算", b: "分子有理化：$\\dfrac{3x}{x(\\sqrt{1+3x}+1)}\\to\\dfrac{3}{2}$，两种做法一致。" }
      ]
    }],
    traps: ["只记住 $(1+u)^a-1\\sim au$ 却忘了乘 $\\tfrac12$", "在加减法里直接替换等价无穷小（这里整体是乘除结构才安全）"],
    source: "内置"
  },
  {
    id: "s_gs_02", subject: "高等数学", atom: "等价无穷小替换", diff: 1,
    stem: "求 $\\lim\\limits_{x\\to 0}\\dfrac{1-\\cos x}{x^{2}}$。",
    parts: [{
      ask: "求该极限",
      answer: "$\\dfrac{1}{2}$",
      steps: [
        { t: "记等价式", b: "当 $x\\to0$ 时 $1-\\cos x\\sim\\dfrac{x^{2}}{2}$，这是最常用的一条。" },
        { t: "代入", b: "原式 $=\\lim\\limits_{x\\to0}\\dfrac{x^{2}/2}{x^{2}}=\\dfrac{1}{2}$。" },
        { t: "为什么不能写成 $\\cos x\\sim 1$", b: "那样分子变成 $1-1=0$，精度不够。等价替换要保留到与分母同阶的项。" }
      ]
    }],
    traps: ["把 $1-\\cos x$ 直接当成 $0$", "记成 $1-\\cos x\\sim x^{2}$（漏了 $\\tfrac12$）"],
    source: "内置"
  },
  {
    id: "s_gs_03", subject: "高等数学", atom: "幂指函数求导", diff: 3,
    stem: "设 $y=x^{x}\\ (x>0)$，求 $y'$。",
    parts: [{
      ask: "求导数 $y'$",
      answer: "$y'=x^{x}(\\ln x+1)$",
      steps: [
        { t: "取对数", b: "两边取自然对数：$\\ln y=x\\ln x$。这一步把幂指结构变成乘积结构。" },
        { t: "两边对 $x$ 求导", b: "左边 $\\dfrac{y'}{y}$；右边用乘积法则得 $\\ln x+1$。" },
        { t: "解出 $y'$", b: "$y'=y(\\ln x+1)=x^{x}(\\ln x+1)$。" },
        { t: "另一条路", b: "也可写成 $y=e^{x\\ln x}$ 再复合求导，结果相同。" }
      ]
    }],
    traps: ["直接套幂函数公式 $x^{x}\\mapsto xx^{x-1}$（底数、指数都在变，不能用）", "忘记乘回 $y$"],
    source: "内置"
  },
  {
    id: "s_gs_04", subject: "高等数学", atom: "隐函数求导", diff: 2,
    stem: "设 $x^{2}+y^{2}=1$，求 $\\dfrac{dy}{dx}$。",
    parts: [{
      ask: "求 $\\dfrac{dy}{dx}$",
      answer: "$\\dfrac{dy}{dx}=-\\dfrac{x}{y}\\ (y\\neq0)$",
      steps: [
        { t: "两边对 $x$ 求导", b: "注意 $y$ 是 $x$ 的函数：$2x+2y\\cdot y'=0$。" },
        { t: "解出 $y'$", b: "$y'=-\\dfrac{x}{y}$，要求 $y\\neq0$。" },
        { t: "几何含义", b: "圆上一点处切线斜率与半径垂直，$-\\tfrac{x}{y}$ 正是这个结论。" }
      ]
    }],
    traps: ["把 $y^{2}$ 求导写成 $2y$（漏了 $y'$）", "忘记注明 $y\\neq0$"],
    source: "内置"
  },
  {
    id: "s_gs_05", subject: "高等数学", atom: "拉格朗日中值定理", diff: 3,
    stem: "证明：对任意实数 $a,b$，都有 $|\\sin a-\\sin b|\\le|a-b|$。",
    parts: [{
      ask: "给出证明",
      answer: "由拉格朗日中值定理，$\\sin a-\\sin b=\\cos\\xi\\,(a-b)$，取绝对值即可。",
      steps: [
        { t: "设函数与区间", b: "令 $f(x)=\\sin x$，它在 $[a,b]$（或 $[b,a]$）上连续、在内部可导。" },
        { t: "用中值定理", b: "存在 $\\xi$ 介于 $a,b$ 之间，使 $\\dfrac{\\sin a-\\sin b}{a-b}=\\cos\\xi$。" },
        { t: "取绝对值放缩", b: "$|\\sin a-\\sin b|=|\\cos\\xi|\\,|a-b|\\le|a-b|$，因为 $|\\cos\\xi|\\le1$。" },
        { t: "特殊情况", b: "若 $a=b$，两边都是 $0$，结论显然成立。" }
      ]
    }],
    traps: ["漏掉 $a=b$ 的讨论", "放缩时把 $|\\cos\\xi|\\le1$ 写反"],
    source: "内置"
  },
  {
    id: "s_gs_06", subject: "高等数学", atom: "分部积分法", diff: 2,
    stem: "求 $\\displaystyle\\int x e^{x}\\,dx$。",
    parts: [{
      ask: "求不定积分",
      answer: "$xe^{x}-e^{x}+C$",
      steps: [
        { t: "选 $u$ 与 $dv$", b: "分部积分 $\\int u\\,dv=uv-\\int v\\,du$。取 $u=x,\\ dv=e^{x}dx$——把容易求导的留给 $u$。" },
        { t: "计算 $du$ 与 $v$", b: "$du=dx,\\ v=e^{x}$。" },
        { t: "代入公式", b: "$\\int xe^{x}dx=xe^{x}-\\int e^{x}dx=xe^{x}-e^{x}+C$。" },
        { t: "验算", b: "对结果求导：$e^{x}+xe^{x}-e^{x}=xe^{x}$，正确。" }
      ]
    }],
    traps: ["$u,dv$ 选反（取 $u=e^{x}$ 会越积越复杂）", "忘记 $+C$"],
    source: "内置"
  },
  {
    id: "s_gs_07", subject: "高等数学", atom: "定积分计算", diff: 2,
    stem: "求 $\\displaystyle\\int_{0}^{\\pi/2}\\sin^{2}x\\,dx$。",
    parts: [{
      ask: "求定积分值",
      answer: "$\\dfrac{\\pi}{4}$",
      steps: [
        { t: "降次", b: "用半角公式 $\\sin^{2}x=\\dfrac{1-\\cos 2x}{2}$，把平方降成一次。" },
        { t: "分项积分", b: "$\\int_{0}^{\\pi/2}\\dfrac{1-\\cos2x}{2}dx=\\dfrac{1}{2}\\left[x-\\dfrac{\\sin 2x}{2}\\right]_{0}^{\\pi/2}$。" },
        { t: "代入上下限", b: "$=\\dfrac{1}{2}\\left(\\dfrac{\\pi}{2}-0\\right)=\\dfrac{\\pi}{4}$。" },
        { t: "对称性速算", b: "$\\int_0^{\\pi/2}\\sin^2=\\int_0^{\\pi/2}\\cos^2$，两者相加为 $\\tfrac{\\pi}{2}$，故各为 $\\tfrac{\\pi}{4}$。" }
      ]
    }],
    traps: ["忘记降次，直接把 $\\sin^2$ 当 $\\sin$ 积", "上下限代入时漏乘 $\\tfrac12$"],
    source: "内置"
  },
  {
    id: "s_gs_08", subject: "高等数学", atom: "反常积分", diff: 2,
    stem: "判断 $\\displaystyle\\int_{1}^{+\\infty}\\dfrac{1}{x^{2}}\\,dx$ 是否收敛，若收敛求其值。",
    parts: [{
      ask: "收敛性及积分值",
      answer: "收敛，值为 $1$。",
      steps: [
        { t: "按定义写成极限", b: "$\\int_{1}^{+\\infty}\\dfrac{dx}{x^{2}}=\\lim\\limits_{b\\to+\\infty}\\int_{1}^{b}x^{-2}dx$。" },
        { t: "先算有限区间", b: "$\\int_{1}^{b}x^{-2}dx=\\left[-\\dfrac{1}{x}\\right]_{1}^{b}=1-\\dfrac{1}{b}$。" },
        { t: "取极限", b: "$\\lim\\limits_{b\\to\\infty}\\left(1-\\dfrac{1}{b}\\right)=1$，故收敛于 $1$。" },
        { t: "记住结论", b: "$\\int_{1}^{+\\infty}\\dfrac{dx}{x^{p}}$ 当 $p>1$ 收敛、$p\\le1$ 发散。" }
      ]
    }],
    traps: ["直接写 $\\left[-\\tfrac1x\\right]_1^{\\infty}$ 而不写极限过程", "把 $p=2$ 误判为发散"],
    source: "内置"
  },
  {
    id: "s_gs_09", subject: "高等数学", atom: "旋转体体积", diff: 3,
    stem: "曲线 $y=\\sqrt{x}$ 与直线 $x=1$、$x$ 轴围成的图形绕 $x$ 轴旋转，求所得旋转体体积。",
    parts: [{
      ask: "求体积",
      answer: "$\\dfrac{\\pi}{2}$",
      steps: [
        { t: "选公式", b: "绕 $x$ 轴旋转用圆盘法：$V=\\pi\\int_{a}^{b}y^{2}dx$。" },
        { t: "确定范围", b: "图形在 $x\\in[0,1]$，且 $y^{2}=x$。" },
        { t: "积分", b: "$V=\\pi\\int_{0}^{1}x\\,dx=\\pi\\cdot\\dfrac{1}{2}=\\dfrac{\\pi}{2}$。" }
      ]
    }],
    traps: ["把 $y=\\sqrt{x}$ 的平方写成 $\\sqrt{x}$", "用成绕 $y$ 轴的柱壳公式"],
    source: "内置"
  },
  {
    id: "s_gs_10", subject: "高等数学", atom: "一阶线性微分方程", diff: 3,
    stem: "求初值问题 $y'+y=e^{-x},\\ y(0)=0$ 的解。",
    parts: [{
      ask: "求特解",
      answer: "$y=xe^{-x}$",
      steps: [
        { t: "识别类型", b: "形如 $y'+P(x)y=Q(x)$，其中 $P=1,\\ Q=e^{-x}$，是一阶线性非齐次方程。" },
        { t: "求积分因子", b: "$\\mu=e^{\\int P dx}=e^{x}$，两边同乘后左边成为 $(e^{x}y)'$。" },
        { t: "积分", b: "$(e^{x}y)'=e^{x}e^{-x}=1$，故 $e^{x}y=x+C$，即 $y=(x+C)e^{-x}$。" },
        { t: "代初值", b: "$y(0)=C=0$，所以 $y=xe^{-x}$。" }
      ]
    }],
    traps: ["齐次通解与特解搞混，忘记代初值", "积分因子写成 $e^{-x}$"],
    source: "内置"
  },
  {
    id: "s_gs_11", subject: "高等数学", atom: "重要极限", diff: 2,
    stem: "求 $\\lim\\limits_{x\\to\\infty}\\left(1+\\dfrac{1}{x}\\right)^{x}$。",
    parts: [{
      ask: "求该极限",
      answer: "$e$",
      steps: [
        { t: "认出标准型", b: "这是第二个重要极限 $\\lim\\limits_{t\\to\\infty}(1+\\tfrac1t)^t=e$。" },
        { t: "改写成指数形式", b: "$(1+\\tfrac1x)^x=e^{x\\ln(1+1/x)}$，指数部分 $x\\ln(1+\\tfrac1x)\\to1$。" },
        { t: "结论", b: "原式 $=e^{1}=e$。" }
      ]
    }],
    traps: ["写成 $1^{\\infty}=1$（这是未定式，不能直接代）", "把 $e$ 记成 $2.718$ 后四舍五入造成误差"],
    source: "内置"
  },
  {
    id: "s_gs_12", subject: "高等数学", atom: "函数极值", diff: 3,
    stem: "求 $f(x)=x^{3}-3x$ 的极值。",
    parts: [{
      ask: "求极大值与极小值",
      answer: "极大值 $f(-1)=2$，极小值 $f(1)=-2$。",
      steps: [
        { t: "求导", b: "$f'(x)=3x^{2}-3=3(x-1)(x+1)$。" },
        { t: "找驻点", b: "令 $f'=0$ 得 $x=\\pm1$，没有不可导点。" },
        { t: "判断单调性", b: "$x<-1$ 时 $f'>0$，$-1<x<1$ 时 $f'<0$，$x>1$ 时 $f'>0$。" },
        { t: "下结论", b: "先增后减 → $x=-1$ 取极大值 $f(-1)=2$；先减后增 → $x=1$ 取极小值 $f(1)=-2$。" }
      ]
    }],
    traps: ["只解出驻点就断言极值（不看单调性）", "把极大值写成最大值"],
    source: "内置"
  },

  /* ---------------- 线性代数 ---------------- */
  {
    id: "s_la_01", subject: "线性代数", atom: "三阶行列式计算", diff: 2,
    stem: "计算行列式 $D=\\begin{vmatrix}1&2&3\\\\0&1&4\\\\5&6&0\\end{vmatrix}$。",
    parts: [{
      ask: "求 $D$",
      answer: "$D=1$",
      steps: [
        { t: "按第一行展开", b: "$D=1\\cdot\\begin{vmatrix}1&4\\\\6&0\\end{vmatrix}-2\\cdot\\begin{vmatrix}0&4\\\\5&0\\end{vmatrix}+3\\cdot\\begin{vmatrix}0&1\\\\5&6\\end{vmatrix}$。" },
        { t: "算二阶行列式", b: "$\\begin{vmatrix}1&4\\\\6&0\\end{vmatrix}=-24$，$\\begin{vmatrix}0&4\\\\5&0\\end{vmatrix}=-20$，$\\begin{vmatrix}0&1\\\\5&6\\end{vmatrix}=-5$。" },
        { t: "合并", b: "$D=1\\cdot(-24)-2\\cdot(-20)+3\\cdot(-5)=-24+40-15=1$。" }
      ]
    }],
    traps: ["代数余子式的符号 $(-1)^{i+j}$ 记错", "展开时漏乘元素本身"],
    source: "内置"
  },
  {
    id: "s_la_02", subject: "线性代数", atom: "逆矩阵", diff: 2,
    stem: "设 $A=\\begin{pmatrix}2&1\\\\1&1\\end{pmatrix}$，求 $A^{-1}$。",
    parts: [{
      ask: "求逆矩阵",
      answer: "$A^{-1}=\\begin{pmatrix}1&-1\\\\-1&2\\end{pmatrix}$",
      steps: [
        { t: "算行列式", b: "$|A|=2\\cdot1-1\\cdot1=1\\neq0$，所以可逆。" },
        { t: "套二阶公式", b: "对 $\\begin{pmatrix}a&b\\\\c&d\\end{pmatrix}$，逆为 $\\dfrac{1}{ad-bc}\\begin{pmatrix}d&-b\\\\-c&a\\end{pmatrix}$。" },
        { t: "代入", b: "$A^{-1}=\\dfrac{1}{1}\\begin{pmatrix}1&-1\\\\-1&2\\end{pmatrix}=\\begin{pmatrix}1&-1\\\\-1&2\\end{pmatrix}$。" },
        { t: "验算", b: "$AA^{-1}=\\begin{pmatrix}1&0\\\\0&1\\end{pmatrix}$，正确。" }
      ]
    }],
    traps: ["忘了除以行列式", "副对角线元素没有变号"],
    source: "内置"
  },
  {
    id: "s_la_03", subject: "线性代数", atom: "齐次方程组基础解系", diff: 3,
    stem: "设 $A$ 为 $4\\times 5$ 矩阵，$r(A)=3$。问齐次方程组 $Ax=0$ 的基础解系含几个向量？",
    parts: [{
      ask: "求基础解系所含向量个数",
      answer: "$5-3=2$ 个。",
      steps: [
        { t: "用秩—零度关系", b: "齐次方程组解空间维数 $=\\dim N(A)=n-r(A)$，其中 $n$ 是未知量个数。" },
        { t: "代入数字", b: "$n=5,\\ r(A)=3$，所以 $\\dim N(A)=2$。" },
        { t: "结论", b: "基础解系含 $2$ 个线性无关的解向量，通解是它们的线性组合。" }
      ]
    }],
    traps: ["用行数 $4$ 代替未知量个数 $5$", "把 $r(A)$ 当成解系个数"],
    source: "内置"
  },

  /* ---------------- 大学物理 ---------------- */
  {
    id: "s_ph_01", subject: "大学物理", atom: "变力作用下的运动", diff: 3,
    stem: "质量 $m=2\\,\\mathrm{kg}$ 的物体在合力 $F=6t\\ (\\mathrm{N})$ 作用下由静止开始沿直线运动，求 $t=3\\,\\mathrm{s}$ 时的速度。",
    parts: [{
      ask: "求 $t=3\\,\\mathrm{s}$ 时的速度",
      answer: "$v=13.5\\,\\mathrm{m/s}$",
      steps: [
        { t: "写牛顿第二定律", b: "$F=ma=m\\dfrac{dv}{dt}$，即 $2\\dfrac{dv}{dt}=6t$。" },
        { t: "分离变量积分", b: "$dv=3t\\,dt$，从 $0$ 到 $t$ 积分：$v=\\dfrac{3}{2}t^{2}$（初速为 $0$）。" },
        { t: "代入时刻", b: "$v(3)=\\dfrac{3}{2}\\times9=13.5\\,\\mathrm{m/s}$。" }
      ]
    }],
    traps: ["把变力当恒力用 $v=at$（$a$ 在变）", "忘记初速度为零这个条件"],
    source: "内置"
  },
  {
    id: "s_ph_02", subject: "大学物理", atom: "热力学第一定律", diff: 2,
    stem: "$1\\,\\mathrm{mol}$ 理想气体在等压过程中温度由 $T_1$ 升到 $T_2$，求它吸收的热量（用 $R$ 表示）。",
    parts: [{
      ask: "求吸收的热量 $Q$",
      answer: "$Q=\\dfrac{7}{2}R(T_2-T_1)$",
      steps: [
        { t: "用热一律", b: "$Q=\\Delta U+W$，等压过程两项都不为零。" },
        { t: "算内能变化", b: "单原子理想气体 $\\Delta U=\\dfrac{3}{2}nR\\Delta T$（$n=1$）。" },
        { t: "算做功", b: "等压 $W=p\\Delta V=nR\\Delta T$。" },
        { t: "相加", b: "$Q=\\dfrac{3}{2}R\\Delta T+R\\Delta T=\\dfrac{5}{2}R\\Delta T$；若为双原子气体则为 $\\dfrac{7}{2}R\\Delta T$。" }
      ]
    }],
    traps: ["等压过程误用 $Q=\\Delta U$（那是等容）", "混淆单原子与双原子的自由度"],
    source: "内置"
  },
  {
    id: "s_ph_03", subject: "大学物理", atom: "简谐振动", diff: 2,
    stem: "弹簧振子质量 $m$、劲度系数 $k$，振幅 $A$。求振动周期与最大速度。",
    parts: [
      {
        ask: "求周期 $T$",
        answer: "$T=2\\pi\\sqrt{\\dfrac{m}{k}}$",
        steps: [
          { t: "写动力学方程", b: "$m\\ddot{x}=-kx$，即 $\\ddot{x}+\\dfrac{k}{m}x=0$。" },
          { t: "对比标准形式", b: "标准式 $\\ddot{x}+\\omega^{2}x=0$，故 $\\omega=\\sqrt{k/m}$。" },
          { t: "得周期", b: "$T=\\dfrac{2\\pi}{\\omega}=2\\pi\\sqrt{\\dfrac{m}{k}}$。" }
        ]
      },
      {
        ask: "求最大速度 $v_{\\max}$",
        answer: "$v_{\\max}=A\\sqrt{\\dfrac{k}{m}}$",
        steps: [
          { t: "写运动学表达式", b: "$x=A\\cos(\\omega t+\\varphi)$，则 $v=-A\\omega\\sin(\\omega t+\\varphi)$。" },
          { t: "取最大值", b: "$|\\sin|\\le1$，所以 $v_{\\max}=A\\omega=A\\sqrt{k/m}$，出现在平衡位置。" }
        ]
      }
    ],
    traps: ["把 $\\omega$ 当成频率 $f$", "认为最大速度出现在最大位移处"],
    source: "内置"
  },

  /* ---------------- 大学化学 ---------------- */
  {
    id: "s_ch_01", subject: "大学化学", atom: "pH 计算", diff: 1,
    stem: "求 $0.010\\,\\mathrm{mol\\cdot L^{-1}}$ 盐酸溶液的 pH（$25^{\\circ}\\mathrm{C}$）。",
    parts: [{
      ask: "求 pH",
      answer: "$\\mathrm{pH}=2.00$",
      steps: [
        { t: "判断酸的强弱", b: "盐酸是强酸，完全电离，$c(\\mathrm{H^{+}})=c(\\mathrm{HCl})=0.010\\,\\mathrm{mol\\cdot L^{-1}}$。" },
        { t: "套定义", b: "$\\mathrm{pH}=-\\lg c(\\mathrm{H^{+}})=-\\lg(10^{-2})=2.00$。" }
      ]
    }],
    traps: ["把 pH 算成 $\\lg c$（漏负号）", "对弱酸也直接取浓度当 $c(\\mathrm{H^+})$"],
    source: "内置"
  },
  {
    id: "s_ch_02", subject: "大学化学", atom: "化学平衡", diff: 3,
    stem: "反应 $\\mathrm{A\\rightleftharpoons B}$ 在某温度下 $K=4.0$。若起始只有 $1.0\\,\\mathrm{mol\\,A}$（体积 $1\\,\\mathrm{L}$），求平衡时 B 的浓度。",
    parts: [{
      ask: "求平衡时 $c(\\mathrm{B})$",
      answer: "$c(\\mathrm{B})=0.80\\,\\mathrm{mol\\cdot L^{-1}}$",
      steps: [
        { t: "设转化量", b: "设平衡时生成了 $x\\,\\mathrm{mol\\cdot L^{-1}}$ 的 B，则 A 剩余 $1.0-x$。" },
        { t: "写平衡表达式", b: "$K=\\dfrac{c(\\mathrm{B})}{c(\\mathrm{A})}=\\dfrac{x}{1.0-x}=4.0$。" },
        { t: "解方程", b: "$x=4.0-4.0x\\Rightarrow 5x=4.0\\Rightarrow x=0.80$。" },
        { t: "回代检查", b: "$c(\\mathrm{A})=0.20$，比值 $0.80/0.20=4.0$，与 $K$ 一致。" }
      ]
    }],
    traps: ["忘记把起始浓度减掉转化量", "把 $K$ 写成产物浓度之和"],
    source: "内置"
  }
];

if (typeof window !== "undefined") { window.SOLUTIONS = SOLUTIONS; }
