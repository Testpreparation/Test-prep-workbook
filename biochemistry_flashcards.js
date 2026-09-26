// 生化学 暗記カード用データベース (プリント B-3 第1回より作成)
// 表面：単語 / 裏面：意味・解説
(function() {
  window.QUIZ_DB = window.QUIZ_DB || {};

  const flashcardData = [
    {
      id: "bio_fc_01",
      q: "ミトコンドリア",
      keyword: "ミトコンドリア",
      exp: "細胞内で最も効率よくATP（エネルギー）をつくる細胞小器官。"
    },
    {
      id: "bio_fc_02",
      q: "リソソーム",
      keyword: "リソソーム",
      exp: "多くの加水分解酵素を含み、異物や不要物を分解する細胞小器官。"
    },
    {
      id: "bio_fc_03",
      q: "リボソーム",
      keyword: "リボソーム",
      exp: "たんぱく質の合成に重要な役割をもつ微粒子。"
    },
    {
      id: "bio_fc_04",
      q: "リン脂質",
      keyword: "リン脂質",
      exp: "細胞膜を構成する二重膜層の主成分（親水性頭部と疎水性部をもつ）。"
    },
    {
      id: "bio_fc_05",
      q: "同化",
      keyword: "同化",
      exp: "生体内に取り入れた物質をもとに生体成分を合成する反応（エネルギーを消費）。"
    },
    {
      id: "bio_fc_06",
      q: "異化",
      keyword: "異化",
      exp: "生体成分を分解する反応（エネルギーを取り出す）。"
    },
    {
      id: "bio_fc_07",
      q: "7.40 (± 0.05)",
      keyword: "7.40 ± 0.05",
      exp: "細胞外液（血液など）の基準となるpHの値。"
    },
    {
      id: "bio_fc_08",
      q: "K (カリウムイオン)",
      keyword: "K（カリウムイオン）",
      exp: "細胞内液の陽イオンで最も多いイオン。"
    },
    {
      id: "bio_fc_09",
      q: "Na (ナトリウムイオン)",
      keyword: "Na（ナトリウムイオン）",
      exp: "細胞外液の陽イオンで最も多いイオン。"
    },
    {
      id: "bio_fc_10",
      q: "リンパ管",
      keyword: "リンパ管 (中心乳び管)",
      exp: "食事由来の脂質のほとんどが小腸絨毛突起から吸収される経路。"
    }
  ];

  window.QUIZ_DB.biochemistry_flashcards = flashcardData;

  // データ取得用関数
  window.getBiochemistryFlashcards = function() {
    return window.QUIZ_DB.biochemistry_flashcards;
  };
})();