(function (w) {
  var MP = (w.MusicPlayer = w.MusicPlayer || {});

  MP.deriveTitle = function (href) {
    var rel = MP.pathRelativeToOrigin(href);
    if (rel) {
      var parts = rel.split("/").filter(Boolean);
      var seg = parts[parts.length - 1];
      if (seg) {
        try {
          return decodeURIComponent(seg.replace(/[?#].*$/, ""));
        } catch (e) {
          return seg;
        }
      }
    }
    try {
      var u = new URL(href);
      var segs = u.pathname.split("/").filter(Boolean);
      var last = segs[segs.length - 1];
      if (last) return decodeURIComponent(last);
      return u.hostname || "音频";
    } catch (e) {
      return "音频";
    }
  };

  function findActiveLineIndex(lines, t) {
    if (!lines || !lines.length) return -1;
    var idx = -1;
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].t <= t) idx = i;
      else break;
    }
    return idx;
  }

  MP.createUi = function (els) {
    var timeCurrent = els.timeCurrent;
    var timeTotal = els.timeTotal;
    var progressFill = els.progressFill;
    var progressBar = els.progressBar;
    var progressWrap = els.progressWrap;
    var btnPlay = els.btnPlay;
    var errorMsg = els.errorMsg;
    var coverImg = els.coverImg;
    var coverPlaceholder = els.coverPlaceholder;
    var metaSong = els.metaSong;
    var metaArtist = els.metaArtist;
    var metaAlbum = els.metaAlbum;
    var rowSong = els.rowSong;
    var rowArtist = els.rowArtist;
    var rowAlbum = els.rowAlbum;
    var audioSourceUrl = els.audioSourceUrl;
    var lyricsRoot = els.lyricsRoot;
    var lyricsScroll = els.lyricsScroll;
    var lyricsPlaceholder = els.lyricsPlaceholder;

    var LYRICS_EMPTY = "暂无歌词";
    var SCROLL_MS = 520;
    var reduceMotion =
      typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

    var lyricsMode = "none";
    var timedLines = null;
    var lineEls = [];
    var activeIdx = -1;
    var scrollRaf = null;

    function cancelLyricsScrollAnim() {
      if (scrollRaf !== null) {
        cancelAnimationFrame(scrollRaf);
        scrollRaf = null;
      }
    }

    function easeInOutCubic(x) {
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    }

    function smoothScrollTop(el, targetTop, durationMs) {
      cancelLyricsScrollAnim();
      var maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      var to = Math.min(Math.max(0, targetTop), maxScroll);
      var from = el.scrollTop;
      if (!durationMs || durationMs < 16 || Math.abs(to - from) < 1) {
        el.scrollTop = to;
        return;
      }
      var t0 = performance.now();
      function step(now) {
        var p = Math.min(1, (now - t0) / durationMs);
        el.scrollTop = from + (to - from) * easeInOutCubic(p);
        if (p < 1) scrollRaf = requestAnimationFrame(step);
        else scrollRaf = null;
      }
      scrollRaf = requestAnimationFrame(step);
    }

    function scrollActiveLineIntoView(lineEl) {
      if (!lineEl || !lyricsScroll) return;
      var vp = lyricsScroll;
      var parentRect = vp.getBoundingClientRect();
      var lineRect = lineEl.getBoundingClientRect();
      var lineCenter = lineRect.top + lineRect.height / 2;
      var vpCenter = parentRect.top + parentRect.height / 2;
      var delta = lineCenter - vpCenter;
      var targetScroll = vp.scrollTop + delta;
      smoothScrollTop(vp, targetScroll, reduceMotion ? 0 : SCROLL_MS);
    }

    function clearLyricsNodes() {
      if (!lyricsScroll) return;
      var rm = lyricsScroll.querySelectorAll(".lyrics-line, .lyrics-plain");
      for (var i = 0; i < rm.length; i++) rm[i].remove();
    }

    function setPlaying(isPlaying) {
      btnPlay.classList.toggle("is-playing", !!isPlaying);
      btnPlay.setAttribute("aria-label", isPlaying ? "暂停" : "播放");
    }

    function setProgress(currentTime, duration) {
      var ratio = Number.isFinite(duration) && duration > 0 ? currentTime / duration : 0;
      var pct = Math.min(100, Math.max(0, ratio * 100));
      progressFill.style.width = pct + "%";
      progressBar.setAttribute("aria-valuenow", String(Math.round(pct)));
      timeCurrent.textContent = MP.formatTime(currentTime);
      timeTotal.textContent = MP.formatTime(Number.isFinite(duration) ? duration : 0);
    }

    function setMetaRow(row, el, text) {
      var v = text != null ? String(text).trim() : "";
      el.textContent = v;
      row.hidden = !v;
    }

    function setCover(coverHref) {
      if (coverHref) {
        coverImg.src = coverHref;
        coverImg.hidden = false;
        coverPlaceholder.hidden = true;
        coverImg.onload = function () {
          coverImg.hidden = false;
          coverPlaceholder.hidden = true;
        };
        coverImg.onerror = function () {
          coverImg.hidden = true;
          coverPlaceholder.hidden = false;
        };
      } else {
        coverImg.removeAttribute("src");
        coverImg.hidden = true;
        coverPlaceholder.hidden = false;
      }
    }

    function setAudioSourceLine(href) {
      if (!audioSourceUrl) return;
      var v = href ? String(href).trim() : "";
      if (!v) {
        audioSourceUrl.textContent = "";
        audioSourceUrl.hidden = true;
        return;
      }
      audioSourceUrl.textContent = v;
      audioSourceUrl.hidden = false;
      audioSourceUrl.title = v;
    }

    function setMeta(meta) {
      meta = meta || {};
      setMetaRow(rowSong, metaSong, meta.song);
      setMetaRow(rowArtist, metaArtist, meta.artist);
      setMetaRow(rowAlbum, metaAlbum, meta.album);
    }

    function setLyricsTimed(lines) {
      if (!lyricsScroll) return;
      cancelLyricsScrollAnim();
      lyricsMode = "timed";
      timedLines = lines || [];
      lineEls = [];
      activeIdx = -1;
      clearLyricsNodes();
      if (lyricsPlaceholder) lyricsPlaceholder.hidden = true;
      if (lyricsRoot) lyricsRoot.classList.add("lyrics--timed");

      for (var i = 0; i < timedLines.length; i++) {
        var p = document.createElement("p");
        p.className = "lyrics-line";
        p.textContent = timedLines[i].text;
        p.setAttribute("data-i", String(i));
        lyricsScroll.appendChild(p);
        lineEls.push(p);
      }
    }

    function setLyricsPlain(text) {
      if (!lyricsScroll) return;
      cancelLyricsScrollAnim();
      lyricsMode = "plain";
      timedLines = null;
      lineEls = [];
      activeIdx = -1;
      clearLyricsNodes();
      if (lyricsRoot) lyricsRoot.classList.remove("lyrics--timed");
      var v = text != null ? String(text).trim() : "";
      if (!v) {
        if (lyricsPlaceholder) {
          lyricsPlaceholder.hidden = false;
          lyricsPlaceholder.textContent = LYRICS_EMPTY;
        }
        return;
      }
      if (lyricsPlaceholder) lyricsPlaceholder.hidden = true;
      var div = document.createElement("div");
      div.className = "lyrics-plain";
      div.textContent = v;
      lyricsScroll.appendChild(div);
    }

    function setLyricsEmpty() {
      cancelLyricsScrollAnim();
      lyricsMode = "none";
      timedLines = null;
      lineEls = [];
      activeIdx = -1;
      clearLyricsNodes();
      if (lyricsRoot) lyricsRoot.classList.remove("lyrics--timed");
      if (lyricsPlaceholder) {
        lyricsPlaceholder.hidden = false;
        lyricsPlaceholder.textContent = LYRICS_EMPTY;
      }
    }

    /** 兼容：加载提示或无结构文本 */
    function setLyricsText(text) {
      var v = text != null ? String(text).trim() : "";
      if (v === "加载中…") {
        setLyricsPlain("加载中…");
        return;
      }
      setLyricsPlain(v || "");
    }

    function syncLyricsTime(seconds) {
      if (lyricsMode !== "timed" || !timedLines || !timedLines.length || !lineEls.length) return;
      var t = Number(seconds) || 0;
      var idx = findActiveLineIndex(timedLines, t);
      if (idx === activeIdx) return;
      activeIdx = idx;
      for (var i = 0; i < lineEls.length; i++) {
        lineEls[i].classList.toggle("is-active", i === idx);
      }
      if (idx >= 0 && lineEls[idx]) {
        scrollActiveLineIntoView(lineEls[idx]);
      }
    }

    function showError(message) {
      if (!message) {
        errorMsg.hidden = true;
        errorMsg.textContent = "";
        return;
      }
      errorMsg.hidden = false;
      errorMsg.textContent = message;
    }

    function getSeekRatioFromPointer(clientX) {
      var rect = progressBar.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      var x = Math.min(Math.max(0, clientX - rect.left), rect.width);
      return x / rect.width;
    }

    return {
      setPlaying: setPlaying,
      setProgress: setProgress,
      setMeta: setMeta,
      setCover: setCover,
      setAudioSourceLine: setAudioSourceLine,
      setLyricsText: setLyricsText,
      setLyricsTimed: setLyricsTimed,
      setLyricsPlain: setLyricsPlain,
      setLyricsEmpty: setLyricsEmpty,
      syncLyricsTime: syncLyricsTime,
      showError: showError,
      getSeekRatioFromPointer: getSeekRatioFromPointer,
      elements: { progressBar: progressBar, progressWrap: progressWrap, btnPlay: btnPlay },
    };
  };
})(typeof window !== "undefined" ? window : globalThis);
