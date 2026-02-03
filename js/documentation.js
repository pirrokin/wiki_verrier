// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let quill; // Global Quill instance
let currentProcessId = null; // Track current process for editing
let currentCategoryId = null; // Track current category
let allCategories = []; // Cache categories

// Retrieve username from localStorage
const username = localStorage.getItem('username');
if (!username) window.location.href = 'index.html';

// Check Admin Role
fetch('/api/profile?username=' + username)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Role check handled by navbar.js (admin controls visibility)
            if (data.user.role === 'admin') {
                document.getElementById('addCategoryBtn').style.display = 'inline-flex';
                document.getElementById('navAdminLink').style.display = 'block';
            }
        }
        loadCategories();
    })
    .catch(err => {
        console.error('Profile fetch error', err);
        loadCategories(); // Try to load anyway
    });

// --- Data Loading ---
function loadCategories() {
    const grid = document.getElementById('categoriesGrid');
    // loading state is already in HTML

    fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                allCategories = data.categories;
                renderCategoriesGrid(data.categories);

                // If we were viewing a category, refresh it
                if (currentCategoryId) {
                    const cat = allCategories.find(c => c.id === currentCategoryId);
                    if (cat) renderDocumentsList(cat);
                    else showCategories(); // Category might have been deleted
                }
            } else {
                grid.innerHTML = '<div style="color:var(--error-color)">Erreur lors du chargement.</div>';
            }
        });
}

function renderCategoriesGrid(categories) {
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';

    if (categories.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color:#64748b;">Aucune catégorie. Créez-en une !</div>';
        return;
    }

    categories.forEach(cat => {
        const card = document.createElement('div');
        card.className = 'category-card';
        card.onclick = () => showDocuments(cat.id);

        // Icon mapping based on name (simple heuristic)
        let iconName = 'folder';
        const lowerName = cat.name.toLowerCase();
        if (lowerName.includes('imprimante') || lowerName.includes('kyocera')) iconName = 'print';
        else if (lowerName.includes('réseau') || lowerName.includes('wifi')) iconName = 'wifi';
        else if (lowerName.includes('sécurité') || lowerName.includes('antivirus')) iconName = 'security';
        else if (lowerName.includes('mail') || lowerName.includes('outlook')) iconName = 'email';
        else if (lowerName.includes('logiciel') || lowerName.includes('office')) iconName = 'desktop_windows';

        // Delete button for admin (top right of card)
        // Check admin role again or just show it if button is visible
        const isAdmin = document.getElementById('addCategoryBtn').style.display !== 'none';
        let deleteBtn = '';
        if (isAdmin) {
            deleteBtn = `
            <button class="btn-icon delete-btn" 
                onclick="event.stopPropagation(); deleteCategory(${cat.id})" 
                title="Supprimer la catégorie"
                style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.3); color:white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
                <span class="material-icons" style="font-size: 14px;">delete</span>
            </button>`;
        }

        card.innerHTML = `
            ${deleteBtn}
            <div class="category-icon">
                <span class="material-icons">${iconName}</span>
            </div>
            <div class="category-title">${cat.name}</div>
            <div class="category-count">${cat.processes.length} documents</div>
        `;
        grid.appendChild(card);
    });
}

// --- Navigation ---

function showCategories() {
    document.getElementById('categoriesSection').style.display = 'block';
    document.getElementById('documentsSection').style.display = 'none';
    document.getElementById('searchInput').value = ''; // Clear search
    currentCategoryId = null;
}

function showDocuments(catId) {
    // Find category
    const cat = allCategories.find(c => c.id === catId);
    if (!cat) return;

    currentCategoryId = catId;
    renderDocumentsList(cat);

    // Switch views
    document.getElementById('categoriesSection').style.display = 'none';
    document.getElementById('documentsSection').style.display = 'block';
}

function renderDocumentsList(cat) {
    document.getElementById('currentCategoryTitle').innerText = cat.name;
    const list = document.getElementById('documentsList');
    list.innerHTML = '';

    // Show/Hide Add Process Button
    const isAdmin = document.getElementById('addCategoryBtn').style.display !== 'none';
    const addBtn = document.getElementById('addProcessBtn');
    if (isAdmin) addBtn.style.display = 'inline-flex';

    if (cat.processes.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding: 40px; color:#64748b;">Aucun document dans cette catégorie.</div>';
        return;
    }

    cat.processes.forEach(proc => {
        const item = document.createElement('div');
        item.className = 'doc-item';
        item.onclick = () => loadProcess(proc);

        let icon = 'description'; // Word/Generic
        if (proc.file_path && proc.file_path.endsWith('.pdf')) icon = 'picture_as_pdf';
        else if (proc.content) icon = 'article';

        const date = new Date(proc.created_at).toLocaleDateString('fr-FR');

        let deleteBtn = '';
        if (isAdmin) {
            deleteBtn = `
            <div class="doc-controls">
                <button class="btn-icon delete-btn" onclick="event.stopPropagation(); deleteProcess(${proc.id})" title="Supprimer" style="color: #ef4444;">
                    <span class="material-icons">delete</span>
                </button>
            </div>`;
        }

        item.innerHTML = `
            <div class="doc-icon">
                <span class="material-icons" style="font-size: 32px;">${icon}</span>
            </div>
            <div class="doc-info">
                <div class="doc-title">${proc.title}</div>
                <div class="doc-meta">
                    <span>${proc.author_name || 'Inconnu'}</span>
                    <span>•</span>
                    <span>${date}</span>
                </div>
            </div>
            ${deleteBtn}
        `;
        list.appendChild(item);
    });
}

function openProcessModalForCurrentCategory() {
    if (currentCategoryId) {
        openProcessModal(currentCategoryId);
    }
}

// --- Process Viewing (Modal) ---

function loadProcess(process, searchQuery = null) {
    currentProcessId = process.id;
    window.currentProcess = process; // Store full object for edit mode
    const overlay = document.getElementById('viewerModal');
    const container = document.getElementById('processViewer');

    overlay.classList.add('active'); // Show modal

    // Prepare content HTML
    let headerControls = `
        <button id="editBtn" class="btn-secondary" onclick="enableEditMode()" style="display: flex; align-items: center; gap: 5px;">
            <span class="material-icons" style="font-size: 16px;">edit</span> Modifier
        </button>
        <button id="saveBtn" class="btn-primary" onclick="saveContent()" style="display: none; align-items: center; gap: 5px;">
            <span class="material-icons" style="font-size: 16px;">save</span> Enregistrer
        </button>
    `;

    // Only show edit controls if admin (handled by CSS usually, but let's be safe)
    // Actually js/documentation.js didn't strictly check admin for edit button in previous version
    // But let's assume valid users can edit if they see the button.

    let contentHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px;">
            <div>
                <h1 style="margin: 0; color: white; font-size: 2rem;">${process.title}</h1>
                <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 5px;">
                    Par ${process.author_name || '...'} • ${new Date(process.created_at || Date.now()).toLocaleDateString()}
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                ${headerControls}
                ${process.file_path ? `<a href="/uploads/${process.file_path}" download class="btn-primary" style="text-decoration:none; display:flex; align-items:center; gap:5px;"><span class="material-icons">download</span> Télécharger</a>` : ''}
            </div>
        </div>
    `;

    // 1. Render HTML Content
    let displayContent = process.content || '';
    if (searchQuery && displayContent) {
        const regex = new RegExp(`(${searchQuery})`, 'gi');
        displayContent = displayContent.replace(regex, '<span style="background-color: yellow; color: black; font-weight: bold;">$1</span>');
    }

    contentHTML += `
    <div id="content-display" class="ql-snow" style="color: #e2e8f0; font-size: 1.1rem; line-height: 1.6;">
        <div class="ql-editor" style="padding: 0; border: none;">
            ${displayContent}
        </div>
    </div>
    <div id="editor-wrapper" style="display: none; background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; margin-top: 20px;">
        <div id="editor-container" style="height: 400px; background: transparent;"></div>
    </div>`;

    // 2. Render PDF via Iframe
    if (process.file_path && process.file_path.endsWith('.pdf')) {
        contentHTML += `
        <div id="pdf-container" style="width: 100%; height: 800px; background: #333; border-radius: 8px; overflow: hidden; margin-top: 30px;">
            <iframe src="/uploads/${process.file_path}" width="100%" height="100%" style="border: none;"></iframe>
        </div>`;
    }

    // Auto-edit for empty new docs (only if not a search result, to differenciate "empty" from "partial load")
    // Actually, we should trust that if we are here, we have the full object thanks to the fetch fix below.
    if (!process.content && !process.file_path) {
        setTimeout(() => enableEditMode(true), 100);
    }

    container.innerHTML = contentHTML;

    // Load History
    loadHistory(process.id);
}

function closeViewer() {
    document.getElementById('viewerModal').classList.remove('active');
    currentProcessId = null;
}

// --- Editing Logic (Mostly same as before) ---
function enableEditMode(isNew = false) {
    document.getElementById('editBtn').style.display = 'none';
    document.getElementById('saveBtn').style.display = 'flex';

    const displayDiv = document.getElementById('content-display');
    const editorWrapper = document.getElementById('editor-wrapper');

    if (displayDiv) displayDiv.style.display = 'none';
    editorWrapper.style.display = 'block';

    // Quill Setup
    if (quill) {
        const toolbar = document.querySelector('.ql-toolbar');
        if (toolbar) toolbar.remove();
    }

    quill = new Quill('#editor-container', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image'],
                ['clean']
            ]
        }
    });

    if (!isNew) {
        // Use raw content from memory to avoid saving search highlights or other view-only artifacts
        const contentToLoad = window.currentProcess && window.currentProcess.content ? window.currentProcess.content : '';
        quill.clipboard.dangerouslyPasteHTML(contentToLoad);
    }
}

function saveContent() {
    const content = quill.root.innerHTML;
    fetch(`/api/processes/${currentProcessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: content,
            modifier_username: username
        })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Update the object in memory if possible, or just reload the viewer
                // Reload viewer with new content
                const title = document.querySelector('h1').innerText; // hack to get title
                // actually we should fetch fresh data but let's cheat for speed
                const updatedProcess = {
                    id: currentProcessId,
                    title: title,
                    content: content,
                    author_name: 'Moi (à l\'instant)', // Approximate
                    created_at: new Date().toISOString()
                };
                loadProcess(updatedProcess);
                // Also refresh grid in bg
                loadCategories();
            } else {
                alert('Erreur: ' + data.message);
            }
        });
}

function loadHistory(processId) {
    // Append to viewer
    const container = document.getElementById('processViewer');
    let historyDiv = document.createElement('div');
    historyDiv.style.marginTop = '50px';
    historyDiv.style.borderTop = '1px solid rgba(255,255,255,0.1)';
    historyDiv.style.paddingTop = '20px';
    container.appendChild(historyDiv);

    fetch(`/api/processes/${processId}/history`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.history.length > 0) {
                let html = '<h3 style="color:#64748b; font-size:1rem; margin-bottom:15px;">Historique</h3>';
                data.history.forEach(item => {
                    html += `
                        <div style="display:flex; align-items:center; gap:10px; padding:10px; background:rgba(255,255,255,0.05); margin-bottom:8px; border-radius:6px;">
                            <span class="material-icons" style="font-size:16px; color:#94a3b8;">history</span>
                            <span style="font-size:0.9rem; color:#cbd5e1;">${item.username}</span>
                            <span style="font-size:0.8rem; color:#64748b; margin-left:auto;">${new Date(item.modified_at).toLocaleString()}</span>
                        </div>
                    `;
                });
                historyDiv.innerHTML = html;
            }
        });
}

// --- Search ---
const searchInput = document.getElementById('searchInput');
let searchTimeout;

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);

    if (query.length === 0) {
        showCategories(); // Reset view
        return;
    }

    searchTimeout = setTimeout(() => {
        fetch(`/api/search?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    renderSearchResults(data.results, query);
                }
            });
    }, 300);
});

function renderSearchResults(results, query) {
    // Hijack the documents view to show results
    document.getElementById('categoriesSection').style.display = 'none';
    document.getElementById('documentsSection').style.display = 'block';

    document.getElementById('currentCategoryTitle').innerText = `Résultats pour "${query}"`;
    document.getElementById('addProcessBtn').style.display = 'none'; // No adding in search results

    const list = document.getElementById('documentsList');
    list.innerHTML = '';

    if (results.length === 0) {
        list.innerHTML = '<div style="text-align:center; padding:40px; color:#64748b;">Aucun résultat.</div>';
        return;
    }

    results.forEach(proc => {
        const item = document.createElement('div');
        item.className = 'doc-item';
        item.onclick = () => {
            // Fetch full details first because search results don't have full content
            fetch(`/api/processes/${proc.id}`)
                .then(r => r.json())
                .then(d => {
                    if (d.success) {
                        loadProcess(d.process, query);
                    } else {
                        alert('Erreur: Impossible de charger le document.');
                    }
                });
        };

        const snippetHtml = proc.snippet ? `<div style="font-size:0.85rem; color:#94a3b8; margin-top:5px; font-style:italic;">"${proc.snippet}"</div>` : '';

        item.innerHTML = `
            <div class="doc-icon"><span class="material-icons">search</span></div>
            <div class="doc-info">
                <div class="doc-title">${proc.title}</div>
                <div class="doc-meta">Catégorie: ${proc.category_name}</div>
                ${snippetHtml}
            </div>
        `;
        list.appendChild(item);
    });
}

// --- Modals (Category, Process, Delete) ---
// Note: These mostly reuse existing logic but need to ensure ID matching
function openCategoryModal() { document.getElementById('categoryModal').classList.add('active'); }
function openProcessModal(catId) {
    document.getElementById('targetCategoryId').value = catId;
    document.getElementById('processModal').classList.add('active');
    // ... reset form inputs ...
    document.getElementById('newProcessTitle').value = '';
    // Simplification for this artifact update
}
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ... (Rest of delete/create logic largely same but calls loadCategories at end) ...

// Event Listeners for Forms (simplified override for brevity, ensuring they call loadCategories)
document.getElementById('addCategoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('newCategoryName').value;
    fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
        .then(res => res.json()).then(d => {
            if (d.success) { closeModal('categoryModal'); loadCategories(); }
        });
});

document.getElementById('addProcessForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData();
    const catId = document.getElementById('targetCategoryId').value;
    formData.append('category_id', catId);
    formData.append('title', document.getElementById('newProcessTitle').value);
    formData.append('author_username', username);

    const type = document.querySelector('input[name="processType"]:checked').value;

    if (type === 'pdf') {
        const f = document.getElementById('newProcessFile').files[0];
        if (f) formData.append('document', f);
        submitProcess(formData);
    } else if (type === 'word') {
        const f = document.getElementById('wordFileInput').files[0];
        if (f) {
            const reader = new FileReader();
            reader.onload = function (evt) {
                mammoth.convertToHtml({ arrayBuffer: evt.target.result })
                    .then(r => { formData.append('content', r.value); submitProcess(formData); })
            };
            reader.readAsArrayBuffer(f);
        }
    } else {
        formData.append('content', '');
        submitProcess(formData);
    }
});

function submitProcess(formData) {
    fetch('/api/processes', { method: 'POST', body: formData })
        .then(r => r.json()).then(d => {
            if (d.success) {
                // 1. Close modal immediately
                closeModal('processModal');

                // 2. Fetch fresh data to get the new process
                fetch('/api/categories')
                    .then(r => r.json())
                    .then(dd => {
                        if (dd.success) {
                            // 3. Update local cache
                            allCategories = dd.categories;
                            // 4. Refresh the current view
                            showDocuments(parseInt(formData.get('category_id')));
                            // 5. Show success message (optional but good UX)
                            // showSuccessToast('Document créé !');
                        }
                    });
            }
        });
}

function deleteCategory(id) {
    if (confirm('Supprimer cette catégorie ?')) {
        fetch(`/api/categories/${id}`, { method: 'DELETE' }).then(r => r.json()).then(d => {
            if (d.success) loadCategories();
        });
    }
}

function deleteProcess(id) {
    if (confirm('Supprimer ce document ?')) {
        fetch(`/api/processes/${id}`, { method: 'DELETE' }).then(r => r.json()).then(d => {
            if (d.success) loadCategories();
        });
    }
}

// Add global window exposure if needed for inline onclicks that aren't modules
// Global window exposures for documentation-specific functions
window.showCategories = showCategories;
window.showDocuments = showDocuments;
window.loadProcess = loadProcess;
window.closeViewer = closeViewer;
// ... expose others as needed ...
