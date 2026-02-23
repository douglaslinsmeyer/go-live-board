import { useState, useMemo, useCallback } from "react";
import Papa from "papaparse";

const PH=[
  {id:"Phase 0",l:"BL",f:"Env Baseline / Cutover Readiness",dt:"Feb 2-16",cl:"#6366f1"},
  {id:"Phase 00",l:"P0",f:"Migrate Customers to PRD",dt:"Feb 16-17",cl:"#8b5cf6"},
  {id:"Phase 1",l:"P1",f:"Master Data Loading",dt:"Feb 16-22",cl:"#3b82f6"},
  {id:"Phase 2",l:"P2",f:"Master Data Sync",dt:"Feb 16-22",cl:"#0ea5e9"},
  {id:"Phase 3",l:"P3",f:"Trans Data Prep",dt:"Feb 23-25",cl:"#14b8a6"},
  {id:"Phase 4",l:"P4",f:"Blackout / Trans Data Migration",dt:"Feb 25-Mar 1",cl:"#f59e0b"},
  {id:"Phase 5",l:"P5",f:"Hypercare",dt:"Mar 2-9",cl:"#10b981"},
];

const SM={"0-Not Mock":{l:"Not Mock",c:"#94a3b8",bg:"#f1f5f9",s:"NM"},"1-Planned":{l:"Planned",c:"#3b82f6",bg:"#eff6ff",s:"PLN"},"2-WIP":{l:"In Progress",c:"#f59e0b",bg:"#fffbeb",s:"WIP"},"4-Complete":{l:"Complete",c:"#10b981",bg:"#ecfdf5",s:"DONE"},"6-Archive":{l:"Archived",c:"#94a3b8",bg:"#f9fafb",s:"ARC"},"7 - Not Go-Live":{l:"Not Go-Live",c:"#6b7280",bg:"#f3f4f6",s:"NGL"}};

const TZ_LABELS=[{id:"GMT",l:"UK (GMT)"},{id:"AZT",l:"US Arizona (UTC-7)"},{id:"EST",l:"US Eastern (EST)"},{id:"BOTH",l:"Arizona + UK"},{id:"UTC",l:"UTC"}];
const TS_MODES=[{id:"both",l:"Estimated + Actuals"},{id:"est",l:"Estimated Only"},{id:"act",l:"Actuals Only"}];
const VIEW_MODES=[{id:"phase",l:"By Phase"},{id:"day",l:"By Day"},{id:"flat",l:"Flat List"}];

function parsePhase(raw){
  if(!raw)return"";const s=raw.trim();
  if(s.includes("Phase 0 ")||s.includes("Phase 0-")||s.includes("Baseline")||s.includes("Cutover Readiness"))return"Phase 0";
  if(s.includes("Phase 00")||s.includes("Migrate Customers"))return"Phase 00";
  for(const p of PH){if(s.includes(p.id))return p.id;}
  return s;
}
function getStatus(raw){
  if(!raw)return"1-Planned";const s=raw.trim();
  if(s.startsWith("0"))return"0-Not Mock";if(s.startsWith("1"))return"1-Planned";
  if(s.startsWith("2"))return"2-WIP";if(s.startsWith("4"))return"4-Complete";
  if(s.startsWith("6"))return"6-Archive";if(s.startsWith("7"))return"7 - Not Go-Live";return s;
}
function fmtTime(t,tz){
  if(!t)return"\u2014";
  if(tz==="BOTH")return t+" GMT / "+offsetTime(t,-7)+" AZT";
  if(tz==="AZT")return offsetTime(t,-7);
  if(tz==="EST")return offsetTime(t,-5);
  return t;
}
function offsetTime(t,hrs){
  const m=t.match(/(\d{1,2}):(\d{2})/);if(!m)return t;
  let h=parseInt(m[1])+hrs;let d="";
  if(h<0){h+=24;d=" (-1d)";}if(h>=24){h-=24;d=" (+1d)";}
  return String(h).padStart(2,"0")+":"+m[2]+d;
}
function parseDate(s){
  if(!s)return null;const clean=s.replace(/[()]/g,"").trim();
  const m=clean.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-]?(\d{2,4})?/);if(!m)return null;
  const mo=parseInt(m[1]),dy=parseInt(m[2]),yr=m[3]?parseInt(m[3]):2026;
  return new Date(yr<100?yr+2000:yr,mo-1,dy);
}
function fmtDateShort(d){
  if(!d)return"\u2014";
  return["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()]+" "+d.getDate();
}
function getDayKey(d){
  if(!d)return"Unknown";
  return["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]+" "+fmtDateShort(d);
}

export default function Dashboard(){
  const [tasks,setTasks]=useState([]);
  const [loaded,setLoaded]=useState(false);
  const [err,setErr]=useState("");
  const [tz,setTz]=useState("AZT");
  const [tsMode,setTsMode]=useState("both");
  const [viewMode,setViewMode]=useState("phase");
  const [pF,setPF]=useState("all");
  const [wF,setWF]=useState("All");
  const [sF,setSF]=useState("all");
  const [rF,setRF]=useState("All");
  const [search,setSearch]=useState("");
  const [hideD,setHideD]=useState(false);
  const [exp,setExp]=useState(null);
  const [edits,setEdits]=useState({});
  const [statFilter,setStatFilter]=useState(null);
  const [focusDate,setFocusDate]=useState("");
  const [dayMode,setDayMode]=useState("none");
  const [goalId,setGoalId]=useState("");
  const [showHelp,setShowHelp]=useState(false);

  function parseCSV(txt){
    try{
      const result=Papa.parse(txt,{header:true,skipEmptyLines:true,dynamicTyping:false,delimitersToGuess:[",","\t","|",";"]});
      if(!result.data||!result.data.length){setErr("No data");return;}
      const headers=Object.keys(result.data[0]).map(h=>h.trim());
      const findH=(pats)=>headers.find(h=>{const hl=h.toLowerCase().replace(/[^a-z0-9]/g,"");return pats.some(p=>hl.includes(p));})||"";
      const hId=findH(["activity"])||headers[0],hSt=findH(["status"]),hWs=findH(["workstream"]),hApp=findH(["application"]),hPh=findH(["phase","group"]),hCls=findH(["taskclassification","classification"]),hDesc=findH(["descriptionandnotes","description"]),hUI=findH(["usca","usimpact","impact"]),hSD=findH(["expectedstart","startdate"]),hED=findH(["expectedend","enddate"]),hResp=findH(["responsible","pinginfor"]),hPSME=findH(["pingsme"]),hExec=findH(["executor"]),hPSup=findH(["pingsupport"]),hISME=findH(["inforsme"]),hMock=findH(["mockonly","mock"]),hJP=findH(["japantoexecute","japan"]),hNotes=findH(["commentsandnotes","comment"]);
      const parsed=result.data.map(r=>{
        const id=(r[hId]||"").trim();if(!id)return null;
        return{id,s:getStatus(r[hSt]),w:(r[hWs]||"").trim()||"Other",a:(r[hApp]||"").trim()||"All",p:parsePhase(r[hPh]),c:(r[hCls]||"").trim(),d:(r[hDesc]||"").trim(),r:(r[hResp]||"").trim(),ps:(r[hPSME]||"").trim(),ex:(r[hExec]||"").trim(),pp:(r[hPSup]||"").trim(),is:(r[hISME]||"").trim(),sd:(r[hSD]||"").trim(),ed:(r[hED]||"").trim(),sdD:parseDate(r[hSD]),edD:parseDate(r[hED]),ui:!!(r[hUI]||"").trim(),mo:(r[hMock]||"").toString().toLowerCase().includes("yes"),jp:(r[hJP]||"").toString().toLowerCase().includes("yes"),n:(r[hNotes]||"").trim(),estStart:"",estEnd:"",actStart:"",actEnd:""};
      }).filter(Boolean);
      setTasks(parsed);setLoaded(true);setErr("");
    }catch(e){setErr("Parse error: "+e.message);}
  }
  function handleFile(e){const f=e.target.files[0];if(!f)return;const reader=new FileReader();reader.onload=(ev)=>parseCSV(ev.target.result);reader.readAsText(f);}
  const updateTask=useCallback((id,field,val)=>{setEdits(prev=>({...prev,[id]:{...(prev[id]||{}),[field]:val}}));},[]);
  const getVal=useCallback((t,field)=>{return(edits[t.id]&&edits[t.id][field]!==undefined)?edits[t.id][field]:t[field];},[edits]);

  const today=useMemo(()=>{const d=new Date();d.setHours(0,0,0,0);return d;},[]);
  const isPastDue=useCallback((t)=>{if(t.s==="4-Complete"||t.s==="6-Archive")return false;if(!t.edD)return false;const ed=new Date(t.edD);ed.setHours(23,59,59,999);return ed<today;},[today]);
  const focusDateObj=useMemo(()=>{if(!focusDate)return null;const d=new Date(focusDate+"T00:00:00");return isNaN(d)?null:d;},[focusDate]);
  const goalIdx=useMemo(()=>{if(!goalId)return-1;const q=goalId.trim().toUpperCase();return tasks.findIndex(t=>t.id.toUpperCase()===q);},[goalId,tasks]);

  const ws=useMemo(()=>{const s=new Set(tasks.map(t=>t.w));return["All",...Array.from(s).sort()];},[tasks]);
  const resps=useMemo(()=>{const s=new Set(tasks.map(t=>t.r).filter(Boolean));return["All",...Array.from(s).sort()];},[tasks]);

  const filtered=useMemo(()=>{
    return tasks.filter(t=>{
      if(pF!=="all"&&t.p!==pF)return false;if(wF!=="All"&&t.w!==wF)return false;
      if(sF!=="all"&&t.s!==sF)return false;if(rF!=="All"&&t.r!==rF)return false;
      if(hideD&&(t.s==="4-Complete"||t.s==="6-Archive"))return false;
      if(search){const q=search.toLowerCase();if(![t.id,t.d,t.ps,t.ex,t.is,t.pp,t.n].some(v=>v&&v.toLowerCase().includes(q)))return false;}
      return true;
    });
  },[tasks,pF,wF,sF,rF,search,hideD]);

  const statsFiltered=useMemo(()=>{
    let list=filtered;
    if(statFilter){list=list.filter(t=>{if(statFilter==="done")return t.s==="4-Complete";if(statFilter==="wip")return t.s==="2-WIP";if(statFilter==="pln")return t.s==="1-Planned";if(statFilter==="pastdue")return isPastDue(t);if(statFilter==="ui")return t.ui;return true;});}
    if(focusDateObj&&dayMode!=="none"&&dayMode!=="goal"){
      list=list.filter(t=>{
        if(t.s==="4-Complete"||t.s==="6-Archive")return false;
        if(dayMode==="starting"){if(!t.sdD)return false;return t.sdD.getFullYear()===focusDateObj.getFullYear()&&t.sdD.getMonth()===focusDateObj.getMonth()&&t.sdD.getDate()===focusDateObj.getDate();}
        if(dayMode==="dueby"){if(!t.edD)return isPastDue(t);const ed=new Date(t.edD);ed.setHours(23,59,59,999);return isPastDue(t)||ed<=new Date(focusDateObj.getFullYear(),focusDateObj.getMonth(),focusDateObj.getDate(),23,59,59,999);}
        return true;
      });
    }
    if(goalId&&goalIdx>=0&&dayMode==="goal"){list=list.filter(t=>{if(t.s==="4-Complete"||t.s==="6-Archive")return false;const ti=tasks.findIndex(x=>x.id===t.id);return ti<=goalIdx;});}
    return list;
  },[filtered,statFilter,isPastDue,focusDateObj,dayMode,goalId,goalIdx,tasks]);

  const stats=useMemo(()=>{
    const o={total:filtered.length,done:0,wip:0,pln:0,oth:0,ui:0,pastdue:0};
    filtered.forEach(t=>{if(t.s==="4-Complete")o.done++;else if(t.s==="2-WIP")o.wip++;else if(t.s==="1-Planned")o.pln++;else o.oth++;if(t.ui)o.ui++;if(isPastDue(t))o.pastdue++;});
    return o;
  },[filtered,isPastDue]);

  const phaseGroups=useMemo(()=>{const g={};PH.forEach(p=>{g[p.id]=[];});statsFiltered.forEach(t=>{if(g[t.p])g[t.p].push(t);else{if(!g.Other)g.Other=[];g.Other.push(t);}});return g;},[statsFiltered]);
  const dayGroups=useMemo(()=>{const g={};statsFiltered.forEach(t=>{const k=t.sdD?getDayKey(t.sdD):"No Date";if(!g[k])g[k]=[];g[k].push(t);});return Object.entries(g).sort((a,b)=>{const da=statsFiltered.find(t=>getDayKey(t.sdD)===a[0]);const db=statsFiltered.find(t=>getDayKey(t.sdD)===b[0]);if(!da?.sdD)return 1;if(!db?.sdD)return-1;return da.sdD-db.sdD;});},[statsFiltered]);
  const allStats=useMemo(()=>{const g={};PH.forEach(p=>{g[p.id]={total:0,done:0};});tasks.forEach(t=>{if(g[t.p]){g[t.p].total++;if(t.s==="4-Complete")g[t.p].done++;}});return g;},[tasks]);

  const Badge=({status})=>{const st=SM[status]||{l:status,c:"#6b7280",bg:"#f3f4f6",s:"?"};return(<span style={{fontSize:10,fontWeight:700,color:st.c,background:st.bg,padding:"2px 7px",borderRadius:99,border:`1px solid ${st.c}33`,whiteSpace:"nowrap"}}>{st.s}</span>);};
  const TimeInput=({val,onChange,placeholder})=>(<input value={val||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder||"HH:MM"} style={{width:56,fontSize:10,padding:"2px 4px",border:"1px solid #cbd5e1",borderRadius:4,fontFamily:"monospace",textAlign:"center"}}/>);
  const SectionHeader=({label,sublabel,color,count,done})=>(<div style={{padding:"8px 12px",background:"#f1f5f9",borderBottom:"1px solid #e2e8f0",display:"flex",alignItems:"center",gap:8,position:"sticky",top:0,zIndex:2}}><span style={{background:color||"#475569",color:"#fff",padding:"2px 8px",borderRadius:5,fontSize:10,fontWeight:700}}>{label}</span>{sublabel&&<span style={{fontSize:12,fontWeight:600,color:"#334155"}}>{sublabel}</span>}<span style={{marginLeft:"auto",fontSize:10,color:"#64748b"}}>{done!==undefined?`${done}/`:""}{count}</span>{done!==undefined&&<div style={{width:50,height:5,background:"#e2e8f0",borderRadius:3}}><div style={{width:`${count?(done/count)*100:0}%`,height:"100%",background:color||"#475569",borderRadius:3}}/></div>}</div>);

  const Row=({t})=>{
    const isE=exp===t.id;
    const eS=getVal(t,"estStart"),eE=getVal(t,"estEnd"),aS=getVal(t,"actStart"),aE=getVal(t,"actEnd");
    const pd=isPastDue(t);
    const isGoal=dayMode==="goal"&&goalId&&t.id.toUpperCase()===goalId.trim().toUpperCase();
    return(
      <div style={{borderBottom:"1px solid #e5e7eb",background:isGoal?"#fef9c3":isE?"#f8fafc":pd?"#fef2f2":"#fff"}}>
        <div onClick={()=>setExp(isE?null:t.id)} style={{display:"grid",gridTemplateColumns:"70px 44px 1fr 100px 58px 58px",alignItems:"center",padding:"6px 10px",cursor:"pointer",gap:5,fontSize:12}}>
          <span style={{fontFamily:"monospace",fontWeight:700,fontSize:10,color:isGoal?"#92400e":pd?"#dc2626":"#475569"}}>{t.id}{isGoal?" \ud83c\udfc1":""}</span>
          <Badge status={t.s}/>
          <div style={{display:"flex",alignItems:"center",gap:4,overflow:"hidden"}}>
            {pd&&<span style={{fontSize:8,fontWeight:800,color:"#dc2626",background:"#fee2e2",padding:"1px 4px",borderRadius:3,whiteSpace:"nowrap",flexShrink:0}}>PAST DUE</span>}
            <span style={{color:"#1e293b",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.d||"(no desc)"}</span>
          </div>
          <span style={{fontSize:10,color:"#64748b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.ex||"\u2014"}</span>
          <span style={{fontSize:10,color:"#94a3b8"}}>{t.sdD?fmtDateShort(t.sdD):t.sd}</span>
          <span style={{fontSize:10,color:pd?"#dc2626":"#94a3b8",fontWeight:pd?700:400}}>{t.edD?fmtDateShort(t.edD):t.ed}</span>
        </div>
        {isE&&(
          <div style={{padding:"8px 10px 12px",background:"#f1f5f9",fontSize:11}}>
            <div style={{marginBottom:8}}><strong>Description:</strong> {t.d}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"5px 20px",marginBottom:8}}>
              <div><strong>PING SME:</strong> {t.ps||"\u2014"}</div>
              <div><strong>Executor:</strong> {t.ex||"\u2014"}</div>
              <div><strong>PING Support:</strong> {t.pp||"\u2014"}</div>
              <div><strong>Infor SME:</strong> {t.is||"\u2014"}</div>
              <div><strong>Responsible:</strong> {t.r||"\u2014"}</div>
              <div><strong>Classification:</strong> {t.c||"\u2014"}</div>
              <div><strong>Application:</strong> {t.a}</div>
              <div><strong>Workstream:</strong> {t.w}</div>
              <div><strong>Start:</strong> {t.sdD?fmtDateShort(t.sdD):t.sd}</div>
              <div><strong>End:</strong> {t.edD?fmtDateShort(t.edD):t.ed}</div>
            </div>
            <div style={{background:"#fff",borderRadius:6,padding:"8px 10px",border:"1px solid #e2e8f0",marginBottom:8}}>
              <div style={{fontSize:10,fontWeight:700,color:"#475569",marginBottom:6}}>TIMESTAMPS ({tz==="BOTH"?"GMT + AZT":tz})</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {(tsMode==="both"||tsMode==="est")&&(
                  <div style={{background:"#eff6ff",padding:6,borderRadius:4}}>
                    <div style={{fontSize:9,fontWeight:700,color:"#3b82f6",marginBottom:4}}>ESTIMATED</div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:10,color:"#64748b",width:30}}>Start</span><TimeInput val={eS} onChange={v=>updateTask(t.id,"estStart",v)}/>{tz==="BOTH"&&eS&&<span style={{fontSize:9,color:"#94a3b8"}}>{fmtTime(eS,tz)}</span>}</div>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:3}}><span style={{fontSize:10,color:"#64748b",width:30}}>End</span><TimeInput val={eE} onChange={v=>updateTask(t.id,"estEnd",v)}/>{tz==="BOTH"&&eE&&<span style={{fontSize:9,color:"#94a3b8"}}>{fmtTime(eE,tz)}</span>}</div>
                  </div>
                )}
                {(tsMode==="both"||tsMode==="act")&&(
                  <div style={{background:"#ecfdf5",padding:6,borderRadius:4}}>
                    <div style={{fontSize:9,fontWeight:700,color:"#10b981",marginBottom:4}}>ACTUAL</div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}><span style={{fontSize:10,color:"#64748b",width:30}}>Start</span><TimeInput val={aS} onChange={v=>updateTask(t.id,"actStart",v)}/>{tz==="BOTH"&&aS&&<span style={{fontSize:9,color:"#94a3b8"}}>{fmtTime(aS,tz)}</span>}</div>
                    <div style={{display:"flex",gap:6,alignItems:"center",marginTop:3}}><span style={{fontSize:10,color:"#64748b",width:30}}>End</span><TimeInput val={aE} onChange={v=>updateTask(t.id,"actEnd",v)}/>{tz==="BOTH"&&aE&&<span style={{fontSize:9,color:"#94a3b8"}}>{fmtTime(aE,tz)}</span>}</div>
                  </div>
                )}
              </div>
              {tsMode==="both"&&eS&&aS&&(<div style={{marginTop:6,fontSize:10,color:aS>eS?"#dc2626":"#10b981",fontWeight:600}}>{aS>eS?"\u26a0 Started later than estimated":"\u2713 Started on or ahead of estimate"}</div>)}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {t.ui&&<span style={{fontSize:9,background:"#fef2f2",color:"#dc2626",padding:"1px 5px",borderRadius:4,fontWeight:700}}>US/CA IMPACT</span>}
              {t.mo&&<span style={{fontSize:9,background:"#fffbeb",color:"#d97706",padding:"1px 5px",borderRadius:4,fontWeight:700}}>MOCK ONLY</span>}
              {t.jp&&<span style={{fontSize:9,background:"#f0fdf4",color:"#16a34a",padding:"1px 5px",borderRadius:4,fontWeight:700}}>JP EXEC</span>}
            </div>
            {t.n&&<div style={{marginTop:6,color:"#64748b",fontStyle:"italic",fontSize:10}}><strong>Notes:</strong> {t.n}</div>}
          </div>
        )}
      </div>
    );
  };

  if(!loaded){
    return(
      <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,sans-serif",maxWidth:700,margin:"60px auto",textAlign:"center"}}>
        <div style={{background:"linear-gradient(135deg,#1e293b,#334155)",color:"#fff",padding:"24px",borderRadius:12}}>
          <h1 style={{margin:0,fontSize:22}}>UK Mock Cutover Dashboard</h1>
          <p style={{margin:"6px 0 0",opacity:0.7,fontSize:13}}>PING Project Evo</p>
        </div>
        <div style={{padding:40,background:"#fff",border:"1px solid #e2e8f0",borderTop:0,borderRadius:"0 0 12px 12px"}}>
          <div style={{fontSize:48,marginBottom:16}}>📊</div>
          <h2 style={{fontSize:18,color:"#1e293b",margin:"0 0 8px"}}>Upload Your Cutover Plan</h2>
          <p style={{color:"#64748b",fontSize:13,margin:"0 0 20px",lineHeight:1.5}}>Export the cutover spreadsheet as CSV and upload here.<br/>The dashboard auto-detects columns and builds filtered views.</p>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <label style={{display:"inline-flex",alignItems:"center",padding:"10px 24px",background:"#3b82f6",color:"#fff",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14}}>
              Choose CSV File
              <input type="file" accept=".csv,.tsv,.txt" onChange={handleFile} style={{display:"none"}}/>
            </label>
            <button onClick={()=>setShowHelp(!showHelp)} style={{padding:"10px 20px",background:showHelp?"#1e293b":"#e2e8f0",color:showHelp?"#fff":"#334155",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:14,border:"none"}}>{showHelp?"Hide Help":"? Help"}</button>
          </div>
          {showHelp&&(
            <div style={{marginTop:20,padding:20,background:"#f8fafc",borderRadius:8,textAlign:"left",fontSize:12,color:"#334155",lineHeight:1.7,border:"1px solid #e2e8f0"}}>
              <h3 style={{margin:"0 0 8px",fontSize:14,color:"#1e293b"}}>Quick Start Guide</h3>
              <p style={{margin:"4px 0"}}><strong>1.</strong> Export your cutover spreadsheet from Excel as CSV (File → Save As → CSV)</p>
              <p style={{margin:"4px 0"}}><strong>2.</strong> Click "Choose CSV File" above — columns are auto-detected</p>
              <p style={{margin:"4px 0"}}><strong>3.</strong> Use the phase bar to filter by phase (BL, P0–P5)</p>
              <p style={{margin:"4px 0"}}><strong>4.</strong> Click stat cards (Planned, In Progress, Complete, Past Due, US/CA Impact) to filter</p>
              <p style={{margin:"4px 0"}}><strong>5.</strong> Use Day Focus to answer "what needs to be done by when"</p>
              <p style={{margin:"4px 0"}}><strong>6.</strong> Click any task row to expand details and log timestamps</p>
              <p style={{margin:"8px 0 0",fontSize:11,color:"#64748b"}}>See the full Dashboard User Guide document for detailed instructions on every feature.</p>
            </div>
          )}
          {err&&<p style={{color:"#dc2626",marginTop:12,fontSize:12}}>{err}</p>}
          <div style={{marginTop:30,padding:16,background:"#f8fafc",borderRadius:8,textAlign:"left",fontSize:11,color:"#64748b",lineHeight:1.6}}>
            <strong style={{color:"#334155"}}>Expected columns:</strong> Activity, Status, Workstream, Application, Phase/Group, Task Classification, Description and Notes, Responsible, PING SME, Executor, PING Support, Infor SME, Expected start date, Expected end date, US/CA IMPACT, Mock ONLY, JAPAN to Execute, Comments
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{fontFamily:"-apple-system,BlinkMacSystemFont,sans-serif",maxWidth:1100,margin:"0 auto",color:"#1e293b"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#1e293b,#334155)",color:"#fff",padding:"14px 18px",borderRadius:"12px 12px 0 0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8,flexWrap:"wrap",gap:8}}>
          <div>
            <h1 style={{margin:0,fontSize:18,fontWeight:700}}>UK Mock Cutover Dashboard</h1>
            <p style={{margin:"2px 0 0",fontSize:11,opacity:0.7}}>PING Project Evo {"\u2022"} {tasks.length} tasks {"\u2022"} Feb 2 {"\u2013"} Mar 9, 2026</p>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button onClick={()=>{setLoaded(false);setTasks([]);setEdits({});setStatFilter(null);setDayMode("none");setFocusDate("");setGoalId("");setPF("all");setWF("All");setSF("all");setRF("All");setSearch("");setHideD(false);setExp(null);}} style={{padding:"5px 12px",background:"rgba(255,255,255,0.15)",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#fff",border:"1px solid rgba(255,255,255,0.2)",whiteSpace:"nowrap"}}>{"\u2190"} Home</button>
            <label style={{padding:"5px 12px",background:"rgba(255,255,255,0.15)",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,color:"#fff",border:"1px solid rgba(255,255,255,0.2)",whiteSpace:"nowrap"}}>Re-upload<input type="file" accept=".csv" onChange={handleFile} style={{display:"none"}}/></label>
          </div>
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",paddingTop:8,borderTop:"1px solid rgba(255,255,255,0.15)"}}>
          <div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,opacity:0.6,fontWeight:600}}>TIMEZONE</span><select value={tz} onChange={e=>setTz(e.target.value)} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.2)"}}>{TZ_LABELS.map(t=>(<option key={t.id} value={t.id} style={{color:"#000"}}>{t.l}</option>))}</select></div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,opacity:0.6,fontWeight:600}}>TIMESTAMPS</span><select value={tsMode} onChange={e=>setTsMode(e.target.value)} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.2)"}}>{TS_MODES.map(m=>(<option key={m.id} value={m.id} style={{color:"#000"}}>{m.l}</option>))}</select></div>
          <div style={{display:"flex",gap:4,alignItems:"center"}}><span style={{fontSize:10,opacity:0.6,fontWeight:600}}>VIEW</span><select value={viewMode} onChange={e=>setViewMode(e.target.value)} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:"rgba(255,255,255,0.15)",color:"#fff",border:"1px solid rgba(255,255,255,0.2)"}}>{VIEW_MODES.map(g=>(<option key={g.id} value={g.id} style={{color:"#000"}}>{g.l}</option>))}</select></div>
        </div>
      </div>

      {/* Phase bar */}
      <div style={{display:"flex",gap:1,background:"#e2e8f0"}}>
        {PH.map(p=>{const st=allStats[p.id]||{total:0,done:0};const pct=st.total?Math.round((st.done/st.total)*100):0;
          return(<div key={p.id} onClick={()=>setPF(pF===p.id?"all":p.id)} style={{flex:1,padding:"6px 4px",background:pF===p.id?p.cl+"18":"#fff",cursor:"pointer",textAlign:"center",borderBottom:pF===p.id?`3px solid ${p.cl}`:"3px solid transparent"}}>
            <div style={{fontSize:9,fontWeight:700,color:p.cl}}>{p.l}</div>
            <div style={{fontSize:8,color:"#94a3b8"}}>{st.done}/{st.total}</div>
            <div style={{width:"100%",height:3,background:"#e2e8f0",borderRadius:2,marginTop:2}}><div style={{width:`${pct}%`,height:"100%",background:p.cl,borderRadius:2}}/></div>
          </div>);
        })}
      </div>

      {/* Filters */}
      <div style={{display:"flex",gap:6,padding:"7px 10px",background:"#f8fafc",flexWrap:"wrap",alignItems:"center",borderBottom:"1px solid #e2e8f0",fontSize:11}}>
        <select value={wF} onChange={e=>setWF(e.target.value)} style={{fontSize:10,padding:"3px 5px",borderRadius:4,border:"1px solid #cbd5e1"}}>{ws.map(w=>(<option key={w}>{w}</option>))}</select>
        <select value={sF} onChange={e=>setSF(e.target.value)} style={{fontSize:10,padding:"3px 5px",borderRadius:4,border:"1px solid #cbd5e1"}}><option value="all">All Status</option>{Object.entries(SM).map(([k,v])=>(<option key={k} value={k}>{v.l}</option>))}</select>
        <select value={rF} onChange={e=>setRF(e.target.value)} style={{fontSize:10,padding:"3px 5px",borderRadius:4,border:"1px solid #cbd5e1"}}>{resps.map(r=>(<option key={r}>{r}</option>))}</select>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search ID, person, desc..." style={{fontSize:10,padding:"3px 5px",borderRadius:4,border:"1px solid #cbd5e1",width:150}}/>
        <label style={{display:"flex",alignItems:"center",gap:3,color:"#64748b",fontSize:10}}><input type="checkbox" checked={hideD} onChange={e=>setHideD(e.target.checked)} style={{width:11,height:11}}/> Hide done</label>
        {pF!=="all"&&<button onClick={()=>setPF("all")} style={{padding:"2px 6px",fontSize:9,background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:3,cursor:"pointer",fontWeight:600}}>{"\u2715"} Clear phase</button>}
        <button onClick={()=>setShowHelp(!showHelp)} style={{marginLeft:"auto",padding:"3px 10px",fontSize:10,fontWeight:700,background:showHelp?"#1e293b":"#e2e8f0",color:showHelp?"#fff":"#334155",border:"none",borderRadius:4,cursor:"pointer"}}>{showHelp?"Hide Help":"? Help"}</button>
      </div>

      {/* Inline Help Panel */}
      {showHelp&&(
        <div style={{padding:"12px 14px",background:"#f0f9ff",borderBottom:"2px solid #3b82f6",fontSize:11,color:"#1e293b",lineHeight:1.6}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px 24px"}}>
            <div>
              <div style={{fontWeight:700,color:"#3b82f6",marginBottom:2}}>Config Bar (Header)</div>
              <p style={{margin:"2px 0"}}><strong>Timezone</strong> — UK, Arizona, Eastern, Both, UTC</p>
              <p style={{margin:"2px 0"}}><strong>Timestamps</strong> — Est+Actuals, Est Only, Actuals Only</p>
              <p style={{margin:"2px 0"}}><strong>View</strong> — By Phase, By Day, Flat List</p>
            </div>
            <div>
              <div style={{fontWeight:700,color:"#3b82f6",marginBottom:2}}>Phase Bar</div>
              <p style={{margin:"2px 0"}}>Click a phase to filter. Click again to clear.</p>
              <p style={{margin:"2px 0"}}>BL=Baseline, P0=Customer Migration, P1–P5=Execution</p>
            </div>
            <div>
              <div style={{fontWeight:700,color:"#f59e0b",marginBottom:2}}>Stat Cards (Clickable)</div>
              <p style={{margin:"2px 0"}}>Click any card to filter: Planned, In Progress, Complete, Past Due, US/CA Impact</p>
              <p style={{margin:"2px 0"}}>Click active card again to clear</p>
            </div>
            <div>
              <div style={{fontWeight:700,color:"#f59e0b",marginBottom:2}}>Day Focus (Yellow Bar)</div>
              <p style={{margin:"2px 0"}}><strong>Starting this day</strong> — tasks starting on selected date</p>
              <p style={{margin:"2px 0"}}><strong>Due by EOD</strong> — tasks due by end of selected date</p>
              <p style={{margin:"2px 0"}}><strong>Goal: get to ID</strong> — show everything up to a target task</p>
            </div>
            <div>
              <div style={{fontWeight:700,color:"#10b981",marginBottom:2}}>Task Rows</div>
              <p style={{margin:"2px 0"}}>Click any row to expand: full description, personnel, timestamps, flags</p>
              <p style={{margin:"2px 0"}}>Red rows = past due. Yellow row = goal target</p>
            </div>
            <div>
              <div style={{fontWeight:700,color:"#475569",marginBottom:2}}>Navigation</div>
              <p style={{margin:"2px 0"}}><strong>← Home</strong> — back to upload, resets everything</p>
              <p style={{margin:"2px 0"}}><strong>Re-upload</strong> — swap CSV, stay in dashboard</p>
              <p style={{margin:"2px 0"}}><strong>Search</strong> — type name, ID, or keyword to find tasks</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4,padding:"6px 10px",background:"#fff",borderBottom:"1px solid #e2e8f0"}}>
        {[["Showing",stats.total,"#475569",null],["Planned",stats.pln,"#3b82f6","pln"],["In Progress",stats.wip,"#f59e0b","wip"],["Complete",stats.done,"#10b981","done"],["Past Due",stats.pastdue,"#dc2626","pastdue"],["US/CA Impact",stats.ui,"#7c3aed","ui"]].map(([l,v,c,key])=>(
          <div key={l} onClick={()=>{if(key)setStatFilter(statFilter===key?null:key);}} style={{textAlign:"center",padding:"4px 3px",cursor:key?"pointer":"default",borderRadius:6,background:statFilter===key?c+"14":"transparent",border:statFilter===key?`2px solid ${c}`:"2px solid transparent",transition:"all 0.15s"}}>
            <div style={{fontSize:18,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:9,color:statFilter===key?c:"#94a3b8",fontWeight:600}}>{l}{statFilter===key?" \u2715":""}</div>
          </div>
        ))}
      </div>

      {/* Day Focus */}
      <div style={{padding:"8px 10px",background:"#fefce8",borderBottom:"1px solid #e2e8f0",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:10,fontWeight:700,color:"#92400e"}}>DAY FOCUS</span>
        <input type="date" value={focusDate} onChange={e=>{setFocusDate(e.target.value);if(dayMode==="none"&&e.target.value)setDayMode("starting");}} style={{fontSize:11,padding:"3px 6px",borderRadius:4,border:"1px solid #d97706",background:"#fff"}}/>
        <div style={{display:"flex",gap:2}}>
          {[["none","Off"],["starting","Starting this day"],["dueby","Due by EOD"],["goal","Goal: get to ID"]].map(([v,lb])=>(
            <button key={v} onClick={()=>setDayMode(v)} style={{padding:"3px 8px",fontSize:10,fontWeight:600,border:"1px solid #d97706",borderRadius:4,cursor:"pointer",background:dayMode===v?"#f59e0b":"#fff",color:dayMode===v?"#fff":"#92400e"}}>{lb}</button>
          ))}
        </div>
        {dayMode==="goal"&&(
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <input value={goalId} onChange={e=>setGoalId(e.target.value)} placeholder="e.g. CPY-5 or M3-132" list="task-ids" style={{fontSize:11,padding:"3px 6px",borderRadius:4,border:"1px solid #d97706",width:120,fontFamily:"monospace"}}/>
            <datalist id="task-ids">{tasks.slice(0,500).map(t=>(<option key={t.id} value={t.id}/>))}</datalist>
            {goalIdx>=0&&(<span style={{fontSize:10,color:"#10b981",fontWeight:600}}>Found {"\u2014"} showing up to {tasks[goalIdx].id}</span>)}
            {goalId&&goalIdx<0&&(<span style={{fontSize:10,color:"#dc2626",fontWeight:600}}>ID not found</span>)}
          </div>
        )}
        {(dayMode!=="none"||focusDate)&&(
          <button onClick={()=>{setDayMode("none");setFocusDate("");setGoalId("");}} style={{padding:"2px 6px",fontSize:9,background:"#fee2e2",color:"#dc2626",border:"none",borderRadius:3,cursor:"pointer",fontWeight:600,marginLeft:"auto"}}>{"\u2715"} Clear day focus</button>
        )}
        {dayMode!=="none"&&dayMode!=="goal"&&focusDateObj&&(
          <span style={{fontSize:10,color:"#92400e",marginLeft:"auto",fontWeight:600}}>
            {dayMode==="starting"?"Showing tasks starting":"Showing tasks due by EOD"} {fmtDateShort(focusDateObj)}
          </span>
        )}
      </div>

      {/* Column headers */}
      <div style={{display:"grid",gridTemplateColumns:"70px 44px 1fr 100px 58px 58px",padding:"4px 10px",background:"#f1f5f9",borderBottom:"1px solid #e2e8f0",fontSize:9,fontWeight:700,color:"#64748b",gap:5}}>
        <span>ID</span><span>Status</span><span>Description</span><span>Executor</span><span>Start</span><span>End</span>
      </div>

      {/* Task list */}
      <div style={{background:"#fff",borderRadius:"0 0 12px 12px",border:"1px solid #e2e8f0",borderTop:0,maxHeight:460,overflowY:"auto"}}>
        {viewMode==="phase"&&PH.filter(p=>pF==="all"||p.id===pF).map(p=>{
          const pt=phaseGroups[p.id]||[];if(!pt.length)return null;
          const dn=pt.filter(t=>t.s==="4-Complete").length;
          return(<div key={p.id}><SectionHeader label={p.l} sublabel={p.f} color={p.cl} count={pt.length} done={dn}/>{pt.map(t=>(<Row key={t.id} t={t}/>))}</div>);
        })}
        {viewMode==="day"&&dayGroups.map(([day,ts])=>(
          <div key={day}><SectionHeader label={day} color="#475569" count={ts.length} done={ts.filter(t=>t.s==="4-Complete").length}/>{ts.map(t=>(<Row key={t.id} t={t}/>))}</div>
        ))}
        {viewMode==="flat"&&statsFiltered.map(t=>(<Row key={t.id} t={t}/>))}
        {!statsFiltered.length&&(<div style={{padding:30,textAlign:"center",color:"#94a3b8",fontSize:13}}>No tasks match filters{statFilter&&(<span> {"\u2014"} <button onClick={()=>setStatFilter(null)} style={{color:"#3b82f6",background:"none",border:"none",cursor:"pointer",fontSize:13,textDecoration:"underline"}}>clear stat filter</button></span>)}</div>)}
      </div>
    </div>
  );
}
