import { chromium } from "playwright";
import assert from "node:assert/strict";
const root=process.env.G4_SMOKE_URL || "http://127.0.0.1:3178/";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
const errors=[],bad=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("response",r=>{if(r.status()>=400&&/\.(js|json|mp3)/.test(r.url()))bad.push(r.status()+" "+r.url())});
try{
 await page.goto(root,{waitUntil:"networkidle",timeout:30000});
 await page.locator('[data-view="group-four"]').click();
 await page.locator("#g4PatternList .g4PatternChip").first().waitFor({timeout:15000});
 assert.equal(await page.locator("#g4PatternList .g4PatternChip").count(),18);
const voiceIndex=await page.evaluate(async()=>await (await fetch("data/group-four-audio-index.json")).json());
 if(Object.keys(voiceIndex.items||{}).length){
  await page.waitForFunction(()=>!!window.LE_GROUP_FOUR_AUDIO?.["p01/intro"],null,{timeout:20000});
  const voices=await page.evaluate(()=>Object.keys(window.LE_GROUP_FOUR_AUDIO||{}));
  assert(voices.includes("p01/intro"));
 }

 assert.equal((await page.locator("#g4Title").innerText()).trim(),"What is");
 assert.equal(await page.locator("#g4SceneSteps button").count(),4);
 assert.equal((await page.locator("#g4MainEnglish").innerText()).trim(),"What is this word?");
 assert.equal(await page.locator("#g4ChapterTabs button").count(),3);
 assert.equal(await page.locator("#g4ChapterLines button").count(),6);
 assert.match(await page.locator("#g4Visual").innerText(),/مشهد توضيحي مؤقت/);
 assert.equal(await page.locator("#g4Visual img").count(),0);
 const sentence="What is this word?";
 await page.locator("#g4QuizOptions button").filter({hasText:sentence}).click();
 assert.match(await page.locator("#g4QuizFeedback").innerText(),/أحسنت/);
 const words=sentence.split(/\s+/);
 for(let i=0;i<words.length;i++) await page.locator('[data-g4-token="'+i+'"]').click();
 assert.match(await page.locator("#g4Progress").innerText(),/1 \/ 72/);
 await page.locator("#g4ChapterTabs [data-g4-chapter='1']").click();
 assert.match(await page.locator("#g4ChapterLines").innerText(),/Where is the bus stop/);
 if(Object.keys(voiceIndex.items||{}).length){
   await page.locator("#g4ChapterLines .g4StoryRow").first().click();
   await page.waitForFunction(()=>!!window.LE_GROUP_FOUR_AUDIO?.["chapters/c02/line-1"],null,{timeout:20000});
 }

 await page.locator("#g4StoryToggle").click();
 assert.equal(await page.locator("#g4StoryList .g4StoryRow").count(),2);
 await page.locator('[data-g4-pattern="17"]').first().click();
 assert.equal((await page.locator("#g4Title").innerText()).trim(),"Which one");
 if(Object.keys(voiceIndex.items||{}).length){
   await page.waitForFunction(()=>!!window.LE_GROUP_FOUR_AUDIO?.["p18/intro"],null,{timeout:20000});
 }

 assert.equal(await page.locator("#g4SceneSteps button").count(),4);
 assert.equal(await page.locator("#g4ChapterTabs button").count(),3);
 assert.equal(await page.locator("#g4Visual img").count(),0);
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
 assert.equal(overflow,false,"Mobile horizontal overflow");
 await page.reload({waitUntil:"networkidle"});
 await page.locator('[data-view="group-four"]').click();
 await page.locator("#g4PatternList .g4PatternChip").first().waitFor();
 assert.match(await page.locator("#g4Progress").innerText(),/1 \/ 72/);
 await page.locator('[data-view="group-three"]').click();
 await page.locator("#g3PatternList .g3PatternChip").first().waitFor();
 assert.equal(await page.locator("#g3PatternList .g3PatternChip").count(),18);
 await page.locator('[data-view="group-two"]').click();
 await page.locator("#g2PatternList .g2PatternChip").first().waitFor();
 assert.equal(await page.locator("#g2PatternList .g2PatternChip").count(),18);
 await page.locator('[data-view="group-one"]').click();
 await page.locator("#g1PatternList .g1PatternChip").first().waitFor();
 assert.equal(await page.locator("#g1PatternList .g1PatternChip").count(),18);
 assert.deepEqual(errors,[]);
 assert.deepEqual(bad,[]);
 console.log("OK mobile smoke: 18 group-four patterns, quiz, word builder, 3 chapter stories, progress, zero broken assets; groups one and two intact");
}finally{await browser.close()}
