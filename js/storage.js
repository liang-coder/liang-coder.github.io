const Storage = {
  getSettings() {
    const data = localStorage.getItem('reader_settings');
    return data ? JSON.parse(data) : {
      fontSize: 16,
      lineHeight: 1.8,
      theme: 'default'
    };
  },

  saveSettings(settings) {
    localStorage.setItem('reader_settings', JSON.stringify(settings));
  },

  getProgress(bookId) {
    const data = localStorage.getItem(`progress_${bookId}`);
    return data ? JSON.parse(data) : { chapter: 0, scrollTop: 0 };
  },

  saveProgress(bookId, chapter, scrollTop) {
    localStorage.setItem(`progress_${bookId}`, JSON.stringify({ chapter, scrollTop }));
  }
};
