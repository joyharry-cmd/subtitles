"""Offline subtitle compiler; Python 3.11+, no network or third-party packages."""
import argparse,json,re,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def stamp(s):
 p=s.replace(',', '.').split(':');return round(sum(float(v)*60**i for i,v in enumerate(reversed(p)))*1000)
def cues(text):
 result=[]
 for block in text.replace('\r','').strip().split('\n\n'):
  lines=block.splitlines()
  for i,line in enumerate(lines):
   if '-->' in line:
    a,b=line.split('-->');start,end=stamp(a.strip()),stamp(b.strip().split()[0])
    if not 0<=start<end:raise ValueError('Invalid cue duration')
    result.append((start,end,'\n'.join(lines[i:]).replace(',', '.').split('\n')[0]+'\n'+'\n'.join(lines[i+1:])))
    break
 if not result or result!=sorted(result,key=lambda x:x[0]):raise ValueError('Empty/unsorted subtitles')
 return result
def playlist(text,resource,language):
 out=[];duration=None;cursor=0
 if '#EXTM3U' not in text:raise ValueError('Not an HLS playlist')
 for line in text.splitlines():
  line=line.strip()
  if line.startswith('#EXT-X-DISCONTINUITY'):raise ValueError('Discontinuity requires a separate mapping; remove only trailing empty discontinuity during sanitization')
  if line.startswith('#EXTINF:'):duration=round(float(line.split(':')[1].split(',')[0])*1000)
  elif line and not line.startswith('#'):
   if duration is None or duration<=0:raise ValueError('Missing/invalid EXTINF')
   if '/' in line or '?' in line or '#' in line:raise ValueError('Use sanitized relative filenames without credentials')
   if line=='empty.webvtt':duration=None;continue
   if not re.fullmatch(re.escape(resource+'_'+language+'_subtitles_V2-')+r'\d+\.webvtt',line):raise ValueError('Unexpected resource/language')
   if any(x[0]==line for x in out):raise ValueError('Duplicate segment')
   out.append((line,cursor,cursor+duration));cursor+=duration;duration=None
 if not out:raise ValueError('No segments')
 return out
def mapping(text):
 m=re.search(r'^X-TIMESTAMP-MAP=(.+)$',text,re.M)
 if not m:raise ValueError('Missing timestamp map in sample')
 parts=dict(p.split(':',1) for p in m[1].strip().split(','))
 if set(parts)!={'LOCAL','MPEGTS'} or not 0<=int(parts['MPEGTS'])<2**33:raise ValueError('Invalid timestamp map')
 stamp(parts['LOCAL']);return m[0].strip()
def compile_movie(folder,publish=False):
 c=json.loads((folder/'config.json').read_text(encoding='utf-8-sig'))
 if publish and not (c.get('publish_authorized') and c.get('rights_evidence')):raise ValueError('Publication permission/evidence required')
 if c.get('legacy'):return c
 data=cues((folder/c['subtitle']).read_text(encoding='utf-8-sig'))
 seg=playlist((folder/c['playlist']).read_text(),c['resource'],c['language'])
 maps={mapping((folder/s).read_text()) for s in c['samples']}
 if len(maps)!=1:raise ValueError('Different timestamp maps require explicit per-segment mapping')
 tm=maps.pop();offset=c.get('offset_ms',0);local=c.get('playlist_origin_local_ms')
 if not isinstance(local,int):raise ValueError('Explicit playlist origin in WebVTT LOCAL milliseconds required')
 parts={name:'\n\n'.join(body for a,b,body in data if a<end+local-offset and b>start+local-offset) for name,start,end in seg}
 if offset:raise ValueError('Nonzero offset requires retimed cues; unsupported, fail safely')
 if any(not any(a<end+local and b>start+local for _,start,end in seg) for a,b,_ in data):raise ValueError('Cue outside playlist coverage')
 hosts=c['hosts'];path=c['path_prefix']
 if not hosts or any(not re.fullmatch(r'[a-z0-9.-]+',h) for h in hosts) or not path.startswith('/') or '?' in path:raise ValueError('Unsafe host/path')
 pattern='^https://(?:'+'|'.join(re.escape(h) for h in hosts)+')'+re.escape(path)+'('+'|'.join(re.escape(n) for n in parts)+r')(?:\?[^#]*)?$'
 rx=re.compile(pattern)
 for n in parts:
  assert rx.fullmatch('https://'+hosts[0]+path+n)
  assert not rx.fullmatch('https://evil.invalid'+path+n)
  assert not rx.fullmatch('https://'+hosts[0]+path+n.replace(c['resource'],'OTHER'))
 js='(function(){var m=new RegExp('+json.dumps(pattern)+').exec($request.url||"");if(!m){$done({});return;}var b=$response.body||"";if(!/^WEBVTT/.test(b)||b.indexOf('+json.dumps(tm)+')<0){$done({});return;}var h={};Object.keys($response.headers||{}).forEach(function(k){if(!/^(content-length|content-encoding|etag|last-modified|content-type)$/i.test(k))h[k]=$response.headers[k];});h["Content-Type"]="text/vtt; charset=utf-8";$done({headers:h,body:"WEBVTT\\n"+'+json.dumps(tm+'\n\n')+'+('+json.dumps(parts,ensure_ascii=False)+')[m[1]]+"\\n"});})();\n'
 (folder/'subtitle.js').write_text(js,encoding='utf-8')
 c['pattern']=pattern.replace('/','\\/');return c
def build(publish=False):
 rules=[];hosts=set()
 for folder in sorted((ROOT/'movies').iterdir()):
  if not (folder/'config.json').exists():continue
  c=compile_movie(folder,publish)
  if not c.get('enabled',True):continue
  rules.append(c['rule'] if c.get('legacy') else c['id']+' = type=http-response,engine=webview,pattern='+c['pattern']+',requires-body=1,max-size=2097152,timeout=30,script-path=https://raw.githubusercontent.com/joyharry-cmd/subtitles/main/movies/'+folder.name+'/subtitle.js')
  hosts.update(c['hosts'])
 out=ROOT/'shadowrocket';out.mkdir(exist_ok=True)
 (out/'subtitles.module').write_text('#!name=个人影视中文字幕\n#!desc=更新此模块以获取新增电影；未经真机测试\n\n[Script]\n'+'\n'.join(rules)+'\n\n[MITM]\nhostname = %APPEND% '+', '.join(sorted(hosts))+'\n',encoding='utf-8')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--publish',action='store_true');a=p.parse_args();build(a.publish)
