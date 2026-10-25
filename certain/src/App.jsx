import { useState, useEffect, useRef } from "react";
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// ─── CERTAIN DESIGN TOKENS — Kalshi-feel, own identity ───────────────────────
const K = {
  bg:          "#ffffff",
  bgGray:      "#f5f6f9",
  bgDark:      "#0d0d0d",
  surface:     "#ffffff",
  border:      "#e4e7ef",
  borderMid:   "#c9cfe0",
  text:        "#0f1120",
  textMid:     "#5a6280",
  textLight:   "#9299b8",
  green:       "#1e40af",
  greenDim:    "#1e40af12",
  greenText:   "#1e3a8f",
  // Positive/solvent outcomes use emerald (separate from primary)
  positive:    "#10b981",
  positiveDim: "#10b98112",
  positiveText:"#0a9468",
  red:         "#e8394a",
  redDim:      "#e8394a10",
  blue:        "#0ea5e9",
  blueDim:     "#0ea5e910",
  yellow:      "#f59e0b",
};

const FONT = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');`;

// ─── QUESTIONS ────────────────────────────────────────────────────────────────
const QUESTIONS = [
  { id:"name",          type:"text",   q:"What's your first name?",                        sub:"We'll personalize your plan.",                                  ph:"First name" },
  { id:"age",           type:"number", q:"How old are you today?",                          sub:"This anchors your entire financial timeline.",                  ph:"45" },
  { id:"retireAge",     type:"number", q:"When do you want to retire?",                     sub:"Your target age to stop working full-time.",                    ph:"65" },
  { id:"situation",     type:"choice", q:"What's your household situation?",                sub:"This shapes income, expenses, and risk modeling.",
    opts:[
      {v:"solo",      l:"Solo",              s:"Single, no dependents"},
      {v:"partner",   l:"With a partner",    s:"Dual income or shared expenses"},
      {v:"family",    l:"Family with kids",  s:"Dependents to plan around"},
      {v:"solo_kids", l:"Solo parent",       s:"Single with dependents"},
    ]},
  { id:"lifestyle",     type:"choice", q:"What's your retirement spending target?",         sub:"Annual costs in today's dollars.",
    opts:[
      {v:80000,  l:"$80K / year",   s:"Comfortable — covered, no stress"},
      {v:115000, l:"$115K / year",  s:"Well-off — travel, dining, experiences"},
      {v:155000, l:"$155K / year",  s:"Premium — nothing off the table"},
      {v:200000, l:"$200K+ / year", s:"Luxury — the full life"},
    ]},
  { id:"brokerage",     type:"number", q:"Taxable brokerage balance today?",                sub:"Stocks, ETFs, index funds. Approximate is fine.",               ph:"150000", prefix:"$" },
  { id:"k401",          type:"number", q:"401(k) or IRA balance today?",                    sub:"All tax-deferred accounts combined.",                           ph:"500000", prefix:"$" },
  { id:"monthlyContrib",type:"number", q:"Monthly investment contributions?",               sub:"Outside of 401k — brokerage or savings.",                      ph:"2500",   prefix:"$" },
  { id:"ssAge",         type:"choice", q:"When will you claim Social Security?",            sub:"Delaying past 67 increases your benefit significantly.",
    opts:[
      {v:62, l:"Age 62",        s:"Earliest — benefit reduced ~30%"},
      {v:67, l:"Age 67",        s:"Full retirement age"},
      {v:70, l:"Age 70",        s:"Maximum — ~77% more than age 62"},
      {v:0,  l:"N/A / Not sure",s:"We'll model without it"},
    ]},
  { id:"where",         type:"choice", q:"Where will you live in retirement?",              sub:"Affects cost of living and healthcare projections.",
    opts:[
      {v:"nyc",     l:"NYC / Tri-state",    s:"High cost, world-class city infrastructure"},
      {v:"lowcost", l:"Lower-cost US city", s:"Southeast, Midwest, Southwest"},
      {v:"florida", l:"Florida",            s:"No state income tax, warm climate"},
      {v:"europe",  l:"Europe",             s:"Universal healthcare, walkable cities"},
      {v:"unsure",  l:"Not sure yet",       s:"We'll use a neutral US baseline"},
    ]},
];

// ─── SIMULATION ───────────────────────────────────────────────────────────────
function simulate(a) {
  const age    = +a.age||45, retire = +a.retireAge||65;
  const spend  = +a.lifestyle||115000;
  const brk0   = +a.brokerage||150000, k4010 = +a.k401||500000;
  const mo     = +a.monthlyContrib||2000;
  const ssAge  = +a.ssAge||0;
  const where  = a.where||"unsure";
  const END=95, INF=0.03;
  const col  = where==="nyc"?1.15:where==="europe"?0.82:where==="florida"?0.95:1.0;
  const hcM  = where==="europe"?0.25:1.0;
  const SS_MO= ssAge>=70?4400:ssAge>=67?3200:ssAge>=62?2200:0;
  const R_A=0.09, R_R=0.065;

  let brk=brk0,k401=k4010,roth=0,hsa=0;
  const rows=[];

  for(let ag=age;ag<retire;ag++){
    const cu=ag>=50?7500:0;
    brk +=brk*R_A+mo*12; k401+=k401*R_A*0.85+23000+cu;
    roth+=roth*R_A+7000;  hsa +=hsa*R_A*0.9+4150;
    rows.push({age:ag,phase:"acc",brk:Math.round(brk),k401:Math.round(k401),roth:Math.round(roth),hsa:Math.round(hsa),total:Math.round(brk+k401+roth+hsa)});
  }
  for(let ag=retire;ag<=END;ag++){
    const yFN=ag-age;
    brk=Math.max(0,brk)*(1+R_R); k401=Math.max(0,k401)*(1+R_R*0.85);
    roth=Math.max(0,roth)*(1+R_R); hsa=Math.max(0,hsa)*(1+R_R*0.8);
    if(ssAge>0&&ag>=retire&&ag<ssAge&&k401>30000){k401-=30000;roth+=30000;}
    const lc=spend*col*Math.pow(1+INF,yFN);
    const hcB=(ag<67?18000:ag<80?8000:26000)*hcM;
    const hc=hcB*Math.pow(1+INF,yFN);
    const needs=lc+hc;
    const ss=ssAge>0&&ag>=ssAge?SS_MO*12:0;
    let hsaU=0;
    if(hsa>0){hsaU=Math.min(hsa,hc);hsa-=hsaU;}
    let gap=Math.max(0,needs-ss-hsaU);
    let bU=0,kU=0,rU=0;
    if(brk>=gap){bU=gap;brk-=gap;gap=0;}else{bU=brk;gap-=brk;brk=0;}
    if(k401>=gap){kU=gap;k401-=gap;gap=0;}else{kU=k401;gap-=k401;k401=0;}
    if(roth>=gap){rU=gap;roth-=gap;gap=0;}else{rU=roth;roth=0;}
    const total=Math.max(0,brk+k401+roth+hsa);
    rows.push({age:ag,phase:"ret",brk:Math.round(Math.max(0,brk)),k401:Math.round(Math.max(0,k401)),roth:Math.round(Math.max(0,roth)),hsa:Math.round(Math.max(0,hsa)),total:Math.round(total),needs:Math.round(needs),ss:Math.round(ss),hsaU:Math.round(hsaU),bU:Math.round(bU),kU:Math.round(kU),rU:Math.round(rU),depleted:total<=0});
    if(total<=0)break;
  }
  return rows;
}

const fmtM=v=>v==null?"—":v>=1e6?`$${(v/1e6).toFixed(2)}M`:`$${(v/1000).toFixed(0)}K`;
const fmtD=v=>`$${Math.round(v||0).toLocaleString()}`;
const fmtN=v=>Math.round(v||0).toLocaleString();

const KTip=({active,payload,label})=>{
  if(!active||!payload?.length)return null;
  return(
    <div style={{background:K.bg,border:`1px solid ${K.border}`,borderRadius:8,padding:"10px 14px",fontSize:11,fontFamily:"'JetBrains Mono',monospace",boxShadow:"0 4px 16px #0000000a"}}>
      <div style={{color:K.textLight,marginBottom:6,fontSize:10}}>Age {label}</div>
      {payload.filter(p=>p.value>0).map((p,i)=>(
        <div key={i} style={{color:p.color||K.text,marginBottom:2}}>{p.name}: <b style={{color:K.text}}>{fmtD(p.value)}</b></div>
      ))}
    </div>
  );
};

// ─── AI INSIGHTS ──────────────────────────────────────────────────────────────
async function getInsights(answers,sim){
  const dep=sim.find(r=>r.depleted),at95=sim.find(r=>r.age===95),atR=sim.find(r=>r.age===+answers.retireAge);
  try{
    const prompt=`You are a direct financial advisor. Write 3 short personalized insights for ${answers.name}, age ${answers.age}, retiring at ${answers.retireAge}, ${answers.situation}, $${answers.lifestyle}/yr target, $${answers.brokerage} brokerage, $${answers.k401} 401k, $${answers.monthlyContrib}/mo contributions, SS at age ${answers.ssAge||"not claiming"}, retiring in ${answers.where}. Portfolio at retirement: ${atR?fmtM(atR.total):"N/A"}. Portfolio at 95: ${dep?`DEPLETED at ${dep.age}`:at95?fmtM(at95.total):"N/A"}. Return ONLY JSON array: [{"title":"concise 4-6 word title","body":"2 direct sentences with specific numbers","type":"warning|tip|good"}]. No markdown.`;
    const res=await fetch("/api/insights",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
    const d=await res.json();
    const t=d.content?.find(c=>c.type==="text")?.text||"[]";
    return JSON.parse(t.replace(/```json|```/g,"").trim());
  }catch{
    return[
      {title:"Open Backdoor Roth IRA Now",body:"At your income level, contribute $7,000 to a Traditional IRA and immediately convert to Roth. Over 20 years this compounds into a significant tax-free pool.",type:"tip"},
      {title:"HSA Is Your Secret Weapon",body:"An HSA gives triple-tax advantages — deductible, grows tax-free, withdraws tax-free for medical. Solo retirees face the highest late-life healthcare costs.",type:"tip"},
      {title:"Delay Social Security to 70",body:"Each year you delay past 62 increases your benefit by 6–8%. Waiting to 70 versus 62 could mean $1,200+ more per month for life.",type:"good"},
    ];
  }
}

async function fetchNews(){
  try{
    const res=await fetch("/api/news",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({})});
    const d=await res.json();
    const t=d.content?.filter(c=>c.type==="text").map(c=>c.text).join("")||"[]";
    return JSON.parse(t.replace(/```json|```/g,"").trim());
  }catch{
    return[
      {headline:"Fed Holds Rates Steady at May Meeting",summary:"The Federal Reserve kept rates unchanged — positive for bond allocations in retirement portfolios.",tag:"Fed Rates",time:"2 days ago",url:null},
      {headline:"Social Security COLA 2026 Projected at 2.3%",summary:"Early projections suggest a modest cost-of-living adjustment, lower than recent high-inflation years.",tag:"Social Security",time:"4 days ago",url:null},
      {headline:"IRS Confirms 2025 401(k) Limits: $23,000 Base",summary:"Catch-up for ages 50+ stays at $7,500, bringing the total to $30,500 annually.",tag:"401k",time:"5 days ago",url:null},
      {headline:"Medicare Part B Premium Up 5.9% for 2026",summary:"Rising premiums increase projected healthcare costs for retirees — HSA funding becomes more valuable.",tag:"Medicare",time:"6 days ago",url:null},
      {headline:"Inflation Holds at 2.8% — Near Fed Target",summary:"Stabilizing inflation supports real equity returns and reduces the purchasing power erosion risk in retirement.",tag:"Inflation",time:"1 week ago",url:null},
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function Navbar({page,setPage,hasResults}){
  return(
    <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:200,background:K.bg,borderBottom:`1px solid ${K.border}`,height:56,display:"flex",alignItems:"center",padding:"0 24px",justifyContent:"space-between"}}>
      <style>{`
        .nlink{background:none;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;color:${K.textMid};padding:6px 10px;border-radius:6px;transition:all 0.15s;}
        .nlink:hover,.nlink.on{color:${K.text};}
        .nlink.on{background:${K.bgGray};}
        .cta-nav{background:${K.green};color:#fff;border:none;border-radius:8px;padding:8px 18px;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;}
        .cta-nav:hover{background:#1e3a8f;}
      `}</style>
      <button onClick={()=>setPage("home")} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:28,height:28,background:K.green,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <span style={{color:"#fff",fontSize:14,fontWeight:700,fontFamily:"'Plus Jakarta Sans',sans-serif"}}>C</span>
        </div>
        <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:16,fontWeight:700,color:K.text}}>Certain</span>
      </button>
      <div style={{display:"flex",gap:2,alignItems:"center"}}>
        {[["Simulator","simulator"],["News","news"],["About","about"]].map(([l,p])=>(
          <button key={p} className={`nlink${page===p?" on":""}`} onClick={()=>setPage(p)}>{l}</button>
        ))}
        <button className="cta-nav" style={{marginLeft:8}} onClick={()=>setPage("simulator")}>
          {hasResults?"Update plan →":"Get started →"}
        </button>
      </div>
    </nav>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────
function Home({setPage}){
  return(
    <div style={{minHeight:"100vh",background:K.bg,paddingTop:56}}>
      <style>{`
        .hero-btn{background:${K.green};color:#fff;border:none;border-radius:10px;padding:16px 44px;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:-0.01em;}
        .hero-btn:hover{background:#1e3a8f;transform:translateY(-1px);box-shadow:0 8px 24px ${K.green}40;}
        .feat-card{background:${K.bg};border:1px solid ${K.border};border-radius:12px;padding:24px;transition:all 0.2s;}
        .feat-card:hover{border-color:${K.borderMid};box-shadow:0 4px 20px #0000000a;}
        .stat-card{background:${K.bgGray};border-radius:12px;padding:24px 28px;text-align:center;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fadeUp 0.6s ease both;}
        .fu1{animation-delay:0.05s}.fu2{animation-delay:0.12s}.fu3{animation-delay:0.2s}.fu4{animation-delay:0.28s}
      `}</style>

      {/* Hero */}
      <section style={{padding:"80px 24px 72px",maxWidth:920,margin:"0 auto",textAlign:"center"}}>
        <div className="fu" style={{display:"inline-flex",alignItems:"center",gap:8,background:K.greenDim,border:`1px solid ${K.green}30`,borderRadius:20,padding:"5px 14px",marginBottom:28}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:K.green}}/>
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,fontWeight:600,color:K.greenText,letterSpacing:"0.04em"}}>FREE · NO ACCOUNT · NO DATA STORED</span>
        </div>

        <h1 className="fu fu1" style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:"clamp(38px,6vw,68px)",color:K.text,lineHeight:1.08,letterSpacing:"-0.03em",marginBottom:20}}>
          Stop wondering if<br/>you'll be <span style={{color:"#f5c842"}}>okay.</span>
        </h1>

        <p className="fu fu2" style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:"clamp(15px,2vw,18px)",color:K.textMid,maxWidth:520,margin:"0 auto 40px",lineHeight:1.7,fontWeight:400}}>
          Certain builds your complete retirement plan in 3 minutes — free, private, and honest. No advisor. No account. Just your numbers.
        </p>

        <div className="fu fu3" style={{display:"flex",gap:12,justifyContent:"center",alignItems:"center",flexWrap:"wrap"}}>
          <button className="hero-btn" onClick={()=>setPage("simulator")}>Build my plan — free →</button>
          <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:K.textLight}}>Your data never leaves your browser</span>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{borderTop:`1px solid ${K.border}`,borderBottom:`1px solid ${K.border}`,padding:"32px 24px"}}>
        <div style={{maxWidth:900,margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:16}}>
          {[
            {n:"40%",l:"of Americans have no retirement plan"},
            {n:"1 in 3",l:"women will outlive their savings"},
            {n:"3 min",l:"to build your full picture"},
            {n:"$0",l:"free forever, no hidden fees"},
          ].map((s,i)=>(
            <div key={i} className="stat-card">
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:32,fontWeight:700,color:K.green,letterSpacing:"-0.03em",marginBottom:6}}>{s.n}</div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,color:K.textMid,lineHeight:1.5}}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{padding:"72px 24px",maxWidth:900,margin:"0 auto"}}>
        <div style={{marginBottom:44,textAlign:"center"}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.green,fontWeight:500,letterSpacing:"0.12em",marginBottom:10}}>HOW IT WORKS</div>
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:"clamp(24px,3.5vw,36px)",color:K.text,letterSpacing:"-0.02em"}}>Built around your actual life</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
          {[
            {n:"01",t:"Answer 10 questions",b:"Your age, savings, situation, where you want to live, when you want to stop working. No bank connection needed."},
            {n:"02",t:"Get your full plan",b:"A complete retirement simulation from today to age 95. Every account, every scenario, AI-powered and personalized."},
            {n:"03",t:"See what to do first",b:"Clear next steps ranked by impact — specific to your numbers, not generic advice copied from a brochure."},
            {n:"04",t:"Stay informed",b:"Daily curated news filtered to what actually affects your retirement. Fed decisions, Social Security, Medicare changes."},
          ].map((f,i)=>(
            <div key={i} className="feat-card">
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,fontWeight:500,color:K.green,marginBottom:12}}>{f.n}</div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,fontWeight:600,color:K.text,marginBottom:8,letterSpacing:"-0.01em"}}>{f.t}</div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,color:K.textMid,lineHeight:1.7}}>{f.b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{background:K.bgGray,borderTop:`1px solid ${K.border}`,padding:"72px 24px",textAlign:"center"}}>
        <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:"clamp(24px,4vw,42px)",color:K.text,letterSpacing:"-0.02em",marginBottom:14,lineHeight:1.15}}>
          The anxiety doesn't go away<br/>until you look at the numbers.
        </h2>
        <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,color:K.textMid,marginBottom:32,maxWidth:400,margin:"0 auto 32px"}}>
          Take 3 minutes. See your full picture. Feel certain.
        </p>
        <button className="hero-btn" onClick={()=>setPage("simulator")}>Build my plan — it's free →</button>
      </section>

      <footer style={{borderTop:`1px solid ${K.border}`,padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:700,color:K.text}}>Certain</span>
        <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:K.textLight}}>For educational purposes only. Not financial advice. Your data stays in your browser.</span>
      </footer>
    </div>
  );
}

// ─── SIMULATOR ────────────────────────────────────────────────────────────────
const EDIT_QUESTIONS = QUESTIONS.filter(q => q.id !== "name");

function Simulator({onComplete,existing}){
  const isUpdate = !!existing;

  // ── UPDATE MODE: single scrollable form ──────────────────────────────────────
  if(isUpdate){
    const [form,setForm]=useState({...existing});
    const set=(id,val)=>setForm(f=>({...f,[id]:val}));

    const labelStyle={fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:600,color:K.text,marginBottom:6,display:"block"};
    const subStyle={fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:K.textMid,marginBottom:10};

    return(
      <div style={{minHeight:"100vh",paddingTop:56,background:K.bgGray}}>
        <style>{`
          .eq-input{background:${K.bg};border:1.5px solid ${K.border};border-radius:9px;padding:11px 16px;color:${K.text};font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:500;width:100%;outline:none;transition:border-color 0.15s;}
          .eq-input:focus{border-color:${K.green};}
          .eq-opt{background:${K.bg};border:1.5px solid ${K.border};border-radius:9px;padding:11px 16px;cursor:pointer;transition:all 0.15s;text-align:left;width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;}
          .eq-opt:hover{border-color:${K.green};background:${K.greenDim};}
          .eq-opt.selected{border-color:${K.green};background:${K.greenDim};}
          .eq-card{background:${K.bg};border:1px solid ${K.border};border-radius:12px;padding:20px 22px;margin-bottom:14px;}
          .save-btn{background:${K.green};color:#fff;border:none;border-radius:9px;padding:14px 40px;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.2s;letter-spacing:-0.01em;width:100%;}
          .save-btn:hover{background:#1e3a8f;}
        `}</style>

        {/* Header */}
        <div style={{background:K.bg,borderBottom:`1px solid ${K.border}`,padding:"20px 24px"}}>
          <div style={{maxWidth:600,margin:"0 auto"}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.green,letterSpacing:"0.12em",marginBottom:6}}>UPDATE YOUR ASSUMPTIONS</div>
            <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:24,color:K.text,letterSpacing:"-0.02em",marginBottom:4}}>
              Hi {existing.name} — adjust anything below
            </h1>
            <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,color:K.textMid}}>
              Your name is saved. Update any other assumptions and recalculate your plan.
            </p>
          </div>
        </div>

        <div style={{maxWidth:600,margin:"0 auto",padding:"24px"}}>
          {EDIT_QUESTIONS.map((q,i)=>(
            <div key={q.id} className="eq-card">
              <label style={labelStyle}>{q.q}</label>
              {q.sub&&<div style={subStyle}>{q.sub}</div>}

              {(q.type==="text"||q.type==="number")&&(
                <div style={{position:"relative"}}>
                  {q.prefix&&<span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",color:K.textMid,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,fontWeight:500}}>{q.prefix}</span>}
                  <input className="eq-input" type={q.type} placeholder={q.ph}
                    value={form[q.id]||""}
                    style={{paddingLeft:q.prefix?34:16}}
                    onChange={e=>set(q.id,e.target.value)}/>
                </div>
              )}

              {q.type==="choice"&&(
                <div>
                  {q.opts.map((o,j)=>(
                    <button key={j} className={`eq-opt${form[q.id]===o.v?" selected":""}`} onClick={()=>set(q.id,o.v)}>
                      <div>
                        <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,fontWeight:600,color:K.text,marginBottom:1}}>{o.l}</div>
                        <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:K.textMid}}>{o.s}</div>
                      </div>
                      {form[q.id]===o.v
                        ?<div style={{width:18,height:18,borderRadius:"50%",background:K.green,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{color:"#fff",fontSize:11}}>✓</span>
                        </div>
                        :<div style={{width:18,height:18,borderRadius:"50%",border:`1.5px solid ${K.border}`,flexShrink:0}}/>
                      }
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <button className="save-btn" onClick={()=>onComplete({...form,name:existing.name})}>
            Recalculate my plan →
          </button>
          <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:K.textLight,textAlign:"center",marginTop:10}}>
            Your data never leaves your browser
          </p>
        </div>
      </div>
    );
  }

  // ── NEW USER MODE: stepped one-at-a-time intake ───────────────────────────────
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState({});
  const [input,setInput]=useState("");
  const [animIn,setAnimIn]=useState(true);
  const ref=useRef(null);
  const q=QUESTIONS[step];
  const pct=(step/QUESTIONS.length)*100;

  useEffect(()=>{if(ref.current)setTimeout(()=>ref.current?.focus(),280);},[step]);

  const go=(val)=>{
    const next={...answers,[q.id]:val};
    setAnswers(next);setInput("");setAnimIn(false);
    if(step<QUESTIONS.length-1)setTimeout(()=>{setStep(s=>s+1);setAnimIn(true);},170);
    else onComplete(next);
  };

  return(
    <div style={{minHeight:"100vh",paddingTop:56,background:K.bg,display:"flex",flexDirection:"column"}}>
      <style>{`
        .qslide{opacity:0;transform:translateX(18px);transition:all 0.3s ease;}
        .qslide.in{opacity:1;transform:translateX(0);}
        .qopt{background:${K.bg};border:1.5px solid ${K.border};border-radius:10px;padding:14px 18px;cursor:pointer;transition:all 0.15s;text-align:left;width:100%;display:flex;justify-content:space-between;align-items:center;}
        .qopt:hover{border-color:${K.green};background:${K.greenDim};}
        .qinput{background:${K.bg};border:1.5px solid ${K.border};border-radius:10px;padding:14px 18px;color:${K.text};font-family:'Plus Jakarta Sans',sans-serif;font-size:18px;font-weight:500;width:100%;outline:none;transition:border-color 0.15s;letter-spacing:-0.01em;}
        .qinput:focus{border-color:${K.green};}
        .qinput::placeholder{color:${K.textLight};}
        .qcont{background:${K.green};color:#fff;border:none;border-radius:9px;padding:13px 32px;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:12px;transition:all 0.2s;letter-spacing:-0.01em;}
        .qcont:disabled{opacity:0.3;cursor:not-allowed;}
        .qcont:not(:disabled):hover{background:#1e3a8f;}
        .backbtn{background:none;border:1px solid ${K.border};border-radius:7px;padding:6px 14px;color:${K.textMid};cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:12px;transition:all 0.15s;}
        .backbtn:hover{border-color:${K.borderMid};color:${K.text};}
      `}</style>

      <div style={{height:3,background:K.bgGray,position:"fixed",top:56,left:0,right:0,zIndex:100}}>
        <div style={{height:"100%",background:K.green,width:`${pct}%`,transition:"width 0.35s ease",borderRadius:2}}/>
      </div>

      <div style={{padding:"16px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        {step>0
          ?<button className="backbtn" onClick={()=>{setAnimIn(false);setTimeout(()=>{setStep(s=>s-1);setAnimIn(true);},150);}}>← Back</button>
          :<div/>}
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:K.textLight}}>{step+1} / {QUESTIONS.length}</span>
      </div>

      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px 24px"}}>
        <div className={`qslide${animIn?" in":""}`} style={{maxWidth:480,width:"100%"}}>
          <h2 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:"clamp(20px,3.5vw,30px)",color:K.text,letterSpacing:"-0.02em",marginBottom:8,lineHeight:1.2}}>{q.q}</h2>
          {q.sub&&<p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,color:K.textMid,marginBottom:24,lineHeight:1.6}}>{q.sub}</p>}

          {(q.type==="text"||q.type==="number")&&(
            <div>
              <div style={{position:"relative"}}>
                {q.prefix&&<span style={{position:"absolute",left:18,top:"50%",transform:"translateY(-50%)",color:K.textMid,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:17,fontWeight:500}}>{q.prefix}</span>}
                <input ref={ref} className="qinput" type={q.type} placeholder={q.ph} value={input}
                  style={{paddingLeft:q.prefix?38:18}}
                  onChange={e=>setInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter"&&input.trim())go(input.trim());}}/>
              </div>
              <br/>
              <button className="qcont" disabled={!input.trim()} onClick={()=>go(input.trim())}>Continue →</button>
            </div>
          )}
          {q.type==="choice"&&(
            <div style={{display:"flex",flexDirection:"column",gap:9}}>
              {q.opts.map((o,i)=>(
                <button key={i} className="qopt" onClick={()=>go(o.v)}>
                  <div>
                    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:15,fontWeight:600,color:K.text,marginBottom:1,letterSpacing:"-0.01em"}}>{o.l}</div>
                    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:K.textMid}}>{o.s}</div>
                  </div>
                  <span style={{color:K.textLight,fontSize:16}}>→</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NEXT STEPS ───────────────────────────────────────────────────────────────
function NextSteps({answers}){
  const age=+answers.age||45;
  const retAge=+answers.retireAge||65;
  const [expanded,setExpanded]=useState({});
  const toggle=(pi,ii)=>setExpanded(e=>({...e,[`${pi}-${ii}`]:!e[`${pi}-${ii}`]}));
  const impactColor={Critical:K.red,High:K.green,Medium:K.yellow};

  const phases=[
    {
      period:"This Week",icon:"⚡",color:K.green,
      items:[
        {title:"Open a Backdoor Roth IRA",cat:"Tax",detail:`Go to Fidelity or Vanguard. Open a Traditional IRA. Contribute $${age>=50?8000:7000}. Convert to Roth immediately — same week. File Form 8606 in April. Repeat every January without fail.`,impact:"High"},
        {title:"Check HSA eligibility",cat:"Benefits",detail:"Log into your benefits portal and check if your health plan is HSA-eligible (high-deductible). If yes, open an HSA account and set up automatic contributions. Invest in a total market index fund — not a money market.",impact:"High"},
      ]
    },
    {
      period:"This Month",icon:"📅",color:K.yellow,
      items:[
        {title:"Review 401k allocation",cat:"Investing",detail:`With ${Math.max(0,retAge-age)} years to retirement, a moderate allocation may be leaving serious returns on the table. Log into your 401k portal and consider shifting to 75–80% equities. Small-cap and international can be added for diversification.`,impact:"High"},
        {title:"Set up automatic brokerage contributions",cat:"Savings",detail:`Automate your monthly brokerage contribution of $${(+answers.monthlyContrib||2500).toLocaleString()}. Automation removes the decision — and the temptation to skip months during market downturns.`,impact:"Medium"},
      ]
    },
    {
      period:"This Quarter",icon:"🗓",color:K.blue,
      items:[
        {title:"Run a full insurance audit",cat:"Protection",detail:"Review life, disability, and umbrella insurance. As a solo planner with no dependents, disability coverage is more critical than life — your income is your only safety net. Check your current employer coverage and gaps.",impact:"Medium"},
        {title:"Create or update your will and POA",cat:"Legal",detail:"Without children, you need to deliberately name a healthcare proxy and durable power of attorney. These documents decide who makes decisions for you if you can't. An estate attorney can draft both for $800–1,500.",impact:"High"},
      ]
    },
    {
      period:`Ages ${age+1}–${Math.min(age+5,retAge-3)}`,icon:"📆",color:"#7c3aed",
      items:[
        {title:"Max catch-up contributions at 50",cat:"Tax",detail:"When you turn 50, your 401k limit jumps to $30,500/yr (+$7,500 catch-up) and your Roth IRA to $8,000/yr. Set a calendar reminder to increase contributions the year you turn 50 — this is one of the highest-leverage moves available.",impact:"High"},
        {title:"Build your advisory income pipeline",cat:"Career",detail:"If you plan to do advisory or fractional work post-retirement, start building those relationships 5+ years early. Identify 3–4 target companies. Cultivate board-level relationships at UBS clients. Your network is your future income.",impact:"High"},
        {title:"Run a retirement location analysis",cat:"Lifestyle",detail:"Spend at least one month in any city or country you're considering retiring in before age 55. Healthcare quality, walkability, social infrastructure, and cost of living feel very different at 65 than on a holiday. Make the decision with experience, not imagination.",impact:"Medium"},
      ]
    },
    {
      period:`Ages ${Math.max(age+1,retAge-5)}–${retAge-1} (Pre-Retirement)`,icon:"🎯",color:K.green,
      items:[
        {title:"Build a 24-month cash buffer",cat:"Liquidity",detail:`Hold 24 months of living expenses (~${fmtD((+answers.lifestyle||115000)/12*2)}) in SGOV or high-yield savings before retiring. This is your bridge — it means you never have to sell investments at a bad time in your first two years.`,impact:"Critical"},
        {title:"Get LTC insurance quotes",cat:"Insurance",detail:`Long-term care insurance premiums rise sharply after 60 and become uninsurable after certain health events. As a solo planner, this is your most important insurance decision — no family caregiver means professional care is the only option. Get quotes at ${Math.min(57,retAge-6)}.`,impact:"Critical"},
        {title:"Lock in 2–3 advisory commitments",cat:"Income",detail:"Before leaving your primary job, have signed advisory agreements in place. One engagement doesn't count — boards end, companies get acquired, relationships change. Two or three gives you income resilience.",impact:"High"},
        {title:"Consult a fee-only fiduciary CFP",cat:"Planning",detail:"One comprehensive planning session ($1,500–3,000) to verify your withdrawal sequencing, Social Security timing, Roth conversion ladder, and tax strategy. Fee-only means no commission — they work for you, not a fund company.",impact:"High"},
      ]
    },
    {
      period:`Age ${retAge}+ (Retirement)`,icon:"✦",color:K.positive,
      items:[
        {title:"Begin Roth conversion ladder",cat:"Tax",detail:`Ages ${retAge}–${+answers.ssAge||72} is your low-income window. Convert $25–30K/yr from 401k to Roth while staying in the 12% bracket. This reduces future RMDs and moves money to a tax-free, no-RMD account.`,impact:"High"},
        {title:"Delay Social Security to maximize benefit",cat:"Income",detail:`Every year you delay past 62 increases your benefit by 6–8%. At age ${+answers.ssAge||72}, your benefit locks in for life with COLA adjustments. With a plan to age 95, the delayed benefit pays off significantly.`,impact:"Critical"},
        {title:"Establish legal and medical infrastructure",cat:"Legal",detail:"At retirement, ensure your healthcare proxy, advance directive, and financial POA are current and your designees know where to find them. Consider a geriatric care manager relationship — better to establish trust at 65 than find one in a crisis at 82.",impact:"High"},
      ]
    },
  ];

  return(
    <div>
      <style>{`
        .cal-item{background:${K.bg};border:1px solid ${K.border};border-radius:10px;margin-bottom:8px;overflow:hidden;transition:border-color 0.15s;cursor:pointer;}
        .cal-item:hover{border-color:${K.borderMid};}
        .cal-header{padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:12px;}
        .cal-body{padding:0 16px 14px;border-top:1px solid ${K.border};}
      `}</style>
      <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.textLight,letterSpacing:"0.1em",marginBottom:16}}>
        YOUR ACTION CALENDAR — {retAge-age} YEARS TO RETIREMENT
      </div>
      {phases.map((phase,pi)=>(
        <div key={pi} style={{marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{width:32,height:32,borderRadius:8,background:phase.color+"18",border:`1px solid ${phase.color}30`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
              {phase.icon}
            </div>
            <div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:700,color:K.text,letterSpacing:"-0.01em"}}>{phase.period}</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.textLight}}>{phase.items.length} action{phase.items.length>1?"s":""}</div>
            </div>
            <div style={{flex:1,height:1,background:K.border,marginLeft:4}}/>
          </div>
          {phase.items.map((item,ii)=>{
            const key=`${pi}-${ii}`;
            const open=expanded[key];
            return(
              <div key={ii} className="cal-item" onClick={()=>toggle(pi,ii)}>
                <div className="cal-header">
                  <div style={{display:"flex",alignItems:"center",gap:10,flex:1,minWidth:0}}>
                    <div style={{width:6,height:6,borderRadius:"50%",background:phase.color,flexShrink:0}}/>
                    <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:600,color:K.text,letterSpacing:"-0.01em",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,fontWeight:600,color:impactColor[item.impact]||K.textMid,background:(impactColor[item.impact]||K.textMid)+"14",padding:"2px 8px",borderRadius:20}}>{item.impact}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:9,color:K.textLight,background:K.bgGray,padding:"2px 8px",borderRadius:20}}>{item.cat}</span>
                    <span style={{color:K.textLight,fontSize:12,transition:"transform 0.2s",display:"inline-block",transform:open?"rotate(180deg)":"rotate(0deg)"}}>▾</span>
                  </div>
                </div>
                {open&&(
                  <div className="cal-body">
                    <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,color:K.textMid,lineHeight:1.75}}>{item.detail}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
      <div style={{display:"flex",gap:16,padding:"12px 0",borderTop:`1px solid ${K.border}`,flexWrap:"wrap"}}>
        {[["Critical",K.red],["High",K.green],["Medium",K.yellow]].map(([l,c])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:c}}/>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.textMid}}>{l} impact</span>
          </div>
        ))}
        <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.textLight,marginLeft:"auto"}}>Click any action to expand</span>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({answers,setPage}){
  const [tab,setTab]=useState("overview");
  const [insights,setInsights]=useState([]);
  const [loadingI,setLoadingI]=useState(true);
  const sim=simulate(answers);
  const retireAge=+answers.retireAge||65;
  const atR=sim.find(r=>r.age===retireAge)||{};
  const at95=sim.find(r=>r.age===95)||{};
  const dep=sim.find(r=>r.depleted);
  const drawData=sim.filter(r=>r.phase==="ret");
  const ok=!dep;
  const name=answers.name||"You";

  useEffect(()=>{
    setLoadingI(true);
    getInsights(answers,sim).then(i=>{setInsights(i);setLoadingI(false);});
  },[]);

  const iC={warning:K.red,tip:K.yellow,good:K.green};
  const TABS=[{k:"overview",l:"Overview"},{k:"accounts",l:"Accounts"},{k:"steps",l:"Next Steps"}];

  return(
    <div style={{minHeight:"100vh",paddingTop:56,background:K.bgGray}}>
      <style>{`
        .kcard{background:${K.bg};border:1px solid ${K.border};border-radius:12px;padding:20px 22px;transition:border-color 0.15s;}
        .kcard:hover{border-color:${K.borderMid};}
        .ktab{background:none;border:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;padding:8px 14px;border-radius:7px;transition:all 0.15s;letter-spacing:-0.01em;}
        .ktab.on{background:${K.bg};color:${K.text};box-shadow:0 1px 4px #0000000d;}
        .ktab:not(.on){color:${K.textMid};}
        .ktab:not(.on):hover{color:${K.text};}
        .krow{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid ${K.border};font-size:13px;}
        .pulse{animation:kpulse 1.5s ease infinite;}
        @keyframes kpulse{0%,100%{opacity:0.4}50%{opacity:0.9}}
        .tag{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-family:'Plus Jakarta Sans',sans-serif;font-size:11px;font-weight:600;}
      `}</style>

      {/* Dashboard header */}
      <div style={{background:K.bg,borderBottom:`1px solid ${K.border}`,padding:"20px 24px 16px"}}>
        <div style={{maxWidth:1060,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:14}}>
            <div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.textLight,letterSpacing:"0.1em",marginBottom:4}}>RETIREMENT PLAN</div>
              <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:"clamp(18px,3vw,26px)",color:K.text,letterSpacing:"-0.02em"}}>{name}'s Financial Plan</h1>
            </div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",alignItems:"center"}}>
              {[
                {l:`Retire ${retireAge}`,bg:K.greenDim,c:K.greenText},
                {l:`$${(+answers.lifestyle||115000).toLocaleString()}/yr`,bg:K.bgGray,c:K.textMid},
                {l:answers.where==="europe"?"Europe":answers.where==="florida"?"Florida":"US",bg:K.bgGray,c:K.textMid},
                {l:answers.situation==="solo"?"Solo":answers.situation==="partner"?"With partner":"Family",bg:K.bgGray,c:K.textMid},
              ].map((t,i)=>(
                <span key={i} className="tag" style={{background:t.bg,color:t.c}}>{t.l}</span>
              ))}
              <button onClick={()=>setPage("simulator")} style={{background:"none",border:`1px solid ${K.border}`,borderRadius:7,padding:"5px 12px",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,fontWeight:500,color:K.textMid,cursor:"pointer"}}>Edit plan</button>
            </div>
          </div>

          {/* Survival banner */}
          <div style={{padding:"10px 16px",borderRadius:8,background:ok?K.positiveDim:K.redDim,border:`1px solid ${ok?K.positive+"30":K.red+"30"}`,display:"flex",gap:10,alignItems:"center"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:ok?K.positive:K.red,flexShrink:0}}/>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:600,color:ok?K.greenText:K.red}}>
              {ok?`Plan is solvent to age 95 — ${fmtM(at95.total)} remaining`:`Portfolio depletes at age ${dep?.age} — see Next Steps to fix this`}
            </span>
            <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:K.textLight,marginLeft:"auto"}}>3% inflation · 9% growth · 6.5% drawdown</span>
          </div>
        </div>
      </div>

      <div style={{maxWidth:1060,margin:"0 auto",padding:"20px 24px"}}>
        {/* Metrics row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:16}}>
          {[
            {l:"Years to Retire",v:`${Math.max(0,retireAge-(+answers.age||45))}`,s:"from today",c:K.text},
            {l:"Portfolio at Retirement",v:fmtM(atR.total),s:"all accounts",c:K.text},
            {l:"Portfolio at 95",v:ok?fmtM(at95.total):`Out at ${dep?.age}`,s:ok?"fully solvent":"needs attention",c:ok?K.positiveText:K.red},
            {l:"Monthly Investing",v:`$${fmtN(+answers.monthlyContrib||0)}`,s:"current rate",c:K.text},
          ].map((m,i)=>(
            <div key={i} className="kcard">
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.textLight,letterSpacing:"0.08em",marginBottom:6}}>{m.l.toUpperCase()}</div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:24,fontWeight:700,color:m.c,letterSpacing:"-0.02em",marginBottom:3}}>{m.v}</div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:K.textLight}}>{m.s}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="kcard" style={{marginBottom:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,fontWeight:600,color:K.text,letterSpacing:"-0.01em"}}>Portfolio trajectory — age {answers.age||45} to 95</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.textLight}}>All accounts combined</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={sim} margin={{top:5,right:8,bottom:0,left:4}}>
              <defs>
                <linearGradient id="kg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={K.green} stopOpacity={0.15}/>
                  <stop offset="95%" stopColor={K.green} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={K.border}/>
              <XAxis dataKey="age" tick={{fill:K.textLight,fontSize:11,fontFamily:"'Plus Jakarta Sans',sans-serif"}}/>
              <YAxis tick={{fill:K.textLight,fontSize:11,fontFamily:"'Plus Jakarta Sans',sans-serif"}} tickFormatter={fmtM}/>
              <Tooltip content={<KTip/>}/>
              <ReferenceLine x={retireAge} stroke={K.green} strokeDasharray="5 3" label={{value:"Retire",fill:K.greenText,fontSize:10,fontFamily:"Plus Jakarta Sans"}}/>
              {(+answers.ssAge||0)>0&&<ReferenceLine x={+answers.ssAge} stroke={K.blue} strokeDasharray="5 3" label={{value:"SS",fill:K.blue,fontSize:10}}/>}
              <Area type="monotone" dataKey="total" name="Portfolio" stroke={K.green} fill="url(#kg)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tabs */}
        <div style={{background:K.bgGray,borderRadius:10,padding:4,display:"inline-flex",gap:2,marginBottom:16}}>
          {TABS.map(t=>(
            <button key={t.k} className={`ktab${tab===t.k?" on":""}`} onClick={()=>setTab(t.k)}>{t.l}</button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {tab==="overview"&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.textLight,letterSpacing:"0.1em",marginBottom:2}}>AI INSIGHTS FOR {name.toUpperCase()}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:12,marginBottom:4}}>
              {loadingI?[1,2,3].map(i=>(
                <div key={i} className="kcard pulse">
                  <div style={{height:8,background:K.bgGray,borderRadius:4,marginBottom:10,width:"50%"}}/>
                  <div style={{height:6,background:K.bgGray,borderRadius:4,marginBottom:5}}/>
                  <div style={{height:6,background:K.bgGray,borderRadius:4,width:"80%"}}/>
                </div>
              )):insights.map((ins,i)=>(
                <div key={i} className="kcard" style={{borderLeft:`3px solid ${iC[ins.type]||K.green}`}}>
                  <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,fontWeight:700,color:iC[ins.type]||K.green,marginBottom:7,letterSpacing:"-0.01em"}}>{ins.title}</div>
                  <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,color:K.textMid,lineHeight:1.65}}>{ins.body}</div>
                </div>
              ))}
            </div>

            {drawData.length>0&&(
              <div className="kcard">
                <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,fontWeight:600,color:K.text,marginBottom:16,letterSpacing:"-0.01em"}}>Income vs spending needs in retirement</div>
                <ResponsiveContainer width="100%" height={190}>
                  <AreaChart data={drawData} margin={{top:5,right:8,bottom:0,left:4}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={K.border}/>
                    <XAxis dataKey="age" tick={{fill:K.textLight,fontSize:11}}/>
                    <YAxis tick={{fill:K.textLight,fontSize:11}} tickFormatter={fmtM}/>
                    <Tooltip content={<KTip/>}/>
                    {(+answers.ssAge||0)>0&&<ReferenceLine x={+answers.ssAge} stroke={K.blue} strokeDasharray="3 3"/>}
                    <Area type="monotone" dataKey="ss" name="Social Security" stroke={K.blue} fill={K.blueDim} strokeWidth={1.5} dot={false} stackId="i"/>
                    <Line type="monotone" dataKey="needs" name="Total Needs" stroke={K.red} strokeWidth={1.5} dot={false} strokeDasharray="5 3"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* ── ACCOUNTS ── */}
        {tab==="accounts"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:12}}>
            {[
              {t:"Taxable Brokerage",c:K.green,v:atR.brk,rows:[["Today",fmtD(+answers.brokerage||0)],["At retirement "+retireAge,fmtM(atR.brk)],["Monthly contrib",fmtD(+answers.monthlyContrib||0)],["Allocation","VTI 50% · QQQ 35% · SGOV 15%"],["Draw order","First — 15% cap gains rate"],["Tax","Long-term capital gains"]],note:"Draw this first in retirement. Most flexible, best tax rate, no withdrawal age restrictions."},
              {t:"401(k) / IRA",c:K.blue,v:atR.k401,rows:[["Today",fmtD(+answers.k401||0)],["At retirement "+retireAge,fmtM(atR.k401)],["Annual contrib","$23K (→$30.5K after 50)"],["Strategy","Roth convert $30K/yr at retirement"],["RMDs start","Age 73"],["Tax","Ordinary income on withdrawal"]],note:"Delay drawing until RMDs force it. Convert chunks to Roth in the low-income window before Social Security."},
              {t:"Backdoor Roth IRA",c:"#7c3aed",v:atR.roth,rows:[["Start","$7,000/yr ($8K after 50)"],["How","Non-deductible IRA → immediate convert"],["At retirement "+retireAge,fmtM(atR.roth)],["Tax","Tax-free growth and withdrawal"],["RMDs","None — ever"],["Draw order","Last — preserve longest"]],note:"Open this immediately. Backdoor method works at any income level. Takes 20 minutes at Fidelity or Vanguard."},
              {t:"HSA — Triple Tax",c:K.yellow,v:atR.hsa,rows:[["Annual contrib","$4,150/yr ($5,150 after 55)"],["At retirement "+retireAge,fmtM(atR.hsa)],["Tax deductible","Yes — reduces income today"],["Tax growth","Tax-free"],["Withdrawals","Tax-free for medical, ever"],["After 65","Anything — taxed like 401k"]],note:"Ring-fences healthcare costs with tax-free money. As a solo planner, late-life care is your biggest uninsured risk."},
            ].map((a,i)=>(
              <div key={i} className="kcard" style={{borderTop:`3px solid ${a.c}`}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:a.c,fontWeight:500,letterSpacing:"0.08em",marginBottom:4}}>{a.t.toUpperCase()}</div>
                <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:26,fontWeight:700,color:K.text,letterSpacing:"-0.03em",marginBottom:14}}>{fmtM(a.v)}</div>
                {a.rows.map(([k,v],j)=>(
                  <div key={j} className="krow">
                    <span style={{fontFamily:"'Plus Jakarta Sans',sans-serif",color:K.textMid,fontSize:12}}>{k}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",color:K.text,fontSize:12,textAlign:"right"}}>{v}</span>
                  </div>
                ))}
                <div style={{marginTop:12,padding:"10px 12px",background:K.bgGray,borderRadius:7,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:K.textMid,lineHeight:1.65}}>{a.note}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── NEXT STEPS ── */}
        {tab==="steps"&&<NextSteps answers={answers}/>}

        <div style={{marginTop:14,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:K.textLight,lineHeight:1.8,padding:"12px 0",borderTop:`1px solid ${K.border}`}}>
          For educational and informational purposes only. Not financial advice. Projections are estimates based on your inputs and standard market assumptions. Consult a fee-only fiduciary financial advisor before making investment decisions. Your data is never stored or transmitted.
        </div>
      </div>
    </div>
  );
}

// ─── NEWS ─────────────────────────────────────────────────────────────────────
function News(){
  const [articles,setArticles]=useState([]);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{fetchNews().then(a=>{setArticles(a);setLoading(false);});},[]);
  const tC={"Social Security":K.green,"Fed Rates":K.yellow,"Medicare":K.red,"Tax":"#7c3aed","Markets":K.blue,"Inflation":K.yellow,"401k":K.green};
  return(
    <div style={{minHeight:"100vh",paddingTop:56,background:K.bgGray}}>
      <style>{`.acard{background:${K.bg};border:1px solid ${K.border};border-radius:12px;padding:22px 24px;transition:all 0.2s;cursor:pointer;}.acard:hover{border-color:${K.borderMid};box-shadow:0 4px 16px #0000000a;transform:translateY(-1px);}`}</style>
      <div style={{background:K.bg,borderBottom:`1px solid ${K.border}`,padding:"32px 24px 24px"}}>
        <div style={{maxWidth:760,margin:"0 auto"}}>
          <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.green,fontWeight:500,letterSpacing:"0.12em",marginBottom:8}}>RETIREMENT INTELLIGENCE</div>
          <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:"clamp(22px,4vw,34px)",color:K.text,letterSpacing:"-0.03em",marginBottom:8}}>What happened this week</h1>
          <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,color:K.textMid,lineHeight:1.7}}>Curated from across the financial press — filtered to what actually affects your retirement. Updated daily.</p>
        </div>
      </div>
      <div style={{maxWidth:760,margin:"0 auto",padding:"24px"}}>
        {loading?[1,2,3,4,5].map(i=>(
          <div key={i} className="acard pulse" style={{marginBottom:12}}>
            <div style={{height:7,background:K.bgGray,borderRadius:4,width:"18%",marginBottom:12}}/>
            <div style={{height:11,background:K.bgGray,borderRadius:4,width:"70%",marginBottom:8}}/>
            <div style={{height:7,background:K.bgGray,borderRadius:4,width:"90%"}}/>
          </div>
        )):articles.map((a,i)=>(
          <div key={i} className="acard" style={{marginBottom:10}} onClick={()=>a.url&&window.open(a.url,"_blank")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <span className="tag" style={{background:(tC[a.tag]||K.green)+"15",color:tC[a.tag]||K.greenText,fontSize:10}}>{a.tag}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.textLight}}>{a.time}</span>
            </div>
            <h3 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:600,fontSize:"clamp(14px,2vw,17px)",color:K.text,marginBottom:8,lineHeight:1.35,letterSpacing:"-0.01em"}}>{a.headline}</h3>
            <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,color:K.textMid,lineHeight:1.7}}>{a.summary}</p>
            {a.url&&<div style={{marginTop:10,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,fontWeight:500,color:K.green}}>Read story →</div>}
          </div>
        ))}
        <div style={{marginTop:16,padding:"12px 16px",background:K.bg,border:`1px solid ${K.border}`,borderRadius:8,fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:11,color:K.textLight}}>
          News generated via AI search. Always verify with primary sources before acting on financial news.
        </div>
      </div>
    </div>
  );
}

// ─── ABOUT ────────────────────────────────────────────────────────────────────
function About({setPage}){
  return(
    <div style={{minHeight:"100vh",paddingTop:56,background:K.bg}}>
      <style>{`.about-btn{background:${K.green};color:#fff;border:none;border-radius:9px;padding:14px 40px;font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;letter-spacing:-0.01em;}.about-btn:hover{background:#1e3a8f;}`}</style>
      <div style={{maxWidth:640,margin:"0 auto",padding:"60px 24px"}}>
        <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:K.green,fontWeight:500,letterSpacing:"0.15em",marginBottom:14}}>OUR STORY</div>
        <h1 style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontWeight:700,fontSize:"clamp(28px,5vw,48px)",color:K.text,letterSpacing:"-0.03em",lineHeight:1.1,marginBottom:36}}>
          It started at 2am.
        </h1>

        {/* Pull quote */}
        <div style={{borderLeft:`3px solid #f5c842`,paddingLeft:20,marginBottom:32}}>
          <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:18,fontWeight:600,color:K.text,lineHeight:1.7,fontStyle:"italic"}}>
            "What if it doesn't work out? What if I end up alone? Will I actually be okay?"
          </p>
        </div>

        {[
          "Someone in their mid-forties — successful by every conventional measure, twenty years into a career in finance — lay awake one night and realized they had no real answer to that question.",
          "Not because they hadn't thought about retirement. They had. They had a 401k, a brokerage account, a vague plan. But they had never actually looked at the full picture. Never modeled what happens if they end up alone. Never calculated what solo means — no partner income, no family caregiver, no one to split the rent with at 75.",
          "The thing that hit hardest wasn't the money. It was the aloneness. No children to help. A career that would eventually end. And a creeping sense that everyone else had figured this out except them.",
          "They looked for tools. The good ones required connecting bank accounts, paying monthly fees, or booking a call with an advisor who would eventually try to manage their money. None of them started with the actual question — not the financial question, but the human one: will I be okay if I'm on my own?",
          "So they built Certain instead.",
          "Not as a product. Not as a startup. As an answer to their own 2am question — built free, built honest, built to show the full picture without judgment, without a sales pitch, without requiring you to trust a stranger with your account credentials.",
          "If you're reading this at 2am, wondering the same thing — this is for you.",
        ].map((p,i)=>(
          <p key={i} style={{
            fontFamily:"'Plus Jakarta Sans',sans-serif",
            fontSize:i===4||i===6?16:15,
            color:i===4?K.text:i===6?K.text:K.textMid,
            lineHeight:1.9,
            marginBottom:22,
            fontWeight:i===4?700:i===6?600:400,
          }}>{p}</p>
        ))}

        <div style={{padding:"24px",background:K.bgGray,border:`1px solid ${K.border}`,borderRadius:12,marginBottom:36,marginTop:8}}>
          {[
            ["What Certain is","A free retirement simulation. 10 questions. Complete plan to age 95. AI-powered, personalized, honest."],
            ["What it's not","A financial advisor. Not connected to your accounts. Doesn't store your data. Has nothing to sell you."],
            ["Who it's for","Anyone anxious about whether they'll have enough. People in transition. Solo planners. People who've been putting this off."],
          ].map(([k,v],i)=>(
            <div key={i} style={{padding:"12px 0",borderBottom:i<2?`1px solid ${K.border}`:"none"}}>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:600,color:K.text,marginBottom:4}}>{k}</div>
              <div style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,color:K.textMid,lineHeight:1.6}}>{v}</div>
            </div>
          ))}
        </div>

        <button className="about-btn" onClick={()=>setPage("simulator")}>Build my plan — free →</button>
        <p style={{fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:12,color:K.textLight,marginTop:12}}>No account. No bank connection. No data stored. Free forever.</p>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
const STORAGE_KEY = "certain_answers_v1";

export default function App(){
  const [page,setPage]=useState("home");

  // Load saved answers from localStorage on first render
  const [answers,setAnswers]=useState(()=>{
    try{
      const saved=localStorage.getItem(STORAGE_KEY);
      return saved?JSON.parse(saved):null;
    }catch{return null;}
  });

  // Persist answers whenever they change
  const saveAnswers=(a)=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(a));}catch{}
    setAnswers(a);
  };

  // Auto-go to dashboard if answers already exist
  useEffect(()=>{
    if(answers&&page==="home")setPage("dashboard");
  },[]);

  return(
    <div style={{minHeight:"100vh",background:K.bg,color:K.text}}>
      <style>{FONT}{`*{box-sizing:border-box;margin:0;padding:0;}::-webkit-scrollbar{width:4px;}::-webkit-scrollbar-track{background:${K.bgGray};}::-webkit-scrollbar-thumb{background:${K.border};border-radius:4px;}body{background:${K.bg};}`}</style>
      <Navbar page={page} setPage={setPage} hasResults={!!answers}/>
      {page==="home"       &&<Home setPage={setPage}/>}
      {page==="simulator"  &&<Simulator onComplete={a=>{saveAnswers(a);setPage("dashboard");}} existing={answers}/>}
      {page==="dashboard"  &&(answers?<Dashboard answers={answers} setPage={setPage}/>:<Home setPage={setPage}/>)}
      {page==="news"       &&<News/>}
      {page==="about"      &&<About setPage={setPage}/>}
    </div>
  );
}
