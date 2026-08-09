// src/features/cham-soc-xe/cham-soc-xe.js - Vehicle Care & Motorcycle Maintenance Module
import { 
    state, saveLocalState, showToast, performSync, APP_VERSION, formatDate, escapeHTML, formatVND, generateId, getLocalDateString
} from '../../core/app.js?v=4.4.1';

// Current subview state
let currentVehicleSubView = 'overview'; // 'overview' | 'services' | 'fuel' | 'matrix' | 'ai-doctor'
let activeVehicleId = null;

// Expert maintenance checklist standard items
const MAINTENANCE_CHECKLIST_SPECS = [
    { key: 'engine_oil', name: 'Dầu máy (Engine Oil)', intervalKm: 2000, desc: 'Thay mỗi 1.500 - 3.000 km. Giúp bôi trơn và mát động cơ.', icon: 'droplet' },
    { key: 'gear_oil', name: 'Dầu láp / Dầu truyền động', intervalKm: 6000, desc: 'Thay mỗi 6.000 - 8.000 km (cho xe ga). Bảo vệ bộ bánh răng láp.', icon: 'disc' },
    { key: 'air_filter', name: 'Lọc gió (Air Filter)', intervalKm: 10000, desc: 'Vệ sinh 4.000 km, thay mới 10.000 km. Giảm hao xăng & bốc máy.', icon: 'wind' },
    { key: 'spark_plug', name: 'Bugi (Spark Plug)', intervalKm: 10000, desc: 'Thay thế 8.000 - 10.000 km. Tránh xe khó nổ, ngợp xăng.', icon: 'zap' },
    { key: 'brake_pads', name: 'Má phanh / Đĩa phanh', intervalKm: 8000, desc: 'Kiểm tra mỗi 4.000 km, thay khi mòn < 2mm để an toàn.', icon: 'shield-alert' },
    { key: 'coolant', name: 'Nước làm mát (Coolant)', intervalKm: 15000, desc: 'Kiểm tra 5.000 km, thay mới 15.000 km (cho xe làm mát dung dịch).', icon: 'thermometer' },
    { key: 'belt_chain', name: 'Dây Curoa / Nhông Sên Dĩa', intervalKm: 18000, desc: 'Tăng xích/vệ sinh 1.000 km, thay mới 15.000 - 20.000 km.', icon: 'activity' },
    { key: 'tires', name: 'Lốp xe / Vỏ xe (Tires)', intervalKm: 18000, desc: 'Kiểm tra áp suất hàng tháng, thay mới khi gai mòn < 1mm.', icon: 'circle-dot' },
    { key: 'cvt_injector', name: 'Vệ sinh Nồi CVT / Kim phun', intervalKm: 10000, desc: 'Vệ sinh nồi & kim phun FI 10.000 km giúp ga êm không rung đầu.', icon: 'sparkles' }
];

function initVehicleBindings() {
    // Tab sub-view switchers
    document.querySelectorAll('[data-vehicle-subview]').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault();
            const view = btn.getAttribute('data-vehicle-subview');
            switchVehicleSubView(view);
        };
    });

    // Add Vehicle Btn
    const btnAddVehicle = document.getElementById('btnAddVehicle');
    if (btnAddVehicle) btnAddVehicle.onclick = () => openVehicleFormModal();

    // Add Service Btn
    const btnAddService = document.getElementById('btnAddVehicleService');
    if (btnAddService) btnAddService.onclick = () => openServiceFormModal();

    // Add Fuel Log Btn
    const btnAddFuel = document.getElementById('btnAddVehicleFuel');
    if (btnAddFuel) btnAddFuel.onclick = () => openFuelFormModal();

    // Form submits
    const vehicleForm = document.getElementById('vehicleForm');
    if (vehicleForm) vehicleForm.onsubmit = handleVehicleSubmit;

    const serviceForm = document.getElementById('vehicleServiceForm');
    if (serviceForm) serviceForm.onsubmit = handleServiceSubmit;

    const fuelForm = document.getElementById('vehicleFuelForm');
    if (fuelForm) fuelForm.onsubmit = handleFuelSubmit;

    // AI Mechanic Prompt submit
    const btnAskVehicleAi = document.getElementById('btnAskVehicleAi');
    if (btnAskVehicleAi) btnAskVehicleAi.onclick = handleVehicleAiConsult;

    // Vehicle Selector change
    const selector = document.getElementById('vehicleProfileSelect');
    if (selector) {
        selector.onchange = (e) => {
            activeVehicleId = e.target.value;
            renderVehicleDashboard();
        };
    }
}

function switchVehicleSubView(subView) {
    currentVehicleSubView = subView;
    document.querySelectorAll('[data-vehicle-subview]').forEach(btn => {
        if (btn.getAttribute('data-vehicle-subview') === subView) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    document.querySelectorAll('.vehicle-subview-panel').forEach(panel => {
        if (panel.id === `vehicle-subview-${subView}`) {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    });

    renderVehicleDashboard();
}

function getActiveVehicle() {
    if (!state.vehicles || state.vehicles.length === 0) return null;
    if (!activeVehicleId) {
        activeVehicleId = state.vehicles[0].id;
    }
    const found = state.vehicles.find(v => v.id === activeVehicleId);
    return found || state.vehicles[0];
}

function renderVehicleDashboard() {
    if (!state.vehicles) state.vehicles = [];
    if (!state.vehicleServices) state.vehicleServices = [];
    if (!state.vehicleFuelLogs) state.vehicleFuelLogs = [];

    renderVehicleProfileSelector();

    const vehicle = getActiveVehicle();
    const emptyNotice = document.getElementById('vehicleEmptyNotice');
    const contentBox = document.getElementById('vehicleMainContentBox');

    if (!vehicle) {
        if (emptyNotice) emptyNotice.style.display = 'flex';
        if (contentBox) contentBox.style.display = 'none';
        return;
    }

    if (emptyNotice) emptyNotice.style.display = 'none';
    if (contentBox) contentBox.style.display = 'block';

    // Render Stats Overview Cards
    renderVehicleOverviewHeader(vehicle);
    renderOilReminders(vehicle);
    renderMaintenanceChecklistMatrix(vehicle);
    renderServiceHistoryTable(vehicle);
    renderFuelLogsSection(vehicle);

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function renderVehicleProfileSelector() {
    const selector = document.getElementById('vehicleProfileSelect');
    if (!selector) return;

    if (!state.vehicles || state.vehicles.length === 0) {
        selector.innerHTML = `<option value="">-- Chưa có xe nào (Thêm xe ngay) --</option>`;
        return;
    }

    const currentV = getActiveVehicle();
    activeVehicleId = currentV ? currentV.id : state.vehicles[0].id;

    selector.innerHTML = state.vehicles.map(v => `
        <option value="${v.id}" ${v.id === activeVehicleId ? 'selected' : ''}>
            ${escapeHTML(v.name)} (${escapeHTML(v.plateNumber || 'Chưa có biển số')}) - ${v.currentOdo.toLocaleString('vi-VN')} km
        </option>
    `).join('');
}

function renderVehicleOverviewHeader(vehicle) {
    const nameEl = document.getElementById('vOverviewName');
    const plateEl = document.getElementById('vOverviewPlate');
    const odoEl = document.getElementById('vOverviewOdo');
    const typeEl = document.getElementById('vOverviewType');

    if (nameEl) nameEl.textContent = vehicle.name;
    if (plateEl) plateEl.textContent = vehicle.plateNumber ? `Biển số: ${vehicle.plateNumber}` : 'Chưa nhập biển số';
    if (odoEl) odoEl.textContent = `${(vehicle.currentOdo || 0).toLocaleString('vi-VN')} km`;
    if (typeEl) {
        const typeMap = { 'scooter': 'Xe tay ga', 'cub': 'Xe số', 'clutch': 'Xe côn tay', 'electric': 'Xe điện' };
        typeEl.textContent = typeMap[vehicle.vehicleType] || 'Xe máy';
    }

    // Bind Edit & Delete Vehicle buttons
    const btnEdit = document.getElementById('btnEditActiveVehicle');
    if (btnEdit) btnEdit.onclick = () => openVehicleFormModal(vehicle);

    const btnDelete = document.getElementById('btnDeleteActiveVehicle');
    if (btnDelete) btnDelete.onclick = () => handleDeleteVehicle(vehicle.id);
}

function renderOilReminders(vehicle) {
    const engineCard = document.getElementById('vEngineOilCard');
    const gearCard = document.getElementById('vGearOilCard');

    const curOdo = Number(vehicle.currentOdo) || 0;
    const lastEngineOdo = Number(vehicle.lastEngineOilOdo) || 0;
    const intervalEngine = Number(vehicle.engineOilIntervalKm) || 2000;

    const kmDrivenEngine = curOdo - lastEngineOdo;
    const kmRemainingEngine = intervalEngine - kmDrivenEngine;

    if (engineCard) {
        let statusBadge = '';
        let statusColor = '#10b981'; // Green
        let progressPercent = Math.max(0, Math.min(100, Math.round((kmDrivenEngine / intervalEngine) * 100)));

        if (kmRemainingEngine < 0) {
            statusColor = '#ef4444'; // Red
            statusBadge = `<span class="badge badge-danger">🔴 QUÁ HẠN THAY DẦU (${Math.abs(kmRemainingEngine).toLocaleString('vi-VN')} KM)</span>`;
        } else if (kmRemainingEngine <= 300) {
            statusColor = '#f59e0b'; // Amber
            statusBadge = `<span class="badge badge-warning">🟡 SẮP ĐẾN HẠN (Còn ${kmRemainingEngine.toLocaleString('vi-VN')} km)</span>`;
        } else {
            statusBadge = `<span class="badge badge-success">🟢 AN TOÀN (Còn ${kmRemainingEngine.toLocaleString('vi-VN')} km)</span>`;
        }

        engineCard.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <div>
                    <h4 style="margin: 0; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                        <i data-lucide="droplet" style="color: #3b82f6;"></i> Dầu máy (Engine Oil)
                    </h4>
                    <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">
                        Lần thay gần nhất: <b>${lastEngineOdo.toLocaleString('vi-VN')} km</b> | Chu kỳ: <b>${intervalEngine.toLocaleString('vi-VN')} km</b>
                    </p>
                </div>
                ${statusBadge}
            </div>
            <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; height: 10px; overflow: hidden; margin-top: 10px;">
                <div style="width: ${progressPercent}%; background: ${statusColor}; height: 100%; transition: width 0.3s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <span style="font-size: 0.8rem; color: var(--text-secondary);">Đã chạy: <b>${kmDrivenEngine.toLocaleString('vi-VN')} km</b></span>
                <button class="btn btn-sm btn-outline" onclick="window.quickUpdateOilChange('${vehicle.id}', 'engine')">
                    <i data-lucide="check-circle-2"></i> Vừa thay dầu hôm nay
                </button>
            </div>
        `;
    }

    // Gear oil (Only relevant for scooters or specified)
    if (gearCard) {
        if (vehicle.vehicleType === 'scooter') {
            gearCard.style.display = 'block';
            const lastGearOdo = Number(vehicle.lastGearOilOdo) || 0;
            const intervalGear = Number(vehicle.gearOilIntervalKm) || 6000;
            const kmDrivenGear = curOdo - lastGearOdo;
            const kmRemainingGear = intervalGear - kmDrivenGear;

            let gearStatusBadge = '';
            let gearColor = '#10b981';
            let gearProgress = Math.max(0, Math.min(100, Math.round((kmDrivenGear / intervalGear) * 100)));

            if (kmRemainingGear < 0) {
                gearColor = '#ef4444';
                gearStatusBadge = `<span class="badge badge-danger">🔴 QUÁ HẠN DẦU LÁP (${Math.abs(kmRemainingGear).toLocaleString('vi-VN')} KM)</span>`;
            } else if (kmRemainingGear <= 500) {
                gearColor = '#f59e0b';
                gearStatusBadge = `<span class="badge badge-warning">🟡 SẮP ĐẾN HẠN (Còn ${kmRemainingGear.toLocaleString('vi-VN')} km)</span>`;
            } else {
                gearStatusBadge = `<span class="badge badge-success">🟢 AN TOÀN (Còn ${kmRemainingGear.toLocaleString('vi-VN')} km)</span>`;
            }

            gearCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                    <div>
                        <h4 style="margin: 0; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="disc" style="color: #8b5cf6;"></i> Dầu láp / Dầu truyền động
                        </h4>
                        <p style="margin: 4px 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">
                            Lần thay gần nhất: <b>${lastGearOdo.toLocaleString('vi-VN')} km</b> | Chu kỳ: <b>${intervalGear.toLocaleString('vi-VN')} km</b>
                        </p>
                    </div>
                    ${gearStatusBadge}
                </div>
                <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; height: 10px; overflow: hidden; margin-top: 10px;">
                    <div style="width: ${gearProgress}%; background: ${gearColor}; height: 100%; transition: width 0.3s ease;"></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">Đã chạy: <b>${kmDrivenGear.toLocaleString('vi-VN')} km</b></span>
                    <button class="btn btn-sm btn-outline" onclick="window.quickUpdateOilChange('${vehicle.id}', 'gear')">
                        <i data-lucide="check-circle-2"></i> Vừa thay dầu láp hôm nay
                    </button>
                </div>
            `;
        } else {
            gearCard.style.display = 'none';
        }
    }
}

function renderMaintenanceChecklistMatrix(vehicle) {
    const grid = document.getElementById('vMatrixGrid');
    if (!grid) return;

    const curOdo = Number(vehicle.currentOdo) || 0;
    const vServices = state.vehicleServices.filter(s => s.vehicleId === vehicle.id);

    grid.innerHTML = MAINTENANCE_CHECKLIST_SPECS.map(spec => {
        // Find last service record for this category
        const matchedLogs = vServices.filter(s => s.items && s.items.includes(spec.key));
        matchedLogs.sort((a, b) => (Number(b.odo) || 0) - (Number(a.odo) || 0));
        const lastLog = matchedLogs[0];

        const lastOdo = lastLog ? Number(lastLog.odo) : 0;
        const kmDriven = curOdo - lastOdo;
        const kmLeft = spec.intervalKm - kmDriven;

        let statusText = 'Hoạt động tốt';
        let badgeClass = 'badge-success';

        if (kmLeft <= 0) {
            statusText = `Nên thay thế / Kiểm tra ngay!`;
            badgeClass = 'badge-danger';
        } else if (kmLeft <= spec.intervalKm * 0.2) {
            statusText = `Sắp đến hạn (${kmLeft.toLocaleString('vi-VN')} km)`;
            badgeClass = 'badge-warning';
        }

        return `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <h4 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="${spec.icon}" style="width: 16px; height: 16px; color: var(--color-primary);"></i>
                            ${escapeHTML(spec.name)}
                        </h4>
                        <span class="badge ${badgeClass}" style="font-size: 0.7rem;">${statusText}</span>
                    </div>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 4px 0 8px 0; line-height: 1.3;">
                        ${escapeHTML(spec.desc)}
                    </p>
                </div>
                <div style="border-top: 1px dashed var(--border-color); padding-top: 8px; font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
                    <span>Thay gần nhất: <b>${lastOdo ? lastOdo.toLocaleString('vi-VN') + ' km' : 'Chưa ghi nhận'}</b></span>
                    <span>Đã đi: <b>${kmDriven.toLocaleString('vi-VN')} km</b></span>
                </div>
            </div>
        `;
    }).join('');
}

function renderServiceHistoryTable(vehicle) {
    const container = document.getElementById('vServicesContainer');
    if (!container) return;

    const list = state.vehicleServices
        .filter(s => s.vehicleId === vehicle.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update total cost sum element
    const totalCostSumEl = document.getElementById('vServicesTotalCost');
    const totalSum = list.reduce((acc, cur) => acc + (Number(cur.cost) || 0), 0);
    if (totalCostSumEl) totalCostSumEl.textContent = formatVND(totalSum);

    if (list.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--text-secondary);">
                <i data-lucide="wrench" style="width: 36px; height: 36px; stroke-width: 1.5; margin-bottom: 8px; opacity: 0.5;"></i>
                <p>Chưa có lịch sử bảo dưỡng / sửa chữa nào cho xe này.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Ngày</th>
                        <th>Odometer</th>
                        <th>Hạng mục thực hiện</th>
                        <th>Chi phí</th>
                        <th>Địa điểm / Gara</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map(s => `
                        <tr>
                            <td><b>${formatDate(s.date)}</b></td>
                            <td><span class="badge badge-info">${(Number(s.odo) || 0).toLocaleString('vi-VN')} km</span></td>
                            <td>
                                <b>${escapeHTML(s.title || 'Bảo dưỡng định kỳ')}</b>
                                ${s.items && s.items.length > 0 ? `<div style="font-size: 0.75rem; color: var(--text-secondary);">${s.items.join(', ')}</div>` : ''}
                                ${s.notes ? `<div style="font-size: 0.75rem; font-style: italic; color: var(--text-secondary);">${escapeHTML(s.notes)}</div>` : ''}
                            </td>
                            <td><strong style="color: #ef4444;">${formatVND(Number(s.cost) || 0)}</strong></td>
                            <td>${escapeHTML(s.garage || 'Tự làm / Tiệm quen')}</td>
                            <td>
                                <div style="display: flex; gap: 6px;">
                                    <button class="btn btn-icon btn-sm" onclick="window.editVehicleService('${s.id}')" title="Sửa">
                                        <i data-lucide="edit-3"></i>
                                    </button>
                                    <button class="btn btn-icon btn-sm btn-danger" onclick="window.deleteVehicleService('${s.id}')" title="Xóa">
                                        <i data-lucide="trash-2"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderFuelLogsSection(vehicle) {
    const container = document.getElementById('vFuelLogsContainer');
    const statsEl = document.getElementById('vFuelStatsBox');
    if (!container) return;

    const fuelLogs = state.vehicleFuelLogs
        .filter(f => f.vehicleId === vehicle.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate consumption (L/100km or km/L)
    let avgConsumptionText = 'Cần thêm ít nhất 2 lần đổ đầy bình để tính';
    let totalFuelSpent = 0;
    let totalLiters = 0;

    if (fuelLogs.length >= 2) {
        let validDistances = 0;
        let validLiters = 0;

        for (let i = 0; i < fuelLogs.length - 1; i++) {
            const current = fuelLogs[i];
            const previous = fuelLogs[i + 1];

            if (current.isFullTank && previous.isFullTank) {
                const dist = Number(current.odo) - Number(previous.odo);
                if (dist > 0) {
                    validDistances += dist;
                    validLiters += Number(current.liters) || 0;
                }
            }
        }

        if (validDistances > 0 && validLiters > 0) {
            const litersPer100Km = ((validLiters / validDistances) * 100).toFixed(2);
            const kmPerLiter = (validDistances / validLiters).toFixed(1);
            avgConsumptionText = `🔥 Trung bình: <b>${litersPer100Km} L/100km</b> (${kmPerLiter} km/Lít)`;
        }
    }

    fuelLogs.forEach(f => {
        totalFuelSpent += Number(f.totalCost) || 0;
        totalLiters += Number(f.liters) || 0;
    });

    if (statsEl) {
        statsEl.innerHTML = `
            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                    <h4 style="margin: 0; font-size: 0.95rem; color: #f59e0b; display: flex; align-items: center; gap: 6px;">
                        <i data-lucide="fuel"></i> Thống kê tiêu thụ nhiên liệu
                    </h4>
                    <div style="font-size: 0.85rem; color: var(--text-primary); margin-top: 4px;">
                        ${avgConsumptionText}
                    </div>
                </div>
                <div style="display: flex; gap: 16px; text-align: right;">
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Tổng tiền xăng</div>
                        <div style="font-size: 0.95rem; font-weight: bold; color: #f59e0b;">${formatVND(totalFuelSpent)}</div>
                    </div>
                    <div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">Tổng số lít</div>
                        <div style="font-size: 0.95rem; font-weight: bold; color: var(--text-primary);">${totalLiters.toFixed(2)} L</div>
                    </div>
                </div>
            </div>
        `;
    }

    if (fuelLogs.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--text-secondary);">
                <i data-lucide="fuel" style="width: 36px; height: 36px; stroke-width: 1.5; margin-bottom: 8px; opacity: 0.5;"></i>
                <p>Chưa có nhật ký đổ xăng nào cho xe này.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="table-responsive">
            <table class="table">
                <thead>
                    <tr>
                        <th>Ngày đổ</th>
                        <th>Odometer</th>
                        <th>Số lít</th>
                        <th>Số tiền</th>
                        <th>Đầy bình?</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    ${fuelLogs.map(f => `
                        <tr>
                            <td><b>${formatDate(f.date)}</b></td>
                            <td><span class="badge badge-info">${(Number(f.odo) || 0).toLocaleString('vi-VN')} km</span></td>
                            <td><b>${Number(f.liters || 0).toFixed(2)} L</b></td>
                            <td><strong style="color: #f59e0b;">${formatVND(Number(f.totalCost) || 0)}</strong></td>
                            <td>${f.isFullTank ? '<span class="badge badge-success">Có</span>' : '<span class="badge badge-secondary">Không</span>'}</td>
                            <td>
                                <button class="btn btn-icon btn-sm btn-danger" onclick="window.deleteVehicleFuelLog('${f.id}')" title="Xóa">
                                    <i data-lucide="trash-2"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// Modal actions
function openVehicleFormModal(vehicle = null) {
    const modal = document.getElementById('vehicleFormModal');
    if (!modal) return;

    document.getElementById('vehicleFormTitle').textContent = vehicle ? 'Chỉnh Sửa Thông Tin Xe' : 'Thêm Xe Máy Mới';
    document.getElementById('vehicleIdInput').value = vehicle ? vehicle.id : '';
    document.getElementById('vNameInput').value = vehicle ? vehicle.name : '';
    document.getElementById('vPlateInput').value = vehicle ? vehicle.plateNumber || '' : '';
    document.getElementById('vTypeSelect').value = vehicle ? vehicle.vehicleType || 'scooter' : 'scooter';
    document.getElementById('vOdoInput').value = vehicle ? vehicle.currentOdo || 0 : '';
    document.getElementById('vEngineOilIntervalInput').value = vehicle ? vehicle.engineOilIntervalKm || 2000 : 2000;
    document.getElementById('vGearOilIntervalInput').value = vehicle ? vehicle.gearOilIntervalKm || 6000 : 6000;
    document.getElementById('vLastEngineOilOdoInput').value = vehicle ? vehicle.lastEngineOilOdo || 0 : 0;
    document.getElementById('vLastGearOilOdoInput').value = vehicle ? vehicle.lastGearOilOdo || 0 : 0;

    modal.style.display = 'flex';
}

function handleVehicleSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('vehicleIdInput').value;
    const name = document.getElementById('vNameInput').value.trim();
    const plateNumber = document.getElementById('vPlateInput').value.trim();
    const vehicleType = document.getElementById('vTypeSelect').value;
    const currentOdo = Number(document.getElementById('vOdoInput').value) || 0;
    const engineOilIntervalKm = Number(document.getElementById('vEngineOilIntervalInput').value) || 2000;
    const gearOilIntervalKm = Number(document.getElementById('vGearOilIntervalInput').value) || 6000;
    const lastEngineOilOdo = Number(document.getElementById('vLastEngineOilOdoInput').value) || 0;
    const lastGearOilOdo = Number(document.getElementById('vLastGearOilOdoInput').value) || 0;

    if (!name) {
        showToast('⚠️ Vui lòng nhập tên xe!');
        return;
    }

    if (id) {
        const idx = state.vehicles.findIndex(v => v.id === id);
        if (idx !== -1) {
            state.vehicles[idx] = {
                ...state.vehicles[idx],
                name, plateNumber, vehicleType, currentOdo,
                engineOilIntervalKm, gearOilIntervalKm,
                lastEngineOilOdo, lastGearOilOdo,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        const newVehicle = {
            id: 'v_' + generateId(),
            name, plateNumber, vehicleType, currentOdo,
            engineOilIntervalKm, gearOilIntervalKm,
            lastEngineOilOdo, lastGearOilOdo,
            createdAt: new Date().toISOString()
        };
        state.vehicles.push(newVehicle);
        activeVehicleId = newVehicle.id;
    }

    state.vehiclesUpdated = new Date().toISOString();
    saveLocalState();
    performSync();

    document.getElementById('vehicleFormModal').style.display = 'none';
    showToast('✅ Đã lưu thông tin xe thành công!');
    renderVehicleDashboard();
}

function handleDeleteVehicle(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa thông tin xe này và toàn bộ nhật ký liên quan?')) return;

    state.vehicles = state.vehicles.filter(v => v.id !== id);
    state.vehicleServices = state.vehicleServices.filter(s => s.vehicleId !== id);
    state.vehicleFuelLogs = state.vehicleFuelLogs.filter(f => f.vehicleId !== id);
    
    state.vehiclesUpdated = new Date().toISOString();
    saveLocalState();
    performSync();

    activeVehicleId = state.vehicles.length > 0 ? state.vehicles[0].id : null;
    showToast('🗑️ Đã xóa xe!');
    renderVehicleDashboard();
}

function openServiceFormModal(service = null) {
    const modal = document.getElementById('vehicleServiceModal');
    if (!modal) return;

    const v = getActiveVehicle();
    if (!v) {
        showToast('⚠️ Vui lòng thêm xe trước!');
        return;
    }

    document.getElementById('serviceFormTitle').textContent = service ? 'Sửa Lịch Sử Bảo Dưỡng' : 'Thêm Bản Ghi Bảo Dưỡng / Sửa Chữa';
    document.getElementById('serviceIdInput').value = service ? service.id : '';
    document.getElementById('sDateInput').value = service ? service.date : getLocalDateString();
    document.getElementById('sOdoInput').value = service ? service.odo : v.currentOdo || 0;
    document.getElementById('sTitleInput').value = service ? service.title || '' : '';
    document.getElementById('sCostInput').value = service ? service.cost || '' : '';
    document.getElementById('sGarageInput').value = service ? service.garage || '' : '';
    document.getElementById('sNotesInput').value = service ? service.notes || '' : '';

    const selectedItems = service && service.items ? service.items : [];
    document.querySelectorAll('.s-item-checkbox').forEach(cb => {
        cb.checked = selectedItems.includes(cb.value);
    });

    modal.style.display = 'flex';
}

function handleServiceSubmit(e) {
    e.preventDefault();
    const v = getActiveVehicle();
    if (!v) return;

    const id = document.getElementById('serviceIdInput').value;
    const date = document.getElementById('sDateInput').value || getLocalDateString();
    const odo = Number(document.getElementById('sOdoInput').value) || 0;
    const title = document.getElementById('sTitleInput').value.trim();
    const cost = Number(document.getElementById('sCostInput').value) || 0;
    const garage = document.getElementById('sGarageInput').value.trim();
    const notes = document.getElementById('sNotesInput').value.trim();

    const items = [];
    document.querySelectorAll('.s-item-checkbox:checked').forEach(cb => {
        items.push(cb.value);
    });

    if (!title && items.length === 0) {
        showToast('⚠️ Vui lòng nhập tên hoặc chọn ít nhất một hạng mục bảo dưỡng!');
        return;
    }

    if (odo > v.currentOdo) {
        v.currentOdo = odo;
    }

    if (items.includes('engine_oil')) {
        v.lastEngineOilOdo = odo;
    }
    if (items.includes('gear_oil')) {
        v.lastGearOilOdo = odo;
    }

    if (id) {
        const idx = state.vehicleServices.findIndex(s => s.id === id);
        if (idx !== -1) {
            state.vehicleServices[idx] = {
                ...state.vehicleServices[idx],
                date, odo, title: title || 'Bảo dưỡng phụ tùng', cost, garage, notes, items,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        const newRecord = {
            id: 'vs_' + generateId(),
            vehicleId: v.id,
            date, odo, title: title || 'Bảo dưỡng phụ tùng', cost, garage, notes, items,
            createdAt: new Date().toISOString()
        };
        state.vehicleServices.push(newRecord);
    }

    state.vehicleServicesUpdated = new Date().toISOString();
    state.vehiclesUpdated = new Date().toISOString();
    saveLocalState();
    performSync();

    document.getElementById('vehicleServiceModal').style.display = 'none';
    showToast('✅ Đã lưu nhật ký bảo dưỡng thành công!');
    renderVehicleDashboard();
}

function openFuelFormModal() {
    const modal = document.getElementById('vehicleFuelModal');
    if (!modal) return;

    const v = getActiveVehicle();
    if (!v) {
        showToast('⚠️ Vui lòng thêm xe trước!');
        return;
    }

    document.getElementById('fDateInput').value = getLocalDateString();
    document.getElementById('fOdoInput').value = v.currentOdo || 0;
    document.getElementById('fLitersInput').value = '';
    document.getElementById('fCostInput').value = '';
    document.getElementById('fFullTankCheck').checked = true;

    modal.style.display = 'flex';
}

function handleFuelSubmit(e) {
    e.preventDefault();
    const v = getActiveVehicle();
    if (!v) return;

    const date = document.getElementById('fDateInput').value || getLocalDateString();
    const odo = Number(document.getElementById('fOdoInput').value) || 0;
    const liters = Number(document.getElementById('fLitersInput').value) || 0;
    const totalCost = Number(document.getElementById('fCostInput').value) || 0;
    const isFullTank = document.getElementById('fFullTankCheck').checked;

    if (liters <= 0 || totalCost <= 0) {
        showToast('⚠️ Vui lòng nhập số lít và số tiền đổ xăng hợp lệ!');
        return;
    }

    if (odo > v.currentOdo) {
        v.currentOdo = odo;
    }

    const newFuelLog = {
        id: 'vf_' + generateId(),
        vehicleId: v.id,
        date, odo, liters, totalCost, isFullTank,
        createdAt: new Date().toISOString()
    };

    state.vehicleFuelLogs.push(newFuelLog);
    state.vehicleFuelLogsUpdated = new Date().toISOString();
    state.vehiclesUpdated = new Date().toISOString();
    saveLocalState();
    performSync();

    document.getElementById('vehicleFuelModal').style.display = 'none';
    showToast('⛽ Đã ghi nhận lịch sử đổ xăng!');
    renderVehicleDashboard();
}

// Global window helpers
window.quickUpdateOilChange = function(vehicleId, oilType) {
    const v = state.vehicles.find(item => item.id === vehicleId);
    if (!v) return;

    const promptOdo = prompt(`Nhập số Odometer (km) lúc thay dầu ${oilType === 'engine' ? 'máy' : 'láp'} vừa xong:`, v.currentOdo);
    if (promptOdo === null) return;

    const newOdo = Number(promptOdo) || v.currentOdo;
    if (newOdo > v.currentOdo) {
        v.currentOdo = newOdo;
    }

    if (oilType === 'engine') {
        v.lastEngineOilOdo = newOdo;
    } else {
        v.lastGearOilOdo = newOdo;
    }

    state.vehicleServices.push({
        id: 'vs_' + generateId(),
        vehicleId: v.id,
        date: getLocalDateString(),
        odo: newOdo,
        title: oilType === 'engine' ? 'Thay dầu máy động cơ' : 'Thay dầu láp truyền động',
        cost: 0,
        garage: 'Gara',
        items: [oilType === 'engine' ? 'engine_oil' : 'gear_oil'],
        notes: 'Thay dầu nhanh',
        createdAt: new Date().toISOString()
    });

    state.vehicleServicesUpdated = new Date().toISOString();
    state.vehiclesUpdated = new Date().toISOString();
    saveLocalState();
    performSync();

    showToast(`🛢️ Đã cập nhật mốc thay dầu ${oilType === 'engine' ? 'máy' : 'láp'} mới tại ${newOdo.toLocaleString('vi-VN')} km!`);
    renderVehicleDashboard();
};

window.editVehicleService = function(serviceId) {
    const s = state.vehicleServices.find(item => item.id === serviceId);
    if (s) openServiceFormModal(s);
};

window.deleteVehicleService = function(serviceId) {
    if (!confirm('Xóa bản ghi bảo dưỡng này?')) return;
    state.vehicleServices = state.vehicleServices.filter(s => s.id !== serviceId);
    state.vehicleServicesUpdated = new Date().toISOString();
    saveLocalState();
    performSync();
    showToast('🗑️ Đã xóa bản ghi!');
    renderVehicleDashboard();
};

window.deleteVehicleFuelLog = function(fuelId) {
    if (!confirm('Xóa nhật ký đổ xăng này?')) return;
    state.vehicleFuelLogs = state.vehicleFuelLogs.filter(f => f.id !== fuelId);
    state.vehicleFuelLogsUpdated = new Date().toISOString();
    saveLocalState();
    performSync();
    showToast('🗑️ Đã xóa nhật ký đổ xăng!');
    renderVehicleDashboard();
};

// AI Mechanic Expert Assistant
async function handleVehicleAiConsult() {
    const promptInput = document.getElementById('vAiPromptInput');
    const resultBox = document.getElementById('vAiResultContent');
    const statusBox = document.getElementById('vAiLoadingStatus');

    if (!promptInput || !promptInput.value.trim()) {
        showToast('⚠️ Vui lòng nhập mô tả triệu chứng hoặc thắc mắc về xe!');
        return;
    }

    const question = promptInput.value.trim();
    const v = getActiveVehicle();
    const vehicleInfo = v ? `Xe: ${v.name} (${v.vehicleType}), Odometer: ${v.currentOdo} km.` : 'Xe máy phổ thông.';

    if (statusBox) statusBox.style.display = 'block';
    if (resultBox) resultBox.innerHTML = '🤖 Đang kết nối Trợ lý AI Chẩn đoán...';

    try {
        const apiKey = state.geminiApiKey || '';
        if (!apiKey) {
            if (resultBox) {
                resultBox.innerHTML = `
                    <div style="color: #ef4444; padding: 12px; border: 1px solid rgba(239,68,68,0.3); border-radius: 8px;">
                        ⚠️ Chưa cấu hình Gemini API Key. Vui lòng vào <b>Cài đặt -> Gemini AI Config</b> để nhập API Key miễn phí của bạn!
                    </div>
                `;
            }
            if (statusBox) statusBox.style.display = 'none';
            return;
        }

        const promptText = `Bạn là một kỹ sư chuyên gia bảo dưỡng và chẩn đoán hư hỏng xe máy giàu kinh nghiệm 20 năm tại Việt Nam.
Thông tin xe người dùng: ${vehicleInfo}
Mô tả hiện tượng / thắc mắc của người dùng: "${question}"

Hãy chẩn đoán chi tiết theo định dạng Markdown ngắn gọn và trực quan:
1. 🔍 **Nguyên nhân tiềm ẩn nhiều khả năng nhất** (xếp theo thứ tự từ dễ xảy ra đến phức tạp).
2. 🛠️ **Các bước kiểm tra / khắc phục đề xuất** (phần nào có thể tự làm tại nhà, phần nào nên ra tiệm gara chuyên nghiệp).
3. 💰 **Ước tính chi phí linh kiện / sửa chữa tham khảo** tại Việt Nam.
4. ⚠️ **Mức độ nguy hiểm**: (Bình thường / Cần khắc phục sớm / Nguy hiểm - Dừng xe kiểm tra ngay).`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            const aiText = data.candidates[0].content.parts[0].text;
            if (resultBox) {
                resultBox.innerHTML = `<div class="markdown-body" style="line-height: 1.6; font-size: 0.9rem;">${formatMarkdownText(aiText)}</div>`;
            }
        } else {
            throw new Error('AI không phản hồi dữ liệu.');
        }
    } catch (err) {
        console.error('Vehicle AI Error:', err);
        if (resultBox) {
            resultBox.innerHTML = `<div style="color: #ef4444;">❌ Lỗi kết nối AI: ${escapeHTML(err.message)}</div>`;
        }
    } finally {
        if (statusBox) statusBox.style.display = 'none';
    }
}

function formatMarkdownText(text) {
    if (!text) return '';
    return text
        .replace(/### (.*?)\n/g, '<h4 style="margin: 12px 0 6px 0; font-size: 1rem; color: var(--color-primary);">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '<br/><br/>')
        .replace(/\n- /g, '<br/>• ');
}

export {
    initVehicleBindings,
    renderVehicleDashboard,
    switchVehicleSubView
};
