document.addEventListener('DOMContentLoaded', async () => {
  Settings.init();

  const params = new URLSearchParams(window.location.search);
  const bookId = params.get('id');
  let currentChapter = parseInt(params.get('chapter')) || 0;
  let savedScroll = parseInt(params.get('scroll')) || 0;

  const books = window.BOOKS_DATA || [];
  const currentBook = books.find(b => b.id === bookId);

  const header = document.getElementById('reader-header');
  const footer = document.getElementById('reader-footer');
  const content = document.getElementById('reader-content');
  const contentWrapper = document.getElementById('content-wrapper');
  const settingsPanel = document.getElementById('settings-panel');
  const chapterList = document.getElementById('chapter-list');
  const overlay = document.getElementById('overlay');
  const bookTitleEl = document.getElementById('book-title');
  const chapterTitleEl = document.getElementById('chapter-title');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  let menuVisible = false;

  if (!currentBook) {
    content.textContent = '未找到该书籍';
    return;
  }

  bookTitleEl.textContent = currentBook.title;
  await loadChapter(currentChapter);

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
      contentWrapper.scrollTop = 0;
      renderChapterList();
    } catch (e) {
      content.textContent = '章节加载失败，请确保通过本地服务器访问（双击 start.bat 启动）';
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
    menuVisible = false;
    header.classList.remove('show');
    footer.classList.remove('show');
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

  contentWrapper.addEventListener('click', (e) => {
    const rect = contentWrapper.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;
    const height = rect.height;

    if (y < 60 || y > height - 60) return;

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
    Storage.saveProgress(bookId, currentChapter, contentWrapper.scrollTop);
  });

  let saveTimer = null;
  contentWrapper.addEventListener('scroll', () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      Storage.saveProgress(bookId, currentChapter, contentWrapper.scrollTop);
    }, 500);
  });

  if (savedScroll > 0) {
    setTimeout(() => contentWrapper.scrollTop = savedScroll, 200);
  }
});
