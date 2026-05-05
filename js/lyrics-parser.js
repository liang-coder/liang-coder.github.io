(function (w) {
  var MP = (w.MusicPlayer = w.MusicPlayer || {});

  MP.stripLrcTimestamps = function (text) {
    if (!text) return "";
    return text
      .split(/\r?\n/)
      .map(function (line) {
        return line.replace(/\[[^\]]+\]/g, "").trim();
      })
      .filter(function (line) {
        return line.length > 0;
      })
      .join("\n");
  };

  function looksLikeLrc(text) {
    return /\[\d{1,2}:\d{2}(?:[.:]\d{2,3})?\]/.test(text);
  }

  /**
   * LRC → [{ t: 秒数, text: 文案 }]
   */
  MP.parseLrcTimed = function (text) {
    if (!text) return [];
    var lines = [];
    var re = /^\[(\d{1,2}):(\d{2})(?:\.(\d{2,3}))?\]\s*(.*)$/;
    text.split(/\r?\n/).forEach(function (line) {
      var m = line.match(re);
      if (!m) return;
      var mm = parseInt(m[1], 10);
      var ss = parseInt(m[2], 10);
      var frac = m[3];
      var sec = mm * 60 + ss;
      if (frac) {
        if (frac.length === 2) sec += parseInt(frac, 10) / 100;
        else if (frac.length === 3) sec += parseInt(frac, 10) / 1000;
      }
      var txt = (m[4] || "").trim();
      if (txt) lines.push({ t: sec, text: txt });
    });
    lines.sort(function (a, b) {
      return a.t - b.t;
    });
    return lines;
  };

  function isLikelyLyricsApiEnvelope(json) {
    return !!(json && typeof json === "object" && "data" in json && json.data && typeof json.data === "object");
  }

  /** JSON 接口 → 带时间轴的歌词行；无则 null */
  MP.timedLinesFromApiJson = function (json) {
    if (!json || typeof json !== "object") return null;
    var data = json.data;
    if (!data || typeof data !== "object") return null;

    if (Array.isArray(data.lyric) && data.lyric.length > 0) {
      var out = [];
      for (var i = 0; i < data.lyric.length; i++) {
        var item = data.lyric[i];
        if (!item || typeof item !== "object") continue;
        var lineText = item.lineLyric || item.text || item.line;
        if (typeof lineText !== "string") continue;
        lineText = lineText.trim();
        if (!lineText) continue;
        var tm = parseFloat(item.time);
        if (!isFinite(tm)) tm = 0;
        out.push({ t: tm, text: lineText });
      }
      out.sort(function (a, b) {
        return a.t - b.t;
      });
      return out.length ? out : null;
    }

    if (typeof data.lyric_text === "string" && data.lyric_text.trim()) {
      var lt = data.lyric_text.trim();
      var parsed = MP.parseLrcTimed(lt);
      return parsed.length ? parsed : null;
    }

    if (Array.isArray(data.lyric) && data.lyric.length === 0) {
      return null;
    }

    return null;
  };

  MP.lyricsFromApiJson = function (json) {
    if (!json || typeof json !== "object") return null;
    var data = json.data;
    if (!data || typeof data !== "object") return null;

    if (Array.isArray(data.lyric) && data.lyric.length > 0) {
      var lines = data.lyric
        .map(function (item) {
          if (!item || typeof item !== "object") return "";
          if (typeof item.lineLyric === "string") return item.lineLyric.trim();
          if (typeof item.text === "string") return item.text.trim();
          if (typeof item.line === "string") return item.line.trim();
          return "";
        })
        .filter(function (s) {
          return s.length > 0;
        });
      return lines.join("\n");
    }

    if (typeof data.lyric_text === "string") {
      var ltx = data.lyric_text.replace(/^\uFEFF/, "").trim();
      if (ltx) {
        if (looksLikeLrc(ltx)) return MP.stripLrcTimestamps(ltx);
        return ltx;
      }
    }

    if (Array.isArray(data.lyric) && data.lyric.length === 0) {
      return "";
    }

    return null;
  };

  function processTextPayload(raw) {
    var t = raw.replace(/^\uFEFF/, "").trim();
    if (!t) return { kind: "empty" };

    if (t.charAt(0) === "{" || t.charAt(0) === "[") {
      try {
        var json = JSON.parse(t);
        var timed = MP.timedLinesFromApiJson(json);
        if (timed && timed.length) return { kind: "timed", lines: timed };
        var plain = MP.lyricsFromApiJson(json);
        if (plain !== null && plain !== "") return { kind: "plain", text: plain };
        if (isLikelyLyricsApiEnvelope(json)) return { kind: "empty" };
      } catch (e) {
        /* 继续按正文 */
      }
    }

    var lrcLines = MP.parseLrcTimed(t);
    if (lrcLines.length) return { kind: "timed", lines: lrcLines };

    if (looksLikeLrc(t)) return { kind: "plain", text: MP.stripLrcTimestamps(t) };
    return { kind: "plain", text: t };
  }

  /**
   * 拉取歌词：优先带时间轴（接口 JSON / LRC），否则纯文本。
   * { kind: 'timed', lines: [{t,text}] } | { kind: 'plain', text } | { kind: 'empty' }
   */
  MP.fetchLyricsForPlayer = function (url) {
    return fetch(url, { credentials: "omit" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      var ct = (r.headers.get("content-type") || "").toLowerCase();
      if (ct.indexOf("application/json") !== -1) {
        return r.json().then(function (json) {
          var timed = MP.timedLinesFromApiJson(json);
          if (timed && timed.length) return { kind: "timed", lines: timed };
          var plain = MP.lyricsFromApiJson(json);
          if (plain !== null && plain !== "") return { kind: "plain", text: plain };
          if (isLikelyLyricsApiEnvelope(json)) return { kind: "empty" };
          return { kind: "empty" };
        });
      }
      return r.text().then(processTextPayload);
    });
  };

  /** 兼容旧逻辑：仅返回纯文本字符串 */
  MP.fetchLyricsText = function (url) {
    return MP.fetchLyricsForPlayer(url).then(function (res) {
      if (res.kind === "timed" && res.lines && res.lines.length) {
        return res.lines
          .map(function (x) {
            return x.text;
          })
          .join("\n");
      }
      if (res.kind === "plain") return res.text || "";
      return "";
    });
  };
})(typeof window !== "undefined" ? window : globalThis);
