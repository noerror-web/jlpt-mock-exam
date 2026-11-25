/* JLPT N5 past-paper questions, part 2.
   Source: 2021年12月 日本語能力試験 N5 (もじ・ごい / ぶんぽう) and
           2017年7月 N5 文字・語彙 (問題1).
   Answers follow the papers' official 正答表:
     2021.12 問題1 ①④③②③①② ・ 問題2 ③①④②③ ・ 問題3 ②④①③①④
     2021.12 問題4 ②③④ ・ 文法問題1 ②④②②①③③②④
     2017.7 問題1 ２４１２２３４２２３ */
window.JLPT_BANKS = window.JLPT_BANKS || {};
window.JLPT_BANKS.N5 = (window.JLPT_BANKS.N5 || []).concat([
  /* ---------- 2021.12 文字・語彙 問題1：漢字読み ---------- */
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "らいげつ　<u>国</u>へ　かえります。",
    options: ["くに", "こく", "ぐに", "ざく"],
    answer: 0,
    kana: "らいげつ くにへ かえります。",
    exp_en: "「国」 alone is read 「くに」 ('country'); 「こく」 appears in compounds like 外国.",
    exp_bn: "「国」 একা থাকলে 「くに」 (দেশ); 「こく」 যৌগশব্দে (外国) ব্যবহৃত হয়।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "あそこにいるのは　リーさんの　<u>お父さん</u>です。",
    options: ["おねえさん", "おかあさん", "おにいさん", "おとうさん"],
    answer: 3,
    kana: "リーさんの おとうさんです。",
    exp_en: "「お父さん」 is read 「おとうさん」 ('father').",
    exp_bn: "「お父さん」-এর পাঠ 「おとうさん」 (বাবা)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "がくせいが　<u>百人</u>　います。",
    options: ["はくにん", "びゃくにん", "ひゃくにん", "びゅくにん"],
    answer: 2,
    kana: "がくせいが ひゃくにん います。",
    exp_en: "「百」 is read 「ひゃく」, so 百人 = ひゃくにん.",
    exp_bn: "「百」-এর পাঠ 「ひゃく」, তাই 百人 = ひゃくにん।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "あそこに　やまださんが　<u>立って</u>　います。",
    options: ["まって", "たって", "きって", "もって"],
    answer: 1,
    kana: "やまださんが たって います。",
    exp_en: "「立って」 is read 「たって」 from 立つ ('to stand').",
    exp_bn: "「立って」-এর পাঠ 「たって」 (立つ = দাঁড়ানো)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "ぜんぶで　<u>五分</u>くらい　あります。",
    options: ["ごほん", "さんぷん", "ごふん", "さんぽん"],
    answer: 2,
    kana: "ぜんぶで ごふんくらい あります。",
    exp_en: "「五分」 is read 「ごふん」 ('five minutes'); ぷん becomes ふん after ん-sounds.",
    exp_bn: "「五分」-এর পাঠ 「ごふん」 (পাঁচ মিনিট)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "きょうは　くるまが　<u>少ない</u>ですね。",
    options: ["すくない", "すこない", "すきない", "すかない"],
    answer: 0,
    kana: "きょうは くるまが すくないですね。",
    exp_en: "「少ない」 is read 「すくない」 ('few').",
    exp_bn: "「少ない」-এর পাঠ 「すくない」 (কম)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "すぐ　そとに　<u>出て</u>　ください。",
    options: ["だして", "でて", "でして", "だて"],
    answer: 1,
    kana: "すぐ そとに でて ください。",
    exp_en: "「出て」 is read 「でて」 from 出る ('to go out').",
    exp_bn: "「出て」-এর পাঠ 「でて」 (出る = বের হওয়া)।"
  },

  /* ---------- 2021.12 文字・語彙 問題2：表記 ---------- */
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Kanji Writing)",
    lesson: "",
    prompt: "ここで　でんしゃに　のります。",
    options: ["電東", "雷東", "電車", "雷車"],
    answer: 2,
    kana: "ここで でんしゃに のります。",
    exp_en: "「でんしゃ」 is written 「電車」 ('train').",
    exp_bn: "「でんしゃ」 লেখা হয় 「電車」 (ট্রেন)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Kanji Writing)",
    lesson: "",
    prompt: "あさから　てが　いたいです。",
    options: ["手", "足", "耳", "目"],
    answer: 0,
    kana: "あさから てが いたいです。",
    exp_en: "「て」 (hand) is written 「手」; 足 is あし, 耳 みみ, 目 め.",
    exp_bn: "「て」 (হাত) লেখা হয় 「手」; 足 = পা, 耳 = কান, 目 = চোখ।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Kanji Writing)",
    lesson: "",
    prompt: "おとといは　かようびでした。",
    options: ["月よう日", "木よう日", "金よう日", "火よう日"],
    answer: 3,
    kana: "おとといは かようびでした。",
    exp_en: "「かようび」 is written 「火よう日」 (Tuesday).",
    exp_bn: "「かようび」 লেখা হয় 「火よう日」 (মঙ্গলবার)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Kanji Writing)",
    lesson: "",
    prompt: "これが　いちばん　やすいです。",
    options: ["高い", "安い", "古い", "多い"],
    answer: 1,
    kana: "これが いちばん やすいです。",
    exp_en: "「やすい」 (cheap) is written 「安い」.",
    exp_bn: "「やすい」 (সস্তা) লেখা হয় 「安い」।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Kanji Writing)",
    lesson: "",
    prompt: "いま、はやしさんが　はなして　います。",
    options: ["読して", "語して", "話して", "説して"],
    answer: 2,
    kana: "はやしさんが はなして います。",
    exp_en: "「はなして」 is written 「話して」 from 話す ('to speak').",
    exp_bn: "「はなして」 লেখা হয় 「話して」 (話す = কথা বলা)।"
  },

  /* ---------- 2021.12 文字・語彙 問題3：文脈規定 ---------- */
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    passage: "さとうさん：「すきな（　）は　なんですか。」\nたなかさん：「おすしです。」",
    prompt: "（　）に　入る　ものは　どれですか。",
    options: ["かいもの", "たべもの", "のみもの", "くだもの"],
    answer: 1,
    kana: "すきな たべものは なんですか。",
    exp_en: "The answer おすし is food, so たべもの ('food') fits.",
    exp_bn: "উত্তর おすし (খাবার), তাই 「たべもの」 (খাবার) সঠিক।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "きょねんの　なつ、バスで　にほんを（　）しました。",
    options: ["りょうり", "さんぽ", "れんしゅう", "りょこう"],
    answer: 3,
    kana: "バスで にほんを りょこうしました。",
    exp_en: "Travelling by bus around Japan is りょこう ('a trip').",
    exp_bn: "বাসে জাপান ঘোরা = 「りょこう」 (ভ্রমণ)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "わたしは　この（　）の　2かいに　すんで　います。",
    options: ["アパート", "エレベーター", "タクシー", "トイレ"],
    answer: 0,
    kana: "この アパートの にかいに すんで います。",
    exp_en: "You live on the second floor of a building: アパート ('apartment').",
    exp_bn: "দোতলায় থাকে 「アパート」-এ (ফ্ল্যাট)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "へやが　あついですから、まどを（　）。",
    options: ["おしましょう", "けしましょう", "あけましょう", "おりましょう"],
    answer: 2,
    kana: "まどを あけましょう。",
    exp_en: "A hot room means opening the window: まどを あける.",
    exp_bn: "গরম ঘরে জানালা খোলে: まどを あけましょう।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "さとうさんは　かみのけが（　）です。",
    options: ["ながい", "おおきい", "ちかい", "ひろい"],
    answer: 0,
    kana: "かみのけが ながいです。",
    exp_en: "Hair is described as ながい ('long').",
    exp_bn: "চুলের বর্ণনা 「ながい」 (লম্বা)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "いえでは　くつを（　）ください。",
    options: ["しめて", "かぶって", "きて", "ぬいで"],
    answer: 3,
    kana: "いえでは くつを ぬいで ください。",
    exp_en: "Shoes come off indoors: くつを ぬぐ ('take off').",
    exp_bn: "ঘরে ঢোকার আগে জুতা খোলে: くつを ぬいで ください।"
  },

  /* ---------- 2021.12 文字・語彙 問題4：言い換え ---------- */
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題4：言い換え (Paraphrase)",
    lesson: "",
    prompt: "ともだちと　きっさてんへ　いきました。",
    options: [
      "ともだちと　えいがを　みに　いきました。",
      "ともだちと　コーヒーを　のみに　いきました。",
      "ともだちと　ざっしを　かいに　いきました。",
      "ともだちと　ケーキを　つくりに　いきました。"
    ],
    answer: 1,
    kana: "きっさてん = コーヒーを のみに いく ところ。",
    exp_en: "A きっさてん is a café, where you go to drink coffee.",
    exp_bn: "「きっさてん」 হলো ক্যাফে — কফি খেতে যাওয়া হয়।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題4：言い換え (Paraphrase)",
    lesson: "",
    prompt: "へやの　そうじを　しました。",
    options: [
      "へやは　あたらしいです。",
      "へやは　あたらしくないです。",
      "へやは　きれいです。",
      "へやは　きたないです。"
    ],
    answer: 2,
    kana: "そうじを する = きれいに する。",
    exp_en: "Cleaning a room leaves it きれい ('clean').",
    exp_bn: "ঘর পরিষ্কার করা মানে ঘর 「きれい」 (পরিচ্ছন্ন) হয়।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題4：言い換え (Paraphrase)",
    lesson: "",
    prompt: "それは　かるいです。",
    options: [
      "それは　あまくありません。",
      "それは　むずかしくありません。",
      "それは　つめたくありません。",
      "それは　おもくありません。"
    ],
    answer: 3,
    kana: "かるい = おもくない。",
    exp_en: "「かるい」 (light) is the opposite of heavy: おもくない.",
    exp_bn: "「かるい」 (হালকা) = 「おもくない」 (ভারী নয়)।"
  },

  /* ---------- 2021.12 文法 問題1 ---------- */
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "きのう　学校で　先生（　）会いました。",
    options: ["で", "に", "を", "へ"],
    answer: 1,
    kana: "せんせいに あいました。",
    exp_en: "The person you meet takes 「に」: 先生に 会う.",
    exp_bn: "যার সঙ্গে দেখা হয় তার পরে 「に」: 先生に 会う।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "わたしの　アパートから　学校まで　30分（　）かかります。",
    options: ["を", "ごろ", "が", "ぐらい"],
    answer: 3,
    kana: "さんじゅっぷん ぐらい かかります。",
    exp_en: "「ぐらい」 gives an approximate amount of time.",
    exp_bn: "আনুমানিক সময় বোঝাতে 「ぐらい」।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "わたしは　毎朝　シャワー（　）あびます。",
    options: ["で", "を", "に", "が"],
    answer: 1,
    kana: "シャワーを あびます。",
    exp_en: "「シャワーを あびる」 takes 「を」.",
    exp_bn: "「シャワーを あびる」-এ 「を」 বসে।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "雨が　まどから　入ります。（　）ください。",
    options: ["あけて", "しめて", "こわして", "あらって"],
    answer: 1,
    kana: "まどを しめて ください。",
    exp_en: "To keep rain out you close the window: しめる.",
    exp_bn: "বৃষ্টি ঠেকাতে জানালা বন্ধ করে: 「しめて」。"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    passage: "中山「アンさんは　りょうりを　しますか。」\nアン「はい。でも、いそがしい　日（　）しません。」",
    prompt: "（　）に　入る　ものは　どれですか。",
    options: ["は", "を", "で", "も"],
    answer: 0,
    kana: "いそがしい 日は しません。",
    exp_en: "「は」 contrasts: on busy days (unlike other days) she doesn't cook.",
    exp_bn: "「は」 বিপরীত ভাব বোঝায়: ব্যস্ত দিনে রান্না করেন না।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    passage: "A「すみません、田中さんは　いますか。」\nB「いいえ、（　）かえりましたよ。」",
    prompt: "（　）に　入る　ものは　どれですか。",
    options: ["よく", "まだ", "もう", "あまり"],
    answer: 2,
    kana: "もう かえりましたよ。",
    exp_en: "With a past verb, 「もう」 means 'already'.",
    exp_bn: "অতীত কালের ক্রিয়ায় 「もう」 = ইতিমধ্যে।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "（　）とき、本を　読んだり　えいがを　見たり　します。",
    options: ["ひま", "ひまだ", "ひまな", "ひまで"],
    answer: 2,
    kana: "ひまな とき、ほんを よんだり…",
    exp_en: "A な-adjective before 「とき」 keeps 「な」: ひまな とき.",
    exp_bn: "「とき」-এর আগে な-বিশেষণে 「な」 থাকে: ひまな とき।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    passage: "A「あしたは　山田さんの　たんじょうびですね。何を（　）か。」\nB「花は　どうですか。」",
    prompt: "（　）に　入る　ものは　どれですか。",
    options: ["もらいます", "あげます", "もらいました", "あげました"],
    answer: 1,
    kana: "なにを あげますか。",
    exp_en: "The giver asks what to give: あげます (from あげる).",
    exp_bn: "যে দেবে সে জিজ্ঞেস করে 「あげます」 (দেব)।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    passage: "（タクシーで）\nタクシーの　人「どこまで　行きますか。」\n西川「東京駅まで（　）。」",
    prompt: "（　）に　入る　ものは　どれですか。",
    options: ["してください", "ほしいです", "いかがですか", "おねがいします"],
    answer: 3,
    kana: "とうきょうえきまで おねがいします。",
    exp_en: "Telling a taxi driver the destination ends with 「おねがいします」.",
    exp_bn: "ট্যাক্সিচালককে গন্তব্য বলার সময় 「おねがいします」 ব্যবহার হয়।"
  },

  /* ---------- 2017.7 文字・語彙 問題1（正答表で確認済み） ---------- */
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "<u>先週</u>　デパートに　かいものに　いきました。",
    options: ["せんしゅ", "せんしゅう", "ぜんしゅ", "ぜんしゅう"],
    answer: 1,
    kana: "せんしゅう デパートに かいものに いきました。",
    exp_en: "「先週」 is read 「せんしゅう」 ('last week').",
    exp_bn: "「先週」-এর পাঠ 「せんしゅう」 (গত সপ্তাহ)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "ごはんの　<u>後で</u>　さんぽします。",
    options: ["のち", "うしろ", "まえ", "あと"],
    answer: 3,
    kana: "ごはんの あとで さんぽします。",
    exp_en: "「後で」 after an action is read 「あとで」.",
    exp_bn: "কাজের পরে বোঝাতে 「後で」 = 「あとで」।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "ちかくに　<u>山</u>が　あります。",
    options: ["かわ", "やま", "いけ", "うみ"],
    answer: 1,
    kana: "ちかくに やまが あります。",
    exp_en: "「山」 is read 「やま」 ('mountain'); かわ 川, いけ 池, うみ 海.",
    exp_bn: "「山」-এর পাঠ 「やま」 (পাহাড়)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "ともだちと　いっしょに　<u>学校</u>に　いきます。",
    options: ["がこう", "がこお", "がっこう", "がっこお"],
    answer: 2,
    kana: "がっこうに いきます。",
    exp_en: "「学校」 is read 「がっこう」 with a small っ.",
    exp_bn: "「学校」-এর পাঠ 「がっこう」 (ছোট っ সহ)।"
  }
]);
