const SECURITY_CONFIG = {
    MAX_DOWNLOADS: 50,
    DOWNLOAD_DELAY: 500,
    ALLOWED_PROTOCOLS: ['http:', 'https:'],
    MAX_FILENAME_LENGTH: 50,
    BLOCKED_EXTENSIONS: ['exe', 'bat', 'cmd', 'com', 'scr', 'vbs', 'js', 'msi'],
    FILE_EXTENSIONS: {
        pdf: { pattern: "\\.pdf(\\?.*)?$", mime: ['application/pdf'] },
        mp3: { pattern: "\\.mp3(\\?.*)?$", mime: ['audio/mpeg'] },
        mp4: { pattern: "\\.(mp4|webm|ogg|avi|mov)(\\?.*)?$", mime: ['video/mp4', 'video/webm'] },
        docx: { pattern: "\\.(docx|doc)(\\?.*)?$", mime: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'] },
        jpg: { pattern: "\\.(jpg|jpeg|png|gif|webp|svg)(\\?.*)?$", mime: ['image/jpeg', 'image/png'] },
        zip: { pattern: "\\.(zip|rar|7z|tar|gz)(\\?.*)?$", mime: ['application/zip'] }
    }
};

let foundLinks = [];
let downloadInProgress = false;

const SecurityUtils = {
    isValidUrl(urlString) {
        try {
            const url = new URL(urlString);
            if (!SECURITY_CONFIG.ALLOWED_PROTOCOLS.includes(url.protocol)) return false;
            if (['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)) return false;
            return true;
        } catch (e) { return false; }
    },
    
    hasBlockedExtension(url) {
        const urlLower = url.toLowerCase().split('?')[0];
        return SECURITY_CONFIG.BLOCKED_EXTENSIONS.some(ext => urlLower.endsWith(`.${ext}`));
    },
    
    sanitizeFilename(filename) {
        if (!filename) return 'file_unknown';
        let clean = filename.replace(/[<>:"|?*\x00-\x1f]/g, '_').replace(/\.\./g, '_').trim();
        if (clean.length > SECURITY_CONFIG.MAX_FILENAME_LENGTH) {
            const parts = clean.split('.');
            const ext = parts.pop();
            clean = parts.join('.').substring(0, SECURITY_CONFIG.MAX_FILENAME_LENGTH - ext.length - 4) + '...' + ext;
        }
        return clean;
    },
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

const UI = {
    showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = type;
    },
    
    updateStats(selected, total) {
        const stats = document.getElementById('stats');
        if (stats) stats.textContent = `נבחרו ${selected} מתוך ${total} קבצים`;
    }
};

// כפתור סריקה
document.getElementById('scanBtn').addEventListener('click', async () => {
    const fileType = document.getElementById('fileType').value;
    const fileListDiv = document.getElementById('fileList');
    const downloadBtn = document.getElementById('downloadSelected');
    const toggleAllBtn = document.getElementById('toggleAll');
    
    UI.showStatus("סורק את הדף (כולל מסגרות)...", 'info');
    fileListDiv.innerHTML = "";
    foundLinks = [];
    
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id, allFrames: true },
            func: (type, config) => {
                const urls = new Set();
                const fileConfig = config.FILE_EXTENSIONS[type];
                const regex = new RegExp(fileConfig.pattern, 'i');
                
                // חיפוש בכל הקישורים בדף
                Array.from(document.links).forEach(link => {
                    if (regex.test(link.href)) {
                        urls.add(link.href);
                    }
                });
                return Array.from(urls);
            },
            args: [fileType, SECURITY_CONFIG]
        });

        // איחוד תוצאות מכל ה-Frames וסינון כפילויות
        const allUrls = [...new Set(results.flatMap(result => result.result))];
        foundLinks = allUrls.filter(url => SecurityUtils.isValidUrl(url) && !SecurityUtils.hasBlockedExtension(url));

        if (foundLinks.length === 0) {
            UI.showStatus("לא נמצאו קבצים מסוג זה בדף.", 'error');
            return;
        }

        renderFileList(foundLinks);
        UI.showStatus(`נמצאו ${foundLinks.length} קבצים`, 'success');
        fileListDiv.style.display = 'block';
        downloadBtn.style.display = 'block';
        toggleAllBtn.style.display = 'block';
        UI.updateStats(0, foundLinks.length);

    } catch (err) {
        UI.showStatus("שגיאה בסריקה: " + err.message, 'error');
    }
});

function renderFileList(links) {
    const fileListDiv = document.getElementById('fileList');
    fileListDiv.innerHTML = links.map((link, index) => {
        const fileName = SecurityUtils.sanitizeFilename(link.split('/').pop());
        return `
            <div class="file-item">
                <input type="checkbox" class="file-checkbox" id="file-${index}" value="${link}">
                <label for="file-${index}">${SecurityUtils.escapeHtml(fileName)}</label>
            </div>
        `;
    }).join('');

    fileListDiv.querySelectorAll('.file-checkbox').forEach(input => {
        input.addEventListener('change', () => {
            const selectedCount = fileListDiv.querySelectorAll('.file-checkbox:checked').length;
            UI.updateStats(selectedCount, links.length);
        });
    });
}

// כפתור בחר הכל
document.getElementById('toggleAll').addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('.file-checkbox');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    checkboxes.forEach(cb => cb.checked = !allChecked);
    UI.updateStats(document.querySelectorAll('.file-checkbox:checked').length, checkboxes.length);
});

// פונקציית הורדה
document.getElementById('downloadSelected').addEventListener('click', async () => {
    const selected = Array.from(document.querySelectorAll('.file-checkbox:checked')).map(cb => cb.value);
    
    if (selected.length === 0) {
        UI.showStatus("אנא בחר לפחות קובץ אחד", 'error');
        return;
    }

    if (selected.length > SECURITY_CONFIG.MAX_DOWNLOADS) {
        UI.showStatus(`ניתן להוריד עד ${SECURITY_CONFIG.MAX_DOWNLOADS} קבצים בו-זמנית`, 'error');
        return;
    }

    downloadInProgress = true;
    document.getElementById('downloadSelected').disabled = true;

    for (let i = 0; i < selected.length; i++) {
        const url = selected[i];
        UI.showStatus(`מוריד קובץ ${i + 1} מתוך ${selected.length}...`, 'info');
        
        chrome.downloads.download({
            url: url,
            conflictAction: 'uniquify'
        });

        // השהייה בין הורדות למניעת חסימה
        await new Promise(resolve => setTimeout(resolve, SECURITY_CONFIG.DOWNLOAD_DELAY));
    }

    UI.showStatus("ההורדה הסתיימה!", 'success');
    downloadInProgress = false;
    document.getElementById('downloadSelected').disabled = false;
});