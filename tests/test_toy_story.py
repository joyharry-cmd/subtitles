import subprocess,unittest
from pathlib import Path
class ToyStoryRuntime(unittest.TestCase):
 def test_all_runtime_checks(self):
  subprocess.run(["node",str(Path(__file__).with_name("toy_story_runtime.cjs"))],check=True)
