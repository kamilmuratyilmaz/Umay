export type LangCode = 'tr' | 'en' | 'zh';

export const LANG_META: Record<LangCode, { name: string; english: string; flag: string }> = {
  tr: { name: 'Türkçe',  english: 'Turkish', flag: '🇹🇷' },
  en: { name: 'English', english: 'English', flag: '🇬🇧' },
  zh: { name: '中文',    english: 'Chinese', flag: '🇨🇳' },
};

type Dict = Record<string, string>;

export const STRINGS: Record<LangCode, Dict> = {
  tr: {
    'picker.step1.eyebrow': 'BAŞLAYALIM · 1/2',
    'picker.step1.title':   'Ana dilin hangisi?',
    'picker.step1.sub':     'Açıklamalar ve çeviriler bu dilde gösterilecek.',
    'picker.step2.eyebrow': 'SON ADIM · 2/2',
    'picker.step2.title':   'Hangi dili öğrenmek istiyorsun?',
    'picker.step2.sub':     'Kelimeler, flashcardlar ve pratik bu dile göre hazırlanacak.',
    'picker.back':          'Geri',
    'picker.cta':           'Başla',
    'picker.change':        'Dili değiştir',
    'picker.comingSoon':    'Yakında',

    'tab.vocabulary':    'Kelimeler',
    'tab.flashcards':    'Flashcards',
    'tab.grammar':       'Dilbilgisi',
    'tab.pronunciation': 'Telaffuz',
    'tab.live':          'Canlı Pratik',

    'vocab.title':     'Temel Kelimeler',
    'vocab.searchPh':  'Ara...',
    'vocab.empty':     'Aramanızla eşleşen kelime bulunamadı.',
    'vocab.playNormal':'Normal Dinle',
    'vocab.playSlow':  'Yavaş Dinle',
    'vocab.cat.all':   'Tümü',

    'flash.title':       'Akıllı Tekrar',
    'flash.flipPrompt':  'Cevabı görmek için karta tıklayın',
    'flash.again':       'Tekrar',
    'flash.hard':        'Zor',
    'flash.good':        'İyi',
    'flash.easy':        'Kolay',
    'flash.allDone':     'Harika! Tüm kartları bitirdin.',

    'grammar.title':     'Dilbilgisi Asistanı',
    'grammar.prompt':    'Bir dilbilgisi konusu sor',
    'grammar.loading':   'Düşünüyorum...',

    'pron.title':        'Telaffuz Kontrolü',
    'pron.targetLabel':  'HEDEF KELİME',
    'pron.micPrompt':    'Kayda başlamak için mikrofona tıklayın.',
    'pron.scoreLabel':   'Puan',

    'live.title':        'Canlı Pratik',
    'live.connect':      'Bağlan',
    'live.connecting':   'Bağlanıyor...',
    'live.endCall':      'Görüşmeyi bitir',

    'common.error':      'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.',
  },
  en: {
    'picker.step1.eyebrow': "LET'S START · 1/2",
    'picker.step1.title':   'What is your native language?',
    'picker.step1.sub':     'Explanations and translations will appear in this language.',
    'picker.step2.eyebrow': 'LAST STEP · 2/2',
    'picker.step2.title':   'Which language do you want to learn?',
    'picker.step2.sub':     'Vocabulary, flashcards and practice will be tailored to it.',
    'picker.back':          'Back',
    'picker.cta':           'Start',
    'picker.change':        'Change languages',
    'picker.comingSoon':    'Coming soon',

    'tab.vocabulary':    'Vocabulary',
    'tab.flashcards':    'Flashcards',
    'tab.grammar':       'Grammar',
    'tab.pronunciation': 'Pronunciation',
    'tab.live':          'Live Tutor',

    'vocab.title':     'Core Vocabulary',
    'vocab.searchPh':  'Search...',
    'vocab.empty':     'No words match your search.',
    'vocab.playNormal':'Play normal',
    'vocab.playSlow':  'Play slow',
    'vocab.cat.all':   'All',

    'flash.title':       'Smart Review',
    'flash.flipPrompt':  'Tap the card to see the answer',
    'flash.again':       'Again',
    'flash.hard':        'Hard',
    'flash.good':        'Good',
    'flash.easy':        'Easy',
    'flash.allDone':     "Nice! You've finished all cards.",

    'grammar.title':     'Grammar Helper',
    'grammar.prompt':    'Ask a grammar question',
    'grammar.loading':   'Thinking...',

    'pron.title':        'Pronunciation Check',
    'pron.targetLabel':  'TARGET WORD',
    'pron.micPrompt':    'Tap the microphone to start recording.',
    'pron.scoreLabel':   'Score',

    'live.title':        'Live Tutor',
    'live.connect':      'Connect',
    'live.connecting':   'Connecting...',
    'live.endCall':      'End call',

    'common.error':      'Sorry, an error occurred. Please try again.',
  },
  zh: {
    'picker.step1.eyebrow': '开始吧 · 1/2',
    'picker.step1.title':   '你的母语是什么？',
    'picker.step1.sub':     '说明和翻译将以这种语言显示。',
    'picker.step2.eyebrow': '最后一步 · 2/2',
    'picker.step2.title':   '你想学哪种语言？',
    'picker.step2.sub':     '词汇、卡片和练习都会针对这门语言准备。',
    'picker.back':          '返回',
    'picker.cta':           '开始',
    'picker.change':        '更换语言',
    'picker.comingSoon':    '即将推出',

    'tab.vocabulary':    '词汇',
    'tab.flashcards':    '卡片',
    'tab.grammar':       '语法',
    'tab.pronunciation': '发音',
    'tab.live':          '实时对话',

    'vocab.title':     '常用词汇',
    'vocab.searchPh':  '搜索...',
    'vocab.empty':     '没有匹配的词。',
    'vocab.playNormal':'正常播放',
    'vocab.playSlow':  '慢速播放',
    'vocab.cat.all':   '全部',

    'flash.title':       '智能复习',
    'flash.flipPrompt':  '点击卡片查看答案',
    'flash.again':       '重来',
    'flash.hard':        '困难',
    'flash.good':        '良好',
    'flash.easy':        '简单',
    'flash.allDone':     '完成所有卡片！',

    'grammar.title':     '语法助手',
    'grammar.prompt':    '问一个语法问题',
    'grammar.loading':   '思考中...',

    'pron.title':        '发音检查',
    'pron.targetLabel':  '目标词',
    'pron.micPrompt':    '点击麦克风开始录音。',
    'pron.scoreLabel':   '分数',

    'live.title':        '实时对话',
    'live.connect':      '连接',
    'live.connecting':   '连接中...',
    'live.endCall':      '结束通话',

    'common.error':      '抱歉，发生错误。请重试。',
  },
};
