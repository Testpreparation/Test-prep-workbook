// biochemistry_flashcard_data.js
// 生化学 暗記カード用データベース

(function() {
  window.FLASHCARD_DB = window.FLASHCARD_DB || {};

  const biochemistryFlashcards = [
    {
      id: "bio_fc_01",
      word: "ミトコンドリア",
      meaning: "ATP（エネルギー）を生成する細胞小器官",
      exp: "細胞内で最も効率よくATPを合成する「エネルギーの発電所」と呼ばれる細胞小器官です。"
    },
    {
      id: "bio_fc_02",
      word: "リソソーム",
      meaning: "加水分解酵素を含む細胞内消化器官",
      exp: "多くの加水分解酵素を含み、不要物や異物の分解・処理を行う細胞小器官です。"
    },
    {
      id: "bio_fc_03",
      word: "リボソーム",
      meaning: "タンパク質合成の場",
      exp: "mRNAの遺伝情報をもとに、アミノ酸を結合させてタンパク質を合成する粒子です。"
    },
    {
      id: "bio_fc_04",
      word: "リン脂質",
      meaning: "細胞膜を形成する二重膜構造の主成分",
      exp: "親水性の頭部と疎水性の脂肪酸鎖をもち、生体膜（脂質二重層）の基本骨格を成します。"
    },
    {
      id: "bio_fc_05",
      word: "同化 (Anabolism)",
      meaning: "単純な物質から複雑な成分を合成する代謝（要ATP）",
      exp: "低分子から高分子を合成する反応過程で、ATPなどのエネルギーを消費します。"
    },
    {
      id: "bio_fc_06",
      word: "異化 (Catabolism)",
      meaning: "高分子物質を分解してエネルギーを取り出す代謝",
      exp: "複雑な物質を簡単な物質へと分解し、ATPなどのエネルギーを発生・抽出します。"
    },
    {
      id: "bio_fc_07",
      word: "7.40 (± 0.05)",
      meaning: "人体における血液（細胞外液）の正常pH値",
      exp: "弱アルカリ性に保たれており、pH 7.35未満をアシドーシス、pH 7.45超をアルカローシスと呼びます。"
    },
    {
      id: "bio_fc_08",
      word: "K⁺ (カリウムイオン)",
      meaning: "細胞内液に最も多く存在する陽イオン",
      exp: "細胞の浸透圧や静止膜電位の維持に重要な役割を果たします。"
    },
    {
      id: "bio_fc_09",
      word: "Na⁺ (ナトリウムイオン)",
      meaning: "細胞外液（血漿・間質液）に最も多く存在する陽イオン",
      exp: "体液量や細胞外液の浸透圧維持、神経・筋の興奮伝達に関与します。"
    },
    {
      id: "bio_fc_10",
      word: "リンパ管 (中心乳び管)",
      meaning: "食事由来の脂質（キロミクロン）の主な吸収経路",
      exp: "小腸から吸収された長鎖脂肪酸や脂質は、静脈ではなく中心乳び管を経由して循環系へ運ばれます。"
    }
  ];

  // 独立暗記カードデータベースに登録
  window.FLASHCARD_DB.biochemistry = biochemistryFlashcards;

  // データ取得用ヘルパー関数
  window.getBiochemistryFlashcardQuestions = function() {
    return window.FLASHCARD_DB.biochemistry;
  };
})();
