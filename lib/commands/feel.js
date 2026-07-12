/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { loadLangForCwd } = require('../i18n');
const config = require('../utils/config');
const loader = require('../loader');
const features = require('../utils/features');

// ==========================================
// ВСЕ ТЕКСТЫ НА ВСЕХ ЯЗЫКАХ
// ==========================================

const TEXTS = {
  en: {
    title: 'MIP Vibe — how is your project doing?',
    subtitle: 'MIP feels your project',
    packages: 'Packages:',
    scripts: 'Scripts:',
    last_command: 'Last command:',
    vibe_label: 'Vibe:',
    quote_label: 'Quote of the day:',
    tip_label: '🌟 Did you know?',
    footer: 'MIP is about freedom and vibe. 🧘‍♂️'
  },
  ru: {
    title: 'MIP Vibe — как дела у твоего проекта?',
    subtitle: 'MIP чувствует твой проект',
    packages: 'Пакетов:',
    scripts: 'Скриптов:',
    last_command: 'Последняя команда:',
    vibe_label: 'Настроение:',
    quote_label: 'Цитата дня:',
    tip_label: '🌟 А ты знал?',
    footer: 'MIP — это про свободу и настроение. 🧘‍♂️'
  },
  es: {
    title: 'MIP Vibe — ¿cómo está tu proyecto?',
    subtitle: 'MIP siente tu proyecto',
    packages: 'Paquetes:',
    scripts: 'Scripts:',
    last_command: 'Último comando:',
    vibe_label: 'Vibra:',
    quote_label: 'Cita del día:',
    tip_label: '🌟 ¿Sabías?',
    footer: 'MIP es sobre libertad y vibra. 🧘‍♂️'
  },
  de: {
    title: 'MIP Vibe — wie geht es deinem Projekt?',
    subtitle: 'MIP fühlt dein Projekt',
    packages: 'Pakete:',
    scripts: 'Skripte:',
    last_command: 'Letzter Befehl:',
    vibe_label: 'Vibe:',
    quote_label: 'Zitat des Tages:',
    tip_label: '🌟 Wusstest du?',
    footer: 'MIP geht um Freiheit und Vibe. 🧘‍♂️'
  },
  fr: {
    title: 'MIP Vibe — comment va ton projet ?',
    subtitle: 'MIP sent ton projet',
    packages: 'Paquets :',
    scripts: 'Scripts :',
    last_command: 'Dernière commande :',
    vibe_label: 'Vibe :',
    quote_label: 'Citation du jour :',
    tip_label: '🌟 Le savais-tu ?',
    footer: 'MIP, c\'est la liberté et le vibe. 🧘‍♂️'
  },
  ja: {
    title: 'MIP Vibe — プロジェクトの調子は？',
    subtitle: 'MIPはプロジェクトを感じる',
    packages: 'パッケージ:',
    scripts: 'スクリプト:',
    last_command: '最後のコマンド:',
    vibe_label: '雰囲気:',
    quote_label: '今日の名言:',
    tip_label: '🌟 知ってた？',
    footer: 'MIPは自由と雰囲気が大事。🧘‍♂️'
  },
  ko: {
    title: 'MIP Vibe — 프로젝트는 잘 되고 있나요?',
    subtitle: 'MIP이 프로젝트를 느낀다',
    packages: '패키지:',
    scripts: '스크립트:',
    last_command: '마지막 명령어:',
    vibe_label: '분위기:',
    quote_label: '오늘의 명언:',
    tip_label: '🌟 알고 계셨나요?',
    footer: 'MIP는 자유와 분위기입니다. 🧘‍♂️'
  },
  zh: {
    title: 'MIP Vibe — 你的项目怎么样？',
    subtitle: 'MIP感受你的项目',
    packages: '包:',
    scripts: '脚本:',
    last_command: '上一个命令:',
    vibe_label: '氛围:',
    quote_label: '每日名言:',
    tip_label: '🌟 你知道吗？',
    footer: 'MIP关乎自由和氛围。🧘‍♂️'
  },
  it: {
    title: 'MIP Vibe — come sta il tuo progetto?',
    subtitle: 'MIP sente il tuo progetto',
    packages: 'Pacchetti:',
    scripts: 'Script:',
    last_command: 'Ultimo comando:',
    vibe_label: 'Vibrazione:',
    quote_label: 'Citazione del giorno:',
    tip_label: '🌟 Lo sapevi?',
    footer: 'MIP è libertà e vibrazione. 🧘‍♂️'
  },
  pt: {
    title: 'MIP Vibe — como está seu projeto?',
    subtitle: 'MIP sente seu projeto',
    packages: 'Pacotes:',
    scripts: 'Scripts:',
    last_command: 'Último comando:',
    vibe_label: 'Vibração:',
    quote_label: 'Citação do dia:',
    tip_label: '🌟 Sabia?',
    footer: 'MIP é sobre liberdade e vibe. 🧘‍♂️'
  }
};

// ==========================================
// ВАЙБЫ
// ==========================================

const VIBES = {
  en: {
    productive: 'Productive 📈',
    lazy: 'Chill mode 😴',
    experimental: 'Experimental 🧪',
    chaotic: 'Chaotic 🔥',
    calm: 'Zen 🧘',
    inspired: 'Inspired ✨',
    focused: 'Focused 🎯',
    creative: 'Creative 🎨'
  },
  ru: {
    productive: 'Продуктивное 📈',
    lazy: 'Режим чилла 😴',
    experimental: 'Экспериментальное 🧪',
    chaotic: 'Хаотичное 🔥',
    calm: 'Дзен 🧘',
    inspired: 'Вдохновляющее ✨',
    focused: 'Сфокусированное 🎯',
    creative: 'Творческое 🎨'
  },
  es: {
    productive: 'Productivo 📈',
    lazy: 'Modo chill 😴',
    experimental: 'Experimental 🧪',
    chaotic: 'Caótico 🔥',
    calm: 'Zen 🧘',
    inspired: 'Inspirado ✨',
    focused: 'Enfocado 🎯',
    creative: 'Creativo 🎨'
  },
  de: {
    productive: 'Produktiv 📈',
    lazy: 'Chill-Modus 😴',
    experimental: 'Experimentell 🧪',
    chaotic: 'Chaotisch 🔥',
    calm: 'Zen 🧘',
    inspired: 'Inspiriert ✨',
    focused: 'Fokussiert 🎯',
    creative: 'Kreativ 🎨'
  },
  fr: {
    productive: 'Productif 📈',
    lazy: 'Mode chill 😴',
    experimental: 'Expérimental 🧪',
    chaotic: 'Chaotique 🔥',
    calm: 'Zen 🧘',
    inspired: 'Inspiré ✨',
    focused: 'Focalisé 🎯',
    creative: 'Créatif 🎨'
  },
  ja: {
    productive: '生産的 📈',
    lazy: 'チルモード 😴',
    experimental: '実験的 🧪',
    chaotic: 'カオス 🔥',
    calm: '禅 🧘',
    inspired: 'インスパイア ✨',
    focused: '集中 🎯',
    creative: 'クリエイティブ 🎨'
  },
  ko: {
    productive: '생산적 📈',
    lazy: '칠 모드 😴',
    experimental: '실험적 🧪',
    chaotic: '카오스 🔥',
    calm: '선 🧘',
    inspired: '영감 ✨',
    focused: '집중 🎯',
    creative: '창의적 🎨'
  },
  zh: {
    productive: '高效的 📈',
    lazy: '佛系模式 😴',
    experimental: '实验性的 🧪',
    chaotic: '混乱的 🔥',
    calm: '禅 🧘',
    inspired: '灵感 ✨',
    focused: '专注的 🎯',
    creative: '创造性的 🎨'
  },
  it: {
    productive: 'Produttivo 📈',
    lazy: 'Modalità chill 😴',
    experimental: 'Sperimentale 🧪',
    chaotic: 'Caotico 🔥',
    calm: 'Zen 🧘',
    inspired: 'Ispirato ✨',
    focused: 'Focalizzato 🎯',
    creative: 'Creativo 🎨'
  },
  pt: {
    productive: 'Produtivo 📈',
    lazy: 'Modo chill 😴',
    experimental: 'Experimental 🧪',
    chaotic: 'Caótico 🔥',
    calm: 'Zen 🧘',
    inspired: 'Inspirado ✨',
    focused: 'Focado 🎯',
    creative: 'Criativo 🎨'
  }
};

// ==========================================
// ОПИСАНИЯ ВАЙБОВ
// ==========================================

const VIBE_DESCS = {
  en: {
    productive: "You're on fire! Everything works like clockwork.",
    lazy: "Doing nothing? Rest is important too.",
    experimental: "Something new? I love experiments!",
    chaotic: "Chaos is just another kind of order.",
    calm: "Zen mode. Everything is under control.",
    inspired: "You're inspired! Catch the moment.",
    focused: "100% focus. Nothing can distract you.",
    creative: "Creative flow — the best state."
  },
  ru: {
    productive: "Ты на подъёме! Всё работает как часы.",
    lazy: "Ничего не делаешь? Отдыхай, это тоже важно.",
    experimental: "Что-то новенькое? Люблю эксперименты!",
    chaotic: "Хаос — это тоже порядок, просто другой.",
    calm: "Дзен-режим. Всё под контролем.",
    inspired: "Ты вдохновлён! Лови момент.",
    focused: "Фокус 100%. Ничто не отвлечёт.",
    creative: "Творческий поток — лучшее состояние."
  },
  es: {
    productive: "¡Estás en racha! Todo funciona como un reloj.",
    lazy: "¿No haces nada? Descansar también es importante.",
    experimental: "¿Algo nuevo? ¡Me encantan los experimentos!",
    chaotic: "El caos es solo otro tipo de orden.",
    calm: "Modo zen. Todo está bajo control.",
    inspired: "¡Estás inspirado! Atrapa el momento.",
    focused: "100% de enfoque. Nada puede distraerte.",
    creative: "Flujo creativo — el mejor estado."
  },
  de: {
    productive: "Du bist in Fahrt! Alles läuft wie am Schnürchen.",
    lazy: "Machst du nichts? Ruhe ist auch wichtig.",
    experimental: "Etwas Neues? Ich liebe Experimente!",
    chaotic: "Chaos ist nur eine andere Art von Ordnung.",
    calm: "Zen-Modus. Alles unter Kontrolle.",
    inspired: "Du bist inspiriert! Nutze den Moment.",
    focused: "100% Fokus. Nichts kann dich ablenken.",
    creative: "Kreativer Fluss — der beste Zustand."
  },
  fr: {
    productive: "Tu es en feu ! Tout fonctionne comme sur des roulettes.",
    lazy: "Tu ne fais rien ? Se reposer est important aussi.",
    experimental: "Quelque chose de nouveau ? J'adore les expériences !",
    chaotic: "Le chaos n'est qu'une autre forme d'ordre.",
    calm: "Mode zen. Tout est sous contrôle.",
    inspired: "Tu es inspiré ! Saisis le moment.",
    focused: "100% de concentration. Rien ne peut te distraire.",
    creative: "Flux créatif — le meilleur état."
  },
  ja: {
    productive: "絶好調！すべてが時計のように動いている。",
    lazy: "何もしてない？休息も大事だよ。",
    experimental: "何か新しいもの？実験は大好き！",
    chaotic: "カオスも秩序の一部だ。",
    calm: "禅モード。すべてはコントロール下にある。",
    inspired: "インスパイアされてる！その瞬間を掴め。",
    focused: "集中力100％。何も邪魔できない。",
    creative: "創造の流れ — 最高の状態だ。"
  },
  ko: {
    productive: "최고조야! 모든 게 시계처럼 돌아가고 있어.",
    lazy: "아무것도 안 해? 휴식도 중요해.",
    experimental: "새로운 거? 실험은 내가 제일 좋아해!",
    chaotic: "혼돈도 질서의 일부일 뿐이야.",
    calm: "선 모드. 모든 게 통제하에 있어.",
    inspired: "영감을 받았어! 그 순간을 잡아.",
    focused: "집중력 100%. 아무것도 방해할 수 없어.",
    creative: "창의의 흐름 — 최고의 상태야."
  },
  zh: {
    productive: "你状态正佳！一切都在顺利进行。",
    lazy: "什么都没做？休息也很重要。",
    experimental: "有新东西？我喜欢实验！",
    chaotic: "混乱只是另一种秩序。",
    calm: "禅模式。一切尽在掌握。",
    inspired: "你被启发了！抓住这一刻。",
    focused: "专注力100%。没什么能分散你的注意力。",
    creative: "创作流 — 最佳状态。"
  },
  it: {
    productive: "Sei in forma! Tutto funziona come un orologio.",
    lazy: "Non fai niente? Anche riposare è importante.",
    experimental: "Qualcosa di nuovo? Amo gli esperimenti!",
    chaotic: "Il caos è solo un altro tipo di ordine.",
    calm: "Modalità zen. Tutto sotto controllo.",
    inspired: "Sei ispirato! Cogli il momento.",
    focused: "100% di concentrazione. Niente può distrarti.",
    creative: "Flusso creativo — il miglior stato."
  },
  pt: {
    productive: "Você está voando! Tudo funciona como um relógio.",
    lazy: "Não está fazendo nada? Descansar também é importante.",
    experimental: "Algo novo? Adoro experimentos!",
    chaotic: "O caos é apenas outro tipo de ordem.",
    calm: "Modo zen. Tudo sob controle.",
    inspired: "Você está inspirado! Aproveite o momento.",
    focused: "100% de foco. Nada pode te distrair.",
    creative: "Fluxo criativo — o melhor estado."
  }
};

// ==========================================
// ЦИТАТЫ
// ==========================================

const QUOTES = {
  en: [
    "Code is like humor. When you have to explain it, it's bad.",
    "First, solve the problem. Then, write the code.",
    "Simplicity is the soul of efficiency.",
    "Make it work, make it right, make it fast.",
    "The only way to go fast is to go well.",
    "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.",
    "Experience is the name everyone gives to their mistakes.",
    "The best error message is the one that never shows up.",
    "It works on my machine.",
    "If at first you don't succeed, call it version 1.0.",
    "Real programmers count from 0."
  ],
  ru: [
    "Код — как юмор. Когда его нужно объяснять, он плохой.",
    "Сначала реши проблему, потом пиши код.",
    "Простота - залог успеха.",
    "Сделай работающим, сделай правильным, сделай быстрым.",
    "Единственный способ двигаться быстро — делать хорошо.",
    "Любой дурак может написать код, который поймёт компьютер. Хорошие программисты пишут код, который поймут люди.",
    "Опыт — это имя, которое каждый даёт своим ошибкам.",
    "Лучшее сообщение об ошибке — то, которое никогда не появляется.",
    "У меня работает.",
    "Если с первого раза не получилось, назови это версией 1.0.",
    "Настоящие программисты считают с нуля."
  ],
  es: [
    "El código es como el humor. Cuando hay que explicarlo, es malo.",
    "Primero resuelve el problema, luego escribe el código.",
    "La simplicidad es el alma de la eficiencia.",
    "Haz que funcione, hazlo bien, hazlo rápido.",
    "La única manera de ir rápido es ir bien.",
    "Cualquier tonto puede escribir código que una computadora entienda. Los buenos programadores escriben código que los humanos entienden.",
    "La experiencia es el nombre que todos le dan a sus errores.",
    "El mejor mensaje de error es el que nunca aparece.",
    "Funciona en mi máquina.",
    "Si no funciona a la primera, llámalo versión 1.0.",
    "Los programadores de verdad cuentan desde 0."
  ],
  de: [
    "Code ist wie Humor. Wenn man ihn erklären muss, ist er schlecht.",
    "Löse zuerst das Problem, dann schreibe den Code.",
    "Einfachheit ist die Seele der Effizienz.",
    "Mach es funktionsfähig, mach es richtig, mach es schnell.",
    "Der einzige Weg, schnell zu sein, ist gut zu sein.",
    "Jeder Idiot kann Code schreiben, den ein Computer versteht. Gute Programmierer schreiben Code, den Menschen verstehen.",
    "Erfahrung ist der Name, den jeder seinen Fehlern gibt.",
    "Die beste Fehlermeldung ist die, die nie erscheint.",
    "Bei mir läuft's.",
    "Wenn es beim ersten Mal nicht klappt, nenn es Version 1.0."
  ],
  fr: [
    "Le code est comme l'humour. Quand il faut l'expliquer, c'est mauvais.",
    "Résous d'abord le problème, puis écris le code.",
    "La simplicité est l'âme de l'efficacité.",
    "Fais-le marcher, fais-le bien, fais-le vite.",
    "La seule façon d'aller vite est d'aller bien.",
    "N'importe quel idiot peut écrire du code qu'un ordinateur comprend. Les bons programmeurs écrivent du code que les humains comprennent.",
    "L'expérience est le nom que tout le monde donne à ses erreurs.",
    "Le meilleur message d'erreur est celui qui n'apparaît jamais.",
    "Ça marche sur ma machine.",
    "Si ça ne marche pas du premier coup, appelle-le version 1.0."
  ],
  ja: [
    "コードはユーモアのようなもの。説明しなければならない時点で、それは悪いコードだ。",
    "まず問題を解決し、それからコードを書け。",
    "シンプルさは効率の魂だ。",
    "動くものを作り、正しくし、速くしろ。",
    "速く進む唯一の方法は、うまくやることだ。",
    "どんな馬鹿でもコンピュータが理解できるコードは書ける。良いプログラマーは人間が理解できるコードを書く。",
    "経験とは、誰もが自分の過ちに付ける名前だ。",
    "最高のエラーメッセージは、決して表示されないものだ。",
    "私のマシンでは動きます。"
  ],
  ko: [
    "코드는 유머와 같다. 설명해야 한다면, 나쁜 코드다.",
    "먼저 문제를 해결하고, 그 다음에 코드를 작성하라.",
    "단순함은 효율성의 영혼이다.",
    "작동하게 만들고, 올바르게 만들고, 빠르게 만들어라.",
    "빨리 가는 유일한 방법은 잘 하는 것이다.",
    "어떤 바보라도 컴퓨터가 이해하는 코드를 작성할 수 있다. 좋은 프로그래머는 사람이 이해하는 코드를 작성한다.",
    "경험은 모두가 자신의 실수에 붙이는 이름이다.",
    "최고의 오류 메시지는 절대 나타나지 않는 것이다.",
    "내 컴퓨터에서는 잘 돌아갑니다."
  ],
  zh: [
    "代码就像幽默。当需要解释时，它就是坏的。",
    "先解决问题，再写代码。",
    "简单是效率的灵魂。",
    "让它工作，让它正确，让它快速。",
    "快速前进的唯一方法是做好它。",
    "任何傻瓜都能写出计算机能理解的代码。好的程序员写出人能理解的代码。",
    "经验是每个人给自己错误取的名字。",
    "最好的错误消息是从不出现的那个。",
    "在我的机器上能运行。"
  ],
  it: [
    "Il codice è come l'umorismo. Quando devi spiegarlo, è brutto.",
    "Prima risolvi il problema, poi scrivi il codice.",
    "La semplicità è l'anima dell'efficienza.",
    "Fallo funzionare, fallo giusto, fallo veloce.",
    "L'unico modo per andare veloce è andare bene.",
    "Qualsiasi idiota può scrivere codice che un computer capisce. I buoni programmatori scrivono codice che gli umani capiscono.",
    "L'esperienza è il nome che tutti danno ai propri errori.",
    "Il miglior messaggio di errore è quello che non appare mai.",
    "Sulla mia macchina funziona."
  ],
  pt: [
    "Código é como humor. Quando precisa ser explicado, é ruim.",
    "Primeiro resolva o problema, depois escreva o código.",
    "Simplicidade é a alma da eficiência.",
    "Faça funcionar, faça certo, faça rápido.",
    "A única maneira de ir rápido é ir bem.",
    "Qualquer idiota pode escrever código que um computador entende. Bons programadores escrevem código que humanos entendem.",
    "Experiência é o nome que todos dão aos seus erros.",
    "A melhor mensagem de erro é a que nunca aparece.",
    "Funciona na minha máquina."
  ]
};

// ==========================================
// ПОДСКАЗКИ
// ==========================================

const TIPS = {
  en: [
    'Try mip alias set i install',
    'Don\'t forget about mip audit',
    'mip server runs a beautiful dashboard',
    'mip config helps manage settings',
    'mip registry — for private registries',
    'mip publish — publish packages'
  ],
  ru: [
    'Попробуй mip alias set i install',
    'Не забывай про mip audit',
    'mip server запускает красивый дашборд',
    'mip config помогает управлять настройками',
    'mip registry — для приватных реестров',
    'mip publish — публикуй пакеты'
  ],
  es: [
    'Prueba mip alias set i install',
    'No olvides mip audit',
    'mip server ejecuta un hermoso panel',
    'mip config ayuda a gestionar la configuración',
    'mip registry — para registros privados',
    'mip publish — publica paquetes'
  ],
  de: [
    'Probier mip alias set i install',
    'Vergiss mip audit nicht',
    'mip server startet ein schönes Dashboard',
    'mip config hilft bei der Verwaltung der Einstellungen',
    'mip registry — für private Registries',
    'mip publish — Pakete veröffentlichen'
  ],
  fr: [
    'Essaie mip alias set i install',
    'N\'oublie pas mip audit',
    'mip server lance un beau tableau de bord',
    'mip config aide à gérer les paramètres',
    'mip registry — pour les registres privés',
    'mip publish — publier des paquets'
  ],
  ja: [
    'mip alias set i install を試してみて',
    'mip audit を忘れずに',
    'mip server は美しいダッシュボードを起動する',
    'mip config は設定管理を助ける',
    'mip registry — プライベートレジストリ用',
    'mip publish — パッケージを公開'
  ],
  ko: [
    'mip alias set i install 사용해보기',
    'mip audit 잊지 마세요',
    'mip server는 아름다운 대시보드를 실행합니다',
    'mip config는 설정 관리에 도움을 줍니다',
    'mip registry — 개인 레지스트리용',
    'mip publish — 패키지 게시'
  ],
  zh: [
    '试试 mip alias set i install',
    '别忘了 mip audit',
    'mip server 启动一个漂亮的仪表板',
    'mip config 帮助管理设置',
    'mip registry — 用于私有仓库',
    'mip publish — 发布包'
  ],
  it: [
    'Prova mip alias set i install',
    'Non dimenticare mip audit',
    'mip server avvia un bellissimo dashboard',
    'mip config aiuta a gestire le impostazioni',
    'mip registry — per registri privati',
    'mip publish — pubblica pacchetti'
  ],
  pt: [
    'Tente mip alias set i install',
    'Não se esqueça do mip audit',
    'mip server executa um belo painel',
    'mip config ajuda a gerenciar configurações',
    'mip registry — para registros privados',
    'mip publish — publicar pacotes'
  ]
};

// ==========================================
// ОСНОВНАЯ ФУНКЦИЯ
// ==========================================

async function feel() {
  const mipFeatures = features.loadFeatures(process.cwd());

  // Проверка включена ли команда
  if (mipFeatures['feel.enabled'] === false) {
    console.log('ℹ️ Feel command is disabled (feel.enabled: false)');
    return;
  }

  const lang = loadLangForCwd(process.cwd());
  const texts = TEXTS[lang] || TEXTS.en;
  const vibes = VIBES[lang] || VIBES.en;
  const vibeDescs = VIBE_DESCS[lang] || VIBE_DESCS.en;
  const quotes = QUOTES[lang] || QUOTES.en;
  const tips = TIPS[lang] || TIPS.en;
  
  const info = getProjectInfo();
  const vibeKeys = Object.keys(vibes);
  const vibeKey = vibeKeys[Math.floor(Math.random() * vibeKeys.length)];
  const vibe = vibes[vibeKey];
  const vibeDesc = vibeDescs[vibeKey] || vibeDescs.productive;
  
  const quote = quotes[info.packageCount % quotes.length];
  const tip = tips[Math.floor(Math.random() * tips.length)];
  
  console.log('\n🌊 ' + texts.title);
  console.log('   ' + texts.subtitle + '\n');
  
  console.log('📦 ' + texts.packages + ' ' + info.packageCount);
  console.log('📜 ' + texts.scripts + ' ' + info.scriptCount);
  
  if (info.lastCommand) {
    console.log('⚡ ' + texts.last_command + ' ' + info.lastCommand);
  }
  
  console.log('');
  console.log('🎵 ' + texts.vibe_label + ' ' + vibe);
  console.log('   ' + vibeDesc);
  console.log('');
  
  console.log('💬 ' + texts.quote_label);
  console.log('   ' + quote);
  console.log('');
  
  console.log(texts.tip_label);
  console.log('   ' + tip);
  console.log('');
  
  console.log('   ' + texts.footer);
  console.log('');
}

// ==========================================
// СБОР ИНФОРМАЦИИ О ПРОЕКТЕ
// ==========================================

function getProjectInfo() {
  const info = {
    packageCount: 0,
    scriptCount: 0,
    lastCommand: null
  };
  
  try {
    const manifest = loader.loadManifest(process.cwd());
    info.packageCount = Object.keys(manifest).length;
  } catch (e) {
    info.packageCount = 0;
  }
  
  try {
    const conf = config.readConfig(process.cwd());
    if (conf && conf.scripts) {
      info.scriptCount = Object.keys(conf.scripts).length;
    }
  } catch (e) {
    info.scriptCount = 0;
  }
  
  try {
    const historyPath = path.join(os.homedir(), '.mip', 'history.json');
    if (fs.existsSync(historyPath)) {
      const history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      if (history.length > 0) {
        info.lastCommand = history[history.length - 1].command;
      }
    }
  } catch (e) {
    info.lastCommand = null;
  }
  
  return info;
}

module.exports = { feel };