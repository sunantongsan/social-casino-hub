"""Publish web-only updates. Bump nativeVersion when native plugins/config change."""
import base64,hashlib,json,os,subprocess
from pathlib import Path
repo=os.environ['GITHUB_REPOSITORY'];sha=os.environ['GITHUB_SHA'];tag='web-'+sha
assert repo=='sunantongsan/social-casino-hub'
def gh(*args,**kw):return subprocess.run(['gh',*args],check=True,text=True,capture_output=True,**kw).stdout
try:gh('release','view',tag)
except subprocess.CalledProcessError:gh('release','create',tag,'web.zip','--target',sha,'--title','Internal web patch '+sha[:7],'--notes','Web assets for internal testing; native compatibility 102.','--prerelease')
else:gh('release','upload',tag,'web.zip','--clobber')
manifest={'id':tag,'sequence':int(os.environ['GITHUB_RUN_NUMBER']),'nativeVersion':102,'sha256':hashlib.sha256(Path('web.zip').read_bytes()).hexdigest(),'url':f'https://github.com/{repo}/releases/download/{tag}/web.zip'}
try:gh('api',f'repos/{repo}/git/ref/heads/patches')
except subprocess.CalledProcessError:gh('api',f'repos/{repo}/git/refs','-f','ref=refs/heads/patches','-f','sha='+sha)
body={'branch':'patches','message':'Publish '+tag,'content':base64.b64encode(json.dumps(manifest).encode()).decode()}
try:body['sha']=json.loads(gh('api',f'repos/{repo}/contents/latest.json?ref=patches'))['sha']
except subprocess.CalledProcessError:pass
gh('api',f'repos/{repo}/contents/latest.json','--method','PUT','--input','-',input=json.dumps(body))
print('Published',tag)
