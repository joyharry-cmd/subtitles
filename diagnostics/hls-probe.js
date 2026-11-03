(function () {
  try {
    var body = $response.body;
    if (typeof body !== "string" || !/^\uFEFF?#EXTM3U(?:\r?\n|$)/.test(body)) return;
    var subtitles = body.split(/\r?\n/).filter(function (line) {
      return /^#EXT-X-MEDIA:/.test(line) && /(?:^|[:,])\s*TYPE=SUBTITLES(?:,|$)/.test(line);
    }).length;
    var variants = /^#EXT-X-(?:STREAM-INF|I-FRAME-STREAM-INF):/m.test(body);
    console.log("[Coco HLS] " + (variants || subtitles ? "multivariant candidate" : "media/other") +
      "; subtitle renditions=" + subtitles + "; variant tags=" + variants);
  } finally {
    $done({});
  }
})();
