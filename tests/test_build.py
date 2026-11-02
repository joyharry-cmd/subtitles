import sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from build import cues,playlist,mapping
class Tests(unittest.TestCase):
 def test_srt(self):self.assertEqual(cues('1\n00:00:01,000 --> 00:00:03,000\nHello')[0][:2],(1000,3000))
 def test_vtt(self):self.assertEqual(len(cues('WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello')),1)
 def test_duration(self):self.assertEqual(playlist('#EXTM3U\n#EXTINF:2,\nP1_A2_fr_subtitles_V2-0.webvtt','P1_A2','fr')[0][2],2000)
 def test_wrong_resource(self):
  with self.assertRaises(ValueError):playlist('#EXTM3U\n#EXTINF:2,\nP2_A2_fr_subtitles_V2-0.webvtt','P1_A2','fr')
 def test_map(self):self.assertIn('900000',mapping('WEBVTT\nX-TIMESTAMP-MAP=LOCAL:00:00:00.000,MPEGTS:900000'))
 def test_invalid(self):
  with self.assertRaises(ValueError):cues('00:00:03.000 --> 00:00:01.000\nHello')
if __name__=='__main__':unittest.main()
