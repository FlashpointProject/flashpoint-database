fetch('https://db-api.unstable.life/stats').then(r => r.json()).then(json => {
    document.querySelector('.home-games').textContent = json.libraryTotals[0].count.toLocaleString();
    document.querySelector('.home-animations').textContent = json.libraryTotals[1].count.toLocaleString();
});

function initializeSearch() {
    localStorage.setItem('query', document.querySelector('.home-search-input').value);
    location.replace('search');
}

document.querySelector('.home-search-input').addEventListener('keyup', e => { if (e.key == 'Enter') initializeSearch(); });
document.querySelector('.home-search-button').addEventListener('click', initializeSearch);