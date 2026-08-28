/* MotoCare - Tích hợp vào FamiLife (v4.3.202) */
import { Vehicles, MaintenanceLogs, FuelLogs, Presets, Stats, DataPortability, AI } from './db.js?v=4.3.206';
import { UI } from './ui.js?v=4.3.206';

// Application State (Độc lập với FamiLife state)
const state = {
    currentView: 'dashboard',
    activeVehicleId: null,
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
        const map = { 'Tổng quan': 'dashboard', 'Đổ xăng': 'fuel', 'Lịch sử': 'history', 'Cài đặt': 'settings' };
        if (map[title] === viewName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
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
        UI.renderHistory(vId, document.getElementById('mc-filter-maint-category')?.value || 'all');
        UI.renderPresetsSettings(vId);

        const geminiInput = document.getElementById('mc-settings-gemini-key');
        if (geminiInput && !geminiInput.value) {
            geminiInput.value = AI.getKey();
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
        document.getElementById('mc-btn-update-odo')?.addEventListener('click', () => {
            const vId = state.activeVehicleId;
            if (!vId) { window._motocareShowToast('Vui lòng chọn hoặc thêm xe máy trước!', 'danger'); return; }
            const odoInput = document.getElementById('mc-current-odo-input');
            const newOdo = parseInt(odoInput.value) || 0;
            const res = Vehicles.updateOdo(vId, newOdo);
            if (res.success) {
                window._motocareShowToast('Cập nhật ODO thành công lên ' + newOdo.toLocaleString() + ' Km!');
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
        document.getElementById('mc-btn-quick-oil-change')?.addEventListener('click', () => {
            const vId = state.activeVehicleId;
            if (!vId) { window._motocareShowToast('Chưa chọn xe máy!', 'danger'); return; }
            const vehicle = Vehicles.getById(vId);
            if (confirm(`Bạn muốn ghi nhận THAY DẦU MÁY cho xe ${vehicle.name} ở số Km hiện tại (${vehicle.currentOdo.toLocaleString()} Km) chứ?`)) {
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

        // 5. Save Gemini Key
        document.getElementById('mc-btn-save-gemini-key')?.addEventListener('click', () => {
            const keyInput = document.getElementById('mc-settings-gemini-key');
            if (keyInput) {
                AI.saveKey(keyInput.value);
                window._motocareShowToast('Đã lưu khóa API Gemini thành công!', 'success');
                this.renderAll();
            }
        });

        // 6. AI Doctor consultation
        document.getElementById('mc-btn-consult-ai')?.addEventListener('click', async () => {
            const vId = state.activeVehicleId;
            if (!vId) { window._motocareShowToast('Vui lòng chọn hoặc thêm xe máy trước!', 'danger'); return; }
            const apiKey = AI.getKey() || (window._famiLifeGeminiKey || '');
            if (!apiKey) {
                window._motocareShowToast('Vui lòng cấu hình Gemini API Key trong mục Cài đặt trước!', 'warning');
                switchMotocareView('settings');
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
            const date = document.getElementById('mc-maint-date').value;
            const odo = parseInt(document.getElementById('mc-maint-odo').value) || 0;
            const category = document.getElementById('mc-maint-category').value;
            const cost = parseInt(document.getElementById('mc-maint-cost').value) || 0;
            const notes = document.getElementById('mc-maint-notes').value;
            MaintenanceLogs.add({ vehicleId: state.activeVehicleId, date, odo, category, cost, notes });
            window._motocareShowToast('Đã lưu lịch sử bảo dưỡng!');
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

        // 8. Maintenance filter
        document.getElementById('mc-filter-maint-category')?.addEventListener('change', (e) => {
            UI.renderHistory(state.activeVehicleId, e.target.value);
        });

        // 9. Click delegation cho dynamic items
        const tabPanel = document.getElementById('tab-motocare');
        tabPanel?.addEventListener('click', (e) => {
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
                if (confirm(`Bạn có chắc chắn muốn xóa xe ${veh.name}? Toàn bộ lịch sử cũng sẽ bị xóa vĩnh viễn.`)) {
                    Vehicles.delete(id);
                    window._motocareShowToast('Đã xóa xe khỏi danh sách.');
                    const list = Vehicles.getAll();
                    state.activeVehicleId = list.length > 0 ? list[0].id : null;
                    this.renderAll();
                }
            }
            if (e.target.closest('.btn-delete-fuel')) {
                const id = e.target.closest('.btn-delete-fuel').getAttribute('data-id');
                if (confirm('Xóa nhật ký đổ xăng này?')) {
                    FuelLogs.delete(id);
                    window._motocareShowToast('Đã xóa nhật ký đổ xăng.');
                    this.renderAll();
                }
            }
            if (e.target.closest('.btn-delete-maint')) {
                const id = e.target.closest('.btn-delete-maint').getAttribute('data-id');
                if (confirm('Xóa lịch sử bảo dưỡng này?')) {
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
        document.getElementById('mc-btn-reset-app')?.addEventListener('click', () => {
            if (confirm('CẢNH BÁO: Bạn có chắc chắn muốn xóa toàn bộ dữ liệu xe máy? Hành động này sẽ đồng bộ xóa trên toàn bộ thiết bị.')) {
                if (confirm('Hãy xác nhận lại một lần nữa. Bạn sẽ mất sạch dữ liệu đã ghi nhận.')) {
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
        overlay.classList.remove('hidden');
        const vehicle = Vehicles.getById(state.activeVehicleId);
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
            document.getElementById('mc-maint-log-id').value = '';
            document.getElementById('mc-maint-date').value = todayStr;
            if (vehicle) document.getElementById('mc-maint-odo').value = vehicle.currentOdo;
            if (data && data.category) document.getElementById('mc-maint-category').value = data.category;
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
        if (overlay) overlay.classList.add('hidden');
    }
};

// Hàm khởi tạo MotoCare - được gọi bởi FamiLife khi switchTab('motocare')
export function initMotoCare() {
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
    if (activeId) {
        state.activeVehicleId = activeId;
    } else {
        const list = Vehicles.getAll();
        if (list.length > 0) {
            Vehicles.setActiveId(list[0].id);
            state.activeVehicleId = list[0].id;
        }
    }

    if (state.initialized) {
        // Đã init rồi, chỉ cần render lại view hiện tại
        switchMotocareView(state.currentView || 'dashboard');
        return;
    }

    // Init events
    App.initEvents();

    // Show default view
    switchMotocareView(state.currentView || 'dashboard');

    state.initialized = true;
    console.log('[MotoCare] Initialized successfully within FamiLife');
}

// Export để FamiLife có thể import
window.initMotoCare = initMotoCare;
export { switchMotocareView };
