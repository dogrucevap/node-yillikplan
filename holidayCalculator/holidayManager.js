// holidayCalculator/holidayManager.js
const Database = require('./database');
const { calculateAllDates } = require('./calculator');

/**
 * Belirtilen yıl için resmi tatilleri ve önemli günleri hesaplar,
 * veritabanında yoksa ekler.
 * @param {number} year - Hesaplama yapılacak yıl.
 * @param {string} dbFilePath - SQLite veritabanı dosyasının yolu.
 */
async function generateAndStoreYear(year, dbFilePath) {
    if (isNaN(year)) {
        console.error("Lütfen geçerli bir yıl girin.");
        // Hata fırlatmak veya bir hata nesnesi döndürmek daha iyi olabilir
        // Böylece çağıran fonksiyon hatayı yönetebilir.
        throw new Error("Geçersiz yıl formatı.");
    }

    const db = new Database(dbFilePath);

    try {
        await db.initDB(); // Veritabanı bağlantısını başlat ve tabloyu hazırla

        const exists = await db.yearExists(year);

        if (exists) {
            console.log(`✅ ${year} yılı için tatil kayıtları '${dbFilePath}' veritabanında zaten mevcut.`);
            // İsteğe bağlı olarak mevcut kayıtları getirebilir ve gösterebilirsiniz.
            // const events = await db.getEventsByYear(year);
            // console.table(events);
        } else {
            console.log(`⏳ ${year} yılı için tatil kayıtları '${dbFilePath}' veritabanında bulunamadı. Hesaplama başlıyor...`);
            const allDates = calculateAllDates(year);
            
            if (allDates && allDates.length > 0) {
                console.log(`Hesaplama tamamlandı. ${allDates.length} olay bulundu. Veritabanına kaydediliyor...`);
                await db.insertDates(allDates);
                
                console.log("-----------------------------------------------------");
                console.log(`✅ ${year} yılı için oluşturulan olaylar '${dbFilePath}' veritabanına eklendi.`);
                // İsteğe bağlı olarak yeni eklenen kayıtları getirebilir ve gösterebilirsiniz.
                // const events = await db.getEventsByYear(year);
                // console.table(events);
            } else {
                console.log(`${year} yılı için hesaplanacak olay bulunamadı.`);
            }
        }
        return true; // İşlem başarılı
    } catch (error) {
        console.error(`generateAndStoreYear (${year}, ${dbFilePath}) fonksiyonunda beklenmedik bir hata oluştu:`, error);
        // Hata durumunda false döndür veya hatayı yeniden fırlat
        return false; // İşlem başarısız
    } finally {
        db.close(); // Her durumda veritabanı bağlantısını kapat
    }
}

module.exports = { generateAndStoreYear };
