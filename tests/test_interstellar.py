import unittest,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
class Interstellar(unittest.TestCase):
 def test_rules(self):
  a=json.loads((ROOT/'movies/et-itunes/config.json').read_text())
  b=json.loads((ROOT/'movies/interstellar-itunes/config.json').read_text())
  def rx(c):return re.compile(c['rule'].split('pattern=',1)[1].split(',requires-body=',1)[0])
  et='https://vod-ap-amt.tv.apple.com/itunes-assets/HLSVideo221/v4/55/41/9e/55419e70-b301-7666-bdce-f92a910b3ede/P1202756692_A544128124_fr-FR_subtitles_V2-32.webvtt'
  inter='https://vod-ap-amt.tv.apple.com/itunes-assets/HLSVideo1/v4/test/P1220541004_A960891136_fr-FR_subtitles_V2-3.webvtt?test=1'
  self.assertTrue(rx(a).fullmatch(et));self.assertFalse(rx(a).fullmatch(inter))
  self.assertTrue(rx(b).fullmatch(inter));self.assertFalse(rx(b).fullmatch(et))
  self.assertFalse(rx(b).fullmatch(inter.replace('fr-FR','en')))
  self.assertFalse(rx(b).fullmatch(inter.replace('vod-ap-amt.tv.apple.com','evil.invalid')))
  self.assertNotEqual(a['rule'].split(' = ')[0],b['rule'].split(' = ')[0])
  self.assertIn('/9e7aa43bd9e1a4032d4bc780c353f8f4a6ef31bb/',b['rule'])
  self.assertEqual(set(a['hosts']),set(b['hosts']))
  module=(ROOT/'shadowrocket/subtitles.module').read_text(encoding='utf-8')
  self.assertEqual(module.count('[Script]'),1);self.assertEqual(module.count('[MITM]'),1)
  self.assertIn(a['rule'],module);self.assertIn(b['rule'],module)
