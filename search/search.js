let fpdb = {
    api: 'https://db-api.unstable.life',
    images: 'https://infinity.unstable.life/images',
    platforms: [],
    sortOptions: [],
    list: [],
    pages: 0,
    currentPage: 1,
    lastScrollPos: 0,
    metaMap: {
        title:               "Title",
        alternateTitles:     "Alternate Titles",
        developer:           "Developer",
        publisher:           "Publisher",
        source:              "Source",
        library:             "Library",
        tags:                "Tags",
        platform:            "Platform",
        playMode:            "Play Mode",
        status:              "Status",
        version:             "Version",
        releaseDate:         "Release Date",
        language:            "Language",
        notes:               "Notes",
        originalDescription: "Original Description",
        dateAdded:           "Date Added",
        dateModified:        "Last Modified",
        applicationPath:     "Application Path",
        launchCommand:       "Launch Command",
        zipped:              "Format",
        id:                  "ID"
    },
    addAppMap: {
        name:                "Name",
        applicationPath:     "Application Path",
        launchCommand:       "Launch Command",
        id:                  "ID"
    }
};

fetch(fpdb.api + '/platforms').then(r => r.json()).then(json => { fpdb.platforms = json; });

fetch('fields.json').then(r => r.json()).then(async json => {
    for (let field of json) {
        let opt = document.createElement('option');
        opt.value = field.name;
        opt.innerText = field.displayName;
        
        document.querySelector('.search-fields-list').append(opt);
    }
    
    document.querySelector('.search-fields-add').addEventListener('click', () => {
        addField(json.find(field => field.name == document.querySelector('.search-fields-list').value));
    });
    
    addField(json[0]);
    
    if (localStorage.getItem('query') != null) {
        document.querySelector('.search-table input').value = localStorage.getItem('query');
        localStorage.removeItem('query');
        
        performSearch();
    }
    else if (location.hash.length == 37) loadEntry();
});

fetch('sort.json').then(r => r.json()).then(json => {
    fpdb.sortOptions = json;
    
    let options = document.querySelector('.results-sort-options'),
        direction = document.querySelector('.results-sort-direction');
    
    for (let sort of json) {
        let opt = document.createElement('option');
        opt.value = sort.name;
        opt.innerText = sort.displayName;
        
        if (sort.name == 'title') opt.selected = true;
        
        document.querySelector('.results-sort-options').append(opt);
    }
    
    document.querySelectorAll('.results-sort > select').forEach(elem => elem.addEventListener('change', applySort));
});

function addField(field) {
    let row   = document.createElement('tr'),
        name  = document.createElement('td'),
        value = document.createElement('td'),
        del   = document.createElement('button');
    
    del.innerText = 'X';
    del.addEventListener('click', () => { row.remove() });
    name.append(del, field.displayName + ':');
    
    if (field.name == 'platform')
        field.values = fpdb.platforms.map(platform => ({ name: platform, displayName: platform }));
    
    if (field.values.length > 0) {
        let input = document.createElement('select');
        input.id = field.name;
        
        for (let value of field.values) {
            let opt = document.createElement('option');
            opt.value = value.name;
            opt.innerText = value.displayName;
            
            input.append(opt);
        }
        
        value.append(input);
    } else {
        let input = document.createElement('input');
        input.id = field.name;
        input.addEventListener('keyup', e => { if (e.key == 'Enter') performSearch(); });
        
        value.append(input);
    }
    
    row.append(name, value);
    document.querySelector('.search-table').append(row);
    
    document.querySelectorAll('.search-table tr:last-child input').forEach(input => { input.focus(); });
}

function performSearch() {
    history.pushState('', '', location.pathname);
    
    let fields = {},
        params = [];
    
    document.querySelectorAll('.search-table [id]').forEach(field => {
        if (field.id in fields)
            fields[field.id] += ',' + field.value;
        else
            fields[field.id] = field.value;
    });
    
    for (let field in fields)
        params.push(field + '=' + fields[field]
            .replace(/%/g, '%25')
            .replace(/#/g, '%23')
            .replace(/&/g, '%26')
            .replace(/;/g, '%3B')
            .replace(/\+/g, '%2B'));
    
    if (document.querySelector('#filter').checked) params.push('filter=true');
    if (document.querySelector('#any').checked) params.push('any=true');
    
    document.querySelector('.results-top').style.display = 'none';
    document.querySelector('.results-list').hidden = true;
    document.querySelector('.results-bottom').hidden = true;
    document.querySelector('.viewer').style.display = 'none';
    document.querySelector('.results > .common-loading').hidden = false;
    
    fetch(`${fpdb.api}/search?${params.join('&')}&fields=id,title,developer,publisher,platform,library,tags,originalDescription,dateAdded,dateModified`).then(r => r.json()).then(json => {
        fpdb.list = json;
        pages = Math.ceil(fpdb.list.length / 100);
        
        document.querySelector('.results-total').textContent = fpdb.list.length.toLocaleString();
        document.querySelectorAll('.results-max-pages').forEach(elem => { elem.textContent = pages.toLocaleString(); });
        
        document.querySelector('.results > .common-loading').hidden = true;
        document.querySelector('.results-top').style.display = 'flex';
        document.querySelector('.results-list').hidden = false;
        document.querySelectorAll('.results-navigate').forEach(elem => { elem.hidden = pages < 2; });
        
        applySort();
    });
}

function applySort() {
    let sortOption = fpdb.sortOptions[document.querySelector('.results-sort-options').selectedIndex],
        direction = document.querySelector('.results-sort-direction').selectedIndex == 0 ? 1 : -1;
    
    if (sortOption.name != 'random') {
        fpdb.list = fpdb.list.sort((a, b) => {
            let i = 0;
            while (i < sortOption.fields.length) {
                let compare = a[sortOption.fields[i]].localeCompare(b[sortOption.fields[i]], 'en', { sensitivity: 'base' });
                if (compare == 0) i++; else return compare * direction;
            }
            return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }) * direction;
        });
    }
    else {
        for (let i = fpdb.list.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [fpdb.list[i], fpdb.list[j]] = [fpdb.list[j], fpdb.list[i]];
        }
    }
    
    loadPage(1);
}

function loadPage(page) {
    let htmlList = document.querySelector('.results-list');
    while (htmlList.firstChild)
        htmlList.removeChild(htmlList.firstChild);
    
    currentPage = page;
    document.querySelectorAll('.results-current-page').forEach(elem => { elem.textContent = currentPage.toLocaleString(); });
    document.querySelector('.results').scrollTop = 0;
    
    for (let i = (page - 1) * 100; i < Math.min(fpdb.list.length, page * 100); i++) {
        let entry = document.createElement('div')
        entry.className = 'entry';
        
        let logo = document.createElement('div');
        logo.className = 'entry-logo';
        logo.setAttribute('view', i);
        logo.style.backgroundImage = `url("${fpdb.images}/Logos/${fpdb.list[i].id.substring(0, 2)}/${fpdb.list[i].id.substring(2, 4)}/${fpdb.list[i].id}.png?type=jpg")`;
        logo.addEventListener('click', loadEntry);
        
        let text = document.createElement('div');
        text.className = 'entry-text';
        
        let header = document.createElement('div'),
            subHeader = document.createElement('div');
        
        let title = document.createElement('a');
        title.classList.add('entry-title', 'common-activate');
        title.setAttribute('view', i);
        title.textContent = fpdb.list[i].title;
        title.addEventListener('click', loadEntry);

        let developer = document.createElement('span');
        developer.className = 'entry-developer';
        if (fpdb.list[i].developer != '')
            developer.textContent = ' by ' + fpdb.list[i].developer;
        else if (fpdb.list[i].publisher != '')
            developer.textContent = ' by ' + fpdb.list[i].publisher;
        else
            developer.hidden = true;
        
        let type = document.createElement('span');
        type.className = 'entry-type';
        type.textContent = fpdb.list[i].platform.replace(/; /g, '/') + (fpdb.list[i].library == 'arcade' ? ' game' : ' animation');
        
        let tags = document.createElement('span');
        tags.className = 'entry-tags';
        tags.textContent = ' - ' + fpdb.list[i].tags.join(' - ');
        
        let description = document.createElement('div');
        description.className = 'entry-description';
        if (fpdb.list[i].originalDescription != '')
            description.textContent = fpdb.list[i].originalDescription;
        else {
            description.textContent = 'No description.'
            description.style.color = '#000a';
            description.style.fontStyle = 'italic';
        }
        
        header.append(title, developer);
        subHeader.append(type, tags);
        text.append(header, subHeader, description);
        entry.append(logo, text);
        htmlList.append(entry);
    }
}

function loadPageFromInput(input) {
    let value = parseInt(input.value, 10);
    
    if (!isNaN(value) && value != currentPage && value > 0 && value <= pages) {
        loadPage(value);
        input.value = '';
    }
}

async function loadEntry(e) {
    let id;
    
    if (e != undefined) {
        try { id = fpdb.list[e.target.getAttribute('view')].id; } catch { return; }
        document.querySelector('.viewer-back').hidden = false;
    }
    else if (location.hash.length == 37) {
        id = location.hash.substring(1);
        document.querySelector('.viewer-back').hidden = true;
    }
    else return;
    
    location.hash = id;
    fpdb.lastScrollPos = document.querySelector('.results').scrollTop;
    
    document.querySelector('.results-top').style.display = 'none';
    document.querySelector('.results-list').hidden = true;
    document.querySelector('.results-bottom').hidden = true;
    document.querySelector('.results > .common-loading').hidden = false;
    
    let entry = (await fetch(`${fpdb.api}/search?id=${id}&limit=1`).then(r => r.json()))[0];
    
    document.querySelector('.viewer-play').style.display = (() => {
        let launchPath;
        try { launchPath = new URL(entry.launchCommand).pathname; } catch { return true; }
        
        if (['.swf', '.wrl', '.wrl.gz', '.x3d'].some(ext => launchPath.toLowerCase().endsWith(ext))) {
            document.querySelector('.viewer-play').href = 'https://ooooooooo.ooo/static/?' + id;
            return 'unset';
        }
        else return 'none';
    })();
    
    let logo = `${fpdb.images}/Logos/${id.substring(0, 2)}/${id.substring(2, 4)}/${id}.png`,
        screenshot = `${fpdb.images}/Screenshots/${id.substring(0, 2)}/${id.substring(2, 4)}/${id}.png`;
    
    document.querySelector('.viewer-logo a').href = logo;
    document.querySelector('.viewer-logo img').style.visibility = 'hidden';
    document.querySelector('.viewer-logo img').addEventListener('load', e => e.target.style.visibility = 'visible');
    document.querySelector('.viewer-logo img').src = logo + '?type=jpg';
    
    document.querySelector('.viewer-screenshot a').href = screenshot;
    document.querySelector('.viewer-screenshot img').style.visibility = 'hidden';
    document.querySelector('.viewer-screenshot img').addEventListener('load', e => e.target.style.visibility = 'visible');
    document.querySelector('.viewer-screenshot img').src = screenshot + '?type=jpg';
    
    let metaTable = document.querySelector('.viewer-metadata');
    while (metaTable.firstChild)
        metaTable.removeChild(metaTable.firstChild);
    
    for (let field in fpdb.metaMap) {
        if (entry[field].length > 0 || typeof(entry[field]) == 'boolean') {
            let row = document.createElement('tr'),
                fieldName  = document.createElement('td'),
                fieldValue = document.createElement('td');
            
            fieldName.textContent = fpdb.metaMap[field] + ':';
            
            switch (field) {
                case 'library':
                    fieldValue.textContent = entry[field] == 'arcade'
                        ? 'Games'
                        : 'Animations';
                    break;
                case 'tags':
                    let ul = document.createElement('ul');
                    for (let tag of entry.tags) {
                        let li = document.createElement('li');
                        li.textContent = tag;
                        ul.append(li);
                    }
                    fieldValue.append(ul);
                    break;
                case 'releaseDate':
                    fieldValue.textContent = new Date(entry[field]).toLocaleDateString(undefined, { timeZone: 'UTC' });
                    break;
                case 'dateAdded':
                case 'dateModified':
                    fieldValue.textContent = new Date(entry[field]).toLocaleString();
                    break;
                case 'zipped':
                    fieldValue.textContent = entry[field] ? 'GameZIP' : 'Legacy';
                    break;
                case 'notes':
                case 'originalDescription':
                    fieldValue.style.whiteSpace = 'pre-wrap';
                default:
                    fieldValue.textContent = entry[field];
            }
            
            row.append(fieldName, fieldValue);
            metaTable.append(row);
        }
    }
    
    let addApps = await fetch(`${fpdb.api}/addapps?id=${id}`).then(r => r.json()),
        addAppTables = document.querySelector('.viewer-add-apps');
    if (addApps.length > 0) {
        while (addAppTables.firstChild)
            addAppTables.removeChild(addAppTables.firstChild);
        
        for (let app of addApps) {
            let table = document.createElement('table');
            table.className = 'common-table';
            
            for (let field in fpdb.addAppMap) {
                let row = document.createElement('tr'),
                    fieldName  = document.createElement('td'),
                    fieldValue = document.createElement('td');
                
                fieldName.textContent  = fpdb.addAppMap[field] + ':';
                fieldValue.textContent = app[field];
                
                row.append(fieldName, fieldValue);
                table.append(row);
            }
            
            addAppTables.append(table);
        }
        
        addAppTables.hidden = false;
        document.querySelector('.viewer-add-apps-header').hidden = false;
    }
    else {
        addAppTables.hidden = true;
        document.querySelector('.viewer-add-apps-header').hidden = true;
    }
    
    document.querySelector('.results > .common-loading').hidden = true;
    document.querySelector('.viewer').style.display = 'flex';
}

function backToResults() {
    location.hash = '';
    document.querySelector('.viewer').style.display = 'none';
    document.querySelector('.results-top').style.display = 'flex';
    document.querySelector('.results-list').hidden = false;
    document.querySelector('.results-bottom').hidden = pages < 2;
    document.querySelector('.results').scrollTop = fpdb.lastScrollPos;
}

document.querySelector('.search-button').addEventListener('click', performSearch);

document.querySelectorAll('.results-first-page').forEach(elem => elem.addEventListener('click', () => { if (currentPage > 1) loadPage(1); }));
document.querySelectorAll('.results-back-page').forEach(elem => elem.addEventListener('click', () => { if (currentPage > 1) loadPage(currentPage - 1); }));
document.querySelectorAll('.results-forward-page').forEach(elem => elem.addEventListener('click', () => { if (currentPage < pages) loadPage(currentPage + 1); }));
document.querySelectorAll('.results-last-page').forEach(elem => elem.addEventListener('click', () => { if (currentPage < pages) loadPage(pages); }));

document.querySelectorAll('.results-go-to-page').forEach((elem, i) => elem.addEventListener('click', () => loadPageFromInput(document.querySelectorAll('.results-input-page')[i])));
document.querySelectorAll('.results-input-page').forEach(elem => elem.addEventListener('keyup', e => { if (e.key == 'Enter') loadPageFromInput(e.target); }));

document.querySelector('.viewer-back').addEventListener('click', backToResults);