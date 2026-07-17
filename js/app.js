document.addEventListener('DOMContentLoaded', () => {
  Settings.init();
  const grid = document.getElementById('book-grid');
  const books = window.BOOKS_DATA || [];

  if (books.length === 0) {
    grid.innerHTML = '<div class="empty-state">暂无书籍，请将小说文件放入 novels 目录并更新 data/books.js</div>';
    return;
  }

  grid.innerHTML = books.map(book => {
    const progress = Storage.getProgress(book.id);
    const chapterTitle = book.chapters[progress.chapter]
      ? book.chapters[progress.chapter].title
      : book.chapters[0].title;
    const progressText = progress.chapter > 0 || progress.scrollTop > 0
      ? `${chapterTitle}`
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
      const progress = Storage.getProgress(bookId);
      window.location.href = `reader.html?id=${bookId}&chapter=${progress.chapter}&scroll=${progress.scrollTop}`;
    });
  });
});
