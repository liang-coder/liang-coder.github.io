(function (w) {
  var MP = (w.MusicPlayer = w.MusicPlayer || {});
  var KEYS = MP.QUERY_KEYS;

  function firstParam(searchParams, keys) {
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = searchParams.get(k);
      if (v && v.trim()) return v.trim();
    }
    return "";
  }

  function safeResolveUrl(value, baseUrl) {
    try {
      return new URL(value, baseUrl).href;
    } catch (e) {
      return null;
    }
  }

  /** 本地 file:// 页面：path 相对当前 html 所在目录；http(s) 则相对站点 origin */
  function resolvePathToHref(path, baseUrl) {
    var trimmed = path.trim();
    if (trimmed.indexOf("http://") === 0 || trimmed.indexOf("https://") === 0) return trimmed;
    try {
      var base = new URL(baseUrl);
      if (base.protocol === "http:" || base.protocol === "https:") {
        var origin = base.origin;
        var p = trimmed.indexOf("/") === 0 ? trimmed : "/" + trimmed;
        return new URL(p, origin + "/").href;
      }
      if (base.protocol === "file:") {
        var dir = new URL("./", baseUrl);
        var rel = trimmed.replace(/^\/+/, "");
        return new URL(rel, dir).href;
      }
    } catch (e) {
      /* ignore */
    }
    return null;
  }

  function isAllowedAudioUrl(href) {
    try {
      var u = new URL(href);
      if (u.protocol === "http:" || u.protocol === "https:") return true;
      if (u.protocol === "data:") return true;
      if (u.protocol === "file:") return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  function isAllowedResourceUrl(href) {
    try {
      var u = new URL(href);
      if (u.protocol === "http:" || u.protocol === "https:") return true;
      if (u.protocol === "file:") return true;
      return false;
    } catch (e) {
      return false;
    }
  }

  MP.resolveAudioUrlFromSearch = function (search, baseUrl) {
    var base = baseUrl || w.location.href;
    var params = new URLSearchParams(search);
    var direct = firstParam(params, KEYS.url);
    if (direct) {
      var resolved = safeResolveUrl(direct, base);
      if (resolved && isAllowedAudioUrl(resolved)) return resolved;
    }

    var path = firstParam(params, KEYS.path);
    if (path) {
      var combined = resolvePathToHref(path, base);
      if (combined && isAllowedAudioUrl(combined)) return combined;
    }

    return null;
  };

  MP.resolveCoverUrlFromSearch = function (search, baseUrl) {
    var base = baseUrl || w.location.href;
    var params = new URLSearchParams(search);
    var raw = firstParam(params, KEYS.cover);
    if (!raw) return null;
    var href = safeResolveUrl(raw, base);
    if (href && isAllowedResourceUrl(href)) return href;
    return null;
  };

  MP.resolveLyricsUrlFromSearch = function (search, baseUrl) {
    var base = baseUrl || w.location.href;
    var params = new URLSearchParams(search);
    var raw = firstParam(params, KEYS.lyrics);
    if (!raw) return null;
    var href = safeResolveUrl(raw, base);
    if (href && isAllowedResourceUrl(href)) return href;
    return null;
  };

  /** 从 query 读取歌曲名、歌手、专辑（纯文本，非 URL） */
  MP.parseMetaTextFromSearch = function (search) {
    var params = new URLSearchParams(search);
    return {
      song: firstParam(params, KEYS.song),
      artist: firstParam(params, KEYS.artist),
      album: firstParam(params, KEYS.album),
    };
  };

  MP.pathRelativeToOrigin = function (href) {
    try {
      var u = new URL(href);
      if (u.origin !== w.location.origin) return null;
      return u.pathname + u.search + u.hash;
    } catch (e) {
      return null;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
