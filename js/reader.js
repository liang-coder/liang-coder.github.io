document.addEventListener('DOMContentLoaded', async () => {
  Settings.init();

  const params = new URLSearchParams(window.location.search);
  const bookId = params.get('id');
  let currentChapter = parseInt(params.get('chapter')) || 0;
  let savedScroll = parseInt(params.get('scroll')) || 0;

  let books = [];
  let currentBook = null;

  const header = document.getElementById('reader-header');
  const footer = document.getElementById('reader-footer');
  const content = document.getElementById('reader-content');
  const settingsPanel = document.getElementById('settings-panel');
  const chapterList = document.getElementById('chapter-list');
  const overlay = document.getElementById('overlay');
  const bookTitleEl = document.getElementById('book-title');
  const chapterTitleEl = document.getElementById('chapter-title');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  let menuVisible = false;

  try {
    const res = await fetch('data/books.json');
    books = await res.json();
    currentBook = books.find(b => b.id === bookId);

    if (!currentBook) {
      content.textContent = '未找到该书籍';
      return;
    }

    bookTitleEl.textContent = currentBook.title;
    await loadChapter(currentChapter);

    if (savedScroll > 0) {
      setTimeout(() => window.scrollTo(0, savedScroll), 100);
    }
  } catch (e) {
    content.textContent = '加载失败';
  }

  async function loadChapter(index) {
    if (index < 0 || index >= currentBook.chapters.length) return;
    currentChapter = index;
    const chapter = currentBook.chapters[index];
    chapterTitleEl.textContent = chapter.title;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === currentBook.chapters.length - 1;

    try {
      const res = await fetch(chapter.file);
      const text = await res.text();
      content.textContent = text;
      window.scrollTo(0, 0);
      renderChapterList();
    } catch (e) {
      content.textContent = '章节加载失败';
    }
  }

  function toggleMenu() {
    menuVisible = !menuVisible;
    header.classList.toggle('show', menuVisible);
    footer.classList.toggle('show', menuVisible);
  }

  function closeAll() {
    settingsPanel.classList.remove('show');
    chapterList.classList.remove('show');
    overlay.classList.remove('show');
  }

  function renderChapterList() {
    const listContent = document.getElementById('chapter-list-content');
    listContent.innerHTML = currentBook.chapters.map((ch, i) => `
      <div class="chapter-item ${i === currentChapter ? 'current' : ''}" data-index="${i}">
        <div class="chapter-title">${ch.title}</div>
      </div>
    `).join('');

    listContent.querySelectorAll('.chapter-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        closeAll();
        loadChapter(idx);
      });
    });
  }

  content.addEventListener('click', (e) => {
    const rect = content.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    if (x < width * 0.3) {
      if (currentChapter > 0) loadChapter(currentChapter - 1);
    } else if (x > width * 0.7) {
      if (currentChapter < currentBook.chapters.length - 1) loadChapter(currentChapter + 1);
    } else {
      toggleMenu();
    }
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    Storage.saveProgress(bookId, currentChapter, 0);
    window.location.href = 'index.html';
  });

  document.getElementById('settings-btn').addEventListener('click', () => {
    closeAll();
    settingsPanel.classList.add('show');
    overlay.classList.add('show');
    Settings.renderPanel(settingsPanel);
  });

  document.getElementById('chapter-btn').addEventListener('click', () => {
    closeAll();
    chapterList.classList.add('show');
  });

  prevBtn.addEventListener('click', () => {
    if (currentChapter > 0) loadChapter(currentChapter - 1);
  });

  nextBtn.addEventListener('click', () => {
    if (currentChapter < currentBook.chapters.length - 1) loadChapter(currentChapter + 1);
  });

  document.getElementById('chapter-close').addEventListener('click', () => {
    chapterList.classList.remove('show');
  });

  overlay.addEventListener('click', () => {
    closeAll();
  });

  window.addEventListener('beforeunload', () => {
    Storage.saveProgress(bookId, currentChapter, window.scrollY);
  });

  let saveTimer = null;
  window.addEventListener('scroll', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      Storage.saveProgress(bookId, currentChapter, window.scrollY);
    }, 500);
  });
});
