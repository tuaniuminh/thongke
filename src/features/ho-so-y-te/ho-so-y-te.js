import { 
    state, saveLocalState, showToast, performSync,
    APP_VERSION, formatDate, escapeHTML
} from '../../core/app.js';

let healthTrendChartInstance = null;

// --- Family Profiles Helpers ---
function getProfileName(profileId) {
    const defaultId = profileId || 'p-self';
    const profile = (state.familyProfiles || []).find(p => p.id === defaultId);
    return profile ? profile.name : 'Bản thân';
}

function updateProfileDropdowns() {
    const mainSelect = document.getElementById('healthProfileSelect');
    if (mainSelect) {
        const currentSel = state.selectedHealthProfileId || 'all';
        mainSelect.innerHTML = `
            <option value="all">Tất cả thành viên</option>
            ${(state.familyProfiles || []).map(p => `
                <option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>
            `).join('')}
        `;
        const exists = (state.familyProfiles || []).some(p => p.id === currentSel) || currentSel === 'all';
        mainSelect.value = exists ? currentSel : 'all';
        state.selectedHealthProfileId = mainSelect.value;
    }
}

function openHealthProfilesModal() {
    const modal = document.getElementById('healthProfilesModal');
    if (!modal) return;
    modal.style.display = 'flex';
    const input = document.getElementById('newProfileNameInput');
    if (input) input.value = '';
    state.familyProfilesEditMode = false;
    updateProfilesEditModeButtonUI();
    renderFamilyProfilesList();
}

function updateProfilesEditModeButtonUI() {
    const btn = document.getElementById('toggleProfilesEditModeBtn');
    if (!btn) return;
    const isEditMode = state.familyProfilesEditMode;
    if (isEditMode) {
        btn.innerHTML = `<i data-lucide="check" style="width: 12px; height: 12px;"></i><span>Hoàn tất</span>`;
        btn.classList.remove('health-btn-secondary');
        btn.classList.add('health-btn-primary');
    } else {
        btn.innerHTML = `<i data-lucide="edit-3" style="width: 12px; height: 12px;"></i><span>Sửa</span>`;
        btn.classList.remove('health-btn-primary');
        btn.classList.add('health-btn-secondary');
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderFamilyProfilesList() {
    const container = document.getElementById('healthProfilesListContainer');
    if (!container) return;

    const profiles = state.familyProfiles || [{ id: 'p-self', name: 'Bản thân' }];
    const isEditMode = state.familyProfilesEditMode;
    
    container.innerHTML = profiles.map(p => {
        const isDefault = p.id === 'p-self';
        return `
            <div class="health-profile-item" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--border-radius-sm); margin-bottom: 6px;">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-weight: 500; color: var(--text-primary);">${escapeHTML(p.name)} ${isDefault ? '<span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 4px;">(Mặc định)</span>' : ''}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">
                        ${p.birthYear ? `Năm sinh: ${p.birthYear}` : 'Chưa cập nhật năm sinh'}
                        ${p.height ? ` | ${p.height}cm` : ''}
                        ${p.weight ? ` | ${p.weight}kg` : ''}
                    </span>
                </div>
                <div style="display: flex; gap: 4px; align-items: center;">
                    <button type="button" class="profile-action-btn edit-details" onclick="openMemberDetailsModal('${p.id}')" title="Sửa thông tin sức khỏe" style="background: rgba(16, 185, 129, 0.12); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25); padding: 5px 8px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                        <i data-lucide="user-cog" style="width: 14px; height: 14px;"></i>
                    </button>
                    ${isEditMode ? `
                        <button type="button" class="profile-action-btn export" onclick="exportMemberBackup('${p.id}')" title="Xuất sao lưu hồ sơ (.json)">
                            <i data-lucide="download" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button type="button" class="profile-action-btn import" onclick="triggerImportMemberBackup('${p.id}')" title="Nhập sao lưu hồ sơ (.json)">
                            <i data-lucide="upload" style="width: 14px; height: 14px;"></i>
                        </button>
                        ${!isDefault ? `
                            <button type="button" class="profile-action-btn edit" onclick="editFamilyProfile('${p.id}')" title="Sửa tên">
                                <i data-lucide="edit-2" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button type="button" class="profile-action-btn delete" onclick="deleteFamilyProfile('${p.id}')" title="Xóa thành viên">
                                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                            </button>
                        ` : ''}
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function addFamilyProfile() {
    const input = document.getElementById('newProfileNameInput');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    const normalized = name.toLowerCase();
    const duplicate = (state.familyProfiles || []).some(p => p.name.toLowerCase() === normalized);
    if (duplicate) {
        showToast("Thành viên này đã tồn tại!", "warning");
        return;
    }

    const newId = 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const newProfile = {
        id: newId,
        name: name
    };

    if (!state.familyProfiles) {
        state.familyProfiles = [{ id: 'p-self', name: 'Bản thân' }];
    }
    state.familyProfiles.push(newProfile);
    state.familyProfilesUpdated = new Date().toISOString();

    await saveLocalState();
    input.value = '';
    
    renderFamilyProfilesList();
    renderHealthDashboard();
    showToast(`Đã thêm thành viên "${name}" thành công!`, "success");
    
    performSync(true);
}

async function editFamilyProfile(id) {
    if (id === 'p-self') return;

    const profile = (state.familyProfiles || []).find(p => p.id === id);
    if (!profile) return;

    const newName = prompt("Nhập tên mới cho thành viên:", profile.name);
    if (newName === null) return;
    
    const trimmed = newName.trim();
    if (!trimmed) {
        showToast("Tên thành viên không được để trống!", "warning");
        return;
    }

    const normalized = trimmed.toLowerCase();
    const duplicate = (state.familyProfiles || []).some(p => p.id !== id && p.name.toLowerCase() === normalized);
    if (duplicate) {
        showToast("Tên thành viên này đã tồn tại!", "warning");
        return;
    }

    const oldName = profile.name;
    profile.name = trimmed;
    state.familyProfilesUpdated = new Date().toISOString();

    await saveLocalState();
    
    renderFamilyProfilesList();
    renderHealthDashboard();
    showToast(`Đã đổi tên thành viên từ "${oldName}" thành "${trimmed}"!`, "success");
    
    performSync(true);
}

async function deleteFamilyProfile(id) {
    if (id === 'p-self') {
        showToast("Không thể xóa thành viên mặc định!", "warning");
        return;
    }

    const profile = (state.familyProfiles || []).find(p => p.id === id);
    if (!profile) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa thành viên "${profile.name}"? Tất cả hồ sơ y tế liên kết với thành viên này cũng sẽ bị xóa.`)) {
        return;
    }

    const nowIso = new Date().toISOString();
    let recordsDeletedCount = 0;
    (state.medicalRecords || []).forEach(r => {
        if ((r.profileId || 'p-self') === id) {
            r.deleted_at = nowIso;
            r.updated_at = nowIso;
            recordsDeletedCount++;
        }
    });

    if (recordsDeletedCount > 0) {
        state.medicalRecordsUpdated = nowIso;
    }

    state.familyProfiles = (state.familyProfiles || []).filter(p => p.id !== id);
    state.familyProfilesUpdated = nowIso;

    if (state.selectedHealthProfileId === id) {
        state.selectedHealthProfileId = 'all';
    }

    await saveLocalState();
    
    renderFamilyProfilesList();
    renderHealthDashboard();
    showToast(`Đã xóa thành viên "${profile.name}" và ${recordsDeletedCount} hồ sơ liên quan.`, "success");
    
    performSync(true);
}

async function exportMemberBackup(profileId) {
    const profile = (state.familyProfiles || []).find(p => p.id === profileId);
    if (!profile) {
        showToast("Không tìm thấy thành viên!", "error");
        return;
    }

    const name = profile.name;
    const records = (state.medicalRecords || []).filter(r => r.profileId === profileId);

    // Ask user if they want to encrypt the backup file
    const password = prompt(`Bạn có muốn đặt mật khẩu bảo mật cho tệp sao lưu của "${name}" không?\n(Để trống nếu muốn xuất tệp dạng văn bản thường không mã hóa)`);
    if (password === null) return; // User cancelled

    const payloadObj = {
        profile: {
            name: profile.name,
            lastAiAnalysis: profile.lastAiAnalysis || '',
            lastAiAnalysisDate: profile.lastAiAnalysisDate || '',
            lastAiAnalysisUpdated: profile.lastAiAnalysisUpdated || '',
            lastBpAnalysis: profile.lastBpAnalysis || '',
            lastBpAnalysisDate: profile.lastBpAnalysisDate || '',
            lastBpAnalysisUpdated: profile.lastBpAnalysisUpdated || ''
        },
        medicalRecords: records.map(r => ({
            title: r.title || 'Hồ sơ sức khỏe',
            type: r.type || 'general',
            date: r.date || '',
            facility: r.facility || '',
            notes: r.notes || '',
            indicators: r.indicators || {},
            created_at: r.created_at || new Date().toISOString(),
            updated_at: r.updated_at || new Date().toISOString()
        }))
    };

    try {
        let finalPayload;
        let isEncrypted = false;

        if (password.trim().length > 0) {
            finalPayload = await encrypt(payloadObj ? JSON.stringify(payloadObj) : '', password);
            isEncrypted = true;
        } else {
            finalPayload = payloadObj;
        }

        const backupData = {
            app_id: "hieu_hy_member_health_backup",
            profile_name: name,
            is_encrypted: isEncrypted,
            exported_at: new Date().toISOString(),
            payload: finalPayload
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
        const filename = `sao_luu_suc_khoe_${name.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;

        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", filename);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        showToast(`Đã xuất file sao lưu hồ sơ cho "${name}" thành công!`, "success");
    } catch (e) {
        console.error(e);
        showToast("Lỗi khi xuất sao lưu hồ sơ!", "error");
    }
}

window.currentImportProfileId = null;

function triggerImportMemberBackup(profileId) {
    window.currentImportProfileId = profileId;
    const fileInput = document.getElementById('memberBackupFileInput');
    if (fileInput) {
        fileInput.value = ''; // Reset
        fileInput.click();
    }
}

async function handleMemberBackupImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const targetProfileId = window.currentImportProfileId;
    if (!targetProfileId) {
        showToast("Không xác định được hồ sơ thành viên đích!", "error");
        return;
    }

    const profile = (state.familyProfiles || []).find(p => p.id === targetProfileId);
    if (!profile) {
        showToast("Hồ sơ thành viên đích không tồn tại!", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.app_id !== "hieu_hy_member_health_backup") {
                showToast("Định dạng tệp tin sao lưu thành viên không đúng!", "error");
                return;
            }

            let decryptedPayload;
            if (data.is_encrypted) {
                const password = prompt("Tệp sao lưu này đã được mã hóa. Vui lòng nhập mật khẩu giải mã:");
                if (password === null) return;
                try {
                    const decryptedStr = await decrypt(data.payload, password);
                    decryptedPayload = JSON.parse(decryptedStr);
                } catch (err) {
                    showToast("Mật khẩu giải mã không chính xác hoặc dữ liệu bị hỏng!", "error");
                    return;
                }
            } else {
                decryptedPayload = data.payload;
            }

            if (!decryptedPayload || !decryptedPayload.profile || !Array.isArray(decryptedPayload.medicalRecords)) {
                showToast("Dữ liệu sao lưu không đúng cấu trúc!", "error");
                return;
            }

            const importedRecords = decryptedPayload.medicalRecords;
            const confirmMsg = `Bạn có chắc chắn muốn nhập ${importedRecords.length} kết quả xét nghiệm vào hồ sơ của "${profile.name}"?\n(Dữ liệu sức khỏe cũ của thành viên này vẫn được giữ nguyên)`;
            if (!confirm(confirmMsg)) return;

            // Import medical records
            if (!state.medicalRecords) {
                state.medicalRecords = [];
            }

            const nowIso = new Date().toISOString();
            importedRecords.forEach((r, idx) => {
                const newRecord = {
                    id: 'med-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9) + '-' + idx,
                    title: r.title || 'Hồ sơ nhập khẩu',
                    type: r.type || 'general',
                    profileId: targetProfileId,
                    date: r.date || nowIso.slice(0, 10),
                    facility: r.facility || '',
                    notes: r.notes || '',
                    indicators: r.indicators || {},
                    created_at: r.created_at || nowIso,
                    updated_at: nowIso
                };
                state.medicalRecords.push(newRecord);
            });

            state.medicalRecordsUpdated = nowIso;

            // Optionally import AI analysis report
            const importedProfile = decryptedPayload.profile;
            if (importedProfile.lastAiAnalysis) {
                const overwriteAi = confirm(`Tệp sao lưu có chứa báo cáo phân tích sức khỏe bằng AI của "${importedProfile.name}". Bạn có muốn nhập báo cáo này vào hồ sơ của "${profile.name}" không?`);
                if (overwriteAi) {
                    profile.lastAiAnalysis = importedProfile.lastAiAnalysis;
                    profile.lastAiAnalysisDate = importedProfile.lastAiAnalysisDate || nowIso;
                    profile.lastAiAnalysisUpdated = nowIso;
                    state.familyProfilesUpdated = nowIso;
                }
            }
            if (importedProfile.lastBpAnalysis) {
                const overwriteBp = confirm(`Tệp sao lưu có chứa báo cáo phân tích huyết áp bằng AI của "${importedProfile.name}". Bạn có muốn nhập báo cáo này vào hồ sơ của "${profile.name}" không?`);
                if (overwriteBp) {
                    profile.lastBpAnalysis = importedProfile.lastBpAnalysis;
                    profile.lastBpAnalysisDate = importedProfile.lastBpAnalysisDate || nowIso;
                    profile.lastBpAnalysisUpdated = nowIso;
                    state.familyProfilesUpdated = nowIso;
                }
            }

            await saveLocalState();
            renderFamilyProfilesList();
            renderHealthDashboard();
            showToast(`Nhập dữ liệu thành công cho thành viên "${profile.name}"!`, "success");

            performSync(true);
        } catch (err) {
            console.error(err);
            showToast("Lỗi phân tích hoặc nhập tệp sao lưu!", "error");
        }
    };
    reader.readAsText(file);
}

function openMemberDetailsModal(profileId) {
    const profile = (state.familyProfiles || []).find(p => p.id === profileId);
    if (!profile) {
        showToast("Không tìm thấy thành viên!", "error");
        return;
    }

    const modal = document.getElementById('healthMemberDetailsModal');
    if (!modal) return;

    modal.style.display = 'flex';

    // Populate inputs
    document.getElementById('editMemberIdInput').value = profile.id;
    
    const nameInput = document.getElementById('editMemberNameInput');
    nameInput.value = profile.name || '';
    if (profile.id === 'p-self') {
        nameInput.readOnly = true;
        nameInput.style.opacity = '0.7';
    } else {
        nameInput.readOnly = false;
        nameInput.style.opacity = '1';
    }

    document.getElementById('editMemberBirthYearInput').value = profile.birthYear || '';
    document.getElementById('editMemberHeightInput').value = profile.height || '';
    document.getElementById('editMemberWeightInput').value = profile.weight || '';
    document.getElementById('editMemberMedicationsInput').value = profile.currentMedications || '';
    document.getElementById('editMemberHistoryInput').value = profile.medicalHistory || '';
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

async function handleMemberDetailsFormSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('editMemberIdInput').value;
    const profile = (state.familyProfiles || []).find(p => p.id === id);
    if (!profile) {
        showToast("Không tìm thấy thành viên để cập nhật!", "error");
        return;
    }

    const name = document.getElementById('editMemberNameInput').value.trim();
    if (!name) {
        showToast("Tên thành viên không được để trống!", "warning");
        return;
    }

    // If ID is not 'p-self' and name has changed, check for duplicates
    if (id !== 'p-self' && name.toLowerCase() !== profile.name.toLowerCase()) {
        const normalized = name.toLowerCase();
        const duplicate = (state.familyProfiles || []).some(p => p.id !== id && p.name.toLowerCase() === normalized);
        if (duplicate) {
            showToast("Tên thành viên này đã tồn tại!", "warning");
            return;
        }
        profile.name = name;
    }

    const birthYear = parseInt(document.getElementById('editMemberBirthYearInput').value) || null;
    const height = parseInt(document.getElementById('editMemberHeightInput').value) || null;
    const weight = parseInt(document.getElementById('editMemberWeightInput').value) || null;
    const currentMedications = document.getElementById('editMemberMedicationsInput').value.trim();
    const medicalHistory = document.getElementById('editMemberHistoryInput').value.trim();

    profile.birthYear = birthYear;
    profile.height = height;
    profile.weight = weight;
    profile.currentMedications = currentMedications;
    profile.medicalHistory = medicalHistory;

    state.familyProfilesUpdated = new Date().toISOString();

    await saveLocalState();

    document.getElementById('healthMemberDetailsModal').style.display = 'none';
    
    // Refresh UI lists
    renderFamilyProfilesList();
    renderHealthDashboard();
    showToast(`Đã cập nhật thông tin sức khỏe của "${profile.name}" thành công!`, "success");

    performSync(true);
}

window.openMemberDetailsModal = openMemberDetailsModal;
window.handleMemberDetailsFormSubmit = handleMemberDetailsFormSubmit;
window.editFamilyProfile = editFamilyProfile;
window.deleteFamilyProfile = deleteFamilyProfile;
window.exportMemberBackup = exportMemberBackup;
window.triggerImportMemberBackup = triggerImportMemberBackup;
window.handleMemberBackupImportFile = handleMemberBackupImportFile;
window.openHealthAiMemberSelectorModal = openHealthAiMemberSelectorModal;
window.selectMemberForAiAnalysis = selectMemberForAiAnalysis;

let activeMedicalRecordId = null;

function initHealthBindings() {
    // Member selector bindings
    document.getElementById('healthProfileSelect')?.addEventListener('change', (e) => {
        state.selectedHealthProfileId = e.target.value;
        renderHealthDashboard();
    });

    document.getElementById('manageProfilesBtn')?.addEventListener('click', () => {
        openHealthProfilesModal();
    });

    document.getElementById('closeHealthProfilesModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthProfilesModal').style.display = 'none';
    });

    document.getElementById('closeHealthProfilesModalBtn2')?.addEventListener('click', () => {
        document.getElementById('healthProfilesModal').style.display = 'none';
    });

    document.getElementById('addProfileForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        addFamilyProfile();
    });

    document.getElementById('toggleProfilesEditModeBtn')?.addEventListener('click', () => {
        state.familyProfilesEditMode = !state.familyProfilesEditMode;
        updateProfilesEditModeButtonUI();
        renderFamilyProfilesList();
    });

    // Edit Member Details Modal Bindings
    document.getElementById('closeHealthMemberDetailsModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthMemberDetailsModal').style.display = 'none';
    });

    document.getElementById('closeHealthMemberDetailsModalBtn2')?.addEventListener('click', () => {
        document.getElementById('healthMemberDetailsModal').style.display = 'none';
    });

    document.getElementById('healthMemberDetailsForm')?.addEventListener('submit', handleMemberDetailsFormSubmit);

    // Toggle Gemini API popover menu
    const popoverBtn = document.getElementById('geminiPopoverBtn');
    const popoverMenu = document.getElementById('geminiPopoverMenu');
    if (popoverBtn && popoverMenu) {
        popoverBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = popoverMenu.style.display === 'block';
            popoverMenu.style.display = isOpen ? 'none' : 'block';
        });
        
        popoverMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        
        document.addEventListener('click', () => {
            popoverMenu.style.display = 'none';
        });
    }

    // Save API key button
    document.getElementById('saveGeminiKeyBtn')?.addEventListener('click', async () => {
        const apiKey = document.getElementById('geminiApiKeyInput')?.value.trim() || '';
        state.geminiApiKey = apiKey;
        state.geminiApiKeyUpdated = new Date().toISOString();
        await saveLocalState();
        showToast("Đã lưu khóa API Gemini thành công!", "success");
        updateApiConfigCardState();
        if (popoverMenu) {
            popoverMenu.style.display = 'none';
        }
        performSync(true);
    });

    // Scanner dropzone & file input
    const dropzone = document.getElementById('healthScannerDropzone');
    const fileInput = document.getElementById('healthFileInput');
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());
        
        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await handleHealthFile(e.target.files[0]);
            }
        });
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                await handleHealthFile(e.dataTransfer.files[0]);
            }
        });
    }

    // Modal buttons
    document.getElementById('addNewRecordBtn')?.addEventListener('click', () => {
        openHealthEditModal();
    });

    document.getElementById('addIndicatorRowBtn')?.addEventListener('click', () => {
        addIndicatorEditRow();
    });

    document.getElementById('healthEditForm')?.addEventListener('submit', (e) => {
        saveMedicalRecord(e);
    });

    document.getElementById('editHealthRecordBtn')?.addEventListener('click', () => {
        document.getElementById('healthDetailModal').style.display = 'none';
        openHealthEditModal(activeMedicalRecordId);
    });

    document.getElementById('deleteHealthRecordBtn')?.addEventListener('click', () => {
        deleteMedicalRecord(activeMedicalRecordId);
    });

    document.getElementById('closeHealthDetailModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthDetailModal').style.display = 'none';
    });

    document.getElementById('closeHealthEditModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthEditModal').style.display = 'none';
    });

    document.getElementById('cancelHealthEditBtn')?.addEventListener('click', () => {
        document.getElementById('healthEditModal').style.display = 'none';
    });

    // AI Analysis Modal bindings
    document.getElementById('healthAiAnalysisBtn')?.addEventListener('click', () => {
        openHealthAiAnalysisModal('full');
    });

    document.getElementById('closeHealthAiAnalysisModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthAiAnalysisModal').style.display = 'none';
        stopAllSpeech();
        const voiceSelect = document.getElementById('healthSpeechVoiceSelect');
        if (voiceSelect) voiceSelect.style.display = 'none';
        const rateSelect = document.getElementById('healthSpeechRateSelect');
        if (rateSelect) rateSelect.style.display = 'none';
    });

    document.getElementById('closeHealthAiAnalysisModalBtn2')?.addEventListener('click', () => {
        document.getElementById('healthAiAnalysisModal').style.display = 'none';
        stopAllSpeech();
        const voiceSelect = document.getElementById('healthSpeechVoiceSelect');
        if (voiceSelect) voiceSelect.style.display = 'none';
        const rateSelect = document.getElementById('healthSpeechRateSelect');
        if (rateSelect) rateSelect.style.display = 'none';
    });

    document.getElementById('closeHealthAiMemberSelectorModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthAiMemberSelectorModal').style.display = 'none';
    });

    document.getElementById('closeHealthAiMemberSelectorModalBtn2')?.addEventListener('click', () => {
        document.getElementById('healthAiMemberSelectorModal').style.display = 'none';
    });

    document.getElementById('refreshHealthAiAnalysisBtn')?.addEventListener('click', () => {
        generateHealthAiAnalysisWithBP(true, state.currentAiAnalysisType === 'bp' ? 'bp_only' : 'full'); // Force re-analysis
    });

    const indicatorSelect = document.getElementById('healthChartIndicatorSelect');
    if (indicatorSelect) {
        indicatorSelect.addEventListener('change', (e) => {
            const activeRecords = getFilteredHealthRecords();
            drawTrendChart(e.target.value, activeRecords);
        });

        // Enable quick mouse wheel scroll selection
        indicatorSelect.addEventListener('wheel', (e) => {
            e.preventDefault();
            const direction = e.deltaY > 0 ? 1 : -1;
            const newIndex = indicatorSelect.selectedIndex + direction;
            if (newIndex >= 0 && newIndex < indicatorSelect.options.length) {
                indicatorSelect.selectedIndex = newIndex;
                indicatorSelect.dispatchEvent(new Event('change'));
            }
        }, { passive: false });
    }

    // Previous and Next buttons click handlers
    document.getElementById('prevIndicatorBtn')?.addEventListener('click', () => {
        const select = document.getElementById('healthChartIndicatorSelect');
        if (select && select.options.length > 0) {
            let newIndex = select.selectedIndex - 1;
            if (newIndex >= 0) { // Do not wrap around
                select.selectedIndex = newIndex;
                select.dispatchEvent(new Event('change'));
            }
        }
    });

    document.getElementById('nextIndicatorBtn')?.addEventListener('click', () => {
        const select = document.getElementById('healthChartIndicatorSelect');
        if (select && select.options.length > 0) {
            let newIndex = select.selectedIndex + 1;
            if (newIndex < select.options.length) { // Do not wrap around
                select.selectedIndex = newIndex;
                select.dispatchEvent(new Event('change'));
            }
        }
    });

    document.getElementById('memberBackupFileInput')?.addEventListener('change', handleMemberBackupImportFile);
}

function updateApiConfigCardState() {
    const dot = document.getElementById('geminiIndicatorDot');
    if (dot) {
        dot.style.backgroundColor = state.geminiApiKey ? '#10b981' : '#ef4444';
    }
}

// Expose health details and removal row functions globally
window.openHealthDetail = openHealthDetail;
window.addIndicatorEditRow = addIndicatorEditRow;
window.handleRemoveIndicatorRow = handleRemoveIndicatorRow;

function closeHealthIntro() {
    const banner = document.getElementById('healthIntroBanner');
    if (banner) {
        banner.style.display = 'none';
        localStorage.setItem('familife_health_intro_closed', 'true');
    }
}
window.closeHealthIntro = closeHealthIntro;

function renderHealthDashboard() {
    // Show/Hide Intro Banner based on localStorage
    const isIntroClosed = localStorage.getItem('familife_health_intro_closed');
    const introBanner = document.getElementById('healthIntroBanner');
    if (introBanner) {
        introBanner.style.display = (isIntroClosed === 'true') ? 'none' : 'block';
    }

    // Update API Key Card Collapsed state
    updateApiConfigCardState();

    // Auto populate Gemini Input if not done
    const geminiInput = document.getElementById('geminiApiKeyInput');
    if (geminiInput && !geminiInput.value && state.geminiApiKey) {
        geminiInput.value = state.geminiApiKey;
    }

    // Keep top select dropdown in sync with state profiles
    updateProfileDropdowns();

    const recordsGrid = document.getElementById('healthRecordsGrid');
    if (!recordsGrid) return;
    
    // Filter by selected family profile
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    let activeRecords = (state.medicalRecords || [])
        .filter(r => !r.deleted_at);
        
    if (selectedProfileId !== 'all') {
        activeRecords = activeRecords.filter(r => {
            const rProfileId = r.profileId || 'p-self';
            return rProfileId === selectedProfileId;
        });
    }
        
    activeRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
    if (activeRecords.length === 0) {
        recordsGrid.innerHTML = `
            <div class="health-empty-state">
                <i data-lucide="folder-heart"></i>
                <h5 style="margin-top: 10px; font-weight: 600;">Chưa có hồ sơ y tế nào</h5>
                <p style="margin-top: 6px; font-size: 0.85rem;">Cấu hình Gemini API Key rồi kéo thả ảnh kết quả xét nghiệm để quét tự động, hoặc nhấp vào "Thêm hồ sơ thủ công" để bắt đầu theo dõi sức khỏe.</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        
        // Hide chart card if empty
        const chartCard = document.getElementById('healthChartCard');
        if (chartCard) chartCard.style.display = 'none';
        return;
    }
    
    recordsGrid.innerHTML = activeRecords.map(r => {
        const typeLabel = getHealthTypeLabel(r.type);
        const dateStr = formatDate(r.date);
        
        // Extract preview indicators (max 3)
        const previewIndicators = (r.indicators || []).slice(0, 3);
        const previewHtml = previewIndicators.length > 0 
            ? `<div class="health-record-indicators-preview">
                ${previewIndicators.map(ind => {
                    const badgeClass = ind.assessment === 'high' ? 'badge-health-high' : (ind.assessment === 'low' ? 'badge-health-low' : 'badge-health-normal');
                    const badgeText = ind.assessment === 'high' ? 'Cao' : (ind.assessment === 'low' ? 'Thấp' : 'Bình thường');
                    return `
                        <div class="health-record-indicator-row">
                            <span class="indicator-preview-name">${escapeHTML(ind.name)}</span>
                            <span class="indicator-preview-val">
                                ${escapeHTML(ind.value)} <span style="font-size: 0.72rem; color: var(--text-muted); margin-left: 2px;">${escapeHTML(ind.unit)}</span>
                                <span class="${badgeClass}">${badgeText}</span>
                            </span>
                        </div>
                    `;
                }).join('')}
                ${r.indicators.length > 3 ? `<div style="text-align: center; font-size: 0.72rem; color: var(--text-muted); margin-top: 4px;">và ${r.indicators.length - 3} chỉ số khác...</div>` : ''}
               </div>`
            : '';
            
        return `
            <div class="health-record-card" onclick="openHealthDetail('${r.id}')">
                <div class="health-record-card-header">
                    <div class="health-record-title">${escapeHTML(r.title)}</div>
                    <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
                        ${selectedProfileId === 'all' ? `
                            <span class="badge-relationship" style="background: rgba(59, 130, 246, 0.12); color: #3b82f6; border: 1px solid rgba(59, 130, 246, 0.25);">
                                <i data-lucide="user" style="width: 10px; height: 10px; display: inline-block; vertical-align: middle; margin-right: 2px;"></i>
                                ${escapeHTML(getProfileName(r.profileId))}
                            </span>
                        ` : ''}
                        <span class="badge-relationship" style="background: rgba(15, 118, 110, 0.12); color: var(--health-accent); border: 1px solid rgba(15, 118, 110, 0.25);">${escapeHTML(typeLabel)}</span>
                    </div>
                </div>
                <div class="health-record-meta">
                    <span class="health-record-date">
                        <i data-lucide="calendar"></i> ${escapeHTML(dateStr)}
                    </span>
                    ${r.facility ? `
                    <span class="health-record-facility">
                        <i data-lucide="hospital"></i> ${escapeHTML(r.facility)}
                    </span>` : ''}
                </div>
                ${previewHtml}
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
    
    // Draw trend charts
    renderHealthTrendsChart();
    
    // Render blood pressure section
    renderBloodPressureSection();
}

function getHealthTypeLabel(type) {
    switch (type) {
        case 'blood_test': return 'Xét nghiệm máu';
        case 'urine_test': return 'Xét nghiệm nước tiểu';
        case 'ultrasound': return 'Siêu âm';
        case 'other':
        default: return 'Khác';
    }
}

function getFilteredHealthRecords() {
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    let activeRecords = (state.medicalRecords || [])
        .filter(r => !r.deleted_at);
        
    if (selectedProfileId !== 'all') {
        activeRecords = activeRecords.filter(r => {
            const rProfileId = r.profileId || 'p-self';
            return rProfileId === selectedProfileId;
        });
    }
    activeRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    return activeRecords;
}

function renderHealthTrendsChart() {
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    
    // If 'all' profiles are selected, do not show a combined trend chart as it is medically invalid
    if (selectedProfileId === 'all') {
        const chartCard = document.getElementById('healthChartCard');
        if (chartCard) chartCard.style.display = 'none';
        return;
    }
    
    const activeRecords = getFilteredHealthRecords();
        
    // Find all indicator keys/names and standard labels
    const indicatorMap = new Map();
    activeRecords.forEach(r => {
        (r.indicators || []).forEach(ind => {
            if (ind.name && ind.name.trim()) {
                const rawName = ind.name.trim();
                const dictKey = getDictionaryKey(rawName);
                if (dictKey === 'bloodgroup') return;
                
                if (dictKey && HEALTH_INDICATORS_DICTIONARY[dictKey]) {
                    indicatorMap.set(dictKey, HEALTH_INDICATORS_DICTIONARY[dictKey].name);
                } else {
                    const normRaw = rawName.toLowerCase();
                    if (normRaw.includes('nhóm máu') || normRaw.includes('nhom mau') || normRaw.includes('blood group') || normRaw.includes('bloodgroup')) {
                        return;
                    }
                    indicatorMap.set("raw:" + rawName, rawName);
                }
            }
        });
    });
    
    const chartCard = document.getElementById('healthChartCard');
    const selectEl = document.getElementById('healthChartIndicatorSelect');
    
    if (indicatorMap.size === 0 || !chartCard || !selectEl) {
        if (chartCard) chartCard.style.display = 'none';
        return;
    }
    
    chartCard.style.display = 'block';
    
    // Save current selected value
    const currentSelected = selectEl.value;
    
    // Populate select
    selectEl.innerHTML = Array.from(indicatorMap.entries()).map(([value, label]) => `
        <option value="${escapeHTML(value)}">${escapeHTML(label)}</option>
    `).join('');
    
    // Restore or default selection
    if (indicatorMap.has(currentSelected)) {
        selectEl.value = currentSelected;
    } else {
        selectEl.value = Array.from(indicatorMap.keys())[0];
    }
    
    drawTrendChart(selectEl.value, activeRecords);
}

function drawTrendChart(indicatorIdentifier, activeRecords) {
    let explanationName = indicatorIdentifier;
    let chartDisplayName = indicatorIdentifier;
    
    if (indicatorIdentifier.startsWith("raw:")) {
        explanationName = indicatorIdentifier.substring(4);
        chartDisplayName = indicatorIdentifier.substring(4);
    } else if (HEALTH_INDICATORS_DICTIONARY[indicatorIdentifier]) {
        explanationName = HEALTH_INDICATORS_DICTIONARY[indicatorIdentifier].name;
        chartDisplayName = HEALTH_INDICATORS_DICTIONARY[indicatorIdentifier].name;
    }

    // Update indicator definition explanation card
    updateIndicatorExplanation(explanationName);
    
    // Update indicators progress bar and buttons disabled state
    updateIndicatorProgress();

    const ctx = document.getElementById('healthTrendChart')?.getContext('2d');
    if (!ctx) return;
    
    if (healthTrendChartInstance) {
        healthTrendChartInstance.destroy();
    }
    
    const points = [];
    activeRecords.forEach(r => {
        const ind = (r.indicators || []).find(i => {
            if (!i.name) return false;
            const rawName = i.name.trim();
            const dictKey = getDictionaryKey(rawName);
            if (indicatorIdentifier.startsWith("raw:")) {
                const targetRawName = indicatorIdentifier.substring(4);
                return !dictKey && rawName.toLowerCase() === targetRawName.toLowerCase();
            } else {
                return dictKey === indicatorIdentifier;
            }
        });
        if (ind) {
            const cleanVal = ind.value.toString().replace(/[^0-9.,]/g, '').replace(',', '.');
            const numVal = parseFloat(cleanVal);
            if (!isNaN(numVal)) {
                points.push({
                    date: r.date,
                    label: formatDate(r.date),
                    value: numVal,
                    unit: ind.unit || '',
                    title: r.title,
                    assessment: ind.assessment || 'normal',
                    refRange: ind.refRange || ''
                });
            }
        }
    });
    
    if (points.length === 0) {
        return;
    }
    
    // Sort points chronologically
    points.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    const labels = points.map(p => p.label);
    const data = points.map(p => p.value);
    const unit = points[0]?.unit || '';
    
    const gridColor = state.theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    const textColor = state.theme === 'dark' ? '#94a3b8' : '#4b5563';
    
    // Color points based on assessment: red for high, blue for low, green for normal
    const pointColors = points.map(p => {
        if (p.assessment === 'high') return '#ef4444'; // Red
        if (p.assessment === 'low') return '#3b82f6';  // Blue
        return '#10b981'; // Green
    });

    // Parse reference range from the latest record that has one
    const latestWithRange = [...points].reverse().find(p => p.refRange);
    const refRange = latestWithRange?.refRange || '';
    
    let minVal = null;
    let maxVal = null;
    if (refRange) {
        const rangeMatch = refRange.match(/^\s*([0-9.,]+)\s*[-–—]\s*([0-9.,]+)\s*$/);
        if (rangeMatch) {
            minVal = parseFloat(rangeMatch[1].replace(',', '.'));
            maxVal = parseFloat(rangeMatch[2].replace(',', '.'));
        } else {
            const lessMatch = refRange.match(/^\s*<\s*([0-9.,]+)\s*$/);
            if (lessMatch) {
                maxVal = parseFloat(lessMatch[1].replace(',', '.'));
                minVal = 0;
            } else {
                const greaterMatch = refRange.match(/^\s*>\s*([0-9.,]+)\s*$/);
                if (greaterMatch) {
                    minVal = parseFloat(greaterMatch[1].replace(',', '.'));
                }
            }
        }
    }

    // Chart.js plugin to draw reference range shading
    const refRangePlugin = {
        id: 'refRangeBackground',
        beforeDraw: (chart) => {
            const { ctx, chartArea: { top, bottom, left, right }, scales: { y } } = chart;
            if (y && (minVal !== null || maxVal !== null)) {
                let startY = bottom;
                let endY = top;
                
                if (minVal !== null) {
                    if (minVal >= y.min && minVal <= y.max) {
                        startY = y.getPixelForValue(minVal);
                    } else if (minVal < y.min) {
                        startY = bottom;
                    } else if (minVal > y.max) {
                        startY = top;
                    }
                }
                
                if (maxVal !== null) {
                    if (maxVal >= y.min && maxVal <= y.max) {
                        endY = y.getPixelForValue(maxVal);
                    } else if (maxVal > y.max) {
                        endY = top;
                    } else if (maxVal < y.min) {
                        endY = bottom;
                    }
                }
                
                // Draw shaded background zone
                ctx.save();
                ctx.fillStyle = state.theme === 'dark' ? 'rgba(16, 185, 129, 0.04)' : 'rgba(16, 185, 129, 0.08)';
                ctx.fillRect(left, Math.min(startY, endY), right - left, Math.abs(startY - endY));
                
                // Draw boundaries (dotted lines)
                ctx.strokeStyle = state.theme === 'dark' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.35)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 4]);
                
                if (minVal !== null && minVal >= y.min && minVal <= y.max) {
                    ctx.beginPath();
                    ctx.moveTo(left, startY);
                    ctx.lineTo(right, startY);
                    ctx.stroke();
                }
                if (maxVal !== null && maxVal >= y.min && maxVal <= y.max) {
                    ctx.beginPath();
                    ctx.moveTo(left, endY);
                    ctx.lineTo(right, endY);
                    ctx.stroke();
                }
                
                // Draw boundary labels (text)
                ctx.fillStyle = state.theme === 'dark' ? 'rgba(16, 185, 129, 0.65)' : 'rgba(13, 148, 136, 0.85)';
                ctx.font = '10px "Be Vietnam Pro", sans-serif';
                ctx.textAlign = 'left';
                
                if (minVal !== null && minVal >= y.min && minVal <= y.max) {
                    ctx.fillText(`Ngưỡng dưới: ${minVal} ${unit}`, left + 8, startY - 4);
                }
                if (maxVal !== null && maxVal >= y.min && maxVal <= y.max) {
                    ctx.fillText(`Ngưỡng trên: ${maxVal} ${unit}`, left + 8, endY + 12);
                }
                ctx.restore();
            }
        }
    };
    
    healthTrendChartInstance = new Chart(ctx, {
        type: 'line',
        plugins: [refRangePlugin],
        data: {
            labels: labels,
            datasets: [{
                label: `${chartDisplayName} (${unit})`,
                data: data,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.06)',
                borderWidth: 2,
                pointBackgroundColor: pointColors,
                pointBorderColor: state.theme === 'dark' ? '#0f172a' : '#ffffff',
                pointBorderWidth: 1.5,
                pointRadius: points.map(p => p.assessment !== 'normal' ? 6 : 4.5),
                pointHoverBackgroundColor: pointColors,
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 2,
                pointHoverRadius: points.map(p => p.assessment !== 'normal' ? 8 : 6.5),
                tension: 0.15,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        font: {
                            family: 'Be Vietnam Pro',
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const idx = context[0].dataIndex;
                            return `${points[idx].title} (${points[idx].date})`;
                        },
                        label: function(context) {
                            const p = points[context.dataIndex];
                            const statusLabel = p.assessment === 'high' ? ' (Cao)' : (p.assessment === 'low' ? ' (Thấp)' : ' (Bình thường)');
                            return ` Trị số: ${context.parsed.y} ${unit}${statusLabel}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Be Vietnam Pro',
                            size: 10
                        }
                    }
                },
                y: {
                    grid: {
                        color: gridColor
                    },
                    ticks: {
                        color: textColor,
                        font: {
                            family: 'Be Vietnam Pro',
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
}

async function processScannedHealthImage(responseJson) {
    if (responseJson.isBloodPressure) {
        // Save blood pressure record
        const targetProfileId = state.selectedHealthProfileId !== 'all' ? state.selectedHealthProfileId : 'p-self';
        const now = new Date().toISOString();
        const dateStr = responseJson.date || now.split('T')[0];
        
        // Determine session: morning (5h - 12h) or evening (rest)
        const hour = new Date().getHours();
        const session = (hour >= 5 && hour < 12) ? 'morning' : 'evening';
        
        const record = {
            id: 'bp-' + Date.now(),
            profileId: targetProfileId,
            systolic: parseInt(responseJson.systolic),
            diastolic: parseInt(responseJson.diastolic),
            pulse: parseInt(responseJson.pulse) || null,
            session: session,
            date: dateStr,
            notes: responseJson.notes || 'Tự động nhận diện từ ảnh',
            updated_at: now
        };
        
        state.bloodPressureRecords = state.bloodPressureRecords || [];
        state.bloodPressureRecords.push(record);
        state.bloodPressureRecordsUpdated = now;
        
        await saveLocalState();
        renderBloodPressureSection();
        
        const cls = getBpClassification(record.systolic, record.diastolic);
        showToast(`Đã tự động nhận diện và lưu huyết áp: ${record.systolic}/${record.diastolic} mmHg (${cls.label})`, 'success');
        
        // Auto select the profile in UI and update the dashboard
        state.selectedHealthProfileId = targetProfileId;
        const mainSelect = document.getElementById('healthProfileSelect');
        if (mainSelect) {
            mainSelect.value = targetProfileId;
        }
        renderHealthDashboard();
        
        // Show the choice modal instead of auto analyzing
        const choiceModal = document.getElementById('healthBpAnalysisChoiceModal');
        if (choiceModal) {
            choiceModal.style.display = 'flex';
            lucide.createIcons();
        }
    } else {
        openHealthEditModal(null, responseJson);
    }
}

async function handleHealthFile(file) {
    if (!state.geminiApiKey) {
        showToast("Vui lòng cấu hình Gemini API Key trước khi quét!", "warning");
        const popoverMenu = document.getElementById('geminiPopoverMenu');
        if (popoverMenu) {
            popoverMenu.style.display = 'block';
        }
        return;
    }
    
    if (!file.type.startsWith('image/')) {
        showToast("Chỉ hỗ trợ quét file ảnh xét nghiệm (.png, .jpg, .jpeg)!", "error");
        return;
    }
    
    const overlay = document.getElementById('healthScannerLoadingOverlay');
    const statusText = document.getElementById('healthScannerStatusText');
    if (overlay) overlay.style.display = 'flex';
    if (statusText) statusText.innerText = 'Đang đọc file ảnh xét nghiệm...';
    
    try {
        const base64Data = await fileToBase64(file);
        if (statusText) statusText.innerText = 'Đang phân tích ảnh y tế bằng Gemini AI...';
        
        const responseJson = await callGeminiAPI(base64Data, file.type);
        
        if (overlay) overlay.style.display = 'none';
        
        // Process results (BP vs Lab tests)
        await processScannedHealthImage(responseJson);
    } catch (err) {
        console.error("Gemini scanning error:", err);
        if (overlay) overlay.style.display = 'none';
        showToast("Quét ảnh thất bại: " + err.message, "error");
    } finally {
        const fileInput = document.getElementById('healthFileInput');
        if (fileInput) fileInput.value = '';
    }
}

async function callGeminiAPI(base64Data, mimeType) {
    const apiKey = state.geminiApiKey;
    const models = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-1.5-flash"];
    let lastError = null;
    
    const promptText = `Hãy đóng vai trò là một chuyên gia phân tích hình ảnh y tế. Bạn được cung cấp một hình ảnh có thể là kết quả xét nghiệm y khoa (xét nghiệm máu, nước tiểu, siêu âm, v.v.) hoặc hình ảnh chụp màn hình hiển thị của máy đo huyết áp (ví dụ: máy Omron).

Nhiệm vụ của bạn là nhận diện loại hình ảnh này và trích xuất thông tin chính xác sang định dạng JSON.

HƯỚNG DẪN CHI TIẾT:
1. Xác định xem hình ảnh có phải là màn hình máy đo huyết áp hay không:
   - Nếu là máy đo huyết áp:
     + Trích xuất chỉ số Huyết áp tâm thu (SYS mmHg), Huyết áp tâm trương (DIA mmHg) và Nhịp tim (PULSE/min nếu có).
     + ĐẶC BIỆT CHÚ Ý (Rất quan trọng): Nếu trên màn hình máy đo huyết áp hiển thị hai cột kết quả song song (như máy Omron HEM-7361T hiển thị kết quả đo trước đó ở cột bên trái và kết quả mới nhất ở cột bên phải, thường cột phải có nhãn "LATEST" hoặc số lần đo mới nhất), bạn chỉ được phép trích xuất kết quả ở cột bên PHẢI (kết quả đo hiện tại/mới nhất). Tuyệt đối không lấy kết quả ở cột bên trái.
     + Trả về JSON có thuộc tính "isBloodPressure": true.
   - Nếu là kết quả xét nghiệm y khoa (xét nghiệm máu, siêu âm, nước tiểu, v.v.):
     + Trích xuất tên xét nghiệm, cơ sở y tế, ngày thực hiện, và danh sách các chỉ số.
     + Trả về JSON có thuộc tính "isBloodPressure": false.

CẤU TRÚC ĐẦU RA JSON YÊU CẦU:
Bạn bắt buộc phải trả về một đối tượng JSON thuộc một trong hai định dạng sau tùy theo kết quả nhận diện:

ĐỊNH DẠNG 1 (Nếu là ảnh đo huyết áp):
{
  "isBloodPressure": true,
  "systolic": <số nguyên, ví dụ: 120>,
  "diastolic": <số nguyên, ví dụ: 80>,
  "pulse": <số nguyên hoặc null nếu không có, ví dụ: 72>,
  "date": "<ngày đo định dạng YYYY-MM-DD, nếu không tìm thấy hãy lấy ngày hiện tại: ${new Date().toISOString().split('T')[0]}>",
  "notes": "<nhận xét ngắn gọn về kết quả đo huyết áp của người dùng bằng tiếng Việt, ví dụ: Huyết áp bình thường / hơi cao...>"
}

ĐỊNH DẠNG 2 (Nếu là kết quả xét nghiệm y khoa thông thường):
{
  "isBloodPressure": false,
  "title": "<Tên xét nghiệm hoặc tiêu đề hồ sơ y tế, ví dụ: Xét nghiệm máu tổng quát>",
  "type": "<Phân loại xét nghiệm, chọn một trong các giá trị: 'blood_test', 'urine_test', 'ultrasound', 'other'>",
  "facility": "<Tên bệnh viện, phòng khám hoặc cơ sở y tế nơi thực hiện. Nếu không tìm thấy, để trống>",
  "date": "<Ngày xét nghiệm định dạng YYYY-MM-DD. Nếu không tìm thấy, lấy ngày hiện tại: ${new Date().toISOString().split('T')[0]}>",
  "indicators": [
    {
      "name": "<Tên chỉ số xét nghiệm, ví dụ: Glucose, Cholesterol, SGOT, SGPT, Bạch cầu...>",
      "value": "<Trị số đo được, ví dụ: 5.4 hoặc 'Dương tính'>",
      "unit": "<Đơn vị đo, ví dụ: mmol/L, g/L, nếu không có để trống>",
      "refRange": "<Khoảng tham chiếu hoặc ngưỡng bình thường, ví dụ: 3.9 - 6.1, < 5.2>",
      "assessment": "<Đánh giá trị số so với ngưỡng tham chiếu, chỉ được chọn một trong các giá trị sau: 'high' (nếu cao hơn ngưỡng), 'low' (nếu thấp hơn ngưỡng), 'normal' (nếu bình thường hoặc nằm trong khoảng tham chiếu)>"
    }
  ],
  "notes": "<Tóm tắt ngắn gọn nhận xét chung hoặc kết luận bằng tiếng Việt>"
}

Lưu ý quan trọng:
1. Đảm bảo trị số trích xuất khớp chính xác với hình ảnh.
2. Trả về kết quả hoàn toàn bằng tiếng Việt.
3. Chỉ trả về một đối tượng JSON hợp lệ duy nhất khớp với cấu trúc trên. Không kèm bất kỳ văn bản giải thích nào ngoài JSON.`;

    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const requestBody = {
                contents: [
                    {
                        parts: [
                            { text: promptText },
                            {
                                inlineData: {
                                    mimeType: mimeType,
                                    data: base64Data
                                }
                            }
                        ]
                    }
                ],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                const errMsg = errJson?.error?.message || `HTTP error ${response.status}`;
                throw new Error(errMsg);
            }
            
            const resData = await response.json();
            const textResponse = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!textResponse) {
                throw new Error("Không nhận được phản hồi phân tích từ Gemini.");
            }
            
            try {
                return JSON.parse(textResponse.trim());
            } catch (e) {
                console.error(`Gemini raw response text parse failure on model ${model}:`, textResponse, e);
                throw new Error("Dữ liệu phản hồi từ AI không đúng định dạng JSON.");
            }
        } catch (err) {
            console.warn(`Model ${model} in callGeminiAPI failed:`, err);
            lastError = err;
            if (err.message.includes("demand") || err.message.includes("quota") || err.message.includes("limit") || err.message.includes("429") || err.message.includes("503")) {
                continue;
            }
            continue;
        }
    }
    throw lastError || new Error("Tất cả các mô hình Gemini đều quá tải hoặc thất bại.");
}

function openHealthEditModal(recordId = null, initialData = null) {
    const editModal = document.getElementById('healthEditModal');
    const modalTitle = document.getElementById('healthEditModalTitle');
    const form = document.getElementById('healthEditForm');
    
    if (!editModal || !form) return;
    
    // Populate profile select options
    const editProfileSelect = document.getElementById('healthEditProfile');
    if (editProfileSelect) {
        editProfileSelect.innerHTML = (state.familyProfiles || []).map(p => `
            <option value="${escapeHTML(p.id)}">${escapeHTML(p.name)}</option>
        `).join('');
    }
    
    // Clear form fields
    document.getElementById('healthRecordId').value = recordId || '';
    document.getElementById('healthEditTitle').value = '';
    document.getElementById('healthEditType').value = 'blood_test';
    document.getElementById('healthEditDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('healthEditFacility').value = '';
    document.getElementById('healthEditNotes').value = '';
    document.getElementById('healthIndicatorsEditRows').innerHTML = '';
    
    // Pre-select active family member filter if not 'all'
    if (editProfileSelect) {
        const curProfile = state.selectedHealthProfileId || 'all';
        editProfileSelect.value = curProfile !== 'all' ? curProfile : 'p-self';
    }
    
    if (recordId) {
        modalTitle.innerText = "Chỉnh sửa Hồ sơ y tế";
        const record = state.medicalRecords.find(r => r.id === recordId);
        if (record) {
            document.getElementById('healthEditTitle').value = record.title || '';
            document.getElementById('healthEditType').value = record.type || 'blood_test';
            document.getElementById('healthEditDate').value = record.date || new Date().toISOString().split('T')[0];
            document.getElementById('healthEditFacility').value = record.facility || '';
            document.getElementById('healthEditNotes').value = record.notes || '';
            if (editProfileSelect) {
                editProfileSelect.value = record.profileId || 'p-self';
            }
            
            (record.indicators || []).forEach(ind => {
                addIndicatorEditRow(ind.name, ind.value, ind.unit, ind.refRange, ind.assessment);
            });
        }
    } else {
        modalTitle.innerText = initialData ? "Xác nhận kết quả quét bằng AI" : "Thêm Hồ sơ y tế thủ công";
        
        if (initialData) {
            document.getElementById('healthEditTitle').value = initialData.title || '';
            document.getElementById('healthEditType').value = initialData.type || 'blood_test';
            document.getElementById('healthEditDate').value = initialData.date || new Date().toISOString().split('T')[0];
            document.getElementById('healthEditFacility').value = initialData.facility || '';
            document.getElementById('healthEditNotes').value = initialData.notes || '';
            
            (initialData.indicators || []).forEach(ind => {
                addIndicatorEditRow(ind.name, ind.value, ind.unit, ind.refRange, ind.assessment);
            });
        } else {
            // Add one default empty row
            addIndicatorEditRow();
        }
    }
    
    editModal.style.display = 'flex';
}

function addIndicatorEditRow(name = '', value = '', unit = '', refRange = '', assessment = 'normal') {
    const container = document.getElementById('healthIndicatorsEditRows');
    if (!container) return;
    
    const rowId = 'ind-row-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    
    const rowDiv = document.createElement('div');
    rowDiv.className = 'health-indicators-edit-row';
    rowDiv.id = rowId;
    
    rowDiv.innerHTML = `
        <input type="text" class="form-control health-input ind-name" required placeholder="Chỉ số (Glucose)" value="${escapeHTML(name)}">
        <input type="text" class="form-control health-input ind-value" required placeholder="Trị số (5.4)" value="${escapeHTML(value)}">
        <input type="text" class="form-control health-input ind-unit" placeholder="Đơn vị (mmol/L)" value="${escapeHTML(unit)}">
        <input type="text" class="form-control health-input ind-refRange" placeholder="Tham chiếu (3.9 - 6.1)" value="${escapeHTML(refRange)}">
        <select class="form-control health-input ind-assessment">
            <option value="normal" ${assessment === 'normal' ? 'selected' : ''}>Bình thường</option>
            <option value="high" ${assessment === 'high' ? 'selected' : ''}>Cao</option>
            <option value="low" ${assessment === 'low' ? 'selected' : ''}>Thấp</option>
        </select>
        <button type="button" class="health-remove-row-btn" onclick="handleRemoveIndicatorRow(this)">
            <i data-lucide="trash-2"></i>
        </button>
    `;
    
    container.appendChild(rowDiv);
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleRemoveIndicatorRow(btn) {
    if (!btn) return;
    if (btn.classList.contains('confirm-delete')) {
        if (btn.dataset.timeoutId) {
            clearTimeout(parseInt(btn.dataset.timeoutId, 10));
        }
        btn.closest('.health-indicators-edit-row').remove();
    } else {
        document.querySelectorAll('.health-remove-row-btn.confirm-delete').forEach(otherBtn => {
            otherBtn.classList.remove('confirm-delete');
            if (otherBtn.dataset.timeoutId) {
                clearTimeout(parseInt(otherBtn.dataset.timeoutId, 10));
                delete otherBtn.dataset.timeoutId;
            }
        });
        
        btn.classList.add('confirm-delete');
        const timeoutId = setTimeout(() => {
            btn.classList.remove('confirm-delete');
            delete btn.dataset.timeoutId;
        }, 3000);
        btn.dataset.timeoutId = timeoutId;
    }
}

async function saveMedicalRecord(event) {
    event.preventDefault();
    
    const recordId = document.getElementById('healthRecordId').value;
    const title = document.getElementById('healthEditTitle').value.trim();
    const type = document.getElementById('healthEditType').value;
    const profileId = document.getElementById('healthEditProfile').value;
    const date = document.getElementById('healthEditDate').value;
    const facility = document.getElementById('healthEditFacility').value.trim();
    const notes = document.getElementById('healthEditNotes').value.trim();
    
    const indicatorRows = document.querySelectorAll('#healthIndicatorsEditRows .health-indicators-edit-row');
    const indicators = [];
    
    indicatorRows.forEach(row => {
        const name = row.querySelector('.ind-name').value.trim();
        const value = row.querySelector('.ind-value').value.trim();
        const unit = row.querySelector('.ind-unit').value.trim();
        const refRange = row.querySelector('.ind-refRange').value.trim();
        const assessment = row.querySelector('.ind-assessment').value;
        
        if (name) {
            indicators.push({ name, value, unit, refRange, assessment });
        }
    });
    
    const nowIso = new Date().toISOString();
    
    if (recordId) {
        const index = state.medicalRecords.findIndex(r => r.id === recordId);
        if (index !== -1) {
            state.medicalRecords[index] = {
                ...state.medicalRecords[index],
                title,
                type,
                profileId,
                date,
                facility,
                notes,
                indicators,
                updated_at: nowIso
            };
        }
    } else {
        const newRecord = {
            id: 'med-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
            title,
            type,
            profileId,
            date,
            facility,
            notes,
            indicators,
            created_at: nowIso,
            updated_at: nowIso
        };
        if (!state.medicalRecords) {
            state.medicalRecords = [];
        }
        state.medicalRecords.push(newRecord);
    }
    
    state.medicalRecordsUpdated = nowIso;
    
    await saveLocalState();
    renderHealthDashboard();
    
    document.getElementById('healthEditModal').style.display = 'none';
    showToast(recordId ? "Cập nhật hồ sơ y tế thành công!" : "Lưu hồ sơ y tế thành công!", "success");
    
    performSync(true);
}

window.deleteMedicalRecord = async function(id) {
    if (!confirm("Bạn có chắc chắn muốn xóa hồ sơ y tế này?")) return;
    
    const index = state.medicalRecords.findIndex(r => r.id === id);
    if (index === -1) return;
    
    lastDeletedRecord = {
        type: 'medical',
        id: id,
        originalRecord: { ...state.medicalRecords[index] }
    };
    
    const now = new Date().toISOString();
    state.medicalRecords[index] = {
        ...state.medicalRecords[index],
        deleted_at: now,
        updated_at: now
    };
    state.medicalRecordsUpdated = now;
    
    await saveLocalState();
    renderHealthDashboard();
    
    document.getElementById('healthDetailModal').style.display = 'none';
    
    showToast(`Đã xóa hồ sơ y tế. <a href="#" onclick="undoDelete(event)" style="color: var(--accent-emerald); font-weight: 600; text-decoration: underline; margin-left: 8px;">Hoàn tác</a>`);
    
    performSync(true);
};

function openHealthDetail(id) {
    activeMedicalRecordId = id;
    const modal = document.getElementById('healthDetailModal');
    if (!modal) return;
    
    const record = state.medicalRecords.find(r => r.id === id);
    if (!record) return;
    
    document.getElementById('healthDetailTitle').innerText = record.title || '-';
    document.getElementById('healthDetailDate').innerText = formatDate(record.date) || '-';
    document.getElementById('healthDetailFacility').innerText = record.facility || '-';
    document.getElementById('healthDetailTypeBadge').innerText = getHealthTypeLabel(record.type);
    
    const profileBadge = document.getElementById('healthDetailProfileBadge');
    if (profileBadge) {
        profileBadge.innerText = getProfileName(record.profileId);
    }
    
    document.getElementById('healthDetailNotes').innerText = record.notes || 'Không có ghi chú.';
    
    const tbody = document.getElementById('healthDetailIndicatorsTableBody');
    if (tbody) {
        if (!record.indicators || record.indicators.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Không có chỉ số xét nghiệm nào.</td></tr>`;
        } else {
            tbody.innerHTML = record.indicators.map(ind => {
                const badgeClass = ind.assessment === 'high' ? 'badge-health-high' : (ind.assessment === 'low' ? 'badge-health-low' : 'badge-health-normal');
                const badgeText = ind.assessment === 'high' ? 'Cao' : (ind.assessment === 'low' ? 'Thấp' : 'Bình thường');
                const unitHtml = ind.unit ? ` <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal; margin-left: 2px;">${escapeHTML(ind.unit)}</span>` : '';
                return `
                    <tr>
                        <td><strong>${escapeHTML(ind.name)}</strong></td>
                        <td style="text-align: center; font-weight: 600;">${escapeHTML(ind.value)}${unitHtml}</td>
                        <td>${escapeHTML(ind.refRange || '-')}</td>
                        <td style="text-align: center;"><span class="${badgeClass}">${badgeText}</span></td>
                    </tr>
                `;
            }).join('');
        }
    }
    
    modal.style.display = 'flex';
}

function openHealthAiMemberSelectorModal() {
    const modal = document.getElementById('healthAiMemberSelectorModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const listContainer = document.getElementById('healthAiMemberSelectorList');
    if (!listContainer) return;
    
    const profiles = state.familyProfiles && state.familyProfiles.length > 0 
        ? state.familyProfiles 
        : [{ id: 'p-self', name: 'Bản thân' }];
    
    listContainer.innerHTML = profiles.map(p => {
        const isDefault = p.id === 'p-self';
        return `
            <div class="health-profile-item" style="cursor: pointer; padding: 12px 16px; margin-bottom: 2px;" onclick="selectMemberForAiAnalysis('${p.id}')">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i data-lucide="user" style="color: var(--health-accent); width: 18px; height: 18px;"></i>
                    <span class="profile-item-name" style="font-weight: 500; color: var(--text-primary);">${escapeHTML(p.name)}</span>
                    ${isDefault ? '<span style="font-size: 0.72rem; color: var(--text-muted); padding: 1px 6px; background: rgba(255, 255, 255, 0.05); border-radius: 4px; border: 1px solid var(--border-color);">Mặc định</span>' : ''}
                </div>
                <i data-lucide="chevron-right" style="color: var(--text-muted); width: 16px; height: 16px;"></i>
            </div>
        `;
    }).join('');
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function selectMemberForAiAnalysis(profileId) {
    const modal = document.getElementById('healthAiMemberSelectorModal');
    if (modal) {
        modal.style.display = 'none';
    }
    
    state.selectedHealthProfileId = profileId;
    const mainSelect = document.getElementById('healthProfileSelect');
    if (mainSelect) {
        mainSelect.value = profileId;
    }
    renderHealthDashboard();
    
    openHealthAiAnalysisModal();
}

function openHealthAiAnalysisModal(type = 'full') {
    state.currentAiAnalysisType = type;
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    if (selectedProfileId === 'all') {
        openHealthAiMemberSelectorModal();
        return;
    }

    const modal = document.getElementById('healthAiAnalysisModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // Update modal title dynamically
    const titleEl = document.getElementById('healthAiAnalysisModalTitle');
    if (titleEl) {
        titleEl.innerText = type === 'bp' ? 'Phân tích Chỉ số Huyết áp bằng AI' : 'Phân tích Sức khỏe Nâng cao bằng AI';
    }
    
    // Get the profile object
    const profile = (state.familyProfiles || []).find(p => p.id === selectedProfileId);
    const lastAiAnalysis = type === 'bp'
        ? (profile ? profile.lastBpAnalysis : state.lastBpAnalysis)
        : (profile ? profile.lastAiAnalysis : state.lastAiAnalysis);
        
    // Reset speech state when opening
    stopAllSpeech();
    const voiceSelect = document.getElementById('healthSpeechVoiceSelect');
    if (voiceSelect) voiceSelect.style.display = 'none';
    const rateSelect = document.getElementById('healthSpeechRateSelect');
    if (rateSelect) rateSelect.style.display = 'none';
    
    // If we have cached analysis, render it. Otherwise, run analysis.
    if (lastAiAnalysis) {
        renderHealthAiReport();
    } else {
        generateHealthAiAnalysisWithBP(false, type === 'bp' ? 'bp_only' : 'full');
    }
}

function cleanLatex(text) {
    if (!text) return text;
    let cleaned = text;
    
    // Replace \text{...} with just ...
    cleaned = cleaned.replace(/\\text\s*\{\s*([^}]+)\s*\}/g, '$1');
    
    // Replace \times with x
    cleaned = cleaned.replace(/\\times/g, 'x');
    
    // Replace \mu with µ
    cleaned = cleaned.replace(/\\mu/g, 'µ');
    
    // Remove inline LaTeX math delimiters ($...$)
    cleaned = cleaned.replace(/\$([^\$]+)\$/g, '$1');
    
    return cleaned;
}

async function callGeminiTextAPI(prompt, defaultModel = 'gemini-2.5-flash') {
    const apiKey = state.geminiApiKey;
    const models = [defaultModel, "gemini-1.5-flash", "gemini-3.5-flash"];
    let lastError = null;
    for (const model of models) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!response.ok) {
                const errJson = await response.json().catch(() => ({}));
                throw new Error(errJson?.error?.message || `HTTP ${response.status}`);
            }
            const resData = await response.json();
            const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error("Không nhận được phản hồi.");
            return text;
        } catch (err) {
            console.warn(`Text model ${model} failed:`, err);
            lastError = err;
            if (err.message.includes("demand") || err.message.includes("quota") || err.message.includes("limit") || err.message.includes("429") || err.message.includes("503")) {
                continue;
            }
            continue;
        }
    }
    throw lastError || new Error("Lỗi khi kết nối Gemini API.");
}

let speechUtterance = null;
let isSpeaking = false;
let ttsAudioQueue = [];
let ttsQueueIndex = 0;
let currentTtsAudio = null;

function stopAllSpeech() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (currentTtsAudio) {
        currentTtsAudio.pause();
        currentTtsAudio.src = "";
        currentTtsAudio = null;
    }
    ttsAudioQueue = [];
    ttsQueueIndex = 0;
    isSpeaking = false;
    
    const speakBtn = document.getElementById('speakHealthAiAnalysisBtn');
    if (speakBtn) {
        speakBtn.innerHTML = '<i data-lucide="volume-2" style="width: 12px; height: 12px;"></i> Đọc kết quả';
        lucide.createIcons();
    }
}

function chunkTextForTts(text, maxLength = 150) {
    if (!text) return [];
    
    let cleaned = text.replace(/\r\n/g, '\n').replace(/\n\n+/g, '\n');
    const sentences = cleaned.split(/([.\n!?]+)/);
    const chunks = [];
    let currentChunk = "";
    
    for (let i = 0; i < sentences.length; i++) {
        const part = sentences[i];
        if (!part) continue;
        
        if (/^[.\n!?]+$/.test(part)) {
            currentChunk += part;
            continue;
        }
        
        if (part.length > maxLength) {
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
            }
            
            const subParts = part.split(/([,]+)/);
            for (let j = 0; j < subParts.length; j++) {
                const sub = subParts[j];
                if (!sub) continue;
                if (/^[,]+$/.test(sub)) {
                    currentChunk += sub;
                    continue;
                }
                
                if (sub.length > maxLength) {
                    if (currentChunk.trim()) {
                        chunks.push(currentChunk.trim());
                        currentChunk = "";
                    }
                    const words = sub.split(/\s+/);
                    for (let w of words) {
                        if ((currentChunk + " " + w).length > maxLength) {
                            if (currentChunk.trim()) chunks.push(currentChunk.trim());
                            currentChunk = w;
                        } else {
                            currentChunk = currentChunk ? currentChunk + " " + w : w;
                        }
                    }
                } else {
                    if ((currentChunk + sub).length > maxLength) {
                        if (currentChunk.trim()) chunks.push(currentChunk.trim());
                        currentChunk = sub;
                    } else {
                        currentChunk += sub;
                    }
                }
            }
        } else {
            if ((currentChunk + part).length > maxLength) {
                if (currentChunk.trim()) chunks.push(currentChunk.trim());
                currentChunk = part;
            } else {
                currentChunk += part;
            }
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}

function playTtsQueue() {
    const speakBtn = document.getElementById('speakHealthAiAnalysisBtn');
    if (ttsQueueIndex >= ttsAudioQueue.length) {
        stopAllSpeech();
        return;
    }
    
    const textToSpeak = ttsAudioQueue[ttsQueueIndex];
    if (!textToSpeak || !textToSpeak.trim()) {
        ttsQueueIndex++;
        playTtsQueue();
        return;
    }
    
    const encodedText = encodeURIComponent(textToSpeak.trim());
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=${encodedText}`;
    
    if (!currentTtsAudio) {
        currentTtsAudio = document.createElement('audio');
        currentTtsAudio.referrerPolicy = 'no-referrer';
        
        currentTtsAudio.onended = () => {
            ttsQueueIndex++;
            playTtsQueue();
        };
        
        currentTtsAudio.onerror = (e) => {
            console.error("Google Translate TTS playback error:", e);
            ttsQueueIndex++;
            playTtsQueue();
        };
    }
    
    currentTtsAudio.src = ttsUrl;
    isSpeaking = true;
    
    if (speakBtn) {
        speakBtn.innerHTML = '<i data-lucide="volume-x" style="width: 12px; height: 12px;"></i> Dừng nghe';
        lucide.createIcons();
    }
    
    currentTtsAudio.play().catch(err => {
        console.error("Failed to play audio chunk:", err);
        stopAllSpeech();
    });
}

function toggleSpeech() {
    const speakBtn = document.getElementById('speakHealthAiAnalysisBtn');
    if (!speakBtn) return;
    
    if (isSpeaking) {
        stopAllSpeech();
        return;
    }
    
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    const profile = (state.familyProfiles || []).find(p => p.id === selectedProfileId);
    
    const isBp = state.currentAiAnalysisType === 'bp';
    const lastAiAnalysis = isBp
        ? (profile ? profile.lastBpAnalysis : state.lastBpAnalysis)
        : (profile ? profile.lastAiAnalysis : state.lastAiAnalysis);
    
    if (!lastAiAnalysis) {
        showToast('Không có nội dung phân tích để đọc!', 'warning');
        return;
    }
    
    let cleanText = cleanLatex(lastAiAnalysis);
    cleanText = cleanText
        .replace(/#{1,6}\s+/g, '') 
        .replace(/\*\*/g, '')      
        .replace(/\*/g, '')        
        .replace(/-\s+/g, '')      
        .replace(/`{1,3}[^`]*`{1,3}/g, '') 
        .replace(/__+/g, '')       
        .trim();
        
    const voiceSelect = document.getElementById('healthSpeechVoiceSelect');
    const selectedVoiceName = voiceSelect?.value || state.selectedSpeechVoiceName;
    
    let selectedRate = 1.0;
    const rateSelect = document.getElementById('healthSpeechRateSelect');
    if (rateSelect) {
        selectedRate = parseFloat(rateSelect.value) || 1.0;
    } else {
        selectedRate = state.selectedSpeechRate || 1.0;
    }
    
    if (selectedVoiceName === 'google-translate') {
        stopAllSpeech();
        ttsAudioQueue = chunkTextForTts(cleanText);
        ttsQueueIndex = 0;
        
        if (ttsAudioQueue.length === 0) {
            showToast('Không có nội dung để đọc!', 'warning');
            return;
        }
        
        playTtsQueue();
        return;
    }
    
    if (!window.speechSynthesis) {
        showToast('Trình duyệt của bạn không hỗ trợ đọc văn bản!', 'error');
        return;
    }
    
    stopAllSpeech();
    
    speechUtterance = new SpeechSynthesisUtterance(cleanText);
    speechUtterance.lang = 'vi-VN';
    speechUtterance.rate = selectedRate;
    speechUtterance.pitch = 1.0;
    
    const voices = window.speechSynthesis.getVoices();
    if (selectedVoiceName) {
        const foundVoice = voices.find(v => v.name === selectedVoiceName);
        if (foundVoice) {
            speechUtterance.voice = foundVoice;
        }
    }
    
    if (!speechUtterance.voice) {
        const viVoices = voices.filter(v => v.lang.startsWith('vi') || v.lang.includes('vi-VN') || v.lang.includes('vi_VN'));
        if (viVoices.length > 0) {
            const bestVoice = viVoices.find(v => v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Natural')) || viVoices[0];
            speechUtterance.voice = bestVoice;
        }
    }
    
    speechUtterance.onend = () => {
        stopAllSpeech();
    };
    
    speechUtterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        stopAllSpeech();
    };
    
    isSpeaking = true;
    speakBtn.innerHTML = '<i data-lucide="volume-x" style="width: 12px; height: 12px;"></i> Dừng nghe';
    lucide.createIcons();
    
    window.speechSynthesis.speak(speechUtterance);
}

function populateVoiceList() {
    const voiceSelect = document.getElementById('healthSpeechVoiceSelect');
    if (!voiceSelect) return;

    voiceSelect.innerHTML = '';

    const optGoogleTranslate = document.createElement('option');
    optGoogleTranslate.value = 'google-translate';
    optGoogleTranslate.textContent = 'Google dịch';
    
    if (state.selectedSpeechVoiceName === 'google-translate' || !state.selectedSpeechVoiceName) {
        optGoogleTranslate.selected = true;
        state.selectedSpeechVoiceName = 'google-translate';
    }
    voiceSelect.appendChild(optGoogleTranslate);

    let viVoices = [];
    if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices();
        viVoices = voices.filter(v => v.lang.startsWith('vi') || v.lang.includes('vi-VN') || v.lang.includes('vi_VN'));
        
        viVoices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            let displayName = voice.name
                .replace(/Microsoft/g, 'MS')
                .replace(/Google/g, 'Google')
                .replace(/Apple/g, 'Apple')
                .replace(/natural/gi, 'Tự nhiên')
                .replace(/text-to-speech/gi, 'TTS');
            option.textContent = displayName;
            
            if (state.selectedSpeechVoiceName && voice.name === state.selectedSpeechVoiceName) {
                option.selected = true;
            }
            
            voiceSelect.appendChild(option);
        });
    }

    const speakBtn = document.getElementById('speakHealthAiAnalysisBtn');
    const rateSelect = document.getElementById('healthSpeechRateSelect');
    if (speakBtn && speakBtn.style.display !== 'none') {
        voiceSelect.style.display = 'inline-flex';
        if (rateSelect) {
            if (state.selectedSpeechVoiceName === 'google-translate') {
                rateSelect.style.display = 'none';
            } else {
                rateSelect.style.display = 'inline-flex';
                if (state.selectedSpeechRate) {
                    const formattedRate = state.selectedSpeechRate.toFixed(1);
                    const rateExists = Array.from(rateSelect.options).some(opt => opt.value === formattedRate);
                    rateSelect.value = rateExists ? formattedRate : '1.0';
                }
            }
        }
    } else {
        voiceSelect.style.display = 'none';
        if (rateSelect) {
            rateSelect.style.display = 'none';
        }
    }
}

function renderHealthAiReport() {
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    const profile = (state.familyProfiles || []).find(p => p.id === selectedProfileId);
    
    const isBp = state.currentAiAnalysisType === 'bp';
    const lastAiAnalysis = isBp
        ? (profile ? profile.lastBpAnalysis : state.lastBpAnalysis)
        : (profile ? profile.lastAiAnalysis : state.lastAiAnalysis);
    const lastAiAnalysisDate = isBp
        ? (profile ? profile.lastBpAnalysisDate : state.lastBpAnalysisDate)
        : (profile ? profile.lastAiAnalysisDate : state.lastAiAnalysisDate);
    
    const dateEl = document.getElementById('healthAiAnalysisDate');
    const reportContentEl = document.getElementById('healthAiReportContent');
    const speakBtn = document.getElementById('speakHealthAiAnalysisBtn');
    
    if (dateEl && lastAiAnalysisDate) {
        const formattedDate = formatDate(lastAiAnalysisDate);
        const formattedTime = new Date(lastAiAnalysisDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        dateEl.innerText = `${formattedDate} lúc ${formattedTime}`;
    } else if (dateEl) {
        dateEl.innerText = 'Chưa phân tích';
    }
    
    if (reportContentEl && lastAiAnalysis) {
        const cleanedReport = cleanLatex(lastAiAnalysis);
        if (typeof marked !== 'undefined') {
            reportContentEl.innerHTML = marked.parse(cleanedReport);
        } else {
            reportContentEl.innerHTML = `<pre style="white-space: pre-wrap; font-family: inherit; margin: 0; padding: 0; background: none; border: none; color: inherit;">${escapeHTML(cleanedReport)}</pre>`;
        }
        if (speakBtn) {
            speakBtn.style.display = 'inline-flex';
            if (!isSpeaking) {
                speakBtn.innerHTML = '<i data-lucide="volume-2" style="width: 12px; height: 12px;"></i> Đọc kết quả';
            }
        }
        
        // Populate voices dropdown when report is shown
        populateVoiceList();
    } else {
        if (reportContentEl) {
            reportContentEl.innerHTML = `
                <div class="health-empty-state" style="padding: 24px 0;">
                    <i data-lucide="sparkles" style="animation: pulse 2s infinite;"></i>
                    <h5 style="margin-top: 10px; font-weight: 600;">Sẵn sàng phân tích</h5>
                    <p style="margin-top: 6px; font-size: 0.85rem; max-width: 320px;">Nhấp vào "Phân tích lại" để tổng hợp và nhận nhận định chi tiết từ Gemini AI.</p>
                </div>
            `;
        }
        if (speakBtn) {
            speakBtn.style.display = 'none';
        }
        const voiceSelect = document.getElementById('healthSpeechVoiceSelect');
        if (voiceSelect) {
            voiceSelect.style.display = 'none';
        }
        const rateSelect = document.getElementById('healthSpeechRateSelect');
        if (rateSelect) {
            rateSelect.style.display = 'none';
        }
    }
    lucide.createIcons();
}

async function generateHealthAiAnalysis(forceFresh = false) {
    if (!state.geminiApiKey) {
        showToast("Vui lòng cấu hình Gemini API Key trước!", "warning");
        const popoverMenu = document.getElementById('geminiPopoverMenu');
        if (popoverMenu) {
            popoverMenu.style.display = 'block';
        }
        return;
    }
    
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    if (selectedProfileId === 'all') {
        showToast("Vui lòng chọn một thành viên cụ thể để phân tích sức khỏe!", "warning");
        return;
    }
    
    const activeRecords = (state.medicalRecords || [])
        .filter(r => !r.deleted_at && (r.profileId || 'p-self') === selectedProfileId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
        
    if (activeRecords.length === 0) {
        showToast("Không tìm thấy hồ sơ y tế nào của thành viên này để phân tích!", "warning");
        return;
    }
    
    const overlay = document.getElementById('healthScannerLoadingOverlay');
    const statusText = document.getElementById('healthScannerStatusText');
    if (overlay) overlay.style.display = 'flex';
    if (statusText) statusText.innerText = 'AI đang tổng hợp và phân tích lịch sử xét nghiệm của thành viên...';
    
    try {
        let historyStr = "";
        activeRecords.forEach((r, idx) => {
            const dateStr = formatDate(r.date);
            const typeLabel = getHealthTypeLabel(r.type);
            historyStr += `--- LẦN KHÁM ${idx + 1} ---\n`;
            historyStr += `Tiêu đề: ${r.title}\n`;
            historyStr += `Ngày: ${dateStr}\n`;
            historyStr += `Cơ sở y tế: ${r.facility || 'Không ghi rõ'}\n`;
            historyStr += `Loại xét nghiệm: ${typeLabel}\n`;
            if (r.notes) {
                historyStr += `Ghi chú/Kết luận của bác sĩ: ${r.notes}\n`;
            }
            historyStr += `Chỉ số kết quả:\n`;
            (r.indicators || []).forEach(ind => {
                const assessmentStr = ind.assessment === 'high' ? 'Cao 🔴' : (ind.assessment === 'low' ? 'Thấp 🟡' : 'Bình thường 🟢');
                historyStr += `- Tên chỉ số: ${ind.name} | Trị số: ${ind.value} ${ind.unit || ''} | Khoảng tham chiếu: ${ind.refRange || 'Không có'} | Đánh giá: ${assessmentStr}\n`;
            });
            historyStr += `\n`;
        });
        
        // Find profile name
        const profile = (state.familyProfiles || []).find(p => p.id === selectedProfileId);
        const memberName = profile ? profile.name : 'Bản thân';

        let memberDetailsStr = '';
        if (profile) {
            memberDetailsStr += `=== THÔNG TIN THÀNH VIÊN ===\n`;
            memberDetailsStr += `- Tên: ${profile.name}\n`;
            if (profile.birthYear) memberDetailsStr += `- Năm sinh: ${profile.birthYear}\n`;
            if (profile.height) memberDetailsStr += `- Chiều cao: ${profile.height} cm\n`;
            if (profile.weight) memberDetailsStr += `- Cân nặng: ${profile.weight} kg\n`;
            if (profile.currentMedications) memberDetailsStr += `- Các loại thuốc đang uống: ${profile.currentMedications}\n`;
            if (profile.medicalHistory) memberDetailsStr += `- Tiền sử bệnh lý: ${profile.medicalHistory}\n`;
            memberDetailsStr += `\n`;
        }
        
        const prompt = `Hãy đóng vai trò là một chuyên gia y tế, bác sĩ tư vấn sức khỏe cao cấp. Dưới đây là thông tin cá nhân và toàn bộ lịch sử kết quả xét nghiệm y tế của thành viên "${memberName}" (được sắp xếp theo trình tự thời gian từ cũ nhất đến mới nhất):\n\n${memberDetailsStr}${historyStr}\n
Hãy đọc và phân tích toàn bộ lịch sử xét nghiệm trên, sau đó lập một bản báo cáo phân tích sức khỏe tổng quan nâng cao bằng tiếng Việt ở định dạng Markdown (sử dụng tiêu đề h2 và h3 để phân cấp rõ ràng). Báo cáo cần bao gồm các mục chính:

1. **Tổng quan xu hướng phát triển sức khỏe**: Nhận định xem tình trạng sức khỏe tổng thể đang tiến triển tốt lên, ổn định hay có xu hướng xấu đi qua thời gian. Đánh giá sự biến động của các chỉ số xét nghiệm chính (ví dụ: chỉ số đường huyết, men gan, mỡ máu... tăng giảm thế nào qua các lần xét nghiệm).
2. **Cảnh báo các nguy cơ sức khỏe lớn nhất**: Nhấn mạnh các chỉ số liên tục bất thường (Cao/Thấp) và các nguy cơ bệnh lý tiềm ẩn đi kèm cần đặc biệt lưu ý.
3. **Lời khuyên chi tiết từ Chuyên gia**:
   - **Chế độ ăn uống**: Nên bổ sung hoặc kiêng cữ những nhóm thực phẩm nào để cải thiện các chỉ số xấu.
   - **Chế độ sinh hoạt & Vận động**: Các bài tập thể thao, cường độ luyện tập và thói quen sinh hoạt tốt phù hợp với tình trạng sức khỏe hiện tại.
   - **Thăm khám y khoa**: Đưa ra lời khuyên về tần suất xét nghiệm lại hoặc có cần đi khám chuyên khoa sâu nào ngay không.

*Lưu ý quan trọng*: Trả về kết quả trực tiếp bằng định dạng Markdown sạch đẹp, trình bày chuyên nghiệp như một báo cáo y khoa thực thụ. Tuyệt đối KHÔNG sử dụng ký tự $ hoặc các ký hiệu toán học LaTeX (như $...$, $$...$$, \text{...}, \times, \mu) để biểu diễn các số liệu hoặc đơn vị đo lường. Thay vào đó, hãy dùng văn bản thường thuần túy (ví dụ: dùng "x" thay cho "\times", dùng "uL" hoặc "µL" thay cho "\mu L", dùng "15.8 g/dL" thay cho "$15.8 \text{ g/dL}$"). Tất cả các số liệu và đơn vị phải hiển thị dưới dạng văn bản thường đọc được trực tiếp. Ở cuối báo cáo hãy thêm một câu nhắc nhở nhẹ nhàng rằng đây là phân tích từ AI và khuyên người dùng nên tham vấn ý kiến trực tiếp từ bác sĩ chuyên môn.`;

        const textResponse = await callGeminiTextAPI(prompt, 'gemini-3.5-flash');
        
        const nowIso = new Date().toISOString();
        
        if (profile) {
            profile.lastAiAnalysis = textResponse;
            profile.lastAiAnalysisDate = nowIso;
            profile.lastAiAnalysisUpdated = nowIso;
            
            if (selectedProfileId === 'p-self') {
                state.lastAiAnalysis = textResponse;
                state.lastAiAnalysisDate = nowIso;
                state.lastAiAnalysisUpdated = nowIso;
            }
        }
        
        state.familyProfilesUpdated = nowIso;
        
        await saveLocalState();
        
        if (overlay) overlay.style.display = 'none';
        
        renderHealthAiReport();
        showToast("Phân tích sức khỏe bằng AI thành công!", "success");
        
        performSync(true);
        
    } catch (err) {
        console.error("AI Analysis error:", err);
        if (overlay) overlay.style.display = 'none';
        showToast("Phân tích sức khỏe AI thất bại: " + err.message, "error");
    }
}

// --- Medical Indicators Dictionary & Explanation Logic ---

const HEALTH_INDICATORS_DICTIONARY = {
    'glucose': {
        name: 'Glucose (Đường huyết lúc đói)',
        def: 'Đường huyết (đường trong máu lúc đói). Đánh giá khả năng chuyển hóa đường của cơ thể và là chỉ số cốt lõi để phát hiện bệnh tiểu đường.',
        high: 'Cảnh báo nguy cơ tiền tiểu đường, tiểu đường thai kỳ, tiểu đường tuýp 2, hoặc rối loạn dung nạp glucose. Cần hạn chế tinh bột, đồ ngọt, tăng vận động.',
        low: 'Gây hạ đường huyết (chóng mặt, run tay chân, vã mồ hôi, tim đập nhanh). Cần bổ sung ngay nước đường, bánh kẹo ngọt hoặc tinh bột hấp thu nhanh.'
    },
    'hba1c': {
        name: 'HbA1c (Đường huyết trung bình 3 tháng)',
        def: 'Tỷ lệ hemoglobin liên kết với đường trong máu. Phản ánh mức kiểm soát đường huyết trung bình trong 2-3 tháng gần nhất.',
        high: 'Kiểm soát đường huyết kém ở bệnh nhân tiểu đường, hoặc chẩn đoán xác định bệnh tiểu đường (khi >= 6.5%). Tăng nguy cơ biến chứng tim mạch, mắt, thận.',
        low: 'Ít gặp, có thể xảy ra ở người bị thiếu máu nặng, tan máu huyết tán, hoặc suy gan thận nặng làm thay đổi đời sống hồng cầu.'
    },
    'insulin': {
        name: 'Insulin',
        def: 'Hormone do tuyến tụy sản sinh, giúp vận chuyển đường từ máu vào trong tế bào để tạo năng lượng.',
        high: 'Cảnh báo tình trạng kháng insulin (tiền đề của tiểu đường tuýp 2), hội chứng buồng trứng đa nang (PCOS), hoặc u tuyến tụy tiết insulin.',
        low: 'Cảnh báo suy kiệt tuyến tụy (gặp ở bệnh tiểu đường tuýp 1 hoặc giai đoạn muộn của tiểu đường tuýp 2).'
    },
    'cholesterol': {
        name: 'Cholesterol toàn phần',
        def: 'Tổng lượng cholesterol trong máu (bao gồm cả mỡ tốt và mỡ xấu). Cần thiết cho hoạt động của màng tế bào và sản sinh hormone.',
        high: 'Tăng nguy cơ xơ vữa động mạch, cao huyết áp, nhồi máu cơ tim, và đột quỵ. Cần hạn chế mỡ động vật, phủ tạng, tăng chất xơ và tập luyện.',
        low: 'Có thể do suy dinh dưỡng, cường giáp, suy gan nặng, hoặc hội chứng kém hấp thu.'
    },
    'triglycerides': {
        name: 'Triglycerides (Chất béo trung tính)',
        def: 'Dạng chất béo phổ biến nhất trong cơ thể, tích tụ từ calo dư thừa. Nguồn năng lượng dự trữ nhưng quá nhiều sẽ gây hại mạch máu.',
        high: 'Tăng xơ vữa động mạch. Đặc biệt khi triglycerides tăng rất cao (> 11.3 mmol/L hoặc > 1000 mg/dL) có nguy cơ gây viêm tụy cấp nguy hiểm tính mạng.',
        low: 'Có thể do suy kiệt, chế độ ăn quá ít chất béo, cường giáp, hoặc hội chứng kém hấp thu.'
    },
    'hdl': {
        name: 'HDL-Cholesterol (Mỡ tốt)',
        def: 'Lipoprotein tỷ trọng cao. Thu gom cholesterol dư thừa từ các mô và mạch máu đưa về gan để xử lý và đào thải ra ngoài.',
        high: 'Tốt cho hệ tim mạch, giúp bảo vệ mạch máu chống lại mảng xơ vữa (thường do tập luyện thể thao tốt, cơ địa lành mạnh).',
        low: 'Làm tăng nguy cơ xơ vữa động mạch và các biến cố tim mạch dù các chỉ số mỡ máu khác bình thường.'
    },
    'ldl': {
        name: 'LDL-Cholesterol (Mỡ xấu)',
        def: 'Lipoprotein tỷ trọng thấp. Vận chuyển cholesterol từ gan đến các tế bào. Dư thừa sẽ bám vào thành mạch tạo xơ vữa gây tắc hẹp lòng mạch.',
        high: 'Nguy cơ cao gây xơ vữa mạch máu, dẫn tới tai biến mạch máu não, nhồi máu cơ tim. Cần điều trị bằng thuốc hạ mỡ máu nếu có chỉ định.',
        low: 'Thường ít gặp lâm sàng, có thể do suy gan, suy dinh dưỡng hoặc cường giáp.'
    },
    'ast': {
        name: 'AST / SGOT (Men gan AST)',
        def: 'Men xúc tác chuyển hóa đạm, có nhiều ở tế bào gan, cơ tim và cơ xương. Tăng lên khi tế bào ở các cơ quan này bị tổn thương hoặc hủy hoại.',
        high: 'Cảnh báo tổn thương tế bào gan do viêm gan cấp/mãn tính, gan nhiễm mỡ, độc chất, bia rượu, hoặc tổn thương cơ tim (nhồi máu cơ tim).',
        low: 'Không có ý nghĩa lâm sàng đáng ngại, thường phản ánh tình trạng bình thường.'
    },
    'alt': {
        name: 'ALT / SGPT (Men gan ALT)',
        def: 'Men gan đặc hiệu nhất cho tế bào gan, hầu như chỉ có ở gan. Là chỉ số nhạy bén nhất để phát hiện hủy hoại tế bào gan.',
        high: 'Biểu hiện rõ rệt của tổn thương nhu mô gan (viêm gan virus, viêm gan do thuốc, nhiễm độc chất, gan nhiễm mỡ nặng, xơ gan tiến triển).',
        low: 'Không có ý nghĩa lâm sàng đáng ngại.'
    },
    'amylase': {
        name: 'Amylase (Men tụy đặc hiệu)',
        def: 'Men tiêu hóa do tuyến tụy và tuyến nước bọt sản xuất, giúp phân giải tinh bột thành đường. Men amylase tăng cao trong máu khi có tổn thương hoặc viêm tuyến tụy.',
        high: 'Cảnh báo viêm tụy cấp tính (men amylase thường tăng gấp 3 lần bình thường trở lên, cần nhập viện khẩn cấp vì có nguy cơ tử vong), viêm tụy mạn tính, tắc nghẽn ống tụy, hoặc viêm tuyến nước bọt (quai bị).',
        low: 'Cảnh báo tổn thương tuyến tụy nghiêm trọng và xơ hóa lâu ngày (như viêm tụy mạn giai đoạn muộn, xơ nang tụy), hoặc suy chức năng gan nặng.'
    },
    'ggt': {
        name: 'GGT (Gamma-Glutamyl Transferase)',
        def: 'Men gan rất nhạy cảm nằm ở màng tế bào ống mật và tế bào gan. Tăng cao nhanh chóng khi có tổn thương gan do cồn hoặc tắc mật.',
        high: 'Thường gặp ở người uống nhiều bia rượu, viêm đường mật, tắc mật, hoặc tổn thương gan do dùng nhiều thuốc tây hại gan.',
        low: 'Không có ý nghĩa lâm sàng đáng ngại.'
    },
    'bilirubin': {
        name: 'Bilirubin (Sắc tố mật)',
        def: 'Sản phẩm của quá trình phân hủy tế bào hồng cầu già. Gan có nhiệm vụ lọc chất này và đào thải qua mật.',
        high: 'Gây vàng da, vàng mắt, nước tiểu sẫm màu. Cảnh báo các bệnh lý về gan mật (tắc mật, viêm gan) hoặc bệnh tan máu (hủy hồng cầu hàng loạt).',
        low: 'Thường ít gặp và không có ý nghĩa bệnh lý đáng ngại.'
    },
    'albumin': {
        name: 'Albumin',
        def: 'Protein chiếm tỷ lệ cao nhất trong máu, do gan sản xuất. Giúp giữ nước không bị rò rỉ ra ngoài mạch máu và vận chuyển thuốc, hormone.',
        high: 'Thường do cơ thể bị mất nước cấp tính (tiêu chảy, nôn mửa nặng).',
        low: 'Cảnh báo chức năng gan suy giảm (xơ gan, suy gan) hoặc thận bị thất thoát đạm (hội chứng thận hư), hoặc suy dinh dưỡng nặng.'
    },
    'total protein': {
        name: 'Protein toàn phần',
        def: 'Tổng lượng protein (Albumin và Globulin) có trong huyết thanh. Phản ánh chức năng gan, thận và tình trạng miễn dịch của cơ thể.',
        high: 'Có thể gặp trong các bệnh lý huyết học (như đau tủy xương), nhiễm trùng mãn tính hoặc cơ thể bị mất nước.',
        low: 'Gặp trong suy dinh dưỡng, xơ gan, suy gan, suy thận, hội chứng thận hư, hoặc kém hấp thu đạm.'
    },
    'ure': {
        name: 'Ure / Urea (Chỉ số Ure máu)',
        def: 'Sản phẩm cuối cùng của quá trình chuyển hóa đạm trong cơ thể, được lọc qua cầu thận và đào thải ra ngoài qua nước tiểu.',
        high: 'Cảnh báo chức năng lọc của thận suy giảm (suy thận), hoặc do chế độ ăn quá nhiều đạm, xuất huyết tiêu hóa, cơ thể mất nước nặng.',
        low: 'Gặp khi chế độ ăn nghèo đạm, suy dinh dưỡng, truyền dịch quá nhiều, hoặc suy gan nặng (do gan giảm tổng hợp ure).'
    },
    'creatinine': {
        name: 'Creatinine (Chức năng lọc của thận)',
        def: 'Chất cặn bã từ quá trình co cơ, đào thải duy nhất qua thận. Là chỉ số chính xác và nhạy nhất để chẩn đoán mức độ suy thận.',
        high: 'Cảnh báo tình trạng suy thận cấp hoặc mãn tính, tắc nghẽn đường tiểu (sỏi, u chèn ép), hoặc chấn thương hủy hoại cơ nặng.',
        low: 'Gặp ở người bị suy kiệt, teo cơ, người già yếu ít vận động, phụ nữ mang thai (do tăng lưu lượng lọc máu ở thận).'
    },
    'egfr': {
        name: 'eGFR (Độ lọc cầu thận ước tính)',
        def: 'Thể tích máu được thận lọc sạch trong một phút. Phản ánh phần trăm năng lực hoạt động còn lại của hai quả thận.',
        high: 'Thường là bình thường (nếu eGFR > 90), phản ánh chức năng thận rất tốt.',
        low: 'Cảnh báo suy thận. eGFR càng thấp thì mức độ suy thận càng nặng (dưới 60 là suy thận độ 3 trở lên, dưới 15 là suy thận giai đoạn cuối).'
    },
    'uric acid': {
        name: 'Axit Uric (Chỉ số Gút / Uric Acid)',
        def: 'Sản phẩm chuyển hóa của nhân purin (có trong thịt đỏ, hải sản, rượu bia). Thận đào thải axit uric ra ngoài, nếu dư thừa sẽ lắng đọng tinh thể.',
        high: 'Gây lắng đọng tinh thể urat tại các khớp dẫn đến những cơn đau Gút cấp tính (sưng nóng đỏ đau dữ dội khớp ngón chân, cổ chân) hoặc gây sỏi thận.',
        low: 'Rất ít gặp, có thể liên quan đến hội chứng Fanconi (tổn thương ống thận) hoặc chế độ ăn quá nghèo dinh dưỡng.'
    },
    'rbc': {
        name: 'RBC (Số lượng hồng cầu)',
        def: 'Tế bào máu phổ biến nhất, chứa huyết sắc tố giúp vận chuyển oxy từ phổi đến nuôi các cơ quan tế bào trong cơ thể.',
        high: 'Gặp ở người bị mất nước, bệnh đa hồng cầu, người sống ở vùng núi cao thiếu oxy, hoặc người bị bệnh tim phổi mãn tính.',
        low: 'Biểu hiện của tình trạng thiếu máu (do mất máu, thiếu sắt, thiếu vitamin B12, tan máu, hoặc tủy xương giảm sản xuất).'
    },
    'wbc': {
        name: 'WBC (Số lượng bạch cầu)',
        def: 'Tế bào máu bảo vệ cơ thể. Đóng vai trò nhận diện, tấn công và tiêu diệt các tác nhân gây bệnh xâm nhập như vi khuẩn, virus.',
        high: 'Cảnh báo cơ thể đang có nhiễm trùng cấp tính (viêm họng, viêm ruột, áp xe...), phản ứng viêm nặng, hoặc bệnh lý ác tính dòng bạch cầu.',
        low: 'Cảnh báo suy giam miễn dịch, nhiễm virus nặng (như sốt xuất huyết, cúm), hoặc tổn thương tủy xương do hóa chất/thuốc.'
    },
    'plt': {
        name: 'PLT (Số lượng tiểu cầu)',
        def: 'Các mảnh tế bào máu cực nhỏ có vai trò kết dính và tạo cục máu đông để cầm vết thương, ngăn chảy máu.',
        high: 'Tăng nguy cơ hình thành cục máu đông gây tắc mạch (nhồi máu não, nhồi máu cơ tim, tắc mạch phổi), hoặc do viêm nhiễm kéo dài.',
        low: 'Tăng nguy cơ chảy máu tự nhiên (chảy máu cam, chảy máu chân răng, xuất huyết dưới da, xuất huyết nội tạng). Nguy hiểm khi PLT < 50.'
    },
    'hemoglobin': {
        name: 'Hemoglobin / Hb (Huyết sắc tố)',
        def: 'Protein chứa sắt nằm trong hồng cầu, trực tiếp làm nhiệm vụ gắn và vận chuyển oxy. Chỉ số chính để định nghĩa thiếu máu.',
        high: 'Gặp khi cô đặc máu (mất nước nặng), bệnh đa hồng cầu hoặc bệnh tim phổi mạn tính gây thiếu oxy trường kỳ.',
        low: 'Chẩn đoán xác định thiếu máu. Gây mệt mỏi, hoa mắt, chóng mặt, da xanh xao, tim đập nhanh khi gắng sức.'
    },
    'hematocrit': {
        name: 'Hematocrit / Hct (Tỷ lệ thể tích hồng cầu)',
        def: 'Tỷ lệ phần trăm thể tích của các tế bào hồng cầu chiếm trên tổng thể tích máu toàn phần.',
        high: 'Chỉ ra tình trạng cô đặc máu (do mất nước nặng như tiêu chảy, sốt cao, bỏng) hoặc bệnh đa hồng cầu.',
        low: 'Biểu hiện của thiếu máu hoặc cơ thể bị thừa dịch (loãng máu).'
    },
    'mcv': {
        name: 'MCV (Thể tích trung bình hồng cầu)',
        def: 'Kích thước trung bình của một tế bào hồng cầu. Giúp bác sĩ phân loại nguyên nhân gây ra thiếu máu.',
        high: 'Hồng cầu to: Thường do thiếu Vitamin B12 hoặc Axit Folic, người nghiện rượu, hoặc bệnh gan.',
        low: 'Hồng cầu nhỏ: Thường do thiếu sắt (rất phổ biến) hoặc bệnh tan máu bẩm sinh di truyền Thalassemia.'
    },
    'mch': {
        name: 'MCH (Lượng huyết sắc tố trung bình hồng cầu)',
        def: 'Khối lượng huyết sắc tố trung bình chứa trong một tế bào hồng cầu.',
        high: 'Hồng cầu ưu sắc (thường đi kèm MCV cao do thiếu B12/Folic).',
        low: 'Hồng cầu nhược sắc (thường gặp trong thiếu máu thiếu sắt hoặc bệnh Thalassemia).'
    },
    'mchc': {
        name: 'MCHC (Nồng độ huyết sắc tố trung bình hồng cầu)',
        def: 'Nồng độ trung bình của huyết sắc tố tính trên một thể tích hồng cầu lắng.',
        high: 'Ít gặp, có thể do hồng cầu bị biến dạng hình cầu di truyền.',
        low: 'Hồng cầu nhược sắc (thiếu máu thiếu sắt, thiếu máu do viêm nhiễm mãn tính).'
    },
    'neutrophil': {
        name: 'Neutrophil (Bạch cầu trung tính)',
        def: 'Thành phần bạch cầu lớn nhất, chuyên thực bào tiêu diệt vi khuẩn ở giai đoạn đầu của phản ứng viêm cấp.',
        high: 'Biểu hiện rõ của tình trạng nhiễm trùng vi khuẩn cấp tính (viêm phổi, viêm ruột thừa, áp xe) hoặc stress, chấn thương lớn.',
        low: 'Tăng nguy cơ nhiễm trùng nghiêm trọng (do suy tủy, nhiễm virus nặng, hoặc tác dụng phụ của thuốc hóa trị/kháng sinh).'
    },
    'lymphocyte': {
        name: 'Lymphocyte (Bạch cầu Lympho)',
        def: 'Tế bào miễn dịch chuyên biệt chịu trách nhiệm sản sinh kháng thể tiêu diệt tế bào nhiễm virus và tế bào ung thư.',
        high: 'Cảnh báo nhiễm trùng do virus (ho gà, sởi, quai bị, sốt xuất huyết) hoặc các bệnh lý bạch cầu lympho mãn tính.',
        low: 'Suy giảm miễn dịch (như nhiễm HIV, điều trị corticoid liều cao kéo dài, hóa trị, xạ trị).'
    },
    'monocyte': {
        name: 'Monocyte (Bạch cầu Monocyte)',
        def: 'Loại bạch cầu có kích thước lớn nhất, thực hiện nhiệm vụ dọn dẹp các mảnh vỡ tế bào và mầm bệnh đã bị tiêu diệt.',
        high: 'Thường tăng trong giai đoạn hồi phục sau nhiễm trùng cấp, hoặc nhiễm trùng mãn tính (như lao, sốt rét, viêm tâm nội mạc).',
        low: 'Rất ít ý nghĩa lâm sàng, có thể gặp trong suy tủy xương.'
    },
    'monocyte_percent': {
        name: 'Monocyte % (Tỷ lệ bạch cầu Monocyte)',
        def: 'Tỷ lệ phần trăm của bạch cầu Monocyte trên tổng số bạch cầu trong máu ngoại vi.',
        high: 'Tăng trong nhiễm trùng mãn tính (lao, giang mai, viêm tâm nội mạc), nhiễm ký sinh trùng, hoặc bệnh tự miễn (Lupus ban đỏ, viêm khớp dạng thấp), hoặc một số bệnh lý ác tính dòng tủy.',
        low: 'Không có ý nghĩa lâm sàng đặc hiệu.'
    },
    'eosinophil': {
        name: 'Eosinophil (Bạch cầu ưa axit)',
        def: 'Loại bạch cầu chuyên chống lại các phản ứng dị ứng và tiêu diệt ký sinh trùng lớn (như giun, sán).',
        high: 'Dấu hiệu cơ thể đang bị dị ứng (hen phế quản, viêm da dị ứng, dị ứng thuốc) hoặc đang bị nhiễm ký sinh trùng (giun sán).',
        low: 'Không có ý nghĩa lâm sàng đặc hiệu.'
    },
    'basophil': {
        name: 'Basophil (Bạch cầu ưa kiềm)',
        def: 'Loại bạch cầu ít nhất trong máu, chứa histamine và heparin tham gia vào các phản ứng dị ứng tức thì.',
        high: 'Gặp trong các phản ứng dị ứng nghiêm trọng, viêm mãn tính hoặc bệnh lý tăng sinh tủy xương.',
        low: 'Không có ý nghĩa lâm sàng đặc hiệu.'
    },
    'rdw': {
        name: 'RDW (Dải phân bố kích thước hồng cầu)',
        def: 'Độ phân bố kích thước hồng cầu (Red Cell Distribution Width). Đo lường sự đồng đều về thể tích/kích thước giữa các tế bào hồng cầu.',
        high: 'Kích thước các tế bào hồng cầu chênh lệch lớn (to nhỏ không đều), là dấu hiệu rất phổ biến của thiếu máu thiếu sắt, thiếu vitamin B12/Folate, hoặc tan máu Thalassemia.',
        low: 'Kích thước các tế bào hồng cầu rất đồng đều, phản ánh trạng thái bình thường và không có ý nghĩa bệnh lý đáng ngại.'
    },
    'pdw': {
        name: 'PDW (Dải phân bố kích thước tiểu cầu)',
        def: 'Độ phân bố thể tích tiểu cầu (Platelet Distribution Width). Đánh giá mức độ biến động về kích thước của các tiểu cầu trong máu.',
        high: 'Kích thước tiểu cầu không đồng đều, thường liên quan đến các rối loạn sản sinh tiểu cầu ở tủy xương, ung thư máu, hoặc phản ứng viêm/nhiễm trùng cấp.',
        low: 'Kích thước các tiểu cầu đồng đều, thường là biểu hiện bình thường.'
    },
    'mpv': {
        name: 'MPV (Thể tích trung bình tiểu cầu)',
        def: 'Thể tích trung bình của tiểu cầu (Mean Platelet Volume). Đo lường kích thước trung bình của các tiểu cầu lưu thông trong máu.',
        high: 'Kích thước tiểu cầu lớn hơn bình thường, phản ánh tủy xương đang tăng tốc giải phóng tiểu cầu mới (phản ứng sau mất máu, nhiễm trùng, đái tháo đường, tim mạch).',
        low: 'Tiểu cầu có kích thước nhỏ, cảnh báo tủy xương giảm sản xuất tiểu cầu (gặp trong suy tủy xương, thiếu máu bất sản, ung thư máu hoặc sau hóa trị).'
    },
    'p-lcr': {
        name: 'P-LCR (Tỷ lệ tiểu cầu kích thước lớn)',
        def: 'Tỷ lệ phần trăm tiểu cầu có thể tích lớn (>12 fL) trong tổng số tiểu cầu lưu hành.',
        high: 'Tăng nguy cơ hình thành cục máu đông gây tắc mạch, hoặc phản ánh tủy xương đang tăng cường giải phóng các tiểu cầu non lớn ra máu ngoại vi.',
        low: 'Tỷ lệ tiểu cầu lớn thấp, thường đi kèm tình trạng giảm hoạt động tạo máu/tiểu cầu ở tủy xương.'
    },
    'mxd': {
        name: 'MXD / BC đoạn Bazo Mono Axit (Bạch cầu hỗn hợp)',
        def: 'Chỉ số tổng hợp (tỷ lệ % hoặc số lượng tuyệt đối) của nhóm 3 loại bạch cầu ít gặp hơn bao gồm: Bạch cầu ưa axit (Eosinophil), Bạch cầu ưa kiềm (Basophil) và Bạch cầu Monocyte.',
        high: 'Cảnh báo tình trạng nhiễm ký sinh trùng (giun, sán), phản ứng dị ứng nặng, hen suyễn, hoặc nhiễm trùng, viêm nhiễm mãn tính.',
        low: 'Chỉ số thấp thường ít có ý nghĩa lâm sàng đặc hiệu trừ khi đi kèm tình trạng suy giảm toàn bộ các dòng tế bào máu.'
    },
    'kst sot ret': {
        name: 'KST sốt rét (Ký sinh trùng sốt rét)',
        def: 'Xét nghiệm tìm kiếm sự hiện diện của ký sinh trùng sốt rét (Plasmodium) trong máu ngoại vi để chẩn đoán bệnh sốt rét.',
        high: 'Dương tính (+): Cơ thể đang bị nhiễm ký sinh trùng sốt rét, cần nhập viện và điều trị bằng thuốc đặc hiệu khẩn cấp để tránh biến chứng ác tính.',
        low: 'Âm tính (-): Không tìm thấy ký sinh trùng sốt rét trong mẫu máu xét nghiệm tại thời điểm khảo sát.'
    },
    'tsh': {
        name: 'TSH (Hormone kích thích tuyến giáp)',
        def: 'Hormone do tuyến yên (não) tiết ra để điều khiển tuyến giáp sản xuất hormone giáp T3 và T4.',
        high: 'Cảnh báo suy giáp (tuyến giáp hoạt động yếu nên não phải tăng tiết TSH để kích thích). Triệu chứng: sợ lạnh, tăng cân, mệt mỏi, mạch chậm.',
        low: 'Cảnh báo cường giáp (tuyến giáp hoạt động quá mức nên não giảm tiết TSH). Triệu chứng: sợ nóng, sụt cân, tim đập nhanh, run tay.'
    },
    'ft3': {
        name: 'FT3 (T3 tự do)',
        def: 'Hormone tuyến giáp dạng tự do hoạt động sinh học mạnh mẽ nhất, quyết định tốc độ chuyển hóa của cơ thể.',
        high: 'Dấu hiệu của bệnh cường giáp (Basedow, bướu độc tuyến giáp). Gây chuyển hóa nhanh, sụt cân, tim đập nhanh, đánh trống ngực.',
        low: 'Dấu hiệu của bệnh suy giáp. Gây chậm chạp, mệt mỏi, sợ lạnh, táo bón.'
    },
    'ft4': {
        name: 'FT4 (T4 tự do)',
        def: 'Hormone tuyến giáp dạng tự do chiếm tỷ lệ cao nhất trong máu, đóng vai trò dự trữ và chuyển hóa thành FT3 khi tế bào cần.',
        high: 'Cường giáp hoặc viêm tuyến giáp cấp tính.',
        low: 'Suy giáp hoặc suy tuyến yên (không kích thích được tuyến giáp).'
    },
    'crp': {
        name: 'CRP / hs-CRP (Chỉ số viêm CRP)',
        def: 'Protein phản ứng C sản xuất tại gan. Chỉ số vô cùng nhạy bén để phát hiện viêm nhiễm cấp tính ở bất kỳ cơ quan nào.',
        high: 'Cảnh báo có ổ nhiễm trùng nặng, viêm khớp dạng thấp tiến triển, chấn thương mô, hoặc nguy cơ xơ vữa động mạch tim (đối với hs-CRP).',
        low: 'Chỉ số thấp phản ánh cơ thể bình thường, không có ổ viêm nhiễm hoạt động.'
    },
    'ckmb': {
        name: 'CK-MB (Men tim đặc hiệu)',
        def: 'Men creatine kinase nhánh cơ tim. Tăng cao rất nhanh trong máu khi có tổn thương cơ tim cấp.',
        high: 'Chỉ điểm nhồi máu cơ tim cấp tính hoặc viêm cơ tim. Cần cấp cứu y tế ngay lập tức nếu kèm đau thắt ngực.',
        low: 'Chỉ số thấp phản ánh tình trạng cơ tim bình thường.'
    },
    'troponin': {
        name: 'Troponin T / I (Chỉ số tổn thương tim)',
        def: 'Protein cấu trúc của cơ tim. Là tiêu chuẩn vàng nhạy bén và đặc hiệu nhất để chẩn đoán tổn thương cơ tim.',
        high: 'Chẩn đoán xác định nhồi máu cơ tim cấp, viêm cơ tim cấp, hoặc tổn thương tim do suy tim nặng. Cần nhập viện khẩn cấp.',
        low: 'Chỉ số bình thường, cho thấy không có tổn thương tế bào cơ tim.'
    },
    'ph nuoc tieu': {
        name: 'pH nước tiểu',
        def: 'Độ axit/kiềm của nước tiểu. Giúp đánh giá chức năng giữ cân bằng toan kiềm của thận và chẩn đoán sỏi thận.',
        high: 'Nước tiểu kiềm (pH > 7.0): Nhiễm trùng đường tiểu do vi khuẩn phân hủy ure, hoặc chế độ ăn quá nhiều rau củ.',
        low: 'Nước tiểu axit (pH < 5.0): Mất nước, đói, nhiễm toan tiểu đường, hoặc chế độ ăn quá nhiều thịt động vật.'
    },
    'protein nuoc tieu': {
        name: 'Protein nước tiểu (Albumin niệu)',
        def: 'Lượng đạm thất thoát qua nước tiểu. Thận bình thường sẽ giữ lại toàn bộ protein trong máu.',
        high: 'Cảnh báo tổn thương màng lọc cầu thận (suy thận, hội chứng thận hư, viêm cầu thận) hoặc tổn thương thận do tiểu đường, cao huyết áp.',
        low: 'Chỉ số bình thường (âm tính hoặc vết), chứng tỏ màng lọc thận hoạt động tốt.'
    },
    'glucose nuoc tieu': {
        name: 'Glucose nước tiểu (Đường niệu)',
        def: 'Lượng đường thất thoát qua nước tiểu. Thường chỉ xuất hiện khi nồng độ đường trong máu vượt quá 10 mmol/L (180 mg/dL).',
        high: 'Cảnh báo bệnh tiểu đường chưa được kiểm soát tốt, hoặc bệnh lý ống thận làm giảm khả năng tái hấp thu đường.',
        low: 'Chỉ số bình thường (âm tính), phản ánh tốt chuyển hóa đường.'
    },
    'ketone': {
        name: 'Ketone nước tiểu (Thể ceton niệu)',
        def: 'Sản phẩm phụ của quá trình phân hủy chất béo để lấy năng lượng thay thế khi cơ thể thiếu hụt nguồn đường.',
        high: 'Gặp trong nhiễm toan ceton do tiểu đường cấp tính (nguy hiểm), nhịn đói lâu ngày, chế độ ăn kiêng tinh bột quá mức (Keto).',
        low: 'Chỉ số bình thường (âm tính).'
    },
    'hong cau nieu': {
        name: 'Hồng cầu niệu (Tiểu máu)',
        def: 'Sự xuất hiện của hồng cầu trong nước tiểu do tổn thương mạch máu dọc đường tiết niệu.',
        high: 'Cảnh báo sỏi thận, sỏi bàng quang, viêm đường tiết niệu, viêm cầu thận cấp, chấn thương thận hoặc u đường tiết niệu.',
        low: 'Chỉ số bình thường (âm tính).'
    },
    'bach cau nieu': {
        name: 'Bạch cầu niệu (Nhiễm trùng niệu)',
        def: 'Sự xuất hiện của tế bào miễn dịch bạch cầu trong nước tiểu do phản ứng chống lại vi khuẩn.',
        high: 'Cảnh báo nhiễm trùng đường tiết niệu (viêm niệu đạo, viêm bàng quang, viêm bể thận). Cần dùng kháng sinh điều trị theo đơn.',
        low: 'Chỉ số bình thường (âm tính).'
    },
    'psa': {
        name: 'PSA toàn phần (Tầm soát tuyến tiền liệt)',
        def: 'Kháng nguyên đặc hiệu của tuyến tiền liệt (Prostate-Specific Antigen). Là chỉ số tầm soát sớm các bệnh lý về tuyến tiền liệt ở nam giới.',
        high: 'Cảnh báo nguy cơ phì đại lành tính tuyến tiền liệt, viêm tuyến tiền liệt, hoặc ung thư tuyến tiền liệt (đặc biệt khi PSA > 4 ng/mL). Cần khám chuyên khoa nam học.',
        low: 'Chỉ số bình thường (an toàn).'
    },
    'calcium': {
        name: 'Calci toàn phần (Canxi máu)',
        def: 'Đo lường tổng lượng canxi trong máu bao gồm canxi tự do và canxi liên kết với protein. Canxi đóng vai trò quan trọng trong xương, cơ và thần kinh.',
        high: 'Cảnh báo cường tuyến cận giáp, ngộ độc Vitamin D, các bệnh lý ác tính hủy xương hoặc suy thận. Gây mệt mỏi, sỏi thận, táo bón.',
        low: 'Cảnh báo thiếu Vitamin D, suy tuyến cận giáp, suy thận mãn tính hoặc chế độ ăn thiếu hụt canxi. Gây tê bì chân tay, co thắt cơ (tetany).'
    },
    'prolactin': {
        name: 'Prolactin (Nồng độ Prolactin máu)',
        def: 'Hormone do tuyến yên tiết ra, vai trò chính là kích thích sản xuất sữa mẹ sau sinh. Ở người không mang thai, nồng độ cao có thể ảnh hưởng đến sinh sản.',
        high: 'Có thể do u tuyến yên (prolactinoma), suy giáp, stress, hoặc do thuốc hại dạ dày/an thần. Gây vô sinh, rối loạn kinh nguyệt hoặc tiết sữa bất thường ở nữ; giảm ham muốn ở nam.',
        low: 'Rất hiếm gặp, có thể do suy tuyến yên toàn bộ hoặc sau chấn thương/phẫu thuật tuyến yên.'
    },
    'amh': {
        name: 'AMH (Dự trữ buồng trứng)',
        def: 'Hormone phản ánh số lượng nang noãn còn lại ở buồng trứng (dự trữ buồng trứng). Chỉ số quan trọng nhất đánh giá khả năng sinh sản của phụ nữ.',
        high: 'Thường gặp ở phụ nữ có hội chứng buồng trứng đa nang (PCOS) hoặc u hạt tế bào buồng trứng. Quá cao làm tăng nguy cơ hội chứng quá kích buồng trứng khi làm thụ tinh ống nghiệm.',
        low: 'Dự trữ buồng trứng suy giảm, báo hiệu sự suy giảm khả năng sinh sản hoặc mãn kinh sớm. Cần tư vấn bác sĩ chuyên khoa sớm nếu đang muốn sinh con.'
    },
    'ferritin': {
        name: 'Ferritin (Dự trữ sắt)',
        def: 'Một loại protein tế bào lưu trữ sắt và giải phóng nó một cách có kiểm soát. Chỉ số phản ánh chính xác nhất lượng sắt dự trữ trong cơ thể.',
        high: 'Có thể do thừa sắt (bệnh nhiễm sắc tố sắt), viêm nhiễm mãn tính, bệnh gan cấp/mãn tính, cường giáp, hoặc một số bệnh lý ác tính/huyết học.',
        low: 'Chỉ số nhạy nhất báo hiệu thiếu sắt (ngay cả trước khi xảy ra thiếu máu thiếu sắt). Cần bổ sung sắt qua chế độ ăn uống hoặc thuốc theo chỉ định bác sĩ.'
    },
    'iron': {
        name: 'Sắt huyết thanh (Sắt trong máu)',
        def: 'Lượng sắt tự do lưu thông trong huyết thanh, liên kết với transferrin. Cần thiết cho việc sản xuất huyết sắc tố trong hồng cầu.',
        high: 'Có thể do tan máu, ngộ độc sắt do uống quá liều, bệnh thừa sắt di truyền, hoặc truyền máu nhiều lần.',
        low: 'Thiếu hụt sắt do chế độ ăn nghèo nần, kém hấp thu ở ruột, hoặc mất máu mãn tính (ví dụ hành kinh nhiều, trĩ, viêm loét tiêu hóa). Gây mệt mỏi, thiếu máu.'
    },
    'bloodgroup': {
        name: 'Nhóm máu ABO và Rh(D)',
        def: 'Phân loại nhóm máu dựa trên các kháng nguyên trên bề mặt hồng cầu. Cần thiết và bắt buộc phải biết khi truyền máu, phẫu thuật hoặc quản lý thai sản.',
        high: 'Không áp dụng chỉ số cao/thấp cho nhóm máu. Đây là đặc tính sinh học cố định suốt đời.',
        low: 'Không áp dụng chỉ số cao/thấp cho nhóm máu. Đây là đặc tính sinh học cố định suốt đời.'
    },
    'nitrite': {
        name: 'Nitrite nước tiểu',
        def: 'Xét nghiệm gián tiếp tìm vi khuẩn đường niệu. Bình thường không có nitrite trong nước tiểu.',
        high: 'Dương tính (+): Cảnh báo mạnh mẽ tình trạng nhiễm trùng đường tiết niệu (UTI) do vi khuẩn (như E. coli) chuyển hóa nitrate thành nitrite. Cần đi khám để điều trị kháng sinh.',
        low: 'Âm tính (-): Trạng thái bình thường.'
    },
    'ascorbic_acid': {
        name: 'Ascorbic Acid (Vitamin C nước tiểu)',
        def: 'Nồng độ Vitamin C đào thải qua nước tiểu. Giúp đánh giá chế độ ăn uống và cảnh báo khả năng gây nhiễu các chỉ số xét nghiệm nước tiểu khác.',
        high: 'Nồng độ cao phản ánh chế độ ăn giàu Vitamin C hoặc uống thực phẩm bổ sung quá mức. Có thể gây nhiễu/âm tính giả cho một số xét nghiệm nước tiểu khác như glucose hay hồng cầu.',
        low: 'Âm tính hoặc nồng độ thấp là trạng thái bình thường.'
    },
    'pct': {
        name: 'PCT (Thể tích khối tiểu cầu)',
        def: 'Tỷ lệ thể tích mà tiểu cầu chiếm trong máu toàn phần, tương tự như Hct (Hematocrit) đối với hồng cầu.',
        high: 'Tăng nguy cơ hình thành cục máu đông gây tắc mạch, hoặc do tăng tiểu cầu thứ phát, phản ứng viêm/nhiễm trùng mãn tính.',
        low: 'Thường đi kèm giảm số lượng tiểu cầu (PLT), phản ánh tình trạng giảm sinh tiểu cầu ở tủy xương.'
    },
    'neutrophil_percent': {
        name: 'NEUT% (Tỷ lệ bạch cầu trung tính)',
        def: 'Tỷ lệ phần trăm bạch cầu trung tính trên tổng số bạch cầu. Đóng vai trò chủ chốt trong phản ứng miễn dịch chống vi khuẩn xâm nhập.',
        high: 'Nhiễm trùng vi khuẩn cấp tính (viêm phổi, viêm ruột thừa), viêm cấp, stress cơ thể nặng, hoặc chấn thương lớn.',
        low: 'Tăng nguy cơ nhiễm trùng nghiêm trọng do suy giảm chức năng tạo máu của tủy xương, nhiễm virus nặng hoặc suy giảm miễn dịch.'
    },
    'lymphocyte_percent': {
        name: 'LYM% (Tỷ lệ bạch cầu Lympho)',
        def: 'Tỷ lệ phần trăm bạch cầu lympho trên tổng số bạch cầu. Đóng vai trò chính trong miễn dịch chống virus và tế bào bất thường.',
        high: 'Cảnh báo nhiễm trùng do virus (ho gà, sởi, quai bị, sốt xuất huyết), hoặc các bệnh lý ác tính dòng lympho.',
        low: 'Suy giảm miễn dịch (như HIV), điều trị bằng corticoid liều cao kéo dài, hoặc sau hóa trị/xạ trị.'
    },
    'mxd_percent': {
        name: 'MXD% (Tỷ lệ bạch cầu hỗn hợp)',
        def: 'Tỷ lệ phần trăm nhóm 3 loại bạch cầu ít gặp (Bazo + Mono + Axit) trên tổng số bạch cầu.',
        high: 'Cảnh báo nhiễm ký sinh trùng (giun sán), phản ứng dị ứng nặng, hen suyễn, hoặc nhiễm trùng/viêm mãn tính lâu ngày.',
        low: 'Chỉ số thấp ít có ý nghĩa lâm sàng đặc hiệu trừ khi đi kèm suy giảm toàn bộ các dòng tế bào máu khác.'
    }
};

function getDictionaryKey(name) {
    if (!name) return null;
    const norm = name.toLowerCase().trim();
    
    if (norm.includes('glucose') || norm === 'đường huyết' || norm === 'duong huyet' || norm === 'glu') return 'glucose';
    if (norm.includes('hba1c')) return 'hba1c';
    if (norm.includes('insulin')) return 'insulin';
    if (norm.includes('hdl')) return 'hdl';
    if (norm.includes('ldl')) return 'ldl';
    if (norm.includes('cholesterol') || norm === 'mỡ máu' || norm === 'mo mau' || norm === 'cho') return 'cholesterol';
    if (norm.includes('triglycerid') || norm === 'tg') return 'triglycerides';
    if (norm.includes('ast') || norm.includes('sgot')) return 'ast';
    if (norm.includes('alt') || norm.includes('sgpt')) return 'alt';
    if (norm.includes('amylase') || norm === 'amy') return 'amylase';
    if (norm.includes('ggt') || norm.includes('gama gt') || norm.includes('gamma gt')) return 'ggt';
    if (norm.includes('bilirubin')) return 'bilirubin';
    if (norm.includes('albumin')) return 'albumin';
    if (norm === 'protein toàn phần' || norm === 'protein toan phan' || norm === 'total protein') return 'total protein';
    if (/\bure\b/.test(norm) || norm.includes('urê') || norm.includes('urea') || norm.includes('bun')) return 'ure';
    if (norm.includes('creatinin') || norm === 'cre' || norm === 'crea') return 'creatinine';
    if (norm.includes('egfr') || norm.includes('gfr') || norm.includes('mức lọc cầu thận') || norm.includes('muc loc cau than')) return 'egfr';
    if (norm.includes('uric') || norm === 'gút' || norm === 'gout' || norm === 'ua') return 'uric acid';
    if (norm.includes('psa') || norm.includes('tpsa')) return 'psa';
    if (norm.includes('calci') || norm.includes('calcium')) return 'calcium';
    if (norm.includes('rbc') || norm.includes('hồng cầu') || norm.includes('hong cau') || norm === 'hc' || norm === 'so luong hc' || norm === 'số lượng hc') return 'rbc';
    if (norm.includes('wbc') || norm.includes('bạch cầu') || norm.includes('bach cau') || norm === 'bc' || norm === 'so luong bc' || norm === 'số lượng bc') return 'wbc';
    if (norm.includes('plt') || norm.includes('tiểu cầu') || norm.includes('tieu cau') || norm === 'tc' || norm === 'so luong tc' || norm === 'số lượng tc') return 'plt';
    if (norm.includes('hemoglobin') || norm.includes('huyết sắc tố') || norm.includes('huyet sac to') || norm === 'hb') return 'hemoglobin';
    if (norm.includes('hematocrit') || norm.includes('hct')) return 'hematocrit';
    if (norm.includes('mcv')) return 'mcv';
    if (norm.includes('mchc')) return 'mchc';
    if (norm.includes('mch')) return 'mch';
    if (norm.includes('neutrophil') || norm.includes('neut') || norm.includes('neu') || norm === 'bc trung tính' || norm === 'bc trung tinh') {
        return (norm.includes('%') || norm.includes('tỷ lệ') || norm.includes('ty le')) ? 'neutrophil_percent' : 'neutrophil';
    }
    if (norm.includes('lympho') || norm.includes('lym')) {
        return (norm.includes('%') || norm.includes('tỷ lệ') || norm.includes('ty le')) ? 'lymphocyte_percent' : 'lymphocyte';
    }
    if (norm.includes('monocyte') || norm.includes('mono') || norm.includes('mon')) {
        return (norm.includes('%') || norm.includes('tỷ lệ') || norm.includes('ty le')) ? 'monocyte_percent' : 'monocyte';
    }
    if (norm.includes('eosinophil')) return 'eosinophil';
    if (norm.includes('basophil')) return 'basophil';
    if (norm.includes('tsh')) return 'tsh';
    if (norm.includes('t3') || norm.includes('ft3')) return 'ft3';
    if (norm.includes('t4') || norm.includes('ft4')) return 'ft4';
    if (norm.includes('crp')) return 'crp';
    if (norm.includes('ck-mb') || norm.includes('ckmb')) return 'ckmb';
    if (norm.includes('troponin')) return 'troponin';
    if (norm.includes('ph nước tiểu') || norm.includes('ph nuoc tieu')) return 'ph nuoc tieu';
    if (norm.includes('protein nước tiểu') || norm.includes('protein nuoc tieu') || norm.includes('albumin nước tiểu') || norm.includes('albumin nuoc tieu')) return 'protein nuoc tieu';
    if (norm.includes('glucose nước tiểu') || norm.includes('glucose nuoc tieu') || norm.includes('đường niệu') || norm.includes('duong nieu')) return 'glucose nuoc tieu';
    if (norm.includes('ketone') || norm.includes('ceton')) return 'ketone';
    if (norm.includes('hồng cầu niệu') || norm.includes('hong cau nieu') || norm.includes('erythrocytes')) return 'hong cau nieu';
    if (norm.includes('bạch cầu niệu') || norm.includes('bach cau nieu') || norm.includes('leukocyte')) return 'bach cau nieu';
    if (norm.includes('rdw')) return 'rdw';
    if (norm.includes('pdw')) return 'pdw';
    if (norm.includes('mpv')) return 'mpv';
    if (norm.includes('p-lcr') || norm.includes('plcr')) return 'p-lcr';
    if (norm.includes('mxd')) {
        return (norm.includes('%') || norm.includes('tỷ lệ') || norm.includes('ty le')) ? 'mxd_percent' : 'mxd';
    }
    if (norm.includes('kst sốt rét') || norm.includes('kst sot ret') || norm.includes('ký sinh trùng sốt rét') || norm.includes('ky sinh trung sot ret')) return 'kst sot ret';
    if (norm.includes('prolactin')) return 'prolactin';
    if (norm.includes('amh') || norm.includes('anti-mullerian') || norm.includes('anti-müllerian')) return 'amh';
    if (norm.includes('ferritin')) return 'ferritin';
    if (norm.includes('sắt huyết thanh') || norm.includes('sat huyet thanh') || norm === 'iron') return 'iron';
    if (norm.includes('nhóm máu') || norm.includes('nhom mau') || norm.includes('blood group') || norm.includes('bloodgroup')) return 'bloodgroup';
    if (norm.includes('nitrite')) return 'nitrite';
    if (norm.includes('ascorbic') || norm.includes('vitamin c') || norm.includes('ascorbate')) return 'ascorbic_acid';
    if (norm.includes('pct') || norm.includes('plateletcrit')) return 'pct';

    return null;
}

// ===========================
// 📄 XUẤT BÁO CÁO PDF
let cachedRobotoRegular = null;
let cachedRobotoBold = null;

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

async function loadRobotoFonts(doc) {
    if (!cachedRobotoRegular || !cachedRobotoBold) {
        const regularUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf';
        const boldUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf'; // Medium behaves well as bold
        
        const [resRegular, resBold] = await Promise.all([
            fetch(regularUrl).then(r => {
                if (!r.ok) throw new Error("Không thể tải Roboto-Regular từ CDN");
                return r.arrayBuffer();
            }),
            fetch(boldUrl).then(r => {
                if (!r.ok) throw new Error("Không thể tải Roboto-Medium từ CDN");
                return r.arrayBuffer();
            })
        ]);
        
        cachedRobotoRegular = arrayBufferToBase64(resRegular);
        cachedRobotoBold = arrayBufferToBase64(resBold);
    }
    
    doc.addFileToVFS('Roboto-Regular.ttf', cachedRobotoRegular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    
    doc.addFileToVFS('Roboto-Bold.ttf', cachedRobotoBold);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
}

async function exportHealthPDF() {
    const selectedProfileId = state.selectedHealthProfileId || 'all';
    const profile = (state.familyProfiles || []).find(p => p.id === selectedProfileId);
    const memberName = profile ? profile.name : 'Tất cả thành viên';

    if (typeof window.jspdf === 'undefined') {
        showToast('Thư viện PDF chưa tải xong, vui lòng thử lại!', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    // --- Try loading Vietnamese font ---
    try {
        showToast('Đang tải cấu hình font tiếng Việt cho PDF...', 'info');
        await loadRobotoFonts(doc);
        doc.setFont('Roboto', 'normal');
    } catch (err) {
        console.warn("Failed to load custom Vietnamese font, falling back to Helvetica:", err);
        showToast('Không thể tải font tiếng Việt, PDF sẽ dùng font mặc định không dấu.', 'warning');
        doc.setFont('helvetica', 'normal');
    }

    const isRoboto = doc.getFont().fontName === 'Roboto';
    const getTxt = (vi, en) => isRoboto ? vi : en;

    // --- Font & Color Setup ---
    const primaryColor = [16, 185, 129]; // Emerald
    const darkColor = [17, 24, 39];
    const grayColor = [107, 114, 128];
    const redColor = [239, 68, 68];
    const blueColor = [59, 130, 246];

    let y = 15;
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;
    const contentW = pageW - margin * 2;

    // Header gradient bar
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont(isRoboto ? 'Roboto' : 'helvetica', 'bold');
    doc.text(getTxt('FamiLife - Báo cáo Hồ sơ Sức khỏe', 'FamiLife - Bao Cao Ho So Suc Khoe'), margin, 13);
    doc.setFontSize(9);
    doc.setFont(isRoboto ? 'Roboto' : 'helvetica', 'normal');
    doc.text(getTxt(`Thành viên: ${memberName}   |   Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}   |   v${APP_VERSION}`, `Thanh vien: ${memberName}   |   Ngay xuat: ${new Date().toLocaleDateString('vi-VN')}   |   v${APP_VERSION}`), margin, 22);

    y = 38;

    // === BLOOD PRESSURE RECORDS ===
    const bpRecords = (state.bloodPressureRecords || [])
        .filter(r => !r.deleted_at && (selectedProfileId === 'all' || r.profileId === selectedProfileId))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (bpRecords.length > 0) {
        doc.setTextColor(...darkColor);
        doc.setFontSize(12);
        doc.setFont(isRoboto ? 'Roboto' : 'helvetica', 'bold');
        doc.setFillColor(254, 226, 226); // light red
        doc.rect(margin, y - 5, contentW, 10, 'F');
        doc.text(getTxt('LỊCH SỬ ĐO HUYẾT ÁP (Omron HEM-7361T)', 'LICH SU DO HUYET AP (Omron HEM-7361T)'), margin + 3, y + 1);
        y += 12;

        const bpRows = bpRecords.map(r => {
            const sysStatus = r.systolic >= 140 ? getTxt('CAO', 'CAO') : (r.systolic < 90 ? getTxt('THẤP', 'THAP') : getTxt('BT', 'BT'));
            const diaStatus = r.diastolic >= 90 ? getTxt('CAO', 'CAO') : (r.diastolic < 60 ? getTxt('THẤP', 'THAP') : getTxt('BT', 'BT'));
            const session = r.session === 'morning' ? getTxt('Sáng', 'Sang') : (r.session === 'evening' ? getTxt('Tối', 'Toi') : getTxt('Khác', 'Khac'));
            return [
                formatDate(r.date),
                session,
                `${r.systolic} mmHg (${sysStatus})`,
                `${r.diastolic} mmHg (${diaStatus})`,
                r.pulse ? `${r.pulse} bpm` : '-',
                r.notes || '-'
            ];
        });

        doc.autoTable({
            startY: y,
            head: [[getTxt('Ngày đo', 'Ngay do'), getTxt('Buổi', 'Buoi'), getTxt('Tâm thu (SYS)', 'Tam thu (SYS)'), getTxt('Tâm trương (DIA)', 'Tam truong (DIA)'), getTxt('Nhịp tim', 'Nhip tim'), getTxt('Ghi chú', 'Ghi chu')]],
            body: bpRows,
            margin: { left: margin, right: margin },
            styles: { font: isRoboto ? 'Roboto' : 'helvetica', fontSize: 8, cellPadding: 2 },
            headStyles: { font: isRoboto ? 'Roboto' : 'helvetica', fontStyle: 'bold', fillColor: redColor, textColor: 255 },
            alternateRowStyles: { fillColor: [255, 245, 245] },
            columnStyles: { 5: { cellWidth: 35 } }
        });
        y = doc.lastAutoTable.finalY + 10;
    }

    // === MEDICAL RECORDS ===
    const activeRecords = (state.medicalRecords || [])
        .filter(r => !r.deleted_at && (selectedProfileId === 'all' || (r.profileId || 'p-self') === selectedProfileId))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (activeRecords.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setTextColor(...darkColor);
        doc.setFontSize(12);
        doc.setFont(isRoboto ? 'Roboto' : 'helvetica', 'bold');
        doc.setFillColor(209, 250, 229); // light green
        doc.rect(margin, y - 5, contentW, 10, 'F');
        doc.text(getTxt('HỒ SƠ KẾT QUẢ XÉT NGHIỆM', 'HO SO KET QUA XET NGHIEM'), margin + 3, y + 1);
        y += 12;

        activeRecords.forEach(record => {
            if (y > 250) { doc.addPage(); y = 20; }

            doc.setFontSize(10);
            doc.setFont(isRoboto ? 'Roboto' : 'helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text(`• ${record.title || getTxt('Kết quả xét nghiệm', 'Ket qua xet nghiem')} — ${formatDate(record.date)}`, margin, y);
            y += 5;
            doc.setFontSize(8);
            doc.setFont(isRoboto ? 'Roboto' : 'helvetica', 'normal');
            doc.setTextColor(...grayColor);
            if (record.facility) doc.text(getTxt(`Cơ sở: ${record.facility}`, `Co so: ${record.facility}`), margin + 4, y);
            y += 4;
            if (record.notes) {
                doc.text(getTxt(`Kết luận: ${record.notes.substring(0, 120)}`, `Ket luan: ${record.notes.substring(0, 120)}`), margin + 4, y);
                y += 4;
            }

            if (record.indicators && record.indicators.length > 0) {
                const rows = record.indicators.map(ind => {
                    const status = ind.assessment === 'high' ? getTxt('CAO', 'CAO') : (ind.assessment === 'low' ? getTxt('THẤP', 'THAP') : getTxt('Bình thường', 'Binh thuong'));
                    return [ind.name, ind.value, ind.unit || '-', ind.refRange || '-', status];
                });
                doc.autoTable({
                    startY: y,
                    head: [[getTxt('Chỉ số', 'Chi so'), getTxt('Trị số', 'Tri so'), getTxt('Đơn vị', 'Don vi'), getTxt('Ngưỡng BT', 'Nguong BT'), getTxt('Đánh giá', 'Danh gia')]],
                    body: rows,
                    margin: { left: margin + 4, right: margin },
                    styles: { font: isRoboto ? 'Roboto' : 'helvetica', fontSize: 7.5, cellPadding: 1.5 },
                    headStyles: { font: isRoboto ? 'Roboto' : 'helvetica', fontStyle: 'bold', fillColor: primaryColor, textColor: 255 },
                    didParseCell: (data) => {
                        if (data.column.index === 4) {
                            const v = data.cell.text[0];
                            if (v === 'CAO') data.cell.styles.textColor = redColor;
                            else if (v === 'THẤP') data.cell.styles.textColor = blueColor;
                        }
                    }
                });
                y = doc.lastAutoTable.finalY + 6;
            } else {
                y += 4;
            }
        });
    }

    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setFont(isRoboto ? 'Roboto' : 'helvetica', 'normal');
        doc.setTextColor(...grayColor);
        doc.text(getTxt(`Trang ${i}/${totalPages} — Tạo bởi FamiLife v${APP_VERSION} — Chỉ mang tính chất tham khảo, không thay thế ý kiến bác sĩ.`, `Trang ${i}/${totalPages} — Tao boi FamiLife v${APP_VERSION} — Chi mang tinh chat tham khao, khong thay the y kien bac si.`), margin, doc.internal.pageSize.getHeight() - 8);
    }

    doc.save(`FamiLife_SucKhoe_${memberName.replace(/\s/g, '_')}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.pdf`);
    showToast('Đã xuất báo cáo PDF thành công!', 'success');
}

// ===========================
// 📷 CAMERA CAPTURE
// ===========================

// ===========================
// 📷 CAMERA — Dùng camera gốc thiết bị (native input[capture])
// ===========================

async function handleNativeCameraCapture(file) {
    if (!file) return;

    if (!state.geminiApiKey) {
        showToast('Vui lòng cấu hình Gemini API Key trước khi phân tích ảnh!', 'warning');
        return;
    }

    const overlay = document.getElementById('healthScannerLoadingOverlay');
    const statusText = document.getElementById('healthScannerStatusText');
    if (overlay) overlay.style.display = 'flex';
    if (statusText) statusText.innerText = 'Đang phân tích ảnh chụp bằng Gemini AI...';

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Data = e.target.result.split(',')[1];
            const mimeType = file.type || 'image/jpeg';
            try {
                const responseJson = await callGeminiAPI(base64Data, mimeType);
                if (overlay) overlay.style.display = 'none';
                openHealthEditModal(null, responseJson);
            } catch (err) {
                if (overlay) overlay.style.display = 'none';
                showToast('Phân tích ảnh thất bại: ' + err.message, 'error');
            }
        };
        reader.readAsDataURL(file);
    } catch (err) {
        if (overlay) overlay.style.display = 'none';
        showToast('Không thể đọc file ảnh: ' + err.message, 'error');
    }
}


// ===========================
// 💉 BLOOD PRESSURE CRUD
// ===========================

function getBpClassification(sys, dia) {
    if (sys >= 180 || dia >= 120) return { label: 'Khủng hoảng', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' };
    if (sys >= 140 || dia >= 90) return { label: 'Cao độ 2', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' };
    if (sys >= 130 || dia >= 80) return { label: 'Cao độ 1', color: '#f97316', bg: 'rgba(249,115,22,0.1)' };
    if (sys >= 120 && dia < 80) return { label: 'Tiền tăng HA', color: '#eab308', bg: 'rgba(234,179,8,0.1)' };
    if (sys >= 90 && dia >= 60) return { label: 'Bình thường', color: '#10b981', bg: 'rgba(16,185,129,0.1)' };
    return { label: 'Thấp', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' };
}

function renderBloodPressureSection() {
    const container = document.getElementById('bpRecordsList');
    if (!container) return;

    const selectedProfileId = state.selectedHealthProfileId || 'p-self';
    const records = (state.bloodPressureRecords || [])
        .filter(r => !r.deleted_at && (selectedProfileId === 'all' || r.profileId === selectedProfileId))
        .sort((a, b) => new Date(b.date + (b.session === 'morning' ? 'T06' : b.session === 'evening' ? 'T18' : 'T12')) - new Date(a.date + (a.session === 'morning' ? 'T06' : a.session === 'evening' ? 'T18' : 'T12')));

    if (records.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--text-muted); font-size: 0.85rem;">
                <i data-lucide="heart" style="width: 32px; height: 32px; opacity: 0.3; display: block; margin: 0 auto 8px;"></i>
                Chưa có chỉ số huyết áp nào. Nhấn "Thêm chỉ số" để bắt đầu theo dõi.
            </div>`;
        lucide.createIcons();
        return;
    }

    container.innerHTML = records.map(r => {
        const cls = getBpClassification(r.systolic, r.diastolic);
        const sessionLabel = r.session === 'morning' ? '🌅 Sáng' : (r.session === 'evening' ? '🌙 Tối' : '🕐 Khác');
        return `
        <div style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; border-left: 4px solid ${cls.color};">
            <div style="text-align: center; min-width: 56px;">
                <div style="font-size: 1.3rem; font-weight: 800; color: ${cls.color}; line-height: 1;">${r.systolic}</div>
                <div style="font-size: 0.65rem; color: var(--text-muted); margin: 1px 0;">───</div>
                <div style="font-size: 1.1rem; font-weight: 700; color: ${cls.color}; line-height: 1;">${r.diastolic}</div>
                <div style="font-size: 0.6rem; color: var(--text-muted);">mmHg</div>
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px;">
                    <span style="font-size: 0.72rem; background: ${cls.bg}; color: ${cls.color}; padding: 2px 8px; border-radius: 20px; font-weight: 600;">${cls.label}</span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">${sessionLabel}</span>
                    ${r.pulse ? `<span style="font-size: 0.72rem; color: var(--text-muted);">💓 ${r.pulse} bpm</span>` : ''}
                </div>
                <div style="font-size: 0.78rem; color: var(--text-secondary);">${formatDate(r.date)}${r.notes ? ` · ${r.notes}` : ''}</div>
            </div>
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
                <button onclick="openBpModal('${r.id}')" style="background: none; border: 1px solid var(--border-color); border-radius: 8px; padding: 5px 8px; cursor: pointer; color: var(--text-secondary); display: flex; align-items: center;" title="Sửa">
                    <i data-lucide="pencil" style="width: 13px; height: 13px;"></i>
                </button>
                <button onclick="deleteBpRecord('${r.id}')" style="background: none; border: 1px solid var(--border-color); border-radius: 8px; padding: 5px 8px; cursor: pointer; color: #ef4444; display: flex; align-items: center;" title="Xóa">
                    <i data-lucide="trash-2" style="width: 13px; height: 13px;"></i>
                </button>
            </div>
        </div>`;
    }).join('');
    lucide.createIcons();
}

function openBpModal(recordId = null) {
    const modal = document.getElementById('bpModal');
    if (!modal) return;

    // Populate profile select
    const profileSelect = document.getElementById('bpProfileSelect');
    if (profileSelect) {
        profileSelect.innerHTML = (state.familyProfiles || [{ id: 'p-self', name: 'Bản thân' }])
            .map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('');
        profileSelect.value = state.selectedHealthProfileId !== 'all' ? state.selectedHealthProfileId : 'p-self';
    }

    // Default date to today
    document.getElementById('bpDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('bpRecordId').value = '';
    document.getElementById('bpSystolic').value = '';
    document.getElementById('bpDiastolic').value = '';
    document.getElementById('bpPulse').value = '';
    document.getElementById('bpNotes').value = '';
    document.getElementById('bpSession').value = 'morning';

    if (recordId) {
        const rec = (state.bloodPressureRecords || []).find(r => r.id === recordId);
        if (rec) {
            document.getElementById('bpRecordId').value = rec.id;
            if (profileSelect) profileSelect.value = rec.profileId || 'p-self';
            document.getElementById('bpSystolic').value = rec.systolic;
            document.getElementById('bpDiastolic').value = rec.diastolic;
            document.getElementById('bpPulse').value = rec.pulse || '';
            document.getElementById('bpSession').value = rec.session || 'morning';
            document.getElementById('bpDate').value = rec.date;
            document.getElementById('bpNotes').value = rec.notes || '';
        }
    }

    modal.style.display = 'flex';
    lucide.createIcons();
}

function closeBpModal() {
    const modal = document.getElementById('bpModal');
    if (modal) modal.style.display = 'none';
}
window.closeBpModal = closeBpModal;

async function handleBpFormSubmit(e) {
    e.preventDefault();
    const sys = parseInt(document.getElementById('bpSystolic').value);
    const dia = parseInt(document.getElementById('bpDiastolic').value);
    if (!sys || !dia) {
        showToast('Vui lòng nhập đầy đủ tâm thu và tâm trương!', 'warning');
        return;
    }

    const recordId = document.getElementById('bpRecordId').value;
    const now = new Date().toISOString();
    const record = {
        id: recordId || 'bp-' + Date.now(),
        profileId: document.getElementById('bpProfileSelect').value || 'p-self',
        systolic: sys,
        diastolic: dia,
        pulse: parseInt(document.getElementById('bpPulse').value) || null,
        session: document.getElementById('bpSession').value,
        date: document.getElementById('bpDate').value || new Date().toISOString().split('T')[0],
        notes: document.getElementById('bpNotes').value.trim(),
        updated_at: now
    };

    if (recordId) {
        const idx = (state.bloodPressureRecords || []).findIndex(r => r.id === recordId);
        if (idx !== -1) state.bloodPressureRecords[idx] = record;
    } else {
        state.bloodPressureRecords = state.bloodPressureRecords || [];
        state.bloodPressureRecords.push(record);
    }
    state.bloodPressureRecordsUpdated = now;

    await saveLocalState();
    closeBpModal();
    renderBloodPressureSection();
    const cls = getBpClassification(sys, dia);
    showToast(`Đã lưu huyết áp ${sys}/${dia} mmHg (${cls.label})`, 'success');
}

async function deleteBpRecord(recordId) {
    if (!confirm('Xóa chỉ số huyết áp này?')) return;
    state.bloodPressureRecords = (state.bloodPressureRecords || []).filter(r => r.id !== recordId);
    state.bloodPressureRecordsUpdated = new Date().toISOString();
    await saveLocalState();
    renderBloodPressureSection();
    showToast('Đã xóa chỉ số huyết áp.', 'success');
}
window.openBpModal = openBpModal;
window.deleteBpRecord = deleteBpRecord;

// ===========================
// 🤖 CẬP NHẬT AI ANALYSIS — Tích hợp Huyết Áp
// ===========================

async function generateHealthAiAnalysisWithBP(forceFresh = false, mode = 'full') {
    if (!state.geminiApiKey) {
        showToast('Vui lòng cấu hình Gemini API Key trước!', 'warning');
        const popoverMenu = document.getElementById('geminiPopoverMenu');
        if (popoverMenu) popoverMenu.style.display = 'block';
        return;
    }

    const selectedProfileId = state.selectedHealthProfileId || 'all';
    if (selectedProfileId === 'all') {
        showToast('Vui lòng chọn một thành viên cụ thể để phân tích sức khỏe!', 'warning');
        return;
    }

    const activeRecords = (mode === 'bp_only') ? [] : (state.medicalRecords || [])
        .filter(r => !r.deleted_at && (r.profileId || 'p-self') === selectedProfileId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const bpRecords = (state.bloodPressureRecords || [])
        .filter(r => !r.deleted_at && r.profileId === selectedProfileId)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (activeRecords.length === 0 && bpRecords.length === 0) {
        showToast('Không có dữ liệu y tế hoặc huyết áp để phân tích!', 'warning');
        return;
    }

    const overlay = document.getElementById('healthScannerLoadingOverlay');
    const statusText = document.getElementById('healthScannerStatusText');
    if (overlay) overlay.style.display = 'flex';
    if (statusText) {
        statusText.innerText = mode === 'bp_only' 
            ? 'AI đang phân tích kết quả đo huyết áp...' 
            : 'AI đang tổng hợp xét nghiệm máu và huyết áp...';
    }

    try {
        const profile = (state.familyProfiles || []).find(p => p.id === selectedProfileId);
        const memberName = profile ? profile.name : 'Bản thân';

        let memberDetailsStr = '';
        if (profile) {
            memberDetailsStr += `=== THÔNG TIN THÀNH VIÊN ===\n`;
            memberDetailsStr += `- Tên: ${profile.name}\n`;
            if (profile.birthYear) memberDetailsStr += `- Năm sinh: ${profile.birthYear}\n`;
            if (profile.height) memberDetailsStr += `- Chiều cao: ${profile.height} cm\n`;
            if (profile.weight) memberDetailsStr += `- Cân nặng: ${profile.weight} kg\n`;
            if (profile.currentMedications) memberDetailsStr += `- Các loại thuốc đang uống: ${profile.currentMedications}\n`;
            if (profile.medicalHistory) memberDetailsStr += `- Tiền sử bệnh lý: ${profile.medicalHistory}\n`;
            memberDetailsStr += `\n`;
        }

        // Build blood test history string
        let bloodTestStr = '';
        if (activeRecords.length > 0) {
            activeRecords.forEach((r, idx) => {
                bloodTestStr += `--- XET NGHIEM ${idx + 1}: ${r.title} (${formatDate(r.date)}) ---\n`;
                bloodTestStr += `Co so: ${r.facility || 'Khong ro'}\n`;
                if (r.notes) bloodTestStr += `Ket luan bac si: ${r.notes}\n`;
                (r.indicators || []).forEach(ind => {
                    const a = ind.assessment === 'high' ? 'CAO' : (ind.assessment === 'low' ? 'THAP' : 'Binh thuong');
                    bloodTestStr += `  - ${ind.name}: ${ind.value} ${ind.unit || ''} [${ind.refRange || 'n/a'}] → ${a}\n`;
                });
                bloodTestStr += '\n';
            });
        }

        // Build blood pressure history string
        let bpStr = '';
        if (bpRecords.length > 0) {
            bpStr = '\n=== LICH SU HUYET AP (Omron HEM-7361T) ===\n';
            bpRecords.forEach(r => {
                const cls = getBpClassification(r.systolic, r.diastolic);
                const session = r.session === 'morning' ? 'sang' : (r.session === 'evening' ? 'toi' : 'khac');
                bpStr += `- ${formatDate(r.date)} (${session}): Tam thu ${r.systolic} mmHg / Tam truong ${r.diastolic} mmHg`;
                if (r.pulse) bpStr += ` / Nhip tim ${r.pulse} bpm`;
                bpStr += ` → ${cls.label}`;
                if (r.notes) bpStr += ` (${r.notes})`;
                bpStr += '\n';
            });
        }

        let prompt = '';
        if (mode === 'bp_only') {
            prompt = `Hãy đóng vai trò là một chuyên gia y tế và bác sĩ tim mạch cao cấp. Dưới đây là thông tin cá nhân và toàn bộ dữ liệu lịch sử huyết áp của thành viên "${memberName}":\n\n${memberDetailsStr}${bpStr}\n
Hãy lập một báo cáo phân tích xu hướng huyết áp bằng tiếng Việt ở định dạng Markdown. Báo cáo gồm các mục:

1. **Nhận định chung về Huyết Áp**: Đánh giá chỉ số huyết áp hôm nay và xu hướng qua lịch sử đo.
2. **Buổi đo (Sáng/Tối)**: Sự chênh lệch (nếu có) giữa các buổi và ý nghĩa y khoa.
3. **Mức độ kiểm soát & Nguy cơ Tim mạch**: Nhận định xem huyết áp đã được kiểm soát tốt chưa, các cảnh báo nguy cơ tim mạch liên quan.
4. **Lời khuyên chi tiết**:
   - Chế độ ăn uống giảm muối, dinh dưỡng tốt cho tim mạch.
   - Chế độ vận động, nghỉ ngơi phù hợp.
   - Khi nào cần tham vấn bác sĩ hoặc đi khám chuyên khoa ngay.

*Lưu ý: Không dùng ký hiệu LaTeX hay toán học. Cuối báo cáo nhắc đây là phân tích AI, cần tham vấn bác sĩ chuyên môn.*`;
        } else {
            prompt = `Hãy đóng vai trò là một chuyên gia y tế và bác sĩ tim mạch cao cấp. Dưới đây là thông tin cá nhân và toàn bộ dữ liệu sức khỏe của thành viên "${memberName}":\n\n${memberDetailsStr}${bloodTestStr}${bpStr}\n
Hãy lập một báo cáo phân tích sức khỏe TOÀN DIỆN bằng tiếng Việt ở định dạng Markdown. Báo cáo gồm các mục:

1. **Tổng quan tình trạng sức khỏe**: Nhận định chung về tình trạng sức khỏe tổng thể.

2. **Phân tích Huyết Áp** (nếu có dữ liệu):
   - Xu hướng huyết áp theo thời gian (sáng/tối)
   - Mức độ kiểm soát huyết áp hiện tại
   - Nguy cơ tim mạch liên quan

3. **Phân tích Kết quả Xét nghiệm Máu** (nếu có dữ liệu):
   - Các chỉ số bất thường cần chú ý
   - Xu hướng thay đổi qua thời gian

4. **Mối liên hệ giữa Huyết Áp và Xét nghiệm Máu**:
   - Phân tích tổng hợp nguy cơ tim mạch, mỡ máu, đường huyết...

5. **Cảnh báo và Khuyến nghị**:
   - Chế độ ăn uống phù hợp
   - Vận động thể chất
   - Khi nào cần gặp bác sĩ ngay

*Lưu ý: Không dùng ký hiệu LaTeX hay toán học. Cuối báo cáo nhắc đây là phân tích AI, cần tham vấn bác sĩ chuyên môn.*`;
        }

        const textResponse = await callGeminiTextAPI(prompt, 'gemini-2.5-flash');

        const nowIso = new Date().toISOString();
        if (profile) {
            if (mode === 'bp_only') {
                profile.lastBpAnalysis = textResponse;
                profile.lastBpAnalysisDate = nowIso;
                profile.lastBpAnalysisUpdated = nowIso;
                if (selectedProfileId === 'p-self') {
                    state.lastBpAnalysis = textResponse;
                    state.lastBpAnalysisDate = nowIso;
                    state.lastBpAnalysisUpdated = nowIso;
                }
            } else {
                profile.lastAiAnalysis = textResponse;
                profile.lastAiAnalysisDate = nowIso;
                profile.lastAiAnalysisUpdated = nowIso;
                if (selectedProfileId === 'p-self') {
                    state.lastAiAnalysis = textResponse;
                    state.lastAiAnalysisDate = nowIso;
                    state.lastAiAnalysisUpdated = nowIso;
                }
            }
        }
        state.familyProfilesUpdated = nowIso;
        await saveLocalState();

        if (overlay) overlay.style.display = 'none';
        renderHealthAiReport();
        showToast(mode === 'bp_only' ? 'Đã phân tích kết quả huyết áp thành công!' : 'Đã phân tích sức khỏe toàn diện (xét nghiệm máu + huyết áp) thành công!', 'success');
        
        performSync(true);

    } catch (err) {
        if (overlay) overlay.style.display = 'none';
        showToast('Phân tích AI thất bại: ' + err.message, 'error');
    }
}

// ===========================
// 🔌 Event Listeners — Mới
// ===========================

document.addEventListener('DOMContentLoaded', () => {
    // Camera: native input[capture] — dùng camera gốc thiết bị
    const cameraInput = document.getElementById('healthCameraInput');
    if (cameraInput) {
        cameraInput.addEventListener('change', (e) => {
            const file = e.target.files && e.target.files[0];
            if (file) handleNativeCameraCapture(file);
            // Reset input để có thể chụp lại ảnh mới lần sau
            e.target.value = '';
        });
    }

    // PDF export button
    const pdfBtn = document.getElementById('exportHealthPdfBtn');
    if (pdfBtn) pdfBtn.addEventListener('click', exportHealthPDF);

    // Speak button
    const speakBtn = document.getElementById('speakHealthAiAnalysisBtn');
    if (speakBtn) speakBtn.addEventListener('click', toggleSpeech);

    // Blood pressure add button
    const addBpBtn = document.getElementById('addBpBtn');
    if (addBpBtn) addBpBtn.addEventListener('click', () => openBpModal());

    // Blood pressure form submit
    const bpForm = document.getElementById('bpForm');
    if (bpForm) bpForm.addEventListener('submit', handleBpFormSubmit);

    // Blood pressure analysis choice modal buttons
    document.getElementById('analyzeBpOnlyBtn')?.addEventListener('click', async () => {
        document.getElementById('healthBpAnalysisChoiceModal').style.display = 'none';
        openHealthAiAnalysisModal('bp');
        await generateHealthAiAnalysisWithBP(true, 'bp_only');
    });

    document.getElementById('analyzeBpAndAllBtn')?.addEventListener('click', async () => {
        document.getElementById('healthBpAnalysisChoiceModal').style.display = 'none';
        openHealthAiAnalysisModal('full');
        await generateHealthAiAnalysisWithBP(true, 'full');
    });

    document.getElementById('closeBpChoiceModalBtn')?.addEventListener('click', () => {
        document.getElementById('healthBpAnalysisChoiceModal').style.display = 'none';
    });

    // Blood pressure card analysis button
    document.getElementById('bpAiAnalysisBtn')?.addEventListener('click', () => {
        openHealthAiAnalysisModal('bp');
    });

    // Speech voice selector change
    document.getElementById('healthSpeechVoiceSelect')?.addEventListener('change', (e) => {
        state.selectedSpeechVoiceName = e.target.value;
        saveLocalState();
        
        const rateSelect = document.getElementById('healthSpeechRateSelect');
        if (rateSelect) {
            rateSelect.style.display = e.target.value === 'google-translate' ? 'none' : 'inline-flex';
        }
    });

    // Speech rate selector change
    document.getElementById('healthSpeechRateSelect')?.addEventListener('change', (e) => {
        state.selectedSpeechRate = parseFloat(e.target.value) || 1.0;
        saveLocalState();
    });

    // Voice loaded event
    if (window.speechSynthesis) {
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoiceList;
        }
    }
});


function updateIndicatorExplanation(indicatorName) {
    const infoBox = document.getElementById('healthIndicatorInfoBox');
    const nameEl = document.getElementById('infoIndicatorName');
    const defEl = document.getElementById('infoIndicatorDef');
    const highEl = document.getElementById('infoIndicatorHigh');
    const lowEl = document.getElementById('infoIndicatorLow');
    const highCont = document.getElementById('infoHighContainer');
    const lowCont = document.getElementById('infoLowContainer');

    if (!infoBox || !nameEl || !defEl || !highEl || !lowEl) return;

    if (!indicatorName) {
        infoBox.style.display = 'none';
        return;
    }

    let dictKey = null;
    if (HEALTH_INDICATORS_DICTIONARY[indicatorName]) {
        dictKey = indicatorName;
    } else {
        dictKey = getDictionaryKey(indicatorName);
    }

    if (!dictKey || !HEALTH_INDICATORS_DICTIONARY[dictKey]) {
        infoBox.style.display = 'none';
        return;
    }

    const info = HEALTH_INDICATORS_DICTIONARY[dictKey];
    nameEl.textContent = info.name;
    defEl.textContent = info.def;

    if (info.high) {
        highCont.style.display = 'block';
        highEl.textContent = info.high;
    } else {
        highCont.style.display = 'none';
    }

    if (info.low) {
        lowCont.style.display = 'block';
        lowEl.textContent = info.low;
    } else {
        lowCont.style.display = 'none';
    }

    infoBox.style.display = 'flex';
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function updateIndicatorProgress() {
    const select = document.getElementById('healthChartIndicatorSelect');
    const progressBar = document.getElementById('indicatorProgressBar');
    const progressText = document.getElementById('indicatorProgressText');
    const prevBtn = document.getElementById('prevIndicatorBtn');
    const nextBtn = document.getElementById('nextIndicatorBtn');

    if (!select) return;

    const total = select.options.length;
    const current = total > 0 ? select.selectedIndex + 1 : 0;

    // Update progress text
    if (progressText) {
        progressText.textContent = `${current}/${total}`;
    }

    // Update progress bar width
    if (progressBar) {
        const pct = total > 0 ? (current / total) * 100 : 0;
        progressBar.style.width = `${pct}%`;
    }

    // Enable/disable navigation buttons based on boundaries
    if (prevBtn) {
        if (select.selectedIndex <= 0) {
            prevBtn.disabled = true;
            prevBtn.style.opacity = '0.35';
            prevBtn.style.cursor = 'not-allowed';
            prevBtn.style.pointerEvents = 'none';
        } else {
            prevBtn.disabled = false;
            prevBtn.style.opacity = '1';
            prevBtn.style.cursor = 'pointer';
            prevBtn.style.pointerEvents = 'auto';
        }
    }

    if (nextBtn) {
        if (select.selectedIndex >= total - 1 || total === 0) {
            nextBtn.disabled = true;
            nextBtn.style.opacity = '0.35';
            nextBtn.style.cursor = 'not-allowed';
            nextBtn.style.pointerEvents = 'none';
        } else {
            nextBtn.disabled = false;
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
            nextBtn.style.pointerEvents = 'auto';
        }
    }
}

// Prevent double-tap zoom globally on mobile for non-interactive elements (like text, divs, spans)
(function() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
            // Check if the tapped element or any of its parents is interactive
            const isInteractive = e.target.closest('button, input, select, textarea, a, [role="button"]');
            if (!isInteractive) {
                e.preventDefault();
            }
        }
        lastTouchEnd = now;
    }, { passive: false });
})();


export { initHealthBindings, renderHealthDashboard, updateProfileDropdowns };
