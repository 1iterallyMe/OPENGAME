// script.js — готовый для GitHub Pages (fetch -> Apps Script)
// Вставлен твой exec URL
const API_BASE = 'https://script.google.com/macros/s/AKfycbwT90H5kBKctZS99xTe3c82JbHzkJnJ558ulYbOv54SLeF4gbreL6f5-pnyVuj0pZJ5sg/exec';
const LIST_API = API_BASE + '?action=list';

// ===== utils =====
const el = id => document.getElementById(id);
const showNotif = (text, time = 3000) => {
  const n = el('notif');
  n.textContent = text; n.style.display = 'block';
  setTimeout(()=>{ n.style.display = 'none'; }, time);
};
const escapeHtml = s => (s||'').toString().replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

// ===== render list =====
async function loadGames(){
  const root = document.getElementById('list');
  root.innerHTML = '<div class="loading">Loading…</div>';
  try {
    const res = await fetch(LIST_API, { cache:'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    renderList(data);
  } catch (e) {
    console.error(e);
    root.innerHTML = '<div class="loading">Ошибка загрузки</div>';
    showNotif('Ошибка при загрузке каталога');
  }
}

function renderList(games){
  const root = document.getElementById('list');
  root.innerHTML = '';
  if(!games || !games.length){
    root.innerHTML = '<div class="loading">Пока нет игр</div>';
    return;
  }
  games.forEach(g=>{
    const card = document.createElement('div');
    card.className = 'repo-card';

    const thumb = document.createElement('div'); thumb.className='thumb';
    if(g.images && g.images.length){
      const img = document.createElement('img'); img.src = g.images[0];
      img.onerror = ()=>{ thumb.innerHTML = '<div class="small">Нет превью</div>'; };
      thumb.appendChild(img);
    } else if (g.viewUrl){
      const img = document.createElement('img'); img.src = g.viewUrl;
      img.onerror = ()=>{ thumb.innerHTML = '<div class="small">Нет превью</div>'; };
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = '<div class="small">Нет превью</div>';
    }

    const meta = document.createElement('div'); meta.className = 'meta';
    const title = document.createElement('div'); title.className='title'; title.textContent = g.title || 'Без названия';
    const desc = document.createElement('p'); desc.className='desc'; desc.textContent = g.desc || '';
    const info = document.createElement('div'); info.className='info small muted'; info.textContent = 'Row: ' + (g.row||'');

    meta.appendChild(title); meta.appendChild(desc); meta.appendChild(info);

    const act = document.createElement('div'); act.className='actions';
    const openBtn = document.createElement('button'); openBtn.className='btn'; openBtn.textContent='Open';
    openBtn.onclick = ()=>openViewer(g);
    const dl = document.createElement('a'); dl.className='btn'; dl.textContent='Download'; dl.href = g.downloadUrl || '#'; dl.target = '_blank';
    act.appendChild(openBtn); act.appendChild(dl);

    card.appendChild(thumb); card.appendChild(meta); card.appendChild(act);
    root.appendChild(card);
  });
}

// ===== viewer modal =====
let currentGame = null;
let currentIdx = 0;
function openViewer(game){
  currentGame = game; currentIdx = 0;
  el('vTitle').textContent = game.title || 'Без названия';
  el('vDesc').textContent = game.desc || '';
  el('vDownload').href = game.downloadUrl || game.link || '#';
  el('vToken').value = '';
  el('vTokenBox').style.display = 'none';
  renderCarousel();
  showModal('viewer');
}
function renderCarousel(){
  const box = el('vCarousel');
  box.innerHTML = '';
  if(!currentGame) { box.innerHTML = '<div class="carousel-placeholder">Нет фото</div>'; return; }
  const imgs = currentGame.images && currentGame.images.length ? currentGame.images : (currentGame.viewUrl ? [currentGame.viewUrl] : []);
  if(!imgs.length){ box.innerHTML = '<div class="carousel-placeholder">Нет фото</div>'; return; }
  const img = document.createElement('img'); img.src = imgs[currentIdx];
  img.onclick = ()=>{ currentIdx = (currentIdx + 1) % imgs.length; renderCarousel(); };
  img.onerror = ()=>{ box.innerHTML = '<div class="carousel-placeholder">Image not available</div>'; };
  box.appendChild(img);
  el('vDownload').href = imgs[currentIdx] || (currentGame.downloadUrl||'#');
}
function showModal(id){ el(id).style.display = 'flex'; el(id).setAttribute('aria-hidden','false'); }
function closeModal(id){ el(id).style.display = 'none'; el(id).setAttribute('aria-hidden','true'); }

// ===== add modal handlers =====
document.getElementById('openAddBtn').onclick = ()=> showModal('addModal');
document.getElementById('closeAdd').onclick = ()=> closeModal('addModal');
document.getElementById('cancelAdd').onclick = ()=> closeModal('addModal');

document.getElementById('refreshBtn').onclick = ()=> loadGames();

document.getElementById('addSend').onclick = async ()=>{
  const title = el('inTitle').value.trim();
  const link = el('inLink').value.trim();
  const desc = el('inDesc').value.trim();
  const images = el('inImages').value.trim();
  if(!title || !link){ showNotif('Название и ссылка обязательны'); return; }
  try {
    const res = await fetch(API_BASE, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ title, link, desc, imageLinks: images })
    });
    const data = await res.json();
    if(data && data.ok){
      showNotif('Игра добавлена — токен скопирован в буфер', 4000);
      try{ await navigator.clipboard.writeText(data.token || ''); }catch(e){}
      el('addResult').textContent = 'Токен: ' + (data.token || '');
      el('inTitle').value=''; el('inLink').value=''; el('inDesc').value=''; el('inImages').value='';
      setTimeout(()=>{ closeModal('addModal'); loadGames(); }, 900);
    } else {
      showNotif('Ошибка при добавлении: ' + (data && data.error ? data.error : 'unknown'));
    }
  } catch (e) {
    console.error(e);
    showNotif('Ошибка сети при добавлении');
  }
};

// viewer delete flow
document.getElementById('vClose').onclick = ()=> closeModal('viewer');
document.getElementById('vDeleteToggle').onclick = ()=> {
  const box = el('vTokenBox');
  box.style.display = box.style.display === 'none' ? 'flex' : 'none';
};
document.getElementById('vDeleteConfirm').onclick = async ()=>{
  const token = el('vToken').value.trim();
  if(!token){ showNotif('Введи токен'); return; }
  if(!currentGame || !currentGame.row){ showNotif('Неправильная игра'); return; }
  try {
    const res = await fetch(API_BASE, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ _action:'delete', row: currentGame.row, token })
    });
    const data = await res.json();
    if(data && data.ok){ showNotif('Удалено',2000); closeModal('viewer'); loadGames(); }
    else showNotif('Ошибка удаления: ' + (data && data.error ? data.error : 'unknown'));
  } catch(e){ console.error(e); showNotif('Ошибка сети'); }
};

// keyboard ESC to close
document.addEventListener('keydown', e => {
  if(e.key === 'Escape'){ closeModal('viewer'); closeModal('addModal'); }
});

// init
loadGames();