// holidayCalculator/holidayManager.js
const Database = require('./database');
const { calculateAllDates } = require('./calculator'); // calculator.js'den doğru fonksiyonu alıyoruz

/**
 * Belirtilen yıl için resmi tatilleri ve önemli günleri hesaplar,
 * Supabase veritabanında yoksa ekler.
 * @param {number} year - Hesaplama yapılacak yıl.
 * @param {object} supabaseClient - Supabase istemci örneği.
 */
async function generateAndStoreYear(year, supabaseClient) {
    if (isNaN(year)) {
        console.error("Lütfen geçerli bir yıl girin.");
        throw new Error("Geçersiz yıl formatı.");
    }

    if (!supabaseClient) {
        console.error("Supabase client holidayManager'a sağlanmadı!");
        throw new Error("Supabase client eksik.");
    }

    const db = new Database(supabaseClient); // Supabase client ile Database sınıfını başlat

    try {
        // Supabase client'ı zaten enjekte edildiği için db.initDB() çağrısı
        // Database sınıfının constructor'ında veya diğer metotlarda ele alınabilir.
        // Database sınıfımızdaki initDB şimdilik sadece client varlığını kontrol ediyor.
        await db.initDB(); 

        const exists = await db.yearExists(year);

        if (exists) {
            console.log(`✅ ${year} yılı için tatil kayıtları Supabase veritabanında zaten mevcut.`);
        } else {
            console.log(`⏳ ${year} yılı için tatil kayıtları Supabase veritabanında bulunamadı. Hesaplama başlıyor...`);
            const allDates = calculateAllDates(year); // calculator.js'den gelen fonksiyonu kullan
            
            if (allDates && allDates.length > 0) {
                console.log(`Hesaplama tamamlandı. ${allDates.length} olay bulundu. Supabase veritabanına kaydediliyor...`);
                await db.insertDates(allDates);
                
                console.log("-----------------------------------------------------");
                console.log(`✅ ${year} yılı için oluşturulan olaylar Supabase veritabanına eklendi.`);
            } else {
                console.log(`${year} yılı için hesaplanacak olay bulunamadı.`);
            }
        }
        return true; // İşlem başarılı
    } catch (error) {
        console.error(`generateAndStoreYear (${year}) fonksiyonunda Supabase ile çalışırken hata oluştu:`, error);
        return false; // İşlem başarısız
    } 
    // finally bloğunda db.close() çağrısı Supabase client için genellikle gerekmez.
    // Bağlantı yönetimi Supabase client tarafından yapılır.
}

module.exports = { generateAndStoreYear };
