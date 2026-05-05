(function (w) {
  var MP = (w.MusicPlayer = w.MusicPlayer || {});

  MP.createAudioController = function (audioEl) {
    var step = MP.SEEK_STEP_SEC || 10;

    return {
      get element() {
        return audioEl;
      },

      setSource: function (src) {
        audioEl.src = src;
        audioEl.load();
      },

      clearSource: function () {
        audioEl.removeAttribute("src");
        audioEl.load();
      },

      play: function () {
        return audioEl.play();
      },

      pause: function () {
        audioEl.pause();
      },

      toggle: function () {
        if (audioEl.paused) return audioEl.play();
        audioEl.pause();
        return Promise.resolve();
      },

      seekBySeconds: function (delta) {
        var t = Number(audioEl.currentTime) || 0;
        var d = Number(audioEl.duration);
        var max = Number.isFinite(d) ? d : t + delta;
        audioEl.currentTime = Math.min(Math.max(0, t + delta), max);
      },

      seekToRatio: function (ratio) {
        var d = Number(audioEl.duration);
        if (!Number.isFinite(d) || d <= 0) return;
        audioEl.currentTime = Math.min(Math.max(0, ratio), 1) * d;
      },

      skipBack: function () {
        this.seekBySeconds(-step);
      },

      skipForward: function () {
        this.seekBySeconds(step);
      },
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
