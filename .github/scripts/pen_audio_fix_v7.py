from pathlib import Path

p = Path('pen/index.html')
s = p.read_text(encoding='utf-8')
original = s

s = s.replace('لوحة الطفل - امسك القلم وارسم v6', 'لوحة الطفل - امسك القلم وارسم v7')

old_button = '<button id="testSystemTtsBtn" class="good">اختبار صوت النظام المباشر</button>'
if old_button in s and 'testSamsungTtsBtn' not in s:
    s = s.replace(old_button, old_button + '<button id="testSamsungTtsBtn" class="good">اختبار توافق سامسونج</button>')

# Replace the whole TTS core by stable function markers instead of fragile inner regexes.
a = s.index('function systemSpeak(') if 'function systemSpeak(' in s else s.index('function speakSmart(')
b = s.index('function genderCheer()', a)
new_audio = """function resetTtsQueue(){try{if(!window.speechSynthesis)return;speechSynthesis.cancel();if(speechSynthesis.paused&&speechSynthesis.resume)speechSynthesis.resume()}catch(e){}}
function runUtterance(text,lang,voice,allowFallback,label,onDone){if(!voiceEnabled)return false;if(!(window.speechSynthesis&&window.SpeechSynthesisUtterance)){lastSpeechState='هذا المتصفح لا يدعم SpeechSynthesis';badgeAudio.innerHTML='الصوت: يحتاج بديل';refreshAudioDiag();if(allowFallback!==false)fallbackVoice();return false}var u,started=false,ended=false,timer=null;try{u=new SpeechSynthesisUtterance(text);u.lang=lang||'ar-SA';if(voice)u.voice=voice;u.rate=speechRate;u.pitch=1;u.volume=1;u.onstart=function(){started=true;lastSpeechState='بدأ النطق: '+label;badgeAudio.innerHTML='الصوت: يعمل';refreshAudioDiag()};u.onend=function(){ended=true;if(timer)clearTimeout(timer);lastSpeechState='اكتمل النطق: '+label;badgeAudio.innerHTML='الصوت: يعمل';refreshAudioDiag();if(onDone)onDone(true)};u.onerror=function(ev){ended=true;if(timer)clearTimeout(timer);lastSpeechState='خطأ '+label+': '+((ev&&ev.error)||'غير معروف');badgeAudio.innerHTML='الصوت: إعادة محاولة';refreshAudioDiag();if(onDone)onDone(false)};lastSpeechState='إرسال إلى '+label+' / '+u.lang;badgeAudio.innerHTML='الصوت: جارٍ النطق';refreshAudioDiag();speechSynthesis.speak(u);timer=setTimeout(function(){if(started||ended)return;var busy=false;try{busy=!!(speechSynthesis.speaking||speechSynthesis.pending)}catch(e){}if(busy){lastSpeechState=label+' في الانتظار، سنعطيه وقتاً إضافياً';badgeAudio.innerHTML='الصوت: المحرك ينتظر';refreshAudioDiag();timer=setTimeout(function(){if(!started&&!ended){resetTtsQueue();if(onDone)onDone(false)}},2600)}else{if(onDone)onDone(false)}},1800);return true}catch(e){lastSpeechState='استثناء '+label+': '+e.message;refreshAudioDiag();if(onDone)onDone(false);return false}}
function compatSpeak(text,allowFallback){var attempts=[],v=resolveVoice(),done=false,idx=0;if(v&&isArabicVoice(v))attempts.push({lang:v.lang||'ar-SA',voice:v,label:'الصوت العربي المختار'});attempts.push({lang:'ar-SA',voice:null,label:'النظام ar-SA'});attempts.push({lang:'ar',voice:null,label:'النظام ar'});attempts.push({lang:'ar-EG',voice:null,label:'النظام ar-EG'});function next(ok){if(done)return;if(ok){done=true;return}resetTtsQueue();if(idx>=attempts.length){done=true;lastSpeechState='تعذر بدء TTS بعد عدة محاولات';badgeAudio.innerHTML='الصوت: استخدم البديل';refreshAudioDiag();if(allowFallback!==false)fallbackVoice();return}var a=attempts[idx++];setTimeout(function(){runUtterance(text,a.lang,a.voice,false,a.label,next)},idx===1?60:180)}resetTtsQueue();next(false);return true}
function systemSpeak(text,lang,allowFallback){resetTtsQueue();setTimeout(function(){runUtterance(text,lang||'ar-SA',null,false,'صوت النظام المباشر',function(ok){if(!ok){if((lang||'ar-SA')!=='ar')runUtterance(text,'ar',null,false,'صوت النظام ar',function(ok2){if(!ok2&&allowFallback!==false)compatSpeak(text,allowFallback)});else if(allowFallback!==false)compatSpeak(text,allowFallback)}})},80);return true}
function speakSmart(text,allowFallback){if(!voiceEnabled)return false;if(!(window.speechSynthesis&&window.SpeechSynthesisUtterance)){lastSpeechState='هذا المتصفح لا يدعم SpeechSynthesis';badgeAudio.innerHTML='الصوت: يحتاج بديل';refreshAudioDiag();if(allowFallback!==false)fallbackVoice();return false}if(!voices.length)refreshVoices();return compatSpeak(text,allowFallback)}
"""
s = s[:a] + new_audio + s[b:]

# Do not start WebAudio chime immediately before TTS; some Samsung tablets lose audio focus.
old_cheer = "function cheer(){var t=now();if(t-cheerAt<1700)return;cheerAt=t;var c=genderCheer();setStatus(esc(c[0]));playTone();speakSmart(c[1],true);setTimeout(function(){setStatus(modeStatus())},2200)}"
new_cheer = "function cheer(){var t=now();if(t-cheerAt<1700)return;cheerAt=t;var c=genderCheer();setStatus(esc(c[0]));speakSmart(c[1],true);setTimeout(function(){setStatus(modeStatus())},2600)}"
s = s.replace(old_cheer, new_cheer)

# Replace initialization/test block completely.
pa = s.index('function primeAudio(')
ub = s.index('function updateCustomInfo()', pa)
new_test = "function primeAudio(){ensureAudioContext();resetTtsQueue();refreshVoices();storeSet('pk_audio_unlocked','1');lastToneState='تم فتح قناة الصوت';badgeAudio.innerHTML='الصوت: تهيئة TTS';refreshAudioDiag();compatSpeak('مرحبا يا '+userName,false)}function testSystemTts(){resetTtsQueue();setTimeout(function(){runUtterance('مرحبا يا '+userName+' هذا اختبار مباشر لصوت النظام','ar-SA',null,false,'النظام ar-SA',function(ok){if(!ok)compatSpeak('مرحبا يا '+userName+' هذا اختبار للصوت العربي',true)})},80)}function testSamsungTts(){resetTtsQueue();refreshVoices();compatSpeak('أحسنت يا '+userName+' الصوت يعمل على جهاز سامسونج',true)}"
s = s[:pa] + new_test + s[ub:]

# Replace audio diagnostics and guidance.
da = s.index('function refreshAudioDiag(')
db = s.index('function alphaHex(', da)
new_diag = "function refreshAudioDiag(){var tts=!!(window.speechSynthesis&&window.SpeechSynthesisUtterance),v=resolveVoice(),ls=storeSet('pk_test','1'),ua=navigator.userAgent||'',sam=/SamsungBrowser/i.test(ua),and=/Android/i.test(ua);storeRemove('pk_test');var state='?';try{state='speaking='+!!speechSynthesis.speaking+', pending='+!!speechSynthesis.pending+', paused='+!!speechSynthesis.paused}catch(e){}audioDiag.innerHTML='TTS API: '+(tts?'YES':'NO')+'\\nAndroid: '+(and?'YES':'NO')+'\\nSamsung Browser: '+(sam?'YES':'NO')+'\\nVoices exposed: '+voices.length+'\\nArabic voices: '+arabicVoices.length+'\\nSelected: '+(v?((v.name||'?')+' / '+(v.lang||'?')):selectedVoiceKey)+'\\nSynth state: '+state+'\\nAudioContext: '+(audioContextSupported()?'YES':'NO')+'\\nStorage: '+(ls?'YES':'NO')+'\\nLast speech: '+lastSpeechState+'\\nCustom clips: '+customAudios.length;var msg='';if(!tts)msg+='المتصفح لا يوفر واجهة النطق، لذلك استخدم الملفات الصوتية الاحتياطية. ';else if(and)msg+='إعدادات Android الظاهرة لديك كافية مبدئياً. التطبيق V7 يجرب الصوت العربي ثم Google TTS مباشرة بصيغ ar-SA ثم ar ثم ar-EG، ولا يعتبر غياب الصوت العربي من قائمة المتصفح مشكلة. كما أوقفنا تشغيل النغمة بالتزامن مع الكلام لأنها قد تمنع TTS على بعض أجهزة Samsung. ';else msg+='سيستخدم التطبيق أصوات المتصفح المتاحة ثم يحاول صوت النظام. ';msg+='ابدأ بزر «تهيئة الصوت لهذا الجهاز»، ثم «اختبار توافق سامسونج». إذا كان زر Play داخل إعدادات Text-to-speech في الجهاز ينطق العربية لكن الصفحة لا تنطق، أرسل هذه الشاشة التشخيصية لأن المشكلة عندها في جسر المتصفح إلى TTS.';audioAdvice.innerHTML=msg}\n"
s = s[:da] + new_diag + s[db:]

wire_old = "document.getElementById('testSystemTtsBtn').onclick=testSystemTts;document.getElementById('testSpeechBtn').onclick=testSpeech;"
wire_new = "document.getElementById('testSystemTtsBtn').onclick=testSystemTts;document.getElementById('testSamsungTtsBtn').onclick=testSamsungTts;document.getElementById('testSpeechBtn').onclick=testSpeech;"
s = s.replace(wire_old, wire_new)

s = s.replace("setTimeout(refreshVoices,250);setTimeout(refreshVoices,1200);", "setTimeout(refreshVoices,150);setTimeout(refreshVoices,700);setTimeout(refreshVoices,1800);setTimeout(refreshVoices,3500);try{document.addEventListener('visibilitychange',function(){if(!document.hidden){resetTtsQueue();setTimeout(refreshVoices,250)}},false)}catch(e){}")

if s == original:
    raise SystemExit('No v7 changes applied')

p.write_text(s, encoding='utf-8')

sw = Path('pen/sw.js')
if sw.exists():
    t = sw.read_text(encoding='utf-8')
    t = t.replace("noor-draw-v6", "noor-draw-v7").replace("noor-draw-v5", "noor-draw-v7")
    sw.write_text(t, encoding='utf-8')

print('Patched Pen audio to v7 with Samsung/Android compatibility')
