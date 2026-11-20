const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto'),path=require('path');
const root=path.resolve(__dirname,'..');
const expected=JSON.parse(fs.readFileSync(path.join(root,'movies/iTunes-Movie-2026-Toy-Story-5/segments.sha256.json'),'utf8'));
const code=fs.readFileSync(path.join(root,'movies/iTunes-Movie-2026-Toy-Story-5/toy-story-5_zh.js'),'utf8');
const moduleText=fs.readFileSync(path.join(root,'shadowrocket/subtitles.module'),'utf8');
const baseline=fs.readFileSync(path.join(__dirname,'fixtures/pre-toy.module'),'utf8');
let count=0;function test(name,fn){fn();count++;}
const good='WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n';
function run(url,body=good,status=200){let out,calls=0;vm.runInNewContext(code,{$request:{url},$response:{body,status,headers:{'Content-Length':'1','Content-Encoding':'gzip','ETag':'x','Last-Modified':'x','Content-MD5':'x','Digest':'x','X-Keep':'yes'}},$done:x=>{out=x;calls++}},{timeout:1000});assert.equal(calls,1);return out;}
const url=n=>expected.base+expected.prefix+n+'.webvtt';
const rules=moduleText.split(/\r?\n/).filter(x=>x.includes(' = type='));
const own=rules.find(x=>x.startsWith('iTunes.Movie.ToyStory5.'));const rx=new RegExp(own.split('pattern=')[1].split(',requires-body=')[0]);
for(let n=0;n<94;n++)test('segment '+n,()=>{let out=run(url(n)+'?test=1');assert.equal(crypto.createHash('sha256').update(Buffer.from(out.body,'utf8')).digest('hex'),expected.sha256[n]);assert(rx.test(url(n)));assert(out.body.startsWith('WEBVTT\r\n'));assert(out.body.includes('X-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000'));assert.equal(out.headers['Content-Type'],'text/vtt; charset=utf-8');assert.equal(out.headers['X-Keep'],'yes');assert(!Object.keys(out.headers).some(x=>/^(content-length|content-encoding|etag|digest|last-modified|content-md5)$/i.test(x)));for(let r of rules.filter(x=>x!==own))assert(!new RegExp(r.split('pattern=')[1].split(',requires-body=')[0]).test(url(n)));});
for(const [name,u] of Object.entries({overflow:url(94),negative:url(-1),leadingZero:url('01'),otherResource:url(0).replace('P1482498201','P1'),otherLanguage:url(0).replace('es-419','fr-CA'),otherVersion:url(0).replace('V2','V1'),empty:expected.base+'empty.webvtt',playlist:url(0).replace('.webvtt','.m3u8'),fa:url(0).replace('vod-ap','vod-fa'),ak:url(0).replace('vod-ap','vod-ak'),wrongPath:url(0).replace('HLSVideo211','HLSVideo1'),evil:url(0).replace('vod-ap-amt.tv.apple.com','evil.invalid'),fragment:url(0)+'#bad'}))test(name,()=>{assert.deepEqual(run(u),{});assert(!rx.test(u));});
for(const [name,body,status] of [['html','<html>error</html>',200],['missing map','WEBVTT\n\n',200],['wrong map',good.replace('900000','0'),200],['null',null,200],['status404',good,404],['status206',good,206]])test(name,()=>assert.deepEqual(run(url(0),body,status),{}));
test('corrupt embedded payload',()=>{const bad=code.replace('var segments = [','var segments = [null,');let out;vm.runInNewContext(bad,{$request:{url:url(0)},$response:{body:good,status:200},$done:x=>out=x});assert.deepEqual(out,{});});
// Keep the original film identities protected, while allowing intentional rule updates
// and additional films through their canonical configurations.
const active=fs.readdirSync(path.join(root,'movies'),{withFileTypes:true})
  .filter(d=>d.isDirectory() && fs.existsSync(path.join(root,'movies',d.name,'config.json')))
  .map(d=>[d.name,JSON.parse(fs.readFileSync(path.join(root,'movies',d.name,'config.json'),'utf8'))])
  .filter(([,c])=>c.enabled!==false);
function ruleName(rule){return rule.split(' = ',1)[0];}
function verifyModule(rows,actualRules,actualMitm){
  const expectedNames=rows.map(([,c])=>c.legacy?ruleName(c.rule):c.id);
  assert(actualRules.every(r=>/^\S+ = type=http-response,/.test(r)));
  assert.equal(new Set(expectedNames).size,expectedNames.length,'duplicate configured rule name');
  assert.deepEqual(actualRules.map(ruleName).sort(),expectedNames.sort(),'missing, duplicate or unexpected rule');
  const byName=new Map(actualRules.map(r=>[ruleName(r),r]));
  for(const [folder,cfg] of rows){
    if(cfg.legacy){
      assert.equal(byName.get(ruleName(cfg.rule)),cfg.rule,folder+' legacy rule differs from config');
    }else{
      const rule=byName.get(cfg.id);
      const match=rule.match(/,pattern=(.+),requires-body=1,max-size=2097152,timeout=30,script-path=(\S+)$/);
      assert(match,folder+' generated rule fields');
      assert.equal(match[2],'https://raw.githubusercontent.com/joyharry-cmd/subtitles/main/movies/'+folder+'/subtitle.js');
      const includes=new RegExp(match[1]);
      const names=fs.readFileSync(path.join(root,'movies',folder,cfg.playlist),'utf8').split(/\r?\n/)
        .map(s=>s.trim()).filter(s=>s && !s.startsWith('#') && s!=='empty.webvtt');
      assert(names.length,folder+' has no subtitle segments');
      for(const host of cfg.hosts){
        const base='https://'+host+cfg.path_prefix;
        for(const name of names){
          assert(includes.test(base+name) && includes.test(base+name+'?test=1'),folder+' misses configured segment');
          assert(!includes.test('https://evil.invalid'+cfg.path_prefix+name));
          assert(!includes.test(base+name.replace(cfg.resource,'OTHER')));
        }
        assert(!includes.test(base+'empty.webvtt'));
      }
    }
  }
  const hosts=Array.from(new Set(rows.flatMap(([,c])=>c.hosts))).sort();
  assert(!hosts.includes('play-edge.itunes.apple.com'));
  assert.equal(actualMitm,'hostname = %APPEND% '+hosts.join(', '));
}
const mitm=moduleText.split('[MITM]')[1].trim();
test('protected original films remain enabled and matched to their config',()=>{
  for(const old of baseline.split(/\r?\n/).filter(r=>r.includes(' = type='))){
    assert(rules.some(r=>ruleName(r)===ruleName(old)),'original film missing: '+ruleName(old));
  }
  assert(rules.filter(r=>r.startsWith('iTunes.Movie.ToyStory5.')).length===1);
  assert.equal(moduleText.split('[Script]').length,2);
  assert.equal(moduleText.split('[MITM]').length,2);
  verifyModule(active,rules,mitm);
});
test('dynamic rule validation detects configuration drift and permits new films',()=>{
  const synthetic='Synthetic.Test = type=http-response,engine=webview,pattern=^https://example.invalid/demo$,script-path=https://example.invalid/probe.js';
  const extra=['synthetic',{legacy:true,rule:synthetic,hosts:active[0][1].hosts}];
  verifyModule([...active,extra],[...rules,synthetic],mitm);
  assert.throws(()=>verifyModule([...active,extra],rules,mitm),assert.AssertionError);
  assert.throws(()=>verifyModule(active,[...rules.slice(1),rules[1]],mitm),assert.AssertionError);
  assert.throws(()=>verifyModule(active,[rules[0].replace(/script-path=.*/,'script-path=https://example.invalid/wrong.js'),...rules.slice(1)],mitm),assert.AssertionError);
  assert.throws(()=>verifyModule(active,rules,mitm+', play-edge.itunes.apple.com'),assert.AssertionError);
});
test('no runtime network APIs',()=>assert(!/\$httpClient|\$task|fetch\(|XMLHttpRequest/.test(code)));
console.log(JSON.stringify({tests:count,passed:count,failed:0,segments:94,deviceTest:false}));
