/* MotoCare - Tích hợp vào FamiLife (v4.3.202) */
import { Vehicles, MaintenanceLogs, FuelLogs, Presets, Stats, DataPortability, AI } from './db.js?v=4.3.241';
import { UI } from './ui.js?v=4.3.241';

// Application State (Độc lập với FamiLife state)
const state = {
    currentView: 'dashboard',
    activeVehicleId: null,
    presetsEditMode: false,
    maintHistoryEditMode: false,
    initialized: false
};

// Sub-Navigation (thay thế hash routing bằng CSS class switching)
function switchMotocareView(viewName) {
    console.log(`[BUG DETECTOR] switchMotocareView called: target view = "${viewName}", activeVehicleId = "${state.activeVehicleId}"`);
    const validViews = ['dashboard', 'fuel', 'history', 'settings'];
    if (!validViews.includes(viewName)) viewName = 'dashboard';
    state.currentView = viewName;
    window._currentMotocareView = viewName;

    // Ẩn/hiện panels nội bộ
    validViews.forEach(v => {
        const el = document.getElementById(`motocare-view-${v}`);
        if (el) el.style.display = (v === viewName) ? 'block' : 'none';
    });

    // Cập nhật active class trên mobile navbar
    const mobileNavButtons = document.querySelectorAll('#mobileNavbar .mobile-navbar-right .nav-icon-btn');
    mobileNavButtons.forEach(btn => {
        const title = btn.getAttribute('title') || btn.innerText.trim();
        const map = { 'Tổng quan': 'dashboard', 'Đổ xăng': 'fuel', 'Lịch sử': 'history', 'Cài đặt': 'settings', 'Quản lý': 'settings' };
        if (map[title] === viewName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Cập nhật active class trên desktop sidebar
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        const linkTab = link.getAttribute('data-tab');
        const viewTabMap = {
            'dashboard': 'motocare',
            'fuel': 'motocare-fuel',
            'history': 'motocare-history',
            'settings': 'motocare-settings'
        };
        if (linkTab === viewTabMap[viewName] || (viewName === 'dashboard' && linkTab === 'motocare-dashboard')) {
            link.classList.add('active');
        } else if (linkTab && (linkTab === 'motocare' || linkTab.startsWith('motocare-'))) {
            link.classList.remove('active');
        }
    });

    // Render lại dữ liệu
    App.renderAll();
    console.log(`[BUG DETECTOR] switchMotocareView finished rendering view = "${viewName}"`);
}

// Export ngay lập tức lên window
window.switchMotocareView = switchMotocareView;

const App = {
    renderAll() {
        const vId = state.activeVehicleId;
        UI.renderHeaderVehicleSelector();
        UI.renderDashboard(vId);
        UI.renderVehiclesList();
        UI.renderFuelTracker(vId);
        UI.renderHistory(vId, document.getElementById('mc-filter-maint-category')?.value || 'all', state.maintHistoryEditMode);
        UI.renderPresetsSettings(vId, state.presetsEditMode);

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    },

    initEvents() {
        // Sub navigation buttons
        document.querySelectorAll('.motocare-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.getAttribute('data-motocare-view');
                if (view) switchMotocareView(view);
            });
        });

        // 1. Vehicle Selection Change
        document.getElementById('mc-active-vehicle-select')?.addEventListener('change', (e) => {
            const id = e.target.value;
            if (id) {
                Vehicles.setActiveId(id);
                state.activeVehicleId = id;
                window._motocareShowToast('Đã đổi sang xe hoạt động!');
                this.renderAll();
            }
        });

        // 2. Dashboard - Update Odometer
        const btnUpdateOdo = document.getElementById('mc-btn-update-odo');
        btnUpdateOdo?.addEventListener('click', () => {
            const vId = state.activeVehicleId;
            if (!vId) { window._motocareShowToast('Vui lòng chọn hoặc thêm xe máy trước!', 'warning'); return; }
            const odoInput = document.getElementById('mc-current-odo-input');
            const newOdo = parseInt(odoInput.value);
            const res = Vehicles.updateOdo(vId, newOdo);
            if (res.success) {
                const originalText = btnUpdateOdo.innerHTML;
                btnUpdateOdo.innerHTML = '✓ Đã lưu!';
                btnUpdateOdo.style.backgroundColor = '#10b981';
                btnUpdateOdo.style.color = '#ffffff';
                setTimeout(() => {
                    btnUpdateOdo.innerHTML = originalText;
                    btnUpdateOdo.style.backgroundColor = '';
                    btnUpdateOdo.style.color = '';
                }, 1200);

                window._motocareShowToast('Cập nhật ODO thành công lên ' + newOdo.toLocaleString() + ' Km!', 'success');
                this.renderAll();
            } else {
                window._motocareShowToast(res.error, 'danger');
                const currentVeh = Vehicles.getById(vId);
                if (currentVeh) odoInput.value = currentVeh.currentOdo;
            }
        });

        // 3. Quick Action Buttons
        document.getElementById('mc-btn-quick-fuel')?.addEventListener('click', () => this.openModal('fuel'));
        document.getElementById('mc-btn-quick-maintenance')?.addEventListener('click', () => this.openModal('maintenance'));
        document.getElementById('mc-btn-quick-oil-change')?.addEventListener('click', async () => {
            const vId = state.activeVehicleId;
            const vehicle = vId ? Vehicles.getById(vId) : null;
            if (!vehicle) {
                window._motocareShowToast('Vui lòng thêm hoặc chọn xe máy trước khi ghi nhận thay dầu máy!', 'warning');
                this.openModal('vehicle');
                return;
            }
            const confirmed = window.showConfirm 
                ? await window.showConfirm(`Bạn muốn ghi nhận THAY DẦU MÁY cho xe ${vehicle.name} ở số Km hiện tại (${vehicle.currentOdo.toLocaleString()} Km) chứ?`, 'Ghi nhận Thay Dầu Máy')
                : confirm(`Bạn muốn ghi nhận THAY DẦU MÁY cho xe ${vehicle.name} ở số Km hiện tại (${vehicle.currentOdo.toLocaleString()} Km) chứ?`);
            if (confirmed) {
                MaintenanceLogs.add({
                    vehicleId: vId,
                    date: new Date().toISOString().split('T')[0],
                    odo: vehicle.currentOdo,
                    category: 'oil_engine',
                    cost: 0,
                    notes: 'Thay dầu nhanh từ Dashboard'
                });
                window._motocareShowToast('Đã lưu lịch sử thay dầu máy!');
                this.renderAll();
            }
        });

        // 4. Modal Open/Close
        document.getElementById('mc-btn-add-vehicle')?.addEventListener('click', () => this.openModal('vehicle'));
        document.getElementById('mc-btn-close-modal-vehicle')?.addEventListener('click', () => this.closeModal('vehicle'));
        document.getElementById('mc-btn-cancel-vehicle')?.addEventListener('click', () => this.closeModal('vehicle'));

        document.getElementById('mc-btn-add-fuel')?.addEventListener('click', () => this.openModal('fuel'));
        document.getElementById('mc-btn-close-modal-fuel')?.addEventListener('click', () => this.closeModal('fuel'));
        document.getElementById('mc-btn-cancel-fuel')?.addEventListener('click', () => this.closeModal('fuel'));

        document.getElementById('mc-btn-add-maintenance')?.addEventListener('click', () => this.openModal('maintenance'));
        document.getElementById('mc-btn-close-modal-maintenance')?.addEventListener('click', () => this.closeModal('maintenance'));
        document.getElementById('mc-btn-cancel-maintenance')?.addEventListener('click', () => this.closeModal('maintenance'));

        document.getElementById('mc-btn-close-modal-preset')?.addEventListener('click', () => this.closeModal('preset'));
        document.getElementById('mc-btn-cancel-preset')?.addEventListener('click', () => this.closeModal('preset'));

        document.getElementById('mc-btn-close-modal-ai-doctor')?.addEventListener('click', () => this.closeModal('ai-doctor'));
        document.getElementById('mc-btn-close-ai-doctor')?.addEventListener('click', () => this.closeModal('ai-doctor'));

        document.getElementById('mc-btn-close-modal-ai-presets')?.addEventListener('click', () => this.closeModal('ai-presets'));
        document.getElementById('mc-btn-cancel-ai-presets')?.addEventListener('click', () => this.closeModal('ai-presets'));

        // Backdrop click to close modals
        ['vehicle', 'fuel', 'maintenance', 'preset', 'ai-doctor', 'ai-presets'].forEach(mType => {
            const overlay = document.getElementById(`mc-modal-${mType}`);
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        this.closeModal(mType);
                    }
                });
            }
        });

        // 5. AI Doctor consultation (Uses FamiLife Global Gemini Key)
        document.getElementById('mc-btn-consult-ai')?.addEventListener('click', async () => {
            const vId = state.activeVehicleId;
            if (!vId) { window._motocareShowToast('Vui lòng chọn hoặc thêm xe máy trước!', 'danger'); return; }
            const apiKey = AI.getKey();
            if (!apiKey) {
                window._motocareShowToast('Vui lòng nhập Google Gemini API Key trong mục Cài Đặt chung của FamiLife để sử dụng!', 'warning');
                return;
            }
            this.openModal('ai-doctor');
            const loadingEl = document.getElementById('mc-ai-loading');
            const contentEl = document.getElementById('mc-ai-result-content');
            if (loadingEl && contentEl) {
                loadingEl.classList.remove('hidden');
                contentEl.classList.add('hidden');
                contentEl.innerHTML = '';
                try {
                    const prompt = AI.generateConsultationPrompt(vId);
                    const resultHtml = await AI.callGeminiTextAPI(prompt);
                    loadingEl.classList.add('hidden');
                    contentEl.classList.remove('hidden');
                    contentEl.innerHTML = resultHtml;
                } catch (err) {
                    loadingEl.classList.add('hidden');
                    contentEl.classList.remove('hidden');
                    contentEl.innerHTML = `<div style="color:var(--color-danger);padding:20px;text-align:center;"><h4>⚠️ Lỗi kết nối Gemini AI</h4><p style="margin-top:10px;font-size:0.9rem;">${err.message || 'Không thể lấy phản hồi từ Gemini API.'}</p></div>`;
                }
            }
        });

        // 6. Presets Edit Toggle & AI Optimizer for Current Vehicle
        document.getElementById('mc-btn-toggle-presets-edit')?.addEventListener('click', () => {
            state.presetsEditMode = !state.presetsEditMode;
            UI.renderPresetsSettings(state.activeVehicleId, state.presetsEditMode);
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        });

        let currentAiProposedPresets = null;
        document.getElementById('mc-btn-ai-optimize-presets')?.addEventListener('click', async () => {
            const vId = state.activeVehicleId;
            const vehicle = vId ? Vehicles.getById(vId) : null;
            if (!vehicle) {
                window._motocareShowToast('Vui lòng chọn hoặc thêm xe máy trước khi tối ưu định mức!', 'warning');
                return;
            }
            const apiKey = AI.getKey();
            if (!apiKey) {
                window._motocareShowToast('Vui lòng nhập Google Gemini API Key trong mục Cài Đặt chung của FamiLife để sử dụng!', 'warning');
                return;
            }

            this.openModal('ai-presets');
            const loadingEl = document.getElementById('mc-ai-presets-loading');
            const contentEl = document.getElementById('mc-ai-presets-result-content');
            const applyBtn = document.getElementById('mc-btn-apply-ai-presets');
            const loadingText = document.getElementById('mc-ai-presets-loading-text');

            if (loadingText) loadingText.innerText = `Gemini AI đang tra cứu sổ tay bảo dưỡng cho xe ${vehicle.name}...`;
            if (applyBtn) applyBtn.style.display = 'none';

            if (loadingEl && contentEl) {
                loadingEl.classList.remove('hidden');
                contentEl.classList.add('hidden');
                contentEl.innerHTML = '';
                try {
                    const prompt = AI.generatePresetOptimizationPrompt(vId);
                    const rawResponse = await AI.callGeminiTextAPI(prompt);

                    // Parse JSON safely
                    let jsonStr = rawResponse.trim();
                    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7);
                    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3);
                    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3);
                    jsonStr = jsonStr.trim();

                    const aiData = JSON.parse(jsonStr);
                    currentAiProposedPresets = aiData;

                    const currentPresets = Presets.getForVehicle(vId);

                    let html = `
                        <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.08), rgba(99, 102, 241, 0.04)); border: 1px solid rgba(124, 58, 237, 0.2); border-radius: 12px; padding: 14px 18px; margin-bottom: 18px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;">
                                <div style="font-weight: 700; font-size: 1rem; color: #7c3aed;">
                                    🎯 Nhận diện dòng xe: <strong>${aiData.vehicleModel || vehicle.name}</strong>
                                </div>
                                <span style="font-size: 0.75rem; background: rgba(124, 58, 237, 0.15); color: #7c3aed; padding: 3px 10px; border-radius: 12px; font-weight: 600;">Chuẩn hóa bởi AI</span>
                            </div>
                            <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.45;">${aiData.advice || 'Định mức bảo dưỡng được tối ưu dựa trên loại truyền động và điều kiện vận hành tại Việt Nam.'}</p>
                        </div>

                        <div style="margin-bottom: 12px;">
                            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 10px; color: var(--text-primary);">Bảng so sánh định mức chi tiết:</h4>
                            <div style="overflow-x: auto;">
                                <table class="data-table" style="width: 100%; font-size: 0.85rem;">
                                    <thead>
                                        <tr>
                                            <th style="padding: 10px 12px;">Hạng mục phụ tùng</th>
                                            <th style="padding: 10px 12px; text-align: center;">Hiện tại</th>
                                            <th style="padding: 10px 12px; text-align: center; color: #7c3aed;">AI Đề xuất</th>
                                            <th style="padding: 10px 12px;">Khuyến nghị từ AI</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                    `;

                    Object.entries(aiData.items || {}).forEach(([key, item]) => {
                        const curr = currentPresets[key];
                        if (!curr) return;
                        const isKmChanged = curr.intervalKm !== item.km;
                        const isMonthsChanged = curr.intervalMonths !== item.months;

                        html += `
                            <tr>
                                <td style="padding: 10px 12px; font-weight: 600;">${curr.name}</td>
                                <td style="padding: 10px 12px; text-align: center; color: var(--text-secondary);">
                                    ${curr.intervalKm.toLocaleString()} Km<br><small>${curr.intervalMonths} tháng</small>
                                </td>
                                <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: ${(isKmChanged || isMonthsChanged) ? '#7c3aed' : 'var(--color-success)'};">
                                    ${item.km.toLocaleString()} Km<br><small>${item.months} tháng</small>
                                    ${(isKmChanged || isMonthsChanged) ? '<span style="display:inline-block;margin-left:4px;font-size:0.75rem;color:#7c3aed;">★</span>' : ''}
                                </td>
                                <td style="padding: 10px 12px; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.35;">
                                    ${item.reason || 'Định mức khuyến nghị chuẩn theo xe'}
                                </td>
                            </tr>
                        `;
                    });

                    html += `
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    `;

                    loadingEl.classList.add('hidden');
                    contentEl.classList.remove('hidden');
                    contentEl.innerHTML = html;
                    if (applyBtn) applyBtn.style.display = 'inline-block';
                } catch (err) {
                    console.error('[MotoCare AI Presets Error]', err);
                    loadingEl.classList.add('hidden');
                    contentEl.classList.remove('hidden');
                    contentEl.innerHTML = `<div style="color:var(--color-danger);padding:20px;text-align:center;"><h4>⚠️ Lỗi phân tích định mức AI</h4><p style="margin-top:10px;font-size:0.9rem;">${err.message || 'Không thể tạo định mức bảo dưỡng từ Gemini API.'}</p></div>`;
                }
            }
        });

        // Apply AI Presets
        document.getElementById('mc-btn-apply-ai-presets')?.addEventListener('click', () => {
            const vId = state.activeVehicleId;
            const vehicle = vId ? Vehicles.getById(vId) : null;
            if (!vehicle || !currentAiProposedPresets || !currentAiProposedPresets.items) return;

            Presets.saveAllForVehicle(vId, currentAiProposedPresets.items);

            window._motocareShowToast(`Đã áp dụng định mức bảo dưỡng AI cho xe ${vehicle.name}!`, 'success');
            this.closeModal('ai-presets');
            this.renderAll();
        });

        // 7. Form Submissions
        document.getElementById('mc-form-vehicle')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('mc-vehicle-id').value;
            const name = document.getElementById('mc-vehicle-name').value;
            const plate = document.getElementById('mc-vehicle-plate').value;
            const type = document.getElementById('mc-vehicle-type').value;
            const odo = parseInt(document.getElementById('mc-vehicle-odo').value) || 0;
            const buyDate = document.getElementById('mc-vehicle-buy-date').value;
            if (id) {
                Vehicles.update({ id, name, plate, type, currentOdo: odo, buyDate });
                window._motocareShowToast('Cập nhật thông tin xe thành công!');
            } else {
                const newVeh = Vehicles.add({ name, plate, type, currentOdo: odo, buyDate });
                state.activeVehicleId = newVeh.id;
                window._motocareShowToast('Đã thêm xe mới!');
            }
            this.closeModal('vehicle');
            this.renderAll();
        });

        document.getElementById('mc-form-fuel')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const date = document.getElementById('mc-fuel-date').value;
            const odo = parseInt(document.getElementById('mc-fuel-odo').value) || 0;
            const liters = parseFloat(document.getElementById('mc-fuel-liters').value) || 0;
            const cost = parseInt(document.getElementById('mc-fuel-cost').value) || 0;
            const full = document.getElementById('mc-fuel-full').checked;
            FuelLogs.add({ vehicleId: state.activeVehicleId, date, odo, liters, cost, full });
            window._motocareShowToast('Ghi nhận đổ xăng thành công!');
            this.closeModal('fuel');
            this.renderAll();
        });

        document.getElementById('mc-form-maintenance')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('mc-maint-log-id').value;
            const date = document.getElementById('mc-maint-date').value;
            const odo = parseInt(document.getElementById('mc-maint-odo').value) || 0;
            const notes = document.getElementById('mc-maint-notes').value;

            if (id) {
                const category = document.getElementById('mc-maint-category').value;
                const cost = parseInt(document.getElementById('mc-maint-cost').value) || 0;
                MaintenanceLogs.update({ id, vehicleId: state.activeVehicleId, date, odo, category, cost, notes });
                window._motocareShowToast('Cập nhật lịch sử bảo dưỡng thành công!');
            } else {
                const checkedBoxes = document.querySelectorAll('.mc-maint-check-input:checked');
                if (checkedBoxes.length === 0) {
                    window._motocareShowToast('Vui lòng tick chọn ít nhất 1 hạng mục bảo dưỡng!', 'warning');
                    return;
                }

                const logsToSave = [];
                checkedBoxes.forEach(chk => {
                    const category = chk.getAttribute('data-category');
                    const costInput = document.querySelector(`.mc-maint-item-cost[data-category="${category}"]`);
                    const cost = costInput ? (parseInt(costInput.value) || 0) : 0;
                    logsToSave.push({
                        vehicleId: state.activeVehicleId,
                        date,
                        odo,
                        category,
                        cost,
                        notes
                    });
                });

                MaintenanceLogs.addAll(logsToSave);
                window._motocareShowToast(`Đã lưu thành công ${logsToSave.length} hạng mục bảo dưỡng!`);
            }
            this.closeModal('maintenance');
            this.renderAll();
        });

        document.getElementById('mc-form-preset')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const key = document.getElementById('mc-preset-key').value;
            const km = parseInt(document.getElementById('mc-preset-interval-km').value) || 0;
            const months = parseInt(document.getElementById('mc-preset-interval-months').value) || 0;
            Presets.saveForVehicle(state.activeVehicleId, key, km, months);
            window._motocareShowToast('Đã cập nhật định mức bảo dưỡng!');
            this.closeModal('preset');
            this.renderAll();
        });

        // 8. Maintenance filter & Edit Mode Toggle
        document.getElementById('mc-filter-maint-category')?.addEventListener('change', (e) => {
            UI.renderHistory(state.activeVehicleId, e.target.value, state.maintHistoryEditMode);
        });

        document.getElementById('mc-btn-toggle-maint-edit')?.addEventListener('click', () => {
            state.maintHistoryEditMode = !state.maintHistoryEditMode;
            const filterVal = document.getElementById('mc-filter-maint-category')?.value || 'all';
            UI.renderHistory(state.activeVehicleId, filterVal, state.maintHistoryEditMode);
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        });

        // 9. Click delegation cho dynamic items
        const tabPanel = document.getElementById('tab-motocare');
        tabPanel?.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-set-active')) {
                const id = e.target.getAttribute('data-id');
                Vehicles.setActiveId(id);
                state.activeVehicleId = id;
                window._motocareShowToast('Đã chọn làm xe chính!');
                this.renderAll();
            }
            if (e.target.classList.contains('btn-edit-vehicle')) {
                const veh = Vehicles.getById(e.target.getAttribute('data-id'));
                if (veh) this.openModal('vehicle', veh);
            }
            if (e.target.classList.contains('btn-delete-vehicle')) {
                const id = e.target.getAttribute('data-id');
                const veh = Vehicles.getById(id);
                if (veh) {
                    const confirmed = window.showConfirm
                        ? await window.showConfirm(`Bạn có chắc chắn muốn xóa xe "${veh.name}"? Toàn bộ nhật ký đổ xăng và lịch sử bảo dưỡng của xe này cũng sẽ bị xóa vĩnh viễn.`, 'Xóa Xe Máy')
                        : confirm(`Bạn có chắc chắn muốn xóa xe ${veh.name}? Toàn bộ lịch sử cũng sẽ bị xóa vĩnh viễn.`);
                    if (confirmed) {
                        Vehicles.delete(id);
                        window._motocareShowToast('Đã xóa xe khỏi danh sách.');
                        const list = Vehicles.getAll();
                        state.activeVehicleId = list.length > 0 ? list[0].id : null;
                        this.renderAll();
                    }
                }
            }
            if (e.target.closest('.btn-delete-fuel')) {
                const id = e.target.closest('.btn-delete-fuel').getAttribute('data-id');
                const confirmed = window.showConfirm
                    ? await window.showConfirm('Bạn có chắc chắn muốn xóa nhật ký đổ xăng này?', 'Xóa Nhật Ký Đổ Xăng')
                    : confirm('Xóa nhật ký đổ xăng này?');
                if (confirmed) {
                    FuelLogs.delete(id);
                    window._motocareShowToast('Đã xóa nhật ký đổ xăng.');
                    this.renderAll();
                }
            }
            if (e.target.closest('.btn-edit-maint')) {
                const id = e.target.closest('.btn-edit-maint').getAttribute('data-id');
                const log = MaintenanceLogs.getById(id);
                if (log) this.openModal('maintenance', log);
            }
            if (e.target.closest('.btn-delete-maint')) {
                const id = e.target.closest('.btn-delete-maint').getAttribute('data-id');
                const confirmed = window.showConfirm
                    ? await window.showConfirm('Bạn có chắc chắn muốn xóa lịch sử bảo dưỡng này?', 'Xóa Lịch Sử Bảo Dưỡng')
                    : confirm('Xóa lịch sử bảo dưỡng này?');
                if (confirmed) {
                    MaintenanceLogs.delete(id);
                    window._motocareShowToast('Đã xóa lịch sử bảo dưỡng.');
                    this.renderAll();
                }
            }
            if (e.target.classList.contains('btn-quick-log')) {
                this.openModal('maintenance', { category: e.target.getAttribute('data-category') });
            }
            if (e.target.classList.contains('btn-edit-preset')) {
                const key = e.target.getAttribute('data-key');
                const name = e.target.getAttribute('data-name');
                const km = e.target.getAttribute('data-km');
                const months = e.target.getAttribute('data-months');
                this.openModal('preset', { key, name, km, months });
            }
        });

        // 10. Reset MotoCare data
        document.getElementById('mc-btn-reset-app')?.addEventListener('click', async () => {
            const confirmed1 = window.showConfirm
                ? await window.showConfirm('CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn xóa toàn bộ dữ liệu xe máy? Hành động này sẽ đồng bộ xóa trên toàn bộ thiết bị.', 'Xóa Toàn Bộ Dữ Liệu Xe')
                : confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ dữ liệu xe máy? Hành động này sẽ đồng bộ xóa trên toàn bộ thiết bị.');
            if (confirmed1) {
                const confirmed2 = window.showConfirm
                    ? await window.showConfirm('XÁC NHẬN LẦN CUỐI: Bạn sẽ mất sạch toàn bộ thông tin xe, nhật ký đổ xăng và lịch sử bảo dưỡng. Tiếp tục?', 'Xác Nhận Lần Cuối')
                    : confirm('Hãy xác nhận lại một lần nữa. Bạn sẽ mất sạch dữ liệu đã ghi nhận.');
                if (confirmed2) {
                    DataPortability.resetAll();
                    window._motocareShowToast('Đã xóa toàn bộ dữ liệu xe máy!');
                    setTimeout(() => { state.initialized = false; initMotoCare(); }, 1500);
                }
            }
        });
    },

    openModal(type, data = null) {
        const overlay = document.getElementById(`mc-modal-${type}`);
        if (!overlay) return;

        const vehicle = state.activeVehicleId ? Vehicles.getById(state.activeVehicleId) : null;
        if ((type === 'fuel' || type === 'maintenance' || type === 'preset') && !vehicle) {
            window._motocareShowToast('Vui lòng thêm xe máy trước khi thực hiện!', 'warning');
            this.openModal('vehicle');
            return;
        }

        overlay.classList.remove('hidden');
        overlay.classList.add('active');
        overlay.style.display = 'flex';

        const todayStr = new Date().toISOString().split('T')[0];
        if (type === 'vehicle') {
            const modalTitle = document.getElementById('mc-vehicle-modal-title');
            if (data) {
                if (modalTitle) modalTitle.innerText = 'Sửa thông tin xe';
                document.getElementById('mc-vehicle-id').value = data.id || '';
                document.getElementById('mc-vehicle-name').value = data.name || '';
                document.getElementById('mc-vehicle-plate').value = data.plate || '';
                document.getElementById('mc-vehicle-type').value = data.type || 'scooter';
                document.getElementById('mc-vehicle-odo').value = data.currentOdo || 0;
                document.getElementById('mc-vehicle-buy-date').value = data.buyDate || todayStr;
            } else {
                if (modalTitle) modalTitle.innerText = 'Thêm xe mới';
                document.getElementById('mc-form-vehicle').reset();
                document.getElementById('mc-vehicle-id').value = '';
                document.getElementById('mc-vehicle-odo').value = 0;
                document.getElementById('mc-vehicle-buy-date').value = todayStr;
            }
        } else if (type === 'fuel') {
            document.getElementById('mc-form-fuel').reset();
            document.getElementById('mc-fuel-log-id').value = '';
            document.getElementById('mc-fuel-date').value = todayStr;
            if (vehicle) document.getElementById('mc-fuel-odo').value = vehicle.currentOdo;
        } else if (type === 'maintenance') {
            document.getElementById('mc-form-maintenance').reset();
            const modalTitle = document.getElementById('mc-maint-modal-title') || document.querySelector('#mc-modal-maintenance .modal-header h3');
            const singleMode = document.getElementById('mc-maint-single-mode');
            const batchMode = document.getElementById('mc-maint-batch-mode');
            const btnText = document.getElementById('mc-btn-save-maintenance-text');

            if (data && data.id) {
                // Sửa 1 bản ghi lịch sử cũ
                if (modalTitle) modalTitle.innerText = 'Sửa lịch sử bảo dưỡng';
                if (singleMode) singleMode.style.display = 'flex';
                if (batchMode) batchMode.style.display = 'none';

                document.getElementById('mc-maint-log-id').value = data.id || '';
                document.getElementById('mc-maint-date').value = data.date || todayStr;
                document.getElementById('mc-maint-odo').value = data.odo !== undefined ? data.odo : (vehicle ? vehicle.currentOdo : 0);
                if (data.category) document.getElementById('mc-maint-category').value = data.category;
                document.getElementById('mc-maint-cost').value = data.cost !== undefined ? data.cost : '';
                document.getElementById('mc-maint-notes').value = data.notes || '';
                if (btnText) btnText.innerText = 'Cập nhật';
            } else {
                // Thêm mới bảo dưỡng (Tick nhanh đa hạng mục)
                if (modalTitle) modalTitle.innerText = 'Ghi nhận bảo dưỡng';
                if (singleMode) singleMode.style.display = 'none';
                if (batchMode) batchMode.style.display = 'flex';

                document.getElementById('mc-maint-log-id').value = '';
                document.getElementById('mc-maint-date').value = todayStr;
                if (vehicle) document.getElementById('mc-maint-odo').value = vehicle.currentOdo;
                document.getElementById('mc-maint-notes').value = '';

                // Render checklist hạng mục theo xe đang chọn
                const preselectedCat = (data && data.category) ? data.category : null;
                UI.renderMaintenanceChecklist(state.activeVehicleId, preselectedCat);
            }
        } else if (type === 'preset') {
            if (data) {
                document.getElementById('mc-preset-key').value = data.key;
                document.getElementById('mc-preset-name-display').value = data.name;
                document.getElementById('mc-preset-interval-km').value = data.km;
                document.getElementById('mc-preset-interval-months').value = data.months;
            }
        }
    },

    closeModal(type) {
        const overlay = document.getElementById(`mc-modal-${type}`);
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        }
    }
};

// Hàm khởi tạo MotoCare - được gọi bởi FamiLife khi switchTab('motocare')
function initMotoCare() {
    window.switchMotocareView = switchMotocareView;

    // Expose toast bridge cho FamiLife
    window._motocareShowToast = function(msg, type = 'success') {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
        } else {
            console.log('[MotoCare Toast]', type, msg);
        }
    };

    // Bootstrap active vehicle
    const activeId = Vehicles.getActiveId();
    if (activeId && Vehicles.getById(activeId)) {
        state.activeVehicleId = activeId;
    } else {
        const list = Vehicles.getAll();
        if (list.length > 0) {
            Vehicles.setActiveId(list[0].id);
            state.activeVehicleId = list[0].id;
        } else {
            Vehicles.setActiveId(null);
            state.activeVehicleId = null;
        }
    }

    if (state.initialized) {
        // Đã init rồi, chỉ cần render lại dữ liệu mà KHÔNG chuyển view
        App.renderAll();
        return;
    }

    // Init events
    App.initEvents();

    // Show default view or current view
    switchMotocareView(window._currentMotocareView || state.currentView || 'dashboard');

    state.initialized = true;
    console.log('[MotoCare] Initialized successfully within FamiLife');
}

// Export để FamiLife có thể import
if (typeof window !== 'undefined') {
    window.initMotoCare = initMotoCare;
    window.switchMotocareView = switchMotocareView;
}
export { initMotoCare, switchMotocareView };
