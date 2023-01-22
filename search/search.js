let fpdb = {
    api: 'https://db-api.unstable.life',
    list: [],
    pages: 0,
    currentPage: 1,
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

fetch(fpdb.api + '/platforms').then(r => r.json()).then(json => {
    for (let platform of json.sort()) {
        let opt = document.createElement('option');
        opt.value = platform;
        opt.innerText = platform;
        
        document.querySelector('.meta-platform-select').append(opt);
    }
});

function performSearch() {
    let search = {
        id:               document.querySelector('.meta-id').value,
        library:          Array.from(document.querySelectorAll('.meta-library-select input')).find(elem => elem.checked).value,
        title:            document.querySelector('.meta-title').value,
        alternateTitles:  document.querySelector('.meta-alternate-titles').value,
        series:           document.querySelector('.meta-series').value,
        developer:        document.querySelector('.meta-developer').value,
        publisher:        document.querySelector('.meta-publisher').value,
        source:           document.querySelector('.meta-source').value,
        tags:             Array.from(document.querySelectorAll('.meta-tags-list span'), elem => elem.textContent).join(','),
        platform:         document.querySelector('.meta-platform-select').value,
        playMode:         Array.from(document.querySelectorAll('.meta-play-mode-select input')).filter(elem => elem.checked).map(elem => elem.value).join('&playMode='),
        status:           Array.from(document.querySelectorAll('.meta-status-select input')).filter(elem => elem.checked).map(elem => elem.value).join('&status='),
        version:          document.querySelector('.meta-version').value,
        releaseDate:      document.querySelector('.meta-release-date').value,
        language:         document.querySelector('.meta-language').value,
        activeDataOnDisk: Array.from(document.querySelectorAll('.meta-format-select input')).find(elem => elem.checked).value,
        filter:           document.querySelector('.meta-nsfw-toggle').checked ? '' : 'true',
        or:               document.querySelector('.meta-or-mode').checked ? 'true' : ''
    };
    
    let params = [];
    for (let field in search)
        if (search[field] != '')
            params.push(`${field}=${search[field]}`);
    
    document.querySelector('.results-top').style.display = 'none';
    document.querySelector('.results-list').hidden = true;
    document.querySelector('.viewer').style.display = 'none';
    document.querySelector('.results > .common-loading').hidden = false;
    
    fetch(`${fpdb.api}/search?${params.join('&')}`).then(r => r.json()).then(json => {
        fpdb.list = json.sort((a, b) => a.title == b.title ? 0 : (a.title > b.title ? 1 : -1));
        pages = Math.ceil(fpdb.list.length / 100);
        
        loadPage(1);
        
        document.querySelector('.results-total').textContent = fpdb.list.length;
        document.querySelector('.results-max-pages').textContent = pages;
        
        document.querySelector('.results > .common-loading').hidden = true;
        document.querySelector('.results-top').style.display = 'flex';
        document.querySelector('.results-list').hidden = false;
    });
}

function loadPage(page) {
    let htmlList = document.querySelector('.results-list');
    while (htmlList.firstChild)
        htmlList.removeChild(htmlList.firstChild);
    
    currentPage = page;
    document.querySelector('.results-current-page').textContent = currentPage;
    
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
        if (fpdb.list[i].developer != '') {
            developer.textContent = ' by ' + fpdb.list[i].developer;
        }
        else if (fpdb.list[i].publisher != '') {
            developer.textContent = ' by ' + fpdb.list[i].publisher;
        }
        else {
            developer.hidden = true;
        }
        
        let type = document.createElement('span');
        type.className = 'entry-type';
        type.textContent = fpdb.list[i].platform + (fpdb.list[i].library == 'arcade' ? ' game' : ' animation');
        
        let tags = document.createElement('span');
        tags.className = 'entry-tags';
        tags.textContent = ' - ' + fpdb.list[i].tags.join(' - ');
        
        let description = document.createElement('div');
        description.className = 'entry-description';
        if (fpdb.list[i].originalDescription != '') {
            description.textContent = fpdb.list[i].originalDescription;
        } 
        else {
            description.textContent = 'No description.'
            description.style.color = '#000a';
            description.style.fontStyle = 'italic';
        }
        
        header.append(title);
        header.append(developer);
        
        subHeader.append(type);
        subHeader.append(tags);
        
        text.append(header);
        text.append(subHeader);
        text.append(description);
        
        entry.append(logo);
        entry.append(text);
        
        htmlList.append(entry);
    }
}

function loadPageFromInput() {
    let value = parseInt(document.querySelector('.results-input-page').value, 10);
    
    if (!isNaN(value) && value != currentPage && value > 0 && value <= pages) {
        loadPage(value);
        document.querySelector('.results-input-page').value = '';
    }
}

async function loadEntry(e) {
    let i = parseInt(e.target.getAttribute('view'));
    if (isNaN(i)) return;
    
    document.querySelector('.results-top').style.display = 'none';
    document.querySelector('.results-list').hidden = true;
    document.querySelector('.results > .common-loading').hidden = false;
    
    let requests = [
        `${fpdb.api}/logo?id=${fpdb.list[i].id}`,
        `${fpdb.api}/screenshot?id=${fpdb.list[i].id}`,
        `${fpdb.api}/addapps?id=${fpdb.list[i].id}`,
        `${fpdb.api}/files?id=${fpdb.list[i].id}`,
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
        if (fpdb.list[i][field].length > 0 || typeof(fpdb.list[i][field]) == 'boolean') {
            let row = document.createElement('tr'),
                fieldName  = document.createElement('td'),
                fieldValue = document.createElement('td');
            
            fieldName.textContent = fpdb.metaMap[field] + ':';
            
            switch (field) {
                case 'library':
                    fieldValue.textContent = fpdb.list[i][field] == 'arcade'
                        ? 'Games'
                        : 'Animations';
                    break;
                case 'tags':
                    let ul = document.createElement('ul');
                    for (let tag of fpdb.list[i].tags) {
                        let li = document.createElement('li');
                        li.textContent = tag;
                        ul.append(li);
                    }
                    fieldValue.append(ul);
                    break;
                case 'releaseDate':
                    fieldValue.textContent = new Date(fpdb.list[i][field]).toLocaleDateString(undefined, { timeZone: 'UTC' });
                    break;
                case 'dateAdded':
                case 'dateModified':
                    fieldValue.textContent = new Date(fpdb.list[i][field]).toLocaleString();
                    break;
                case 'zipped':
                    fieldValue.textContent = fpdb.list[i][field]
                        ? "GameZIP"
                        : "Legacy";
                    break;
                case 'notes':
                case 'originalDescription':
                    fieldValue.style.whiteSpace = 'pre-wrap';
                default:
                    fieldValue.textContent = fpdb.list[i][field];
            }
            
            row.append(fieldName);
            row.append(fieldValue);
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
                
                row.append(fieldName);
                row.append(fieldValue);
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
    if (fpdb.list[i].zipped) {
        while (fileList.firstChild)
            fileList.removeChild(fileList.firstChild);
        
        for (let file of files) {
            let span = document.createElement('span');
            span.textContent += file;
            
            fileList.append(span);
        }
        
        fileList.hidden = false;
        document.querySelector('.viewer-no-file-list').hidden = true;
    }
    else {
        fileList.hidden = true;
        document.querySelector('.viewer-no-file-list').hidden = false;
    }
    
    document.querySelector('.results > .common-loading').hidden = true;
    document.querySelector('.viewer').style.display = 'flex';
}

function backToResults() {
    document.querySelector('.viewer').style.display = 'none';
    document.querySelector('.results-top').style.display = 'flex';
    document.querySelector('.results-list').hidden = false;
}

function addTag() {
    let value = document.querySelector('.meta-tags-input').value;
    if (value == '') return;
    
    let container    = document.createElement('div'),
        deleteButton = document.createElement('button'),
        valueElement = document.createElement('span');
    
    deleteButton.innerText = 'X';
    deleteButton.addEventListener('click', e => event.target.parentNode.remove());
    
    valueElement.innerText = value;
    
    container.append(deleteButton);
    container.append(valueElement);
    
    document.querySelector('.meta-tags-list').append(container);
    document.querySelector('.meta-tags-input').value = '';
    document.querySelector('.meta-tags-input').focus();
}

document.querySelector('.search-button').addEventListener('click', performSearch);
document.querySelector('.meta-id').addEventListener('keyup', e => { if (e.key == 'Enter') performSearch(); });
document.querySelector('.meta-title').addEventListener('keyup', e => { if (e.key == 'Enter') performSearch(); });

document.querySelector('.meta-tags-add').addEventListener('click', addTag);
document.querySelector('.meta-tags-input').addEventListener('keyup', e => { if (e.key == 'Enter') addTag(); });

document.querySelector('.results-first-page').addEventListener('click', () => { if (currentPage > 1) loadPage(1); });
document.querySelector('.results-back-page').addEventListener('click', () => { if (currentPage > 1) loadPage(currentPage - 1); });
document.querySelector('.results-forward-page').addEventListener('click', () => { if (currentPage < pages) loadPage(currentPage + 1); });
document.querySelector('.results-last-page').addEventListener('click', () => { if (currentPage < pages) loadPage(pages); });

document.querySelector('.results-go-to-page').addEventListener('click', loadPageFromInput);
document.querySelector('.results-input-page').addEventListener('keyup', e => { if (e.key == 'Enter') loadPageFromInput(); });

document.querySelector('.viewer-back').addEventListener('click', backToResults);