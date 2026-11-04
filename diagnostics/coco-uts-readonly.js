/* Coco UTS read-only probe. No networking, persistence or response changes. */
(function () {
  try {
    var target = /^https:\/\/uts-api\.itunes\.apple\.com\/uts\/v3\/movies\/umc\.cmc\.5y1554je00oslx5xtkxv9uk7s(?:\?[^#]*)?$/;
    if (!target.test($request.url)) return;
    var headers = $response.headers || {};
    var ct = "";
    Object.keys(headers).forEach(function(k) { if(k.toLowerCase()==="content-type") ct=String(headers[k]); });
    if (!/\b(?:application\/json|application\/[\w.-]+\+json)\b/i.test(ct)) return;
    var root = JSON.parse($response.body);
    var counts={total:0,main:0,trailer:0,other:0,invalid:0}, stack=[{v:root,p:"$"}];
    // Only schema names are exposed; dynamic object keys are always redacted.
    var safe="data canvas shelves items content backgroundVideo playables itunesMediaApiData movieClips offers hlsUrl videos video assets results".split(" ");
    while(stack.length) {
      var item=stack.pop(), value=item.v;
      if (!value || typeof value!=="object") continue;
      Object.keys(value).forEach(function(key) {
        var path=item.p+(Array.isArray(value)?"["+key+"]":"."+ (safe.indexOf(key)>=0?key:"[key]"));
        var v=value[key];
        if(key==="hlsUrl") {
          counts.total++;
          var row={field:path,aMatch:false,idMatch:false,trailerIdMatch:false,host:"[redacted]",path:"[redacted]"};
          if(typeof v==="string") {
            var m=/^https:\/\/([^/?#]+)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/.exec(v);
            if(m) {
              var params={};
              (m[3]||"").split("&").forEach(function(part) {
                var pair=part.split("="), k=decodeURIComponent(pair[0]);
                if(k==="a"||k==="id") (params[k]||(params[k]=[])).push(decodeURIComponent(pair.slice(1).join("=")));
              });
              row.aMatch=!!(params.a&&params.a.length===1&&params.a[0]==="1307301491");
              row.idMatch=!!(params.id&&params.id.length===1&&params.id[0]==="1362880914");
              row.trailerIdMatch=!!(params.id&&params.id.length===1&&params.id[0]==="49671218");
              if(m[1]==="play-edge.itunes.apple.com") row.host=m[1];
              if(m[2]==="/WebObjects/MZPlayLocal.woa/hls/playlist.m3u8") row.path=m[2];
              row.kind=row.aMatch&&row.idMatch?"main":row.aMatch&&row.trailerIdMatch?"trailer":"other";
              counts[row.kind]++;
            } else counts.invalid++;
          } else counts.invalid++;
          console.log("[Coco.UTS] "+JSON.stringify(row));
        } else if(v&&typeof v==="object") stack.push({v:v,p:path});
      });
    }
    console.log("[Coco.UTS] "+JSON.stringify(counts));
  } catch (_) { console.log("[Coco.UTS] diagnostic_error"); }
  finally { $done({}); }
})();
