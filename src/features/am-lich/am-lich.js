/**
 * Logic Nghiệp Vụ Phong Thủy & Giao Diện Lịch Vạn Niên FamiLife (v4.3.168)
 * Độc lập hoàn toàn, bám sát Card Isolation Rule.
 */

const CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
const CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

// Trạng thái cục bộ của Lịch
let state = {
    viewYear: new Date().getFullYear(),
    viewMonth: new Date().getMonth() + 1, // 1-indexed
    selectedDate: new Date()
};

// 1. Tính toán Can Chi của Tháng âm lịch
export function getMonthCanChi(yearCan, lMonth) {
    const yearCanToMonth1Can = {
        "Giáp": 2, "Kỷ": 2, // Bính
        "Ất": 4, "Canh": 4,  // Mậu
        "Bính": 6, "Tân": 6, // Canh
        "Đinh": 8, "Nhâm": 8, // Nhâm
        "Mậu": 0, "Quý": 0   // Giáp
    };
    
    const startCanIndex = yearCanToMonth1Can[yearCan];
    if (startCanIndex === undefined) return "";
    
    const monthCanIndex = (startCanIndex + lMonth - 1) % 10;
    const monthChiIndex = (lMonth + 1) % 12; // Tháng 1 là Dần (index 2)
    
    return CAN[monthCanIndex] + " " + CHI[monthChiIndex];
}

// 2. Tính toán Can Chi của Giờ theo Can của Ngày
export function getHourCanChi(dayCan, hourBranchIndex) {
    const dayCanToTyHourCan = {
        "Giáp": 0, "Kỷ": 0, // Giáp
        "Ất": 2, "Canh": 2,  // Bính
        "Bính": 4, "Tân": 4, // Mậu
        "Đinh": 6, "Nhâm": 6, // Canh
        "Mậu": 8, "Quý": 8   // Nhâm
    };
    
    const tyHourCanIndex = dayCanToTyHourCan[dayCan];
    if (tyHourCanIndex === undefined) return "";
    
    const hourCanIndex = (tyHourCanIndex + hourBranchIndex) % 10;
    return CAN[hourCanIndex] + " " + CHI[hourBranchIndex];
}

// 3. Tính Tiết Khí dựa trên ngày dương lịch (xấp xỉ chính xác)
export function getSolarTerm(day, month) {
    const val = month * 100 + day;
    if (val >= 105 && val < 120) return "Tiểu Hàn";
    if (val >= 120 || val < 204) {
        if (month === 12 && val >= 1221) return "Đông Chí";
        if (month === 1 && val < 105) return "Đông Chí";
        return "Đại Hàn";
    }
    if (val >= 204 && val < 219) return "Lập Xuân";
    if (val >= 219 && val < 305) return "Vũ Thủy";
    if (val >= 305 && val < 320) return "Kinh Trập";
    if (val >= 320 && val < 404) return "Xuân Phân";
    if (val >= 404 && val < 420) return "Thanh Minh";
    if (val >= 420 && val < 505) return "Cốc Vũ";
    if (val >= 505 && val < 521) return "Lập Hạ";
    if (val >= 521 && val < 605) return "Tiểu Mãn";
    if (val >= 605 && val < 621) return "Mang Chủng";
    if (val >= 621 && val < 707) return "Hạ Chí";
    if (val >= 707 && val < 722) return "Tiểu Thử";
    if (val >= 722 && val < 807) return "Đại Thử";
    if (val >= 807 && val < 823) return "Lập Thu";
    if (val >= 823 && val < 907) return "Xử Thử";
    if (val >= 907 && val < 922) return "Bạch Lộ";
    if (val >= 922 && val < 1008) return "Thu Phân";
    if (val >= 1008 && val < 1023) return "Hàn Lộ";
    if (val >= 1023 && val < 1107) return "Sương Giáng";
    if (val >= 1107 && val < 1122) return "Lập Đông";
    if (val >= 1122 && val < 1207) return "Tiểu Tuyết";
    if (val >= 1207 && val < 1221) return "Đại Tuyết";
    return "Đông Chí";
}

// 4. Tính toán Ngày Hoàng Đạo / Hắc Đạo dựa trên Tháng và Chi của Ngày
// Quy luật Thanh Long Hoàng Đạo
export function getDayStatus(lMonth, dayChi) {
    // d: Chi của ngày (Tý=0, Sửu=1, ..., Hợi=11)
    const dIndex = CHI.indexOf(dayChi);
    if (dIndex === -1) return { name: "Không rõ", type: "Bình thường" };
    
    // Khởi đầu Thanh Long cho các tháng (tháng âm lịch)
    let s = 0;
    if (lMonth === 1 || lMonth === 7) s = 0; // Tý
    else if (lMonth === 2 || lMonth === 8) s = 2; // Dần
    else if (lMonth === 3 || lMonth === 9) s = 4; // Thìn
    else if (lMonth === 4 || lMonth === 10) s = 6; // Ngọ
    else if (lMonth === 5 || lMonth === 11) s = 8; // Thân
    else if (lMonth === 6 || lMonth === 12) s = 10; // Tuất
    
    const offset = (dIndex - s + 12) % 12;
    
    const deities = [
        { name: "Thanh Long", type: "Hoàng Đạo" },
        { name: "Minh Đường", type: "Hoàng Đạo" },
        { name: "Thiên Hình", type: "Hắc Đạo" },
        { name: "Chu Tước", type: "Hắc Đạo" },
        { name: "Kim Quỹ", type: "Hoàng Đạo" },
        { name: "Bảo Quang", type: "Hoàng Đạo" },
        { name: "Bạch Hổ", type: "Hắc Đạo" },
        { name: "Ngọc Đường", type: "Hoàng Đạo" },
        { name: "Thiên Lao", type: "Hắc Đạo" },
        { name: "Huyền Vũ", type: "Hắc Đạo" },
        { name: "Tư Mệnh", type: "Hoàng Đạo" },
        { name: "Câu Trận", type: "Hắc Đạo" }
    ];
    
    return deities[offset];
}

// 5. Xác định giờ Hoàng Đạo dựa trên Chi của Ngày
export function getAuspiciousHours(dayChi) {
    const map = {
        "Tý": ["Tý (23h-01h)", "Sửu (01h-03h)", "Mão (05h-07h)", "Ngọ (11h-13h)", "Thân (15h-17h)", "Dậu (17h-19h)"],
        "Ngọ": ["Tý (23h-01h)", "Sửu (01h-03h)", "Mão (05h-07h)", "Ngọ (11h-13h)", "Thân (15h-17h)", "Dậu (17h-19h)"],
        "Sửu": ["Dần (03h-05h)", "Mão (05h-07h)", "Tỵ (09h-11h)", "Thân (15h-17h)", "Tuất (19h-21h)", "Hợi (21h-23h)"],
        "Mùi": ["Dần (03h-05h)", "Mão (05h-07h)", "Tỵ (09h-11h)", "Thân (15h-17h)", "Tuất (19h-21h)", "Hợi (21h-23h)"],
        "Dần": ["Tý (23h-01h)", "Sửu (01h-03h)", "Thìn (07h-09h)", "Tỵ (09h-11h)", "Mùi (13h-15h)", "Tuất (19h-21h)"],
        "Thân": ["Tý (23h-01h)", "Sửu (01h-03h)", "Thìn (07h-09h)", "Tỵ (09h-11h)", "Mùi (13h-15h)", "Tuất (19h-21h)"],
        "Mão": ["Tý (23h-01h)", "Dần (03h-05h)", "Mão (05h-07h)", "Ngọ (11h-13h)", "Mùi (13h-15h)", "Dậu (17h-19h)"],
        "Dậu": ["Tý (23h-01h)", "Dần (03h-05h)", "Mão (05h-07h)", "Ngọ (11h-13h)", "Mùi (13h-15h)", "Dậu (17h-19h)"],
        "Thìn": ["Dần (03h-05h)", "Thìn (07h-09h)", "Tỵ (09h-11h)", "Thân (15h-17h)", "Dậu (17h-19h)", "Hợi (21h-23h)"],
        "Tuất": ["Dần (03h-05h)", "Thìn (07h-09h)", "Tỵ (09h-11h)", "Thân (15h-17h)", "Dậu (17h-19h)", "Hợi (21h-23h)"],
        "Tỵ": ["Sửu (01h-03h)", "Thìn (07h-09h)", "Ngọ (11h-13h)", "Mùi (13h-15h)", "Tuất (19h-21h)", "Hợi (21h-23h)"],
        "Hợi": ["Sửu (01h-03h)", "Thìn (07h-09h)", "Ngọ (11h-13h)", "Mùi (13h-15h)", "Tuất (19h-21h)", "Hợi (21h-23h)"]
    };
    return map[dayChi] || [];
}

// 6. Tính tuổi xung khắc
export function getClashingAges(dayCan, dayChi) {
    const lucXungMap = {
        "Tý": { sign: "Ngọ", details: ["Mậu Ngọ", "Nhâm Ngọ"] },
        "Sửu": { sign: "Mùi", details: ["Kỷ Mùi", "Quý Mùi"] },
        "Dần": { sign: "Thân", details: ["Canh Thân", "Giáp Thân"] },
        "Mão": { sign: "Dậu", details: ["Tân Dậu", "Ất Dậu"] },
        "Thìn": { sign: "Tuất", details: ["Mậu Tuất", "Nhâm Tuất"] },
        "Tỵ": { sign: "Hợi", details: ["Kỷ Hợi", "Quý Hợi"] },
        "Ngọ": { sign: "Tý", details: ["Canh Tý", "Bính Tý"] },
        "Mùi": { sign: "Sửu", details: ["Tân Sửu", "Đinh Sửu"] },
        "Thân": { sign: "Dần", details: ["Bính Dần", "Nhâm Dần"] },
        "Dậu": { sign: "Mão", details: ["Đinh Mão", "Kỷ Mão"] },
        "Tuất": { sign: "Thìn", details: ["Mậu Thìn", "Canh Thìn"] },
        "Hợi": { sign: "Tỵ", details: ["Đinh Tỵ", "Ất Tỵ"] }
    };
    const clash = lucXungMap[dayChi];
    if (!clash) return "Không có";
    return `${clash.sign} (đặc biệt là ${clash.details.join(", ")})`;
}

// 7. Tính Hướng tốt (Hỷ Thần, Tài Thần)
export function getDepartureDirections(dayCan) {
    const hyThanMap = {
        "Giáp": "Đông Bắc", "Kỷ": "Đông Bắc",
        "Ất": "Tây Bắc", "Canh": "Tây Bắc",
        "Bính": "Tây Nam", "Tân": "Tây Nam",
        "Đinh": "Chính Nam", "Nhâm": "Chính Nam",
        "Mậu": "Đông Nam", "Quý": "Đông Nam"
    };
    
    const taiThanMap = {
        "Giáp": "Đông Nam", "Ất": "Đông Nam",
        "Bính": "Chính Đông", "Đinh": "Chính Đông",
        "Mậu": "Chính Nam", "Kỷ": "Chính Nam",
        "Canh": "Chính Tây", "Tân": "Chính Tây",
        "Nhâm": "Chính Bắc", "Quý": "Chính Bắc"
    };
    return {
        hyThan: hyThanMap[dayCan] || "Đông Nam",
        taiThan: taiThanMap[dayCan] || "Chính Nam"
    };
}

// 8. Đánh giá ngày Sát Chủ
export function isSatChuDay(lunarMonth, dayChi) {
    const satChuMap = {
        1: "Tỵ", 2: "Tý", 3: "Mùi", 4: "Mão", 5: "Thân", 6: "Tuất",
        7: "Hợi", 8: "Sửu", 9: "Ngọ", 10: "Dậu", 11: "Dần", 12: "Thìn"
    };
    return satChuMap[lunarMonth] === dayChi;
}

// 9. Lấy khuyến cáo Việc nên làm / Kiêng kỵ
export function getDayRecommendations(lDay, lunarMonth, dayChi, isHoangDao) {
    const isTamNuong = [3, 7, 13, 18, 22, 27].includes(lDay);
    const isNguyetKy = [5, 14, 23].includes(lDay);
    const isSatChu = isSatChuDay(lunarMonth, dayChi);
    
    let badReasons = [];
    if (isTamNuong) badReasons.push("Ngày Tam Nương");
    if (isNguyetKy) badReasons.push("Ngày Nguyệt Kỵ");
    if (isSatChu) badReasons.push("Ngày Sát Chủ");

    let title = isHoangDao ? "Ngày Hoàng Đạo (Cát lành)" : "Ngày Hắc Đạo (Hạn chế việc lớn)";
    if (badReasons.length > 0) {
        title = `Ngày Hung (${badReasons.join(", ")})`;
    }

    let shouldDo = [];
    let shouldAvoid = [];

    if (badReasons.length > 0 || !isHoangDao) {
        shouldDo = [
            "Cúng tế, tảo mộ, thăm viếng người thân",
            "Dọn dẹp nhà cửa, thanh lọc không gian",
            "Lập kế hoạch chi tiết, học tập, nghiên cứu khoa học"
        ];
        shouldAvoid = [
            "Khởi công động thổ, xây cất nhà cửa",
            "Cưới hỏi, dạm ngõ, ăn hỏi gia đình",
            "Khai trương, ký kết hợp đồng thương mại lớn",
            "Đi xa xuất hành cầu tài lộc lớn",
            "Tranh chấp, kiện tụng, gây bất hòa"
        ];
    } else {
        shouldDo = [
            "Khai trương cửa hàng, bắt đầu kinh doanh mới",
            "Ký kết hợp đồng, giao dịch tài chính, mua bán lớn",
            "Động thổ, sửa chữa xây dựng, động thổ móng nhà",
            "Cưới xin, đính hôn, ra mắt họ hàng hai bên",
            "Xuất hành cầu tài, dời chỗ ở mới"
        ];
        shouldAvoid = [
            "Tranh chấp, kiện tụng hoặc đối thoại gay gắt",
            "Đóng cửa kinh doanh, thanh lý tài sản",
            "Để không gian ẩm thấp, u tối trong nhà"
        ];
    }

    return {
        title: title,
        shouldDo: shouldDo,
        shouldAvoid: shouldAvoid,
        isBadDay: badReasons.length > 0,
        badReasons: badReasons
    };
}

// 10. Render lưới lịch của tháng đang chọn
function renderCalendarGrid() {
    const gridContainer = document.getElementById('lunarGridBody');
    if (!gridContainer) return;
    
    gridContainer.innerHTML = '';
    
    const year = state.viewYear;
    const month = state.viewMonth;
    
    // Ngày đầu tiên của tháng và số ngày trong tháng
    const firstDayDate = new Date(year, month - 1, 1);
    // Ngày trong tuần của ngày 1 (Chủ nhật là 0, Thứ hai là 1, ..., Thứ bảy là 6)
    // Chuyển sang Monday-first (Thứ hai là 0, ..., Chủ nhật là 6)
    let startDayOfWeek = (firstDayDate.getDay() + 6) % 7;
    
    const totalDays = new Date(year, month, 0).getDate();
    const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();
    
    const totalCells = 42; // Cố định 6 dòng
    
    // Danh sách ngày để render
    let cells = [];
    
    // Thêm các ngày của tháng trước
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
        const d = prevMonthTotalDays - i;
        const m = month === 1 ? 12 : month - 1;
        const y = month === 1 ? year - 1 : year;
        cells.push({ day: d, month: m, year: y, isCurrentMonth: false });
    }
    
    // Thêm các ngày của tháng hiện tại
    for (let d = 1; d <= totalDays; d++) {
        cells.push({ day: d, month: month, year: year, isCurrentMonth: true });
    }
    
    // Thêm các ngày của tháng sau
    let nextMonthDay = 1;
    while (cells.length < totalCells) {
        const m = month === 12 ? 1 : month + 1;
        const y = month === 12 ? year + 1 : year;
        cells.push({ day: nextMonthDay, month: m, year: y, isCurrentMonth: false });
        nextMonthDay++;
    }
    
    const today = new Date();
    
    cells.forEach(cell => {
        const cellDiv = document.createElement('div');
        cellDiv.className = 'lunar-day-cell';
        if (!cell.isCurrentMonth) {
            cellDiv.classList.add('other-month');
        }
        
        // Tính toán âm lịch cho ngày này
        let lunar = null;
        if (window.lunarVietnam && typeof window.lunarVietnam.convertSolar2Lunar === 'function') {
            lunar = window.lunarVietnam.convertSolar2Lunar(cell.day, cell.month, cell.year);
        }
        
        // Kiểm tra xem có trùng với ngày đang chọn không
        const isSelected = state.selectedDate.getDate() === cell.day && 
                           state.selectedDate.getMonth() + 1 === cell.month && 
                           state.selectedDate.getFullYear() === cell.year;
                           
        if (isSelected) {
            cellDiv.classList.add('active-select');
        }
        
        // Kiểm tra xem có phải hôm nay không
        const isToday = today.getDate() === cell.day && 
                        today.getMonth() + 1 === cell.month && 
                        today.getFullYear() === cell.year;
                        
        if (isToday) {
            cellDiv.classList.add('today');
        }
        
        // Nội dung hiển thị dương lịch
        const solarSpan = document.createElement('span');
        solarSpan.className = 'solar-day-num';
        solarSpan.textContent = cell.day;
        cellDiv.appendChild(solarSpan);
        
        // Nội dung hiển thị âm lịch
        if (lunar) {
            const lunarSpan = document.createElement('span');
            lunarSpan.className = 'lunar-day-num';
            
            // Nếu ngày 1 âm lịch hoặc ngày rằm thì đổi text sang hiển thị Ngày/Tháng hoặc "15" rõ nét
            if (lunar.lDay === 1) {
                lunarSpan.textContent = `${lunar.lDay}/${lunar.lMonth}`;
                cellDiv.classList.add('special-lunar-day');
            } else if (lunar.lDay === 15) {
                lunarSpan.textContent = 'Rằm';
                cellDiv.classList.add('special-lunar-day');
            } else {
                lunarSpan.textContent = lunar.lDay;
            }
            
            cellDiv.appendChild(lunarSpan);
            
            // Thêm dấu chấm trạng thái (Hoàng đạo / Hung)
            const statusDot = document.createElement('div');
            statusDot.className = 'day-cell-status-dot';
            
            const deity = getDayStatus(lunar.lMonth, lunar.animal); // dùng animal đại diện cho Chi ngày trong thư viện
            const isBad = [3, 7, 13, 18, 22, 27].includes(lunar.lDay) || 
                          [5, 14, 23].includes(lunar.lDay) || 
                          isSatChuDay(lunar.lMonth, lunar.animal);
                          
            if (isBad) {
                statusDot.classList.add('bad-day');
                cellDiv.appendChild(statusDot);
            } else if (deity && deity.type === "Hoàng Đạo") {
                statusDot.classList.add('hoang-dao');
                cellDiv.appendChild(statusDot);
            }
            
            cellDiv.setAttribute('title', `Dương lịch: ${cell.day}/${cell.month}/${cell.year} - Âm lịch: ${lunar.lDay}/${lunar.lMonth}/${lunar.lYear} (${lunar.gzDay})`);
        }
        
        // Xử lý sự kiện click chọn ngày
        cellDiv.addEventListener('click', () => {
            state.selectedDate = new Date(cell.year, cell.month - 1, cell.day);
            
            // Cập nhật lại grid để hiển thị active-select
            document.querySelectorAll('.lunar-day-cell').forEach(c => c.classList.remove('active-select'));
            cellDiv.classList.add('active-select');
            
            // Cập nhật panel thông tin chi tiết bên phải
            updateDetailPanel(state.selectedDate);
        });
        
        gridContainer.appendChild(cellDiv);
    });
}

// 11. Cập nhật bảng thông tin phong thủy ngày được chọn
export function updateDetailPanel(date) {
    const solarTitle = document.getElementById('detailSolarDate');
    const lunarTitle = document.getElementById('detailLunarDate');
    const badgesRow = document.getElementById('detailBadges');
    
    const canchiYear = document.getElementById('canchiYear');
    const canchiMonth = document.getElementById('canchiMonth');
    const canchiDay = document.getElementById('canchiDay');
    const canchiHour = document.getElementById('canchiHour');
    
    const termValue = document.getElementById('tietKhiVal');
    const hoursGrid = document.getElementById('goodHoursGrid');
    const clashValue = document.getElementById('clashAgeVal');
    const hyThanValue = document.getElementById('hyThanVal');
    const taiThanValue = document.getElementById('taiThanVal');
    
    const doList = document.getElementById('shouldDoList');
    const avoidList = document.getElementById('shouldAvoidList');
    
    if (!solarTitle) return;
    
    const dd = date.getDate();
    const mm = date.getMonth() + 1;
    const yyyy = date.getFullYear();
    const dayOfWeekStr = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"][date.getDay()];
    
    // Hiển thị ngày dương lịch
    solarTitle.textContent = `${dayOfWeekStr}, ${dd < 10 ? '0' + dd : dd}/${mm < 10 ? '0' + mm : mm}/${yyyy}`;
    
    if (!window.lunarVietnam || typeof window.lunarVietnam.convertSolar2Lunar !== 'function') {
        lunarTitle.textContent = 'Lỗi nạp thư viện Lịch âm';
        return;
    }
    
    const lunar = window.lunarVietnam.convertSolar2Lunar(dd, mm, yyyy);
    if (!lunar) {
        lunarTitle.textContent = 'Ngày nằm ngoài dải lịch hỗ trợ';
        return;
    }
    
    // Hiển thị ngày âm lịch
    let monthName = lunar.lMonth.toString();
    if (lunar.lMonth === 1) monthName = 'Giêng';
    else if (lunar.lMonth === 11) monthName = 'Một';
    else if (lunar.lMonth === 12) monthName = 'Chạp';
    const leapText = lunar.isLeap ? ' (nhuận)' : '';
    lunarTitle.textContent = `Ngày ${lunar.lDay} tháng ${monthName}${leapText}, năm ${lunar.lYear}`;
    
    // Can Chi Ngày, Năm
    const dayCan = lunar.gzDay.split(" ")[0];
    const dayChi = lunar.gzDay.split(" ")[1];
    const yearCan = lunar.gzYear.split(" ")[0];
    
    canchiYear.textContent = lunar.gzYear;
    canchiDay.textContent = lunar.gzDay;
    
    // Can Chi Tháng
    const monthCanChi = getMonthCanChi(yearCan, lunar.lMonth);
    canchiMonth.textContent = monthCanChi || '--';
    
    // Can Chi Giờ (lấy giờ hiện tại trên thiết bị nếu là ngày hôm nay, hoặc mặc định giờ Tý)
    const currentHour = new Date().getHours();
    let currentHourBranchIndex = 0; // Tý
    if (currentHour >= 1 && currentHour < 3) currentHourBranchIndex = 1; // Sửu
    else if (currentHour >= 3 && currentHour < 5) currentHourBranchIndex = 2; // Dần
    else if (currentHour >= 5 && currentHour < 7) currentHourBranchIndex = 3; // Mão
    else if (currentHour >= 7 && currentHour < 9) currentHourBranchIndex = 4; // Thìn
    else if (currentHour >= 9 && currentHour < 11) currentHourBranchIndex = 5; // Tỵ
    else if (currentHour >= 11 && currentHour < 13) currentHourBranchIndex = 6; // Ngọ
    else if (currentHour >= 13 && currentHour < 15) currentHourBranchIndex = 7; // Mùi
    else if (currentHour >= 15 && currentHour < 17) currentHourBranchIndex = 8; // Thân
    else if (currentHour >= 17 && currentHour < 19) currentHourBranchIndex = 9; // Dậu
    else if (currentHour >= 19 && currentHour < 21) currentHourBranchIndex = 10; // Tuất
    else if (currentHour >= 21 && currentHour < 23) currentHourBranchIndex = 11; // Hợi
    
    const hourCanChiStr = getHourCanChi(dayCan, currentHourBranchIndex);
    canchiHour.textContent = `${hourCanChiStr} (${CHI[currentHourBranchIndex]} - Giờ hiện tại)`;
    
    // Tiết khí
    termValue.textContent = getSolarTerm(dd, mm);
    
    // Hoàng Đạo / Hắc Đạo
    const deity = getDayStatus(lunar.lMonth, dayChi);
    const isHoangDao = deity.type === "Hoàng Đạo";
    
    // Xây dựng các nhãn (badge)
    badgesRow.innerHTML = '';
    const statusBadge = document.createElement('span');
    statusBadge.className = `lunar-badge ${isHoangDao ? 'hoangdao' : 'hacdao'}`;
    statusBadge.textContent = `${deity.name} ${deity.type}`;
    badgesRow.appendChild(statusBadge);
    
    // Thêm badge cảnh báo nếu trúng ngày Tam nương / Nguyệt kỵ / Sát chủ
    const recs = getDayRecommendations(lunar.lDay, lunar.lMonth, dayChi, isHoangDao);
    if (recs.isBadDay) {
        recs.badReasons.forEach(reason => {
            const badBadge = document.createElement('span');
            badBadge.className = 'lunar-badge danger-day';
            badBadge.textContent = reason;
            badgesRow.appendChild(badBadge);
        });
    }
    
    // Giờ Hoàng Đạo
    hoursGrid.innerHTML = '';
    const goodHoursList = getAuspiciousHours(dayChi);
    goodHoursList.forEach(hStr => {
        const badge = document.createElement('span');
        badge.className = 'hour-badge good';
        badge.textContent = hStr;
        hoursGrid.appendChild(badge);
    });
    
    // Tuổi xung
    clashValue.textContent = getClashingAges(dayCan, dayChi);
    
    // Hướng xuất hành
    const dirs = getDepartureDirections(dayCan);
    hyThanValue.textContent = dirs.hyThan;
    taiThanValue.textContent = dirs.taiThan;
    
    // Nên làm / Kiêng kỵ
    doList.innerHTML = '';
    recs.shouldDo.forEach(act => {
        const li = document.createElement('div');
        li.className = 'recommend-item do';
        li.textContent = act;
        doList.appendChild(li);
    });
    
    avoidList.innerHTML = '';
    recs.shouldAvoid.forEach(act => {
        const li = document.createElement('div');
        li.className = 'recommend-item avoid';
        li.textContent = act;
        avoidList.appendChild(li);
    });
}

// 12. Khởi tạo Modal và gắn các sự kiện điều hướng
export function initLunarCalendarBindings() {
    const selectMonth = document.getElementById('lunarSelectMonth');
    const selectYear = document.getElementById('lunarSelectYear');
    
    if (!selectMonth || !selectYear) return;
    
    // Nạp danh sách tháng (1-12) và năm (1900-2199)
    selectMonth.innerHTML = '';
    for (let m = 1; m <= 12; m++) {
        const opt = document.createElement('option');
        opt.value = m;
        opt.textContent = `Tháng ${m}`;
        selectMonth.appendChild(opt);
    }
    
    selectYear.innerHTML = '';
    for (let y = 1900; y <= 2199; y++) {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = `Năm ${y}`;
        selectYear.appendChild(opt);
    }
    
    // Đặt giá trị ban đầu cho bộ chọn
    selectMonth.value = state.viewMonth;
    selectYear.value = state.viewYear;
    
    // Lắng nghe thay đổi dropdown
    selectMonth.addEventListener('change', (e) => {
        state.viewMonth = parseInt(e.target.value);
        renderCalendarGrid();
    });
    
    selectYear.addEventListener('change', (e) => {
        state.viewYear = parseInt(e.target.value);
        renderCalendarGrid();
    });
    
    // Lắng nghe các nút chuyển tháng/năm
    document.getElementById('lunarBtnPrevYear').addEventListener('click', () => {
        if (state.viewYear > 1900) {
            state.viewYear--;
            selectYear.value = state.viewYear;
            renderCalendarGrid();
        }
    });
    
    document.getElementById('lunarBtnPrevMonth').addEventListener('click', () => {
        if (state.viewMonth === 1) {
            if (state.viewYear > 1900) {
                state.viewMonth = 12;
                state.viewYear--;
                selectMonth.value = state.viewMonth;
                selectYear.value = state.viewYear;
                renderCalendarGrid();
            }
        } else {
            state.viewMonth--;
            selectMonth.value = state.viewMonth;
            renderCalendarGrid();
        }
    });
    
    document.getElementById('lunarBtnNextMonth').addEventListener('click', () => {
        if (state.viewMonth === 12) {
            if (state.viewYear < 2199) {
                state.viewMonth = 1;
                state.viewYear++;
                selectMonth.value = state.viewMonth;
                selectYear.value = state.viewYear;
                renderCalendarGrid();
            }
        } else {
            state.viewMonth++;
            selectMonth.value = state.viewMonth;
            renderCalendarGrid();
        }
    });
    
    document.getElementById('lunarBtnNextYear').addEventListener('click', () => {
        if (state.viewYear < 2199) {
            state.viewYear++;
            selectYear.value = state.viewYear;
            renderCalendarGrid();
        }
    });
    
    // Nút nhảy về hôm nay
    document.getElementById('lunarBtnToday').addEventListener('click', () => {
        const today = new Date();
        state.selectedDate = today;
        state.viewYear = today.getFullYear();
        state.viewMonth = today.getMonth() + 1;
        
        selectMonth.value = state.viewMonth;
        selectYear.value = state.viewYear;
        
        renderCalendarGrid();
        updateDetailPanel(today);
    });
    
    // Đóng Modal (Giữ lại guard đề phòng modal vẫn được dùng)
    const closeBtn = document.getElementById('lunarCalendarModalClose');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            closeLunarCalendarModal();
        });
    }
    
    const modalOverlay = document.getElementById('lunarCalendarModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeLunarCalendarModal();
            }
        });
    }
}

// Mở Lịch vạn niên (chuyển sang dạng Tab Card)
export function openLunarCalendarModal() {
    if (typeof window.switchTab === 'function') {
        window.switchTab('am-lich');
    }
    
    const today = state.selectedDate || new Date();
    state.viewYear = today.getFullYear();
    state.viewMonth = today.getMonth() + 1;
    
    const selectMonth = document.getElementById('lunarSelectMonth');
    const selectYear = document.getElementById('lunarSelectYear');
    if (selectMonth && selectYear) {
        selectMonth.value = state.viewMonth;
        selectYear.value = state.viewYear;
    }
    
    renderCalendarGrid();
    updateDetailPanel(today);
    
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Đóng Lịch vạn niên (quay lại Trang chủ)
export function closeLunarCalendarModal() {
    if (typeof window.switchTab === 'function') {
        window.switchTab('home');
    }
}

// Đăng ký toàn cục
if (typeof window !== 'undefined') {
    window.openLunarCalendarModal = openLunarCalendarModal;
    window.closeLunarCalendarModal = closeLunarCalendarModal;
}
