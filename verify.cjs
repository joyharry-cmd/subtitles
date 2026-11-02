const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync(require('path').join(__dirname,'et_itunes_zh.js'),'utf8');
const base='https://vod-ap-amt.tv.apple.com/itunes-assets/HLSVideo221/v4/55/41/9e/55419e70-b301-7666-bdce-f92a910b3ede/';
function run(file,body='WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n',root=base){let out,n=0;vm.runInNewContext(code,{$request:{url:root+file},$response:{body,headers:{'Content-Length':'3','Content-Encoding':'gzip'}},$done:x=>{out=x;n++}});assert.equal(n,1);return out;}
for(let i=0;i<96;i++){let o=run(`P1202756692_A544128124_fr-FR_subtitles_V2-${i}.webvtt?token=TEST`);assert(o.body.startsWith('WEBVTT\nX-TIMESTAMP-MAP='));assert(!o.headers['Content-Length']);}
for(const f of ['empty.webvtt','P1202756692_A544128124_fr-FR_subtitles_V2-96.webvtt','P1202756692_A544128124_en_subtitles_V2-0.webvtt'])assert.deepEqual(run(f),{});
assert.deepEqual(run('P1202756692_A544128124_fr-FR_subtitles_V2-0.webvtt','bad'),{});
assert.deepEqual(run('P1202756692_A544128124_fr-FR_subtitles_V2-0.webvtt',undefined,base.replace('vod-ap','evil')),{});
assert(run('P1202756692_A544128124_fr-FR_subtitles_V2-1.webvtt').body.includes('00:08:59.875 --> 00:09:02.835'));
assert(run('P1202756692_A544128124_fr-FR_subtitles_V2-2.webvtt').body.includes('00:08:59.875 --> 00:09:02.835'));
console.log('PASS: 96 segments, scope guards, fail-open, headers, boundary cue.');
