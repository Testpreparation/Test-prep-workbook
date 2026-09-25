/**
 * 生化学 演習問題データベース (biochemistry.js)
 * プリント B-3 第1回「細胞と消化吸収」対応版（ランダム出題対応）
 */

(function() {
  window.QUIZ_DB = window.QUIZ_DB || {};

  // 配列をシャッフルする関数 (フィッシャー–イェーツのシャッフル)
  function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // 元の問題データ
  const rawQuestions = [
    {
      q: "細胞内で最も効率よくATPをつくる細胞小器官はどれか。",
      options: ["ミトコンドリア", "リソソーム", "リボソーム", "ゴルジ体"],
      correctIndex: 0, // 「ミトコンドリア」が正解
      exp: "ミトコンドリアはクエン酸回路や電子伝達系により、最も効率よく大量のATPを生成します。"
    },
    {
      q: "多くの加水分解酵素を含み、異物を分解する細胞小器官はどれか。",
      options: ["中心体", "リソソーム", "小胞体", "リボソーム"],
      correctIndex: 1, // 「リソソーム」が正解
      exp: "リソソーム（ライソソーム）は内部に多くの加水分解酵素を持ち、不用物や異物の分解を行います。"
    },
    {
      q: "たんぱく質の合成に重要な役割をもつ微粒子はどれか。",
      options: ["ミトコンドリア", "リソソーム", "リボソーム", "ペルオキシソーム"],
      correctIndex: 2, // 「リボソーム」が正解
      exp: "リボソームは、mRNAの遺伝情報をもとにアミノ酸を連結してタンパク質を合成します。"
    },
    {
      q: "細胞膜は何の二重膜層で構成されているか。",
      options: ["糖質", "リン脂質", "中性脂肪", "コレステロール"],
      correctIndex: 1, // 「リン脂質」が正解
      exp: "細胞膜は、親水性と疎水性（脂溶性）を持つ「リン脂質」が2層に並んだリン脂質二重層でできています。"
    },
    {
      q: "生体内に取り入れた物質をもとに生体成分を合成する反応を何というか。",
      options: ["同化", "異化", "消化", "酸化"],
      correctIndex: 0, // 「同化」が正解
      exp: "簡単な物質から複雑な生体成分を合成する代謝反応を「同化」と呼びます。"
    },
    {
      q: "生体成分を分解する反応を何というか。",
      options: ["同化", "異化", "還元", "吸収"],
      correctIndex: 1, // 「異化」が正解
      exp: "複雑な物質を分解してエネルギーを取り出す代謝反応を「異化」と呼びます。"
    },
    {
      q: "細胞外液（血液など）の正常なpHの基準値（± 0.05）はどれか。",
      options: ["6.80", "7.00", "7.40", "7.80"],
      correctIndex: 2, // 「7.40」が正解
      exp: "細胞外液（血漿）のpHは弱アルカリ性の「7.40 ± 0.05（7.35〜7.45）」に厳密に保たれています。"
    },
    {
      q: "細胞内液の陽イオンで最も多いのはどれか。",
      options: ["K（カリウム）イオン", "Na（ナトリウム）イオン", "Ca（カルシウム）イオン", "Mg（マグネシウム）イオン"],
      correctIndex: 0, // 「K（カリウム）イオン」が正解
      exp: "細胞「内」液で最も濃度の高い陽イオンは K+（カリウムイオン）です。"
    },
    {
      q: "細胞外液の陽イオンで最も多いのはどれか。",
      options: ["K（カリウム）イオン", "Na（ナトリウム）イオン", "Cl（塩素）イオン", "HCO3（重炭酸）イオン"],
      correctIndex: 1, // 「Na（ナトリウム）イオン」が正解
      exp: "細胞「外」液で最も濃度の高い陽イオンは Na+（ナトリウムイオン）です。"
    },
    {
      q: "食事由来の脂質のほとんどは、小腸絨毛突起にあるどこから吸収されるか。",
      options: ["毛細血管", "リンパ管（中心乳び管）", "門脈", "輸尿管"],
      correctIndex: 1, // 「リンパ管（中心乳び管）」が正解
      exp: "脂質は再合成されてカイロミクロンとなり、粒径が大きいため毛細血管ではなく「リンパ管」へ吸収されます。"
    }
  ];

  // 問題順序・選択肢順序をシャッフルして生成する関数
  function generateRandomizedQuestions() {
    // 1. 問題の順序をシャッフル
    const shuffledRaw = shuffleArray(rawQuestions);

    // 2. 各問題の選択肢と正解インデックスをシャッフル
    return shuffledRaw.map(item => {
      const correctAnswerText = item.options[item.correctIndex];
      const shuffledOptions = shuffleArray(item.options);
      const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);

      return {
        q: item.q,
        options: shuffledOptions,
        answers: [newCorrectIndex],
        exp: item.exp
      };
    });
  }

  // 呼び出されるたびにランダムな問題セットを返す関数を設定
  window.getBiochemistryQuestions = function() {
    return generateRandomizedQuestions();
  };

  // 初期値としてもセット
  window.QUIZ_DB.biochemistry = generateRandomizedQuestions();
})();