(function (w) {
  w.MusicPlayer = w.MusicPlayer || {};
  w.MusicPlayer.SEEK_STEP_SEC = 10;
  w.MusicPlayer.QUERY_KEYS = {
    url: ["url", "src", "audio", "q"],
    path: ["path", "p", "file"],
    cover: ["cover", "img", "poster", "pic"],
    song: ["song", "title", "name", "track"],
    artist: ["artist", "singer", "ar"],
    album: ["album", "al", "ab"],
    lyrics: ["lyrics", "lyric", "lrc", "lyricsUrl"],
  };
})(typeof window !== "undefined" ? window : globalThis);
