// Live game patches: the Android app downloads newer web bundles published by the
// "Publish game patch" workflow to GitHub Releases, so UI fixes ship without a Play update.
// Native code (plugins, permissions, icons) still needs a store release; manifests carry
// minNative so a patch never lands on an app shell that is too old for it.
import {Capacitor,CapacitorHttp} from '@capacitor/core';
import {CapacitorUpdater} from '@capgo/capacitor-updater';
const manifestUrl=import.meta.env.VITE_UPDATE_MANIFEST;
export const bundleVersion=Number(import.meta.env.VITE_BUNDLE_VERSION||0);
const older=(a,b)=>{const x=String(a).split('.').map(Number),y=String(b).split('.').map(Number);for(let i=0;i<3;i++)if((x[i]||0)!==(y[i]||0))return (x[i]||0)<(y[i]||0);return false;};
export async function checkForPatch(onReady){
 if(!Capacitor.isNativePlatform())return;
 // Confirms this bundle started; a broken patch that never reaches here is rolled back by the plugin.
 await CapacitorUpdater.notifyAppReady();
 if(!manifestUrl)return;
 const r=await CapacitorHttp.get({url:manifestUrl,params:{t:String(Date.now())}});
 const m=typeof r.data==='string'?JSON.parse(r.data):r.data;
 if(r.status!==200||!(Number(m?.version)>bundleVersion)||!/^https:\/\//.test(m.url)||!/^[0-9a-f]{64}$/.test(m.checksum))return;
 const {native}=await CapacitorUpdater.current();
 if(m.minNative&&older(native,m.minNative))return;
 const bundle=await CapacitorUpdater.download({url:m.url,version:String(m.version),checksum:m.checksum});
 // Applied on next launch automatically, or right away when the player taps the banner.
 await CapacitorUpdater.next({id:bundle.id});
 onReady(()=>CapacitorUpdater.set({id:bundle.id}));
}
