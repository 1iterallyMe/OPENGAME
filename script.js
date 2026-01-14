// === НАСТРОЙКИ ===
const API_BASE =
  'https://script.google.com/macros/s/AKfycbwT90H5kBKctZS99xTe3c82JbHzkJnJ558ulYbOv54SLeF4gbreL6f5-pnyVuj0pZJ5sg/exec';

const LIST_API = API_BASE + '?action=list';

// === ЗАГРУЗКА ИГР ===
async function loadGames() {
  try {
    const res = await fetch(LIST_API, { cache: 'no-store' });
    const games = await res.json();
    renderGames(games);
  } catch (e) {
    console.error(e);
    alert('Не удалось загрузить список игр');
  }
}

// === РЕНДЕР ===
function renderGames(games) {
  const root = document.getElementById('games');
  if (!root) return;

  root.innerHTML = '';

  if (!games.length) {
    root.innerHTML = '<p>Пусто. Вообще пусто.</p>';
    return;
  }

  games.forEach(game => {
    const div = document.createElement('div');
    div.className = 'game';

    const images = (game.images || [])
      .map(
        img =>
          `<img src="${img}" loading="lazy" style="max-width:180px;border-radius:6px">`
      )
      .join('');

    div.innerHTML = `
      <h3>${escapeHtml(game.title)}</h3>
      <p>${escapeHtml(game.desc || '')}</p>

      <div class="images">
        ${images || '<small>Без картинок. Больно.</small>'}
      </div>

      <div class="actions">
        <a href="${game.downloadUrl}" target="_blank">Скачать</a>
        <button onclick="showDelete(${game.row})">Удалить</button>
      </div>

      <div id="del-${game.row}" class="delete-box" style="display:none">
        <input type="text" placeholder="Токен" id="token-${game.row}">
        <button onclick="deleteGame(${game.row})">Подтвердить</button>
      </div>
    `;

    root.appendChild(div);
  });
}

// === ДОБАВЛЕНИЕ ИГРЫ ===
async function addGame() {
  const title = document.getElementById('title').value.trim();
  const link = document.getElementById('link').value.trim();
  const desc = document.getElementById('desc').value.trim();
  const images = document.getElementById('images').value.trim();

  if (!title || !link) {
    alert('Название и ссылка обязательны');
    return;
  }

  const payload = {
    title,
    link,
    desc,
    imageLinks: images
  };

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    alert('Игра добавлена.\nТокен удаления:\n' + data.token);
    loadGames();
  } catch (e) {
    console.error(e);
    alert('Ошибка при добавлении');
  }
}

// === УДАЛЕНИЕ ===
function showDelete(row) {
  const box = document.getElementById('del-' + row);
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

async function deleteGame(row) {
  const token = document.getElementById('token-' + row).value.trim();
  if (!token) {
    alert('Нужен токен');
    return;
  }

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _action: 'delete',
        row,
        token
      })
    });

    const data = await res.json();

    if (data.ok) {
      alert('Удалено');
      loadGames();
    } else {
      alert(data.error || 'Не получилось');
    }
  } catch (e) {
    console.error(e);
    alert('Ошибка удаления');
  }
}

// === УТИЛИТЫ ===
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// === СТАРТ ===
document.addEventListener('DOMContentLoaded', loadGames);