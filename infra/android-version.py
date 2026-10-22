import os,re
from pathlib import Path
p=Path('apps/client/android/app/build.gradle')
s=p.read_text()
# One workflow owns release version codes; never reset after publishing.
v=int(os.environ.get('GITHUB_RUN_NUMBER','1'))+100
s,n=re.subn(r'versionCode\s+\d+',f'versionCode {v}',s)
assert n==1,'Expected exactly one versionCode'
p.write_text(s)
