// script.js — frontend для GitHub Pages
// Поставь сюда свои URL после деплоя Apps Script web apps:
const CATALOG_API = "REPLACE_WITH_CATALOG_API_URL?action=list"; // GET -> JSON array
const UPLOADER_API = "REPLACE_WITH_UPLOADER_API_URL";          // POST -> addFile
const DELETE_API = "REPLACE_WITH_DELETE_API_URL";              // POST -> deleteFile (может быть тот же UPLOADER_API)

/* helpers */
const $ = sel => document.querySelector(sel);
const escapeHtml = s => (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

async function fetchJSON(url, opts){
  const res = await fetch(url, opts);
  if(!res.ok) throw new Error('HTTP ' + res.status + ' ' + res.statusText);
  const txt = await res.text();
  try { return JSON.parse(txt); } catch(e) { throw new Error('Invalid JSON: '+txt); }
}

/* normalize drive image link to uc?export=view */
function extractDriveId(link){
  if(!link) return '';
  let s = String(link);
  let m = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if(m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if(m) return m[1];
  return '';
}
function normalizeImageLink(raw){
  if(!raw) return '';
  raw = raw.trim();
  if(/^https?:\/\//i.test(raw)){
    if(/drive\.google\.com|docs\.google\.com/.test(raw)){
      const id = extractDriveId(raw);
      if(id) return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`;
      return raw;
    }
    return raw;
  }
  return raw;
}

/* UI refs */
const listRoot = $('#list');
const modal = $('#modal');
const carousel = $('#carousel');
const mTitle = $('#mTitle');
const mDownload = $('#mDownload');

const addModal = $('#addModal');
const inTitle = $('#inTitle');
const inLink = $('#inLink');
const inDesc = $('#inDesc');
const inImages = $('#inImages');
const addMsg = $('#addMsg');

let games = [], current = null, currentIndex = 0;

/* load list */
async function loadList(){
  try {
    listRoot.innerHTML = '<div class="loading">Loading…</div>';
    if(CATALOG_API.includes('REPLACE')) { listRoot.innerHTML = '<div class="loading">CATALOG_API not set</div>'; return; }
    const data = await fetchJSON(CATALOG_API);
    if(!Array.isArray(data)) throw new Error('Invalid data from API');
    // normalize images
    data.forEach(g => {
      if(Array.isArray(g.images)) g.images = g.images.map(normalizeImageLink).filter(Boolean);
      else if(typeof g.images === 'string' && g.images.trim()){
        try { const p = JSON.parse(g.images); if(Array.isArray(p)) g.images = p.map(normalizeImageLink).filter(Boolean); else g.images = [normalizeImageLink(g.images)]; }
        catch(e){ g.images = g.images.split(/\s*,\s*/).map(normalizeImageLink).filter(Boolean); }
      } else g.images = [];
    });
    games = data;
    renderList();
  } catch(e){
    listRoot.innerHTML = '<div class="loading" style="color:#ff8a80">Error: '+e.message+'</div>';
    console.error(e);
  }
}

/* render */
function renderList(){
  listRoot.innerHTML = '';
  if(!games.length) { listRoot.innerHTML = '<div class="loading">Empty</div>'; return; }
  games.forEach(g => {
    const row = document.createElement('div'); row.className = 'item';
    const thumb = document.createElement('div'); thumb.className = 'thumb';
    if(g.images && g.images[0]){
      const img = document.createElement('img'); img.src = g.images[0]; img.onerror = ()=>{ img.style.display='none'; thumb.innerHTML='<div class="small">No preview</div>'; };
      thumb.appendChild(img);
    } else { thumb.innerHTML = '<div class="small">No preview</div>'; }

    const meta = document.createElement('div'); meta.className = 'meta';
    meta.innerHTML = `<div class="title">${escapeHtml(g.title||'')}</div><div class="desc">${escapeHtml(g.desc||'')}</div><div class="small">row: ${g.row||''}</div>`;

    const actions = document.createElement('div'); actions.className = 'actions';
    const btnOpen = document.createElement('button'); btnOpen.className = 'btn'; btnOpen.textContent = 'Open'; btnOpen.onclick = ()=>openViewer(g);
    const btnDL = document.createElement('a'); btnDL.className = 'btn'; btnDL.textContent = 'Download'; btnDL.href = g.downloadUrl || '#'; btnDL.target='_blank';
    actions.appendChild(btnOpen); actions.appendChild(btnDL);

    row.appendChild(thumb); row.appendChild(meta); row.appendChild(actions);
    listRoot.appendChild(row);
  });
}

/* viewer */
function openViewer(game){
  current = game; currentIndex = 0;
  mTitle.textContent = game.title || '';
  updateCarousel();
  modal.style.display = 'flex';
}
function closeViewer(){ modal.style.display = 'none'; }
function updateCarousel(){
  carousel.innerHTML = '';
  if(!current || !current.images || !current.images.length){ carousel.innerHTML = '<div class="small">No images</div>'; $('#mDownload').href = current? (current.downloadUrl||'#') : '#'; return; }
  const src = current.images[currentIndex];
  const img = document.createElement('img'); img.src = src;
  img.onerror = ()=>{ carousel.innerHTML = '<div class="small">Image not available</div>'; };
  img.onclick = ()=>{ currentIndex = (currentIndex + 1) % current.images.length; updateCarousel(); };
  carousel.appendChild(img);
  $('#mDownload').href = src || (current.downloadUrl||'#');
}

/* add UI */
$('#openAddBtn').onclick = ()=>{ addModal.style.display = 'flex'; inTitle.focus(); };
$('#closeAdd').onclick = ()=> addModal.style.display = 'none';
$('#addCancel').onclick = ()=> addModal.style.display = 'none';
$('#closeModal').onclick = ()=> closeViewer();
$('#refreshBtn').onclick = ()=> loadList();

$('#addSend').onclick = async ()=>{
  const title = inTitle.value.trim(), link = inLink.value.trim(), desc = inDesc.value.trim(), imagesRaw = inImages.value.trim();
  addMsg.innerHTML='';
  if(!title || !link){ addMsg.innerHTML = '<div class="msg err">Title and link required</div>'; return; }
  const payload = { title, link, desc };
  if(imagesRaw) payload.imageLinks = imagesRaw;
  try {
    let res;
    if(UPLOADER_API.includes('REPLACE')) { addMsg.innerHTML = '<div class="msg err">UPLOADER_API not set</div>'; return; }
    res = await fetchJSON(UPLOADER_API, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
    if(res && res.ok){ addMsg.innerHTML = '<div class="msg ok">Added. Token: '+(res.token||'')+'</div>'; inTitle.value=''; inLink.value=''; inDesc.value=''; inImages.value=''; setTimeout(()=>{ addModal.style.display='none'; loadList(); },900); }
    else addMsg.innerHTML = '<div class="msg err">Add failed</div>';
  } catch(e){ addMsg.innerHTML = '<div class="msg err">Error: '+ e.message +'</div>'; console.error(e); }
};

/* delete */
$('#openDelete').onclick = async ()=>{
  if(!current) return;
  const tok = prompt('Enter token to delete this game (row ' + (current.row||'?') + '):');
  if(!tok) return;
  try {
    if(DELETE_API.includes('REPLACE')) { alert('DELETE_API not set'); return; }
    const res = await fetchJSON(DELETE_API, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ row: current.row, token: tok }) });
    if(res && res.ok){ alert('Deleted'); closeViewer(); loadList(); } else alert('Delete failed');
  } catch(e){ alert('Error: '+e.message); console.error(e); }
};

/* helpers */
function escapeHtmlSafe(s){ return escapeHtml(s); }
document.addEventListener('keydown', e => { if(e.key === 'Escape'){ modal.style.display='none'; addModal.style.display='none'; } });

/* init */
loadList();


https://script.google.com/macros/s/AKfycbwT90H5kBKctZS99xTe3c82JbHzkJnJ558ulYbOv54SLeF4gbreL6f5-pnyVuj0pZJ5sg/exec
