/* JLPT N5 past-paper questions.
   Source: 2024年7月 日本語能力試験 N5 (もじ・ごい / ぶんぽう・どっかい).
   Every answer below follows that paper's official 正答表:
     問題1 ３４２３４１２ ・ 問題2 ３４１２４ ・ 問題3 ２４２３１１ ・ 問題4 ３１４
     文法問題1 ４３２２２３１１４ ・ 読解問題3 ３２４１ ・ 問題4 １３ ・ 問題5 ４１ */
window.JLPT_BANKS = window.JLPT_BANKS || {};
window.JLPT_BANKS.N5 = (window.JLPT_BANKS.N5 || []).concat([
  /* ---------- 文字・語彙 問題1：漢字読み ---------- */
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "いま　<u>店</u>の　まえに　います。",
    options: ["いえ", "えき", "みせ", "へや"],
    answer: 2,
    kana: "いま みせの まえに います。",
    exp_en: "「店」 is read 「みせ」 ('shop'); 「いえ」 is 家, 「えき」 is 駅.",
    exp_bn: "「店」-এর পাঠ 「みせ」 (দোকান); 「いえ」 হলো 家, 「えき」 হলো 駅।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "たなかさんは　いま　<u>外国</u>に　います。",
    options: ["がいしゃ", "かいしゃ", "かいこく", "がいこく"],
    answer: 3,
    kana: "たなかさんは いま がいこくに います。",
    exp_en: "「外国」 is read 「がいこく」 ('foreign country').",
    exp_bn: "「外国」-এর পাঠ 「がいこく」 (বিদেশ)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "その　<u>話</u>は　もう　ききました。",
    options: ["うた", "はなし", "え", "じ"],
    answer: 1,
    kana: "その はなしは もう ききました。",
    exp_en: "「話」 is read 「はなし」 ('story, talk'); 「うた」 is 歌, 「え」 is 絵, 「じ」 is 字.",
    exp_bn: "「話」-এর পাঠ 「はなし」 (গল্প/কথা)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "はやしさんも　<u>読んで</u>　ください。",
    options: ["あそんで", "すんで", "よんで", "のんで"],
    answer: 2,
    kana: "はやしさんも よんで ください。",
    exp_en: "「読んで」 is read 「よんで」 from 読む ('to read').",
    exp_bn: "「読んで」-এর পাঠ 「よんで」 (読む = পড়া)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "あたらしい　こうえんは　まちの　<u>北がわ</u>に　あります。",
    options: ["ひがしがわ", "みなみがわ", "にしがわ", "きたがわ"],
    answer: 3,
    kana: "あたらしい こうえんは まちの きたがわに あります。",
    exp_en: "「北」 is read 「きた」 ('north'): 北がわ = the north side.",
    exp_bn: "「北」-এর পাঠ 「きた」 (উত্তর); 北がわ = উত্তর দিক।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "わたしは　<u>九月</u>に　けっこんします。",
    options: ["くがつ", "きゅうがつ", "ぐげつ", "きゅうげつ"],
    answer: 0,
    kana: "わたしは くがつに けっこんします。",
    exp_en: "「九月」 is read 「くがつ」 ('September'); 九 alone is 「きゅう」 but months use 「く」.",
    exp_bn: "「九月」-এর পাঠ 「くがつ」 (সেপ্টেম্বর)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題1：漢字読み (Kanji Reading)",
    lesson: "",
    prompt: "きのう　<u>来なかった</u>　ひとは　だれですか。",
    options: ["こなかった", "きなかった", "こなくなかった", "きなくなかった"],
    answer: 0,
    kana: "きのう こなかった ひとは だれですか。",
    exp_en: "「来なかった」 is read 「こなかった」 (negative past of 来る).",
    exp_bn: "「来なかった」-এর পাঠ 「こなかった」 (来る-এর না-বোধক অতীত)।"
  },

  /* ---------- 文字・語彙 問題2：表記 ---------- */
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Kanji Writing)",
    lesson: "",
    prompt: "てんきが　わるいですから、うちに　いましょう。",
    options: ["天汽", "矢気", "天気", "矢汽"],
    answer: 2,
    kana: "てんきが わるいですから、うちに いましょう。",
    exp_en: "「てんき」 is written 「天気」 ('weather').",
    exp_bn: "「てんき」 লেখা হয় 「天気」 (আবহাওয়া)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Kanji Writing)",
    lesson: "",
    prompt: "あちらの　そらを　みてください。",
    options: ["犬", "花", "山", "空"],
    answer: 3,
    kana: "あちらの そらを みてください。",
    exp_en: "「そら」 is written 「空」 ('sky').",
    exp_bn: "「そら」 লেখা হয় 「空」 (আকাশ)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Kanji Writing)",
    lesson: "",
    prompt: "さとうさんも　たって　ください。",
    options: ["立って", "上って", "下って", "入って"],
    answer: 0,
    kana: "さとうさんも たって ください。",
    exp_en: "「たって」 is written 「立って」 from 立つ ('to stand').",
    exp_bn: "「たって」 লেখা হয় 「立って」 (立つ = দাঁড়ানো)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Kanji Writing)",
    lesson: "",
    prompt: "がくせいは　なんにん　いますか。",
    options: ["先生", "学生", "学主", "先主"],
    answer: 1,
    kana: "がくせいは なんにん いますか。",
    exp_en: "「がくせい」 is written 「学生」 ('student').",
    exp_bn: "「がくせい」 লেখা হয় 「学生」 (শিক্ষার্থী)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題2：表記 (Kanji Writing)",
    lesson: "",
    prompt: "かいだんを　おりて　ください。",
    options: ["上りて", "止りて", "不りて", "下りて"],
    answer: 3,
    kana: "かいだんを おりて ください。",
    exp_en: "「おりて」 is written 「下りて」 from 下りる ('to go down').",
    exp_bn: "「おりて」 লেখা হয় 「下りて」 (下りる = নিচে নামা)।"
  },

  /* ---------- 文字・語彙 問題3：文脈規定 ---------- */
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "えいがの（　）を　2まい　かいました。",
    options: ["カメラ", "チケット", "ケーキ", "タクシー"],
    answer: 1,
    kana: "えいがの チケットを にまい かいました。",
    exp_en: "You buy two チケット ('tickets') for a film.",
    exp_bn: "সিনেমার জন্য কিনতে হয় 「チケット」 (টিকিট)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "びょういんは　うちから（　）ですから、バスで　いきます。",
    options: ["ながい", "おおい", "おそい", "とおい"],
    answer: 3,
    kana: "びょういんは うちから とおいですから、バスで いきます。",
    exp_en: "A distance is とおい ('far'), which is why a bus is used.",
    exp_bn: "দূরত্ব বোঝাতে 「とおい」 (দূরে) — তাই বাসে যাওয়া।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "きょうは　いもうとの　12（　）の　たんじょうびです。",
    options: ["ねん", "さい", "とい", "えん"],
    answer: 1,
    kana: "きょうは いもうとの じゅうにさいの たんじょうびです。",
    exp_en: "Age uses 才/歳 read 「さい」: 12さい = twelve years old.",
    exp_bn: "বয়স বোঝাতে 「さい」 (12さい = বারো বছর)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "（　）を　わすれましたから、おかねを　もって　いません。",
    options: ["かぎ", "とけい", "さいふ", "かさ"],
    answer: 2,
    kana: "さいふを わすれましたから、おかねを もって いません。",
    exp_en: "Money is kept in a さいふ ('wallet').",
    exp_bn: "টাকা রাখা হয় 「さいふ」-তে (মানিব্যাগ)।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "りょこうの　ときは　くろい　くつを（　）。",
    options: ["はきます", "きります", "かけます", "かぶります"],
    answer: 0,
    kana: "りょこうの ときは くろい くつを はきます。",
    exp_en: "Shoes take はく: くつを はきます. きる is for clothes, かぶる for hats.",
    exp_bn: "জুতা পরার ক্রিয়া 「はく」: くつを はきます।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題3：文脈規定 (Context)",
    lesson: "",
    prompt: "きょうは　じゅぎょうの　あと、すぐ　いえに（　）。",
    options: ["かえります", "すみます", "あるきます", "でてかけます"],
    answer: 0,
    kana: "きょうは じゅぎょうの あと、すぐ いえに かえります。",
    exp_en: "Going home is いえに かえります ('return home').",
    exp_bn: "বাড়ি ফেরা = いえに かえります।"
  },

  /* ---------- 文字・語彙 問題4：言い換え ---------- */
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題4：言い換え (Paraphrase)",
    lesson: "",
    prompt: "けさ、はやしさんに　あいました。",
    options: [
      "きのうの　あさ、はやしさんに　あいました。",
      "きょうの　ひる、はやしさんに　あいました。",
      "きょうの　あさ、はやしさんに　あいました。",
      "きのうの　ひる、はやしさんに　あいました。"
    ],
    answer: 2,
    kana: "けさ = きょうの あさ。",
    exp_en: "「けさ」 means 'this morning' = きょうの あさ.",
    exp_bn: "「けさ」 মানে 'আজ সকাল' = きょうの あさ।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題4：言い換え (Paraphrase)",
    lesson: "",
    prompt: "この　かんじは　かんたんです。",
    options: [
      "この　かんじは　やさしいです。",
      "この　かんじは　むずかしいです。",
      "この　かんじは　おもしろいです。",
      "この　かんじは　つまらないです。"
    ],
    answer: 0,
    kana: "かんたん = やさしい。",
    exp_en: "「かんたん」 (simple) has the same meaning as 「やさしい」 here.",
    exp_bn: "「かんたん」 (সহজ) = 「やさしい」।"
  },
  {
    section: "文字・語彙 (N5 Vocabulary & Kanji)",
    subtype: "問題4：言い換え (Paraphrase)",
    lesson: "",
    prompt: "たなかさんは　リーさんに　さくぶんを　おしえました。",
    options: [
      "リーさんは　たなかさんに　さくぶんを　わたしました。",
      "たなかさんは　リーさんに　さくぶんを　ならいました。",
      "たなかさんは　リーさんに　さくぶんを　わたしました。",
      "リーさんは　たなかさんに　さくぶんを　ならいました。"
    ],
    answer: 3,
    kana: "リーさんは たなかさんに さくぶんを ならいました。",
    exp_en: "If Tanaka taught Lee, then Lee learned (ならいました) from Tanaka.",
    exp_bn: "তানাকা শেখালে, লি-সান তানাকার কাছে শিখেছেন (ならいました)।"
  },

  /* ---------- 文法 問題1：文法形式の判断 ---------- */
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "わたしは　一か月（　）2回、ギターを　ならっています。",
    options: ["も", "が", "を", "に"],
    answer: 3,
    kana: "いっかげつに にかい、ギターを ならっています。",
    exp_en: "Frequency per period uses に: 一か月に2回 = twice a month.",
    exp_bn: "সময়ের সঙ্গে কম্পাঙ্ক বোঝাতে 「に」: 一か月に2回 = মাসে দুইবার।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "日曜日に　買い物（　）さんぽを　します。",
    options: ["へ", "も", "や", "ぐらい"],
    answer: 2,
    kana: "にちようびに かいものや さんぽを します。",
    exp_en: "「や」 lists examples: shopping and walking, among other things.",
    exp_bn: "「や」 উদাহরণ হিসেবে তালিকা করে: কেনাকাটা, হাঁটা ইত্যাদি।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "わたしの　母は　銀行（　）はたらいています。",
    options: ["が", "で", "へ", "に"],
    answer: 1,
    kana: "わたしの ははは ぎんこうで はたらいています。",
    exp_en: "The place where an action happens takes 「で」: 銀行で はたらく.",
    exp_bn: "কাজের স্থান বোঝাতে 「で」: 銀行で はたらく।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "わたしは　あたらしい　カメラ（　）ほしいです。",
    options: ["で", "が", "を", "は"],
    answer: 1,
    kana: "わたしは あたらしい カメラが ほしいです。",
    exp_en: "「〜が ほしいです」 marks the wanted thing with 「が」.",
    exp_bn: "「〜が ほしいです」-এ কাঙ্ক্ষিত বস্তু 「が」 নেয়।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "きのう　デパートに　行きましたが、（　）買いませんでした。",
    options: ["何を", "何も", "何か", "何に"],
    answer: 1,
    kana: "きのう デパートに いきましたが、なにも かいませんでした。",
    exp_en: "With a negative verb, 「何も」 means 'nothing at all'.",
    exp_bn: "না-বোধক ক্রিয়ার সঙ্গে 「何も」 = কিছুই না।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "大学の　食堂の　ラーメンより（　）おいしいです。",
    options: ["あまり", "もうすこし", "ずっと", "いちばん"],
    answer: 2,
    kana: "だいがくの しょくどうの ラーメンより ずっと おいしいです。",
    exp_en: "「ずっと」 before a comparison emphasises 'much more'.",
    exp_bn: "তুলনায় 「ずっと」 = অনেক বেশি।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "（店で）A「この　ペンは（　）ですか。」　B「100円です。」",
    options: ["いくら", "いくつ", "どれ", "どうして"],
    answer: 0,
    kana: "この ペンは いくらですか。",
    exp_en: "Asking a price uses 「いくら」.",
    exp_bn: "দাম জিজ্ঞাসায় 「いくら」 ব্যবহৃত হয়।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "きのうの　夜、（　）前に　本を　読みました。",
    options: ["ねる", "ねて", "ねた", "ねている"],
    answer: 0,
    kana: "きのうの よる、ねる まえに ほんを よみました。",
    exp_en: "「〜まえに」 takes the dictionary form: ねる まえに.",
    exp_bn: "「〜まえに」-এর আগে অভিধান-রূপ বসে: ねる まえに।"
  },
  {
    section: "文法 (N5 Grammar)",
    subtype: "問題1：文法形式 (Grammar Form)",
    lesson: "",
    prompt: "リー「林さん、にもつが　多いですね。少し（　）。」　林「あ、すみません。おねがいします。」",
    options: ["持っていませんか", "持たないでください", "もちましたね", "持ちましょうか"],
    answer: 3,
    kana: "すこし もちましょうか。",
    exp_en: "Offering help uses 「〜ましょうか」: 持ちましょうか = shall I carry it?",
    exp_bn: "সাহায্যের প্রস্তাব দিতে 「〜ましょうか」: 持ちましょうか = আমি নিয়ে নিই?"
  },

  /* ---------- 読解 問題3：文章の文法 ---------- */
  {
    section: "読解 (N5 Reading)",
    subtype: "問題3：文章の文法 (Passage Grammar)",
    lesson: "",
    passage: "わたしは 先週の 土曜日に うちで ともだちと りょうりを しました。わたしたちは 二つの りょうりを 作りました。はじめは、おにぎりを 作りました。（16）、やさいの みそしるを 作りました。おにぎりは 少し むずかしかったです。でも、みそしるは（17）。ともだちと 作った おにぎりと みそしるは おいしかったです。",
    prompt: "（16）に　入る　ものは　どれですか。",
    options: ["いつも", "もう", "しかし", "それから"],
    answer: 3,
    kana: "それから、やさいのみそしるを 作りました。",
    exp_en: "After the rice balls comes the next step, so 「それから」 ('after that').",
    exp_bn: "প্রথম কাজের পরের ধাপ বোঝাতে 「それから」 (তারপর)।"
  },
  {
    section: "読解 (N5 Reading)",
    subtype: "問題3：文章の文法 (Passage Grammar)",
    lesson: "",
    passage: "わたしは 先週の 土曜日に うちで ともだちと りょうりを しました。わたしたちは 二つの りょうりを 作りました。はじめは、おにぎりを 作りました。それから、やさいの みそしるを 作りました。おにぎりは 少し むずかしかったです。でも、みそしるは（17）。ともだちと 作った おにぎりと みそしるは おいしかったです。",
    prompt: "（17）に　入る　ものは　どれですか。",
    options: ["かんたんでした", "かんたんだったからです", "かんたんではありませんでした", "かんたんではなかったからです"],
    answer: 0,
    kana: "みそしるは かんたんでした。",
    exp_en: "「でも」 contrasts with the difficult rice balls, so みそしるは かんたんでした.",
    exp_bn: "「でも」 বিপরীত অর্থ দেয়: ভাতের বল কঠিন ছিল, কিন্তু মিসো স্যুপ সহজ ছিল।"
  },

  /* ---------- 読解 問題4：内容理解（短文） ---------- */
  {
    section: "読解 (N5 Reading)",
    subtype: "問題4：内容理解 (Short Text)",
    lesson: "",
    passage: "（会社で）\nムムさんは 同じ 会社の 大友さんに メールを しました。\n\n大友さん\n机の 上の おかしを ありがとう。旅行は どうでしたか。\n今、大友さんの ところに 行きましたが、いませんでしたから、メールを しました。\nおいしかったです。ごちそうさまでした。\n\nムム",
    prompt: "この　メールで、ムムさんは　大友さんに　何が　言いたいですか。",
    options: [
      "おかしを　ありがとうございます。",
      "わたしも　旅行に　行きたいです。",
      "今、大友さんは　どこに　いますか。",
      "わたしも　おかしが　好きです。"
    ],
    answer: 0,
    kana: "おかしを ありがとう。",
    exp_en: "「おいしかったです。ごちそうさまでした。」 thanks Otomo for the sweets.",
    exp_bn: "「おいしかったです。ごちそうさまでした。」 — মিষ্টির জন্য ধন্যবাদ।"
  },
  {
    section: "読解 (N5 Reading)",
    subtype: "問題4：内容理解 (Short Text)",
    lesson: "",
    passage: "学生の ころ、私は いつも 友だちと 話しながら 電車で 学校に 行っていました。今は 一人で 電車で 会社に 行きます。会社まで 1時間、本を 読みながら 行きます。今は 本が 私の 友だちです。",
    prompt: "「私」は　今、電車の　中で　何を　しますか。",
    options: [
      "友だちと　話します。",
      "友だちと　本を　読みます。",
      "一人で　本を　読みます。",
      "会社の　人と　話します。"
    ],
    answer: 2,
    kana: "ひとりで ほんを よみます。",
    exp_en: "「今は 一人で…本を 読みながら 行きます」 — alone, reading a book.",
    exp_bn: "「今は 一人で…本を 読みながら」 — এখন একা বই পড়ে যায়।"
  },

  /* ---------- 読解 問題5：内容理解（中文） ---------- */
  {
    section: "読解 (N5 Reading)",
    subtype: "問題5：内容理解 (Medium Text)",
    lesson: "",
    passage: "青木山に のぼりました\n\nきのう、はじめて 青木山に のぼりました。山の 上の さくらが 見たかったからです。\n山の 入り口から 山の 上まで 2時間 かかります。私は 15分ぐらい のぼって、すぐに つかれました。でも、山で 会った 人たちが みんな、私に 元気な 声で「こんにちは。」と 言いました。ちょっと ①うれしかったです。\n1時ごろ 山の 上に 着きました。さくらの 木は ありましたが、花は ありませんでした。近くに いた 女の 人に「さくらの 花は まだですか。」と 聞きました。女の 人は「山の 上は 寒いですから、花は まだですよ。来月の はじめごろは きれいですよ。」と 言いました。\nですから、②来月また 行きたいです。",
    prompt: "どうして　①うれしかったですか。",
    options: [
      "はじめて　青木山に　のぼったから。",
      "山で　ぜんぜん　つかれなかったから。",
      "山で　会った　人たちと　いっしょに　山に　のぼったから。",
      "山で　会った　人たちが　「私」に　「こんにちは。」と　言ったから。"
    ],
    answer: 3,
    kana: "やまで あった ひとたちが こんにちはと いったから。",
    exp_en: "The gladness comes right after the people greeted her: they said こんにちは.",
    exp_bn: "খুশির কারণ পরের বাক্যেই: পথে দেখা মানুষরা 「こんにちは」 বলেছিল।"
  }
]);
