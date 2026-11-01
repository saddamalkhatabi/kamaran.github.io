/* Complete 1,034-entry navigation and progressive pattern study.
   Corpus is authoritative; no fictional translations, pictures or recorded voices.
   The first three lessons have original scene/MP3 media. Later entries upgrade
   automatically when verified pattern assets are published.
*/
(function(window,document){"use strict";
var corpus=null,byId=new Map(),selected=1,ordered=[],subset=[],limit=40,offset=0,progress=new Set(),audio=null,talk=null,clock=0,last=-9,session=0,voiceIndex=null,recordingCueIndex=null,audioCues=null;
var state={search:"",category:"",depth:"",unique:true,show:"all",quizAnswer:[],quizWords:[],correct:false};
var CAT_ICON={demonstratives:"🏠",possession:"🎒",desire:"💭",necessity:"📋",ability:"💪",questions:"❓",time:"🕰️",conditions:"🌦️",negation:"🚫",comparison:"⚖️",emotion:"💗",conversation:"💬",habits:"🔄",movement:"🧳",complex:"🔗"};
var $=id=>document.getElementById(id);
function escapeHTML(x){return String(x==null?"":x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function clean(x){return String(x||"").trim().toLowerCase().replace(/[.!?,;:]/g,"").replace(/\s+/g," ")}
function category(p){return p.tags?.[0]||"conversation"}
function categoryName(c){return corpus.categories.find(x=>x.id===c)?.ar||c}
function saveProgress(){try{localStorage.setItem("pattern-universe-library-mastered",JSON.stringify([...progress]))}catch(e){}}
function stop(){session++;if(clock){cancelAnimationFrame(clock);clock=0}if(audio){audio.pause();audio.src="";audio=null}if(talk){talk.onend=null;talk.onerror=null;talk=null}if("speechSynthesis" in window)speechSynthesis.cancel();window.PATTERN_READ_ALONG?.end();last=-9}
function wordsIn(text){return String(text||"").trim().split(/\s+/).filter(Boolean)}
function setActiveWord(index){
 var p=byId.get(selected);if(!p)return;var target=$("patternSentence"),words=wordsIn(p.en);
 if(!target)return;
 if(last===index){window.PATTERN_READ_ALONG?.refresh();return}last=index;
 target.innerHTML=words.map((w,i)=>i===index?'<span class="speakingWord">'+escapeHTML(w)+'</span>':escapeHTML(w)).join(" ");
 window.PATTERN_READ_ALONG?.update(target,p.en,index);
}
function getCueAt(cues,ms){var lo=0,hi=cues.length-1,found=-1;while(lo<=hi){var mid=(lo+hi)>>1;if(cues[mid][1]<=ms){found=mid;lo=mid+1}else hi=mid-1}return found>=0&&ms<cues[found][2]?cues[found][0]:-1}
function verifyEntry(entry,txt){
 var parts=wordsIn(txt);
 return entry&&entry.text===txt&&Array.isArray(entry.cues)&&entry.cues.length===parts.length&&
   entry.cues.every((v,i)=>v.length===3&&v[0]===i&&v[1]>=0&&v[2]>v[1]&&v[2]<=entry.duration_ms+45&&(!i||entry.cues[i-1][2]<=v[1]));
}
function sourceFor(p){
 var originals={1:["this","scene-1-1.mp3"],2:["have","scene-1-1.mp3"],3:["got","scene-1-1.mp3"]};
 var choice=originals[p.id];
 if(choice){var path="assets/audio/"+choice[0]+"/"+choice[1];return {url:window.LE_ENGLISH_AUDIO?.[choice[0]]?.[choice[1]]?"data:audio/mpeg;base64,"+window.LE_ENGLISH_AUDIO[choice[0]][choice[1]]:path,entry:recordingCueIndex?.items?.[path],type:"kokoro"}}
 var row=voiceIndex?.items?.[p.id];
 if(row&&row.text===p.en&&row.path)return {url:row.path,entry:row,type:"pattern"};
 return null;
}
function play(){
 stop();var p=byId.get(selected);if(!p)return;var seq=session,target=$("patternSentence");last=-9;
 if(target)window.PATTERN_READ_ALONG?.begin(target,p.en);
 var source=sourceFor(p),entry=source?.entry;
 function status(t){var e=$("patternVoiceStatus");if(e&&seq===session)e.textContent=t}
 if(source&&verifyEntry(entry,p.en)){
  var localAudio=new Audio(source.url);audio=localAudio;localAudio.preload="auto";localAudio.playbackRate=1;
  status("تسجيل صوتي + حدود كلمات مقاسة من التسجيل نفسه");
  function tick(){
   if(seq!==session||!audio||audio!==localAudio)return;
   setActiveWord(getCueAt(entry.cues,localAudio.currentTime*1000));
   if(!localAudio.ended)clock=requestAnimationFrame(tick);
  }
  localAudio.onplaying=()=>{if(seq===session)tick()};
  localAudio.onended=()=>{if(seq===session){setActiveWord(-1);window.PATTERN_READ_ALONG?.end();status("اكتمل الاستماع")}};
  localAudio.onerror=()=>{if(seq===session){status("التسجيل لم يُحمّل؛ سيُستخدم نطق المتصفح");browserVoice(p,seq)}};
  localAudio.play().catch(()=>{if(seq===session)browserVoice(p,seq)});
  return;
 }
 browserVoice(p,seq);
}
function browserVoice(p,seq){
 if(!("speechSynthesis" in window)){var el=$("patternVoiceStatus");if(el)el.textContent="هذا المتصفح لا يدعم تشغيل نطق بديل";return}
 var u=new SpeechSynthesisUtterance(p.en);talk=u;u.lang="en-US";u.rate=.90;
 var vs=speechSynthesis.getVoices().filter(v=>v.lang.toLowerCase().startsWith("en"));
 u.voice=vs.find(v=>/jenny|aria|english|natural/i.test(v.name))||vs[0]||null;
 var targets=[...p.en.matchAll(/\S+/g)];
 u.onboundary=e=>{if(seq!==session)return;var n=targets.findIndex((x,i)=>e.charIndex>=x.index&&(i===targets.length-1||e.charIndex<targets[i+1].index));if(n>=0)setActiveWord(n)};
 u.onend=()=>{if(seq===session){setActiveWord(-1);window.PATTERN_READ_ALONG?.end()}};
 u.onerror=()=>{if(seq===session){var el=$("patternVoiceStatus");if(el)el.textContent="تعذر النطق في المتصفح"}};
 var el=$("patternVoiceStatus");if(el)el.textContent="صوت المتصفح · تظليل الكلمات يعتمد على دعم المتصفح لحدث حدود الكلمات؛ لا توقيتات تخمينية";
 speechSynthesis.speak(u);
}
function displayIndex(){
 var cat=state.category,depth=state.depth,q=clean(state.search);var arr=corpus.patterns;
 if(state.unique)arr=arr.filter(x=>!x.duplicateOf);
 if(cat)arr=arr.filter(x=>x.tags.includes(cat));
 if(depth)arr=arr.filter(x=>x.depth===depth);
 if(q)arr=arr.filter(x=>[x.en,x.rule,String(x.id),...(x.keywords||[])].some(v=>clean(v).includes(q)));
 if(state.show==="mastered")arr=arr.filter(x=>progress.has(x.id));
 if(state.show==="pending")arr=arr.filter(x=>!progress.has(x.id));
 subset=arr;
 $("pathCount").textContent=arr.length.toLocaleString("en-US")+" / "+corpus.patterns.length.toLocaleString("en-US")+" نمط · "+progress.size+" تمت مراجعته";
 $("pathShowMore").hidden=limit>=arr.length;
 $("patternItems").innerHTML=arr.slice(0,limit).map(p=>{
  var ready=!!sourceFor(p)?.entry;
  return '<button type="button" class="patternChoice'+(selected===p.id?' chosen':'')+'" data-pick="'+p.id+'"><small>#'+p.id+' · '+escapeHTML(categoryName(category(p)))+'</small><span lang="en" dir="ltr">'+escapeHTML(p.en)+'</span><em>'+(progress.has(p.id)?"✓ تمت المراجعة":ready?"🔊 صوت متزامن":"تعلم واستمع")+'</em></button>';
 }).join("")||'<p>لا توجد نتائج مطابقة. جرّب تصنيفًا آخر.</p>';
 document.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>select(+b.dataset.pick));
}
function sortShuffle(tokens,id){return tokens.map((word,i)=>({word,order:i,key:(i*17+id*13)%Math.max(1,tokens.length)})).sort((a,b)=>a.key-b.key||b.order-a.order)}
function practice(){
 var p=byId.get(selected),words=wordsIn(p.en);state.quizWords=sortShuffle(words,p.id);state.quizAnswer=[];state.correct=false;
 drawPractice();
}
function drawPractice(){
 var p=byId.get(selected);if(!p)return;
 var text=wordsIn(p.en),answer=state.quizAnswer.map(i=>state.quizWords[i].word);
 $("patternAnswer").innerHTML=answer.map((w,i)=>'<button type="button" data-unpick="'+i+'">'+escapeHTML(w)+'</button>').join("")||'<span class="muted">كوّن الجملة بالكلمات أدناه</span>';
 $("patternTokens").innerHTML=state.quizWords.map((w,i)=>state.quizAnswer.includes(i)?"":'<button type="button" data-token="'+i+'">'+escapeHTML(w.word)+'</button>').join("");
 var done=answer.length===text.length,correct=done&&answer.join(" ")===text.join(" ");
 $("patternPracticeStatus").textContent=correct?"✓ رائع! ترتيب الجملة صحيح.":done?"أعد ترتيب الكلمات لتطابق الجملة الأصلية.":"";
 $("patternPracticeStatus").classList.toggle("success",correct);
 document.querySelectorAll("[data-token]").forEach(b=>b.onclick=()=>{state.quizAnswer.push(+b.dataset.token);drawPractice()});
 document.querySelectorAll("[data-unpick]").forEach(b=>b.onclick=()=>{state.quizAnswer.splice(+b.dataset.unpick,1);drawPractice()});
}
function selectedImage(p){
 var source=null;
 if(p.id===1)source={file:"this",index:0};
 if(p.id===2)source={file:"have",index:0};
 if(p.id===3)source={file:"got",index:0};
 if(window.PATTERN_ATLAS_AVAILABLE&&p.id>=4&&p.id<=27)source={file:p.id<=15?"patterns-4-15":"patterns-16-27",index:(p.id<=15?p.id-4:p.id-16)};
 var picture=$("patternPhoto"),empty=$("patternPlaceholder");
 if(source){
  var col=source.index%4,row=Math.floor(source.index/4);
  picture.style.cssText='background-image:url("assets/real-scenes/'+source.file+'-scenes.webp");background-size:400% 300%;background-position:'+(col*100/3)+'% '+(row*50)+'%;';
  picture.style.display="block";empty.hidden=true;
 }else{
  picture.style.display="none";empty.hidden=false;
  empty.querySelector("span").textContent=CAT_ICON[category(p)]||"📚";
  empty.querySelector("strong").textContent=categoryName(category(p));
  empty.querySelector("small").textContent="المشهد الواقعي الخاص بهذه العبارة قيد الإعداد";
 }
}
function select(id){
 var p=byId.get(id);if(!p)return;stop();selected=id;practice();selectedImage(p);
 $("patternNumber").textContent="#"+p.id+" من "+corpus.patterns.length;
 $("patternSentence").textContent=p.en;
 $("patternRule").textContent=p.rule;
 $("patternCategory").textContent=categoryName(category(p));
 $("patternDepth").textContent=({basic:"أساسي",intermediate:"متوسط",advanced:"متقدم"})[p.depth]||p.depth;
 $("patternMediaStatus").textContent=p.id<=3?"درس كامل: صورة أصلية وتسجيل ومزامنة":"مستوى المكتبة · "+(sourceFor(p)?.entry?"تسجيل صوتي متزامن":"صوت المتصفح لحين تجهيز تسجيل مقاس");
 $("patternDuplicate").textContent=p.duplicateOf?"مطابق للمدخل #"+p.duplicateOf:"مدخل أصلي";
 $("patternMaster").textContent=progress.has(id)?"✓ تمت المراجعة — إلغاء":"✓ أتممت مراجعة النمط";
 $("patternRelated").innerHTML=(p.relatedIds||[]).slice(0,8).map(n=>{var x=byId.get(n);return x?'<button type="button" data-neighbor-id="'+n+'">#'+n+' · '+escapeHTML(x.en)+'</button>':""}).join("");
 document.querySelectorAll("[data-neighbor-id]").forEach(b=>b.onclick=()=>select(+b.dataset.neighborId));
 $("patternVoiceStatus").textContent="اضغط للاستماع · لا نعتمد على توقيتات تخمينية";
 displayIndex();
 try{history.replaceState(null,"","#pattern-"+id)}catch(e){}
}
function move(step){
 var list=subset.length?subset:ordered;
 var ix=list.findIndex(x=>x.id===selected),next=list[Math.min(list.length-1,Math.max(0,ix+step))];
 if(next)select(next.id);
}
function mount(data){
 corpus=data;if(!$("patternCurriculum"))return;
 ordered=corpus.patterns.slice().sort((a,b)=>a.id-b.id);
 byId=new Map(ordered.map(p=>[p.id,p]));
 try{progress=new Set(JSON.parse(localStorage.getItem("pattern-universe-library-mastered")||"[]"))}catch(e){}
 var cats=corpus.categories.map(c=>({name:c.ar,id:c.id,count:corpus.patterns.filter(p=>p.tags.includes(c.id)).length}));
 $("pathCategories").innerHTML='<button type="button" data-cat="" class="selected">الكل · '+ordered.length+'</button>'+
 cats.map(c=>'<button type="button" data-cat="'+c.id+'">'+(CAT_ICON[c.id]||"📖")+' '+escapeHTML(c.name)+' · '+c.count+'</button>').join("");
 $("pathCategories").querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{
  state.category=b.dataset.cat;limit=40;
  $("pathCategories").querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));
  displayIndex();
 });
 $("pathSearch").oninput=e=>{state.search=e.target.value;limit=40;displayIndex()};
 $("pathDepth").onchange=e=>{state.depth=e.target.value;limit=40;displayIndex()};
 $("pathShow").onchange=e=>{state.show=e.target.value;limit=40;displayIndex()};
 $("pathUnique").checked=state.unique;$("pathUnique").onchange=e=>{state.unique=e.target.checked;limit=40;displayIndex()};
 $("pathShowMore").onclick=()=>{limit+=40;displayIndex()};
 $("patternPlay").onclick=play;$("patternStop").onclick=stop;
 $("patternMaster").onclick=()=>{if(progress.has(selected))progress.delete(selected);else progress.add(selected);saveProgress();select(selected)};
 $("patternPrev").onclick=()=>move(-1);$("patternNext").onclick=()=>move(1);
 $("patternReset").onclick=practice;
 displayIndex();
 var start=location.hash.match(/^#pattern-(\d+)$/);select(start&&byId.has(+start[1])?+start[1]:1);
 Promise.all([
  fetch("data/audio-word-cues.json").then(r=>r.ok?r.json():null).catch(()=>null),
  fetch("data/pattern-audio-index.json").then(r=>r.ok?r.json():null).catch(()=>null)
 ]).then(([recorded,patterns])=>{
  if(recorded&&recorded.total_recordings===96)recordingCueIndex=recorded;
  if(patterns&&patterns.schema===1&&patterns.items)voiceIndex=patterns;
  displayIndex();select(selected);
 });
 window.addEventListener("hashchange",()=>{var m=location.hash.match(/^#pattern-(\d+)$/);if(m&&byId.has(+m[1]))select(+m[1])});
}
window.PATTERN_CURRICULUM={mount,stop,select};
})(window,document);
