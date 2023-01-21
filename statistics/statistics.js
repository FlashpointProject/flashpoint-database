fetch('https://db-api.unstable.life/stats').then(r => r.json()).then(json => {
    document.querySelector('.stats-games div:last-child').textContent      = json.libraryTotals[0].count;
    document.querySelector('.stats-animations div:last-child').textContent = json.libraryTotals[1].count;
    
    document.querySelector('.stats-legacy div:last-child').textContent     = json.formatTotals[0].count;
    document.querySelector('.stats-gamezip div:last-child').textContent    = json.formatTotals[1].count;
    
    let platforms = json.platformTotals.sort((a, b) => a.count == b.count ? 0 : (a.count > b.count ? -1 : 1));
    
    for (let platform of platforms) {
        let row = document.createElement('tr'),
            platformName  = document.createElement('td'),
            platformValue = document.createElement('td');
        
        platformName.textContent  = platform.name;
        platformValue.textContent = platform.count;
        
        row.append(platformName);
        row.append(platformValue);
        document.querySelector('.stats-platforms').append(row);
    }
});