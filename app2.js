'use strict';
const $=id=>document.getElementById(id);
let cache={},all=[],pool=[],session=[],idx=0,ok=0,bad=0,wrongRound=[],round=0,locked=false,active=false,sessionMode='E2C',firstResult='',autoReview=true,sourceLabel='';
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
let wrong=read('vt_wrong',[]);if(!Array.isArray(wrong))wrong=[];
let history=read('vt_history',[]);if(!Array.isArray(history))history=[];
function persist(){try{localStorage.setItem('vt_wrong',JSON.stringify(wrong));localStorage.setItem('vt_history',JSON.stringify(history))}catch{$('storageNote').textContent='瀏覽器無法保存紀錄；關閉頁面後可能遺失。'}}
function key(x){return x.word+'|'+x.definition}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function unique(a){return [...new Map(a.map(x=>[key(x),x])).values()]}
function syncWrong(){ $('review').textContent=`錯題本（${wrong.length}）`;$('review').disabled=!wrong.length}
function info(){const p=cache[$('level').value]||[];$('poolInfo').textContent=`可練習 ${p.length} 個詞條 · 本次抽題不重複`+($('level').value.startsWith('L6 高頻必會')?'。精選依閱讀實用性挑選，非歷屆出題頻率排名。':'')}
function start(review=false){if(active&&!confirm('重新開始會結束這次測驗，要繼續嗎？'))return;
 pool=review?unique(wrong):cache[$('level').value]||[];if(!pool.length)return;
 session=shuffle(pool).slice(0,$('count').value==='all'?pool.length:Number($('count').value));sessionMode=$('mode').value;autoReview=$('auto').checked;sourceLabel=review?'錯題本':$('level').value;round=0;firstResult='';active=true;beginRound();}
function beginRound(){idx=0;ok=0;bad=0;wrongRound=[];$('summary').textContent='';render()}
function answerText(x){return sessionMode==='E2C'?x.definition:x.word}
function render(){const it=session[idx];locked=false;$('stage').textContent=round?`錯題複習 · 第 ${round} 輪`:`${sourceLabel} · 首次測驗`;
 $('progressText').textContent=`${idx+1} / ${session.length}`;$('score').textContent=`答對 ${ok} · 答錯 ${bad}`;$('progress').value=idx/session.length*100;
 $('prompt').textContent=sessionMode==='E2C'?it.word:it.definition;$('ipa').textContent=sessionMode==='E2C'?(it.ipa||''):'';
 $('feedback').textContent='';$('choices').replaceChildren();$('next').classList.add('hidden');$('reveal').classList.remove('hidden');$('spellForm').classList.toggle('hidden',sessionMode!=='SPELL');$('spelling').value='';$('spelling').disabled=false;$('spellForm').querySelector('button').disabled=false;
 if(sessionMode==='SPELL'){$('spelling').focus();return}
 const correct=answerText(it);const seen=new Set([correct]);const candidates=shuffle([...pool,...all]).filter(x=>{const t=answerText(x);if(x.word===it.word||seen.has(t))return false;seen.add(t);return true}).slice(0,3);
 shuffle([it,...candidates]).forEach((x,i)=>{const b=document.createElement('button');b.className='choice';b.textContent=`${i+1}. ${answerText(x)}`;b.dataset.answer=answerText(x);b.onclick=()=>grade(answerText(x)===correct,b);$('choices').append(b)})}
function grade(correct,button){if(!active||locked)return;locked=true;const it=session[idx];if(correct){ok++;wrong=wrong.filter(x=>key(x)!==key(it))}else{bad++;wrongRound.push(it);wrong=unique([...wrong,it]);if(button)button.classList.add('wrong')}
 for(const b of $('choices').children){b.disabled=true;if(b.dataset.answer===answerText(it))b.classList.add('correct')}
 $('spelling').disabled=true;$('spellForm').querySelector('button').disabled=true;$('feedback').textContent=`${correct?'✓ 答對了':'✕ 已記入錯題'}　${it.word} ${it.ipa||''} — ${it.definition}`;
 $('score').textContent=`答對 ${ok} · 答錯 ${bad}`;$('progress').value=(idx+1)/session.length*100;$('reveal').classList.add('hidden');$('next').classList.remove('hidden');$('next').textContent=idx+1===session.length?'完成本輪 →':'下一題 →';persist();syncWrong()}
function finish(){const rate=Math.round(ok/session.length*100);if(!round){firstResult=`首次測驗：${session.length} 題，答對 ${ok} 題，正確率 ${rate}%。`;history.unshift({date:new Date().toLocaleString('zh-TW'),text:firstResult});history=history.slice(0,20);persist();showHistory()}
 if(wrongRound.length&&autoReview){const n=wrongRound.length;round++;session=shuffle(wrongRound);beginRound();$('feedback').textContent=`上一輪還有 ${n} 題不熟，現在開始複習。${firstResult}`;return}
 active=false;$('prompt').textContent=wrongRound.length?'這一輪完成了。':'這次的單字都答對了！';$('ipa').textContent='';$('choices').replaceChildren();$('spellForm').classList.add('hidden');$('next').classList.add('hidden');$('reveal').classList.add('hidden');$('feedback').textContent='';$('summary').textContent=firstResult+(round?` 已完成 ${round} 輪錯題複習。`:'')+(wrongRound.length?` 還有 ${wrongRound.length} 題留在錯題本。`:' 可以開始下一次練習。');}
function showHistory(){$('history').textContent=history.length?`最近測驗 · ${history[0].date} · ${history[0].text}`:'題庫來源：你上傳的大考中心詞彙表。'}
$('start').onclick=()=>start();$('review').onclick=()=>start(true);$('level').onchange=info;
$('next').onclick=()=>{if(!locked)return;if(idx+1===session.length)finish();else{idx++;render()}};
$('reveal').onclick=()=>grade(false);
$('spellForm').onsubmit=e=>{e.preventDefault();if(!$('spelling').value.trim())return;const ans=$('spelling').value.trim().toLowerCase();const word=session[idx].word.toLowerCase();const variants=[word,...word.split('/'),word.replace(/\([^)]*\)/g,'')];grade(variants.includes(ans))};
function tab(roots){$('quizView').classList.toggle('hidden',roots);$('rootsView').classList.toggle('hidden',!roots);$('quizTab').classList.toggle('active',!roots);$('rootsTab').classList.toggle('active',roots)}
$('quizTab').onclick=()=>tab(false);$('rootsTab').onclick=()=>tab(true);
const roots=[["字首", "trans-", "跨越、傳遞；轉換", [["transmit", "傳送；傳播"], ["transition", "過渡；轉變"], ["transformation", "轉變；變形"]], "transmit：把東西傳到另一邊 → 傳送。transformation：形式的轉變。", "同一字首有不同引申義，不能一律翻成「穿越」。"], ["字首", "pre-", "在前、預先", [["prediction", "預測"], ["predecessor", "前任"], ["prescription", "處方；規定"]], "prediction：預先說出 → 預測；prescription 可搭配 prescribe「規定；開處方」一起記。", "這裡是字源記憶線索；中文仍須記整個字的慣用義。"], ["字首", "dis-", "不、相反；分開、移開", [["distrust", "不信任"], ["disable", "使失去能力"], ["displace", "移開；取代"]], "distrust：不信任；displace：從原本的位置移開。", "先辨認是否真有這個字首，不能只看開頭幾個字母。"], ["字首", "sub-", "在下、較低階", [["subordinate", "下級的；隸屬的"]], "subordinate：位階較下 → 下級的。先用這個直接的例字建立記憶。", "subsequent「隨後的」中的 sub- 是「緊接在後」；不要硬解成「在下」。"], ["字根", "dict", "說、口述", [["dictate", "口授；命令"], ["dictator", "獨裁者"], ["contradict", "反駁；與……矛盾"]], "contradict：contra-「相反」＋ dict「說」→ 反著說 → 反駁。", "「命令」是 dictate 等字的引申義，dict 的核心先記「說」。"], ["字根", "tract", "拉、牽引", [["distract", "使分心"], ["distraction", "分心"], ["extract", "抽出；提煉"]], "distract：把注意力拉開 → 分心；extract：往外拉 → 抽出。", "abstraction 雖有相關字源，但「抽象」的引申較遠，先不要用它當第一個拆字範例。"], ["字根", "scrib / script", "寫", [["prescribe", "規定；開處方"], ["prescription", "處方；規定"], ["transcript", "抄本；成績單"]], "prescribe：預先寫下指示 → 規定／開處方；transcript：轉寫下來的文字 → 抄本。", "scrib、script 是相關形式；prescribe → prescription 的拼字也會改變。"], ["字根", "ject", "投、丟", [["inject", "注射；注入"], ["injection", "注射"], ["projection", "投射；預測"]], "inject：in-「向內」＋ ject「投」→ 注入；injection 是它的名詞。", "subjective「主觀的」有較長的語義演變，不適合直接推成「向下丟」。"], ["字根", "cred", "相信", [["credible", "可信的"], ["credibility", "可信度"]], "credible「可信的」→ credibility「可信度」：把形容詞和名詞成對記。", "credible 是「讓人相信的」，不是「容易輕信別人的」。"], ["字根", "vert / vers", "轉、轉向", [["divert", "轉移；使分心"], ["diversion", "轉移；娛樂"], ["diversity", "多樣性"]], "divert：轉向別處 → 轉移；divert → diversion 是相關詞族。", "diversity 可從 diverse「多元的」一起記；字義不是單純的「轉」。"], ["字尾", "-tion / -sion", "常形成名詞：動作、過程或結果", [["transmission", "傳輸；傳送"], ["contradiction", "矛盾"]], "transmit → transmission；contradict → contradiction。先辨認名詞，再記整個詞義。", "這是常見拼字形式的教學分組；加字尾時可能改變字幹，不能只把字母接上。"], ["字尾", "-ment", "常形成名詞：行為、結果或狀態", [["assessment", "評估"], ["commitment", "承諾；投入"]], "assess → assessment；commit → commitment。", "字尾提供詞性線索，不代表每個字都能直接用「行為」翻譯。"], ["字尾", "-ity", "常形成名詞：性質、狀態", [["credibility", "可信度"], ["diversity", "多樣性"]], "credible → credibility；diverse → diversity。", "拼字可能改變：不要寫成 credibleity 或 diverseity。"], ["字尾", "-able / -ible", "常形成形容詞：可……的、能……的", [["accessible", "可接近的；可取得的"], ["applicable", "適用的"], ["credible", "可信的"]], "accessible：可取得的；applicable：適用的；credible：可信的。", "這些例字可用「可……」輔助理解，但不是所有以 -able／-ible 結尾的字都能照字面推義。"], ["字尾", "-ize / -ify", "常形成動詞：使成為、使具有……性質", [["authorize", "授權"], ["civilize", "使文明"], ["diversify", "使多樣化"], ["unify", "統一"]], "civilize：使文明；diversify：使多樣化；unify：使統一。", "屬於兩種不同字尾；實際拼字和詞義仍須分別記憶。"]];
for(const category of ['字首','字根','字尾']){
 const section=document.createElement('section');section.className='root-section';
 const title=document.createElement('h3');title.textContent=category==='字首'?'01 字首 · 先抓方向':category==='字根'?'02 字根 · 抓核心畫面':'03 字尾 · 判斷常見詞性';section.append(title);
 const grid=document.createElement('div');grid.className='root-grid';
 for(const [type,root,meaning,examples,memory,note]of roots.filter(x=>x[0]===category)){
  const card=document.createElement('article');card.className='root';
  const tag=document.createElement('span');tag.className='root-tag';tag.textContent=type;
  const heading=document.createElement('h4');heading.textContent=root;
  const core=document.createElement('p');core.className='root-meaning';core.textContent=meaning;
  const list=document.createElement('ul');
  for(const [word,translation]of examples){const item=document.createElement('li');const en=document.createElement('strong');en.textContent=word;item.append(en,document.createTextNode('　'+translation));list.append(item)}
  const clue=document.createElement('p');clue.className='root-clue';clue.textContent='記憶線索：'+memory;
  const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='易錯提醒';const explanation=document.createElement('p');explanation.textContent=note;details.append(summary,explanation);
  card.append(tag,heading,core,list,clue,details);grid.append(card);
 }
 section.append(grid);$('rootCards').append(section);
}
async function init(){try{const res=await fetch('./vocab_cache.json');if(!res.ok)throw Error(res.status);const raw=await res.json();for(const [lv,items]of Object.entries(raw)){cache[lv]=unique(items.map(x=>{let definition=x.definition||x.answer||'',ipa=x.ipa||'';const m=definition.match(/^\[([^\]]+)\](.*)$/s);if(m){ipa=ipa||`[${m[1]}]`;definition=m[2]}return{word:x.word,definition:definition.trim(),ipa}}).filter(x=>x.word&&x.definition))}
 const priorityRes=await fetch('./high200.json');if(!priorityRes.ok)throw Error(priorityRes.status);const priority=await priorityRes.json();
 const priorityTitle='L6 高頻必會精選 200';const priorityItems=unique(priority.groups.flatMap(g=>g.items));if(priorityItems.length!==200)throw Error('精選題庫需有 200 字');
 const levelNames=Object.keys(cache).sort();all=unique(levelNames.filter(lv=>/^Level [1-6]$/.test(lv)).flatMap(lv=>cache[lv]));const mixedTitle='L1–L6 綜合練習';cache[mixedTitle]=all;cache[priorityTitle]=priorityItems;
 for(const g of priority.groups)cache[`${priorityTitle} · ${g.title}`]=g.items;
 $('level').replaceChildren();for(const lv of [...levelNames,mixedTitle,priorityTitle,...priority.groups.map(g=>`${priorityTitle} · ${g.title}`)]){const o=document.createElement('option');o.value=lv;o.textContent=lv;$('level').append(o)}$('level').value='Level 1';$('start').disabled=false;$('start').textContent='開始練習 →';syncWrong();info();showHistory()}catch{$('prompt').textContent='題庫載入失敗';$('feedback').textContent='請重新整理頁面，或稍後再試。';$('start').textContent='重新載入';$('start').disabled=false;$('start').onclick=()=>location.reload()}}
init();
