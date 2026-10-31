"use client";
import { useEffect, useMemo, useState } from "react";
import { Aperture, BookOpen, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clapperboard, Clock3, Command, Compass, Download, Eye, FileText, Film, FolderOpen, Gauge, ImagePlus, Layers3, Library, Menu, MessageSquare, MoreHorizontal, PanelTop, Plus, Search, Settings2, Sparkles, WandSparkles, X } from "lucide-react";

const arcs = [
 {name:"The Boy Without a Shadow",range:"01–20",chapters:["The Boy Who Cast Two Shadows","A Voice Beneath the Floor","The Night the Faceless Came","Permission","The First Awakening","The Girl Who Saw the Monster","A Thousand-Year-Old Voice","The Church's Black List","The Inquisitor Arrives","A Shadow That Bleeds","The Man Without a Reflection","The Price of Darkness","The Forgotten Pendant","The Village That Disappeared","A Name from the Beginning","The Heretic Knight","The Execution Order","A God in Chains","The First Eclipse","The Boy the Sun Feared"]},
 {name:"Church of False Light",range:"21–45",chapters:["The Road to Solmire","A City Without Night","The Saint's Invitation","A Cage Made of Gold","The Inquisitor's Secret","The Chapel of Stolen Names","A Sermon for the Dead","The Sun Beneath the Cathedral"]},
 {name:"Forest That Remembers",range:"46–70",chapters:["Where Trees Keep Secrets","The Path That Moves","A Thousand Borrowed Faces","The Hollow Sea"]},
 {name:"Blood of the Firstborn",range:"71–100",chapters:["The Girl in the Old Memory","A Mother's Footsteps","The Shape of a Soul","The Shadow That Was Lost"]},
 {name:"Seven Broken Thrones",range:"101–130",chapters:["The First Broken Throne","A God in the Ashes","The Clockwork of Fate","The Flame That Remembers"]},
 {name:"War of Two Heavens",range:"131–160",chapters:["The Last Sermon","When Heaven Fell","The War Beneath the Sun","A World Unmade"]},
 {name:"End of All Shadows",range:"161–190",chapters:["The Prison Is a World","The Name Before Names","The Sleeping Enemy","The Last Guardian"]},
 {name:"Last Dawn",range:"191–210",chapters:["A Sky Without Gods","The Weight of Morning","What Remains of Us","The Last Shadow"]}
];
const characters = [
 {name:"Kael Veyr",role:"Protagonist · 17",tag:"The vessel",desc:"Quiet, stubborn and fiercely protective. His shadow holds a power older than the gods—and every time he uses it, a memory disappears.",look:"Messy black hair · grey eyes · worn travel clothes",color:"violet",initials:"KV"},
 {name:"Nythar",role:"The First Shadow",tag:"Ancient god",desc:"A patient, terrifying intelligence chained inside Kael. It speaks like it has all the time in the world, and remembers less than it should.",look:"Living darkness · violet eyes · crown-like horns",color:"ink",initials:"NY"},
 {name:"Mira Veyr",role:"Kael's sister · 13",tag:"The seer",desc:"Kind, curious and brave. Mira can sense the emotions of living shadows—and sees Nythar as it truly is.",look:"Dark braided hair · bright eyes · pendant",color:"rose",initials:"MV"},
 {name:"Seraphine Valcrest",role:"Heretic knight · 22",tag:"The oathbreaker",desc:"A disciplined knight sent to execute Kael. Her own shadow vanished when she was a child.",look:"Silver hair · golden eyes · black gothic armor",color:"gold",initials:"SV"},
 {name:"Lucien Vael",role:"Archbishop · 46",tag:"The false saint",desc:"A charismatic ruler of the Dawn Dominion who sustains his long life by stealing the shadows of innocents.",look:"White vestments · immaculate smile · sun sigil",color:"ivory",initials:"LV"},
 {name:"Elyra Veyr",role:"The missing mother",tag:"The memory-walker",desc:"Kael and Mira's vanished mother. She can travel through memories preserved in shadows—and knows the truth of the prison.",look:"Long black hair · hooded cloak · old pendant",color:"slate",initials:"EV"}
];
const lore = [
 ["The Dawn Dominion","A continent-spanning empire ruled in the name of the Eternal Dawn. Its Church teaches that light is purity and darkness is corruption."],
 ["The Nine Primordials","Nine ancient forces shaped reality. They were neither good nor evil. Their war left the world scarred and their history buried."],
 ["Umbracore","Power drawn from the shadow within. Its five stages move from sensing shadows to becoming a primordial force. Every use exacts a price."],
 ["The price of power","Memory is the first thing taken. Then emotion, identity, and finally the boundary between the vessel and the god."]
];
const stages = ["Flicker","Manifestation","Dominion","Eclipse","Abyssal Crown"];
const CHARACTER_IMAGE_DB = "panelforge-character-store";
const CHARACTER_IMAGE_STORE = "images";
const openCharacterImageDB = () => new Promise<IDBDatabase>((resolve,reject) => {
 const request=indexedDB.open(CHARACTER_IMAGE_DB,1);
 request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(CHARACTER_IMAGE_STORE))db.createObjectStore(CHARACTER_IMAGE_STORE);};
 request.onsuccess=()=>resolve(request.result);
 request.onerror=()=>reject(request.error);
});
const readCharacterImages = async () => {
 const db=await openCharacterImageDB();
 return new Promise<Record<string,string>>((resolve,reject)=>{
  const request=db.transaction(CHARACTER_IMAGE_STORE,"readonly").objectStore(CHARACTER_IMAGE_STORE).getAll();
  request.onsuccess=()=>{const keys=request.result as string[];const keyRequest=db.transaction(CHARACTER_IMAGE_STORE,"readonly").objectStore(CHARACTER_IMAGE_STORE).getAllKeys();keyRequest.onsuccess=()=>{const result:Record<string,string>={};(keyRequest.result as IDBValidKey[]).forEach((key,i)=>{if(typeof key==="string"&&keys[i])result[key]=keys[i] as string;});db.close();resolve(result);};keyRequest.onerror=()=>{db.close();reject(keyRequest.error);};};
  request.onerror=()=>{db.close();reject(request.error);};
 });
};
const writeCharacterImage = async (name:string,data:string) => {
 const db=await openCharacterImageDB();
 return new Promise<void>((resolve,reject)=>{
  const tx=db.transaction(CHARACTER_IMAGE_STORE,"readwrite");
  tx.objectStore(CHARACTER_IMAGE_STORE).put(data,name);
  tx.oncomplete=()=>{db.close();resolve();};
  tx.onerror=()=>{db.close();reject(tx.error);};
  tx.onabort=()=>{db.close();reject(tx.error);};
 });
};
const panelPrompt = "Dark fantasy Korean manhwa panel, cinematic vertical composition, Kael Veyr, seventeen-year-old boy with messy black hair and grey eyes, standing in a rain-soaked medieval alley beneath a blood-red moon. Two shadows stretch behind him; one moves independently and turns its head. Deep ink blacks, restrained violet glow, intricate linework, atmospheric rain, dramatic chiaroscuro, detailed background, no text, no watermark.";

const chapterOnePanels = [
 {title:"The Kingdom Beneath the Red Moon",prompt:"Extreme wide establishing shot of Ashfall, a poor medieval mining district in the kingdom of Eryndor, ruined rooftops beneath an enormous blood-red moon, heavy diagonal rain, distant bell tower, thirteen ominous bells implied by atmosphere. No people in foreground. Dark fantasy Korean manhwa illustration, elegant fine ink linework, painterly cel shading, cinematic vertical webtoon panel, deep blacks, muted crimson and cold blue-grey palette, detailed architecture, no text, no lettering, no watermark."},
 {title:"The Walk Home",prompt:"Kael Veyr, a slim 17-year-old boy with messy black hair, pale skin, grey eyes and worn dark travel clothes, walking alone through a narrow rain-soaked medieval street carrying a small paper-wrapped loaf of bread close to his chest. Three-quarter rear view, wet cobblestones, warm window light, quiet melancholy. Keep Kael's face, hair and clothes consistent. Dark fantasy Korean manhwa, fine expressive ink lines, atmospheric vertical composition, no text, no watermark."},
 {title:"The Puddle",prompt:"Ground-level close-up of a rain puddle on uneven cobblestones reflecting Kael Veyr, a slim teenage boy with messy black hair and worn dark clothes, walking past. The reflection reveals TWO distinct shadows stretching behind him, one aligned with his body and a second shadow standing perfectly still and facing the opposite direction. Ominous subtle supernatural detail, crisp inked manhwa art, no text, no watermark."},
 {title:"An Empty Alley",prompt:"Kael Veyr, slim 17-year-old with messy black hair and grey eyes, has abruptly turned toward a narrow empty medieval alley. His expression is wary and confused. Rain runs from rooftops, the alley disappears into deep blackness, no creature visible. Cinematic over-the-shoulder shot, Korean dark fantasy manhwa, controlled fine linework and dramatic shadows, no text, no watermark."},
 {title:"You Have Grown",prompt:"A supernatural shadow on a wet stone wall, shaped like a teenage boy but subtly independent, its head tilted in a knowing smile while Kael Veyr stands blurred in foreground. The shadow's proportions are slightly wrong, its edges flow like living ink. Restrained violet glimmer in its eyes, unsettling quiet mood, detailed dark fantasy Korean manhwa ink art, no text, no watermark."},
 {title:"The Sister at the Door",prompt:"Interior of a tiny poor but warm medieval home lit by one oil lamp. Mira Veyr, a brave kind 13-year-old girl with dark braided hair and a small pendant, stands in the doorway looking at her older brother Kael Veyr, 17, messy black hair, pale face, grey eyes and worn dark clothes. Kael is standing unusually close to the wall; his detached shadow stretches behind him. Emotional expressive Korean manhwa panel, no text, no watermark."},
 {title:"Don't Tell Her",prompt:"Close-up of Kael Veyr's living shadow leaning toward the wall beside him, one finger raised in a silent shushing gesture. Kael, messy black hair and grey eyes, is partly visible looking startled; Mira is softly out of focus in the background, unaware. Oil-lamp light, ominous deep blacks, subtle violet accents, Korean dark fantasy manhwa illustration, no text, no watermark."},
 {title:"The Faceless",prompt:"A terrifying faceless creature stands in a rain-lashed Ashfall street outside a small timber house. Tall thin humanoid silhouette, smooth blank face with no features, unnaturally long arms, torn shadow-like cloak. Other vague silhouettes gather behind it. Dynamic low camera, dramatic rain, detailed horror-fantasy Korean manhwa art, no gore, no text, no watermark."},
 {title:"Mira Falls",prompt:"Inside the small timber home during an attack, Mira Veyr, 13, dark braided hair and pendant, lies injured but non-graphic on the wooden floor, reaching toward her brother. Kael Veyr, 17, messy black hair, grey eyes wide with fear, kneels beside her and reaches out desperately. Splintered doorway and dark creature silhouette in background. Powerful emotional close framing, Korean manhwa ink art, no graphic injury, no text, no watermark."},
 {title:"Take Everything",prompt:"Kael Veyr kneels beside his injured younger sister Mira in a dark ruined room, tears on his pale face, fists clenched as he begs the darkness for help. The oil lamp gutters; every shadow in the room bends toward him. Strong expressive eyes, dramatic close-up, restrained violet-black supernatural atmosphere, Korean dark fantasy manhwa, no text, no watermark."},
 {title:"The First Shadow Awakens",prompt:"Nythar, the First Shadow, emerges behind Kael Veyr as a towering humanoid being made of living black darkness, ancient crown-like horns, glowing violet eyes, body wrapped in broken luminous chains and floating runic symbols. Kael kneels in the foreground beside Mira. The room is swallowed by darkness, immense divine scale, beautiful intricate Korean manhwa linework, no text, no watermark."},
 {title:"The World Remembers",prompt:"A colossal godlike shadow rises behind Kael Veyr beneath the blood-red moon over Ashfall. Kael stands small in the foreground, messy black hair and grey eyes now glowing violet; black smoke and violet energy spiral upward, shattered chain fragments drift through the rain. Epic vertical cliffhanger composition, dark fantasy Korean manhwa, fine ink detail, no text, no watermark."}
];
type Tab = "Overview"|"Story bible"|"Characters"|"Chapters"|"Panel studio"|"Reader";
export default function Home() {
 const [tab,setTab] = useState<Tab>("Overview");
 const [arc,setArc] = useState(0);
 const [chapter,setChapter] = useState(0);
 const [query,setQuery] = useState("");
 const [notice,setNotice] = useState("");
 const [mobileOpen,setMobileOpen] = useState(false);
 const [prompt,setPrompt] = useState(panelPrompt);
 const [panelName,setPanelName] = useState("The Boy Who Cast Two Shadows");
 const [generatedPanels,setGeneratedPanels] = useState<{id:number;title:string;url:string}[]>([]);
 const [isGenerating,setIsGenerating] = useState(false);
 const [generationProgress,setGenerationProgress] = useState(0);
 const [generationMessage,setGenerationMessage] = useState("");
 const [referenceImage,setReferenceImage] = useState("");
 const [referencePreview,setReferencePreview] = useState("");
 const [artStyle,setArtStyle] = useState("Dark fantasy Korean manhwa");
 const [selectedCharacterName,setSelectedCharacterName] = useState("");
 const [characterPrompts,setCharacterPrompts] = useState<Record<string,string>>({});
 const [characterImages,setCharacterImages] = useState<Record<string,string>>({});
 useEffect(()=>{let active=true;try{const savedPrompts=localStorage.getItem("panelforge-character-prompts");if(savedPrompts)setCharacterPrompts(JSON.parse(savedPrompts));}catch{};(async()=>{try{const images=await readCharacterImages();if(Object.keys(images).length){if(active)setCharacterImages(images);}else{const legacy=localStorage.getItem("panelforge-character-images");if(legacy){const parsed=JSON.parse(legacy) as Record<string,string>;for(const [name,data] of Object.entries(parsed))await writeCharacterImage(name,data);if(active)setCharacterImages(parsed);localStorage.removeItem("panelforge-character-images");}}}catch{const legacy=localStorage.getItem("panelforge-character-images");if(legacy&&active){try{setCharacterImages(JSON.parse(legacy));}catch{}}}})();return()=>{active=false;};},[]);
 const saveCharacterPrompt = (name:string,value:string) => {setCharacterPrompts(previous=>{const next={...previous,[name]:value};try{localStorage.setItem("panelforge-character-prompts",JSON.stringify(next));}catch{}return next;});};
 const handleCharacterImageUpload = async (name:string,file?:File) => {
  if(!file)return;
  if(!file.type.startsWith("image/")){toast("Please choose an image file.");return;}
  if(file.size>12000000){toast("Please choose an image smaller than 12 MB.");return;}
  try{
   const bitmap=await createImageBitmap(file);
   const scale=Math.min(1,900/Math.max(bitmap.width,bitmap.height));
   const canvas=document.createElement("canvas");
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));
   canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const context=canvas.getContext("2d");
   if(!context){bitmap.close();toast("This browser could not prepare the image.");return;}
   context.fillStyle="#ffffff";
   context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   bitmap.close();
   const data=canvas.toDataURL("image/jpeg",0.72);
   const next={...characterImages,[name]:data};
   setCharacterImages(next);
   try{await writeCharacterImage(name,data);toast(name+" reference image saved on this device");}
   catch{toast(name+" image is visible now, but this browser could not save it. Check available device storage.");}
  }catch{toast("Could not read that image. Try a JPG or PNG file.");}
 };

 const handleReferenceUpload = async (file?: File) => {
  if (!file) return;
  if (!file.type.startsWith("image/")) { toast("Please choose an image file."); return; }
  if (file.size > 12000000) { toast("Please choose an image smaller than 12 MB."); return; }
  try {
   const bitmap = await createImageBitmap(file);
   const maxDimension = 1024;
   const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
   const canvas = document.createElement("canvas");
   canvas.width = Math.max(1, Math.round(bitmap.width * scale));
   canvas.height = Math.max(1, Math.round(bitmap.height * scale));
   const context = canvas.getContext("2d");
   if (!context) { bitmap.close(); toast("This browser could not prepare the image."); return; }
   context.fillStyle = "#ffffff";
   context.fillRect(0, 0, canvas.width, canvas.height);
   context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
   bitmap.close();
   let dataUrl = "";
   let encoded = "";
   for (const quality of [0.72, 0.62, 0.52, 0.42, 0.32]) {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
    encoded = dataUrl.split(",")[1] || "";
    if (encoded && encoded.length <= 1400000) break;
   }
   if (!encoded || encoded.length > 1400000) {
    const smaller = document.createElement("canvas");
    const smallerScale = 768 / Math.max(canvas.width, canvas.height);
    smaller.width = Math.max(1, Math.round(canvas.width * smallerScale));
    smaller.height = Math.max(1, Math.round(canvas.height * smallerScale));
    const smallerContext = smaller.getContext("2d");
    if (!smallerContext) { toast("This browser could not prepare the image."); return; }
    smallerContext.fillStyle = "#ffffff";
    smallerContext.fillRect(0, 0, smaller.width, smaller.height);
    smallerContext.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    dataUrl = smaller.toDataURL("image/jpeg", 0.48);
    encoded = dataUrl.split(",")[1] || "";
   }
   if (!encoded || encoded.length > 1400000) { toast("This image could not be compressed on this device. Try a JPG or PNG."); return; }
   setReferenceImage(encoded);
   setReferencePreview(dataUrl);
   toast("Character reference added");
  } catch {
   toast("Could not read that image. Try a JPG or PNG file.");
  }
 };
 useEffect(()=>{try{const saved=localStorage.getItem("panelforge-ch1-panels");if(saved)setGeneratedPanels(JSON.parse(saved));}catch{}},[]);
 const generateChapter = async()=>{if(isGenerating)return;setIsGenerating(true);setGenerationProgress(0);setGenerationMessage("Preparing Chapter 1...");try{for(let i=0;i<chapterOnePanels.length;i++){const scene=chapterOnePanels[i];setGenerationMessage("Generating panel "+(i+1)+" of "+chapterOnePanels.length+": "+scene.title);const response=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:scene.prompt + " Art direction: " + artStyle + ". Use the uploaded character reference image as the main visual guide. Keep the same character identity, face, hairstyle, eye colour, clothing and distinctive details consistent; adapt pose, expression and camera angle to this scene.",imageBase64:referenceImage})});const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not generate panel "+(i+1));if(!result.imageUrl)throw new Error("The image service did not return panel "+(i+1));const panel={id:i+1,title:scene.title,url:result.imageUrl};setGeneratedPanels(previous=>{const next=[...previous.filter(item=>item.id!==panel.id),panel].sort((a,b)=>a.id-b.id);try{localStorage.setItem("panelforge-ch1-panels",JSON.stringify(next));}catch{}return next;});setGenerationProgress(i+1);}setGenerationMessage("Chapter 1 artwork generated.");}catch(error){setGenerationMessage(error instanceof Error?error.message:"Something went wrong.");}finally{setIsGenerating(false);}};
 const activeArc = arcs[arc];
 const filtered = useMemo(()=>characters.filter(c=>(c.name+" "+c.role+" "+c.desc).toLowerCase().includes(query.toLowerCase())),[query]);
 const go = (t:Tab)=>{setTab(t);setMobileOpen(false);};
 const toast = (s:string)=>{setNotice(s);window.setTimeout(()=>setNotice(""),2600);};
 const copyPrompt = async()=>{try{await navigator.clipboard.writeText(prompt);toast("Panel prompt copied");}catch{toast("Select and copy the prompt manually");}};
 const nav: {name:Tab;icon:typeof Gauge}[]=[{name:"Overview",icon:Gauge},{name:"Story bible",icon:Library},{name:"Characters",icon:Eye},{name:"Chapters",icon:BookOpen},{name:"Panel studio",icon:Layers3},{name:"Reader",icon:PanelTop}];
 return <main className="app-shell">
  <aside className={mobileOpen?"sidebar mobile-show":"sidebar"}>
   <div className="brand"><div className="brand-mark"><Aperture size={21}/></div><div><b>panelforge<span>.ai</span></b><small>STORY TO SCREEN</small></div><button className="mobile-close" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div>
   <div className="workspace-label">WORKSPACE <ChevronDown size={13}/></div>
   <button className="project-switch"><div className="project-avatar">G</div><span><b>The God Beneath My Shadow</b><small>Manhwa project</small></span><MoreHorizontal size={16}/></button>
   <div className="nav-label">CREATE</div>
   <nav>{nav.map(n=><button key={n.name} className={tab===n.name?"nav-item active":"nav-item"} onClick={()=>go(n.name)}><n.icon size={17}/>{n.name}{n.name==="Panel studio"&&<span className="new-dot"/>}</button>)}</nav>
   <div className="sidebar-bottom"><div className="storage"><div className="storage-top"><span>PROJECT STORAGE</span><span>12%</span></div><div className="storage-track"><i/></div><small>1.2 GB of 10 GB used</small></div><button className="nav-item"><Settings2 size={17}/> Settings</button><button className="nav-item"><CircleHelp size={17}/> Help center</button><div className="profile"><div className="profile-pic">M</div><div><b>Creator workspace</b><small>Free plan · Prototype</small></div><MoreHorizontal size={17}/></div></div>
  </aside>
  {mobileOpen&&<div className="scrim" onClick={()=>setMobileOpen(false)}/>}
  <section className="main-area">
   <header className="topbar"><div className="crumb"><button className="mobile-menu" onClick={()=>setMobileOpen(true)}><Menu size={19}/></button><span>Workspace</span><ChevronRight size={14}/><b>{tab}</b></div><div className="top-actions"><div className="status-pill"><i/> All changes saved</div><button className="icon-btn" aria-label="Search"><Search size={18}/></button><button className="avatar-small">M</button></div></header>
   <div className="content">
    {tab==="Overview"&&<><div className="welcome-row"><div><div className="eyebrow"><Sparkles size={13}/> YOUR CREATIVE WORKSPACE</div><h1>Make something <em>legendary.</em></h1><p className="subhead">Your stories, characters and worlds—one frame at a time.</p></div><button className="primary-btn" onClick={()=>go("Chapters")}><Plus size={16}/> Continue creating</button></div>
     <div className="hero-project"><div className="hero-art"><div className="moon"/><div className="hero-silhouette"/><div className="hero-vertical">THE FIRST SHADOW</div><div className="hero-caption">A GOD IS WAITING<br/>IN THE DARK.</div><div className="hero-title">THE GOD<br/>BENEATH MY<br/><i>SHADOW</i></div><div className="hero-byline">AN ORIGINAL DARK FANTASY MANHWA</div></div><div className="hero-info"><div className="hero-topline"><span className="project-type">FEATURED PROJECT</span><span className="draft-tag">● IN DEVELOPMENT</span></div><h2>The God Beneath<br/>My Shadow</h2><p className="hero-desc">Some shadows follow their owners. Others are waiting for the right moment to replace them.</p><div className="genre-row"><span>Dark fantasy</span><span>Mystery</span><span>Action</span><span>Psychological</span></div><div className="hero-stats"><div><b>210</b><small>Planned chapters</small></div><div><b>08</b><small>Story arcs</small></div><div><b>06</b><small>Core characters</small></div></div><button className="light-btn" onClick={()=>go("Story bible")}>Open story bible <ChevronRight size={16}/></button></div></div>
     <div className="section-head"><div><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h2>Continue creating</h2></div><button className="text-btn" onClick={()=>go("Chapters")}>All chapters <ChevronRight size={15}/></button></div>
     <div className="quick-grid"><button className="quick-card" onClick={()=>go("Chapters")}><div className="quick-icon purple"><BookOpen size={19}/></div><div><b>Chapter 01</b><small>The Boy Who Cast Two Shadows</small><span>Storyboard ready to build</span></div><ChevronRight size={17}/></button><button className="quick-card" onClick={()=>go("Characters")}><div className="quick-icon orange"><Eye size={19}/></div><div><b>Character bible</b><small>6 main characters</small><span>Profiles and visual references</span></div><ChevronRight size={17}/></button><button className="quick-card" onClick={()=>go("Panel studio")}><div className="quick-icon blue"><Layers3 size={19}/></div><div><b>Panel studio</b><small>Turn scenes into frames</small><span>Image generation connection pending</span></div><ChevronRight size={17}/></button></div>
     <div className="bottom-grid"><div className="surface"><div className="section-head compact"><div><div className="eyebrow">THE BIG PICTURE</div><h2>Series roadmap</h2></div><span className="muted-count">8 arcs · 210 chapters</span></div><div className="arc-list">{arcs.map((a,i)=><button className="arc-row" key={a.name} onClick={()=>{setArc(i);setChapter(0);go("Chapters")}}><span className="arc-number">{String(i+1).padStart(2,"0")}</span><span className="arc-name">{a.name}</span><span className="arc-range">{a.range}</span><ChevronRight size={15}/></button>)}</div></div><div className="surface activity"><div className="eyebrow">STORY AT A GLANCE</div><h2>At the heart of it all.</h2><p>A boy begs the darkness to save his sister. Something ancient answers—and calls him by a name he has never heard.</p><div className="quote-mark">“</div><blockquote>Never let your shadow learn your name.</blockquote><small>— Elyra Veyr, to her son</small><div className="activity-line"><span>CORE THEMES</span><div><i>Identity</i><i>Memory</i><i>Divinity</i></div></div></div></div>
    </>}
    {tab==="Story bible"&&<><div className="page-heading"><div className="eyebrow">WORLD BUILDING · CANON</div><h1>Story <em>bible.</em></h1><p>Everything that makes this world—and its mysteries—hold together.</p></div><div className="story-layout"><div className="surface story-main"><div className="eyebrow">SERIES SYNOPSIS</div><h2>The light has a secret.<br/>The dark remembers.</h2><p>In the kingdom of Eryndor, the Church of the Eternal Dawn teaches that shadows are harmless reflections of the soul. It hunts the Hollowborn—people whose shadows move when they should not.</p><p>Seventeen-year-old Kael Veyr has spent his life hiding a terrible secret: his shadow does not always follow him. Sometimes it looks around. Sometimes it points at things no one else can see. And sometimes, while Kael sleeps, it watches him.</p><p>When faceless creatures descend upon Ashfall and his younger sister Mira is mortally wounded, Kael begs the darkness to save her. Something ancient answers. Nythar, the First Shadow, awakens—and tells Kael that he is not its prison, but its last remaining child.</p><p>Now hunted by the Church, Kael must uncover why the gods erased Nythar from history, why his mother vanished, and whether the thing inside his shadow is the world's greatest monster—or its final guardian.</p><div className="divider"/><div className="eyebrow">THE CENTRAL QUESTION</div><blockquote className="big-quote">Is Nythar trying to escape… or protecting the world from something worse?</blockquote></div><div className="surface"><div className="eyebrow">CANON RULES</div><h3>Power always takes something.</h3><p className="muted">The Umbracore system has five stages. Progression is not free.</p>{stages.map((s,i)=><div className="stage-row" key={s}><span>0{i+1}</span><div><b>{s}</b><small>{["Sense and manipulate nearby shadows","Shape shadows into weapons and constructs","Control the shadows of other beings","Transform the surrounding environment","Become an embodiment of a primordial force"][i]}</small></div></div>)}</div></div><div className="surface lore-surface"><div className="eyebrow">WORLD & MYTHOLOGY</div><h2>The world of Eryndor</h2><div className="lore-grid">{lore.map((l,i)=><div className="lore-card" key={l[0]}><span>0{i+1}</span><h3>{l[0]}</h3><p>{l[1]}</p></div>)}</div><div className="places"><b>KEY LOCATIONS</b><span>Ashfall</span><span>Solmire</span><span>Black Cathedral</span><span>Veilwood</span><span>Hollow Sea</span><span>Throne of Nothing</span></div><p className="muted footnote">The nine Primordials: Nythar (shadow/memory), Aurelion (light/creation), Vharos (death/silence), Eshara (time/fate), Morvane (blood/life), Theryx (dreams/madness), Oruun (space/distance), Kaelith (flame/destruction), Ilyra (truth/beginnings).</p></div></>}
    {tab==="Characters"&&<>{selectedCharacterName?(()=>{const c=characters.find(item=>item.name===selectedCharacterName);if(!c)return null;return <><div className="page-heading"><div className="eyebrow">CHARACTER FILE · VISUAL REFERENCE</div><h1>{c.name}</h1><p>Upload this character’s picture and add the prompt you want the image generator to follow.</p></div><div className="surface character-editor"><button className="outline-btn" onClick={()=>setSelectedCharacterName("")}><ChevronRight size={14} style={{transform:"rotate(180deg)"}}/> Back to characters</button><div className="character-editor-grid"><div><h3>Character image</h3><p className="muted">Upload a clear reference picture (JPG, PNG or WEBP, up to 12 MB).</p><label className="reference-drop character-reference-drop">{characterImages[c.name]?<img src={characterImages[c.name]} alt={c.name+" reference"}/>:<span className="reference-placeholder"><ImagePlus size={22}/><b>Upload {c.name} picture</b><small>Choose an image from your device</small></span>}<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>handleCharacterImageUpload(c.name,e.target.files?.[0])}/></label></div><div><h3>Image-generation prompt</h3><p className="muted">Paste the prompt that describes how the AI should draw this character.</p><textarea className="character-prompt-input" value={characterPrompts[c.name]||""} onChange={e=>saveCharacterPrompt(c.name,e.target.value)} placeholder={"Example: Draw "+c.name+" in the established dark fantasy Korean manhwa style. Keep the face, hairstyle, eyes, clothing and proportions consistent."}/><small className="muted">Your prompt is saved automatically in this browser.</small></div></div><div className="info-note"><Sparkles size={17}/><p><b>Character details</b> — {c.role}. {c.look}. Use the same reference and prompt whenever this character appears.</p></div></div></>})():<><div className="page-heading"><div className="eyebrow">CAST & CHARACTER CONTINUITY</div><h1>Meet the <em>characters.</em></h1><p>Select a character to upload their image and paste an image-generation prompt.</p></div><div className="toolbar"><div className="searchbox"><Search size={16}/><input placeholder="Search characters..." value={query} onChange={e=>setQuery(e.target.value)}/></div><span className="muted-count">{filtered.length} characters</span></div><div className="character-grid">{filtered.map((c,i)=><article className="character-card" key={c.name}><div className={"character-art "+c.color}><span className="character-number">CHARACTER FILE · 0{i+1}</span>{characterImages[c.name]?<img src={characterImages[c.name]} alt={c.name+" reference"} className="character-card-reference"/>:<div className="portrait-symbol">{c.initials}</div>}<span className="portrait-name">{c.name}</span></div><div className="character-details"><div className="character-meta"><span>{c.role}</span><i>{c.tag}</i></div><button className="character-name-button" onClick={()=>setSelectedCharacterName(c.name)}>{c.name}</button><p>{c.desc}</p><div className="look"><Eye size={13}/>{c.look}</div><button className="outline-btn" onClick={()=>setSelectedCharacterName(c.name)}>Open character file <ChevronRight size={14}/></button></div></article>)}</div><div className="info-note"><Sparkles size={17}/><p><b>Visual consistency tip</b> — Add a reference picture and image-generation prompt for each character before creating panels.</p></div></>}</>}
    {tab==="Chapters"&&<><div className="page-heading"><div className="eyebrow">SERIES STRUCTURE · 8 ARCS</div><h1>Chapter <em>room.</em></h1><p>Explore the 210-chapter roadmap and open a chapter to start storyboarding.</p></div><div className="chapter-layout"><div className="surface arc-picker"><div className="eyebrow">STORY ARCS</div>{arcs.map((a,i)=><button key={a.name} className={arc===i?"arc-pick selected":"arc-pick"} onClick={()=>{setArc(i);setChapter(0)}}><span>{String(i+1).padStart(2,"0")}</span><div><b>{a.name}</b><small>Chapters {a.range}</small></div><ChevronRight size={15}/></button>)}</div><div className="surface chapter-list"><div className="chapter-list-head"><div><div className="eyebrow">ARC {String(arc+1).padStart(2,"0")}</div><h2>{activeArc.name}</h2></div><span>{activeArc.range}</span></div>{activeArc.chapters.map((c,i)=><button key={c} className={chapter===i?"chapter-row chosen":"chapter-row"} onClick={()=>setChapter(i)}><span className="chapter-index">{String(i+1+arcs.slice(0,arc).reduce((n,a)=>n+a.chapters.length,0)).padStart(3,"0")}</span><span>{c}</span><span className="chapter-status">{arc===0&&i===0?"STORYBOARD":"OUTLINE"}</span><ChevronRight size={14}/></button>)}<div className="chapter-detail"><div className="eyebrow">SELECTED CHAPTER</div><h3>{activeArc.chapters[chapter]}</h3><p>{arc===0&&chapter===0?"Kael Veyr walks home through the rain and notices something impossible: his reflection casts two shadows. One of them is watching him. By nightfall, the Faceless will come for his family.":"Chapter outline reserved for development. Expand this entry into scenes, dialogue beats and visual panels as the series is produced."}</p><button className="primary-btn" onClick={()=>{setPanelName(activeArc.chapters[chapter]);go("Panel studio")}}><Clapperboard size={16}/> Open in panel studio</button></div></div></div></>}
    {tab==="Panel studio"&&<><div className="page-heading"><div className="eyebrow">STORYBOARD · AUTOMATIC ART GENERATION</div><h1>Panel <em>studio.</em></h1><p>Generate the complete first chapter as twelve illustrated vertical manhwa panels.</p></div><div className="surface generation-console"><div className="generation-console-head"><div><div className="eyebrow">CHAPTER 01 · THE BOY WHO CAST TWO SHADOWS</div><h2>Automatic panel generation</h2><p className="muted">The prompts preserve Kael, Mira and Nythar's visual descriptions across the sequence.</p></div><span className="draft-tag">12 PANELS</span></div><div className="reference-controls">
 <div className="reference-upload">
  <div className="reference-heading"><div><b>Character reference image</b><small>Upload a character sheet or a picture of your cast. Use a clear image, ideally under 1.5 MB.</small></div></div>
  <label className="reference-drop">
   {referencePreview?<img src={referencePreview} alt="Uploaded character reference"/>:<span className="reference-placeholder"><ImagePlus size={22}/><b>Choose character picture</b><small>JPG, PNG or WEBP</small></span>}
   <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>handleReferenceUpload(e.target.files?.[0])}/>
  </label>
  {referenceImage&&<button className="remove-reference" type="button" onClick={()=>{setReferenceImage("");setReferencePreview("");}}>Remove reference image</button>}
 </div>
 <div className="style-picker"><label htmlFor="art-style">ART STYLE</label><select id="art-style" value={artStyle} onChange={e=>setArtStyle(e.target.value)}><option>Dark fantasy Korean manhwa</option><option>Clean anime illustration</option><option>Painterly fantasy illustration</option><option>Black and white manga ink</option><option>Webtoon cel-shaded colour</option></select><small>Applied to every panel in this chapter.</small></div>
</div>
<div className="generation-actions"><button className="primary-btn" disabled={isGenerating} onClick={generateChapter}><WandSparkles size={16}/>{isGenerating?"Generating artwork...":generatedPanels.length?"Continue / regenerate chapter":"Generate all 12 panels"}</button><span className="muted tiny">{generatedPanels.length} of 12 panels completed</span></div><div className="generation-track"><i style={{width:(generationProgress/12*100)+"%"}}/></div><p className="generation-message">{generationMessage||"Ready to generate Chapter 1 artwork."}</p></div><div className="surface generated-gallery"><div className="section-head compact"><div><div className="eyebrow">GENERATED ARTWORK</div><h2>Chapter 1 · Panel gallery</h2></div><span className="muted-count">{generatedPanels.length}/12 ready</span></div>{generatedPanels.length===0?<div className="empty-gallery"><Layers3 size={28}/><b>Your illustrated panels will appear here.</b><span>Start automatic generation to build the chapter in story order.</span></div>:<div className="generated-grid">{chapterOnePanels.map((scene,i)=>{const panel=generatedPanels.find(item=>item.id===i+1);return <article className="generated-card" key={scene.title}>{panel?<img src={panel.url} alt={panel.title}/>:<div className="generated-pending"><span>Panel {String(i+1).padStart(2,"0")}</span><small>{isGenerating&&generationProgress===i?"Generating...":"Waiting"}</small></div>}<div className="generated-card-caption"><b>{String(i+1).padStart(2,"0")} · {scene.title}</b></div></article>})}</div>}</div><div className="info-note"><Sparkles size={17}/><p><b>Generation access</b> — Images are generated with Cloudflare Workers AI's free daily allowance. Generation is rate-limited to help protect that allowance.</p></div></>}
    {tab==="Reader"&&<><div className="page-heading"><div className="eyebrow">READING MODE · VERTICAL SCROLL</div><h1>Manhwa <em>reader.</em></h1><p>A preview of the opening chapter. Artwork panels will appear here as they are generated.</p></div><div className="reader-shell"><div className="reader-top"><span>THE GOD BENEATH MY SHADOW</span><span>CHAPTER 01</span></div><div className="reader-cover"><div className="reader-moon"/><span>AN ORIGINAL DARK FANTASY MANHWA</span><h2>THE GOD<br/>BENEATH MY<br/><i>SHADOW</i></h2><p>CHAPTER 01 · THE BOY WHO CAST TWO SHADOWS</p></div><div className="reader-text"><p className="reader-kicker">THE BEGINNING</p><p>In the beginning, there was light.</p><p>And where light was born, something else was created.</p>{generatedPanels[0]?<img className="reader-generated-image" src={generatedPanels[0].url} alt={generatedPanels[0].title}/>:<div className="reader-panel-placeholder"><span>ARTWORK PANEL 01</span><b>A ruined kingdom beneath a blood-red moon. Rain falls. Bells ring thirteen times.</b></div>}<p>Kael Veyr hurried through the narrow streets, a paper-wrapped loaf tucked beneath his coat.</p><p><i>Mira's going to complain that I'm late again.</i></p>{generatedPanels[2]?<img className="reader-generated-image" src={generatedPanels[2].url} alt={generatedPanels[2].title}/>:<div className="reader-panel-placeholder dark-panel"><span>ARTWORK PANEL 02</span><b>In a puddle, two shadows stretch behind Kael. One remains perfectly still.</b></div>}<p>He stopped.</p><p>Something in the puddle had moved.</p><p>Not him.</p>{generatedPanels[4]?<img className="reader-generated-image" src={generatedPanels[4].url} alt={generatedPanels[4].title}/>:<div className="reader-panel-placeholder dark-panel"><span>ARTWORK PANEL 03</span><b>A second shadow turns its head. A smile appears where no face should be.</b></div>}<p className="dialogue">“You have grown.”</p><p>Kael turned around. The alley was empty.</p><p>But his shadow was still smiling.</p><div className="reader-end">TO BE CONTINUED <span>✦</span></div></div></div></>}
   </div>
   <footer className="footer"><span>© 2026 PanelForge AI</span><span>CREATE WORLDS. FRAME LEGENDS.</span><span>Built for stories that stay with you.</span></footer>
  </section>
  {notice&&<div className="toast"><Sparkles size={15}/>{notice}</div>}
 </main>;
}
