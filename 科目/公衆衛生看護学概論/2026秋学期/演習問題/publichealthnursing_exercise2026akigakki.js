/*
 * 公衆衛生看護学概論・2026年度秋学期 練習問題
 *
 * 問題文・選択肢は提供された内容をそのまま登録しています。
 * 選択肢の番号・ポイント表記は含めず、出題時に選択肢を毎回シャッフルします。
 */

(function () {
  'use strict';

  const questions = [
    {
      id: 'phn_autumn_exercise_001',
      q: 'アメリカの公衆衛生学者ウィンスローの公衆衛生の定義で正しいのはどれか。',
      options: [
        '個人を支える視点を重んじる。',
        '社会制度の改善に努める取り組みは含まない。',
        '治療とリハビリテーションにより寿命の延伸を目指す。',
        '公共の利益のためにその根底にある問題を含めて組織的に解決をする。'
      ],
      answers: [3],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_002',
      q: 'アメリカ公衆衛生学会（APHA）公衆衛生看護部門による「公衆衛生看護の実践」の内容で誤っているのはどれか。',
      options: [
        '社会正義の問題に取り組む。',
        '健康の多様な決定要因に注意を払う。',
        '公衆衛生学を用いて予防に重点を置く。',
        '健康の公平性を確保するように取り組む。'
      ],
      answers: [2],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_003',
      q: '公衆衛生看護学会による公衆衛生看護の定義の内容で誤っているのはどれか。',
      options: [
        '対象の生活に視点をおいた支援を行う。',
        '対象の健康を支えるシステムを創生する',
        '対象とするコミュニティや関係機関と協働する。',
        '個人や家族の健康課題とコミュニティの健康課題は別に取り組む。'
      ],
      answers: [3],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_004',
      q: '公衆衛生看護活動のコアとなる役割で誤っているのはどれか。',
      options: [
        '住民の主体的な活動展開を支援する。',
        '地域住民の健康・QOL向上に寄与する。',
        '人の生活を継続的かつ多面的にとらえる。',
        '公衆衛生看護独自の活動方法を独立的に行う。'
      ],
      answers: [3],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_005',
      q: 'プライマリヘルスケアについて誤っているのはどれか。',
      options: [
        'オタワ憲章で定義されている。',
        '地域性に重視と住民の自立・自助の2つを柱としている。',
        '途上国に対する国際保健医療協力の反省から構想されて戦略である。',
        '国の保険システムや地域の社会・経済開発などの1つの必須部分をなす。'
      ],
      answers: [0],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_006',
      q: 'ヘルスプロモーションで誤っているのはどれか。',
      options: [
        '健康は毎日の生活のための資源であって、人生の目的ではないとしている。',
        '従来の健康教育に加えて健康を支援する環境づくりを目指している。',
        'ヘルスプロモーション推進のために3つの戦略を確認している。',
        'バンコク憲章で 定義に健康の決定要因が追加された。'
      ],
      answers: [3],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_007',
      q: 'ヘルスプロモーションの5つの優先的行動の分野でないのはどれか。',
      options: [
        '健康的な公共政策づくり',
        '健康を支援する場づくり',
        '地域活動の強化。',
        '個人技術の向上',
        '保健サービスの方向転換'
      ],
      answers: [1],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_008',
      q: '国際生活機能分類（ICF）について誤っているのはどれか。2つ選べ',
      options: [
        '国際生活機能分類（ICF）は国連が作成した。',
        '人間の生活機能と障害の分類法である。',
        '障害の程度によって必要なケアが規定されている。',
        '周囲の環境因子によって活動や参加を良好にできる。',
        '生活機能と障害は、健康状態と相互に関連がある。'
      ],
      answers: [0, 2],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_009',
      q: '宮本による公共事業・公共サービスの公共性の基準で誤っているのはどれか。',
      options: [
        '生産や生活の一般的・公共社会的条件であること。',
        'すべての国民に平等かつ公平に利用されるものであること。',
        'すべての住民の基本的人権をまもるものでること。',
        '住民の同意を得るための民主的手続き、住民参加と公的管理を保障すること。'
      ],
      answers: [3],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_010',
      q: '保健師の定義で誤っているのはどれか。',
      options: [
        '厚生労働大臣の免許を受ける。',
        '保健指導に従事することを業とする。',
        '保健指導は保健婦の業務独占である。',
        '保健師助産師看護師法（第２条）で規定されている。'
      ],
      answers: [2],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_011',
      q: '公衆衛生看護の理念で誤っているのはどれか。２つ選べ。',
      options: [
        '治療活動の重視',
        '自立的な生活の支援',
        '公衆衛生看護は福祉を基盤とした看護活動',
        '対象集団や関係機関との連携・協働による問題解決。',
        '対象者の生活実態を基盤にした健康問題の構造的理解'
      ],
      answers: [0, 2],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_012',
      q: 'エンパワメントについて誤っているのはどれか。',
      options: [
        '個人、集団（組織）、コミュニティ、地域の4つのレベルがある。',
        '個人のエンパワメントとコミュニティのエンパワメントを促進する支援方法にグループ支援がある。',
        'エンパワメントの過程は心理的側面が強いプロセスである。',
        'WHO「ヘルスプロモーションにおいても定義されている。'
      ],
      answers: [0],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_013',
      q: 'ヘルスプロモーションの理念におけるエンパワメントに該当するのはどれか。',
      options: [
        '環境整備',
        '住民の自主的な行動',
        '多分野間の協調と統合',
        '個人衛生に関する教育',
        'ヘルスサービスの方向転換'
      ],
      answers: [1],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_014',
      q: '看護職の倫理綱領について誤っているのはどれか。',
      options: [
        '自己研鑽の責務',
        '個人的信頼を高める',
        '看護学の発展への寄与',
        '保健・医療・福祉などの政策や制度への関与'
      ],
      answers: [1],
      explanation: ''
    },
    {
      id: 'phn_autumn_exercise_015',
      q: '社会的公正について誤っているのはどれか。',
      options: [
        '社会における正しい道理であること平等であることである。',
        'アメリカ看護協会、カナダ看護協会の看護倫理綱領で中核的な概念としている。',
        '日本看護協会倫理綱領では地球規模の観点から社会正義の考え方をもって社会と責任を共有するとある。',
        '公衆衛生看護学会の公衆衛生看護の定義では社会的公正は公衆衛生看護活動の規範である。'
      ],
      answers: [0],
      explanation: ''
    }
  ];

  function shuffleOptions(question) {
    const pairs = question.options.map(function (option, index) {
      return { option: option, originalIndex: index };
    });

    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = pairs[i];
      pairs[i] = pairs[j];
      pairs[j] = temp;
    }

    const answers = question.answers
      .map(function (originalIndex) {
        return pairs.findIndex(function (pair) {
          return pair.originalIndex === originalIndex;
        });
      })
      .filter(function (index) {
        return index >= 0;
      });

    return {
      id: question.id,
      q: question.q,
      options: pairs.map(function (pair) { return pair.option; }),
      answers: answers,
      explanation: question.explanation
    };
  }

  window.getPublicHealthNursingExerciseQuestionsAutumn = function () {
    return questions.map(shuffleOptions);
  };

  // 秋学期「練習問題」からも、このJSの問題データを読み込む
  window.getPublicHealthNursingBasicQuestionsAutumn = function () {
    return questions.map(shuffleOptions);
  };
})();
