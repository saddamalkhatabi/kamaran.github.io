from pathlib import Path

p = Path('pen/index.html')
s = p.read_text(encoding='utf-8')
original = s

s = s.replace("if(voices.length>0&&!v&&selectedVoiceKey==='auto'){lastSpeechState='لا يوجد صوت عربي في محرك الجهاز';badgeAudio.innerHTML='الصوت: العربية غير مثبتة';refreshAudioDiag();if(allowFallback!==false)fallbackVoice();return false}", "")
s = s.replace("u.lang=(v&&v.lang)||'ar-SA';if(v)u.voice=v;", "u.lang=(v&&isArabicVoice(v)&&v.lang)||'ar';if(v&&isArabicVoice(v))u.voice=v;")
s = s.replace("setTimeout(function(){try{speechSynthesis.speak(u)}catch(e){u.onerror&&u.onerror({error:'speak failed'})}},50);", "try{speechSynthesis.speak(u)}catch(e){u.onerror&&u.onerror({error:'speak failed'})};")
s = s.replace("if(!started&&!finished){try{speechSynthesis.cancel()}catch(e){}lastSpeechState='انتهت مهلة بدء النطق';", "if(!started&&!finished){var busy=false;try{busy=!!(speechSynthesis.speaking||speechSynthesis.pending)}catch(e){}if(busy){lastSpeechState='محرك TTS يعمل أو ينتظر';badgeAudio.innerHTML='الصوت: المحرك يعمل';refreshAudioDiag();return}try{speechSynthesis.cancel()}catch(e){}lastSpeechState='انتهت مهلة بدء النطق';")
s = s.replace("محرك النطق موجود لكن لا يظهر صوت عربي. من إعدادات Android افتح اللغة والإدخال ← تحويل النص إلى كلام، اختر محرك Google أو المحرك المتاح ونزّل بيانات العربية، ثم أغلق المتصفح وافتحه من جديد واضغط «تحديث قائمة الأصوات». ", "قد لا يعرض Chrome أصوات العربية في القائمة رغم أن Google TTS يعمل. التطبيق سيطلب العربية مباشرة من محرك النظام؛ جرّب الاختبار قبل تغيير إعدادات الهاتف. ")
s = s.replace('<title>لوحة الطفل - امسك القلم وارسم</title>', '<title>لوحة الطفل - امسك القلم وارسم v6</title>')

if s == original:
    raise SystemExit('No changes applied: expected v5 patterns were not found')

p.write_text(s, encoding='utf-8')

sw = Path('pen/sw.js')
if sw.exists():
    t = sw.read_text(encoding='utf-8').replace('noor-draw-v5', 'noor-draw-v6')
    sw.write_text(t, encoding='utf-8')

print('Patched Android Arabic TTS and cache to v6')
