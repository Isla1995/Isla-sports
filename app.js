(() => {
  const $ = id => document.getElementById(id);
  const cfg = window.ISLA_CONFIG || {};
  let client = null, mode = "login", currentUser = null, currentProfile = null;
  const msg = (id, text, type="") => { const el=$(id); el.textContent=text; el.className="message"+(type ? " "+type : ""); };
  const validConfig = () => cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY &&
    cfg.SUPABASE_URL.startsWith("https://") && !cfg.SUPABASE_URL.includes("PEGA_AQUI") &&
    !cfg.SUPABASE_PUBLISHABLE_KEY.includes("PEGA_AQUI");
  function setMode(next) {
    mode=next; $("tabLogin").classList.toggle("active",mode==="login"); $("tabSignup").classList.toggle("active",mode==="signup");
    $("usernameWrap").classList.toggle("hidden",mode!=="signup"); $("authSubmit").textContent=mode==="login"?"Entrar":"Crear cuenta";
    $("password").autocomplete=mode==="login"?"current-password":"new-password"; msg("authMessage","");
  }
  $("tabLogin").addEventListener("click",()=>setMode("login"));
  $("tabSignup").addEventListener("click",()=>setMode("signup"));
  $("authForm").addEventListener("submit", async e => {
    e.preventDefault();
    if(!client){msg("authMessage","Falta configurar config.js con la URL y clave pública de Supabase.","error");return;}
    const email=$("email").value.trim(), password=$("password").value, username=$("username").value.trim();
    $("authSubmit").disabled=true;
    try {
      if(mode==="signup"){
        if(!username){msg("authMessage","Escribe un nombre de usuario.","error");return;}
        const {data,error}=await client.auth.signUp({email,password,options:{data:{username}}});
        if(error) throw error;
        if(data.session){await showApp(data.user);}
        else msg("authMessage","Cuenta creada. Revisa tu correo para confirmar la cuenta y luego entra.","ok");
      } else {
        const {data,error}=await client.auth.signInWithPassword({email,password});
        if(error) throw error;
        await showApp(data.user);
      }
    } catch(err){msg("authMessage",friendly(err),"error");}
    finally{$("authSubmit").disabled=false;}
  });
  $("signOut").addEventListener("click",async()=>{if(client) await client.auth.signOut();currentUser=null;$("appPanel").classList.add("hidden");$("authPanel").classList.remove("hidden");$("signOut").classList.add("hidden");});
  $("refresh").addEventListener("click",loadMatches);
  async function showApp(user){
    currentUser=user;$("authPanel").classList.add("hidden");$("appPanel").classList.remove("hidden");$("signOut").classList.remove("hidden");
    try {
      const {data,error}=await client.from("profiles").select("id,username,points,role").eq("id",user.id).maybeSingle();
      if(error) throw error;
      currentProfile=data;
      $("helloName").textContent=(data&&data.username)||user.user_metadata?.username||user.email.split("@")[0];
      $("points").textContent=(data&&data.points!=null)?Number(data.points).toLocaleString("en-US"):"—";
      $("adminPanel").classList.toggle("hidden",!data||data.role!=="admin");
      if(!data) msg("matchesMessage","No se encontró tu perfil. Revisa que Supabase cree un perfil al registrarte y que la política RLS permita leer el tuyo.","error");
      await loadMatches(); await loadPicks();
    } catch(err){msg("matchesMessage","No pude cargar tu perfil: "+friendly(err),"error");}
  }
  async function loadMatches(){
    if(!client)return;
    $("matches").innerHTML="";msg("matchesMessage","Cargando partidos…");
    try{
      const {data,error}=await client.from("matches").select("id,sport,home_team,away_team,starts_at,odds_home,odds_away,odds_draw,status,result").order("starts_at",{ascending:true}).limit(100);
      if(error)throw error;
      if(!data||!data.length){msg("matchesMessage","Todavía no hay partidos publicados.");return;}
      msg("matchesMessage","");
      data.forEach(m=>{
        const card=document.createElement("article");card.className="match";
        const date=m.starts_at?new Date(m.starts_at).toLocaleString("es-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"Fecha por confirmar";
        const closed=String(m.status||"open").toLowerCase()!=="open" || (m.starts_at && new Date(m.starts_at)<=new Date());
        card.innerHTML=`<div class="matchTop"><span>${escapeHtml(m.sport||"Deporte")} · ${escapeHtml(date)}</span><span class="status">${escapeHtml(m.status||"open")}</span></div>
          <div class="teams"><span>${escapeHtml(m.home_team)}</span><span class="vs">VS</span><span>${escapeHtml(m.away_team)}</span></div>
          <div class="odds"></div>`;
        const odds=card.querySelector(".odds");
        addOdds(odds,"Local",m.odds_home,"home",m,closed);
        if(m.odds_draw!=null)addOdds(odds,"Empate",m.odds_draw,"draw",m,closed);
        addOdds(odds,"Visitante",m.odds_away,"away",m,closed);
        $("matches").appendChild(card);
      });
    }catch(err){msg("matchesMessage","Error leyendo matches: "+friendly(err)+". Comprueba nombres de columnas y políticas RLS.","error");}
  }
  function addOdds(container,label,odd,selection,match,closed){
    const b=document.createElement("button");b.disabled=closed||!currentUser;b.innerHTML=`${label}<span>${odd==null?"—":Number(odd).toFixed(2)}</span>`;
    b.addEventListener("click",()=>submitPick(match,selection,Number(odd)));container.appendChild(b);
  }
  async function submitPick(match,selection,odd){
    const raw=prompt(`Pronóstico: ${match.home_team} vs ${match.away_team}\nElegiste: ${selection}\n¿Cuántos puntos ficticios quieres usar? (mínimo 1)`);
    if(raw===null)return;
    const stake=Number(raw);
    if(!Number.isInteger(stake)||stake<1){alert("Escribe una cantidad entera de puntos, mayor que 0.");return;}
    if(!currentProfile||Number(currentProfile.points)<stake){alert("No tienes suficientes puntos disponibles.");return;}
    try{
      const {error}=await client.from("picks").insert({user_id:currentUser.id,match_id:match.id,selection,stake_points:stake,odds_at_pick:odd});
      if(error)throw error;
      msg("picksMessage","Pronóstico guardado. Los puntos se registraron como una apuesta ficticia.","ok");await loadPicks();
    }catch(err){alert("No se pudo guardar el pronóstico: "+friendly(err)+". Revisa las columnas de picks y sus políticas RLS.");}
  }
  async function loadPicks(){
    if(!client||!currentUser)return;
    try{
      const {data,error}=await client.from("picks").select("id,selection,stake_points,odds_at_pick,created_at,match_id").eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(20);
      if(error)throw error;
      $("myPicks").innerHTML="";
      if(!data||!data.length){$("myPicks").innerHTML='<p class="muted">Todavía no tienes pronósticos.</p>';return;}
      data.forEach(p=>{const row=document.createElement("div");row.className="pickRow";row.textContent=`${p.selection} · ${p.stake_points} puntos · cuota ${p.odds_at_pick}`;$("myPicks").appendChild(row);});
      msg("picksMessage","");
    }catch(err){msg("picksMessage","La tabla picks necesita columnas compatibles para mostrar los pronósticos: "+friendly(err),"error");}
  }
  $("matchForm").addEventListener("submit",async e=>{
    e.preventDefault();
    if(!currentProfile||currentProfile.role!=="admin"){msg("adminMessage","Solo la cuenta administradora puede publicar partidos.","error");return;}
    const starts=new Date($("starts").value);
    const row={sport:$("sport").value.trim(),home_team:$("home").value.trim(),away_team:$("away").value.trim(),starts_at:starts.toISOString(),odds_home:Number($("oddsHome").value),odds_away:Number($("oddsAway").value),odds_draw:$("oddsDraw").value?Number($("oddsDraw").value):null,status:"open"};
    try{
      const {error}=await client.from("matches").insert(row);if(error)throw error;
      $("matchForm").reset();$("oddsHome").value="1.90";$("oddsAway").value="1.90";msg("adminMessage","Partido publicado.","ok");await loadMatches();
    }catch(err){msg("adminMessage","No se pudo publicar: "+friendly(err)+". Revisa permisos RLS de admin.","error");}
  });
  function friendly(err){const s=err?.message||String(err);return s.length>240?s.slice(0,240)+"…":s;}
  function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  if(validConfig()){
    client=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
    client.auth.getSession().then(({data})=>{if(data.session)showApp(data.session.user);});
    client.auth.onAuthStateChange((_event,session)=>{if(session&&!currentUser)showApp(session.user);});
  } else {msg("authMessage","Antes de entrar, configura config.js con la URL y la clave pública de tu proyecto Supabase.","error");}
})();
