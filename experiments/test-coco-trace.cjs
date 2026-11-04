const vm=require('node:vm'),fs=require('node:fs'),a=require('node:assert/strict');const script=fs.readFileSync(__dirname+'/coco-playback-trace-v1-fixed.js','utf8');let n=0;
function run(url,body){let done=[],logs=[];vm.runInNewContext(script,{$request:{url},$response:{status:200,headers:{'Content-Encoding':'gzip'},body},console:{log:s=>logs.push(s)},$done:o=>done.push(o)});a.equal(done.length,1);a(!logs.join('').includes('SECRET'));n++;return {done,logs};}
const base='https://uts-api.itunes.apple.com/uts/v3/movies/umc.cmc.5y1554je00oslx5xtkxv9uk7s';
let r=run(base,JSON.stringify({hlsUrl:'https://play-edge.itunes.apple.com/WebObjects/MZPlayLocal.woa/hls/playlist.m3u8?a=1307301491&id=1362880914&token=SECRET'}));a.equal(Object.keys(r.done[0]).length,0);a.equal(JSON.parse(r.logs[0].split('] ')[1]).counts.coco,1);
run(base,'not json SECRET');run('https://uts-api.itunes.apple.com/uts/v2/privateAccount/SECRET','{}');r=run('https://hls-amt.itunes.apple.com/__coco_trace_v1/health','');a.equal(r.done[0].response.status,200);r=run('https://example.invalid/SECRET','');a.equal(r.logs.length,0);console.log(n+' read-only/health checks passed; no device evidence');

