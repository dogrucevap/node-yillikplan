// calculator.js
const { format, addDays, getDay, startOfWeek, endOfWeek, lastDayOfMonth, setDate, setMonth } = require('date-fns');
const moment = require('moment-hijri');

// Tarihi YYYY-MM-DD formatına çeviren yardımcı fonksiyon
const formatDateISO = (date) => format(date, 'yyyy-MM-dd');

// Kategori sabitleri
const CATEGORIES = {
    RESMI: 'Resmi Tatil',
    OKUL: 'Okul Tatili',
    BELIRLI: 'Belirli Gün ve Hafta'
};

/**
 * Dini bayramları (Ramazan ve Kurban) verilen Gregorian yılı için hesaplar.
 * @param {number} year - Hesaplama yapılacak yıl.
 * @returns {Array} - Dini bayramların listesi.
 */
function getIslamicHolidays(year) {
    const holidays = [];

    const addHolidayIfInYear = (name, startDateObj, endDateObj, category, targetYear, holidaysArray) => {
        // Hem başlangıç hem de bitiş tarihinin Miladi yılı, hedeflenen yılla aynı olmalı
        if (startDateObj.getFullYear() === targetYear && endDateObj.getFullYear() === targetYear) {
            holidaysArray.push({
                name,
                startDate: formatDateISO(startDateObj),
                endDate: formatDateISO(endDateObj),
                category
            });
        }
    };

    // Miladi yılın ortasındaki bir Hicri tarihi referans al
    const midGregorianDateStr = `${year}-06-15`;
    const midYearHijriRef = moment(midGregorianDateStr, 'YYYY-MM-DD').iYear();
    
    // Referans Hicri yıl, bir önceki ve bir sonraki Hicri yılları test et
    const hijriYearsToTest = [midYearHijriRef - 1, midYearHijriRef, midYearHijriRef + 1];
    const processedHijriYears = [...new Set(hijriYearsToTest)]; // Benzersiz Hicri yılları al

    for (const hYear of processedHijriYears) {
        // Ramazan Bayramı (1 Şevval) - moment-hijri'de Şevval 9. aydır (0-indeksli)
        const ramadanBayramStart = moment().iYear(hYear).iMonth(9).iDate(1).toDate();
        const arefeRamazan = addDays(ramadanBayramStart, -1);
        const ramadanBayramEnd = addDays(ramadanBayramStart, 2);

        addHolidayIfInYear('Ramazan Bayramı Arefesi', arefeRamazan, arefeRamazan, CATEGORIES.RESMI, year, holidays);
        addHolidayIfInYear('Ramazan Bayramı', ramadanBayramStart, ramadanBayramEnd, CATEGORIES.RESMI, year, holidays);

        // Kurban Bayramı (10 Zilhicce) - moment-hijri'de Zilhicce 11. aydır (0-indeksli)
        const kurbanBayramStart = moment().iYear(hYear).iMonth(11).iDate(10).toDate();
        const arefeKurban = addDays(kurbanBayramStart, -1);
        const kurbanBayramEnd = addDays(kurbanBayramStart, 3);
        
        addHolidayIfInYear('Kurban Bayramı Arefesi', arefeKurban, arefeKurban, CATEGORIES.RESMI, year, holidays);
        addHolidayIfInYear('Kurban Bayramı', kurbanBayramStart, kurbanBayramEnd, CATEGORIES.RESMI, year, holidays);
    }
    
    // Yinelenenleri kaldır (startDate ve name'e göre)
    const uniqueHolidays = holidays.filter((holiday, index, self) =>
        index === self.findIndex((t) => (
            t.startDate === holiday.startDate && t.name === holiday.name
        ))
    );

    return uniqueHolidays;
}

/**
 * Belirli bir ayın n'inci haftasının başlangıç ve bitişini bulur.
 * (Örn: Ocak ayının 2. haftası)
 * @param {number} year Yıl
 * @param {number} month Ay (0-11)
 * @param {number} weekNumber Hafta numarası (1'den başlar)
 * @returns {object} { startDate, endDate }
 */
function getNthWeekOfMonth(year, month, weekNumber) {
    let date = new Date(year, month, 1);
    // Ayın ilk pazartesisini bul
    while (getDay(date) !== 1) { // 1 = Pazartesi
        date = addDays(date, 1);
    }
    const firstMonday = date;
    const targetMonday = addDays(firstMonday, (weekNumber - 1) * 7);
    return {
        startDate: formatDateISO(targetMonday),
        endDate: formatDateISO(addDays(targetMonday, 6))
    };
}

/**
 * Bir ayın belirli bir gününün n'inci tekrarını bulur.
 * (Örn: Eylül'ün 2. Pazartesi'si)
 * @param {number} year Yıl
 * @param {number} month Ay (0-11)
 * @param {number} dayOfWeek Gün (0=Pazar, 1=Pzt, ...)
 * @param {number} n Kaçıncı tekrar (1'den başlar)
 * @returns {Date}
 */
function getNthDayOfMonth(year, month, dayOfWeek, n) {
    let count = 0;
    let date = new Date(year, month, 1);
    while (count < n) {
        if (getDay(date) === dayOfWeek) {
            count++;
        }
        if (count < n) {
           date = addDays(date, 1);
        }
    }
    return date;
}


/**
 * Verilen yıl için tüm önemli günleri hesaplar.
 * @param {number} year - Hesaplama yapılacak yıl.
 * @returns {Array} - Tüm olayların listesi.
 */
function calculateAllDates(year) {
    let allEvents = [];

    // --- 1. RESMİ TATİLLER ---
    const fixedHolidays = [
        { name: 'Yılbaşı', date: new Date(year, 0, 1) },
        { name: 'Ulusal Egemenlik ve Çocuk Bayramı', date: new Date(year, 3, 23) },
        { name: 'Emek ve Dayanışma Günü', date: new Date(year, 4, 1) },
        { name: 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı', date: new Date(year, 4, 19) },
        { name: 'Demokrasi ve Milli Birlik Günü', date: new Date(year, 6, 15) },
        { name: 'Zafer Bayramı', date: new Date(year, 7, 30) },
        { name: 'Cumhuriyet Bayramı', date: new Date(year, 9, 29) }, // 29 Ekim (tam gün)
    ];
    fixedHolidays.forEach(h => allEvents.push({ name: h.name, startDate: formatDateISO(h.date), endDate: formatDateISO(h.date), category: CATEGORIES.RESMI }));
    
    // Dini bayramları ekle
    allEvents.push(...getIslamicHolidays(year));

    // --- 2. OKUL TATİLLERİ (Mevcut MEB sistemine göre TAHMİNİ) ---
    // Bu bölüm MEB'in duyurularına göre değişebilir, bu kod mevcut örüntüyü takip eder.
    
    // Yarıyıl Tatili (Ocak 3. haftası başlar, 2 hafta sürer)
    const semiFinalStart = getNthDayOfMonth(year, 0, 1, 4); // Ocak 4. Pazartesi
    allEvents.push({ name: 'Yarıyıl Tatili', startDate: formatDateISO(semiFinalStart), endDate: formatDateISO(addDays(semiFinalStart, 13)), category: CATEGORIES.OKUL });

    // İkinci Ara Tatil (Nisan 2. haftası)
    const secondMidTermStart = getNthDayOfMonth(year, 3, 1, 2); // Nisan 2. Pazartesi
    allEvents.push({ name: 'İkinci Ara Tatil', startDate: formatDateISO(secondMidTermStart), endDate: formatDateISO(addDays(secondMidTermStart, 4)), category: CATEGORIES.OKUL });
    
    // Yaz Tatili (Haziran 2. Cuma'sı sonrası)
    const schoolEnd = getNthDayOfMonth(year, 5, 5, 2); // Haziran 2. Cuma
    allEvents.push({ name: 'Yaz Tatili Başlangıcı', startDate: formatDateISO(addDays(schoolEnd, 1)), endDate: formatDateISO(addDays(schoolEnd, 1)), category: CATEGORIES.OKUL });

    // Okul Başlangıcı (Eylül 2. Pazartesi)
    const schoolStart = getNthDayOfMonth(year, 8, 1, 2);
    allEvents.push({ name: 'Okulların Açılması', startDate: formatDateISO(schoolStart), endDate: formatDateISO(schoolStart), category: CATEGORIES.OKUL });

    // Birinci Ara Tatil (Kasım 2. haftası)
    const firstMidTermStart = getNthDayOfMonth(year, 10, 1, 2); // Kasım 2. Pazartesi
    allEvents.push({ name: 'Birinci Ara Tatil', startDate: formatDateISO(firstMidTermStart), endDate: formatDateISO(addDays(firstMidTermStart, 4)), category: CATEGORIES.OKUL });


    // --- 3. BELİRLİ GÜNLER VE HAFTALAR ---
    const belirliGunler = [
        // Ocak
        { name: 'Enerji Tasarrufu Haftası', ...getNthWeekOfMonth(year, 0, 2) }, // Ocak ayının ikinci haftası
        { 
            name: 'Veremle Savaş Eğitimi Haftası', // Ocak ayının ilk Pazartesi gününü takip eden hafta
            startDate: formatDateISO(startOfWeek(getNthDayOfMonth(year, 0, 1, 1), { weekStartsOn: 1 })), 
            endDate: formatDateISO(endOfWeek(getNthDayOfMonth(year, 0, 1, 1), { weekStartsOn: 1 }))
        },

        // Mart
        { 
            name: 'Yeşilay Haftası', // 1 Mart\'ı içine alan hafta
            startDate: formatDateISO(startOfWeek(new Date(year, 2, 1), { weekStartsOn: 1 })), 
            endDate: formatDateISO(endOfWeek(new Date(year, 2, 1), { weekStartsOn: 1 })) 
        },
        { name: 'Girişimcilik Haftası', ...getNthWeekOfMonth(year, 2, 1) }, // Mart ayının ilk haftası
        { name: '8 Mart Dünya Kadınlar Günü', startDate: formatDateISO(new Date(year, 2, 8)), endDate: formatDateISO(new Date(year, 2, 8))},
        { name: 'Bilim ve Teknoloji Haftası', startDate: formatDateISO(new Date(year, 2, 8)), endDate: formatDateISO(new Date(year, 2, 14)) }, // 8-14 Mart
        { name: '12 Mart İstiklâl Marşı\'nın Kabulü ve Mehmet Akif Ersoy\'u Anma Günü', startDate: formatDateISO(new Date(year, 2, 12)), endDate: formatDateISO(new Date(year, 2, 12))},
        { name: 'Tüketiciyi Koruma Haftası', startDate: formatDateISO(new Date(year, 2, 15)), endDate: formatDateISO(new Date(year, 2, 21)) }, // 15-21 Mart
        { name: '18 Mart Şehitler Günü', startDate: formatDateISO(new Date(year, 2, 18)), endDate: formatDateISO(new Date(year, 2, 18))},
        { name: 'Yaşlılara Saygı Haftası', startDate: formatDateISO(new Date(year, 2, 18)), endDate: formatDateISO(new Date(year, 2, 24)) }, // 18-24 Mart
        { 
            name: 'Türk Dünyası ve Toplulukları Haftası', // 21 Mart Nevruz gününü içine alan hafta
            startDate: formatDateISO(startOfWeek(new Date(year, 2, 21), { weekStartsOn: 1 })), 
            endDate: formatDateISO(endOfWeek(new Date(year, 2, 21), { weekStartsOn: 1 })) 
        },
        { name: 'Orman Haftası', startDate: formatDateISO(new Date(year, 2, 21)), endDate: formatDateISO(new Date(year, 2, 26)) }, // 21-26 Mart
        { name: 'Kütüphaneler Haftası', startDate: formatDateISO(startOfWeek(lastDayOfMonth(new Date(year, 2, 1)), { weekStartsOn: 1 })), endDate: formatDateISO(endOfWeek(lastDayOfMonth(new Date(year, 2, 1)), { weekStartsOn: 1 })) }, // Mart ayının son Pazartesi günü başlayan hafta

        // Nisan
        { name: 'Kanser Haftası', startDate: formatDateISO(new Date(year, 3, 1)), endDate: formatDateISO(new Date(year, 3, 7)) }, // 1-7 Nisan
        { name: 'Turizm Haftası', startDate: formatDateISO(new Date(year, 3, 15)), endDate: formatDateISO(new Date(year, 3, 22)) }, // 15-22 Nisan
        
        // Mayıs
        { name: 'Trafik ve İlkyardım Haftası', ...getNthWeekOfMonth(year, 4, 1) }, // Mayıs ayının ilk haftası
        { name: 'Vakıflar Haftası', ...getNthWeekOfMonth(year, 4, 2) }, // Mayıs ayının ikinci haftası
        { name: 'Engelliler Haftası', startDate: formatDateISO(new Date(year, 4, 10)), endDate: formatDateISO(new Date(year, 4, 16)) }, // 10-16 Mayıs
        { name: 'Müzeler Haftası', startDate: formatDateISO(new Date(year, 4, 18)), endDate: formatDateISO(new Date(year, 4, 24)) }, // 18-24 Mayıs

        // Eylül
        { name: 'İlköğretim Haftası', ...getNthWeekOfMonth(year, 8, 3) }, // Eylül ayının üçüncü haftası
        { name: 'Gaziler Günü', startDate: formatDateISO(new Date(year, 8, 19)), endDate: formatDateISO(new Date(year, 8, 19)) }, // 19 Eylül

        // Ekim
        { name: 'Hayvanları Koruma Günü', startDate: formatDateISO(new Date(year, 9, 4)), endDate: formatDateISO(new Date(year, 9, 4)) }, // 4 Ekim
        // Ahilik Kültürü Haftası (Bakanlıkça belirlenen hafta) - Programatik olarak eklenemedi.
        { name: 'Birleşmiş Milletler Günü', startDate: formatDateISO(new Date(year, 9, 24)), endDate: formatDateISO(new Date(year, 9, 24)) }, // 24 Ekim
        { name: 'Kızılay Haftası', startDate: formatDateISO(new Date(year, 9, 29)), endDate: formatDateISO(new Date(year, 10, 4)) }, // 29 Ekim-4 Kasım

        // Kasım
        { name: 'Organ Bağışı ve Nakli Haftası', startDate: formatDateISO(new Date(year, 10, 3)), endDate: formatDateISO(new Date(year, 10, 9)) }, // 3-9 Kasım
        { name: 'Lösemili Çocuklar Haftası', startDate: formatDateISO(new Date(year, 10, 2)), endDate: formatDateISO(new Date(year, 10, 8)) }, // 2-8 Kasım
        { name: 'Atatürk Haftası', startDate: formatDateISO(new Date(year, 10, 10)), endDate: formatDateISO(new Date(year, 10, 16)) }, // 10-16 Kasım
        { name: 'Afet Eğitimi Hazırlık Günü', startDate: formatDateISO(new Date(year, 10, 12)), endDate: formatDateISO(new Date(year, 10, 12)) }, // 12 Kasım
        { name: 'Dünya Diyabet Günü', startDate: formatDateISO(new Date(year, 10, 14)), endDate: formatDateISO(new Date(year, 10, 14)) }, // 14 Kasım
        { name: 'Öğretmenler Günü', startDate: formatDateISO(new Date(year, 10, 24)), endDate: formatDateISO(new Date(year, 10, 24)) }, // 24 Kasım
        { name: 'Ağız ve Diş Sağlığı Haftası', startDate: formatDateISO(new Date(year, 10, 22)), endDate: formatDateISO(new Date(year, 10, 27)) }, // 22-27 Kasım
        
        // Aralık
        { name: 'Dünya Engelliler Günü', startDate: formatDateISO(new Date(year, 11, 3)), endDate: formatDateISO(new Date(year, 11, 3)) }, // 3 Aralık
        { name: 'İnsan Hakları ve Demokrasi Haftası', startDate: formatDateISO(startOfWeek(new Date(year, 11, 10), { weekStartsOn: 1 })), endDate: formatDateISO(endOfWeek(new Date(year, 11, 10), { weekStartsOn: 1 })) }, // 10 Aralık\'ı içine alan hafta
        { name: 'Tutum, Yatırım ve Türk Malları Haftası (Yerli Malı Haftası)', startDate: formatDateISO(new Date(year, 11, 12)), endDate: formatDateISO(new Date(year, 11, 18)) }, // 12-18 Aralık
    ];

    belirliGunler.forEach(g => allEvents.push({ ...g, category: CATEGORIES.BELIRLI }));

    // Tüm olaylara yıl bilgisini ekle
    return allEvents.map(e => ({ ...e, year }));
}

module.exports = { calculateAllDates };
