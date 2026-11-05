/* Read-only UTS diagnostic. The health route is the only synthetic response. */
(function () {
  var version = 'coco-trace-20261105-r2';
  var health = /^https:\/\/hls-amt\.itunes\.apple\.com\/__coco_trace_v2\/health(?:\?utm_source=chatgpt\.com)?$/;
  var url = $request.url;
  function log(row) {
    row.version = version;
    console.log('[Coco.Trace] ' + JSON.stringify(row));
  }
  if (health.test(url)) {
    log({event:'health_hit'});
    return $done({response:{status:200,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'},body:version}});
  }
  try {
    var routeMatch = /^https:\/\/uts-api\.itunes\.apple\.com\/uts\/(v[123])\/([^?#]*)/.exec(url);
    if (!routeMatch) return;
    var path = routeMatch[2], parts = path.split('/');
    var route = ['movies','shelves','canvases','playables','content','contents'].indexOf(parts[0]) >= 0 ? parts[0] : 'other';
    if (path === 'contents/play-metadata/vod') route = 'play-metadata/vod';
    if (parts[0] === 'content' && parts.length === 3 && /^(play|playables)$/.test(parts[2])) route = 'content/' + parts[2];
    var shelf = route === 'shelves' && /^(uts\.col\.UpNext|play-next|up-next-widget|post-play|player-tabs)$/.test(parts[1]) ? parts[1] : null;
    var target = /^movies\/umc\.cmc\.5y1554je00oslx5xtkxv9uk7s$/.test(path);
    var row = {event:'response',api:routeMatch[1],route:route,shelf:shelf,target:target,status:Number($response.status)||0};
    var body = $response.body;
    if (typeof body !== 'string' || body.length > 4194304) {
      row.scan = 'body_unavailable_or_oversize';
      return log(row);
    }
    var root;
    try { root = JSON.parse(body); } catch (_) { row.scan = 'invalid_json'; return log(row); }
    var fields = Object.create(null), urls = Object.create(null), candidates = Object.create(null);
    var safe = /^(data|contents?|shelves?|items|results|assets?|playables?|playback|playMetadata|metadata|offers|movieClips|backgroundVideo|hlsUrl|url|playbackUrl|manifestUrl|playlistUrl|streamUrl|mediaUrl|src|media|streams|resources|adamId|contentId|assetId|canonicalId|playbackSessionId|sessionId|entitlement|entitlements|authorization|purchase|duration|videos|video|audio|subtitles|format|type|id)$/;
    var hosts = {'uts-api.itunes.apple.com':'uts','play.itunes.apple.com':'play','play-edge.itunes.apple.com':'play-edge','cma.itunes.apple.com':'cma','cma2.itunes.apple.com':'cma2','amp-api.videos.apple.com':'amp','hls-amt.itunes.apple.com':'hls-amt'};
    var visited = 0, truncated = false;
    function add(bucket, key, limit) {
      if (Object.prototype.hasOwnProperty.call(bucket,key)) bucket[key]++;
      else if (Object.keys(bucket).length < limit) bucket[key] = 1;
      else truncated = true;
    }
    function walk(value, context, depth, name) {
      if (++visited > 30000 || depth > 32) { truncated = true; return; }
      var type = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      if (name !== '*' && name !== '[]' && name !== '$' && route !== 'other') add(fields,context + ':' + type,80);
      if (type === 'string' && value.length <= 16384) {
        var match = /^(?:https?:)?\/\/([a-z0-9.-]+)(?=[:/?#]|$)([^?#]*)/i.exec(value);
        if (!match && !/^(?:\/|[^:/?#]+\/)[^?#]*\.m3u8(?:[?#]|$)/i.test(value)) return;
        var host = match ? match[1].toLowerCase() : '';
        var category = Object.prototype.hasOwnProperty.call(hosts,host) ? hosts[host] : /^vod-(?:ap|fa|ak)-(?:amt|aoc)\.tv\.apple\.com$/.test(host) ? 'apple-vod' : host ? 'other' : 'relative';
        var kind = /\/hls\/subscription\/playlist\.m3u8$/.test(match ? match[2] : '') ? 'subscription-path' : /\/WebObjects\/MZPlayLocal\.woa\/hls\/playlist\.m3u8$/.test(match ? match[2] : '') ? 'purchase-path' : /\.m3u8(?:[?#]|$)/i.test(value) ? 'm3u8' : 'url';
        add(urls,name + ':' + category + ':' + kind,48);
        if (kind === 'purchase-path' && /^https:\/\/(?:play|play-edge)\.itunes\.apple\.com\//.test(value)) {
          var query = value.split('#')[0].split('?').slice(1).join('?');
          var a = [], id = [];
          query.split('&').forEach(function (pair) {
            var eq = pair.indexOf('=');
            if (eq < 0) return;
            try {
              var key = decodeURIComponent(pair.slice(0,eq));
              if (key === 'a') a.push(decodeURIComponent(pair.slice(eq+1)));
              if (key === 'id') id.push(decodeURIComponent(pair.slice(eq+1)));
            } catch (_) {}
          });
          if (a.length === 1 && a[0] === '1307301491' && id.length === 1 && /^(1362880914|49671218)$/.test(id[0])) {
            add(candidates,(id[0] === '1362880914' ? 'main' : 'trailer') + ':' + category + ':' + context,24);
          }
        }
        return;
      }
      if (type !== 'array' && type !== 'object') return;
      var keys = Object.keys(value);
      for (var i = 0; i < keys.length; i++) {
        if (visited >= 30000) { truncated = true; break; }
        var key = keys[i], label = type === 'array' ? '[]' : safe.test(key) ? key : '*';
        walk(value[key],context.split('.').slice(-3).concat(label).join('.'),depth+1,label);
      }
    }
    walk(root,'$',0,'$');
    row.scan = truncated ? 'limited' : 'complete';
    row.fields = fields;
    row.urls = urls;
    row.candidates = candidates;
    log(row);
  } catch (_) {
    log({event:'error'});
  } finally {
    $done({});
  }
})();
