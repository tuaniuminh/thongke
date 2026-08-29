/* MotoCare - Database & Business Logic Layer (FamiLife E2EE Integrated) */
import { DEFAULT_PRESETS, VEHICLE_TYPES } from './presets.js?v=4.3.249';
import { state, saveLocalState, performSync } from '../../core/app.js?v=4.3.249';

// Keys for LocalStorage
const KEYS = {
    VEHICLES: 'motocare_vehicles',
    ACTIVE_VEHICLE_ID: 'motocare_active_id',
    MAINTENANCE_LOGS: 'motocare_maint_logs',
    FUEL_LOGS: 'motocare_fuel_logs',
    CUSTOM_PRESETS: 'motocare_custom_presets',
    GEMINI_KEY: 'motocare_gemini_key'
};

// Helper: Sync local modification to FamiLife state and trigger encrypted save + sync
function syncToFamiLife(key, data) {
    if (!state) return;
    const now = new Date().toISOString();
    if (key === KEYS.VEHICLES) {
        state.motocareVehicles = data;
        state.motocareVehiclesUpdated = now;
    } else if (key === KEYS.ACTIVE_VEHICLE_ID) {
        state.motocareActiveId = data || '';
    } else if (key === KEYS.MAINTENANCE_LOGS) {
        state.motocareMaintLogs = data;
        state.motocareMaintLogsUpdated = now;
    } else if (key === KEYS.FUEL_LOGS) {
        state.motocareFuelLogs = data;
        state.motocareFuelLogsUpdated = now;
    } else if (key === KEYS.CUSTOM_PRESETS) {
        state.motocareCustomPresets = data;
        state.motocareCustomPresetsUpdated = now;
    }
    if (typeof saveLocalState === 'function') {
        saveLocalState();
    }
    if (typeof performSync === 'function') {
        performSync(true);
    }
}

// Helper: Get item from state (with fallback to LocalStorage)
function getLocal(key, defaultValue = []) {
    if (state) {
        if (key === KEYS.VEHICLES && Array.isArray(state.motocareVehicles) && state.motocareVehicles.length > 0) {
            return state.motocareVehicles;
        }
        if (key === KEYS.ACTIVE_VEHICLE_ID && state.motocareActiveId) {
            return state.motocareActiveId;
        }
        if (key === KEYS.MAINTENANCE_LOGS && Array.isArray(state.motocareMaintLogs) && state.motocareMaintLogs.length > 0) {
            return state.motocareMaintLogs;
        }
        if (key === KEYS.FUEL_LOGS && Array.isArray(state.motocareFuelLogs) && state.motocareFuelLogs.length > 0) {
            return state.motocareFuelLogs;
        }
        if (key === KEYS.CUSTOM_PRESETS && state.motocareCustomPresets && Object.keys(state.motocareCustomPresets).length > 0) {
            return state.motocareCustomPresets;
        }
    }
    try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : defaultValue;
    } catch (e) {
        console.error("Lỗi đọc LocalStorage cho key: " + key, e);
        return defaultValue;
    }
}

// Helper: Set item in LocalStorage and sync to FamiLife state
function setLocal(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        syncToFamiLife(key, data);
        return true;
    } catch (e) {
        console.error("Lỗi ghi LocalStorage cho key: " + key, e);
        return false;
    }
}

// Helper: Generate UUID
function generateUUID() {
    return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

// VEHICLES API
export const Vehicles = {
    getAll() {
        return getLocal(KEYS.VEHICLES, []);
    },

    getById(id) {
        const list = this.getAll();
        return list.find(v => v.id === id) || null;
    },

    saveAll(list) {
        return setLocal(KEYS.VEHICLES, list);
    },

    add(vehicle) {
        const list = this.getAll();
        const now = new Date().toISOString();
        const newVehicle = {
            id: generateUUID(),
            name: vehicle.name.trim(),
            plate: (vehicle.plate || '').trim(),
            type: vehicle.type, // 'scooter' | 'manual' | 'clutch'
            currentOdo: parseInt(vehicle.currentOdo) || 0,
            buyDate: vehicle.buyDate || now.split('T')[0],
            updated_at: now
        };
        list.push(newVehicle);
        this.saveAll(list);
        
        // Auto set active if it's the first vehicle
        if (list.length === 1) {
            this.setActiveId(newVehicle.id);
        }
        return newVehicle;
    },

    update(vehicle) {
        const list = this.getAll();
        const idx = list.findIndex(v => v.id === vehicle.id);
        if (idx !== -1) {
            const newOdo = parseInt(vehicle.currentOdo) || 0;
            list[idx] = {
                ...list[idx],
                name: vehicle.name.trim(),
                plate: (vehicle.plate || '').trim(),
                type: vehicle.type,
                currentOdo: newOdo,
                buyDate: vehicle.buyDate || list[idx].buyDate,
                updated_at: new Date().toISOString()
            };
            this.saveAll(list);
            return list[idx];
        }
        return null;
    },

    delete(id) {
        let list = this.getAll();
        list = list.filter(v => v.id !== id);
        this.saveAll(list);

        // Clean up corresponding data
        let maintLogs = getLocal(KEYS.MAINTENANCE_LOGS, []);
        maintLogs = maintLogs.filter(log => log.vehicleId !== id);
        setLocal(KEYS.MAINTENANCE_LOGS, maintLogs);

        let fuelLogs = getLocal(KEYS.FUEL_LOGS, []);
        fuelLogs = fuelLogs.filter(log => log.vehicleId !== id);
        setLocal(KEYS.FUEL_LOGS, fuelLogs);

        let presets = getLocal(KEYS.CUSTOM_PRESETS, {});
        delete presets[id];
        setLocal(KEYS.CUSTOM_PRESETS, presets);

        // Reset active vehicle if deleted
        if (this.getActiveId() === id) {
            if (list.length > 0) {
                this.setActiveId(list[0].id);
            } else {
                localStorage.removeItem(KEYS.ACTIVE_VEHICLE_ID);
                if (state) state.motocareActiveId = '';
                if (typeof saveLocalState === 'function') saveLocalState();
                if (typeof performSync === 'function') performSync(true);
            }
        }
        return true;
    },

    getActiveId() {
        if (state && state.motocareActiveId) return state.motocareActiveId;
        return localStorage.getItem(KEYS.ACTIVE_VEHICLE_ID) || null;
    },

    setActiveId(id) {
        localStorage.setItem(KEYS.ACTIVE_VEHICLE_ID, id || '');
        if (state) state.motocareActiveId = id || '';
        if (typeof saveLocalState === 'function') saveLocalState();
        if (typeof performSync === 'function') performSync(true);
    },

    getActive() {
        const activeId = this.getActiveId();
        if (!activeId) return null;
        return this.getById(activeId);
    },

    updateOdo(id, newOdo) {
        const vehicle = this.getById(id);
        if (vehicle) {
            newOdo = parseInt(newOdo);
            if (isNaN(newOdo) || newOdo < 0) {
                return { success: false, error: 'Số ODO không hợp lệ. Vui lòng nhập số nguyên dương (≥ 0).' };
            }
            vehicle.currentOdo = newOdo;
            this.update(vehicle);
            return { success: true, vehicle };
        }
        return { success: false, error: 'Không tìm thấy xe.' };
    }
};

// PRESETS API (CUSTOM INTERVALS PER VEHICLE)
export const Presets = {
    getForVehicle(vehicleId) {
        const vehicle = Vehicles.getById(vehicleId);
        if (!vehicle) return {};

        const custom = getLocal(KEYS.CUSTOM_PRESETS, {});
        const vehicleCustom = custom[vehicleId] || {};

        // Merge defaults with custom values
        const merged = {};
        for (const [key, preset] of Object.entries(DEFAULT_PRESETS)) {
            if (preset[vehicle.type] === true) {
                const custVal = vehicleCustom[key] || {};
                merged[key] = {
                    key: key,
                    name: preset.name,
                    desc: preset.desc,
                    icon: preset.icon,
                    intervalKm: custVal.intervalKm !== undefined ? custVal.intervalKm : preset.intervalKm,
                    intervalMonths: custVal.intervalMonths !== undefined ? custVal.intervalMonths : preset.intervalMonths
                };
            }
        }
        return merged;
    },

    saveForVehicle(vehicleId, presetKey, intervalKm, intervalMonths) {
        const custom = getLocal(KEYS.CUSTOM_PRESETS, {});
        if (!custom[vehicleId]) custom[vehicleId] = {};
        
        custom[vehicleId][presetKey] = {
            intervalKm: parseInt(intervalKm) || 0,
            intervalMonths: parseInt(intervalMonths) || 0
        };
        return setLocal(KEYS.CUSTOM_PRESETS, custom);
    },

    saveAllForVehicle(vehicleId, itemsMap) {
        const custom = getLocal(KEYS.CUSTOM_PRESETS, {});
        if (!custom[vehicleId]) custom[vehicleId] = {};

        for (const [key, item] of Object.entries(itemsMap || {})) {
            if (item && item.km !== undefined && item.months !== undefined) {
                custom[vehicleId][key] = {
                    intervalKm: parseInt(item.km) || 0,
                    intervalMonths: parseInt(item.months) || 0
                };
            }
        }
        return setLocal(KEYS.CUSTOM_PRESETS, custom);
    }
};

// MAINTENANCE LOGS API
export const MaintenanceLogs = {
    getAll() {
        return getLocal(KEYS.MAINTENANCE_LOGS, []);
    },

    getByVehicle(vehicleId) {
        const list = this.getAll();
        return list
            .filter(log => log.vehicleId === vehicleId)
            .sort((a, b) => new Date(b.date) - new Date(a.date) || b.odo - a.odo);
    },

    getById(id) {
        const list = this.getAll();
        return list.find(log => log.id === id) || null;
    },

    add(log) {
        const list = this.getAll();
        const now = new Date().toISOString();
        const newLog = {
            id: generateUUID(),
            vehicleId: log.vehicleId,
            date: log.date || now.split('T')[0],
            odo: parseInt(log.odo) || 0,
            category: log.category,
            cost: parseInt(log.cost) || 0,
            notes: (log.notes || '').trim(),
            updated_at: now
        };
        list.push(newLog);
        this.saveAll(list);

        // Update vehicle ODO if this log ODO is higher
        const vehicle = Vehicles.getById(log.vehicleId);
        if (vehicle && newLog.odo > vehicle.currentOdo) {
            Vehicles.updateOdo(vehicle.id, newLog.odo);
        }

        return newLog;
    },

    addAll(logsArray) {
        if (!Array.isArray(logsArray) || logsArray.length === 0) return [];
        const list = this.getAll();
        const now = new Date().toISOString();
        const added = [];
        let maxOdo = 0;
        let vId = null;

        logsArray.forEach(log => {
            const odoVal = parseInt(log.odo) || 0;
            const newLog = {
                id: generateUUID(),
                vehicleId: log.vehicleId,
                date: log.date || now.split('T')[0],
                odo: odoVal,
                category: log.category,
                cost: parseInt(log.cost) || 0,
                notes: (log.notes || '').trim(),
                updated_at: now
            };
            list.push(newLog);
            added.push(newLog);
            if (odoVal > maxOdo) {
                maxOdo = odoVal;
                vId = log.vehicleId;
            }
        });

        this.saveAll(list);

        // Update vehicle ODO if maxOdo is higher
        if (vId && maxOdo > 0) {
            const vehicle = Vehicles.getById(vId);
            if (vehicle && maxOdo > vehicle.currentOdo) {
                Vehicles.updateOdo(vehicle.id, maxOdo);
            }
        }

        return added;
    },

    update(log) {
        const list = this.getAll();
        const idx = list.findIndex(l => l.id === log.id);
        if (idx !== -1) {
            const now = new Date().toISOString();
            list[idx] = {
                ...list[idx],
                date: log.date || list[idx].date,
                odo: parseInt(log.odo) !== undefined ? parseInt(log.odo) : list[idx].odo,
                category: log.category || list[idx].category,
                cost: parseInt(log.cost) !== undefined ? parseInt(log.cost) : list[idx].cost,
                notes: (log.notes !== undefined ? log.notes : list[idx].notes || '').trim(),
                updated_at: now
            };
            this.saveAll(list);

            // Update vehicle ODO if this log ODO is higher
            const vehicle = Vehicles.getById(list[idx].vehicleId);
            if (vehicle && list[idx].odo > vehicle.currentOdo) {
                Vehicles.updateOdo(vehicle.id, list[idx].odo);
            }
            return list[idx];
        }
        return null;
    },

    saveAll(list) {
        return setLocal(KEYS.MAINTENANCE_LOGS, list);
    },

    delete(id) {
        let list = this.getAll();
        list = list.filter(log => log.id !== id);
        return this.saveAll(list);
    }
};

// FUEL LOGS API
export const FuelLogs = {
    getAll() {
        return getLocal(KEYS.FUEL_LOGS, []);
    },

    getByVehicle(vehicleId) {
        const list = this.getAll();
        return list
            .filter(log => log.vehicleId === vehicleId)
            .sort((a, b) => new Date(b.date) - new Date(a.date) || b.odo - a.odo);
    },

    add(log) {
        const list = this.getAll();
        const now = new Date().toISOString();
        const newLog = {
            id: generateUUID(),
            vehicleId: log.vehicleId,
            date: log.date || now.split('T')[0],
            odo: parseInt(log.odo) || 0,
            liters: parseFloat(log.liters) || 0,
            cost: parseInt(log.cost) || 0,
            full: log.full !== false,
            updated_at: now
        };
        list.push(newLog);
        this.saveAll(list);

        // Update vehicle ODO if this log ODO is higher
        const vehicle = Vehicles.getById(log.vehicleId);
        if (vehicle && newLog.odo > vehicle.currentOdo) {
            Vehicles.updateOdo(vehicle.id, newLog.odo);
        }

        return newLog;
    },

    saveAll(list) {
        return setLocal(KEYS.FUEL_LOGS, list);
    },

    delete(id) {
        let list = this.getAll();
        list = list.filter(log => log.id !== id);
        return this.saveAll(list);
    }
};

// STATISTICS & HEALTH CALCULATION ENGINE
export const Stats = {
    calculateFuelStats(vehicleId) {
        const logs = FuelLogs.getByVehicle(vehicleId).sort((a, b) => new Date(a.date) - new Date(b.date) || a.odo - b.odo);
        
        if (logs.length === 0) {
            return {
                efficiency: null,
                costPerKm: null,
                totalCost: 0,
                totalLiters: 0,
                chartData: []
            };
        }

        let totalCost = 0;
        let totalLiters = 0;
        const chartData = [];

        logs.forEach(l => {
            totalCost += l.cost;
            totalLiters += l.liters;
        });

        // Calculate efficiency only between full-to-full fills
        let prevFullLog = null;
        let weightedEfficiencySum = 0;
        let totalDistanceMeasured = 0;
        let accLiters = 0;
        let accCost = 0;

        for (let i = 0; i < logs.length; i++) {
            const current = logs[i];
            accLiters += current.liters;
            accCost += current.cost;

            if (current.full) {
                if (prevFullLog) {
                    const distance = current.odo - prevFullLog.odo;
                    if (distance > 0) {
                        const eff = (accLiters / distance) * 100;
                        const costKm = accCost / distance;
                        
                        // sanity check for reasonable motorcycle fuel consumption (0.8L - 10L/100km)
                        if (eff >= 0.5 && eff <= 12) {
                            chartData.push({
                                date: current.date,
                                odo: current.odo,
                                efficiency: parseFloat(eff.toFixed(2)),
                                costPerKm: Math.round(costKm),
                                distance
                            });

                            weightedEfficiencySum += eff * distance;
                            totalDistanceMeasured += distance;
                        }
                    }
                }
                prevFullLog = current;
                accLiters = 0;
                accCost = 0;
            }
        }

        const avgEfficiency = totalDistanceMeasured > 0 
            ? parseFloat((weightedEfficiencySum / totalDistanceMeasured).toFixed(2)) 
            : null;

        const firstLog = logs[0];
        const lastLog = logs[logs.length - 1];
        const overallDistance = lastLog.odo - firstLog.odo;
        const avgCostPerKm = overallDistance > 0 ? Math.round(totalCost / overallDistance) : null;

        return {
            efficiency: avgEfficiency,
            costPerKm: avgCostPerKm,
            totalCost,
            totalLiters: parseFloat(totalLiters.toFixed(2)),
            chartData
        };
    },

    getHealthStatus(vehicleId) {
        const vehicle = Vehicles.getById(vehicleId);
        if (!vehicle) return [];

        const presets = Presets.getForVehicle(vehicleId);
        const maintLogs = MaintenanceLogs.getByVehicle(vehicleId);
        const fuelStats = this.calculateFuelStats(vehicleId);
        const currentOdo = vehicle.currentOdo;
        const buyDate = new Date(vehicle.buyDate || new Date());

        const health = [];

        // Check if there is severe fuel spike warning
        let fuelSpikeWarning = false;
        let fuelSpikePercent = 0;
        if (fuelStats.chartData.length >= 2 && fuelStats.efficiency !== null) {
            const latestEff = fuelStats.chartData[fuelStats.chartData.length - 1].efficiency;
            if (latestEff > fuelStats.efficiency * 1.15) {
                fuelSpikeWarning = true;
                fuelSpikePercent = Math.round(((latestEff - fuelStats.efficiency) / fuelStats.efficiency) * 100);
            }
        }

        for (const [key, item] of Object.entries(presets)) {
            // Find most recent maintenance for this category
            const logsForCat = maintLogs.filter(l => l.category === key);
            let lastOdo = 0;
            let lastDate = buyDate;
            let lastDateStr = vehicle.buyDate || 'Lúc mua xe';

            if (logsForCat.length > 0) {
                lastOdo = logsForCat[0].odo;
                lastDate = new Date(logsForCat[0].date);
                lastDateStr = logsForCat[0].date;
            }

            // Adjust intervals based on dynamic riding conditions
            let adjustedIntervalKm = item.intervalKm;
            let adjustedIntervalMonths = item.intervalMonths;
            let hasAdjustment = false;
            let adjustmentReason = '';

            if (fuelSpikeWarning && (key === 'air_filter' || key === 'spark_plug')) {
                adjustedIntervalKm = Math.round(adjustedIntervalKm * 0.8);
                hasAdjustment = true;
                adjustmentReason = `Hao xăng tăng +${fuelSpikePercent}%, kiến nghị kiểm tra sớm`;
            }

            // Calculate usage metrics
            const kmUsed = Math.max(0, currentOdo - lastOdo);
            const kmRemaining = adjustedIntervalKm - kmUsed;

            const now = new Date();
            const monthsPassed = Math.max(0, (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth()));
            const monthsRemaining = adjustedIntervalMonths - monthsPassed;

            const kmPercent = (kmUsed / adjustedIntervalKm) * 100;
            const timePercent = (monthsPassed / adjustedIntervalMonths) * 100;

            const maxPercent = Math.max(kmPercent, timePercent);
            const percentage = Math.min(100, Math.round(maxPercent));

            let status = 'good';
            if (percentage >= 100) {
                status = 'danger';
            } else if (percentage >= 75) {
                status = 'warning';
            }

            const remainingKm = Math.max(0, kmRemaining);
            const remainingMonths = Math.max(0, monthsRemaining);

            let timeLabel = '';
            if (remainingMonths <= 0) {
                timeLabel = 'Hết hạn thời gian';
            } else {
                timeLabel = `còn ${remainingMonths} tháng`;
            }

            health.push({
                key,
                name: item.name,
                icon: item.icon,
                desc: item.desc,
                intervalKm: adjustedIntervalKm,
                intervalMonths: adjustedIntervalMonths,
                lastOdo,
                lastDate: lastDateStr,
                remainingKm,
                timeLabel,
                percentage,
                status,
                hasAdjustment,
                adjustmentReason
            });
        }

        return health;
    }
};

// DATA RESET
export const DataPortability = {
    resetAll() {
        localStorage.removeItem(KEYS.VEHICLES);
        localStorage.removeItem(KEYS.ACTIVE_VEHICLE_ID);
        localStorage.removeItem(KEYS.MAINTENANCE_LOGS);
        localStorage.removeItem(KEYS.FUEL_LOGS);
        localStorage.removeItem(KEYS.CUSTOM_PRESETS);
        localStorage.removeItem(KEYS.GEMINI_KEY);
        if (state) {
            const now = new Date().toISOString();
            state.motocareVehicles = [];
            state.motocareActiveId = '';
            state.motocareMaintLogs = [];
            state.motocareFuelLogs = [];
            state.motocareCustomPresets = {};
            state.motocareVehiclesUpdated = now;
            state.motocareMaintLogsUpdated = now;
            state.motocareFuelLogsUpdated = now;
            state.motocareCustomPresetsUpdated = now;
            if (typeof saveLocalState === 'function') saveLocalState();
            if (typeof performSync === 'function') performSync(true);
        }
        return true;
    }
};

// GEMINI AI INTEGRATION (Uses FamiLife Global Gemini API Key)
export const AI = {
    getKey() {
        if (state && state.geminiApiKey) return state.geminiApiKey.trim();
        if (window._famiLifeGeminiKey) return window._famiLifeGeminiKey.trim();
        return '';
    },

    saveKey(key) {
        localStorage.setItem(KEYS.GEMINI_KEY, (key || '').trim());
        return true;
    },

    formatModelName(model) {
        if (!model) return 'Google Gemini AI';
        const m = String(model).toLowerCase();
        if (m.includes('3.7')) return 'Gemini 3.7 Flash';
        if (m.includes('3.6')) return 'Gemini 3.6 Flash';
        if (m.includes('2.5')) return 'Gemini 2.5 Flash';
        if (m.includes('2.0')) return 'Gemini 2.0 Flash';
        return model;
    },

    async callGeminiTextAPI(prompt, defaultModel = 'gemini-3.7-flash', options = {}) {
        const apiKey = this.getKey();
        if (!apiKey) throw new Error("Chưa cấu hình Google Gemini API Key. Vui lòng nhập API Key trong mục Cài Đặt của FamiLife!");

        console.log(`[BUG DETECTOR] [MotoCare AI] Starting AI consultation. Key length: ${apiKey.length}`);

        const candidateModels = [defaultModel, "gemini-3.7-flash", "gemini-3.6-flash", "gemini-2.5-flash", "gemini-2.0-flash"]
            .filter((m, idx, arr) => m && arr.indexOf(m) === idx);
        let lastError = null;

        for (const model of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: options.temperature !== undefined ? options.temperature : 0.1,
                            topP: 0.95
                        }
                    })
                });

                if (!response.ok) {
                    const errJson = await response.json().catch(() => ({}));
                    const errMsg = errJson?.error?.message || `HTTP ${response.status}`;
                    console.warn(`[BUG DETECTOR] [MotoCare AI] Model ${model} returned error: ${errMsg}`);
                    throw new Error(errMsg);
                }

                const resData = await response.json();
                const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!text) throw new Error("Không nhận được nội dung phản hồi từ AI.");
                const modelName = this.formatModelName(model);
                console.log(`[BUG DETECTOR] [MotoCare AI] Model ${model} (${modelName}) succeeded! Response length: ${text.length}`);
                if (options.returnDetails) {
                    return { text, model, modelName };
                }
                return text;
            } catch (err) {
                console.warn(`[MotoCare AI] Text model ${model} failed:`, err);
                lastError = err;
                continue;
            }
        }
        throw lastError || new Error("Lỗi kết nối Gemini API. Vui lòng kiểm tra lại Google Gemini API Key trong Cài Đặt.");
    },

    generateConsultationPrompt(vehicleId) {
        const vehicle = Vehicles.getById(vehicleId);
        if (!vehicle) return '';

        const healthStatus = Stats.getHealthStatus(vehicleId);
        const fuelStats = Stats.calculateFuelStats(vehicleId);
        const maintLogs = MaintenanceLogs.getByVehicle(vehicleId).slice(0, 10);

        let prompt = `Bạn là một Bác sĩ Xe máy chuyên nghiệp và chuyên gia cơ khí hàng đầu tại Việt Nam. Hãy chẩn đoán sức khỏe chiếc xe máy sau đây và đưa ra lời khuyên bảo dưỡng thông thái, ngắn gọn, thiết thực nhất cho chủ xe.

THÔNG TIN XE:
- Tên xe: ${vehicle.name}
- Biển số: ${vehicle.plate || 'Chưa cập nhật'}
- Loại xe: ${VEHICLE_TYPES[vehicle.type] || vehicle.type}
- Số ODO hiện tại: ${vehicle.currentOdo.toLocaleString()} Km
- Ngày mua xe: ${vehicle.buyDate}

TÌNH TRẠNG HAO MÒN PHỤ TÙNG (Tính toán từ hệ thống):
`;

        healthStatus.forEach(item => {
            prompt += `- ${item.name}: Hao mòn ${item.percentage}% (Còn ${Math.round(item.remainingKm)} Km / ${item.timeLabel}). Trạng thái cảnh báo: ${item.status}. ${item.hasAdjustment ? `[Định mức đã điều chỉnh: ${item.adjustmentReason}]` : ''}\n`;
        });

        prompt += `\nTHỐNG KÊ TIÊU THỤ XĂNG:
- Tiêu hao trung bình: ${fuelStats.efficiency !== null ? fuelStats.efficiency + ' L/100 Km' : 'Chưa có đủ dữ liệu (Cần tối thiểu 2 lần đổ xăng đầy bình)'}
- Chi phí xăng trên mỗi Km: ${fuelStats.costPerKm !== null ? fuelStats.costPerKm.toLocaleString() + ' đ/Km' : 'Chưa tính được'}
- Tổng chi phí đổ xăng: ${fuelStats.totalCost.toLocaleString()} đ
`;

        if (fuelStats.chartData.length >= 2) {
            const latestEff = fuelStats.chartData[fuelStats.chartData.length - 1].efficiency;
            prompt += `- Lần đổ đầy bình gần nhất tiêu thụ: ${latestEff} L/100 Km. ${latestEff > fuelStats.efficiency * 1.12 ? `[CẢNH BÁO: Hao xăng tăng ${( ((latestEff - fuelStats.efficiency) / fuelStats.efficiency) * 100 ).toFixed(0)}% so với trung bình!]` : ''}\n`;
        }

        prompt += `\nLỊCH SỬ BẢO DƯỠNG GẦN ĐÂY:
`;
        if (maintLogs.length === 0) {
            prompt += `- Chưa ghi nhận lịch sử bảo dưỡng nào.\n`;
        } else {
            maintLogs.forEach(log => {
                prompt += `- Ngày ${log.date} (ODO ${log.odo.toLocaleString()} Km): Hạng mục ${log.category}, chi phí ${log.cost.toLocaleString()} đ. Ghi chú: ${log.notes || 'Không'}\n`;
            });
        }

        prompt += `
YÊU CẦU:
Hãy phân tích và viết một báo cáo chẩn đoán bằng tiếng Việt, định dạng HTML (sử dụng h3 cho tiêu đề chính, h4 cho tiêu đề phụ, in đậm các cảnh báo quan trọng). Báo cáo cần bao gồm:
1. **Đánh giá tổng quan sức khỏe xe** (Có điểm nào bất thường không, ví dụ như hao xăng đột biến hay xe quá hạn bảo dưỡng nhiều).
2. **Các bộ phận cần chăm sóc khẩn cấp** (Xếp hạng từ nguy kịch nhất xuống).
3. **Lời khuyên vận hành & Lịch bảo dưỡng tiếp theo** (Cần làm gì trong 1000 Km tiếp theo).
4. **Mẹo tiết kiệm xăng/tăng tuổi thọ riêng cho dòng xe này** (Ví dụ xe ga thì khuyên về dầu láp, vệ sinh nồi; xe số/côn thì khuyên về xích).
Lưu ý: Hãy viết ngắn gọn, xúc tích, tập trung vào số liệu thực tế, tránh các lời sáo rỗng. Hãy định dạng bằng thẻ HTML thô (h3, h4, p, ul, li, strong, blockquote) thay vì Markdown để hiển thị trực tiếp.`;

        return prompt;
    },

    generatePresetOptimizationPrompt(vehicleId) {
        const vehicle = Vehicles.getById(vehicleId);
        if (!vehicle) return '';
        const currentPresets = Presets.getForVehicle(vehicleId);
        const currentPresetsSummary = Object.entries(currentPresets).map(([k, v]) => `- ${k} (${v.name}): ${v.intervalKm.toLocaleString()} Km / ${v.intervalMonths} tháng`).join('\n');

        return `Bạn là kỹ sư trưởng kỹ thuật xe máy hàng đầu tại Việt Nam, am hiểu tường tận sổ tay bảo dưỡng chính hãng (Honda, Yamaha, Suzuki, Piaggio Vespa, v.v.).

Hãy phân tích mẫu xe dưới đây và đề xuất ĐỊNH MỨC BẢO DƯỠNG CHUẨN XÁC, NHẤT QUÁN 100% (Số Km và Số Tháng định kỳ) cho từng phụ tùng dựa trên sổ tay hướng dẫn chính hãng của dòng xe này tại Việt Nam:

THÔNG TIN XE:
- Tên xe: ${vehicle.name}
- Biển số: ${vehicle.plate || 'Chưa cập nhật'}
- Phân loại: ${VEHICLE_TYPES[vehicle.type] || vehicle.type}
- Số ODO hiện tại: ${vehicle.currentOdo.toLocaleString()} Km
- Ngày mua xe: ${vehicle.buyDate || 'Chưa rõ'}

ĐỊNH MỨC HIỆN TẠI TRÊN HỆ THỐNG:
${currentPresetsSummary}

BỘ QUY TẮC HIỆU CHUẨN CHUẨN XÁC THEO HÃNG TẠI VIỆT NAM (BẮT BUỘC TUÂN THỦ TÍNH NHẤT QUÁN):
1. Dầu máy (oil_engine): Xe ga (1.500 - 2.000 Km / 2-3 tháng); Xe số/côn (1.500 - 2.000 Km / 2-3 tháng).
2. Dầu láp/hộp số (oil_gear): Chỉ dành cho xe ga (5.000 - 6.000 Km / 6 tháng - chu kỳ gấp 3 lần dầu máy).
3. Lọc gió (air_filter): 10.000 - 12.000 Km / 12 tháng (lọc giấy tẩm dầu không vệ sinh, thay mới).
4. Bugi (spark_plug): 8.000 - 10.000 Km / 12 tháng.
5. Nước làm mát (coolant): 20.000 Km / 24 tháng (cho xe có két nước làm mát dung dịch).
6. Má phanh trước (brake_front): 8.000 - 12.000 Km / 12 tháng (kiểm tra độ mòn má phanh đĩa/đùm trước).
7. Má phanh sau (brake_rear): 8.000 - 12.000 Km / 12 tháng (kiểm tra độ mòn má phanh sau).
8. Nhông sên dĩa (chain): Dành cho xe số/côn (15.000 - 20.000 Km / 12-18 tháng).
9. Vỏ lốp (tires): 20.000 - 25.000 Km / 24 tháng.
10. Bảo dưỡng toàn bộ xe (full_service): 8.000 - 10.000 Km / 12 tháng (gói bảo dưỡng tổng thể xe tại HEAD/trung tâm).
11. Bình ắc quy (battery): 20.000 - 30.000 Km / 24-36 tháng (kiểm tra dòng sạc và thay ắc quy).

YÊU CẦU ĐẶC BIỆT:
Hãy trả về DUY NHẤT một chuỗi JSON thuần túy (không kèm theo bất kỳ lời chào hay văn bản giải thích nào bên ngoài JSON, không bọc trong markdown codeblock nếu có thể, hoặc bọc trong \`\`\`json) theo đúng cấu trúc sau:
{
  "vehicleModel": "Tên dòng xe nhận diện được (ví dụ: Honda Air Blade 125i)",
  "advice": "Nhận định ngắn gọn 2 câu về đặc tính động cơ và lưu ý bảo dưỡng quan trọng nhất cho dòng xe này.",
  "items": {
    "oil_engine": { "km": 2000, "months": 3, "reason": "Lý do ngắn gọn" },
    "oil_gear": { "km": 6000, "months": 6, "reason": "Lý do ngắn gọn" },
    "air_filter": { "km": 10000, "months": 12, "reason": "Lý do ngắn gọn" },
    "spark_plug": { "km": 8000, "months": 12, "reason": "Lý do ngắn gọn" },
    "coolant": { "km": 20000, "months": 24, "reason": "Lý do ngắn gọn" },
    "brake_front": { "km": 10000, "months": 12, "reason": "Lý do ngắn gọn" },
    "brake_rear": { "km": 10000, "months": 12, "reason": "Lý do ngắn gọn" },
    "chain": { "km": 15000, "months": 12, "reason": "Lý do ngắn gọn" },
    "tires": { "km": 20000, "months": 24, "reason": "Lý do ngắn gọn" },
    "full_service": { "km": 10000, "months": 12, "reason": "Lý do ngắn gọn" },
    "battery": { "km": 25000, "months": 24, "reason": "Lý do ngắn gọn" }
  }
}`;
    },

    getGeminiKeyWithFallback() {
        const ownKey = this.getKey();
        if (ownKey) return ownKey;
        try {
            if (state && state.geminiApiKey) return state.geminiApiKey;
            if (window._famiLifeGeminiKey) return window._famiLifeGeminiKey;
        } catch(e) {}
        return '';
    }
};
