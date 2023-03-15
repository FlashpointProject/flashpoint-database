let downloadRoot = '.';

fetch(`${downloadRoot}/info.json`).then(r => r.json()).then(json => {
    document.querySelector('.download-compressed-size').textContent   = formatBytes(json.compressedSize);
    document.querySelector('.download-uncompressed-size').textContent = formatBytes(json.uncompressedSize);
    
    for (let table in json) {
        if (table == 'compressedSize' || table == 'uncompressedSize') continue;
        
        for (let entry of json[table]) {
            let row = document.createElement('tr'),
                entryName = document.createElement('td'),
                entrySize = document.createElement('td'),
                entryDownload = document.createElement('td'),
                entryDownloadLink = document.createElement('a'),
                entryHash = document.createElement('td'),
                entryHashCopy = document.createElement('span');
            
            entryName.textContent = entry.name
            entrySize.textContent = formatBytes(entry.size);
            
            entryDownloadLink.textContent = entry.file;
            entryDownloadLink.href = `${downloadRoot}/${entry.file}`;
            entryDownload.append(entryDownloadLink);
            
            entryHashCopy.textContent = 'Copy';
            entryHashCopy.className = 'common-activate';
            entryHashCopy.addEventListener('click', () => { navigator.clipboard.writeText(entry.hash) });
            entryHash.append(entryHashCopy);
            
            row.append(entryName);
            row.append(entrySize);
            row.append(entryDownload);
            row.append(entryHash);
            
            try {
                document.getElementById(table).append(row);
            }
            catch {
                document.getElementById('other').append(row);
            }
        }
    }
});

function formatBytes(bytes) {
    const units = [' bytes', 'KB', 'MB', 'GB', 'TB'];
    
    let i = units.length;
    while (--i >= 0) {
        let unitSize = Math.pow(1024, i);
        if (bytes >= unitSize)
            return (Math.floor((bytes / unitSize) * 100) / 100) + units[i];
    }
    
    return '0 bytes';
}