(function () {
  var MP = window.MusicPlayer;
  if (!MP || !MP.createAudioController || !MP.createUi) return;

  var audio = document.getElementById("audio");
  var controller = MP.createAudioController(audio);

  var ui = MP.createUi({
    timeCurrent: document.getElementById("timeCurrent"),
    timeTotal: document.getElementById("timeTotal"),
    progressFill: document.getElementById("progressFill"),
    progressBar: document.getElementById("progressBar"),
    progressWrap: document.getElementById("progressWrap"),
    btnPlay: document.getElementById("btnPlay"),
    errorMsg: document.getElementById("errorMsg"),
    coverImg: document.getElementById("coverImg"),
    coverPlaceholder: document.getElementById("coverPlaceholder"),
    metaSong: document.getElementById("metaSong"),
    metaArtist: document.getElementById("metaArtist"),
    metaAlbum: document.getElementById("metaAlbum"),
    rowSong: document.getElementById("rowSong"),
    rowArtist: document.getElementById("rowArtist"),
    rowAlbum: document.getElementById("rowAlbum"),
    audioSourceUrl: document.getElementById("audioSourceUrl"),
    lyricsRoot: document.getElementById("lyricsRoot"),
    lyricsScroll: document.getElementById("lyricsScroll"),
    lyricsPlaceholder: document.getElementById("lyricsPlaceholder"),
  });

  var DEFAULT_PAGE_TITLE = "在线播放";

  function setDocumentTitleFromMeta(meta) {
    var song = meta && meta.song ? String(meta.song).trim() : "";
    var artist = meta && meta.artist ? String(meta.artist).trim() : "";
    if (song && artist) {
      document.title = song + " - " + artist;
    } else if (song) {
      document.title = song;
    } else if (artist) {
      document.title = artist;
    } else {
      document.title = DEFAULT_PAGE_TITLE;
    }
  }

  function applyMetaFromQuery(search) {
    var meta = MP.parseMetaTextFromSearch(search);
    setDocumentTitleFromMeta(meta);
    ui.setMeta(meta);
    var cover = MP.resolveCoverUrlFromSearch(search);
    ui.setCover(cover);
  }

  function loadLyricsFromQuery(search) {
    var lyricsUrl = MP.resolveLyricsUrlFromSearch(search);
    if (!lyricsUrl || !MP.fetchLyricsForPlayer) {
      ui.setLyricsEmpty();
      return;
    }
    ui.setLyricsText("加载中…");
    MP.fetchLyricsForPlayer(lyricsUrl).then(
      function (res) {
        if (res.kind === "timed" && res.lines && res.lines.length) {
          ui.setLyricsTimed(res.lines);
          requestAnimationFrame(function () {
            ui.syncLyricsTime(audio.currentTime || 0);
          });
        } else if (res.kind === "plain" && res.text) {
          ui.setLyricsPlain(res.text);
        } else {
          ui.setLyricsEmpty();
        }
      },
      function () {
        ui.setLyricsEmpty();
      }
    );
  }

  function applyUrlToPlayer(href) {
    ui.showError("");
    controller.setSource(href);
    ui.setAudioSourceLine(href);
  }

  function loadFromQuery() {
    var search = window.location.search;
    applyMetaFromQuery(search);
    loadLyricsFromQuery(search);

    var href = MP.resolveAudioUrlFromSearch(search);
    if (href) {
      applyUrlToPlayer(href);
      controller.play().catch(function () {
        ui.setPlaying(false);
      });
    } else {
      controller.clearSource();
      ui.setAudioSourceLine("");
      ui.setPlaying(false);
      ui.setProgress(0, 0);
    }
  }

  function bindProgressSeek() {
    var progressBar = ui.elements.progressBar;
    var progressWrap = ui.elements.progressWrap;
    var dragging = false;

    function seekFromEvent(e) {
      var clientX = e.touches ? e.touches[0].clientX : e.clientX;
      var ratio = ui.getSeekRatioFromPointer(clientX);
      controller.seekToRatio(ratio);
    }

    progressBar.addEventListener("click", function (e) {
      e.preventDefault();
      seekFromEvent(e);
    });

    progressWrap.addEventListener(
      "touchstart",
      function (e) {
        dragging = true;
        seekFromEvent(e);
      },
      { passive: true }
    );

    window.addEventListener(
      "touchmove",
      function (e) {
        if (!dragging) return;
        seekFromEvent(e);
      },
      { passive: true }
    );

    window.addEventListener("touchend", function () {
      dragging = false;
    });

    var mouseDown = false;
    progressWrap.addEventListener("mousedown", function (e) {
      mouseDown = true;
      seekFromEvent(e);
    });
    window.addEventListener("mousemove", function (e) {
      if (!mouseDown) return;
      seekFromEvent(e);
    });
    window.addEventListener("mouseup", function () {
      mouseDown = false;
    });
  }

  document.getElementById("btnPlay").addEventListener("click", function () {
    if (!audio.src) {
      ui.showError("请使用带音频参数的链接打开本页，例如：页面.html?path=music.mp3");
      return;
    }
    controller.toggle().catch(function () {
      ui.setPlaying(false);
    });
  });

  document.getElementById("btnRewind").addEventListener("click", function () {
    controller.skipBack();
  });
  document.getElementById("btnForward").addEventListener("click", function () {
    controller.skipForward();
  });

  audio.addEventListener("play", function () {
    ui.setPlaying(true);
  });
  audio.addEventListener("pause", function () {
    ui.setPlaying(false);
  });
  audio.addEventListener("loadedmetadata", function () {
    ui.setProgress(audio.currentTime, audio.duration);
  });
  audio.addEventListener("timeupdate", function () {
    ui.setProgress(audio.currentTime, audio.duration);
    ui.syncLyricsTime(audio.currentTime);
  });
  audio.addEventListener("seeked", function () {
    ui.syncLyricsTime(audio.currentTime);
  });
  audio.addEventListener("ended", function () {
    ui.setPlaying(false);
  });
  audio.addEventListener("error", function () {
    ui.setPlaying(false);
    ui.showError("加载失败：链接无效、格式不支持、跨域受限，或本浏览器不允许本地 file 音频（可改用本地 HTTP 服务打开）。");
  });

  ui.setPlaying(false);
  ui.setProgress(0, 0);
  bindProgressSeek();
  loadFromQuery();
})();
