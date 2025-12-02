document.addEventListener('DOMContentLoaded', () => {
    console.log('Profile script loaded');
    const username = localStorage.getItem('username');
    if (!username) {
        window.location.href = 'index.html';
        return;
    }

    // --- Elements ---
    const modal = document.getElementById('editProfileModal');
    const profileForm = document.getElementById('profileForm');

    // Security Elements
    const securityViewMode = document.getElementById('securityViewMode');
    const securityEditMode = document.getElementById('securityEditMode');
    const editSecurityBtn = document.getElementById('editSecurityBtn');
    const cancelSecurityBtn = document.getElementById('cancelSecurityBtn');
    const saveSecurityBtn = document.getElementById('saveSecurityBtn');

    // --- Profile Data Loading ---
    function loadProfile() {
        fetch(`/api/profile?username=${username}`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    const user = data.user;

                    // Role-based UI
                    // Role-based UI handled by navbar.js

                    // Update View
                    setText('viewLastname', user.lastname);
                    setText('viewFirstname', user.firstname);
                    setText('viewEmail', user.email);
                    setText('viewPhone', user.phone);
                    setText('viewAddress', user.address);

                    if (user.birthdate) {
                        const date = new Date(user.birthdate);
                        setText('viewBirthdate', date.toLocaleDateString('fr-FR'));
                        setValue('birthdate', date.toISOString().split('T')[0]);
                    } else {
                        setText('viewBirthdate', 'Non renseigné');
                        setValue('birthdate', '');
                    }

                    const genderMap = { 'M': 'Homme', 'F': 'Femme', 'Other': 'Autre' };
                    setText('viewGender', genderMap[user.gender] || 'Non renseigné');

                    // Pre-fill form inputs
                    setValue('lastname', user.lastname);
                    setValue('firstname', user.firstname);
                    setValue('email', user.email);
                    setValue('phone', user.phone);
                    setValue('address', user.address);
                    setValue('gender', user.gender);

                    // Security View
                    setText('viewUsername', user.username);

                    // Profile Picture
                    const profilePic = document.getElementById('viewProfilePic');
                    if (profilePic) {
                        if (user.profile_picture) {
                            profilePic.src = `/uploads/${user.profile_picture}`;
                        } else {
                            profilePic.src = 'images/default-avatar.svg';
                        }
                    }
                }
            })
            .catch(err => console.error('Error loading profile:', err));
    }

    // Helper to safely set text
    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.innerText = text || 'Non renseigné';
    }

    // Helper to safely set value
    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    }

    // --- Modal Functions ---
    window.openEditModal = function () {
        modal.classList.add('active');
    }

    window.closeEditModal = function () {
        modal.classList.remove('active');
    }

    window.onclick = function (event) {
        if (event.target == modal) {
            closeEditModal();
        }
    }

    // --- Image Cropping Logic ---
    let cropper;
    let croppedBlob = null;
    const imageToCrop = document.getElementById('imageToCrop');
    const cropModal = document.getElementById('cropModal');
    const fileInput = document.getElementById('profile_picture');
    const zoomSlider = document.getElementById('zoomSlider');
    const resetCropBtn = document.getElementById('resetCropBtn');
    let initialZoomRatio = 0; // To store the initial zoom level

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    imageToCrop.src = e.target.result;
                    cropModal.classList.add('active');

                    // Initialize Cropper
                    if (cropper) cropper.destroy();
                    cropper = new Cropper(imageToCrop, {
                        aspectRatio: 1,
                        viewMode: 1,
                        dragMode: 'move',
                        autoCropArea: 1,
                        restore: false,
                        guides: false,
                        center: false,
                        highlight: false,
                        cropBoxMovable: false,
                        cropBoxResizable: false,
                        toggleDragModeOnDblclick: false,
                        minContainerWidth: 400,
                        minContainerHeight: 300,
                        ready: function () {
                            // Reset slider
                            zoomSlider.value = 0;
                            // Store initial zoom ratio (ratio of current width to natural width)
                            const imageData = cropper.getImageData();
                            initialZoomRatio = imageData.width / imageData.naturalWidth;
                        }
                    });
                };
                reader.readAsDataURL(file);
                // Clear input so same file can be selected again if cancelled
                fileInput.value = '';
            }
        });
    }

    // Zoom Slider Logic
    if (zoomSlider) {
        zoomSlider.addEventListener('input', function () {
            if (cropper) {
                const sliderValue = parseInt(this.value);
                // Map slider 0-100 to zoom ratio.
                // 0 on slider means initial zoom (fit).
                // 100 on slider means initial zoom * 3.
                // We need to ensure initialZoomRatio is set.
                if (initialZoomRatio === 0) { // Fallback if ready wasn't called or initialZoomRatio not set
                    const imageData = cropper.getImageData();
                    initialZoomRatio = imageData.width / imageData.naturalWidth;
                }

                // Calculate target ratio: linear interpolation from initialZoomRatio to initialZoomRatio * 3
                const minZoom = initialZoomRatio;
                const maxZoom = initialZoomRatio * 3; // Or a fixed max like 5
                const targetRatio = minZoom + (sliderValue / 100) * (maxZoom - minZoom);

                cropper.zoomTo(targetRatio);
            }
        });
    }

    // Reset Button
    if (resetCropBtn) {
        resetCropBtn.addEventListener('click', () => {
            if (cropper) {
                cropper.reset();
                zoomSlider.value = 0;
                // Recalculate initialZoomRatio after reset
                const imageData = cropper.getImageData();
                initialZoomRatio = imageData.width / imageData.naturalWidth;
            }
        });
    }

    document.getElementById('cropBtn').addEventListener('click', () => {
        if (cropper) {
            cropper.getCroppedCanvas({
                width: 300,
                height: 300
            }).toBlob((blob) => {
                croppedBlob = blob;

                // Update Label UI
                const label = document.getElementById('profilePicLabel');
                if (label) {
                    label.classList.add('file-selected');
                    label.querySelector('.material-icons').textContent = 'check_circle';
                    label.querySelector('.material-icons').style.color = '#00e676';
                    label.querySelector('span:last-child').textContent = 'Photo prête à être envoyée';
                }

                closeModal('cropModal');
            });
        }
    });

    // --- Profile Form Submit ---
    if (profileForm) {
        profileForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const formData = new FormData();
            formData.append('username', username);
            formData.append('lastname', document.getElementById('lastname').value);
            formData.append('firstname', document.getElementById('firstname').value);
            formData.append('email', document.getElementById('email').value);
            formData.append('phone', document.getElementById('phone').value);
            formData.append('address', document.getElementById('address').value);
            formData.append('birthdate', document.getElementById('birthdate').value || '');
            formData.append('gender', document.getElementById('gender').value || '');

            if (croppedBlob) {
                formData.append('profile_picture', croppedBlob, 'profile.png');
            } else if (fileInput.files.length > 0) {
                // Fallback if crop failed or bypassed (though we clear value)
                formData.append('profile_picture', fileInput.files[0]);
            }

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn ? btn.innerText : 'Enregistrer';
            if (btn) btn.innerText = 'Enregistrement...';

            fetch('/api/profile', {
                method: 'PUT',
                body: formData
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        closeEditModal();
                        loadProfile();
                        // Reset crop state
                        croppedBlob = null;
                        const label = document.getElementById('profilePicLabel');
                        if (label) {
                            label.classList.remove('file-selected');
                            label.querySelector('.material-icons').textContent = 'add_a_photo';
                            label.querySelector('.material-icons').style.color = '';
                            label.querySelector('span:last-child').textContent = 'Choisir une nouvelle photo';
                        }
                    } else {
                        alert('Erreur : ' + data.message);
                    }
                })
                .catch(err => alert('Erreur technique'))
                .finally(() => {
                    if (btn) btn.innerText = originalText;
                });
        });
    }

    // --- Security Section Logic ---
    if (securityEditMode && editSecurityBtn && cancelSecurityBtn && saveSecurityBtn) {

        // Password Complexity Logic
        const newPasswordInput = document.getElementById('newPassword');
        const reqLength = document.getElementById('req-length');
        const reqUpper = document.getElementById('req-upper');
        const reqNumber = document.getElementById('req-number');
        const reqSpecial = document.getElementById('req-special');

        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => {
                const val = newPasswordInput.value;

                // Check Length
                if (val.length >= 8) reqLength.classList.add('valid');
                else reqLength.classList.remove('valid');

                // Check Upper
                if (/[A-Z]/.test(val)) reqUpper.classList.add('valid');
                else reqUpper.classList.remove('valid');

                // Check Number
                if (/[0-9]/.test(val)) reqNumber.classList.add('valid');
                else reqNumber.classList.remove('valid');

                // Check Special
                if (/[^A-Za-z0-9]/.test(val)) reqSpecial.classList.add('valid');
                else reqSpecial.classList.remove('valid');
            });
        }

        editSecurityBtn.addEventListener('click', () => {
            securityViewMode.style.display = 'none';
            securityEditMode.style.display = 'grid';
            editSecurityBtn.style.display = 'none';

            // Reset fields
            const currentUsername = document.getElementById('viewUsername').textContent;
            document.getElementById('editUsername').value = currentUsername;
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';

            // Reset Error & Validation UI
            document.getElementById('currentPasswordError').style.display = 'none';
            document.querySelectorAll('.req-item').forEach(el => el.classList.remove('valid'));
        });

        cancelSecurityBtn.addEventListener('click', () => {
            securityEditMode.style.display = 'none';
            securityViewMode.style.display = 'grid';
            editSecurityBtn.style.display = 'block';
        });

        // Use the form submit event
        securityEditMode.addEventListener('submit', (e) => {
            e.preventDefault();
            console.log('Security form submitted');

            const currentUsername = username;
            const newUsername = document.getElementById('editUsername').value;
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;
            const errorDiv = document.getElementById('currentPasswordError');

            // Reset Error
            errorDiv.style.display = 'none';
            errorDiv.innerText = '';

            if (!currentPassword) {
                errorDiv.innerText = 'Le mot de passe actuel est obligatoire.';
                errorDiv.style.display = 'block';
                return;
            }

            if (newPassword) {
                if (newPassword !== confirmNewPassword) {
                    alert('Les nouveaux mots de passe ne correspondent pas.');
                    return;
                }

                // Enforce Complexity on Submit
                const isLengthValid = newPassword.length >= 8;
                const isUpperValid = /[A-Z]/.test(newPassword);
                const isNumberValid = /[0-9]/.test(newPassword);
                const isSpecialValid = /[^A-Za-z0-9]/.test(newPassword);

                if (!isLengthValid || !isUpperValid || !isNumberValid || !isSpecialValid) {
                    alert('Le nouveau mot de passe ne respecte pas les critères de sécurité.');
                    return;
                }
            }

            const btn = saveSecurityBtn;
            const originalText = btn.innerText;
            btn.innerText = 'Enregistrement...';
            btn.disabled = true;

            fetch('/api/account', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentUsername,
                    currentPassword,
                    newUsername: newUsername !== currentUsername ? newUsername : null,
                    newPassword: newPassword || null
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        // Show Custom Popup
                        showSuccessPopup();

                        // Update UI without redirect
                        if (data.newUsername && data.newUsername !== currentUsername) {
                            if (document.getElementById('viewUsername')) {
                                document.getElementById('viewUsername').textContent = data.newUsername;
                            }
                            // Update local storage if username changed
                            localStorage.setItem('username', data.newUsername);
                        }

                        cancelSecurityBtn.click();
                    } else {
                        // Handle specific errors
                        if (data.message === 'Mot de passe actuel incorrect') {
                            errorDiv.innerText = 'Mot de passe incorrect.';
                            errorDiv.style.display = 'block';
                        } else {
                            alert('Erreur: ' + data.message);
                        }
                    }
                })
                .catch(err => {
                    console.error(err);
                    alert('Erreur technique: ' + err.message);
                })
                .finally(() => {
                    btn.innerText = originalText;
                    btn.disabled = false;
                });
        });
    }

    // Helper: Show Success Popup
    function showSuccessPopup() {
        const popup = document.getElementById('successPopup');
        if (popup) {
            popup.classList.add('active');
            setTimeout(() => {
                popup.classList.remove('active');
            }, 3000);
        }
    }

    // Initial Load
    loadProfile();
});

function logout() {
    showConfirmModal('Voulez-vous vraiment vous déconnecter ?', () => {
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        window.location.href = 'index.html';
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

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}
