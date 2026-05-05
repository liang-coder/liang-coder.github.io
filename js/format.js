(function (w) {
  var MP = (w.MusicPlayer = w.MusicPlayer || {});
  MP.formatTime = function (sec) {
    if (!Number.isFinite(sec) || sec < 0) return "0:00";
    var s = Math.floor(sec % 60);
    var m = Math.floor((sec / 60) % 60);
    var h = Math.floor(sec / 3600);
    var mm = h > 0 ? String(m).padStart(2, "0") : String(m);
    var ss = String(s).padStart(2, "0");
    return h > 0 ? h + ":" + mm + ":" + ss : mm + ":" + ss;
  };
})(typeof window !== "undefined" ? window : globalThis);
