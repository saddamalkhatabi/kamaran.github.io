from pathlib import Path
import re

p = Path('pen/index.html')
s = p.read_text(encoding='utf-8')
original = s

def must_replace(old, new, label):
    global s
    if old not in s:
        raise SystemExit('Missing pattern: ' + label)
    s = s.replace(old, new, 1)

# Version / UI text
must_replace('<title>لوحة الطفل - امسك القلم وارسم v8</title>', '<title>لوحة الطفل - امسك القلم وارسم v9</title>', 'title')
must_replace('اختيار محرك وصوت العربية', 'لغة وصوت التشجيع', 'audio heading')
must_replace('<label>الصوت <select id="voiceSelect"><option value="auto">تلقائي - أفضل صوت عربي</option></select></label>', '<label>اللغة <select id="audioLanguageSelect"></select></label><label>الصوت <select id="voiceSelect"><option value="auto">تلقائي - أفضل صوت للغة المحددة</option></select></label>', 'language selector')
s = s.replace('اختبار النطق العربي', 'اختبار اللغة المحددة')
s = s.replace('صوت احتياطي مسجل - مفيد جداً للتاب القديم', 'صوت احتياطي مسجل - مفيد للأجهزة القديمة')
s = s.replace('إذا لم يدعم الجهاز النطق العربي، يمكنك اختيار حتى ثلاثة ملفات MP3 أو WAV قصيرة مسجلة بصوت حقيقي، وسيستخدمها التطبيق تلقائياً عند فشل النطق.', 'إذا لم يدعم الجهاز النطق باللغة المحددة، يمكنك اختيار حتى ثلاثة ملفات MP3 أو WAV قصيرة مسجلة بصوت حقيقي، وسيستخدمها التطبيق تلقائياً عند فشل النطق.')

# DOM references / state
must_replace(
"var settingsPanel=document.getElementById('settingsPanel'),userNameInput=document.getElementById('userNameInput'),genderSelect=document.getElementById('genderSelect'),voiceSelect=document.getElementById('voiceSelect'),rateSelect=document.getElementById('rateSelect');",
"var settingsPanel=document.getElementById('settingsPanel'),userNameInput=document.getElementById('userNameInput'),genderSelect=document.getElementById('genderSelect'),audioLanguageSelect=document.getElementById('audioLanguageSelect'),voiceSelect=document.getElementById('voiceSelect'),rateSelect=document.getElementById('rateSelect');",
'dom refs')
must_replace(
"var userName='نور',userGender='girl',selectedVoiceKey='auto',speechRate=.86,voices=[],arabicVoices=[],audioCtx=null,lastSpeechState='لم يختبر بعد',lastToneState='لم يختبر بعد',customAudios=[];",
"var userName='نور',userGender='girl',selectedVoiceKey='auto',speechRate=.86,speechLanguage='ar-SA',voices=[],arabicVoices=[],languageVoices=[],audioCtx=null,lastSpeechState='لم يختبر بعد',lastToneState='لم يختبر بعد',customAudios=[];",
'audio state')

must_replace(
"selectedVoiceKey=storeGet('pk_voice','auto')||'auto';speechRate=parseFloat(storeGet('pk_voice_rate','0.86'))||.86;",
"selectedVoiceKey=storeGet('pk_voice','auto')||'auto';speechRate=parseFloat(storeGet('pk_voice_rate','0.86'))||.86;speechLanguage=storeGet('pk_voice_lang','ar-SA')||'ar-SA';",
'load language pref')

# Insert multilingual helpers before old Arabic voice functions.
marker = "function isArabicVoice(v){"
if marker not in s:
    raise SystemExit('Missing audio function marker')
helpers = r'''var languageCatalog=[
{code:'ar-SA',name:'العربية - السعودية'},{code:'en-US',name:'English - US'},{code:'en-GB',name:'English - UK'},{code:'fr-FR',name:'Français'},{code:'es-ES',name:'Español'},{code:'de-DE',name:'Deutsch'},{code:'tr-TR',name:'Türkçe'},{code:'it-IT',name:'Italiano'},{code:'pt-BR',name:'Português'},{code:'ru-RU',name:'Русский'},{code:'hi-IN',name:'हिन्दी'},{code:'ur-PK',name:'اردو'},{code:'fa-IR',name:'فارسی'},{code:'id-ID',name:'Bahasa Indonesia'},{code:'ms-MY',name:'Bahasa Melayu'},{code:'zh-CN',name:'中文'},{code:'ja-JP',name:'日本語'},{code:'ko-KR',name:'한국어'}];
function baseLang(code){return((''+(code||'ar-SA')).toLowerCase().split('-')[0]||'ar')}
function langLabel(code){var i;for(i=0;i<languageCatalog.length;i++)if(languageCatalog[i].code.toLowerCase()===(''+code).toLowerCase())return languageCatalog[i].name;return code}
function buildLanguageOptions(){if(!audioLanguageSelect)return;var seen={},arr=[],i,c,v,opt;for(i=0;i<languageCatalog.length;i++){c=languageCatalog[i];if(!seen[c.code.toLowerCase()]){seen[c.code.toLowerCase()]=1;arr.push({code:c.code,name:c.name})}}for(i=0;i<voices.length;i++){v=voices[i];c=v&&v.lang;if(c&&!seen[c.toLowerCase()]){seen[c.toLowerCase()]=1;arr.push({code:c,name:c})}}audioLanguageSelect.options.length=0;for(i=0;i<arr.length;i++){opt=document.createElement('option');opt.value=arr[i].code;opt.text=arr[i].name+' ('+arr[i].code+')';audioLanguageSelect.appendChild(opt)}audioLanguageSelect.value=speechLanguage;if(audioLanguageSelect.selectedIndex<0){opt=document.createElement('option');opt.value=speechLanguage;opt.text=speechLanguage;audioLanguageSelect.insertBefore(opt,audioLanguageSelect.firstChild);audioLanguageSelect.value=speechLanguage}}
function isVoiceForLanguage(v,lang){var vl=((v&&v.lang)||'').toLowerCase(),want=(''+(lang||speechLanguage)).toLowerCase();if(!vl)return false;return vl===want||baseLang(vl)===baseLang(want)}
function isArabicVoice(v){return isVoiceForLanguage(v,'ar-SA')}
function voiceKey(v){return(v.voiceURI||v.name||'')+'|'+(v.lang||'')}
function localizedText(kind,name){var b=baseLang(speechLanguage),n=name||userName,packs={
ar:{test:'مرحبا يا {name} هذا اختبار للصوت باللغة العربية',color:'اللون {value}',cheers:['أحسنت يا {name}','رائع يا {name}','ممتاز يا {name}','عمل جميل يا {name}','تقدم رائع يا {name}']},
en:{test:'Hello {name}. This is a voice test in English.',color:'The color is {value}',cheers:['Great job, {name}!','Well done, {name}!','Excellent, {name}!','Beautiful work, {name}!','Keep going, {name}!']},
fr:{test:'Bonjour {name}. Ceci est un test vocal en français.',color:'La couleur est {value}',cheers:['Bravo {name} !','Très bien {name} !','Excellent {name} !','Beau travail {name} !','Continue {name} !']},
es:{test:'Hola {name}. Esta es una prueba de voz en español.',color:'El color es {value}',cheers:['¡Muy bien, {name}!','¡Excelente, {name}!','¡Buen trabajo, {name}!','¡Genial, {name}!','¡Sigue así, {name}!']},
de:{test:'Hallo {name}. Dies ist ein Sprachtest auf Deutsch.',color:'Die Farbe ist {value}',cheers:['Sehr gut, {name}!','Toll gemacht, {name}!','Super, {name}!','Klasse, {name}!','Weiter so, {name}!']},
tr:{test:'Merhaba {name}. Bu Türkçe ses testidir.',color:'Renk {value}',cheers:['Aferin {name}!','Harika {name}!','Çok güzel {name}!','Mükemmel {name}!','Devam et {name}!']},
it:{test:'Ciao {name}. Questo è un test vocale in italiano.',color:'Il colore è {value}',cheers:['Bravissimo {name}!','Molto bene {name}!','Ottimo {name}!','Bel lavoro {name}!','Continua così {name}!']},
pt:{test:'Olá {name}. Este é um teste de voz em português.',color:'A cor é {value}',cheers:['Muito bem, {name}!','Excelente, {name}!','Bom trabalho, {name}!','Ótimo, {name}!','Continue assim, {name}!']},
ru:{test:'Привет, {name}. Это проверка голоса на русском языке.',color:'Цвет {value}',cheers:['Молодец, {name}!','Отлично, {name}!','Очень хорошо, {name}!','Прекрасная работа, {name}!','Продолжай, {name}!']},
hi:{test:'नमस्ते {name}। यह हिंदी आवाज़ की परीक्षा है।',color:'रंग {value} है',cheers:['बहुत अच्छा {name}!','शाबाश {name}!','बहुत बढ़िया {name}!','सुंदर काम {name}!','ऐसे ही आगे बढ़ो {name}!']},
ur:{test:'السلام علیکم {name}، یہ اردو آواز کا ٹیسٹ ہے۔',color:'رنگ {value} ہے',cheers:['شاباش {name}!','بہت خوب {name}!','بہترین {name}!','اچھا کام {name}!','جاری رکھو {name}!']},
fa:{test:'سلام {name}، این یک آزمایش صدا به زبان فارسی است.',color:'رنگ {value} است',cheers:['آفرین {name}!','عالی بود {name}!','خیلی خوب {name}!','کارت عالیه {name}!','ادامه بده {name}!']},
id:{test:'Halo {name}. Ini adalah tes suara dalam Bahasa Indonesia.',color:'Warnanya {value}',cheers:['Bagus sekali, {name}!','Hebat, {name}!','Kerja bagus, {name}!','Luar biasa, {name}!','Lanjutkan, {name}!']},
ms:{test:'Hai {name}. Ini ialah ujian suara dalam Bahasa Melayu.',color:'Warnanya {value}',cheers:['Bagus, {name}!','Hebat, {name}!','Syabas, {name}!','Kerja yang baik, {name}!','Teruskan, {name}!']},
zh:{test:'你好，{name}。这是中文语音测试。',color:'颜色是{value}',cheers:['做得好，{name}！','太棒了，{name}！','很好，{name}！','继续加油，{name}！','真棒，{name}！']},
ja:{test:'こんにちは、{name}。日本語の音声テストです。',color:'色は{value}です',cheers:['よくできました、{name}！','すごいね、{name}！','上手だね、{name}！','その調子、{name}！','素晴らしい、{name}！']},
ko:{test:'안녕하세요 {name}. 한국어 음성 테스트입니다.',color:'색은 {value}입니다',cheers:['잘했어요, {name}!','훌륭해요, {name}!','멋져요, {name}!','계속 해봐요, {name}!','아주 좋아요, {name}!']}
};var p=packs[b]||packs.en,t;if(kind==='cheer'){t=p.cheers[Math.floor(Math.random()*p.cheers.length)]}else t=p[kind]||p.test;return(''+t).replace(/\{name\}/g,n)}
function localizedColorName(arName){var b=baseLang(speechLanguage),m={en:{'أحمر':'red','أزرق':'blue','أخضر':'green','أصفر':'yellow','برتقالي':'orange','بنفسجي':'purple','وردي':'pink','بني':'brown','أسود':'black','رمادي':'gray'},fr:{'أحمر':'rouge','أزرق':'bleu','أخضر':'vert','أصفر':'jaune','برتقالي':'orange','بنفسجي':'violet','وردي':'rose','بني':'marron','أسود':'noir','رمادي':'gris'},es:{'أحمر':'rojo','أزرق':'azul','أخضر':'verde','أصفر':'amarillo','برتقالي':'naranja','بنفسجي':'morado','وردي':'rosa','بني':'marrón','أسود':'negro','رمادي':'gris'},tr:{'أحمر':'kırmızı','أزرق':'mavi','أخضر':'yeşil','أصفر':'sarı','برتقالي':'turuncu','بنفسجي':'mor','وردي':'pembe','بني':'kahverengi','أسود':'siyah','رمادي':'gri'}};return(m[b]&&m[b][arName])||arName}
function colorSpeech(arName){var p=localizedText('color',userName);return p.replace(/\{value\}/g,localizedColorName(arName))}
'''
s = s.replace(marker, helpers + marker, 1)

# Replace voice refresh/resolve block, preserving the helper isArabicVoice/voiceKey inserted above by removing old duplicate block through resolveVoice.
pattern = re.compile(r"function isArabicVoice\(v\)\{.*?function resolveVoice\(\)\{.*?return null\}", re.S)
replacement = r"""function isArabicVoice(v){return isVoiceForLanguage(v,'ar-SA')}function voiceKey(v){return(v.voiceURI||v.name||'')+'|'+(v.lang||'')}function refreshVoices(){voices=[];arabicVoices=[];languageVoices=[];try{if(window.speechSynthesis&&speechSynthesis.getVoices){voices=speechSynthesis.getVoices()||[]}}catch(e){}var i,v;for(i=0;i<voices.length;i++){v=voices[i];if(isArabicVoice(v))arabicVoices.push(v);if(isVoiceForLanguage(v,speechLanguage))languageVoices.push(v)}buildLanguageOptions();var old=selectedVoiceKey,arr=[],seen={},opt;voiceSelect.options.length=0;opt=document.createElement('option');opt.value='auto';opt.text='تلقائي - أفضل صوت للغة المحددة';voiceSelect.appendChild(opt);for(i=0;i<languageVoices.length;i++){v=languageVoices[i];seen[voiceKey(v)]=1;arr.push(v)}for(i=0;i<voices.length;i++){v=voices[i];if(!seen[voiceKey(v)])arr.push(v)}for(i=0;i<arr.length;i++){v=arr[i];opt=document.createElement('option');opt.value=voiceKey(v);opt.text=(isVoiceForLanguage(v,speechLanguage)?'★ ':'')+(v.name||'صوت')+' ('+(v.lang||'?')+')';voiceSelect.appendChild(opt)}voiceSelect.value=old;if(voiceSelect.selectedIndex<0){voiceSelect.value='auto';selectedVoiceKey='auto'}refreshAudioDiag()}function resolveVoice(){var i;if(selectedVoiceKey!=='auto'){for(i=0;i<voices.length;i++)if(voiceKey(voices[i])===selectedVoiceKey&&isVoiceForLanguage(voices[i],speechLanguage))return voices[i]}if(languageVoices.length)return languageVoices[0];return null}"""
s, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit('Could not replace voice refresh block')

# Selected language should drive all speech attempts.
s = s.replace("u.lang=lang||'ar-SA';", "u.lang=lang||speechLanguage||'ar-SA';")

pattern = re.compile(r"function compatSpeak\(text,allowFallback\)\{.*?return true\}", re.S)
replacement = r"""function compatSpeak(text,allowFallback){var attempts=[],v=resolveVoice(),done=false,idx=0,base=baseLang(speechLanguage);if(v&&isVoiceForLanguage(v,speechLanguage))attempts.push({lang:v.lang||speechLanguage,voice:v,label:'الصوت المختار'});attempts.push({lang:speechLanguage,voice:null,label:'النظام '+speechLanguage});if(base!==speechLanguage.toLowerCase())attempts.push({lang:base,voice:null,label:'النظام '+base});if(base==='ar'&&speechLanguage.toLowerCase()!=='ar-eg')attempts.push({lang:'ar-EG',voice:null,label:'النظام ar-EG'});function next(ok){if(done)return;if(ok){done=true;return}resetTtsQueue();if(idx>=attempts.length){done=true;lastSpeechState='تعذر بدء TTS باللغة '+speechLanguage;badgeAudio.innerHTML='الصوت: استخدم البديل';refreshAudioDiag();if(allowFallback!==false)fallbackVoice();return}var a=attempts[idx++];setTimeout(function(){runUtterance(text,a.lang,a.voice,false,a.label,next)},idx===1?60:180)}resetTtsQueue();next(false);return true}"""
s, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit('Could not replace compatSpeak')

pattern = re.compile(r"function systemSpeak\(text,lang,allowFallback\)\{.*?return true\}", re.S)
replacement = r"""function systemSpeak(text,lang,allowFallback){var chosen=lang||speechLanguage;resetTtsQueue();setTimeout(function(){runUtterance(text,chosen,null,false,'صوت النظام '+chosen,function(ok){if(!ok&&allowFallback!==false)compatSpeak(text,allowFallback)})},80);return true}"""
s, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit('Could not replace systemSpeak')

# Localized encouragement and tests.
pattern = re.compile(r"function genderCheer\(\)\{.*?return arr\[i\]\}", re.S)
replacement = r"""function genderCheer(){var spoken=localizedText('cheer',userName),icons=['🌟','👏','⭐','🎨','💪','✨','🌈','🏅'],i=Math.floor(Math.random()*icons.length);if(icons.length>1&&i===lastCheer)i=(i+1)%icons.length;lastCheer=i;return[icons[i]+' '+spoken,spoken]}"""
s, n = pattern.subn(replacement, s, count=1)
if n != 1:
    raise SystemExit('Could not replace cheer function')

s = s.replace("function speakColor(){var i=findColorIndex(guideColor);if(i<0)i=0;speakSmart('اللون '+colors[i].name,true)}", "function speakColor(){var i=findColorIndex(guideColor);if(i<0)i=0;speakSmart(colorSpeech(colors[i].name),true)}")
s = s.replace("speakSmart(colors[i].name,false)", "speakSmart(localizedColorName(colors[i].name),false)")
s = s.replace("function testSpeech(){speakSmart('مرحبا يا '+userName+' هذا اختبار للصوت العربي',true)}", "function testSpeech(){speakSmart(localizedText('test',userName),true)}")

# Prime/system/Samsung tests are selected-language tests now.
s = re.sub(r"function primeAudio\(\)\{.*?compatSpeak\('مرحبا يا '\+userName,false\)\}", "function primeAudio(){ensureAudioContext();resetTtsQueue();refreshVoices();storeSet('pk_audio_unlocked','1');lastToneState='تم فتح قناة الصوت';badgeAudio.innerHTML='الصوت: تهيئة TTS';refreshAudioDiag();compatSpeak(localizedText('test',userName),false)}", s, count=1, flags=re.S)
s = re.sub(r"function testSystemTts\(\)\{.*?\}\)\},80\)\}", "function testSystemTts(){resetTtsQueue();setTimeout(function(){runUtterance(localizedText('test',userName),speechLanguage,null,false,'النظام '+speechLanguage,function(ok){if(!ok)compatSpeak(localizedText('test',userName),true)})},80)}", s, count=1, flags=re.S)
s = re.sub(r"function testSamsungTts\(\)\{.*?\}", "function testSamsungTts(){resetTtsQueue();refreshVoices();compatSpeak(localizedText('test',userName),true)}", s, count=1, flags=re.S)

# Diagnostics: selected language instead of Arabic-only diagnosis.
s = s.replace("'Arabic voices: '+arabicVoices.length+'\\nSelected: '", "'Language: '+speechLanguage+'\\nLanguage voices: '+languageVoices.length+'\\nArabic voices: '+arabicVoices.length+'\\nSelected: '")
s = s.replace('إعدادات Android الظاهرة لديك كافية مبدئياً. التطبيق V7 يجرب الصوت العربي ثم Google TTS مباشرة بصيغ ar-SA ثم ar ثم ar-EG، ولا يعتبر غياب الصوت العربي من قائمة المتصفح مشكلة.', 'إعدادات Android الظاهرة لديك كافية مبدئياً. التطبيق V9 يجرب اللغة المحددة أولاً بالصوت المطابق ثم عبر محرك النظام مباشرة. العربية هي الافتراضية ويمكن تغيير اللغة في أي وقت.')
s = s.replace('المتصفح لا يوفر واجهة النطق، لذلك استخدم الملفات الصوتية الاحتياطية.', 'المتصفح لا يوفر واجهة النطق، لذلك استخدم الملفات الصوتية الاحتياطية للغة المطلوبة.')

# Language change handler before voice handler.
needle = "voiceSelect.onchange=function(){selectedVoiceKey=this.value;storeSet('pk_voice',selectedVoiceKey);refreshAudioDiag()};"
if needle not in s:
    raise SystemExit('Missing voice change handler')
handler = "audioLanguageSelect.onchange=function(){speechLanguage=this.value||'ar-SA';selectedVoiceKey='auto';storeSet('pk_voice_lang',speechLanguage);storeSet('pk_voice','auto');refreshVoices();badgeAudio.innerHTML='الصوت: '+langLabel(speechLanguage);setStatus('تم تفعيل لغة الصوت: '+esc(langLabel(speechLanguage)));setTimeout(function(){speakSmart(localizedText('test',userName),true)},80)};" + needle
s = s.replace(needle, handler, 1)

# Build/select language before the first voice refresh.
must_replace("loadUserPrefs();buildTabs();", "loadUserPrefs();buildLanguageOptions();audioLanguageSelect.value=speechLanguage;buildTabs();", 'init language')

# Ensure current language is visible when opening settings.
s = s.replace("function openSettings(){settingsPanel.style.display='block';userNameInput.value=userName;genderSelect.value=userGender;refreshVoices();refreshAudioDiag()}", "function openSettings(){settingsPanel.style.display='block';userNameInput.value=userName;genderSelect.value=userGender;buildLanguageOptions();audioLanguageSelect.value=speechLanguage;refreshVoices();refreshAudioDiag()}")

# Add a language badge to audio settings title text through existing hint.
s = s.replace('👤 اسم الطفل والصوت', '👤 اسم الطفل ولغة الصوت')

if s == original:
    raise SystemExit('No changes applied')

p.write_text(s, encoding='utf-8')

sw = Path('pen/sw.js')
if sw.exists():
    t = sw.read_text(encoding='utf-8').replace("noor-draw-v8", "noor-draw-v9")
    sw.write_text(t, encoding='utf-8')

print('Patched multilingual audio encouragement v9')
