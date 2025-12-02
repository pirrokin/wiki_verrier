// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let quill; // Global Quill instance
let currentProcessId = null; // Track current process for editing

// Retrieve username from localStorage
const username = localStorage.getItem('username');
if (!username) window.location.href = 'index.html';

// Check Admin Role
fetch('/api/profile?username=' + username)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // Role check handled by navbar.js
        }
        loadCategories();
    })
    .catch(err => {
        console.error('Profile fetch error', err);
        loadCategories();
    });

// --- Data Loading ---
function loadCategories() {
    fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                renderSidebar(data.categories);
            }
        });
}

function renderSidebar(categories) {
    const container = document.getElementById('categoryList');
    container.innerHTML = '';
    const isAdmin = true; // Simplified for now

    categories.forEach(cat => {
        const catDiv = document.createElement('div');
        catDiv.className = 'category-item';

        // Header
        const header = document.createElement('div');
        header.className = 'category-header';

        let adminControls = '';
        if (isAdmin) {
            adminControls = `
                <div style="display: flex; align-items: center;">
                    <button class="btn-icon delete-btn" onclick="event.stopPropagation(); deleteCategory(${cat.id})" title="Supprimer la catégorie">
                        <span class="material-icons" style="font-size: 16px;">delete</span>
                    </button>
                    <button class="btn-icon" onclick="event.stopPropagation(); openProcessModal(${cat.id})" title="Ajouter un processus">
                        <span class="material-icons" style="font-size: 16px;">add</span>
                    </button>
                </div>
            `;
        }

        header.innerHTML = `
            <div style="display: flex; align-items: center;">
                <span class="material-icons arrow-icon" id="arrow-${cat.id}" style="font-size: 18px; margin-right: 8px; transition: transform 0.3s;">chevron_right</span>
                <span class="material-icons" style="font-size: 18px; margin-right: 8px;">folder</span>
                ${cat.name}
            </div>
            ${adminControls}
        `;
        header.onclick = () => toggleCategory(cat.id);

        // Process List
        const pList = document.createElement('div');
        pList.className = 'process-list';
        pList.id = `cat-${cat.id}`;

        cat.processes.forEach(proc => {
            const pItem = document.createElement('div');
            pItem.className = 'process-item';

            let procAdminControls = '';
            if (isAdmin) {
                procAdminControls = `
                    <button class="btn-icon delete-btn" onclick="event.stopPropagation(); deleteProcess(${proc.id})" title="Supprimer le processus" style="margin-left: auto; opacity: 0.5;">
                        <span class="material-icons" style="font-size: 14px;">delete</span>
                    </button>
                `;
            }

            let icon = 'description';
            if (proc.content) icon = 'article';

            pItem.innerHTML = `
                <div style="display: flex; align-items: center; width: 100%;">
                    <span class="material-icons" style="font-size: 14px; margin-right: 8px;">${icon}</span> 
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${proc.title}</span>
                    ${procAdminControls}
                </div>
            `;
            pItem.onclick = (e) => {
                e.stopPropagation();
                loadProcess(proc);
                document.querySelectorAll('.process-item').forEach(el => el.classList.remove('active'));
                pItem.classList.add('active');
            };
            pList.appendChild(pItem);
        });

        catDiv.appendChild(header);
        catDiv.appendChild(pList);
        container.appendChild(catDiv);
    });
}

function toggleCategory(id) {
    const list = document.getElementById(`cat-${id}`);
    const arrow = document.getElementById(`arrow-${id}`);
    if (list.classList.contains('active')) {
        list.classList.remove('active');
        arrow.style.transform = 'rotate(0deg)';
    } else {
        list.classList.add('active');
        arrow.style.transform = 'rotate(90deg)';
    }
}

// --- Process Viewing & Editing ---
function loadProcess(process, searchQuery = null) {
    currentProcessId = process.id;
    const container = document.getElementById('processViewer');

    // Header with Edit Button
    let headerControls = '';
    if (process.content !== undefined && process.content !== null) {
        headerControls = `
            <button id="editBtn" class="btn-secondary" onclick="enableEditMode()" style="display: flex; align-items: center; gap: 5px;">
                <span class="material-icons" style="font-size: 16px;">edit</span> Modifier
            </button>
            <button id="saveBtn" class="btn-primary" onclick="saveContent()" style="display: none; align-items: center; gap: 5px;">
                <span class="material-icons" style="font-size: 16px;">save</span> Enregistrer
            </button>
        `;
    }

    let authorInfo = '';
    if (process.author_name) {
        const picUrl = process.author_picture ? `/uploads/${process.author_picture}` : 'images/default-avatar.svg';
        authorInfo = `
            <div style="display: flex; align-items: center; gap: 8px; margin-right: 15px; padding-right: 15px; border-right: 1px solid #444;">
                <img src="${picUrl}" alt="${process.author_name}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
                <span style="font-size: 12px; color: #aaa;">${process.author_name}</span>
                <span style="font-size: 10px; color: #666; margin-left: 5px;">${process.created_at ? new Date(process.created_at).toLocaleDateString() : ''}</span>
            </div>
        `;
    }

    let contentHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <h2 style="margin: 0;">${process.title}</h2>
                ${authorInfo}
            </div>
            <div style="display: flex; gap: 10px;">
                ${headerControls}
                ${process.file_path ? `<a href="/uploads/${process.file_path}" download class="btn-view" title="Télécharger"><span class="material-icons">download</span></a>` : ''}
            </div>
        </div>
    `;

    if (process.content) {
        // Render HTML Content
        let displayContent = process.content;

        // Highlight search query if present
        if (searchQuery) {
            const regex = new RegExp(`(${searchQuery})`, 'gi');
            displayContent = displayContent.replace(regex, '<span class="search-highlight" style="background-color: yellow; color: black; font-weight: bold;">$1</span>');
        }

        contentHTML += `
        <div id="content-display" class="ql-snow">
            <div class="ql-editor" style="padding: 0; border: none;">
                ${displayContent}
            </div>
        </div>
        <div id="editor-wrapper" style="display: none; border-radius: 4px;">
            <div id="editor-container" style="height: 500px;"></div>
        </div>`;
    } else if (process.file_path) {
        // Render PDF
        contentHTML += `
        <div id="pdf-render-container" style="display: flex; flex-direction: column; align-items: center; gap: 20px; width: 100%;">
            <div id="pdf-loading" style="color: var(--text-secondary); margin-top: 20px;">Chargement du document...</div>
        </div>`;
        setTimeout(() => renderPDF(`/uploads/${process.file_path}`), 0);
    } else {
        // Empty State (New Article)
        contentHTML += `
        <div id="content-display" class="ql-snow" style="display: none;">
            <div class="ql-editor" style="padding: 0; border: none;"></div>
        </div>
        <div id="editor-wrapper" style="border-radius: 4px;">
            <div id="editor-container" style="height: 500px;"></div>
        </div>`;
        setTimeout(() => enableEditMode(true), 100);
    }

    container.innerHTML = contentHTML;

    // Load History
    loadHistory(process.id);

    // Auto-scroll to first highlight
    if (searchQuery && process.content) {
        setTimeout(() => {
            const firstHighlight = container.querySelector('.search-highlight');
            if (firstHighlight) {
                firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
}

function loadHistory(processId) {
    const container = document.getElementById('processViewer');

    // Create history container if it doesn't exist
    let historyContainer = document.getElementById('history-container');
    if (!historyContainer) {
        historyContainer = document.createElement('div');
        historyContainer.id = 'history-container';
        historyContainer.style.marginTop = '40px';
        historyContainer.style.paddingTop = '20px';
        historyContainer.style.borderTop = '1px solid #333';
        container.appendChild(historyContainer);
    }

    fetch(`/api/processes/${processId}/history`)
        .then(res => res.json())
        .then(data => {
            if (data.success && data.history.length > 0) {
                let historyHTML = '<h3 style="font-size: 16px; color: #888; margin-bottom: 15px;">Historique des modifications</h3>';
                historyHTML += '<div style="display: flex; flex-direction: column; gap: 10px;">';

                data.history.forEach(item => {
                    const picUrl = item.profile_picture ? `/uploads/${item.profile_picture}` : 'images/default-avatar.svg';
                    const date = new Date(item.modified_at).toLocaleString('fr-FR');

                    historyHTML += `
                        <div style="display: flex; align-items: center; gap: 10px; padding: 10px; background: #222; border-radius: 6px;">
                            <img src="${picUrl}" alt="${item.username}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover;">
                            <div style="display: flex; flex-direction: column;">
                                <span style="font-size: 13px; font-weight: 500;">${item.username}</span>
                                <span style="font-size: 11px; color: #888;">Modifié le ${date}</span>
                            </div>
                        </div>
                    `;
                });

                historyHTML += '</div>';
                historyContainer.innerHTML = historyHTML;
            } else {
                historyContainer.innerHTML = '';
            }
        });
}

function enableEditMode(isNew = false) {
    document.getElementById('editBtn').style.display = 'none';
    document.getElementById('saveBtn').style.display = 'flex';

    const displayDiv = document.getElementById('content-display');
    const editorWrapper = document.getElementById('editor-wrapper');

    if (displayDiv) displayDiv.style.display = 'none';
    editorWrapper.style.display = 'block';

    // Initialize Quill
    if (!quill) {
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
    } else {
        // Re-attach if container changed (Quill might need re-init if DOM was replaced)
        // Actually, since we replaced innerHTML, the old quill instance is detached.
        // We need to create a new one.
        document.querySelector('.ql-toolbar')?.remove(); // Remove old toolbar if exists
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
    }

    // Load content
    if (!isNew && displayDiv) {
        quill.clipboard.dangerouslyPasteHTML(displayDiv.querySelector('.ql-editor').innerHTML);
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
                // Update local view
                loadProcess({ id: currentProcessId, title: document.querySelector('h2').innerText, content: content });
                loadCategories(); // Refresh sidebar to show icon update if needed
            } else {
                alert('Erreur lors de la sauvegarde : ' + data.message);
            }
        });
}

// --- PDF Rendering ---
async function renderPDF(url) {
    const container = document.getElementById('pdf-render-container');
    const loading = document.getElementById('pdf-loading');
    try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        loading.style.display = 'none';
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const scale = 1.5;
            const viewport = page.getViewport({ scale: scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            canvas.style.width = '100%';
            canvas.style.maxWidth = '1000px';
            canvas.style.height = 'auto';
            canvas.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
            canvas.style.borderRadius = '4px';
            const renderContext = { canvasContext: context, viewport: viewport };
            container.appendChild(canvas);
            await page.render(renderContext).promise;
        }
    } catch (error) {
        console.error('Error rendering PDF:', error);
        loading.textContent = 'Erreur lors du chargement du document.';
        loading.style.color = 'var(--error-color)';
    }
}

// --- Modal & Creation ---
function openCategoryModal() {
    document.getElementById('categoryModal').classList.add('active');
}

function openProcessModal(catId) {
    document.getElementById('targetCategoryId').value = catId;
    document.getElementById('processModal').classList.add('active');
    // Reset UI
    document.getElementById('processTypePdf').checked = true;
    toggleProcessType();
    document.getElementById('wordFileInput').value = '';
    document.getElementById('newProcessFile').value = '';
    document.getElementById('newProcessTitle').value = '';

    // Update file labels
    updateFileLabel('newProcessFile', 'pdf-file-label');
    updateFileLabel(document.getElementById('newProcessFile'));
    updateFileLabel(document.getElementById('wordFileInput'));
}

function toggleProcessType() {
    const type = document.querySelector('input[name="processType"]:checked').value;
    document.getElementById('pdfUploadSection').style.display = type === 'pdf' ? 'block' : 'none';
    document.getElementById('wordImportSection').style.display = type === 'word' ? 'block' : 'none';
    // editorSection is for the title input, which is always needed? No, wait.
    // Looking at previous code, there might be a misunderstanding of what editorSection is.
    // Usually there is a title input separate from the content.
    // Let's check the HTML for 'editorSection' in a moment. 
    // Assuming editorSection contains the Quill editor which is needed for Text and Word (after import).
    // Actually, for 'text', we just need the title and the editor.
    // For 'word', we need the file input AND the editor (to show imported content).
    // For 'pdf', we just need the file input (and title).

    // Let's stick to the logic requested:
    // Article -> No upload button.
    // Word -> Word upload button.
    // PDF -> PDF upload button.
}

function updateFileLabel(input) {
    const label = input.nextElementSibling;
    const spanText = label.querySelector('span:last-child');
    const icon = label.querySelector('.material-icons');

    if (input.files && input.files[0]) {
        spanText.textContent = input.files[0].name;
        label.classList.add('file-selected');
        icon.textContent = 'check_circle';
        icon.style.color = '#00e676';
    } else {
        if (input.id === 'wordFileInput') {
            spanText.textContent = 'Choisir un fichier Word (.docx)';
            icon.textContent = 'description';
        } else {
            spanText.textContent = 'Choisir un fichier PDF';
            icon.textContent = 'cloud_upload';
        }
        label.classList.remove('file-selected');
        icon.style.color = '';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// --- Form Submission ---
document.getElementById('addCategoryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('newCategoryName').value;

    fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeModal('categoryModal');
                e.target.reset();
                loadCategories();
            } else {
                alert('Erreur: ' + data.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert('Erreur technique lors de la création de la catégorie.');
        });
});

document.getElementById('addProcessForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const catId = document.getElementById('targetCategoryId').value;
    const title = document.getElementById('newProcessTitle').value;
    const type = document.querySelector('input[name="processType"]:checked').value;

    const formData = new FormData();
    formData.append('category_id', catId);
    formData.append('title', title);
    formData.append('author_username', username);

    if (type === 'pdf') {
        const fileInput = document.getElementById('newProcessFile');
        if (fileInput.files.length > 0) {
            formData.append('document', fileInput.files[0]);
        }
        // Standard create
        submitProcess(formData);
    } else if (type === 'word') {
        // Convert then create
        const fileInput = document.getElementById('wordFileInput');
        if (fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const arrayBuffer = event.target.result;
                mammoth.convertToHtml({ arrayBuffer: arrayBuffer }, { ignoreEmptyParagraphs: false })
                    .then(result => {
                        formData.append('content', result.value);
                        submitProcess(formData);
                    })
                    .catch(err => alert('Erreur conversion Word: ' + err));
            };
            reader.readAsArrayBuffer(fileInput.files[0]);
        } else {
            alert('Veuillez sélectionner un fichier Word.');
        }
    } else {
        // Text Article - Create empty content
        formData.append('content', '');
        submitProcess(formData);
    }
});

function submitProcess(formData) {
    fetch('/api/processes', {
        method: 'POST',
        body: formData
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                closeModal('processModal');
                loadCategories();
                // If it was a text/word article, load it immediately
                // We need to know if it has content or file_path to decide view
                // But simpler: just fetch the new process details or construct object
                // The API returns ID. We can construct a basic object.
                // Actually, for text/word, we want to open it.
                const type = document.querySelector('input[name="processType"]:checked').value;
                if (type !== 'pdf') {
                    // Fetch the full process to get content (especially for Word import)
                    // Or just simulate it.
                    // Let's reload categories then find the new process? No, too slow.
                    // Let's just manually load it.
                    const newProc = {
                        id: data.id,
                        title: formData.get('title'),
                        content: formData.get('content') || ''
                    };
                    loadProcess(newProc);
                }
            } else {
                alert('Erreur: ' + data.message);
            }
        });
}

// --- Deletion ---
function deleteCategory(id) {
    showConfirmModal('Supprimer cette catégorie ?', () => {
        fetch(`/api/categories/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadCategories();
                    closeModal('confirmModal');
                }
            });
    });
}

function deleteProcess(id) {
    showConfirmModal('Supprimer ce processus ?', () => {
        fetch(`/api/processes/${id}`, { method: 'DELETE' })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    loadCategories();
                    document.getElementById('processViewer').innerHTML = '';
                    closeModal('confirmModal');
                }
            });
    });
}

function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmMessage').innerText = message;
    const confirmBtn = document.getElementById('confirmActionBtn');

    // Remove previous event listeners to avoid stacking
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

    newBtn.onclick = onConfirm;
    modal.classList.add('active');
}

// --- Search Functionality ---
const searchInput = document.getElementById('searchInput');
let searchTimeout;

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(searchTimeout);

    if (query.length === 0) {
        loadCategories();
        return;
    }

    searchTimeout = setTimeout(() => {
        fetch(`/api/search?q=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    renderSearchResults(data.results);
                }
            })
            .catch(err => console.error('Search error:', err));
    }, 300); // Debounce
});

function renderSearchResults(results) {
    const container = document.getElementById('categoryList');
    container.innerHTML = '';

    if (results.length === 0) {
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Aucun résultat trouvé.</div>';
        return;
    }

    const resultsHeader = document.createElement('div');
    resultsHeader.style.padding = '10px 15px';
    resultsHeader.style.color = 'var(--text-secondary)';
    resultsHeader.style.fontSize = '12px';
    resultsHeader.style.textTransform = 'uppercase';
    resultsHeader.innerText = 'Résultats de recherche';
    container.appendChild(resultsHeader);

    const query = document.getElementById('searchInput').value.trim();

    results.forEach(proc => {
        const pItem = document.createElement('div');
        pItem.className = 'process-item';

        let icon = 'description';
        if (!proc.file_path) icon = 'article';

        // Highlight query in title and snippet
        const highlight = (text) => {
            if (!text) return '';
            const regex = new RegExp(`(${query})`, 'gi');
            return text.replace(regex, '<span style="background-color: rgba(255, 255, 0, 0.2); color: #fff;">$1</span>');
        };

        const snippetHTML = proc.snippet ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-style: italic;">${highlight(proc.snippet)}</div>` : '';

        pItem.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%;">
                <div style="display: flex; align-items: center;">
                    <span class="material-icons" style="font-size: 14px; margin-right: 8px;">${icon}</span> 
                    <span style="font-weight: 500;">${highlight(proc.title)}</span>
                </div>
                <span style="font-size: 11px; color: var(--text-secondary); margin-left: 22px;">${proc.category_name}</span>
                ${snippetHTML}
            </div>
        `;
        pItem.onclick = () => {
            // We need to fetch the full process details to load it
            // loadProcess expects a process object. 
            // But loadProcess usually takes what's in the sidebar.
            // We can fetch the single process by ID.
            // Or we can just call loadProcess with what we have, but we miss 'content'.
            // Let's fetch the full process.
            fetch(`/api/processes/${proc.id}`) // We need this endpoint!
                .then(res => res.json())
                .then(data => {
                    if (data.success) loadProcess(data.process, query); // Pass query for highlighting
                });
        };
        container.appendChild(pItem);
    });
}

// Initial Load
loadCategories();
// Initial Load
loadCategories();
window.onclick = function (event) {
    if (event.target.classList.contains('modal')) event.target.classList.remove('active');
    if (event.target.classList.contains('lightbox')) document.getElementById('lightbox').classList.remove('active');
}

// Lightbox Logic
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.querySelector('.lightbox-close');

if (lightbox && lightboxImg && lightboxClose) {
    // Close on button click
    lightboxClose.onclick = () => {
        lightbox.classList.remove('active');
    };

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('active')) {
            lightbox.classList.remove('active');
        }
    });
}

// Delegate click event for dynamic images in content
document.getElementById('processViewer').addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG' && e.target.closest('.ql-editor')) {
        lightbox.classList.add('active');
        lightboxImg.src = e.target.src;
    }
});
