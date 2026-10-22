from pathlib import Path
p=Path('apps/client/android/app/build.gradle')
s=p.read_text().replace('versionCode 1','versionCode 101').replace('versionName "1.0"','versionName "0.2.0"')
p.write_text(s)
r=Path('apps/client/android/app/src/main/res')
(r/'drawable/ic_launcher_foreground.xml').write_text('''<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#E7BF74" android:pathData="M54,16 A38,38 0,1 0,54 92 A38,38 0,1 0,54 16"/><path android:fillColor="#17353E" android:pathData="M54,22 A32,32 0,1 0,54 86 A32,32 0,1 0,54 22"/><path android:fillColor="#F9E8C8" android:pathData="M35,34 L73,34 L73,74 L35,74 Z"/><path android:fillColor="#17353E" android:pathData="M43,42 A4,4 0,1 0,43 50 A4,4 0,1 0,43 42 M65,58 A4,4 0,1 0,65 66 A4,4 0,1 0,65 58 M54,50 A4,4 0,1 0,54 58 A4,4 0,1 0,54 50"/></vector>''')
(r/'values/ic_launcher_background.xml').write_text('<resources><color name="ic_launcher_background">#101D2E</color></resources>')
