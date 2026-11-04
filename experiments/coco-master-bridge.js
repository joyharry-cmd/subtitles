/* Coco pass-through experiment. No subtitle injection. Device-local state only. */
(function () {
  var key='Coco.MasterBridge.v1', prefix='https://hls-amt.itunes.apple.com/__coco_master_v1/', finished=false;
  function log(o){console.log('[Coco.Bridge] '+JSON.stringify(o));}
  function done(o){if(!finished){finished=true;$done(o);}}
  function fail(reason,status){log({event:'failed',reason:reason,status:status||0});done({response:{status:502,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'},body:'Coco bridge failed; disable experimental module and restart Apple TV.'}});}
  function source(s){
    if(typeof s!=='string'||!/^https:\/\/play-edge\.itunes\.apple\.com\/WebObjects\/MZPlayLocal\.woa\/hls\/playlist\.m3u8\?[^#\s]+$/.test(s))return false;
    var p=Object.create(null);try{s.split('?')[1].split('&').forEach(function(x){var i=x.indexOf('='),k=decodeURIComponent(x.slice(0,i)),v=decodeURIComponent(x.slice(i+1));if(i<1||k in p||/[\x00-\x20\x7f]/.test(k+v))throw 0;p[k]=v;});}catch(_){return false;}
    return p.a==='1307301491'&&p.id==='1362880914';
  }
  function read(){try{return JSON.parse($persistentStore.read(key)||'{}');}catch(_){return {};}}
  try {
    if(/^https:\/\/uts-api\.itunes\.apple\.com\/uts\/v3\/movies\/umc\.cmc\.5y1554je00oslx5xtkxv9uk7s(?:\?[^#]*)?$/.test($request.url)){
      log({event:'uts_hit'});
      var root=JSON.parse($response.body), now=Date.now(), state=read(), rows=[],serial=0;
      Object.keys(state).forEach(function(k){if(!state[k]||state[k].expires<now)delete state[k];});
      var batch=now.toString(36)+Math.random().toString(36).slice(2,14);
      function visit(o,path){if(!o||typeof o!=='object')return;Object.keys(o).forEach(function(k,i){var p=path+'.'+i;if(k==='hlsUrl'&&source(o[k])){var id=batch+'-'+serial++;state[id]={url:o[k],expires:now+1800000};o[k]=prefix+id+'.m3u8';rows.push(p);}else visit(o[k],p);});}
      visit(root,'$');
      // Bound storage; no UTS Cookie or account headers are captured.
      var keys=Object.keys(state);keys.slice(0,Math.max(0,keys.length-64)).forEach(function(k){delete state[k];});
      if(rows.length&&$persistentStore.write(JSON.stringify(state),key)!==true){log({event:'storage_failed'});return done({});}
      log({event:'uts_result',matched:rows.length,fields:rows});
      return done(rows.length?{body:JSON.stringify(root)}:{});
    }
    var match=/^https:\/\/hls-amt\.itunes\.apple\.com\/__coco_master_v1\/([a-z0-9-]+)\.m3u8$/.exec($request.url);
    if(!match)return done({});
    log({event:'bridge_hit'});
    var entry=read()[match[1]];
    if(!entry||entry.expires<Date.now()||!source(entry.url))return fail('missing_or_expired_source');
    // Deliberately do not transplant UTS or bridge Cookie/Authorization headers.
    // The signed candidate URL is the only authorization context in this phase.
    var headers={'Accept':'application/vnd.apple.mpegurl','Accept-Encoding':'identity'};
    var timer=setTimeout(function(){fail('timeout');},12000);
    $httpClient.get({url:entry.url,headers:headers,timeout:10000},function(error,response,data){
      if(finished)return;clearTimeout(timer);
      var status=response?Number(response.status):0;
      if(error)return fail('fetch_error',status);
      if(status!==200)return fail('http_status',status);
      var hls=typeof data==='string'&&/^#EXTM3U\r?\n/.test(data);
      var master=hls&&/^#EXT-X-STREAM-INF:[^\r\n]+\r?\n[^#\r\n]+/m.test(data)&&!/^#EXTINF:/m.test(data);
      log({event:'upstream',status:status,hls:hls,master:!!master,characters:typeof data==='string'?data.length:0});
      if(!master)return fail('not_master',status);
      // A changed base URI would break relative links. Reject rather than edit.
      var relative=data.split(/\r?\n/).some(function(l){if(l&&l[0]!=='#'&&!/^https:\/\//.test(l))return true;var re=/(?:^|[, :])(?:[A-Z0-9-]*URI)="([^"]+)"/g,m;while((m=re.exec(l)))if(!/^[a-z][a-z0-9+.-]*:/i.test(m[1]))return true;return false;});
      if(relative)return fail('relative_uri_requires_rewrite',status);
      log({event:'returned',unchanged:true});
      done({response:{status:200,headers:{'Content-Type':'application/vnd.apple.mpegurl','Cache-Control':'no-store'},body:data}});
    });
  }catch(_){if(/^https:\/\/uts-api\./.test($request.url)){log({event:'uts_error'});done({});}else fail('script_error');}
})();

