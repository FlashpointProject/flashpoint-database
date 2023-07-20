let fpdb = {
    api: 'https://db-api.unstable.life',
    platforms: [],
    sortOptions: [],
    list: [],
    pages: 0,
    currentPage: 1,
    currentEntry: 0,
    activePlayer: -1,
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

let players = [
    {
        source: 'https://unpkg.com/@ruffle-rs/ruffle',
        platforms: [ 'Flash' ],
        extensions: [ '.swf' ],
        loaded: false,
        index: -1,
        
        _instance: null,
        set instance(launchCommand) {
            if (fpdb.activePlayer != this.index) {
                document.querySelectorAll('.player-instance').forEach(elem => elem.remove());
                
                this._instance = window.RufflePlayer.newest().createPlayer();
                this._instance.className = 'player-instance';
                
                document.querySelector('.player').append(this._instance);
                
                fpdb.activePlayer = this.index;
            }
            
            this._instance.load(launchCommand);
            window.RufflePlayer.config.base = launchCommand.substring(0, launchCommand.lastIndexOf('/'));
            
            this._instance.addEventListener('loadedmetadata', () => {
                if (this._instance.metadata.width > 1 && this._instance.metadata.height > 1) {
                    this._instance.style.width  = this._instance.metadata.width  + 'px';
                    this._instance.style.height = this._instance.metadata.height + 'px';
                }
                this._instance.style.display = 'inline-block';
            });
        },
        
        stop() { this._instance.pause(); }
    },
    {
        source: 'https://create3000.github.io/code/x_ite/latest/x_ite.min.js',
        platforms: [ 'VRML', 'X3D' ],
        extensions: [ '.wrl', '.wrl.gz', '.x3d' ],
        loaded: false,
        index: -1,
        
        _instance: null,
        set instance(launchCommand) {
            if (fpdb.activePlayer != this.index) {
                document.querySelectorAll('.player-instance').forEach(elem => elem.remove());
                
                this._instance = X3D.createBrowser();
                this._instance.className = 'player-instance';
                
                this._instance.style.maxWidth = '800px';
                this._instance.style.maxHeight = '600px';
                this._instance.style.width = '100%';
                this._instance.style.height = '100%';
                
                document.querySelector('.player').append(this._instance);
                
                fpdb.activePlayer = this.index;
            }
            
            this._instance.browser.baseURL = launchCommand.substring(0, launchCommand.lastIndexOf('/'));
            this._instance.browser.loadURL(new X3D.MFString(launchCommand));
            
            this._instance.style.display = 'inline-block';
        },
        
        stop() {}
    }
];
players.forEach((player, i) => player.index = i);

let jsZip = {
    source: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
    loaded: false
};

const _fetch = window.fetch;
const _createElement = document.createElement;

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
    else if (location.hash.length == 37) {
        fpdb.list = await fetch(`${fpdb.api}/search?id=${location.hash.substring(1)}`).then(r => r.json());
        if (fpdb.list.length > 0) loadEntry();
    }
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
    
    if (field.name == 'platformsStr')
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
    
    fetch(`${fpdb.api}/search?${params.join('&')}`).then(r => r.json()).then(json => {
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
    let fields = fpdb.sortOptions[document.querySelector('.results-sort-options').selectedIndex].fields,
        direction = document.querySelector('.results-sort-direction').selectedIndex == 0 ? 1 : -1;
    
    fpdb.list = fpdb.list.sort((a, b) => {
        let i = 0;
        while (i < fields.length) {
            let compare = a[fields[i]].localeCompare(b[fields[i]], 'en', { sensitivity: 'base' });
            if (compare == 0) i++; else return compare * direction;
        }
        return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }) * direction;
    });
    
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
        logo.style.backgroundImage = `url("${fpdb.api}/logo?id=${fpdb.list[i].id}&format=jpeg&quality=40&width=128")`;
        logo.addEventListener('click', loadEntry);
        
        let text = document.createElement('div');
        text.className = 'entry-text';
        
        let header = document.createElement('div');
        let subHeader = document.createElement('div');
        
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
    let i = 0;
    
    if (e != undefined) {
        i = parseInt(e.target.getAttribute('view'));
        if (isNaN(i)) return;
        document.querySelector('.viewer-back').style.visibility = 'visible';
    }
    else if (fpdb.list.length > 0)
        document.querySelector('.viewer-back').style.visibility = 'hidden';
    else return;
    
    fpdb.currentEntry = i;
    fpdb.lastScrollPos = document.querySelector('.results').scrollTop;
    
    let entry = fpdb.list[fpdb.currentEntry];
    
    document.querySelector('.results-top').style.display = 'none';
    document.querySelector('.results-list').hidden = true;
    document.querySelector('.results-bottom').hidden = true;
    document.querySelector('.results > .common-loading').hidden = false;
    
    document.querySelector('.viewer-play').hidden = (() => {
        let launchPath;
        try { launchPath = new URL(entry.launchCommand).pathname; } catch { return true; }
        
        for (let player of players) {
            if (player.platforms.some(platform => entry.platform == platform)
             && player.extensions.some(extension => launchPath.toLowerCase().endsWith(extension)))
                return false;
        }
        return true;
    })();
    
    let requests = [
        `${fpdb.api}/logo?id=${entry.id}`,
        `${fpdb.api}/screenshot?id=${entry.id}`,
        `${fpdb.api}/addapps?id=${entry.id}`,
        `${fpdb.api}/files?id=${entry.id}`,
    ];
    
    let responses = [];
    
    for (let url of requests)
        responses.push(fetch(url));
    
    let logo       = await responses[0].then(r => r.blob()),
        screenshot = await responses[1].then(r => r.blob()),
        addApps    = await responses[2].then(r => r.json()),
        files      = await responses[3].then(r => r.json());
    
    document.querySelector('.viewer-logo img').src = URL.createObjectURL(logo);
    document.querySelector('.viewer-screenshot img').src = URL.createObjectURL(screenshot);
    
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
                    fieldValue.textContent = entry[field]
                        ? "GameZIP"
                        : "Legacy";
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
    
    let addAppTables = document.querySelector('.viewer-add-apps');
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
        document.querySelector('.viewer-no-add-apps').hidden = true;
    }
    else {
        addAppTables.hidden = true;
        document.querySelector('.viewer-no-add-apps').hidden = false;
    }
    
    let fileList = document.querySelector('.viewer-file-list');
    if (entry.zipped) {
        while (fileList.firstChild)
            fileList.removeChild(fileList.firstChild);
        
        for (let file of files) {
            let span = document.createElement('span');
            span.textContent = file;
            
            for (let player of players) {
                let fileURL = 'http://' + file;
                if (player.extensions.some(extension => fileURL.toLowerCase().endsWith(extension))) {
                    span.className = 'common-activate';
                    span.addEventListener('click', () => playEntry(fileURL));
                    break;
                }
            }
            
            fileList.append(span);
        }
        
        fileList.style.display = 'flex';
        document.querySelector('.viewer-no-file-list').hidden = true;
    }
    else {
        fileList.style.display = 'none';
        document.querySelector('.viewer-no-file-list').hidden = false;
    }
    
    document.querySelector('.results > .common-loading').hidden = true;
    document.querySelector('.viewer').style.display = 'flex';
}

async function playEntry(launchCommand = fpdb.list[fpdb.currentEntry].launchCommand) {
    let entry = fpdb.list[fpdb.currentEntry],
        launchPath = new URL(launchCommand).pathname,
        activePlayer = -1;
    
    for (let i = 0; i < players.length; i++) {
        if (!players[i].extensions.some(ext => launchPath.toLowerCase().endsWith(ext))) continue;
        
        if (!players[i].loaded) {
            let script = document.createElement('script');
            script.src = players[i].source;
            
            document.head.append(script);
            script.addEventListener('load', () => {
                players[i].loaded = true;
                if (!jsZip.loaded) loadJsZip(launchCommand);
            });
        }
        
        if (!jsZip.loaded) return;
        
        activePlayer = i;
        break;
    }
    
    document.querySelector('.player').style.display = 'inline-block';
    
    let gameZip;
    if (entry.zipped) gameZip = await new JSZip().loadAsync(await fetch(`${fpdb.api}/get?id=${entry.id}`).then(r => r.blob()));
    
    let redirect = async url => {
        let info = {
            base: new URL(url.origin == location.origin ? url.pathname.substring(1) : url.href, launchCommand),
            url: ''
        };
        
        if (entry.zipped) {
            let redirectedFile = gameZip.file(decodeURIComponent('content/' + info.base.hostname + info.base.pathname));
            if (redirectedFile != null) {
                info.url = URL.createObjectURL(await redirectedFile.async('blob'));
                return info;
            }
        }
        
        info.url = `${fpdb.api}/get?url=${info.base.hostname + info.base.pathname}`;
        return info;
    };
    
    window.fetch = async (resource, options) => {
        let resourceURL = new URL(resource instanceof Request ? resource.url : resource);
        
        if (resourceURL.protocol == 'blob:')
            resourceURL = new URL(resourceURL.pathname);
        
        if (resourceURL.hostname == 'unpkg.com' || !resourceURL.protocol.startsWith('http'))
            return await _fetch(resource, options);
        
        let redirectInfo = await redirect(resourceURL),
            response = await _fetch(redirectInfo.url, options);
        
        Object.defineProperty(response, 'url', { value: redirectInfo.base.href });
        return response;
    }
    
    document.createElement = function(...args) {
        let element = _createElement.apply(this, args),
            observer = new MutationObserver(async records => {
                for (let record of records) {
                    if (['blob:', fpdb.api].some(prefix => record.target.src.startsWith(prefix))) continue;
                    record.target.src = (await redirect(new URL(record.target.src))).url;
                }
            });
        
        if (element.tagName == 'IMG')
            observer.observe(element, { attributes: true, attributeFilter: ['src'] });
        
        return element;
    };
    
    players[activePlayer].instance = launchCommand;
}

function loadJsZip(launchCommand) {
    let script = document.createElement('script');
    script.src = jsZip.source;
    
    script.addEventListener('load', () => {
        jsZip.loaded = true;
        playEntry(launchCommand);
    });
    
    document.head.append(script);
}

function backToResults() {
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
document.querySelector('.viewer-copy').addEventListener('click', () => navigator.clipboard.writeText(location.href + '#' + fpdb.list[fpdb.currentEntry].id));
document.querySelector('.viewer-play').addEventListener('click', () => playEntry());

document.querySelector('.player-overlay').addEventListener('click', e => {
    try {
        document.querySelector('.player-instance').style.display = 'none';
        players[fpdb.activePlayer].stop();
    }
    catch {}
    
    e.target.parentNode.style.display = 'none';
    window.fetch = _fetch;
    document.createElement = _createElement;
});