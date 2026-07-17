document.addEventListener('DOMContentLoaded', async () => {
  Settings.init();
  const grid = document.getElementById('book-grid');

  try {
    const res = await fetch('data/books.json');
    const books = await res.json();

    if (books.length === 0) {
      grid.innerHTML = '<div class="empty-state">暂无书籍，请将小说文件放入 novels 目录并更新 data/books.json</div>';
      return;
    }

    grid.innerHTML = books.map(book => {
      const progress = Storage.getProgress(book.id);
      const chapterTitle = book.chapters[progress.chapter]
        ? book.chapters[progress.chapter].title
        : book.chapters[0].title;
      const progressText = progress.chapter > 0 || progress.scrollTop > 0
        ? `读到: ${chapterTitle}`
        : '未阅读';

      return `
        <div class="book-card" data-id="${book.id}">
          <div class="book-cover">${book.title.substring(0, 2)}</div>
          <div class="book-title">${book.title}</div>
          <div class="book-author">${book.author}</div>
          <div class="book-progress">${progressText}</div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.book-card').forEach(card => {
      card.addEventListener('click', () => {
        const bookId = card.dataset.id;
        const book = books.find(b => b.id === bookId);
        const progress = Storage.getProgress(bookId);
        window.location.href = `reader.html?id=${bookId}&chapter=${progress.chapter}&scroll=${progress.scrollTop}`;
      });
    });
  } catch (e) {
    grid.innerHTML = '<div class="empty-state">加载失败，请检查 data/books.json 是否存在</div>';
  }
});
