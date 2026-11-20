import subprocess,unittest
from pathlib import Path
class CDNRuntime(unittest.TestCase):
 def test_all_movie_cdn_hosts(self):
  subprocess.run(['node',str(Path(__file__).with_name('verify_cdn.cjs'))],check=True)
