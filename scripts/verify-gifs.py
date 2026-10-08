"""Independent Pillow decoding of exported GIFs; requires Pillow."""
import json,sys
from pathlib import Path
from PIL import Image
results=[]
for path in map(Path,sys.argv[1:]):
 with Image.open(path) as gif:
  gif.seek(0)
  pixels=[];duration=0
  for i in range(gif.n_frames):
   gif.seek(i);pixels.append(gif.convert('RGB').tobytes());duration+=gif.info.get('duration',0)
  assert gif.size in [(240,240),(320,320),(480,480)],(path,gif.size)
  assert gif.n_frames>1 and len(set(pixels))>1,path
  assert gif.info.get('loop')==0,path
  assert 800<=duration<=3200,(path,duration)
  results.append(dict(file=path.name,size=gif.size,frames=gif.n_frames,unique=len(set(pixels)),duration_ms=duration,bytes=path.stat().st_size))
print(json.dumps(results,ensure_ascii=False,indent=2))
