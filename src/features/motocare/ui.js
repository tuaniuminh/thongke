/* MotoCare - UI Rendering Engine */
import { Vehicles, MaintenanceLogs, FuelLogs, Stats, Presets, AI } from './db.js?v=4.3.266';
import { VEHICLE_TYPES } from './presets.js?v=4.3.266';

export const UI = {
    // Show toast notification
    showToast(message, type = 'success') {
        // Dung FamiLife toast neu dang chay trong FamiLife
        if (typeof window._motocareShowToast === 'function') {
            window._motocareShowToast(message, type);
            return;
        }
        const toast = document.getElementById('motocare-toast');
        if (!toast) return;
        toast.className = 'toast-notification';
        toast.classList.add(`toast-${type}`);
        toast.innerText = message;
        toast.classList.remove('hidden');
        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },

    // Render active vehicle selector in Header
    renderHeaderVehicleSelector() {
        const select = document.getElementById('mc-active-vehicle-select');
        if (!select) return;

        const vehicles = Vehicles.getAll();
        const activeId = Vehicles.getActiveId();

        select.innerHTML = '<option value="">-- Chọn xe --</option>';
        vehicles.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.id;
            opt.innerText = `${v.name} ${v.plate ? '(' + v.plate + ')' : ''}`;
            if (v.id === activeId) opt.selected = true;
            select.appendChild(opt);
        });
    },

    // Render Dashboard
    renderDashboard(vehicleId) {
        const nameEl = document.getElementById('mc-active-vehicle-name');
        const plateEl = document.getElementById('mc-active-vehicle-plate');
        const odoInput = document.getElementById('mc-current-odo-input');
        const healthGrid = document.getElementById('mc-maintenance-health-grid');

        if (!nameEl || !plateEl || !odoInput || !healthGrid) return;

        const vehicle = Vehicles.getById(vehicleId);

        if (!vehicle) {
            nameEl.innerText = "Chưa có xe máy";
            plateEl.innerText = "Thêm xe để bắt đầu theo dõi ODO & bảo dưỡng";
            odoInput.value = "";
            odoInput.disabled = true;
            healthGrid.innerHTML = `
                <div class="empty-state">
                    <div style="font-size: 2.2rem; margin-bottom: 10px;">🏍️</div>
                    <div style="font-weight: 700; font-size: 1.05rem; color: var(--text-primary); margin-bottom: 6px;">Chưa có xe nào được kết nối</div>
                    <p style="margin-bottom: 16px; color: var(--text-secondary); font-size: 0.9rem;">Thêm chiếc xe máy đầu tiên của bạn để theo dõi ODO, nhắc nhở thay dầu và bảo dưỡng phụ tùng định kỳ.</p>
                    <button class="btn btn-primary" onclick="if(window.switchMotocareView) window.switchMotocareView('settings'); setTimeout(() => document.getElementById('mc-btn-add-vehicle')?.click(), 150);">
                        + Thêm xe máy mới
                    </button>
                </div>
            `;
            return;
        }

        // Set Vehicle details
        nameEl.innerText = vehicle.name;
        plateEl.innerText = `${VEHICLE_TYPES[vehicle.type]} ${vehicle.plate ? '• ' + vehicle.plate : ''}`;
        
        odoInput.value = vehicle.currentOdo;
        odoInput.disabled = false;

        // Update Gemini status indicator dot
        const statusDot = document.getElementById('mc-gemini-status-dot');
        if (statusDot) {
            const hasKey = !!AI.getKey();
            statusDot.style.backgroundColor = hasKey ? 'var(--color-success)' : 'var(--color-danger)';
            statusDot.style.boxShadow = hasKey ? '0 0 8px var(--color-success-glow)' : '0 0 8px var(--color-danger-glow)';
            statusDot.title = hasKey ? 'Đã cấu hình Gemini API Key' : 'Chưa cấu hình Gemini API Key';
        }

        // Render health grid
        const healthStatus = Stats.getHealthStatus(vehicleId);
        healthGrid.innerHTML = '';

        if (healthStatus.length === 0) {
            healthGrid.innerHTML = '<div class="empty-state"><p>Không có hạng mục bảo dưỡng nào áp dụng cho loại xe này.</p></div>';
            return;
        }

        healthStatus.forEach(item => {
            const card = document.createElement('div');
            card.className = `health-card status-${item.status}`;
            
            // Calculate SVG radial offset (circumference ~ 220)
            const circumference = 219.9;
            const offset = circumference - (circumference * item.percentage) / 100;
            
            let kmLabel = `Còn ${Math.round(item.remainingKm)} Km`;
            if (item.remainingKm <= 0) {
                kmLabel = 'Quá hạn Km';
            }

            card.innerHTML = `
                <div class="radial-progress-wrapper">
                    <svg class="radial-progress" viewBox="0 0 80 80">
                        <circle class="track" cx="40" cy="40" r="35"></circle>
                        <circle class="fill" cx="40" cy="40" r="35" 
                                style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};"></circle>
                    </svg>
                    <div class="percentage">${item.percentage}%</div>
                </div>
                <div class="card-title" title="${item.name}">${item.name}</div>
                <div class="card-desc">${kmLabel}<br>${item.timeLabel}</div>
                <span class="status-badge">${item.status === 'good' ? 'Tốt' : (item.status === 'warning' ? 'Theo dõi' : 'Cần thay')}</span>
                ${item.hasAdjustment ? `<div class="heuristic-indicator" style="font-size: 0.65rem; color: var(--color-warning); margin-bottom: 8px; font-weight: 500; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;" title="${item.adjustmentReason}">⚠️ Tối ưu AI</div>` : ''}
                <button class="btn btn-secondary btn-sm btn-quick-log" data-category="${item.key}">
                    Thay phụ tùng
                </button>
            `;
            healthGrid.appendChild(card);
        });
    },

    // Render Vehicles View
    renderVehiclesList() {
        const container = document.getElementById('mc-vehicles-list-container');
        if (!container) return;

        const vehicles = Vehicles.getAll();
        const activeId = Vehicles.getActiveId();

        if (vehicles.length === 0) {
            container.innerHTML = `
                <div class="card empty-state">
                    <p>Nhà xe của bạn đang trống. Vui lòng nhấn nút <strong>Thêm xe mới</strong> ở góc trên để tạo xe đầu tiên.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = '';
        vehicles.forEach(v => {
            const card = document.createElement('div');
            card.className = `card vehicle-item-card ${v.id === activeId ? 'active-vehicle' : ''}`;
            if (v.id === activeId) {
                card.style.borderColor = 'var(--color-primary)';
                card.style.boxShadow = '0 0 15px rgba(0, 242, 254, 0.1)';
            }

            card.innerHTML = `
                <div class="vehicle-item-info">
                    <h4>${v.name} ${v.id === activeId ? '👑' : ''}</h4>
                    <div class="vehicle-meta-tags">
                        ${v.plate ? `<span class="meta-tag plate">${v.plate}</span>` : ''}
                        <span class="meta-tag">${VEHICLE_TYPES[v.type]}</span>
                        <span class="meta-tag">${v.currentOdo.toLocaleString()} Km</span>
                    </div>
                </div>
                <div class="vehicle-item-actions">
                    ${v.id !== activeId ? `<button class="btn btn-secondary btn-sm btn-set-active" data-id="${v.id}">Chọn</button>` : ''}
                    <button class="btn btn-secondary btn-sm btn-edit-vehicle" data-id="${v.id}">Sửa</button>
                    <button class="btn btn-danger btn-sm btn-delete-vehicle" data-id="${v.id}">Xóa</button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // Render Fuel Tracker View
    renderFuelTracker(vehicleId) {
        const efficiencyEl = document.getElementById('mc-stat-fuel-efficiency');
        const costPerKmEl = document.getElementById('mc-stat-fuel-cost-per-km');
        const totalCostEl = document.getElementById('mc-stat-total-fuel-cost');
        const tbody = document.getElementById('mc-fuel-logs-tbody');

        if (!efficiencyEl || !costPerKmEl || !totalCostEl || !tbody) return;

        const vehicle = Vehicles.getById(vehicleId);
        if (!vehicle) {
            efficiencyEl.innerText = '--';
            costPerKmEl.innerText = '--';
            totalCostEl.innerText = '--';
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Vui lòng thêm xe để theo dõi xăng dầu.</td></tr>';
            this.renderFuelChart([]);
            return;
        }

        const stats = Stats.calculateFuelStats(vehicleId);
        const logs = FuelLogs.getByVehicle(vehicleId);

        // Display statistics
        efficiencyEl.innerText = stats.efficiency !== null ? `${stats.efficiency} L/100 Km` : '--';
        costPerKmEl.innerText = stats.costPerKm !== null ? `${stats.costPerKm.toLocaleString()} đ/Km` : '--';
        totalCostEl.innerText = `${stats.totalCost.toLocaleString()} đ`;

        // Render Table Body
        tbody.innerHTML = '';
        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Chưa có nhật ký đổ xăng nào.</td></tr>';
        } else {
            // To calculate single log efficiency, we need to compare with previous logs (sorted by Odo)
            const sorted = [...logs].sort((a,b) => a.odo - b.odo);
            
            logs.forEach(log => {
                // Find efficiency for this log if possible
                let logEffLabel = '-';
                if (log.full) {
                    const idx = sorted.findIndex(l => l.id === log.id);
                    // find previous full log
                    let prevFull = null;
                    let accumLiters = 0;
                    for (let i = idx - 1; i >= 0; i--) {
                        accumLiters += sorted[i + 1].liters; // accumulate liters from target up to previous
                        if (sorted[i].full) {
                            prevFull = sorted[i];
                            break;
                        }
                    }
                    if (prevFull) {
                        const dist = log.odo - prevFull.odo;
                        if (dist > 0) {
                            logEffLabel = `${((accumLiters / dist) * 100).toFixed(1)} L/100k`;
                        }
                    }
                }

                const tr = document.createElement('tr');
                const logDate = new Date(log.date).toLocaleDateString('vi-VN');
                tr.innerHTML = `
                    <td data-label="Ngày">${logDate}</td>
                    <td data-label="Số ODO">${log.odo.toLocaleString()} Km</td>
                    <td data-label="Số lít">${log.liters.toFixed(2)} L ${log.full ? '⛽' : '⚠️'}</td>
                    <td data-label="Chi phí">${log.cost.toLocaleString()} đ</td>
                    <td data-label="Mức tiêu thụ" style="font-weight: 500; color: var(--color-primary);">${logEffLabel}</td>
                    <td data-label="Hành động">
                        <button class="action-icon-btn btn-delete-fuel" data-id="${log.id}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        // Render Fuel Chart
        this.renderFuelChart(stats.chartData);
    },

    // Render SVG Line Chart
    renderFuelChart(chartData) {
        const container = document.getElementById('mc-fuel-chart-container');
        if (!container) return;

        if (chartData.length < 2) {
            container.innerHTML = `
                <div class="empty-state">
                    Chưa đủ dữ liệu để vẽ biểu đồ.<br>
                    <small style="color: var(--text-secondary);">Cần tối thiểu 2 lần đổ xăng đầy bình liên tiếp.</small>
                </div>
            `;
            return;
        }

        // SVG Dimensions
        const width = container.clientWidth || 500;
        const height = 200;
        const paddingLeft = 40;
        const paddingRight = 20;
        const paddingTop = 25;
        const paddingBottom = 30;

        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        // Min Max of values
        const efficiencies = chartData.map(d => d.efficiency);
        let minEff = Math.min(...efficiencies) * 0.9;
        let maxEff = Math.max(...efficiencies) * 1.1;
        
        // Ensure some padding in scaling
        if (maxEff === minEff) {
            minEff -= 0.5;
            maxEff += 0.5;
        }

        // Plot points
        const pointsCount = chartData.length;
        const points = chartData.map((d, index) => {
            const x = paddingLeft + (index / (pointsCount - 1)) * chartWidth;
            const y = paddingTop + chartHeight - ((d.efficiency - minEff) / (maxEff - minEff)) * chartHeight;
            return { x, y, val: d.efficiency, date: d.date };
        });

        // Build SVG Elements
        let svgContent = `
            <svg class="svg-chart" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
                <defs>
                    <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.3"/>
                        <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.0"/>
                    </linearGradient>
                </defs>
        `;

        // Horizontal Gridlines & Y Labels (3 lines: Min, Mid, Max)
        const yLabelsCount = 3;
        for (let i = 0; i < yLabelsCount; i++) {
            const ratio = i / (yLabelsCount - 1);
            const val = minEff + ratio * (maxEff - minEff);
            const y = paddingTop + chartHeight - ratio * chartHeight;
            
            // Gridline
            svgContent += `<line class="chart-gridline" x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" />`;
            // Label
            svgContent += `<text class="chart-label" x="${paddingLeft - 10}" y="${y + 4}" text-anchor="end">${val.toFixed(1)}</text>`;
        }

        // Draw Line Path and Area Path
        let linePath = `M ${points[0].x} ${points[0].y}`;
        let areaPath = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length; i++) {
            linePath += ` L ${points[i].x} ${points[i].y}`;
            areaPath += ` L ${points[i].x} ${points[i].y}`;
        }
        
        areaPath += ` L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;

        svgContent += `<path class="chart-area" d="${areaPath}" />`;
        svgContent += `<path class="chart-line" d="${linePath}" />`;

        // Draw dots and X labels (dates)
        points.forEach((p, idx) => {
            svgContent += `<circle class="chart-dot" cx="${p.x}" cy="${p.y}" r="5" data-val="${p.val}" />`;
            
            // X Labels (Date) - skip some if too many to prevent overlapping
            const shouldShowLabel = pointsCount <= 6 || idx === 0 || idx === pointsCount - 1 || idx === Math.floor(pointsCount / 2);
            if (shouldShowLabel) {
                const dateObj = new Date(p.date);
                const dateStr = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;
                svgContent += `<text class="chart-label" x="${p.x}" y="${height - 10}">${dateStr}</text>`;
            }
        });

        svgContent += `</svg>`;
        container.innerHTML = svgContent;
    },

    // Render Maintenance History View
    renderHistory(vehicleId, filterCategory = 'all', isEditMode = false) {
        const tbody = document.getElementById('mc-maint-logs-tbody');
        if (!tbody) return;

        // Cập nhật trạng thái nút chuyển chế độ Sửa
        const toggleBtn = document.getElementById('mc-btn-toggle-maint-edit');
        const toggleText = document.getElementById('mc-toggle-maint-edit-text');
        if (toggleBtn && toggleText) {
            if (isEditMode) {
                toggleText.innerText = 'Hoàn tất';
                toggleBtn.className = 'btn btn-primary';
            } else {
                toggleText.innerText = 'Chỉnh sửa';
                toggleBtn.className = 'btn btn-secondary';
            }
        }

        const thAction = document.getElementById('mc-th-maint-action');
        if (thAction) {
            thAction.style.display = isEditMode ? 'table-cell' : 'none';
        }

        const vehicle = Vehicles.getById(vehicleId);
        if (!vehicle) {
            tbody.innerHTML = `<tr><td colspan="${isEditMode ? 6 : 5}" class="empty-state">Vui lòng thêm xe để xem lịch sử bảo dưỡng.</td></tr>`;
            return;
        }

        let logs = MaintenanceLogs.getByVehicle(vehicleId);

        if (filterCategory !== 'all') {
            logs = logs.filter(l => l.category === filterCategory);
        }

        tbody.innerHTML = '';
        if (logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${isEditMode ? 6 : 5}" class="empty-state">Chưa có bản ghi bảo dưỡng nào.</td></tr>`;
            return;
        }

        // Mapping keys to readable names
        const presets = Presets.getForVehicle(vehicleId);
        
        logs.forEach(log => {
            const presetName = presets[log.category] ? presets[log.category].name : (log.category === 'brake' ? 'Má phanh (Trước/Sau)' : 'Bảo dưỡng khác');
            const logDate = new Date(log.date).toLocaleDateString('vi-VN');
            
            const tr = document.createElement('tr');
            const actionTdHtml = isEditMode ? `
                <td data-label="Hành động" style="white-space: nowrap;">
                    <div style="display: inline-flex; gap: 6px; align-items: center;">
                        <button class="btn btn-secondary btn-sm btn-edit-maint" data-id="${log.id}" title="Sửa ghi chép" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.8rem; border-radius: 6px; cursor: pointer;">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>Sửa</span>
                        </button>
                        <button class="btn btn-danger btn-sm btn-delete-maint" data-id="${log.id}" title="Xóa ghi chép" style="display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; font-size: 0.8rem; border-radius: 6px; cursor: pointer; background: var(--color-danger, #ef4444); color: white; border: none;">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                            <span>Xóa</span>
                        </button>
                    </div>
                </td>
            ` : '';

            tr.innerHTML = `
                <td data-label="Ngày">${logDate}</td>
                <td data-label="Số ODO">${log.odo.toLocaleString()} Km</td>
                <td data-label="Hạng mục" style="font-weight: 600; color: var(--color-primary-end);">${presetName}</td>
                <td data-label="Chi phí">${log.cost > 0 ? log.cost.toLocaleString() + ' đ' : 'Miễn phí'}</td>
                <td data-label="Ghi chú" title="${log.notes}">${log.notes || '-'}</td>
                ${actionTdHtml}
            `;
            tbody.appendChild(tr);
        });
    },

    // Render Presets Settings List
    renderPresetsSettings(vehicleId, isEditMode = false) {
        const container = document.getElementById('mc-presets-config-list');
        if (!container) return;

        // Cập nhật trạng thái hiển thị của nút AI và nút chuyển đổi chế độ Sửa
        const aiBtn = document.getElementById('mc-btn-ai-optimize-presets');
        const toggleBtn = document.getElementById('mc-btn-toggle-presets-edit');
        const toggleText = document.getElementById('mc-toggle-presets-text');

        if (aiBtn) {
            aiBtn.style.display = isEditMode ? 'inline-flex' : 'none';
        }
        if (toggleBtn && toggleText) {
            if (isEditMode) {
                toggleText.innerText = 'Hoàn tất';
                toggleBtn.className = 'btn btn-primary btn-sm';
            } else {
                toggleText.innerText = 'Thay đổi';
                toggleBtn.className = 'btn btn-secondary btn-sm';
            }
        }

        const vehicle = Vehicles.getById(vehicleId);
        if (!vehicle) {
            container.innerHTML = `
                <div class="empty-state" style="padding: 10px 0;">
                    Vui lòng chọn hoặc thêm xe máy để cấu hình định mức bảo dưỡng.
                </div>
            `;
            return;
        }

        const presets = Presets.getForVehicle(vehicleId);
        container.innerHTML = '';

        for (const [key, p] of Object.entries(presets)) {
            const item = document.createElement('div');
            item.className = 'preset-setting-item';
            const editBtnHtml = isEditMode ? `
                <button class="btn btn-secondary btn-sm btn-edit-preset" data-key="${key}" data-name="${p.name}" data-km="${p.intervalKm}" data-months="${p.intervalMonths}">
                    Thay đổi
                </button>
            ` : '';

            item.innerHTML = `
                <div class="preset-setting-details">
                    <h5>${p.name}</h5>
                    <p>Mỗi: <strong>${p.intervalKm.toLocaleString()} Km</strong> hoặc <strong>${p.intervalMonths} Tháng</strong></p>
                </div>
                ${editBtnHtml}
            `;
            container.appendChild(item);
        }
    },

    // Render Multi-Item Maintenance Checklist for Batch Mode
    renderMaintenanceChecklist(vehicleId, preselectedCategories = null, categoryCosts = {}) {
        const container = document.getElementById('mc-maint-checklist-container');
        if (!container) return;

        const presets = Presets.getForVehicle(vehicleId);
        container.innerHTML = '';

        // Danh sách các hạng mục: các preset của xe + 'other' (Bảo dưỡng khác)
        const items = Object.entries(presets).map(([k, p]) => ({
            key: k,
            name: p.name,
            desc: p.desc || ''
        }));

        items.push({
            key: 'other',
            name: 'Bảo dưỡng / Sửa chữa khác',
            desc: 'Các hạng mục sửa chữa, thay thế hoặc công thợ ngoài danh mục'
        });

        items.forEach(item => {
            const isChecked = Array.isArray(preselectedCategories) 
                ? preselectedCategories.includes(item.key) 
                : (preselectedCategories && item.key === preselectedCategories);
            const initialCost = (categoryCosts && categoryCosts[item.key]) ? categoryCosts[item.key] : '';
            const row = document.createElement('div');
            row.className = 'maint-checklist-item';
            row.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 8px;
                padding: 10px 12px;
                background: var(--bg-secondary);
                border: 1px solid ${isChecked ? 'var(--color-primary, #00f2fe)' : 'var(--border-color)'};
                border-radius: 8px;
                transition: all 0.2s ease;
            `;

            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" class="mc-checklist-header">
                    <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; margin: 0; font-size: 0.9rem; font-weight: 600; color: var(--text-primary); user-select: none; flex: 1;">
                        <input type="checkbox" class="mc-maint-check-input" data-category="${item.key}" ${isChecked ? 'checked' : ''} style="width: 17px; height: 17px; cursor: pointer; accent-color: var(--color-primary, #00f2fe);">
                        <span>${item.name}</span>
                    </label>
                    <span style="font-size: 0.75rem; color: var(--text-muted); max-width: 140px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.desc}</span>
                </div>
                <div class="mc-checklist-cost-wrap" style="display: ${isChecked ? 'flex' : 'none'}; align-items: center; gap: 8px; padding-left: 27px;">
                    <span style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;">Chi phí:</span>
                    <input type="number" class="mc-maint-item-cost form-input" data-category="${item.key}" value="${initialCost}" placeholder="0 đ (hoặc bỏ trống)" min="0" step="1000" style="padding: 5px 10px; font-size: 0.85rem; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); width: 140px;">
                    <span style="font-size: 0.8rem; color: var(--text-muted);">VNĐ</span>
                </div>
            `;

            // Checkbox change listener
            const checkbox = row.querySelector('.mc-maint-check-input');
            const costWrap = row.querySelector('.mc-checklist-cost-wrap');
            const costInput = row.querySelector('.mc-maint-item-cost');

            checkbox.addEventListener('change', () => {
                costWrap.style.display = checkbox.checked ? 'flex' : 'none';
                row.style.borderColor = checkbox.checked ? 'var(--color-primary, #00f2fe)' : 'var(--border-color)';
                if (checkbox.checked) {
                    costInput.focus();
                } else {
                    costInput.value = '';
                }
                this.updateMaintenanceBatchSummary();
            });

            costInput?.addEventListener('input', () => {
                this.updateMaintenanceBatchSummary();
            });

            container.appendChild(row);
        });

        this.updateMaintenanceBatchSummary();
    },

    updateMaintenanceBatchSummary() {
        const checkboxes = document.querySelectorAll('.mc-maint-check-input:checked');
        const costInputs = document.querySelectorAll('.mc-maint-item-cost');
        let totalCost = 0;
        let count = checkboxes.length;

        costInputs.forEach(input => {
            const cat = input.getAttribute('data-category');
            const chk = document.querySelector(`.mc-maint-check-input[data-category="${cat}"]`);
            if (chk && chk.checked) {
                const val = parseInt(input.value) || 0;
                totalCost += val;
            }
        });

        const countEl = document.getElementById('mc-maint-selected-count');
        const costEl = document.getElementById('mc-maint-selected-cost');
        const btnText = document.getElementById('mc-btn-save-maintenance-text');

        if (countEl) countEl.innerText = count;
        if (costEl) costEl.innerText = totalCost.toLocaleString() + ' đ';
        if (btnText) {
            btnText.innerText = count > 1 ? `Lưu ${count} hạng mục` : (count === 1 ? `Lưu 1 hạng mục` : `Lưu lịch sử`);
        }
    }
};
