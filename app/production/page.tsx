"use client";

import { useEffect, useState } from "react";
import { Aperture, BookOpen, ChevronLeft, ChevronRight, ImagePlus, LoaderCircle, Sparkles, WandSparkles, RefreshCw, Download } from "lucide-react";

const arcs = [
  { name: "The Boy Without a Shadow", range: "01–20", chapters: ["The Boy Who Cast Two Shadows","A Voice Beneath the Floor","The Night the Faceless Came","Permission","The First Awakening","The Girl Who Saw the Monster","A Thousand-Year-Old Voice","The Church's Black List","The Inquisitor Arrives","A Shadow That Bleeds","The Man Without a Reflection","The Price of Darkness","The Forgotten Pendant","The Village That Disappeared","A Name from the Beginning","The Heretic Knight","The Execution Order","A God in Chains","The First Eclipse","The Boy the Sun Feared"] },
  { name: "Church of False Light", range: "21–45", chapters: ["The Road to Solmire","A City Without Night","The Saint's Invitation","A Cage Made of Gold","The Inquisitor's Secret","The Chapel of Stolen Names","A Sermon for the Dead","The Sun Beneath the Cathedral"] },
  { name: "Forest That Remembers", range: "46–70", chapters: ["Where Trees Keep Secrets","The Path That Moves","A Thousand Borrowed Faces","The Hollow Sea"] },
  { name: "Blood of the Firstborn", range: "71–100", chapters: ["The Girl in the Old Memory","A Mother's Footsteps","The Shape of a Soul","The Shadow That Was Lost"] },
  { name: "Seven Broken Thrones", range: "101–130", chapters: ["The First Broken Throne","A God in the Ashes","The Clockwork of Fate","The Flame That Remembers"] },
  { name: "War of Two Heavens", range: "131–160", chapters: ["The Last Sermon","When Heaven Fell","The War Beneath the Sun","A World Unmade"] },
  { name: "End of All Shadows", range: "161–190", chapters: ["The Prison Is a World","The Name Before Names","The Sleeping Enemy","The Last Guardian"] },
  { name: "Last Dawn", range: "191–210", chapters: ["A Sky Without Gods","The Weight of Morning","What Remains of Us","The Last Shadow"] }
];
// Fill the complete 210-chapter roadmap while preserving every established title.
for (const arc of arcs) {
  const [start, end] = arc.range.split("–").map(Number);
  const existing = [...arc.chapters];
  arc.chapters = Array.from({ length: end - start + 1 }, (_, index) => existing[index] || "Untitled chapter " + (start + index));
}
const cast = [
  "Kael Veyr: 17, slim, messy black hair, pale skin, grey eyes, worn dark travel clothes. Quiet, stubborn, protective.",
  "Nythar: the First Shadow, towering living darkness, violet eyes, crown-like horns, broken luminous chains. Ancient and controlled.",
  "Mira Veyr: 13, dark braided hair, bright eyes, small pendant. Kind, brave, perceptive.",
  "Seraphine Valcrest: 22, silver hair, golden eyes, black gothic knight armor. Disciplined heretic knight.",
  "Lucien Vael: 46, white vestments, immaculate smile, sun sigil. Archbishop of the Dawn Dominion.",
  "Elyra Veyr: long black hair, hooded cloak, old pendant. Missing mother and memory-walker."
];
type Dialogue = { speaker: string; text: string; kind: "speech" | "thought" | "caption" | "shadow" };
type PanelScript = { title: string; prompt: string; dialogue: Dialogue[] };
type SavedChapter = { title: string; panels: PanelScript[]; updatedAt: string };
type Artwork = { index: number; title: string; url: string };

const dbName = "panelforge-chapter-art";
function openArtDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains("panels")) request.result.createObjectStore("panels", { keyPath: "key" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function readArt(chapterId: number): Promise<Artwork[]> {
  const db = await openArtDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction("panels", "readonly").objectStore("panels").getAll();
    request.onsuccess = () => { const all = request.result as Array<{key:string;chapterId:number;index:number;title:string;url:string}>; db.close(); resolve(all.filter(x => x.chapterId === chapterId).map(({index,title,url})=>({index,title,url})).sort((a,b)=>a.index-b.index)); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}
async function saveArt(chapterId: number, art: Artwork) {
  const db = await openArtDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("panels", "readwrite");
    tx.objectStore("panels").put({ key: chapterId + ":" + art.index, chapterId, ...art });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
function chapterNumber(arcIndex:number, chapterIndex:number) {
  return arcs.slice(0, arcIndex).reduce((sum, arc) => sum + arc.chapters.length, 0) + chapterIndex + 1;
}
function parseJson(raw: string) {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("The story generator returned an unreadable script. Please try again.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export default function ChapterProductionPage() {
  const [authReady,setAuthReady] = useState(false);
  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then(response => response.json())
      .then(data => {
        if (!active) return;
        if (data.user) setAuthReady(true);
        else window.location.href = "/";
      })
      .catch(() => { if (active) window.location.href = "/"; });
    return () => { active = false; };
  }, []);
  const [arcIndex,setArcIndex] = useState(0);
  const [chapterIndex,setChapterIndex] = useState(0);
  const [scripts,setScripts] = useState<PanelScript[]>([]);
  const [art,setArt] = useState<Artwork[]>([]);
  const [style,setStyle] = useState("Dark fantasy Korean manhwa");
  const [busy,setBusy] = useState<"script"|"art"|null>(null);
  const [progress,setProgress] = useState(0);
  const [message,setMessage] = useState("Choose any chapter, then create its script and artwork.");
  const [reference,setReference] = useState("");
  const [referencePreview,setReferencePreview] = useState("");
  const [editing,setEditing] = useState(true);
  const [error,setError] = useState("");
  const number = chapterNumber(arcIndex,chapterIndex);
  const title = arcs[arcIndex].chapters[chapterIndex];
  const key = "panelforge-production-script-" + number;
  const progressPercent = scripts.length ? Math.round((art.length/scripts.length)*100) : 0;

  useEffect(() => {
    let active = true;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedChapter;
        if (Array.isArray(parsed.panels) && active) setScripts(parsed.panels);
      } else setScripts([]);
    } catch { setScripts([]); }
    readArt(number).then(items => { if(active) setArt(items); }).catch(() => { if(active) setArt([]); });
    setProgress(0);
    setError("");
    return () => { active = false; };
  }, [key, number]);

  const updatePanel = (index:number, patch:Partial<PanelScript>) => {
    setScripts(previous => {
      const next = previous.map((panel,i) => i === index ? {...panel,...patch} : panel);
      try { localStorage.setItem(key, JSON.stringify({title,panels:next,updatedAt:new Date().toISOString()} satisfies SavedChapter)); } catch { setError("Your script is visible, but this browser could not save it. Export a backup before leaving."); }
      return next;
    });
  };
  const updateDialogue = (panelIndex:number, lineIndex:number, value:string) => {
    setScripts(previous => {
      const next = previous.map((panel,i) => i === panelIndex ? {...panel,dialogue:panel.dialogue.map((line,j)=>j===lineIndex?{...line,text:value}:line)} : panel);
      try { localStorage.setItem(key, JSON.stringify({title,panels:next,updatedAt:new Date().toISOString()} satisfies SavedChapter)); } catch { setError("Browser storage is full. Export your script before leaving."); }
      return next;
    });
  };
  const generateScript = async () => {
    if(busy) return;
    setBusy("script"); setError(""); setMessage("Abdiz is writing this chapter's scenes and dialogue…");
    try {
      const request = "Create a complete, original, canon-consistent manhwa chapter script for Chapter " + number + ": " + title + ". Arc: " + arcs[arcIndex].name + ". Return ONLY valid JSON, no markdown, with this exact shape: {\"panels\":[{\"title\":\"short shot label\",\"prompt\":\"detailed visual scene prompt in English, including setting, camera, action, expressions, lighting and character appearance; no text in image\",\"dialogue\":[{\"speaker\":\"NAME or NARRATION\",\"text\":\"short natural line\",\"kind\":\"speech|thought|caption|shadow\"}]}]}. Produce exactly 8 sequential panels. Each panel needs a distinct visual beat and 0-3 dialogue lines. Use the supplied canon; do not skip the chapter's title premise. Maintain continuity, meaningful pacing, a compelling opening and a strong ending hook. Do not rush major revelations. Do not repeat Chapter 1. If this chapter is only an outline, develop it into a full scene while preserving established canon.\nSERIES: The God Beneath My Shadow. A dark fantasy story in Eryndor. The Dawn Dominion's Church teaches that light is purity and hunts Hollowborn. Nine Primordials shaped reality. Nythar embodies shadow and memory. Umbracore power costs memories first, then emotion, identity, and eventually the boundary between vessel and god.\nCAST: " + cast.join("\n") + "\nIMPORTANT: Kael is Nythar's vessel; Mira is his younger sister; Seraphine is a knight whose shadow vanished; Lucien steals innocent shadows; Elyra can travel through memories. Do not change these facts.";
      const response = await fetch("/api/abdiz",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:request}],project:{title:"The God Beneath My Shadow",genre:"Dark fantasy manhwa",chapter:number,chapterTitle:title,arc:arcs[arcIndex].name,characters:cast,lore:["Nine Primordials","Dawn Dominion","Umbracore power exacts a memory cost","Nythar is the First Shadow"]}})});
      const data = await response.json();
      if(!response.ok) throw new Error(data.error || "Story generation failed.");
      const parsed = parseJson(data.reply);
      if(!Array.isArray(parsed.panels) || parsed.panels.length < 6) throw new Error("The generated chapter did not contain enough panels. Please generate the script again.");
      const next = parsed.panels.slice(0,10).map((p: any,i:number)=>({
        title: typeof p.title==="string" ? p.title : "Scene " + (i+1),
        prompt: typeof p.prompt==="string" ? p.prompt : "",
        dialogue: Array.isArray(p.dialogue) ? p.dialogue.slice(0,3).map((d:any)=>({speaker:String(d.speaker||"NARRATION"),text:String(d.text||""),kind:["speech","thought","caption","shadow"].includes(d.kind)?d.kind:"speech"})) : []
      }));
      setScripts(next);
      localStorage.setItem(key,JSON.stringify({title,panels:next,updatedAt:new Date().toISOString()} satisfies SavedChapter));
      setMessage("Chapter script ready: " + next.length + " panels with editable dialogue and narration.");
    } catch(e) { setError(e instanceof Error?e.message:"Could not create the chapter script."); setMessage("Script generation stopped."); }
    finally { setBusy(null); }
  };
  const generateArtwork = async (regenerate=false) => {
    if(busy || !scripts.length) return;
    setBusy("art"); setError(""); setProgress(0);
    try {
      for(let i=0;i<scripts.length;i++) {
        if(!regenerate && art.some(item=>item.index===i)) { setProgress(i+1); continue; }
        setMessage("Illustrating panel " + (i+1) + " of " + scripts.length + ": " + scripts[i].title);
        const prompt = "Create one finished vertical Korean manhwa illustration for this exact scene. Preserve the character appearances and the visual continuity of this chapter. SCENE: " + scripts[i].prompt + "\nSERIES ART STYLE: " + style + ". CHARACTER CANON: " + cast.join(" ") + "\nDo not render any text, lettering, speech bubbles, captions, logos, watermarks, title cards or collage. The scene prompt is the primary instruction.";
        const response = await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt,imageBase64:reference})});
        const data = await response.json();
        if(!response.ok) throw new Error(data.error || ("Image generation failed at panel " + (i+1) + "."));
        if(!data.imageUrl) throw new Error("The image service returned no image for panel " + (i+1) + ".");
        const item = {index:i,title:scripts[i].title,url:data.imageUrl};
        await saveArt(number,item);
        setArt(previous=>[...previous.filter(x=>x.index!==i),item].sort((a,b)=>a.index-b.index));
        setProgress(i+1);
      }
      setMessage("Artwork complete. " + scripts.length + " panels are saved for Chapter " + number + ".");
    } catch(e) { setError(e instanceof Error?e.message:"Artwork generation stopped."); setMessage("You can resume later; completed panels are saved."); }
    finally { setBusy(null); }
  };
  const uploadReference = async (file?:File) => {
    if(!file) return;
    if(!file.type.startsWith("image/")) {setError("Choose a JPG, PNG or WEBP image.");return;}
    try {
      const bitmap=await createImageBitmap(file);
      const scale=Math.min(1,768/Math.max(bitmap.width,bitmap.height));
      const canvas=document.createElement("canvas"); canvas.width=Math.round(bitmap.width*scale); canvas.height=Math.round(bitmap.height*scale);
      const ctx=canvas.getContext("2d"); if(!ctx) throw new Error("Could not prepare the reference image.");
      ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
      let data=canvas.toDataURL("image/jpeg",.48); let encoded=data.split(",")[1]||"";
      if(encoded.length>1400000){data=canvas.toDataURL("image/jpeg",.32);encoded=data.split(",")[1]||"";}
      if(encoded.length>1400000) throw new Error("Reference is too large. Choose a smaller picture.");
      setReference(encoded);setReferencePreview(data);setError("");
    } catch(e) {setError(e instanceof Error?e.message:"Could not load the reference image.");}
  };
  const downloadScript = () => {
    const blob=new Blob([JSON.stringify({chapter:number,title,arc:arcs[arcIndex].name,panels:scripts},null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="panelforge-chapter-"+number+"-script.json";a.click();URL.revokeObjectURL(url);
  };
  const downloadArt = (item:Artwork) => {const a=document.createElement("a");a.href=item.url;a.download="chapter-"+number+"-panel-"+(item.index+1)+".jpg";a.click();};

  if(!authReady) return <main className="production-page"><div className="production-wrap"><p>Checking your secure workspace…</p></div></main>;

  return <main className="production-page">
    <header className="production-top"><a href="/" className="production-brand"><Aperture size={22}/> PanelForge <em>AI</em></a><a href="/" className="back-link"><ChevronLeft size={16}/> Workspace</a></header>
    <div className="production-wrap">
      <div className="production-heading"><div className="eyebrow">AI STORYBOARD + IMAGE WORKSHOP · 210 CHAPTERS</div><h1>Every chapter becomes <em>a manhwa.</em></h1><p>Choose any chapter. Abdiz creates its scene script, dialogue and narration; the image generator then illustrates each panel in sequence.</p></div>
      <section className="chapter-select">
        <label>STORY ARC<select value={arcIndex} onChange={e=>{setArcIndex(Number(e.target.value));setChapterIndex(0);}}>{arcs.map((a,i)=><option value={i} key={a.name}>{String(i+1).padStart(2,"0")} · {a.name}</option>)}</select></label>
        <label>CHAPTER<select value={chapterIndex} onChange={e=>setChapterIndex(Number(e.target.value))}>{arcs[arcIndex].chapters.map((c,i)=><option value={i} key={c}>Chapter {String(chapterNumber(arcIndex,i)).padStart(3,"0")} · {c}</option>)}</select></label>
        <div className="selected-chapter"><span>SELECTED</span><b>Chapter {String(number).padStart(3,"0")}</b><small>{title}</small></div>
      </section>
      <section className="tool-card">
        <div className="tool-card-heading"><div><div className="eyebrow">STEP 01 · STORY + LETTERING</div><h2>Generate the chapter text</h2><p>Creates 8 sequential scenes with visual direction, dialogue and narration. You can edit every line before illustration.</p></div><BookOpen size={25}/></div>
        <div className="action-row"><button className="primary-action" disabled={!!busy} onClick={()=>void generateScript()}><Sparkles size={17}/>{busy==="script"?"Writing chapter…":scripts.length?"Regenerate chapter script":"Generate chapter script"}</button>{scripts.length>0&&<button className="secondary-action" onClick={downloadScript}><Download size={16}/> Export script</button>}</div>
        {scripts.length>0&&<><div className="script-toolbar"><b>{scripts.length} panels · {scripts.reduce((n,p)=>n+p.dialogue.length,0)} dialogue/narration lines</b><button onClick={()=>setEditing(!editing)}>{editing?"Hide editors":"Edit script"}</button></div><div className="script-grid">{scripts.map((panel,i)=><article className="script-panel" key={i}><div className="script-panel-top"><span>SCENE {String(i+1).padStart(2,"0")}</span><b>{panel.title}</b></div><label>ILLUSTRATION DIRECTION<textarea value={panel.prompt} onChange={e=>updatePanel(i,{prompt:e.target.value})}/></label>{editing&&<div className="dialogue-editor"><b>DIALOGUE + NARRATION</b>{panel.dialogue.map((line,j)=><label key={j}><small>{line.speaker} · {line.kind}</small><textarea rows={2} value={line.text} onChange={e=>updateDialogue(i,j,e.target.value)}/></label>)}<button onClick={()=>updatePanel(i,{dialogue:[...panel.dialogue,{speaker:"NARRATION",text:"",kind:"caption"}]})}>+ Add lettering line</button></div>}</article>)}</div></>}
      </section>
      <section className="tool-card">
        <div className="tool-card-heading"><div><div className="eyebrow">STEP 02 · VISUAL PRODUCTION</div><h2>Generate the panel artwork</h2><p>Artwork is generated one panel at a time. Completed images are saved in this browser so an interrupted chapter can resume.</p></div><WandSparkles size={25}/></div>
        <div className="art-controls"><label>ART STYLE<select value={style} onChange={e=>setStyle(e.target.value)}><option>Dark fantasy Korean manhwa</option><option>Clean anime illustration</option><option>Painterly fantasy illustration</option><option>Black and white manga ink</option><option>Webtoon cel-shaded colour</option></select></label><label className="reference-control">CHARACTER REFERENCE<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>void uploadReference(e.target.files?.[0])}/>{referencePreview&&<img src={referencePreview} alt="Character reference preview"/>}</label></div>
        <div className="action-row"><button className="primary-action" disabled={!!busy||!scripts.length} onClick={()=>void generateArtwork(false)}><ImagePlus size={17}/>{busy==="art"?"Generating artwork…":art.length?"Generate missing panels":"Generate all panel images"}</button><button className="secondary-action" disabled={!!busy||!scripts.length||!art.length} onClick={()=>{if(window.confirm("Replace every existing image for this chapter?"))void generateArtwork(true);}}><RefreshCw size={15}/> Regenerate all</button><span className="completion-count">{art.length}/{scripts.length||0} complete</span></div>
        <div className="progress-track"><i style={{width:progressPercent+"%"}}/></div><p className="status-message">{busy==="art"?<LoaderCircle size={15} className="spin"/>:<Sparkles size={15}/>} {message}</p>
        {art.length>0&&<div className="art-grid">{art.map(item=><article className="art-card" key={item.index}><div className="art-frame"><img src={item.url} alt={item.title}/><div className="lettering-overlay">{(scripts[item.index]?.dialogue||[]).filter(line=>line.text.trim()).map((line,j)=><div className={"bubble "+line.kind} key={j}><small>{line.speaker}</small><span>{line.text}</span></div>)}</div></div><div className="art-caption"><b>Panel {String(item.index+1).padStart(2,"0")}</b><span>{item.title}</span><button onClick={()=>downloadArt(item)} aria-label="Download panel"><Download size={15}/></button></div></article>)}</div>}
      </section>
      <div className="production-note"><b>Generation limits and saving</b><span>Text and scripts are saved in this browser. Panel images are stored in browser IndexedDB, not shared cloud storage yet. The image service currently allows up to 12 image requests per hour per IP, and Cloudflare's own daily free allowance also applies. Generate a chapter's images in batches; completed panels remain saved if you stop.</span></div>
      {error&&<div className="production-error">{error}</div>}
    </div>
    <style jsx global>{`
      .production-page{min-height:100vh;background:#0d0b12;color:#f4efff;font-family:Arial,sans-serif;padding-bottom:70px}
      .production-top{height:70px;border-bottom:1px solid #2a2435;display:flex;align-items:center;justify-content:space-between;padding:0 max(22px,calc((100vw - 1160px)/2));background:#100d17}
      .production-brand,.back-link{display:flex;align-items:center;gap:9px;color:#f4efff;text-decoration:none;font-weight:750}.production-brand em{color:#b79aff;font-style:normal}.back-link{font-size:13px;color:#b9aecb}
      .production-wrap{max-width:1160px;margin:auto;padding:34px 22px}.production-heading{max-width:760px;margin-bottom:28px}.production-heading h1{font-size:clamp(34px,5vw,54px);line-height:1.06;margin:12px 0}.production-heading h1 em{color:#b69aff;font-style:normal}.production-heading p,.tool-card-heading p{color:#a99eb8;line-height:1.65}
      .eyebrow{font-size:10px;letter-spacing:1.6px;color:#ae91ee;font-weight:800}
      .chapter-select{display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:14px;padding:18px;border:1px solid #342a43;border-radius:16px;background:#15111d;margin-bottom:20px}
      .chapter-select label,.art-controls label{display:flex;flex-direction:column;gap:8px;font-size:10px;letter-spacing:1px;color:#ad9bc7;font-weight:800}
      .chapter-select select,.art-controls select{background:#211a2b;color:#f4efff;border:1px solid #453858;border-radius:9px;padding:12px;font-size:14px;min-width:0}
      .selected-chapter{display:flex;flex-direction:column;gap:4px;justify-content:center;padding-left:14px;border-left:1px solid #342a43}.selected-chapter span{font-size:9px;color:#a88be7;letter-spacing:1px}.selected-chapter b{font-size:14px}.selected-chapter small{color:#a99eb8}
      .tool-card{background:#15111d;border:1px solid #30263d;border-radius:17px;padding:22px;margin:18px 0}.tool-card-heading{display:flex;justify-content:space-between;gap:18px;align-items:flex-start}.tool-card-heading h2{font-size:22px;margin:8px 0}.tool-card-heading>svg{color:#b59aff;flex-shrink:0}
      .action-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:18px 0}.primary-action,.secondary-action{border:0;border-radius:10px;padding:12px 16px;display:inline-flex;align-items:center;gap:8px;font-weight:750;cursor:pointer}.primary-action{background:#8c6bd5;color:white}.primary-action:disabled,.secondary-action:disabled{opacity:.45;cursor:not-allowed}.secondary-action{background:#251d31;color:#ded1f7;border:1px solid #443657}.completion-count{font-size:12px;color:#b6a9c9}
      .script-toolbar{display:flex;justify-content:space-between;align-items:center;border-top:1px solid #30263d;padding-top:15px;color:#d9cdec;font-size:12px}.script-toolbar button,.dialogue-editor button{border:1px solid #4a3b60;border-radius:8px;padding:8px 11px;background:#211a2b;color:#d9c8f8}
      .script-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}.script-panel{background:#1b1524;border:1px solid #392d49;border-radius:12px;padding:14px;min-width:0}.script-panel-top{display:flex;gap:10px;flex-direction:column;margin-bottom:12px}.script-panel-top span{font-size:9px;color:#a78be9;letter-spacing:1px}.script-panel-top b{font-size:14px}.script-panel label,.dialogue-editor label{display:flex;flex-direction:column;gap:6px;margin:10px 0;font-size:9px;letter-spacing:1px;color:#ae9dc5}
      .script-panel textarea,.dialogue-editor textarea{width:100%;box-sizing:border-box;background:#100d17;color:#eee7f8;border:1px solid #40334f;border-radius:8px;padding:10px;min-height:88px;font:12px/1.5 Arial,sans-serif;letter-spacing:0;resize:vertical}
      .dialogue-editor{border-top:1px solid #3a2e49;margin-top:12px;padding-top:12px}.dialogue-editor>b{font-size:9px;letter-spacing:1px;color:#b89cf4}.dialogue-editor label small{font-size:9px}
      .art-controls{display:flex;gap:18px;align-items:flex-start;flex-wrap:wrap}.art-controls>label{min-width:220px;flex:1}.reference-control input{color:#d6c7ee;font-size:12px}.reference-control img{width:110px;height:110px;object-fit:cover;border-radius:10px;border:1px solid #55446b}
      .progress-track{height:5px;border-radius:10px;background:#30263d;overflow:hidden}.progress-track i{display:block;height:100%;background:#a88be9;transition:width .25s}.status-message{display:flex;align-items:center;gap:8px;color:#bcaed0;font-size:12px;min-height:20px}.status-message svg{color:#b89cf4}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
      .art-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}.art-card{background:#1b1524;border:1px solid #3a2d4b;border-radius:12px;overflow:hidden;min-width:0}.art-frame{position:relative;background:#08070a}.art-frame img{display:block;width:100%;height:auto;max-height:720px;object-fit:contain}.lettering-overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-start;gap:7px;padding:14px;pointer-events:none}.bubble{max-width:85%;background:#f7f4ed;color:#17131b;border-radius:13px;padding:8px 11px;box-shadow:0 2px 10px #0008;font-size:12px;line-height:1.3}.bubble small{display:block;font-size:8px;font-weight:800;letter-spacing:.7px;color:#655b70;margin-bottom:3px}.bubble.thought{border-radius:18px;background:#e8e1f7}.bubble.caption{align-self:center;background:#17131be8;color:#fff;border:1px solid #76658d}.bubble.shadow{background:#211a2b;color:#eee4ff;border:1px solid #9d80d6}.art-caption{display:flex;gap:9px;align-items:center;padding:11px;font-size:11px}.art-caption b{white-space:nowrap;color:#bfa7fa}.art-caption span{flex:1;color:#d9cde9}.art-caption button{background:transparent;border:0;color:#c7b1f5;padding:5px}
      .production-note{display:flex;flex-direction:column;gap:7px;background:#171321;border:1px solid #413354;border-radius:12px;padding:16px;color:#a99eb8;font-size:12px;line-height:1.6}.production-note b{color:#d9c8f8}.production-error{margin-top:15px;padding:13px;border-radius:10px;background:#321b24;color:#ffbdc7;border:1px solid #703543}
      @media(max-width:720px){.chapter-select{grid-template-columns:1fr}.selected-chapter{border-left:0;border-top:1px solid #342a43;padding:12px 0 0}.script-grid,.art-grid{grid-template-columns:1fr}.tool-card{padding:16px}.production-wrap{padding:25px 14px}.production-heading h1{font-size:36px}}
    `}</style>
  </main>;
}
