from pathlib import Path
p=Path('apps/client/android/app/build.gradle')
s=p.read_text().replace('versionCode 1','versionCode 101').replace('versionName "1.0"','versionName "0.2.0"')
p.write_text(s)
r=Path('apps/client/android/app/src/main/res')
(r/'drawable/ic_launcher_foreground.xml').write_text('''<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#E7BF74" android:pathData="M54,16 A38,38 0,1 0,54 92 A38,38 0,1 0,54 16"/><path android:fillColor="#17353E" android:pathData="M54,22 A32,32 0,1 0,54 86 A32,32 0,1 0,54 22"/><path android:fillColor="#F9E8C8" android:pathData="M35,34 L73,34 L73,74 L35,74 Z"/><path android:fillColor="#17353E" android:pathData="M43,42 A4,4 0,1 0,43 50 A4,4 0,1 0,43 42 M65,58 A4,4 0,1 0,65 66 A4,4 0,1 0,65 58 M54,50 A4,4 0,1 0,54 58 A4,4 0,1 0,54 50"/></vector>''')
(r/'values/ic_launcher_background.xml').write_text('<resources><color name="ic_launcher_background">#101D2E</color></resources>')
# Route adaptive icons to the custom vector, including legacy Android fallback.
for f in (r/'mipmap-anydpi-v26').glob('*.xml'):
    f.write_text(f.read_text().replace('@mipmap/ic_launcher_foreground','@drawable/ic_launcher_foreground'))
legacy=r/'mipmap-anydpi';legacy.mkdir(exist_ok=True)
for name in ('ic_launcher','ic_launcher_round'):
    (legacy/(name+'.xml')).write_text((r/'drawable/ic_launcher_foreground.xml').read_text())
for f in r.glob('drawable*/splash.png'):
    f.unlink()
(r/'drawable/splash.xml').write_text('<layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="@color/ic_launcher_background"/><item android:width="108dp" android:height="108dp" android:gravity="center" android:drawable="@drawable/ic_launcher_foreground"/></layer-list>')
f=r/'values/styles.xml'
f.write_text(f.read_text().replace('<item name="android:background">@drawable/splash</item>','<item name="android:background">@drawable/splash</item><item name="windowSplashScreenBackground">@color/ic_launcher_background</item><item name="windowSplashScreenAnimatedIcon">@drawable/ic_launcher_foreground</item>'))
