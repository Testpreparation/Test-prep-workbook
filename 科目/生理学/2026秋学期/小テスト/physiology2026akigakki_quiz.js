
// 生理学：2026秋学期・小テスト（〇×問題）

window.getPhysiologyQuestionsAutumn = function(mode) {
  const quizQuestions = [
    {
      q: "消化管の内面は粘膜で覆われている。",
      options: ["〇", "✕"],
      answer: 0,
      correctTerm: "",
      exp: "正しい記述です。消化管の内面は粘膜で覆われています。"
    },
    {
      q: "交感神経の興奮は小腸の運動を抑制する。",
      options: ["〇", "✕"],
      answer: 0,
      correctTerm: "",
      exp: "正しい記述です。交感神経の興奮は消化管運動を抑制します。"
    },
    {
      q: "脂質はグリセリンと3個のアミノ酸で構成される。",
      options: ["〇", "✕"],
      answer: 1,
      correctTerm: "脂肪酸",
      exp: "誤り。中性脂肪は一般にグリセリンと3個の脂肪酸から構成されます。"
    },
    {
      q: "ショ糖は2個のグルコースから構成される。",
      options: ["〇", "✕"],
      answer: 1,
      correctTerm: "グルコースとフルクトース",
      exp: "誤り。ショ糖はグルコースとフルクトースから構成されます。"
    },
    {
      q: "消化管の蠕動運動により内容物が肛門方向に動く。",
      options: ["〇", "✕"],
      answer: 0,
      correctTerm: "",
      exp: "正しい記述です。蠕動運動によって消化管の内容物は肛門方向へ送られます。"
    },
    {
      q: "マルターゼはデンプンを麦芽糖に分解する。",
      options: ["〇", "✕"],
      answer: 1,
      correctTerm: "アミラーゼ",
      exp: "誤り。デンプンを麦芽糖などに分解するのはアミラーゼです。マルターゼは麦芽糖を分解します。"
    },
    {
      q: "食物が口腔内に入って唾液が出るのは条件反射である。",
      options: ["〇", "✕"],
      answer: 1,
      correctTerm: "無条件反射",
      exp: "誤り。食物が口腔内に入ることで唾液が分泌されるのは無条件反射です。食物を見たり考えたりして唾液が出る反応は条件反射です。"
    },
    {
      q: "交感神経の興奮によって漿液性の唾液が分泌される。",
      options: ["〇", "✕"],
      answer: 1,
      correctTerm: "副交感神経",
      exp: "誤り。漿液性でさらさらした唾液の分泌は主に副交感神経の作用によります。交感神経の興奮では粘稠な唾液が分泌されやすくなります。"
    },
    {
      q: "嚥下時には喉頭蓋が気管への通路を塞ぐ。",
      options: ["〇", "✕"],
      answer: 0,
      correctTerm: "",
      exp: "正しい記述です。嚥下時には喉頭蓋などが気道への食物の流入を防ぎます。"
    },
    {
      q: "胃腺の主細胞からペプシンが分泌される。",
      options: ["〇", "✕"],
      answer: 1,
      correctTerm: "ペプシノゲン",
      exp: "誤り。胃腺の主細胞から分泌されるのはペプシノゲンで、胃内で活性化されてペプシンになります。"
    }
  ];

  // 小テストでは全10問をまとめて出題
  const questions = [...quizQuestions];

  // 問題の順番だけをランダムにする
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }

  return questions;
};