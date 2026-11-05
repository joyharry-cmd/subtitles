/* Coco player-tabs diagnostic. No mutations, outbound requests or persistent state. */
(function () {
  'use strict';
  var target = /^https:\/\/uts-api\.itunes\.apple\.com\/uts\/v3\/contents\/umc\.cmc\.5y1554je00oslx5xtkxv9uk7s\/player-tabs(?:\?[^#\s]*)?$/;
  var version = 'coco-player-tabs-r1';
  var fieldGroups = {
    hlsUrl: /^hlsUrl$/i,
    mediaAddress: /^(playbackUrl|mediaUrl|streamUrl|manifestUrl|masterPlaylistUrl|playlistUrl|contentUrl|url|uri|src)$/i,
    playbackReference: /^(playableId|playbackId|playbackReference|playbackRef|playbackContext|playbackSessionId|assetId|mediaId|resourceId|contentId|canonicalId|adamId|mainAssetAdamId)$/i,
    resourceType: /^(type|resourceType|mediaType|assetType|playableType|format|mimeType)$/i,
    playbackStructure: /^(playable|playables|playback|playbackMetadata|assets|media|streams|offers|entitlements)$/i,
    uiStructure: /^(tabs|playerTabs|shelves|items|title|artwork|images|actions)$/i
  };

  function values(query, wanted) {
    var result = [];
    query.split('&').forEach(function (pair) {
      var at = pair.indexOf('=');
      if (at < 0) return;
      if (decodeURIComponent(pair.slice(0,at)) === wanted) result.push(decodeURIComponent(pair.slice(at+1)));
    });
    return result;
  }

  function inspect(root, fields, matches) {
    var visited = 0;
    var limited = false;
    function walk(value, depth, keyName) {
      if (depth > 32 || visited >= 25000) { limited = true; return; }
      visited++;
      if (typeof value === 'number') value = String(value);
      if (typeof value === 'string') {
        if (/^(1307301491|1362880914|umc\.cmc\.5y1554je00oslx5xtkxv9uk7s)$/.test(value)) matches.cocoIdentifiers++;
        if (value.length > 16384) { limited = true; return; }
        var url = /^https:\/\/([a-z0-9.-]+)(\/[^?#\s]*)?(?:\?([^#\s]*))?$/i.exec(value);
        if (!url) {
          if (/^(?![a-z][a-z0-9+.-]*:)[^?#\s]+\.m3u8(?:\?[^#\s]*)?$/i.test(value)) matches.relativeHls++;
          return;
        }
        var path = url[2] || '';
        if (/\.m3u8$/i.test(path)) matches.absoluteHls++;
        else if (/^(hlsUrl|playbackUrl|mediaUrl|streamUrl|manifestUrl|masterPlaylistUrl|playlistUrl)$/i.test(keyName)) matches.otherHttpsInPlaybackField++;
        if (!/^play(?:-edge)?\.itunes\.apple\.com$/i.test(url[1]) ||
            path !== '/WebObjects/MZPlayLocal.woa/hls/playlist.m3u8') return;
        matches.purchasePath++;
        try {
          var asset = values(url[3] || '', 'a');
          var item = values(url[3] || '', 'id');
          if (asset.length !== 1 || item.length !== 1 || asset[0] !== '1307301491') return;
          if (item[0] === '1362880914') matches.cocoMainPurchase++;
          if (item[0] === '49671218') matches.cocoTrailerPurchase++;
        } catch (_) {}
        return;
      }
      if (!value || typeof value !== 'object') return;
      var keys = Object.keys(value);
      for (var i = 0; i < keys.length; i++) {
        if (visited >= 25000) { limited = true; break; }
        var key = keys[i];
        var child = value[key];
        var type = child === null ? 'null' : Array.isArray(child) ? 'array' : typeof child;
        if (!Array.isArray(value)) {
          Object.keys(fieldGroups).forEach(function (group) {
            if (!fieldGroups[group].test(key)) return;
            if (!fields[group]) fields[group] = {};
            fields[group][type] = (fields[group][type] || 0) + 1;
          });
        }
        walk(child, depth + 1, Array.isArray(value) ? keyName : key);
      }
    }
    walk(root, 0, '');
    return limited ? 'limited' : 'complete';
  }

  try {
    if (!target.test($request.url)) return;
    var row = {version:version, at:new Date().toISOString()};
    if (typeof $response === 'undefined' || !$response) {
      row.event = 'request';
    } else {
      row.event = 'response';
      row.status = Number($response.status || $response.statusCode) || 0;
      row.fields = {};
      row.matches = {absoluteHls:0,relativeHls:0,otherHttpsInPlaybackField:0,purchasePath:0,cocoMainPurchase:0,cocoTrailerPurchase:0,cocoIdentifiers:0};
      var body = $response.body;
      if (typeof body !== 'string' || body.length > 2097152) {
        row.scan = 'body_unavailable_or_oversize';
      } else {
        try {
          row.scan = inspect(JSON.parse(body), row.fields, row.matches);
          row.hasPlaylistAddress = row.matches.absoluteHls + row.matches.relativeHls > 0;
        } catch (_) {
          row.scan = 'invalid_or_unreadable_json';
        }
      }
    }
    console.log('[Coco.PlayerTabs] ' + JSON.stringify(row));
  } finally {
    $done({});
  }
})();
