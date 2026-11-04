/* Read-only UTS trace. No URL rewrite, storage, fetch or response-body mutation. */
(function(){
 var version='coco-trace-20261104-r1';
 function log(o){o.version=version;console.log('[Coco.Trace] '+JSON.stringify(o));}
 try{
  if($request.url==='https://hls-amt.itunes.apple.com/__coco_trace_v1/health'){
   log({event:'health_hit'});return $done({response:{status:200,headers:{'Content-Type':'text/plain','Cache-Control':'no-store'},body:version}});
  }
  var m=/^https:\/\/uts-api\.itunes\.apple\.com\/uts\/(v[123])\/([^/?#]+)\//.exec($request.url);
  if(!m)return $done({});
  var allowed=['movies','playables','playback','shelves','canvases','videos','configurations'];
  var route=allowed.indexOf(m[2])>=0?m[2]:'other';
  var target=/\/movies\/umc\.cmc\.5y1554je00oslx5xtkxv9uk7s(?:\?|$)/.test($request.url);
  var h=$response.headers||{}, encoding='absent',ct='other';
  Object.keys(h).forEach(function(k){if(k.toLowerCase()==='content-encoding')encoding=/^(gzip|br|deflate|identity)$/i.test(h[k])?String(h[k]).toLowerCase():'other';if(k.toLowerCase()==='content-type'&&/json/i.test(h[k]))ct='json';});
  var counts={hls:0,coco:0,bridge:0}, paths=[],nodes=0;
  var parsed=false;
  try{var root=JSON.parse($response.body);parsed=true;
   function walk(o,p,depth){if(!o||typeof o!=='object'||depth>40||++nodes>20000)return;Object.keys(o).forEach(function(k,i){var v=o[k],next=p+'.'+i;if(k==='hlsUrl'&&typeof v==='string'){counts.hls++;if(/^https:\/\/hls-amt\.itunes\.apple\.com\/__coco_master_v1\//.test(v))counts.bridge++;if(/^https:\/\/play-edge\.itunes\.apple\.com\/WebObjects\/MZPlayLocal\.woa\/hls\/playlist\.m3u8\?/.test(v)){var a=/(?:\?|&)a=1307301491(?:&|$)/.test(v),id=/(?:\?|&)id=1362880914(?:&|$)/.test(v);if(a&&id){counts.coco++;paths.push(next);}}}else walk(v,next,depth+1);});}walk(root,'$',0);
  }catch(_){}
  log({event:'response',api:m[1],route:route,target:target,status:Number($response.status)||0,contentType:ct,encoding:encoding,json:parsed,counts:counts,fields:paths.slice(0,30)});
 }catch(_){log({event:'error'});}
 finally{if($request.url!=='https://hls-amt.itunes.apple.com/__coco_trace_v1/health')$done({});}
})();

