/**
 * Thư viện tính Lịch âm Việt Nam tối giản (v4.0.1)
 * Dựa trên thuật toán chuyển đổi âm dương lịch của tác giả Hồ Ngọc Đức.
 * Thiết lập múi giờ chuẩn GMT+7 cho Việt Nam.
 * Dung lượng tối giản, không chứa các thành phần giao diện thừa.
 */

(function (global) {
    'use strict';

    // Bảng dữ liệu nén cấu trúc năm âm lịch Việt Nam
    var TK20 = [ // 1900-1999
        0x3c4bd8, 0x624ae0, 0x4ca570, 0x3854d5, 0x5cd260, 0x44d950, 0x315554, 0x5656a0, 0x409ad0, 0x2a55d2,
        0x504ae0, 0x3aa5b6, 0x60a4d0, 0x48d250, 0x33d255, 0x58b540, 0x42d6a0, 0x2cada2, 0x5295b0, 0x3f4977,
        0x644970, 0x4ca4b0, 0x36b4b5, 0x5c6a50, 0x466d50, 0x312b54, 0x562b60, 0x409570, 0x2c52f2, 0x504970,
        0x3a6566, 0x5ed4a0, 0x48ea50, 0x336a95, 0x585ad0, 0x442b60, 0x2f86e3, 0x5292e0, 0x3dc8d7, 0x62c950,
        0x4cd4a0, 0x35d8a6, 0x5ab550, 0x4656a0, 0x31a5b4, 0x5625d0, 0x4092d0, 0x2ad2b2, 0x50a950, 0x38b557,
        0x5e6ca0, 0x48b550, 0x355355, 0x584da0, 0x42a5b0, 0x2f4573, 0x5452b0, 0x3ca9a8, 0x60e950, 0x4c6aa0,
        0x36aea6, 0x5aab50, 0x464b60, 0x30aae4, 0x56a570, 0x405260, 0x28f263, 0x4ed940, 0x38db47, 0x5cd6a0,
        0x4896d0, 0x344dd5, 0x5a4ad0, 0x42a4d0, 0x2cd4b4, 0x52b250, 0x3cd558, 0x60b540, 0x4ab5a0, 0x3755a6,
        0x5c95b0, 0x4649b0, 0x30a974, 0x56a4b0, 0x40aa50, 0x29aa52, 0x4e6d20, 0x39ad47, 0x5eab60, 0x489370,
        0x344af5, 0x5a4970, 0x4464b0, 0x2c74a3, 0x50ea50, 0x3d6a58, 0x6256a0, 0x4aaad0, 0x3696d5, 0x5c92e0
    ];

    var TK21 = [ // 2000-2099
        0x46c960, 0x2ed954, 0x54d4a0, 0x3eda50, 0x2a7552, 0x4e56a0, 0x38a7a7, 0x5ea5d0, 0x4a92b0, 0x32aab5,
        0x58a950, 0x42b4a0, 0x2cbaa4, 0x50ad50, 0x3c55d9, 0x624ba0, 0x4ca5b0, 0x375176, 0x5c5270, 0x466930,
        0x307934, 0x546aa0, 0x3ead50, 0x2a5b52, 0x504b60, 0x38a6e6, 0x5ea4e0, 0x48d260, 0x32ea65, 0x56d520,
        0x40daa0, 0x2d56a3, 0x5256d0, 0x3c4afb, 0x6249d0, 0x4ca4d0, 0x37d0b6, 0x5ab250, 0x44b520, 0x2edd25,
        0x54b5a0, 0x3e55d0, 0x2a55b2, 0x5049b0, 0x3aa577, 0x5ea4b0, 0x48aa50, 0x33b255, 0x586d20, 0x40ad60,
        0x2d4b63, 0x525370, 0x3e49e8, 0x60c970, 0x4c54b0, 0x3768a6, 0x5ada50, 0x445aa0, 0x2fa6a4, 0x54aad0,
        0x4052e0, 0x28d2e3, 0x4ec950, 0x38d557, 0x5ed4a0, 0x46d950, 0x325d55, 0x5856a0, 0x42a6d0, 0x2c55d4,
        0x5252b0, 0x3ca9b8, 0x62a930, 0x4ab490, 0x34b6a6, 0x5aad50, 0x4655a0, 0x2eab64, 0x54a570, 0x4052b0,
        0x2ab173, 0x4e6930, 0x386b37, 0x5e6aa0, 0x48ad50, 0x332ad5, 0x582b60, 0x42a570, 0x2e52e4, 0x50d160,
        0x3ae958, 0x60d520, 0x4ada90, 0x355aa6, 0x5a56d0, 0x462ae0, 0x30a9d4, 0x54a2d0, 0x3ed150, 0x28e952
    ];

    var TK22 = [ // 2100-2199
        0x4eb520, 0x38d727, 0x5eada0, 0x4a55b0, 0x362db5, 0x5a45b0, 0x44a2b0, 0x2eb2b4, 0x54a950, 0x3cb559,
        0x626b20, 0x4cad50, 0x385766, 0x5c5370, 0x484570, 0x326574, 0x5852b0, 0x406950, 0x2a7953, 0x505aa0,
        0x3baaa7, 0x5ea6d0, 0x4a4ae0, 0x35a2e5, 0x5aa550, 0x42d2a0, 0x2de2a4, 0x52d550, 0x3e5abb, 0x6256a0,
        0x4c96d0, 0x3949b6, 0x5e4ab0, 0x46a8d0, 0x30d4b5, 0x56b290, 0x40b550, 0x2a6d52, 0x504da0, 0x3b9567,
        0x609570, 0x4a49b0, 0x34a975, 0x5a64b0, 0x446a90, 0x2cba94, 0x526b50, 0x3e2b60, 0x28ab61, 0x4c9570,
        0x384ae6, 0x5cd160, 0x46e4a0, 0x2eed25, 0x54da90, 0x405b50, 0x2c36d3, 0x502ae0, 0x3a93d7, 0x6092d0,
        0x4ac950, 0x32d556, 0x58b4a0, 0x42b690, 0x2e5d94, 0x5255b0, 0x3e25fa, 0x6425b0, 0x4e92b0, 0x36aab6,
        0x5c6950, 0x4674a0, 0x31b2a5, 0x54ad50, 0x4055a0, 0x2aab73, 0x522570, 0x3a5377, 0x6052b0, 0x4a6950,
        0x346d56, 0x585aa0, 0x42ab50, 0x2e56d4, 0x544ae0, 0x3ca570, 0x2864d2, 0x4cd260, 0x36eaa6, 0x5ad550,
        0x465aa0, 0x30ada5, 0x5695d0, 0x404ad0, 0x2aa9b3, 0x50a4d0, 0x3ad2b7, 0x5eb250, 0x48b540, 0x33d556
    ];

    var CAN = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"];
    var CHI = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];

    function INT(d) {
        return Math.floor(d);
    }

    // Tính số ngày Julian (JDN) từ ngày Dương lịch
    function jdn(dd, mm, yy) {
        var a = INT((14 - mm) / 12);
        var y = yy + 4800 - a;
        var m = mm + 12 * a - 3;
        var jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
        return jd;
    }

    function LunarDate(dd, mm, yy, leap, jd) {
        this.day = dd;
        this.month = mm;
        this.year = yy;
        this.leap = leap;
        this.jd = jd;
    }

    // Giải nén cấu trúc tháng âm lịch của năm
    function decodeLunarYear(yy, k) {
        var monthLengths = [29, 30];
        var regularMonths = new Array(12);
        var offsetOfTet = k >> 17;
        var leapMonth = k & 0xf;
        var leapMonthLength = monthLengths[(k >> 16) & 0x1];
        var solarNY = jdn(1, 1, yy);
        var currentJD = solarNY + offsetOfTet;
        var j = k >> 4;
        
        for (var i = 0; i < 12; i++) {
            regularMonths[12 - i - 1] = monthLengths[j & 0x1];
            j >>= 1;
        }
        
        var ly = [];
        if (leapMonth == 0) {
            for (var mm = 1; mm <= 12; mm++) {
                ly.push(new LunarDate(1, mm, yy, 0, currentJD));
                currentJD += regularMonths[mm - 1];
            }
        } else {
            for (var mm = 1; mm <= leapMonth; mm++) {
                ly.push(new LunarDate(1, mm, yy, 0, currentJD));
                currentJD += regularMonths[mm - 1];
            }
            ly.push(new LunarDate(1, leapMonth, yy, 1, currentJD));
            currentJD += leapMonthLength;
            for (var mm = leapMonth + 1; mm <= 12; mm++) {
                ly.push(new LunarDate(1, mm, yy, 0, currentJD));
                currentJD += regularMonths[mm - 1];
            }
        }
        return ly;
    }

    // Chuyển đổi Dương lịch -> Âm lịch Việt Nam chuẩn
    function convertSolar2Lunar(dd, mm, yyyy) {
        dd = Number(dd);
        mm = Number(mm);
        yyyy = Number(yyyy);
        
        if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return null;
        if (yyyy < 1900 || yyyy > 2199) return null; // Giới hạn bảng dữ liệu

        var jd = jdn(dd, mm, yyyy);
        var yy = yyyy;
        var k;

        // Lấy mã năm k tương ứng
        if (yy >= 2000 && yy <= 2099) {
            k = TK21[yy - 2000];
        } else if (yy >= 1900 && yy <= 1999) {
            k = TK20[yy - 1900];
        } else if (yy >= 2100 && yy <= 2199) {
            k = TK22[yy - 2100];
        }

        var ly = decodeLunarYear(yy, k);
        
        // Nếu ngày Dương lịch nhỏ hơn ngày bắt đầu tháng 1 âm lịch của năm nay
        // thì ngày này thuộc về năm âm lịch trước đó
        if (jd < ly[0].jd) {
            yy = yyyy - 1;
            if (yy >= 2000 && yy <= 2099) {
                k = TK21[yy - 2000];
            } else if (yy >= 1900 && yy <= 1999) {
                k = TK20[yy - 1900];
            } else if (yy >= 2100 && yy <= 2199) {
                k = TK22[yy - 2100];
            }
            ly = decodeLunarYear(yy, k);
        }

        // Tìm tháng âm lịch phù hợp
        var m = ly.length - 1;
        while (m >= 0) {
            if (jd >= ly[m].jd) {
                break;
            }
            m--;
        }

        var lunarDay = jd - ly[m].jd + 1;
        var lunarMonth = ly[m].month;
        var lunarYear = ly[m].year;
        var isLeap = ly[m].leap;

        // Can Chi
        var gzYear = CAN[(lunarYear - 4) % 10] + " " + CHI[(lunarYear - 4) % 12];
        var gzDay = CAN[(jd + 9) % 10] + " " + CHI[(jd + 1) % 12];

        // Xác định con giáp đại diện cho năm
        var animal = CHI[(lunarYear - 4) % 12];

        return {
            lDay: lunarDay,
            lMonth: lunarMonth,
            lYear: lunarYear,
            isLeap: isLeap === 1,
            gzYear: gzYear,
            gzDay: gzDay,
            animal: animal
        };
    }

    // Export ra global scope
    var lunarVietnam = {
        convertSolar2Lunar: convertSolar2Lunar,
        CAN: CAN,
        CHI: CHI
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = lunarVietnam;
    } else {
        global.lunarVietnam = lunarVietnam;
    }

})(typeof window !== 'undefined' ? window : this);
