const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto'),path=require('path');
const root=path.resolve(__dirname,'..');
const expected=JSON.parse(fs.readFileSync(path.join(root,'movies/toy-story-5-itunes/segments.sha256.json'),'utf8'));
const code=fs.readFileSync(path.join(root,'movies/toy-story-5-itunes/toy-story-5-zh.js'),'utf8');
const moduleText=fs.readFileSync(path.join(root,'shadowrocket/subtitles.module'),'utf8');
const baseline=fs.readFileSync(path.join(__dirname,'fixtures/pre-toy.module'),'utf8');
let count=0;function test(name,fn){fn();count++;}
const good='WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n';
function run(url,body=good,status=200){let out,calls=0;vm.runInNewContext(code,{$request:{url},$response:{body,status,headers:{'Content-Length':'1','Content-Encoding':'gzip','ETag':'x','Last-Modified':'x','Content-MD5':'x','Digest':'x','X-Keep':'yes'}},$done:x=>{out=x;calls++}},{timeout:1000});assert.equal(calls,1);return out;}
const url=n=>expected.base+expected.prefix+n+'.webvtt';
const rules=moduleText.split(/\r?\n/).filter(x=>x.includes(' = type='));
const own=rules.find(x=>x.startsWith('ToyStory5.'));const rx=new RegExp(own.split('pattern=')[1].split(',requires-body=')[0]);
for(let n=0;n<94;n++)test('segment '+n,()=>{let out=run(url(n)+'?test=1');assert.equal(crypto.createHash('sha256').update(Buffer.from(out.body,'utf8')).digest('hex'),expected.sha256[n]);assert(rx.test(url(n)));assert(out.body.startsWith('WEBVTT\r\n'));assert(out.body.includes('X-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000'));assert.equal(out.headers['Content-Type'],'text/vtt; charset=utf-8');assert.equal(out.headers['X-Keep'],'yes');assert(!Object.keys(out.headers).some(x=>/^(content-length|content-encoding|etag|digest|last-modified|content-md5)$/i.test(x)));for(let r of rules.filter(x=>x!==own))assert(!new RegExp(r.split('pattern=')[1].split(',requires-body=')[0]).test(url(n)));});
for(const [name,u] of Object.entries({overflow:url(94),negative:url(-1),leadingZero:url('01'),otherResource:url(0).replace('P1482498201','P1'),otherLanguage:url(0).replace('es-419','fr-CA'),otherVersion:url(0).replace('V2','V1'),empty:expected.base+'empty.webvtt',playlist:url(0).replace('.webvtt','.m3u8'),fa:url(0).replace('vod-ap','vod-fa'),ak:url(0).replace('vod-ap','vod-ak'),wrongPath:url(0).replace('HLSVideo211','HLSVideo1'),evil:url(0).replace('vod-ap-amt.tv.apple.com','evil.invalid'),fragment:url(0)+'#bad'}))test(name,()=>{assert.deepEqual(run(u),{});assert(!rx.test(u));});
for(const [name,body,status] of [['html','<html>error</html>',200],['missing map','WEBVTT\n\n',200],['wrong map',good.replace('900000','0'),200],['null',null,200],['status404',good,404],['status206',good,206]])test(name,()=>assert.deepEqual(run(url(0),body,status),{}));
test('corrupt embedded payload',()=>{const bad=code.replace('var segments = [','var segments = [null,');let out;vm.runInNewContext(bad,{$request:{url:url(0)},$response:{body:good,status:200},$done:x=>out=x});assert.deepEqual(out,{});});
test('preserved five original rules',()=>{assert.equal(rules.length,6);for(let r of baseline.split(/\r?\n/).filter(x=>x.includes(' = type=')))assert(rules.includes(r));assert.equal(new Set(rules.map(r=>r.split(' = ')[0])).size,6);});
test('unchanged MITM',()=>assert.equal(moduleText.split('[MITM]')[1],baseline.split('[MITM]')[1]));
test('no runtime network APIs',()=>assert(!/\$httpClient|\$task|fetch\(|XMLHttpRequest/.test(code)));
console.log(JSON.stringify({tests:count,passed:count,failed:0,segments:94,deviceTest:false}));
