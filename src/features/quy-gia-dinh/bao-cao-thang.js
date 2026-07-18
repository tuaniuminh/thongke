// src/features/quy-gia-dinh/bao-cao-thang.js - Monthly Financial Report Logic

import { 
    state, saveLocalState, showToast, performSync,
    formatVND, escapeHTML
} from '../../core/app.js?v=4.2.35';
import { callGeminiTextAPI } from '../ho-so-y-te/ho-so-y-te.js?v=4.2.35';

// Global variables to store calculated monthly report state
let currentReportMonth = null;
let currentReportYear = null;
let currentReportData = null;
let aiInsightText = '';

// Helper to get member name for a transaction
function getMemberName(memberId) {
    if (memberId === 'p-husband') {
        return 'Chồng';
    } else if (memberId === 'p-wife') {
        return 'Vợ';
    } else {
        const foundProfile = (state.familyProfiles || []).find(p => p.id === memberId);
        return foundProfile ? foundProfile.name : 'Khác';
    }
}

// Timezone-independent date parser
function parseTxDate(dateStr) {
    if (!dateStr) return { year: NaN, month: NaN, day: NaN };
    
    // If it's an ISO string or has 'T', take the date part first
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    
    // Try split by '-' (YYYY-MM-DD)
    if (datePart.includes('-')) {
        const parts = datePart.split('-');
        return {
            year: parseInt(parts[0]),
            month: parseInt(parts[1]),
            day: parseInt(parts[2])
        };
    }
    
    // Try split by '/' (DD/MM/YYYY or YYYY/MM/DD)
    if (datePart.includes('/')) {
        const parts = datePart.split('/');
        if (parts[0].length === 4) { // YYYY/MM/DD
            return {
                year: parseInt(parts[0]),
                month: parseInt(parts[1]),
                day: parseInt(parts[2])
            };
        } else { // DD/MM/YYYY
            return {
                year: parseInt(parts[2]),
                month: parseInt(parts[1]),
                day: parseInt(parts[0])
            };
        }
    }
    
    // Fallback to standard JS Date (local time)
    const d = new Date(dateStr);
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate()
    };
}

// Open Monthly Report Modal
export function openMonthlyReportModal() {
    const reportSelectYear = document.getElementById('reportSelectYear');
    if (reportSelectYear) {
        const currentYear = new Date().getFullYear();
        const yearsSet = new Set([currentYear, 2024, 2025, 2026]);
        
        // Quét tất cả các năm từ giao dịch quỹ
        (state.fundTransactions || []).forEach(t => {
            if (t.date && !t.deleted_at) {
                const parsed = parseTxDate(t.date);
                if (!isNaN(parsed.year)) {
                    yearsSet.add(parsed.year);
                }
            }
        });
        
        const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);
        let options = '';
        sortedYears.forEach(y => {
            options += `<option value="${y}">Năm ${y}</option>`;
        });
        reportSelectYear.innerHTML = options;
    }

    // Thiết lập tháng và năm mặc định là tháng hiện tại
    const now = new Date();
    let defaultMonth = now.getMonth() + 1; // 1-indexed (Tháng hiện tại)
    let defaultYear = now.getFullYear();

    const selectMonthEl = document.getElementById('reportSelectMonth');
    if (selectMonthEl) selectMonthEl.value = defaultMonth.toString();
    if (reportSelectYear) reportSelectYear.value = defaultYear.toString();

    // Reset AI text
    aiInsightText = '';

    // Mở modal
    const modal = document.getElementById('fundMonthlyReportModal');
    if (modal) {
        modal.classList.add('active');
        generateMonthlyReport();
    }
}

// Generate Monthly Report Data
export function generateMonthlyReport() {
    const monthSelect = document.getElementById('reportSelectMonth');
    const yearSelect = document.getElementById('reportSelectYear');
    if (!monthSelect || !yearSelect) return;

    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    
    currentReportMonth = month;
    currentReportYear = year;

    // Khôi phục nhận xét AI: ưu tiên từ state (đồng bộ đa thiết bị), fallback localStorage
    const aiCacheKey = `${year}_${month}`;
    const stateAi = (state.reportAiInsights || {})[aiCacheKey] || '';
    const localAi = localStorage.getItem(`aiInsight_${aiCacheKey}`) || '';
    aiInsightText = stateAi || localAi;

    // Lọc giao dịch bằng cách phân tích chuỗi ngày độc lập múi giờ
    const activeTx = (state.fundTransactions || []).filter(t => !t.deleted_at);
    const monthTx = activeTx.filter(t => {
        const parsed = parseTxDate(t.date);
        return parsed.month === month && parsed.year === year;
    });

    // 1. Tính toán Thu - Chi
    let totalInflow = 0;
    let totalOutflow = 0;
    let husbandContrib = 0;
    let wifeContrib = 0;

    monthTx.forEach(tx => {
        const amount = Math.abs(tx.amount || 0);
        if (tx.type === 'contribution' || tx.type === 'external_income') {
            totalInflow += amount;
            if (tx.type === 'contribution') {
                if (tx.memberId === 'p-husband') {
                    husbandContrib += amount;
                } else if (tx.memberId === 'p-wife') {
                    wifeContrib += amount;
                }
            }
        } else if (tx.type === 'spending') {
            totalOutflow += amount;
        } else if (tx.type === 'investment_change') {
            if (tx.amount >= 0) {
                totalInflow += amount;
            } else {
                totalOutflow += amount;
            }
        }
    });

    const surplus = totalInflow - totalOutflow;

    // 2. Danh sách toàn bộ chi tiêu trong tháng, sắp xếp theo ngày
    const spendings = monthTx
        .filter(tx => tx.type === 'spending')
        .sort((a, b) => {
            const pA = parseTxDate(a.date);
            const pB = parseTxDate(b.date);
            const dA = pA.year * 10000 + pA.month * 100 + pA.day;
            const dB = pB.year * 10000 + pB.month * 100 + pB.day;
            return dA - dB;
        });

    currentReportData = {
        totalInflow,
        totalOutflow,
        surplus,
        husbandContrib,
        wifeContrib,
        spendings,
        transactionCount: monthTx.length
    };

    // Render HTML Báo cáo
    renderReportHtml();
}

// Render Report HTML inside modal body
function renderReportHtml() {
    const container = document.getElementById('monthlyReportCardContent');
    if (!container || !currentReportData) return;

    const data = currentReportData;
    const surplusColor = data.surplus >= 0 ? '#10b981' : '#ef4444';
    const surplusText = data.surplus >= 0 ? `+${formatVND(data.surplus)}` : `-${formatVND(Math.abs(data.surplus))}`;

    const totalContrib = data.husbandContrib + data.wifeContrib;
    const husbandPercent = totalContrib > 0 ? Math.round((data.husbandContrib / totalContrib) * 100) : 50;
    const wifePercent = totalContrib > 0 ? Math.round((data.wifeContrib / totalContrib) * 100) : 50;

    let spendingsHtml = '';
    if (data.spendings.length > 0) {
        spendingsHtml = data.spendings.map(s => {
            const parsed = parseTxDate(s.date);
            const dateStr = !isNaN(parsed.day) ? `${parsed.day.toString().padStart(2, '0')}/${parsed.month.toString().padStart(2, '0')}` : '';
            const isHusband = s.memberId === 'p-husband';
            const rowBg = isHusband ? 'rgba(59,130,246,0.06)' : 'rgba(236,72,153,0.06)';
            return `
                <tr style="background: ${rowBg};">
                    <td style="padding: 8px 10px; font-size: 0.82rem; color: var(--text-muted);">${dateStr}</td>
                    <td style="padding: 8px 10px;">${escapeHTML(s.notes || 'Chi tiêu')}</td>
                    <td style="padding: 8px 10px; text-align: right; color: #ef4444; font-weight: 600;">-${formatVND(s.amount)}</td>
                </tr>
            `;
        }).join('');
    } else {
        spendingsHtml = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 20px;">Không có giao dịch chi tiêu nào trong tháng.</td></tr>`;
    }

    // AI Insight HTML section
    let aiHtml = '';
    if (!state.geminiApiKey) {
        aiHtml = `
            <div style="font-size:0.78rem; color:var(--text-muted); text-align:center;">
                ⚠️ Vui lòng cấu hình Gemini API Key tại mục <strong>Hồ sơ y tế / AI Scanner</strong> để mở khóa tính năng AI nhận xét tài chính gia đình.
            </div>
        `;
    } else if (aiInsightText) {
        aiHtml = `<div style="font-style: italic; white-space: pre-wrap;">${escapeHTML(aiInsightText)}</div>`;
    } else {
        aiHtml = `
            <div style="display:flex; justify-content:center;">
                <button type="button" class="btn btn-outline" onclick="requestAiReportInsight(this)" style="font-size:0.8rem; padding: 6px 12px; display:flex; align-items:center; gap:6px; cursor:pointer; background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.25); color:#a855f7; border-radius:6px; font-weight:600;">
                    <i data-lucide="sparkles" style="width:14px; height:14px;"></i> Trợ lý AI nhận xét tài chính
                </button>
            </div>
        `;
    }

    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid var(--border-color); padding-bottom: 12px;">
            <h3 style="margin: 0; font-family: var(--font-heading); font-size: 1.25rem; color: var(--accent-blue);">BÁO CÁO TÀI CHÍNH GIA ĐÌNH</h3>
            <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-muted);">Tháng ${currentReportMonth} / Năm ${currentReportYear}</span>
        </div>

        <!-- 3-box statistics grid -->
        <div class="report-stat-grid">
            <div class="report-stat-box inflow">
                <span class="report-stat-label">Tổng thu nhập</span>
                <span class="report-stat-value" style="color: #10b981;">+${formatVND(data.totalInflow)}</span>
            </div>
            <div class="report-stat-box outflow">
                <span class="report-stat-label">Tổng chi tiêu</span>
                <span class="report-stat-value" style="color: #ef4444;">-${formatVND(data.totalOutflow)}</span>
            </div>
            <div class="report-stat-box surplus">
                <span class="report-stat-label">Thặng dư tích lũy</span>
                <span class="report-stat-value" style="color: ${surplusColor};">${surplusText}</span>
            </div>
        </div>

        <!-- Contributions -->
        <div class="report-section-title">
            <i data-lucide="users" style="width: 16px; height: 16px; color: var(--accent-color);"></i>
            <span>Đóng góp của hai vợ chồng</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 8px; background: rgba(0,0,0,0.1); border-radius: 8px; margin-bottom: 16px;">
            <span>Chồng đóng góp: <strong>${formatVND(data.husbandContrib)} (${husbandPercent}%)</strong></span>
            <span>Vợ đóng góp: <strong>${formatVND(data.wifeContrib)} (${wifePercent}%)</strong></span>
        </div>

        <!-- All Spendings -->
        <div class="report-section-title" style="justify-content: space-between; align-items: center;">
            <span style="display:flex; align-items:center; gap:6px;">
                <i data-lucide="trending-down" style="width: 16px; height: 16px; color: #ef4444;"></i>
                <span>Các khoản chi tiêu trong tháng</span>
            </span>
            <span style="display:flex; align-items:center; gap:10px; font-size:0.75rem; color:var(--text-muted);">
                <span style="display:flex;align-items:center;gap:4px;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#3b82f6;"></span>Chồng
                </span>
                <span style="display:flex;align-items:center;gap:4px;">
                    <span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#ec4899;"></span>Vợ
                </span>
            </span>
        </div>
        <table class="report-details-table" style="margin-bottom: 16px;">
            <thead>
                <tr>
                    <th style="width: 70px;">Ngày</th>
                    <th>Nội dung chi tiêu</th>
                    <th style="width: 120px; text-align: right;">Số tiền</th>
                </tr>
            </thead>
            <tbody>
                ${spendingsHtml}
            </tbody>
        </table>

        <!-- AI insights box -->
        <div class="report-section-title">
            <i data-lucide="sparkles" style="width: 16px; height: 16px; color: #a855f7;"></i>
            <span>AI nhận xét thông minh</span>
        </div>
        <div class="ai-insights-box">
            ${aiHtml}
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
}

// Request AI insight analysis from Gemini API
window.requestAiReportInsight = async function(btn) {
    if (!state.geminiApiKey) {
        showToast("Vui lòng cấu hình Gemini API Key để sử dụng tính năng này!", "warning");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="lucide-spinner" style="animation: spin 1s linear infinite; width:14px; height:14px; display:inline-block; border: 2px solid currentColor; border-right-color: transparent; border-radius: 50%;"></i> Đang phân tích...`;
    }

    try {
        const data = currentReportData;
        const prompt = `
Hãy đóng vai là một Chuyên gia hoạch định tài chính gia đình thông thái và thấu hiểu tâm lý. Hãy viết 1 đoạn nhận xét ngắn gọn (khoảng 3-4 câu, không quá dài) để phân tích bức tranh tài chính Quỹ chung gia đình trong Tháng ${currentReportMonth}/${currentReportYear} với các số liệu thực tế sau:
- Tổng thu (nạp quỹ): ${formatVND(data.totalInflow)}
- Tổng chi (chi tiêu): ${formatVND(data.totalOutflow)}
- Thặng dư tháng này: ${data.surplus >= 0 ? '+' : '-'}${formatVND(Math.abs(data.surplus))}
- Chồng đóng góp: ${formatVND(data.husbandContrib)}
- Vợ đóng góp: ${formatVND(data.wifeContrib)}
- Danh sách chi tiêu trong tháng: ${data.spendings.map(s => `${s.notes} (${getMemberName(s.memberId)} chi: -${formatVND(s.amount)})`).join(', ') || 'Không có chi tiêu nào'}

Yêu cầu nhận xét:
1. Đánh giá tính cân đối giữa thu và chi (gia đình tích lũy tốt hay chi tiêu quá đà).
2. Tuyên dương đóng góp của hai vợ chồng một cách ấm áp, tạo động lực gắn kết gia đình.
3. Đưa ra 1 lời khuyên thực tế để gia đình chi tiêu hiệu quả hơn trong tháng tới.
Không sử dụng định dạng markdown hay ký hiệu đặc biệt. Hãy trả về văn bản tiếng Việt tự nhiên và trôi chảy.
`;

        const insight = await callGeminiTextAPI(prompt, 'gemini-3.5-flash');
        aiInsightText = insight.trim();

        // Lưu nhận xét vào state để đồng bộ Supabase (đa thiết bị)
        const aiCacheKey = `${currentReportYear}_${currentReportMonth}`;
        if (!state.reportAiInsights) state.reportAiInsights = {};
        state.reportAiInsights[aiCacheKey] = aiInsightText;
        // Cũng lưu localStorage làm fallback offline
        localStorage.setItem(`aiInsight_${aiCacheKey}`, aiInsightText);
        // Đồng bộ lên Supabase
        await saveLocalState();
        performSync(false);

        renderReportHtml();
        showToast("Đã phân tích và đồng bộ báo cáo thành công!", "success");
    } catch (err) {
        console.error("Gemini API Error for report:", err);
        showToast("Không thể kết nối Gemini API: " + err.message, "danger");
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="sparkles" style="width:14px; height:14px;"></i> Trợ lý AI nhận xét tài chính`;
            if (window.lucide) window.lucide.createIcons();
        }
    }
};

// Canvas drawing helper function to wrap text paragraphs
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const paragraphs = text.split('\n');
    let currentY = y;
    
    paragraphs.forEach(para => {
        const words = para.split(' ');
        let line = '';
        
        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, currentY);
        currentY += lineHeight + 4; // Add extra margin between paragraphs
    });
    return currentY;
}

// Measure total height that wrapText would occupy (without drawing)
function measureWrappedTextHeight(ctx, text, maxWidth, lineHeight) {
    const paragraphs = text.split('\n');
    let totalHeight = 0;
    
    paragraphs.forEach(para => {
        const words = para.split(' ');
        let line = '';
        let linesInPara = 1;
        
        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                line = words[n] + ' ';
                linesInPara++;
            } else {
                line = testLine;
            }
        }
        totalHeight += linesInPara * lineHeight + 4; // +4 for paragraph gap
    });
    return totalHeight;
}

// Draw and Download Report as PNG Image (HTML5 Canvas E2EE)
window.downloadReportAsImage = async function() {
    if (!currentReportData) return;
    const data = currentReportData;

    const scale = 3.0; // 3x scale for Ultra HD / Retina resolution
    const virtualWidth = 720;

    // --- Pre-measure AI text height to calculate dynamic canvas height ---
    const aiText = aiInsightText || 'Báo cáo chưa kích hoạt chế độ AI nhận xét.';
    const aiLineHeight = 20;
    const aiMaxWidth = virtualWidth - 160; // same as used in wrapText call

    // Temporary canvas to measure text
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = 'italic 13px Arial, sans-serif';
    const aiTextHeight = measureWrappedTextHeight(tempCtx, aiText, aiMaxWidth, aiLineHeight);

    // Base layout height: header + stats + contributions + spendings + AI section header + footer
    // Estimate spendings rows height: each row ~32px + header ~80px
    const spendingsRowHeight = 32;
    const spendingsHeaderHeight = 80;
    const estimatedSpendingsHeight = spendingsHeaderHeight + (data.spendings.length * spendingsRowHeight);

    // AI box: top padding (30) + text + bottom padding (20)
    const aiBoxHeight = Math.max(80, aiTextHeight + 50);

    // Base content (everything except spendings and AI box)
    const baseHeight = 400; // header, stats, contributions, section titles, footer
    const footerHeight = 80;

    const virtualHeight = baseHeight + estimatedSpendingsHeight + aiBoxHeight + footerHeight;

    // Create Canvas in memory
    const canvas = document.createElement('canvas');
    canvas.width = virtualWidth * scale;
    canvas.height = virtualHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale drawing context so all coordinate values stay identical
    ctx.scale(scale, scale);

    // 1. Draw Background (Light Theme Slate/Gray Gradient)
    const grad = ctx.createLinearGradient(0, 0, 0, virtualHeight);
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, virtualWidth, virtualHeight);

    // 2. Draw Top Header Accent Bar
    ctx.fillStyle = '#0284c9';
    ctx.fillRect(0, 0, virtualWidth, 10);

    // 3. Draw Header Title (Dark Navy)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BÁO CÁO TÀI CHÍNH GIA ĐÌNH', virtualWidth / 2, 60);

    ctx.fillStyle = '#475569';
    ctx.font = '600 16px Arial, sans-serif';
    ctx.fillText(`Tháng ${currentReportMonth} / Năm ${currentReportYear}`, virtualWidth / 2, 90);

    // Header separator line (Light Gray)
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, 115);
    ctx.lineTo(virtualWidth - 60, 115);
    ctx.stroke();

    // 4. Draw 3 Stat Cards (White background with thin borders)
    const cardWidth = 180;
    const cardHeight = 100;
    const gap = 20;
    const startX = (virtualWidth - (cardWidth * 3 + gap * 2)) / 2;
    const startY = 140;

    const cards = [
        { label: 'TỔNG THU NHẬP', value: `+${formatVND(data.totalInflow)}`, color: '#10b981', borderLeft: '#10b981' },
        { label: 'TỔNG CHI TIÊU', value: `-${formatVND(data.totalOutflow)}`, color: '#ef4444', borderLeft: '#ef4444' },
        { label: 'THẶNG DƯ TÍCH LŨY', value: data.surplus >= 0 ? `+${formatVND(data.surplus)}` : `-${formatVND(Math.abs(data.surplus))}`, color: data.surplus >= 0 ? '#10b981' : '#ef4444', borderLeft: '#0284c9' }
    ];

    cards.forEach((c, idx) => {
        const x = startX + idx * (cardWidth + gap);
        const y = startY;

        // Draw Card Background (Pure White)
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, cardWidth, cardHeight, 10);
        } else {
            ctx.rect(x, y, cardWidth, cardHeight);
        }
        ctx.fill();
        ctx.stroke();

        // Draw Border Left Accent line
        ctx.fillStyle = c.borderLeft;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, 5, cardHeight, { tl: 10, bl: 10 });
        } else {
            ctx.fillRect(x, y, 5, cardHeight);
        }
        ctx.fill();

        // Write Card Label (Cool Gray)
        ctx.fillStyle = '#64748b';
        ctx.font = 'bold 11px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.label, x + cardWidth / 2, y + 35);

        // Write Card Value
        ctx.fillStyle = c.color;
        ctx.font = 'bold 16px Arial, sans-serif';
        ctx.fillText(c.value, x + cardWidth / 2, y + 70);
    });

    // 5. Draw Section: Contributions (Dark Text)
    let currentY = startY + cardHeight + 50;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Đóng góp của hai vợ chồng', 60, currentY);

    // Separator line
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(60, currentY + 12);
    ctx.lineTo(virtualWidth - 60, currentY + 12);
    ctx.stroke();

    currentY += 40;
    // Box for values (White with border)
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(60, currentY - 20, virtualWidth - 120, 50, 8);
    } else {
        ctx.rect(60, currentY - 20, virtualWidth - 120, 50);
    }
    ctx.fill();
    ctx.stroke();

    const totalContrib = data.husbandContrib + data.wifeContrib;
    const husbandPercent = totalContrib > 0 ? Math.round((data.husbandContrib / totalContrib) * 100) : 50;
    const wifePercent = totalContrib > 0 ? Math.round((data.wifeContrib / totalContrib) * 100) : 50;

    ctx.fillStyle = '#334155';
    ctx.font = '14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Chồng đóng góp: ${formatVND(data.husbandContrib)} (${husbandPercent}%)`, 80, currentY + 10);
    ctx.textAlign = 'right';
    ctx.fillText(`Vợ đóng góp: ${formatVND(data.wifeContrib)} (${wifePercent}%)`, virtualWidth - 80, currentY + 10);

    // 6. Draw Section: Largest spendings
    currentY += 70;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Các khoản chi tiêu trong tháng', 60, currentY);

    // Separator line
    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(60, currentY + 12);
    ctx.lineTo(virtualWidth - 60, currentY + 12);
    ctx.stroke();

    currentY += 40;
    // Table Header
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Ngày', 60, currentY);
    ctx.fillText('Nội dung chi tiêu', 150, currentY);
    ctx.textAlign = 'right';
    ctx.fillText('Số tiền', virtualWidth - 60, currentY);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, currentY + 10);
    ctx.lineTo(virtualWidth - 60, currentY + 10);
    ctx.stroke();

    currentY += 32;

    if (data.spendings.length > 0) {
        data.spendings.forEach(s => {
            const parsed = parseTxDate(s.date);
            const dateStr = !isNaN(parsed.day) ? `${parsed.day.toString().padStart(2, '0')}/${parsed.month.toString().padStart(2, '0')}` : '';
            const isHusband = s.memberId === 'p-husband';

            // Row background stripe by member
            ctx.fillStyle = isHusband ? 'rgba(59,130,246,0.07)' : 'rgba(236,72,153,0.07)';
            ctx.fillRect(55, currentY - 14, virtualWidth - 110, 28);

            // Date
            ctx.fillStyle = '#64748b';
            ctx.font = '12px Arial, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(dateStr, 60, currentY);

            // Notes
            let notes = s.notes || 'Chi tiêu';
            if (notes.length > 22) {
                notes = notes.slice(0, 20) + '...';
            }
            ctx.fillStyle = '#1e293b';
            ctx.font = '13px Arial, sans-serif';
            ctx.fillText(notes, 150, currentY);

            // Member badge (colored pill)
            const memberColor = isHusband ? '#3b82f6' : '#ec4899';
            const memberLabel = getMemberName(s.memberId);
            const badgeX = 150 + ctx.measureText(notes).width + 8;
            ctx.fillStyle = isHusband ? 'rgba(59,130,246,0.15)' : 'rgba(236,72,153,0.15)';
            const badgeW = ctx.measureText(memberLabel).width + 10;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(badgeX, currentY - 10, badgeW, 15, 4);
            } else {
                ctx.rect(badgeX, currentY - 10, badgeW, 15);
            }
            ctx.fill();
            ctx.fillStyle = memberColor;
            ctx.font = 'bold 11px Arial, sans-serif';
            ctx.fillText(memberLabel, badgeX + 5, currentY);

            // Amount
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 13px Arial, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`-${formatVND(s.amount)}`, virtualWidth - 60, currentY);

            ctx.strokeStyle = '#e8eef4';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(60, currentY + 12);
            ctx.lineTo(virtualWidth - 60, currentY + 12);
            ctx.stroke();

            currentY += 32;
        });
    } else {
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 13px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Không có chi tiêu nào trong tháng.', virtualWidth / 2, currentY + 10);
        currentY += 40;
    }

    // 7. Draw Section: AI Insights (if available)
    currentY += 20;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('AI nhận xét thông minh', 60, currentY);

    ctx.strokeStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.moveTo(60, currentY + 12);
    ctx.lineTo(virtualWidth - 60, currentY + 12);
    ctx.stroke();

    currentY += 35;
    
    // Draw AI card box with dynamic height based on actual text content
    const aiTextLocal = aiInsightText || 'Báo cáo chưa kích hoạt chế độ AI nhận xét.';
    ctx.fillStyle = aiInsightText ? 'rgba(168, 85, 247, 0.04)' : '#ffffff';
    ctx.strokeStyle = aiInsightText ? 'rgba(168, 85, 247, 0.15)' : '#e2e8f0';
    ctx.lineWidth = 1;

    // aiBoxHeight was pre-computed at the top of the function
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(60, currentY, virtualWidth - 120, aiBoxHeight, 10);
    } else {
        ctx.rect(60, currentY, virtualWidth - 120, aiBoxHeight);
    }
    ctx.fill();
    ctx.stroke();

    // Write text inside AI box (charcoal / deep purple color)
    ctx.fillStyle = aiInsightText ? '#4a1d96' : '#64748b';
    ctx.font = 'italic 13px Arial, sans-serif';
    ctx.textAlign = 'left';
    
    wrapText(ctx, aiTextLocal, 80, currentY + 30, virtualWidth - 160, 20);

    // 8. Draw Footer (always below the AI box with padding)
    const footerY = currentY + aiBoxHeight + 40;
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Được tạo tự động bởi FamiLife App – Hệ thống Quỹ Gia Đình', virtualWidth / 2, footerY);

    // Export report image
    const dataUrl = canvas.toDataURL('image/png');
    const filename = `FamiLife_BaoCao_Thang${currentReportMonth}_${currentReportYear}.png`;
    let shared = false;

    if (navigator.canShare) {
        try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const file = new File([blob], filename, { type: 'image/png' });
            
            if (navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Báo cáo Quỹ Gia Đình FamiLife',
                    text: `Ảnh báo cáo Quỹ Gia Đình tháng ${currentReportMonth}/${currentReportYear}`
                });
                shared = true;
            }
        } catch (err) {
            console.warn('[Share] Report image sharing cancelled or failed:', err);
            if (err.name === 'AbortError') {
                return;
            }
        }
    }

    if (!shared) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.click();
    }
    
    showToast("Đã xuất ảnh báo cáo thành công!", "success");
};

// Send monthly report summary to Webhook (Telegram/Discord)
window.sendReportToWebhook = async function() {
    if (!state.googleSheetsWebhook) {
        showToast("Vui lòng cấu hình Webhook URL trong Quản lý quỹ trước khi gửi!", "warning");
        return;
    }
    
    if (!currentReportData) return;
    const data = currentReportData;

    const surplusText = data.surplus >= 0 ? `+${formatVND(data.surplus)}` : `-${formatVND(Math.abs(data.surplus))}`;
    
    const totalContrib = data.husbandContrib + data.wifeContrib;
    const husbandPercent = totalContrib > 0 ? Math.round((data.husbandContrib / totalContrib) * 100) : 50;
    const wifePercent = totalContrib > 0 ? Math.round((data.wifeContrib / totalContrib) * 100) : 50;

    let spendingsStr = data.spendings.map((s, idx) => `${idx+1}. ${s.notes || 'Chi tiêu'} (${getMemberName(s.memberId)}): -${formatVND(s.amount)}`).join('\n');
    if (!spendingsStr) spendingsStr = 'Không có chi tiêu nào.';

    const message = `
📊 *BÁO CÁO TÀI CHÍNH GIA ĐÌNH - THÁNG ${currentReportMonth}/${currentReportYear}*

💰 *Tóm tắt chi tiêu:*
- Tổng thu (nạp quỹ): +${formatVND(data.totalInflow)}
- Tổng chi (chi tiêu): -${formatVND(data.totalOutflow)}
- Thặng dư tích lũy: ${surplusText}

👥 *Đóng góp thành viên:*
- Chồng đóng góp: ${formatVND(data.husbandContrib)} (${husbandPercent}%)
- Vợ đóng góp: ${formatVND(data.wifeContrib)} (${wifePercent}%)

📉 *Các khoản chi tiêu trong tháng:*
${spendingsStr}

${aiInsightText ? `💡 *AI nhận xét:* \n_${aiInsightText}_` : ''}

_Gửi tự động từ ứng dụng FamiLife_
`;

    try {
        const response = await fetch(state.googleSheetsWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: message, // Dành cho Telegram
                content: message // Dành cho Discord
            }),
            mode: 'no-cors' // Tránh lỗi CORS chặn request
        });
        showToast("Đã gửi báo cáo qua Webhook thành công!", "success");
    } catch (err) {
        console.error("Failed to send webhook:", err);
        showToast("Gửi Webhook thất bại: " + err.message, "danger");
    }
};

// Check if a new month has started and display banner
export async function checkNewMonthNotification() {
    const banner = document.getElementById('monthlyReportBanner');
    const bannerText = document.getElementById('monthlyReportBannerText');
    if (!banner || !bannerText) return;

    // Lọc tìm giao dịch cũ nhất để biết mốc bắt đầu
    const activeTx = (state.fundTransactions || []).filter(t => !t.deleted_at);
    if (activeTx.length === 0) {
        banner.style.display = 'none';
        return;
    }

    const now = new Date();
    let prevMonth = now.getMonth(); // Month trước
    let prevYear = now.getFullYear();
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }

    const key = `viewed_report_${prevYear}_${prevMonth}`;
    const alreadyViewed = localStorage.getItem(key);

    if (alreadyViewed) {
        banner.style.display = 'none';
        return;
    }

    // Kiểm tra xem tháng trước có giao dịch nào thực tế phát sinh không
    const prevMonthTx = activeTx.filter(t => {
        const d = new Date(t.date);
        return (d.getMonth() + 1) === prevMonth && d.getFullYear() === prevYear;
    });

    if (prevMonthTx.length > 0) {
        bannerText.innerHTML = `<i data-lucide="award" style="width: 16px; height: 16px; color: #10b981;"></i> Báo cáo tài chính Quỹ gia đình <strong>Tháng ${prevMonth}/${prevYear}</strong> của hai bạn đã sẵn sàng!`;
        banner.style.display = 'flex';
        
        // Save flag to local storage when they click to open or close the banner
        banner.querySelector('button').addEventListener('click', () => {
            localStorage.setItem(key, 'true');
            banner.style.display = 'none';
        });
        
        if (window.lucide) window.lucide.createIcons();
    } else {
        banner.style.display = 'none';
    }
}

// Attach export functions to window for onclick bindings
window.openMonthlyReportModal = openMonthlyReportModal;
window.generateMonthlyReport = generateMonthlyReport;
















