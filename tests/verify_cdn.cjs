const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');let passed=0;
function run(code,url){let out,calls=0;vm.runInNewContext(code,{$request:{url},$response:{body:'WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n\n',status:200,headers:{}},$done:x=>{out=x;calls++;}},{timeout:1000});assert.equal(calls,1);return out;}
for(const row of JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/cdn-segments.json'),'utf8'))){
 const code=fs.readFileSync(path.join(root,row.script),'utf8');const c=JSON.parse(fs.readFileSync(path.join(root,path.dirname(row.script),'config.json'),'utf8'));const rx=new RegExp(c.rule.split('pattern=')[1].split(',requires-body=')[0]);
 assert.deepEqual(new Set(c.hosts),new Set(['vod-ap-amt.tv.apple.com','vod-fa-amt.tv.apple.com','vod-ak-amt.tv.apple.com']));
 for(let i=0;i<row.urls.length;i++)for(const h of ['ap','fa','ak']){
  const u=row.urls[i].replace('vod-ap-','vod-'+h+'-')+'?test=1';assert(rx.test(u),u);const o=run(code,u);assert.equal(crypto.createHash('sha256').update(o.body).digest('hex'),row.hashes[i],u);passed++;
 }
 for(const u of [row.urls[0].replace('vod-ap','vod-xx'),row.urls[0].replace('tv.apple.com','evil.invalid'),row.urls[0].replace(/P\d+_A/,'P1_A'),row.urls[0].replace(/[^/]+$/,'empty.webvtt'),row.urls[0].replace(/[^/]+$/,'playlist.m3u8')]){assert(!rx.test(u));assert.deepEqual(run(code,u),{});passed++;}
}
console.log('PASS: '+passed+' CDN cases across 7 movies; outputs equal pre-change AP SHA-256');
