import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from build import cues,playlist,mapping,compile_movie
import tempfile,json
class Tests(unittest.TestCase):
 def test_srt(self):self.assertEqual(cues('1\n00:00:01,000 --> 00:00:03,000\nHello')[0][:2],(1000,3000))
 def test_vtt(self):self.assertEqual(len(cues('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello')),1)
 def test_duration(self):self.assertEqual(playlist('#EXTM3U\n#EXTINF:2,\nP1_A2_fr_subtitles_V2-0.webvtt','P1_A2','fr')[0][2],2000)
 def test_wrong_resource(self):
  with self.assertRaises(ValueError):playlist('#EXTM3U\n#EXTINF:2,\nP2_A2_fr_subtitles_V2-0.webvtt','P1_A2','fr')
 def test_map(self):self.assertIn('900000',mapping('WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:900000'))
 def test_invalid(self):
  with self.assertRaises(ValueError):cues('00:00:03.000 --> 00:00:01.000\nHello')
 def test_compiler_boundary(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d);c={'id':'test','resource':'P1_A2','language':'fr','hosts':['vod-ap-amt.tv.apple.com'],'path_prefix':'/itunes-assets/test/','subtitle':'in.srt','playlist':'in.m3u8','samples':['sample.webvtt'],'playlist_origin_local_ms':0}
   (p/'config.json').write_text(json.dumps(c));(p/'in.srt').write_text('1\n00:00:01,000 --> 00:00:03,000\nSYNTHETIC')
   (p/'sample.webvtt').write_text('WEBVTT\nX-TIMESTAMP-MAP=MPEGTS:900000,LOCAL:00:00:00.000\n')
   (p/'in.m3u8').write_text('#EXTM3U\n#EXTINF:2,\nP1_A2_fr_subtitles_V2-0.webvtt\n#EXTINF:2,\nP1_A2_fr_subtitles_V2-1.webvtt\n#EXT-X-DISCONTINUITY\n#EXTINF:1,\nempty.webvtt\n#EXT-X-ENDLIST')
   compile_movie(p);self.assertEqual((p/'subtitle.js').read_text().count('SYNTHETIC'),2)
   with self.assertRaises(ValueError):compile_movie(p,True)
if __name__=='__main__':unittest.main()
