/* Group Three: self-expression foundations. No guessed timestamps, images or asset availability. */
(function(window,document){
"use strict";
const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const STORE="pattern-universe-group-three-v1";
const LINKS={"i-can":["i-cant","can-you","can-i"],"i-cant":["i-can","i-need-to"],"can-you":["can-i","please","let-me"],"can-i":["can-you","is-it-okay-if","you-may"],"is-it-okay-if":["can-i","you-may"],"you-may":["can-i","is-it-okay-if"],"i-need":["i-need-to","i-have-to"],"i-need-to":["i-need","i-have-to"],"i-have-to":["dont-have-to","i-must","i-need-to"],"dont-have-to":["i-have-to","i-must"],"i-must":["i-have-to","i-should"],"i-should":["you-should","i-must"],"you-should":["i-should","lets"],"lets":["let-me","would-you-like-to"],"let-me":["lets","can-you"],"please":["can-you","can-i"],"would-you-like":["would-you-like-to","please"],"would-you-like-to":["would-you-like","lets"]};
let data=null,voices={},sourceVoices={},kokoroVoices={},chapterSelected=0,selected=0,scene=0,mode="story",answers={},answer=[],quizResult=false,builderResult=false,seq=0,audio=null,utterance=null,frame=0,highlightTarget=null,highlightText="",auto=false,active=false;
try{answers=JSON.parse(localStorage.getItem(STORE)||"{}")||{}}catch(e){answers={}}
function focusHtml(value){
 const pattern=/\b(would you like to|would you like|is it okay if|don't have to|have to|need to|can you|can i|you may|you should|let me|let's|please|can't|must|should|need|can)\b/gi;
 return esc(value).replace(pattern,'<strong class="g3Focus">$1</strong>');
}
function current(){return data?.items[selected]}
function example(){return current()?.scenes[scene]}
function saved(){try{localStorage.setItem(STORE,JSON.stringify(answers))}catch(e){}}
function key(){return current().key+":"+scene}
function completeCount(){return Object.values(answers).filter(x=>x?.quiz&&x?.builder).length}
function stop(){
 seq++;if(frame)cancelAnimationFrame(frame);frame=0;
 if(audio){audio.pause();audio.removeAttribute("src");audio.load();audio=null}
 if(utterance){utterance.onend=null;utterance.onerror=null;utterance=null}
 if("speechSynthesis" in window)speechSynthesis.cancel();
 if(highlightTarget?.isConnected)paintWord(highlightTarget,highlightText,-1);
 highlightTarget=null;highlightText="";
 window.PATTERN_READ_ALONG?.end();
}
function paintWord(node,text,index){
 if(!node?.isConnected)return;
 const words=text.trim().split(/\s+/);
 node.innerHTML=index<0?focusHtml(text):words.map((w,i)=>i===index?'<mark class="g3Spoken">'+esc(w)+'</mark>':esc(w)).join(" ");
 window.PATTERN_READ_ALONG?.update(node,text,index);
}
function findCue(cues,ms){
 let lo=0,hi=cues.length-1,n=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(cues[mid][1]<=ms){n=mid;lo=mid+1}else hi=mid-1}
 return n>=0&&ms<cues[n][2]?cues[n][0]:-1;
}
function audioRow(text,clip){
 const original=Object.entries(kokoroVoices?.items||{}).find(([path,item])=>item.text===text);
 const specific=voices?.items?.[clip],existing=Object.values(sourceVoices?.items||{}).find(x=>x.text===text);
 const row=original?{...original[1],path:original[0]}:(specific?.text===text?specific:existing);
 if(!row||!row.audio_sha256||!row.path||row.language!=="en"||!Number.isFinite(row.duration_ms))return null;
 const parts=text.trim().split(/\s+/),cues=row.cues;
 if(!Array.isArray(cues)||cues.length!==parts.length)return null;
 if(!cues.every((c,i)=>Array.isArray(c)&&c.length===3&&c[0]===i&&c[1]>=0&&c[2]>c[1]&&c[2]<=row.duration_ms+45&&(!i||cues[i-1][2]<=c[1])))return null;
 return row;
}
const publicAudioPacks=new Map();
function preloadGroupOneAudio(id){
 const key=id==="chapters"?"chapters":"p"+String(id).padStart(2,"0");
 if(publicAudioPacks.has(key))return publicAudioPacks.get(key);
 const promise=new Promise(resolve=>{
   const script=document.createElement("script");
   script.src="assets/group-three-audio-bundles/"+key+".js";
   script.onload=()=>resolve(true);script.onerror=()=>resolve(false);
   document.head.appendChild(script);
 });
 publicAudioPacks.set(key,promise);
 return promise;
}
function showStatus(text){$("g3AudioStatus").textContent=text}
function speakBrowser(text,slow,done,token,target){
 if(!("speechSynthesis" in window)){showStatus("الصوت غير متاح في هذا المتصفح؛ يمكنك قراءة النص");return}
 const u=new SpeechSynthesisUtterance(text);utterance=u;u.lang="en-US";u.rate=slow?0.77:0.94;
 const choices=speechSynthesis.getVoices().filter(v=>/^en/i.test(v.lang));
 const voice=choices.find(v=>/natural|jenny|samantha|google|aria/i.test(v.name))||choices[0];if(voice)u.voice=voice;
 showStatus("نطق المتصفح الإنجليزي · إبراز الكلمات حسب دعم الجهاز");
 u.onboundary=e=>{if(token!==seq||!target)return;const parts=[...text.matchAll(/\S+/g)];const i=parts.findIndex((m,j)=>e.charIndex>=m.index&&(j===parts.length-1||e.charIndex<parts[j+1].index));if(i>=0)paintWord(target,text,i)};
 u.onend=()=>{if(token!==seq)return;if(target)paintWord(target,text,-1);if(done)done()};
 u.onerror=()=>{if(token===seq)showStatus("تعذر تشغيل صوت الجهاز؛ النص متاح للقراءة")};
 speechSynthesis.speak(u);
}
function play(text,clip,target=null,slow=false,done=null){
 stop();const token=seq;highlightTarget=target;highlightText=text;
 if(target){paintWord(target,text,-1);window.PATTERN_READ_ALONG?.begin(target,text)}
 const row=audioRow(text,clip);
 if(!row){speakBrowser(text,slow,done,token,target);return}
 if(!window.LE_GROUP_THREE_AUDIO?.[clip]&&/^((p[0-9]{2})|chapters)\//.test(clip)){
  const bundle=clip.startsWith("chapters")?"chapters":Number(clip.slice(1,3));
  preloadGroupTwoAudio(bundle).then(ok=>{
   if(token!==seq)return;
   if(ok&&window.LE_GROUP_THREE_AUDIO?.[clip])play(text,clip,target,slow,done);
   else speakBrowser(text,slow,done,token,target);
  });
  return;
 }
 let completed=false;const parts=String(row.path).split("/");
 const oldBundle=parts.length===4 && parts[0]==="assets" && parts[1]==="audio" && window.LE_ENGLISH_AUDIO?.[parts[2]]?.[parts[3]];
 const newBundle=window.LE_GROUP_THREE_AUDIO?.[clip];
 const player=new Audio(oldBundle?"data:audio/mpeg;base64,"+oldBundle:newBundle?"data:audio/mpeg;base64,"+newBundle:row.path);
 audio=player;player.preload="auto";player.playbackRate=slow?.78:1;
 const fallback=()=>{if(completed||token!==seq)return;completed=true;player.pause();speakBrowser(text,slow,done,token,target)};
 let last=-2;
 const tick=()=>{
  if(token!==seq||player.paused||player.ended)return;
  const i=findCue(row.cues,player.currentTime*1000);
  if(target&&i!==last){last=i;paintWord(target,text,i)}
  frame=requestAnimationFrame(tick);
 };
 player.onplaying=()=>{if(token!==seq)return;showStatus("MP3 مُسجّل · تمييز الكلمات بحسب توقيتات التسجيل الحقيقي");tick()};
 player.onended=()=>{if(token!==seq)return;completed=true;if(frame)cancelAnimationFrame(frame);frame=0;if(target)paintWord(target,text,-1);if(done)done()};
 player.onerror=fallback;
 player.play().catch(fallback);
}

function thumbnail(it){
 return '<div class="g3Illustration g3RoutineCard" role="img" aria-label="'+esc(it.context)+'">'<span aria-hidden="true">''+esc(it.icon||"🤝")+'</span><strong>'+esc(it.context)+'</strong><small>مشهد توضيحي مؤقت — نضيف الصور الواقعية لاحقًا</small></div>';
}
function renderList(){
 $("g3PatternList").innerHTML=data.items.map((p,i)=>{
 const finished=p.scenes.filter((s,j)=>answers[p.key+":"+j]?.quiz&&answers[p.key+":"+j]?.builder).length;
 return '<button class="g3PatternChip '+(i===selected?"active":"")+'" data-g3-pattern="'+i+'" aria-current="'+(i===selected?'true':'false')+'"><b dir="ltr">'+esc(p.title)+'</b><span>'+esc(p.meaning)+'</span><small>'+finished+' / 4 تجارب</small></button>'
 }).join("");
 $("g3Progress").textContent=completeCount()+" / 72 تجربة أتقنتها باختبار الفهم والبناء";
 const completedPatterns=data.items.filter(p=>p.scenes.every((s,j)=>answers[p.key+":"+j]?.quiz&&answers[p.key+":"+j]?.builder)).length;
 $("g3PatternProgress").textContent=completedPatterns+" / 18 أنماط مكتملة";
}
function renderStudy(){
 const p=current(),s=example();if(!p||!s)return;
 quizResult=!!answers[key()]?.quiz;builderResult=!!answers[key()]?.builder;answer=[];auto=false;preloadGroupOneAudio(p.id);
 $("g3Title").textContent=p.title;$("g3Meaning").textContent=p.meaning;$("g3Formula").textContent=p.formula;
 $("g3Explanation").textContent=p.explanation;$("g3ExplanationEn").textContent=p.explanationEn;
 $("g3Contrast").textContent=p.contrast;$("g3Number").textContent="النمط "+p.id+" / "+data.items.length;
 $("g3Source").textContent="يرتبط بمدخلات المصدر: "+p.sourceIds.map(n=>"#"+n).join("، ")+" · قد تكون بعض الأمثلة توسعًا تعليميًا جديدًا";
 $("g3Visual").innerHTML=thumbnail(s);$("g3SceneContext").textContent=s.context;
 $("g3MainEnglish").textContent=s.en;$("g3MainArabic").textContent=s.ar;
 $("g3SceneNumber").textContent="الموقف "+(scene+1)+" / 4";
 $("g3SceneSteps").innerHTML=p.scenes.map((x,i)=>'<button data-g3-scene="'+i+'" class="'+(scene===i?"active":"")+'" aria-label="الموقف '+(i+1)+'">'+(i+1)+'</button>').join("");
 $("g3Prev").disabled=selected===0&&scene===0;$("g3Next").textContent=selected===data.items.length-1&&scene===3?"أعد المجموعة":"التالي ←";
 $("g3Secret").checked=false;toggleHidden();
 renderQuiz();renderBuilder();renderStory();renderRelations();renderList();renderChapters();
 showStatus("استمع للموقف أو للشرح، والتلوين يظهر فقط من حدود نطق موثوقة");
}
function renderRelations(){
 const others=(LINKS[current().key]||[]).map(k=>data.items.findIndex(p=>p.key===k)).filter(i=>i>=0);
 $("g3Relations").innerHTML=others.map(i=>'<button class="btn tiny" data-g3-pattern="'+i+'">'+esc(data.items[i].title)+'</button>').join("");
}
function toggleHidden(){$("g3MainEnglish").classList.toggle("g3Masked",$("g3Secret").checked)}
function shuffle(arr){const x=[...arr];for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]]}return x}
function renderQuiz(){
 const p=current(),s=example(),correct=s.en;
 const options=shuffle([correct,...shuffle(p.scenes.filter(x=>x.id!==s.id).map(x=>x.en)).slice(0,2)]);
 $("g3QuizQuestion").textContent="ما العبارة الصحيحة لمعنى «"+s.ar+"»؟";
 $("g3QuizOptions").innerHTML=options.map((x,i)=>'<button data-g3-guess="'+i+'" class="'+(quizResult&&x===correct?"good":"")+'">'+esc(x)+'</button>').join("");
 $("g3QuizOptions").dataset.options=JSON.stringify(options);
 $("g3QuizFeedback").textContent=quizResult?"✓ سبق أن أجبت عن هذا الموقف بشكل صحيح":"اختر العبارة المطابقة للمعنى، وليس مجرد عبارة من النمط";
}
function checkQuiz(i){
 const options=JSON.parse($("g3QuizOptions").dataset.options||"[]"),ok=options[i]===example().en;
 $("g3QuizOptions").querySelectorAll("button").forEach((b,j)=>b.classList.toggle("good",j===i&&ok));
 $("g3QuizOptions").querySelectorAll("button").forEach((b,j)=>b.classList.toggle("bad",j===i&&!ok));
 $("g3QuizFeedback").textContent=ok?"أحسنت! فهمت معنى العبارة ✓":"ليست هذه العبارة المطابقة. جرّب مجددًا.";
 if(ok){quizResult=true;answers[key()]={...(answers[key()]||{}),quiz:true};saved();renderList()}
}
function renderBuilder(){
 const words=example().en.trim().split(/\s+/);
 const chosen=new Set(answer),remaining=shuffle(words.map((w,i)=>({w,i})).filter(x=>!chosen.has(x.i)));
 $("g3BuiltWords").innerHTML=answer.length?answer.map((i,pos)=>'<button data-g3-undo="'+pos+'">'+esc(words[i])+'</button>').join(""):'<small>اختر الكلمات لتكوين العبارة، دون الالتزام بترتيب معين حتى تكتمل</small>';
 $("g3BankWords").innerHTML=remaining.map(x=>'<button data-g3-token="'+x.i+'">'+esc(x.w)+'</button>').join("");
 if(answer.length===words.length){const ok=answer.every((v,i)=>v===i);$("g3BuildFeedback").textContent=ok?"ممتاز! بنيت العبارة الصحيحة ✓":"ترتيب الكلمات غير صحيح. يمكنك النقر على كلمة لإرجاعها والمحاولة مجددًا.";
 if(ok){builderResult=true;answers[key()]={...(answers[key()]||{}),builder:true};saved();renderList()}}
 else $("g3BuildFeedback").textContent=builderResult?"✓ بنيت هذه العبارة بشكل صحيح سابقًا":"رتّب الكلمات ثم اختبر الجملة كاملة.";
}
function renderStory(){
 const p=current(),lines=mode==="story"?p.story:p.dialogue;
 $("g3StoryToggle").textContent=mode==="story"?"🎭 انتقل إلى الحوار":"📖 انتقل إلى القصة";
 $("g3StoryList").innerHTML=lines.map((s,i)=>'<button class="g3StoryRow" data-g3-line="'+i+'"><span class="g3LineMeta">'+(mode==="dialogue"?"المتحدث "+s.speaker:"جزء "+(i+1))+'</span><span lang="en" dir="ltr" class="g3LineEnglish" data-g3-target="'+i+'">'+focusHtml(s.en)+'</span><span class="g3LineArabic">'+esc(s.ar)+'</span></button>').join("");
}
function playStoryLine(i,continuous=false,token=seq){
 const p=current(),lines=mode==="story"?p.story:p.dialogue,s=lines[i];if(!s||!active)return;
 document.querySelectorAll("#g3StoryList .g3StoryRow").forEach(x=>x.classList.toggle("active",+x.dataset.g3Line===i));
 const node=$("g3StoryList").querySelector('[data-g3-target="'+i+'"]');
 const clip="p"+String(p.id).padStart(2,"0")+"/"+(mode==="story"?"story":"dialogue")+"-"+(i+1);
 play(s.en,clip,node,false,()=>{if(continuous&&i+1<lines.length&&active)playStoryLine(i+1,true);});
}
function renderChapters(){
 const chapters=data?.chapters||[];
 $("g3ChapterTabs").innerHTML=chapters.map((c,i)=>'<button data-g3-chapter="'+i+'" class="btn '+(i===chapterSelected?"primary":"alt")+'">'+esc(c.icon)+" "+esc(c.title)+" — "+esc(c.titleAr)+'</button>').join("");
 const chosen=chapters[chapterSelected];
 $("g3ChapterLines").innerHTML=chosen?chosen.lines.map((line,i)=>'<button class="g3StoryRow" data-g3-chapter-line="'+i+'"><span class="g3LineMeta">المقطع '+(i+1)+'</span><span lang="en" dir="ltr" class="g3LineEnglish" data-g3-chapter-target="'+i+'">'+focusHtml(line.en)+'</span><span class="g3LineArabic">'+esc(line.ar)+'</span></button>').join(""):"";
}
function playChapterLine(i,continuous=false){
 preloadGroupTwoAudio("chapters");
 const chapter=data?.chapters?.[chapterSelected],line=chapter?.lines?.[i];if(!line||!active)return;
 document.querySelectorAll("#g3ChapterLines .g3StoryRow").forEach(x=>x.classList.toggle("active",+x.dataset.g3ChapterLine===i));
 const node=$("g3ChapterLines").querySelector('[data-g3-chapter-target="'+i+'"]');
 const clip="chapters/c"+String(chapter.id).padStart(2,"0")+"/line-"+(i+1);
 play(line.en,clip,node,false,()=>{if(continuous&&i+1<chapter.lines.length&&active)playChapterLine(i+1,true)});
}
function move(step){
 stop();auto=false;let next=scene+step,pi=selected;
 if(next>=4){next=0;pi=(pi+1)%data.items.length}
 if(next<0){if(pi===0)return;pi--;next=3}
 selected=pi;scene=next;renderStudy();
 $("g3Lesson").scrollIntoView({block:"start",behavior:"smooth"});
}
function goPattern(i){if(!data||i<0||i>=data.items.length)return;stop();selected=i;scene=0;renderStudy();$("g3Lesson").scrollIntoView({block:"start",behavior:"smooth"})}
function useAction(node){
 const d=node.dataset;
 if(d.g3Pattern!==undefined)goPattern(+d.g3Pattern);
 else if(d.g3Scene!==undefined){stop();scene=+d.g3Scene;renderStudy()}
 else if(d.g3Guess!==undefined)checkQuiz(+d.g3Guess);
 else if(d.g3Token!==undefined){answer.push(+d.g3Token);renderBuilder()}
 else if(d.g3Undo!==undefined){answer.splice(+d.g3Undo,1);renderBuilder()}
 else if(d.g3Line!==undefined)playStoryLine(+d.g3Line);
 else if(d.g3Chapter!==undefined){stop();chapterSelected=+d.g3Chapter;renderChapters()}
 else if(d.g3ChapterLine!==undefined)playChapterLine(+d.g3ChapterLine);
}
async function load(){
 if(data)return;
 const [a,b,c,d]=await Promise.all([fetch("data/group-three.json"),fetch("data/group-three-audio-index.json").catch(()=>null),fetch("data/pattern-audio-index.json").catch(()=>null),fetch("data/audio-word-cues.json").catch(()=>null)]);
 if(!a.ok)throw Error("تعذر تحميل ملف المجموعة الثالثة: HTTP "+a.status);
 data=await a.json();if(data.schema!==1||data.items?.length!==18||data.items.some(p=>p.scenes?.length!==4||p.story?.length!==3||p.dialogue?.length!==2)||data.chapters?.length!==3||data.chapters.some(c=>c.lines?.length!==6))throw Error("بيانات المجموعة غير مكتملة");
 if(b?.ok){const j=await b.json();if(j.schema===1&&j.items)voices=j}
 if(c?.ok){const j=await c.json();if(j.schema===1&&j.items)sourceVoices=j}
 if(d?.ok){const j=await d.json();if(j.items)kokoroVoices=j}
}
async function open(){
 active=true;$("g3Loading").textContent="تحميل محتوى المجموعة الثالثة...";
 try{await load();if(!active)return;$("g3Loading").hidden=true;renderStudy()}
 catch(e){$("g3Loading").textContent=e.message+" — أعد فتح المجموعة للمحاولة";}
}
function setup(){
 if(!$("view-group-three"))return;
 $("view-group-three").addEventListener("click",e=>{const b=e.target.closest("button");if(b&&$("view-group-three").contains(b))useAction(b)});
 $("g3Prev").onclick=()=>move(-1);$("g3Next").onclick=()=>move(1);
 $("g3Speak").onclick=()=>play(example().en,"p"+String(current().id).padStart(2,"0")+"/scene-"+(scene+1),$("g3MainEnglish"));
 $("g3Slow").onclick=()=>play(example().en,"p"+String(current().id).padStart(2,"0")+"/scene-"+(scene+1),$("g3MainEnglish"),true);
 $("g3Explain").onclick=()=>play(current().explanationEn,"p"+String(current().id).padStart(2,"0")+"/intro",$("g3ExplanationEn"));
 $("g3Stop").onclick=()=>{auto=false;stop();showStatus("تم إيقاف الصوت")};
 $("g3Secret").onchange=toggleHidden;
 $("g3Reset").onclick=()=>{answer=[];renderBuilder()};
 $("g3StoryToggle").onclick=()=>{stop();mode=mode==="story"?"dialogue":"story";renderStory()};
 $("g3StoryAll").onclick=()=>{stop();playStoryLine(0,true)};
 $("g3ChapterAll").onclick=()=>{stop();playChapterLine(0,true)};
 $("g3Autoplay").onclick=()=>{auto=!auto;$("g3Autoplay").textContent=auto?"⏸ إيقاف التسلسل التلقائي":"▶ استمع لجميع مواقف النمط";if(auto){let i=scene;const run=()=>{if(!auto||!active)return;scene=i;renderStudy();auto=true;$("g3Autoplay").textContent="⏸ إيقاف التسلسل التلقائي";const s=example();play(s.en,"p"+String(current().id).padStart(2,"0")+"/scene-"+(i+1),$("g3MainEnglish"),false,()=>{if(!auto)return;if(i<3){i++;run()}else{auto=false;$("g3Autoplay").textContent="▶ استمع لجميع مواقف النمط"}})};run()}else stop()};
}
setup();
window.GROUP_THREE={open,stop:()=>{active=false;auto=false;stop()},getStatus:()=>({patterns:data?.items.length||0,completeScenes:completeCount()})};
})(window,document);
