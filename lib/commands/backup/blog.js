/*
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │   MInimal Package Manager                                          │
 * │   https://github.com/kiwinatra/mip                                 │
 * │   MIT License · Copyright (c) 2026 kiwinatra                        │
 * └─────────────────────────────────────────────────────────────────────┘
 */

const https = require('https');
const blessed = require('blessed');

function fetchBlogHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseBlogs(html) {
  const blogs = [];
  const regex = /==BLOG-START==\s*([\s\S]*?)\s*==BLOG-END==/g;
  let match;
  while ((match = regex.exec(html)) !== null) {
    blogs.push(match[1].trim());
  }
  return blogs;
}

function padLine(line, width) {
  const plain = line.replace(/\{[^}]*\}/g, '');
  const need = width - plain.length;
  
  if (need <= 0) return line;
  return line + ' '.repeat(need);
}

function justifyLine(line, width) {
  const plain = line.replace(/\{[^}]*\}/g, '');
  if (!plain || plain.length >= width) return padLine(line, width);
  
  const words = line.split(' ');
  if (words.length === 1) return padLine(line, width);
  
  const totalChars = words.reduce((sum, w) => sum + w.replace(/\{[^}]*\}/g, '').length, 0);
  const totalSpaces = width - totalChars;
  const gaps = words.length - 1;
  
  if (gaps === 0 || totalSpaces <= 0) return padLine(line, width);
  
  const baseSpaces = Math.floor(totalSpaces / gaps);
  let extraSpaces = totalSpaces % gaps;
  
  let result = words[0];
  for (let i = 1; i < words.length; i++) {
    const spaces = baseSpaces + (extraSpaces > 0 ? 1 : 0);
    result += ' '.repeat(spaces) + words[i];
    if (extraSpaces > 0) extraSpaces--;
  }
  
  return padLine(result, width);
}

function wrapText(text, width) {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const testPlain = testLine.replace(/\{[^}]*\}/g, '');
    
    if (testPlain.length > width && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) lines.push(currentLine);
  
  return lines.map((line, i) => {
    if (i < lines.length - 1) {
      return justifyLine(line, width);
    } else {
      return padLine(line, width);
    }
  });
}

function parseMarkdown(text, width) {
  const rawLines = text.split('\n');
  const allLines = [];
  
  for (const line of rawLines) {
    if (!line.trim()) {
      allLines.push(' '.repeat(width));
      continue;
    }
    
    let formatted = '';
    let i = 0;
    
    while (i < line.length) {
      if (line[i] === '*' && line[i + 1] === '*' && line[i + 2] !== ' ') {
        const end = line.indexOf('**', i + 2);
        if (end !== -1) {
          formatted += '{bold}' + line.substring(i + 2, end) + '{/bold}';
          i = end + 2;
          continue;
        }
      }
      if (line[i] === '*' && line[i + 1] !== '*' && line[i + 1] !== ' ') {
        const end = line.indexOf('*', i + 1);
        if (end !== -1) {
          formatted += '{underline}' + line.substring(i + 1, end) + '{/underline}';
          i = end + 1;
          continue;
        }
      }
      if (line[i] === '|') {
        const end = line.indexOf('|', i + 1);
        if (end !== -1) {
          formatted += '{cyan-fg}' + line.substring(i + 1, end) + '{/cyan-fg}';
          i = end + 1;
          continue;
        }
      }
      formatted += line[i];
      i++;
    }
    
    const wrapped = wrapText(formatted, width);
    allLines.push(...wrapped);
  }
  
  return allLines;
}

function centerText(text, width) {
  const plain = text.replace(/\{[^}]*\}/g, '');
  if (plain.length >= width) return text;
  const pad = Math.floor((width - plain.length) / 2);
  const result = ' '.repeat(pad) + text;
  return padLine(result, width);
}

async function blog() {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'MIP Blog',
    cursor: { shape: 'block', blink: true },
    fullUnicode: true,
    // ВАЖНО: включаем поддержку полных символов псевдографики
    useBCE: true,
    terminal: 'xterm-256color'
  });

  let currentBlogIndex = 0;
  let scrollOffset = 0;
  let blogs = [];
  let blogLines = [];
  let isAnimating = false;

  const termWidth = Number(screen.width) || 80;
  const termHeight = Number(screen.height) || 24;

  // ─── Главная страница ───────────────────────────────────
  const cardWidth = 60;
  const cardHeight = 15;
  const cardLeft = Math.floor((termWidth - cardWidth) / 2);
  const cardTop = Math.floor((termHeight - cardHeight) / 2);

  const mainCard = blessed.box({
    top: cardTop,
    left: cardLeft,
    width: cardWidth,
    height: cardHeight,
    tags: true,
    border: { 
      type: 'line',
      // Явно указываем символы для рамки
      fg: 'cyan'
    },
    style: { 
      fg: 'white', 
      bg: 'black', 
      border: { fg: 'cyan' } 
    },
    // ВАЖНО: не обрезаем границы
    noOverflow: false
  });

  const innerW = cardWidth - 2;

  const mainTitle = blessed.box({
    top: 1, left: 1, width: innerW, height: 1,
    content: centerText('{bold}MIP Blog Explorer{/bold}', innerW),
    tags: true,
    style: { fg: 'cyan', bg: 'black' }
  });

  const mainDivTop = blessed.box({
    top: 2, left: 1, width: innerW, height: 1,
    content: '─'.repeat(innerW),
    style: { fg: 'cyan', bg: 'black' }
  });

  const welcomeLines = [
    centerText('Welcome to MIP Blog!', innerW),
    centerText('', innerW),
    centerText('Your source for updates, tutorials,', innerW),
    centerText('and announcements about MIP.', innerW),
    centerText('', innerW),
    centerText('Use J and K to switch between blogs.', innerW),
    centerText('Use Arrow Up/Down to scroll content.', innerW),
  ];

  const mainContent = blessed.box({
    top: 3, left: 1, width: innerW, height: 8,
    content: welcomeLines.join('\n'),
    tags: true,
    style: { fg: 'white', bg: 'black' }
  });

  const mainDivBot = blessed.box({
    top: 11, left: 1, width: innerW, height: 1,
    content: '─'.repeat(innerW),
    style: { fg: 'cyan', bg: 'black' }
  });

  const mainHint = blessed.box({
    top: 12, left: 1, width: innerW, height: 2,
    content: 
      centerText('Press {yellow-fg}{bold}J{/bold}{/yellow-fg} to start reading', innerW) + '\n' +
      centerText('J/K - blogs  |  Q - quit', innerW),
    tags: true,
    style: { fg: 'white', bg: 'black' }
  });

  mainCard.append(mainTitle);
  mainCard.append(mainDivTop);
  mainCard.append(mainContent);
  mainCard.append(mainDivBot);
  mainCard.append(mainHint);

  // ─── Страница блога ─────────────────────────────────────
  const blogWidth = Math.floor(termWidth * 0.9);
  const blogHeight = Math.floor(termHeight * 0.9);
  const blogLeft = Math.floor((termWidth - blogWidth) / 2);
  const blogTop = Math.floor((termHeight - blogHeight) / 2);

  const blogWrapper = blessed.box({
    top: blogTop, 
    left: blogLeft,
    width: blogWidth, 
    height: blogHeight,
    tags: true,
    border: { 
      type: 'line',
      fg: 'cyan'
    },
    style: { 
      fg: 'white', 
      bg: 'black', 
      border: { fg: 'cyan' } 
    },
    noOverflow: false
  });

  const blogInnerW = blogWidth - 2;
  const blogInnerH = blogHeight - 2;

  const blogHeader = blessed.box({
    top: 0, left: 1, width: blogInnerW, height: 1,
    content: centerText('Blog', blogInnerW),
    tags: true,
    style: { fg: 'black', bg: 'cyan', bold: true }
  });

  const blogContent = blessed.box({
    top: 1, left: 1,
    width: blogInnerW,
    height: blogInnerH - 2,
    tags: true,
    style: { fg: 'white', bg: 'black' },
    scrollable: false
  });

  const blogFooter = blessed.box({
    bottom: 0, left: 1,
    width: blogInnerW, height: 1,
    content: centerText('J/K - blogs  |  Up/Down - scroll  |  H - home  |  Q - quit', blogInnerW),
    tags: true,
    style: { fg: 'white', bg: 'black' }
  });

  blogWrapper.append(blogHeader);
  blogWrapper.append(blogContent);
  blogWrapper.append(blogFooter);

  // ─── Загрузка ───────────────────────────────────────────
  const loadBox = blessed.box({
    top: Math.floor((termHeight - 6) / 2),
    left: Math.floor((termWidth - 50) / 2),
    width: 50, height: 6,
    tags: true,
    border: { 
      type: 'line',
      fg: 'yellow'
    },
    style: { 
      fg: 'white', 
      bg: 'black', 
      border: { fg: 'yellow' } 
    },
    noOverflow: false
  });

  const loadText = blessed.box({
    top: 1, left: 1, width: 46, height: 1,
    content: centerText('Loading blogs...', 46),
    style: { fg: 'yellow', bg: 'black' }
  });

  const loadUrl = blessed.box({
    top: 3, left: 1, width: 46, height: 1,
    content: centerText('kiwinatra.github.io/blog.html', 46),
    style: { fg: 'gray', bg: 'black' }
  });

  loadBox.append(loadText);
  loadBox.append(loadUrl);

  screen.append(loadBox);
  screen.render();

  // Анимация загрузки
  const frames = ['|', '/', '-', '\\'];
  let fi = 0;
  const anim = setInterval(() => {
    fi = (fi + 1) % 4;
    loadText.setContent(centerText(`Loading blogs... ${frames[fi]}`, 46));
    screen.render();
  }, 100);

  // Загрузка данных
  try {
    const html = await fetchBlogHTML('https://kiwinatra.github.io/blog.html');
    blogs = parseBlogs(html);
    clearInterval(anim);
    
    if (blogs.length === 0) {
      loadText.setContent(centerText('No blogs found', 46));
      loadText.style.fg = 'red';
      screen.render();
      await new Promise(r => setTimeout(r, 2000));
      process.exit(0);
    }
    
    loadText.setContent(centerText(`Loaded ${blogs.length} blogs`, 46));
    loadText.style.fg = 'green';
    screen.render();
    await new Promise(r => setTimeout(r, 800));
  } catch (err) {
    clearInterval(anim);
    loadText.setContent(centerText('Connection failed', 46));
    loadText.style.fg = 'red';
    screen.render();
    await new Promise(r => setTimeout(r, 2000));
    process.exit(0);
  }

  screen.remove(loadBox);

  // ─── Навигация ─────────────────────────────────────────
  function showMain() {
    if (isAnimating) return;
    isAnimating = true;
    screen.remove(blogWrapper);
    screen.append(mainCard);
    screen.render();
    isAnimating = false;
  }

  function showBlog() {
    if (isAnimating || blogs.length === 0) return;
    isAnimating = true;
    screen.remove(mainCard);
    screen.append(blogWrapper);
    scrollOffset = 0;
    updateBlog();
    screen.render();
    isAnimating = false;
  }

  function updateBlog() {
    if (!blogs.length) return;
    
    const w = Number(blogContent.width) || 40;
    const h = Number(blogContent.height) || 10;
    
    blogLines = parseMarkdown(blogs[currentBlogIndex], w);
    
    blogHeader.setContent(centerText(
      `Blog ${currentBlogIndex + 1} of ${blogs.length}`, blogInnerW
    ));
    
    // Заполняем контент
    const visible = blogLines.slice(scrollOffset, scrollOffset + h);
    while (visible.length < h) {
      visible.push(' '.repeat(w));
    }
    
    const content = visible.join('\n');
    blogContent.setContent(content);
    
    const maxScroll = Math.max(0, blogLines.length - h);
    const pct = maxScroll > 0 ? Math.floor((scrollOffset / maxScroll) * 100) : 100;
    
    blogFooter.setContent(centerText(
      `J/K - blogs  |  Up/Down - scroll (${pct}%)  |  H - home  |  Q - quit`,
      blogInnerW
    ));
    
    screen.render();
  }

  showMain();

  // Клавиши
  screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

  screen.key('j', () => {
    if (screen.children.includes(mainCard)) {
      currentBlogIndex = 0;
      showBlog();
    } else if (currentBlogIndex < blogs.length - 1) {
      currentBlogIndex++;
      showBlog();
    }
  });

  screen.key('k', () => {
    if (currentBlogIndex > 0) {
      currentBlogIndex--;
      showBlog();
    }
  });

  screen.key('up', () => {
    if (scrollOffset > 0 && !isAnimating) {
      scrollOffset--;
      updateBlog();
    }
  });

  screen.key('down', () => {
    if (scrollOffset + Number(blogContent.height) < blogLines.length && !isAnimating) {
      scrollOffset++;
      updateBlog();
    }
  });

  screen.key('h', () => { if (!isAnimating) showMain(); });

  // Ресайз
  screen.on('resize', () => {
    const tw = Number(screen.width) || 80;
    const th = Number(screen.height) || 24;
    
    if (screen.children.includes(mainCard)) {
      const cw = Math.min(60, tw - 4);
      mainCard.width = cw;
      mainCard.left = Math.floor((tw - cw) / 2);
      mainCard.top = Math.floor((th - 15) / 2);
      
      const iw = cw - 2;
      mainTitle.width = iw;
      mainDivTop.width = iw;
      mainDivBot.width = iw;
      mainContent.width = iw;
      mainHint.width = iw;
      
      mainTitle.setContent(centerText('{bold}MIP Blog Explorer{/bold}', iw));
      mainDivTop.setContent('─'.repeat(iw));
      mainDivBot.setContent('─'.repeat(iw));
      mainContent.setContent([
        centerText('Welcome to MIP Blog!', iw),
        centerText('', iw),
        centerText('Your source for updates, tutorials,', iw),
        centerText('and announcements about MIP.', iw),
        centerText('', iw),
        centerText('Use J and K to switch between blogs.', iw),
        centerText('Use Arrow Up/Down to scroll content.', iw),
      ].join('\n'));
      mainHint.setContent(
        centerText('Press {yellow-fg}{bold}J{/bold}{/yellow-fg} to start reading', iw) + '\n' +
        centerText('J/K - blogs  |  Q - quit', iw)
      );
    }
    
    if (screen.children.includes(blogWrapper)) {
      const bw = Math.floor(tw * 0.9);
      const bh = Math.floor(th * 0.9);
      blogWrapper.width = bw;
      blogWrapper.height = bh;
      blogWrapper.left = Math.floor((tw - bw) / 2);
      blogWrapper.top = Math.floor((th - bh) / 2);
      
      const biw = bw - 2;
      blogHeader.width = biw;
      blogContent.width = biw;
      blogContent.height = bh - 4;
      blogFooter.width = biw;
      
      updateBlog();
    }
    screen.render();
  });
}

module.exports = { blog };