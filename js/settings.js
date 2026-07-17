const Settings = {
  current: null,

  init() {
    this.current = Storage.getSettings();
    this.apply();
  },

  apply() {
    const root = document.documentElement;
    root.style.setProperty('--font-size', this.current.fontSize + 'px');
    root.style.setProperty('--line-height', this.current.lineHeight);
    if (this.current.theme === 'default') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', this.current.theme);
    }
  },

  setFontSize(size) {
    this.current.fontSize = size;
    Storage.saveSettings(this.current);
    this.apply();
  },

  setLineHeight(height) {
    this.current.lineHeight = height;
    Storage.saveSettings(this.current);
    this.apply();
  },

  setTheme(theme) {
    this.current.theme = theme;
    Storage.saveSettings(this.current);
    this.apply();
  },

  renderPanel(container) {
    const fontSizes = [14, 16, 18, 20, 24, 28];
    const lineHeights = [1.5, 1.8, 2.0, 2.5];
    const themes = [
      { key: 'default', label: '白' },
      { key: 'green', label: '绿' },
      { key: 'gray', label: '灰' },
      { key: 'dark', label: '夜' }
    ];

    container.innerHTML = `
      <div class="settings-row">
        <span class="settings-label">字号</span>
        <div class="settings-options" id="font-size-options">
          ${fontSizes.map(s => `<button class="settings-btn ${this.current.fontSize === s ? 'active' : ''}" data-size="${s}">${s}</button>`).join('')}
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-label">行距</span>
        <div class="settings-options" id="line-height-options">
          ${lineHeights.map(h => `<button class="settings-btn ${this.current.lineHeight === h ? 'active' : ''}" data-height="${h}">${h}</button>`).join('')}
        </div>
      </div>
      <div class="settings-row">
        <span class="settings-label">主题</span>
        <div class="settings-options" id="theme-options">
          ${themes.map(t => `<button class="settings-btn ${this.current.theme === t.key ? 'active' : ''}" data-theme="${t.key}">${t.label}</button>`).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('#font-size-options .settings-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setFontSize(parseInt(btn.dataset.size));
        this.renderPanel(container);
      });
    });

    container.querySelectorAll('#line-height-options .settings-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setLineHeight(parseFloat(btn.dataset.height));
        this.renderPanel(container);
      });
    });

    container.querySelectorAll('#theme-options .settings-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTheme(btn.dataset.theme);
        this.renderPanel(container);
      });
    });
  }
};
