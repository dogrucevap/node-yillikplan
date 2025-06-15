// holidayCalculator/database.js
// const sqlite3 = require('sqlite3').verbose(); // Kaldırıldı

class Database {
    constructor(supabaseClient) {
        // dbFilePath kaldırıldı, supabaseClient doğrudan enjekte ediliyor.
        this.supabase = supabaseClient;
        if (!this.supabase) {
            console.error("Supabase client holidayCalculator/Database sınıfına sağlanmadı!");
        }
    }

    // Supabase'de tablolar genellikle önceden oluşturulur, bu yüzden initDB'ye gerek kalmayabilir
    // veya sadece Supabase client'ının varlığını kontrol edebilir.
    async initDB() {
        if (!this.supabase) {
            return Promise.reject(new Error("Supabase client not initialized in Database class."));
        }
        // 'events' tablosunun Supabase'de var olduğunu varsayıyoruz.
        // Gerekirse burada bir kontrol eklenebilir, ama genellikle uygulama başlatılmadan önce tablo oluşturulur.
        console.log("'events' tablosu Supabase'de hazır (varsayılıyor).");
        return Promise.resolve();
    }

    // Belirtilen yılın veritabanında olup olmadığını kontrol eder
    async yearExists(year) {
        if (!this.supabase) {
            console.error("Supabase client not available in yearExists.");
            return false; // veya throw new Error(...)
        }
        try {
            const { data, error, count } = await this.supabase
                .from('events') // Supabase'deki tablonuzun adı 'events' olmalı
                .select('id', { count: 'exact', head: true }) // Sadece sayıyı almak için head:true
                .eq('year', year);

            if (error) {
                console.error("Yıl kontrolü sırasında Supabase hatası:", error.message);
                throw error;
            }
            return count > 0;
        } catch (e) {
            console.error("yearExists içinde beklenmedik hata:", e.message);
            return false; // Hata durumunda false dön
        }
    }

    // Hesaplanan tarihleri toplu olarak veritabanına ekler
    async insertDates(dates) {
        if (!this.supabase) {
            console.error("Supabase client not available in insertDates.");
            return; // veya throw new Error(...)
        }
        if (!dates || dates.length === 0) {
            console.log("Eklenecek yeni kayıt bulunamadı.");
            return;
        }

        const recordsToInsert = dates.map(dateInfo => ({
            year: dateInfo.year,
            category: dateInfo.category,
            name: dateInfo.name,
            start_date: dateInfo.startDate, // Sütun adları Supabase tablonuzla eşleşmeli
            end_date: dateInfo.endDate     // Sütun adları Supabase tablonuzla eşleşmeli
        }));

        try {
            // upsert kullanarak 'INSERT OR IGNORE' benzeri bir davranış elde edebiliriz.
            // Supabase'de UNIQUE kısıtlamanız (year, category, name, start_date, end_date) olmalı.
            // onConflict seçeneği, çakışma durumunda hangi sütunlara göre kontrol yapılacağını belirtir.
            // Eğer tüm bu sütunlar birincil anahtar veya benzersiz bir kısıtlama oluşturuyorsa,
            // ignoreDuplicates: true yeterli olabilir.
            // Daha karmaşık bir onConflict stratejisi gerekirse, bunu belirtmeniz gerekir.
            // Şimdilik, Supabase'deki 'events' tablosunda uygun bir UNIQUE kısıtlaması olduğunu varsayıyoruz.
            const { data, error, count } = await this.supabase
                .from('events')
                .insert(recordsToInsert, { 
                    // upsert: true, // Eğer kayıt varsa güncellemek isterseniz
                    // onConflict: 'year,category,name,start_date,end_date', // Benzersiz kısıtlamanızın sütunları
                    // Veya sadece ignore duplicates:
                    // Supabase V2'de insert'in kendisi ignoreDuplicates veya onConflict sağlamıyor olabilir.
                    // Bu durumda, önce var olup olmadığını kontrol etmeniz veya bir RPC fonksiyonu kullanmanız gerekebilir.
                    // Basitlik adına, şimdilik doğrudan insert deniyoruz ve RLS/Policy'lerin
                    // veya DB kısıtlamalarının duplikasyonları engelleyeceğini varsayıyoruz.
                    // Daha güvenli bir yol, her bir kaydı tek tek upsert etmek veya RPC kullanmaktır.
                    //
                    // Alternatif: upsert kullanmak (eğer tablo birincil anahtara sahipse ve çakışma bu anahtara göreyse)
                    // const { data, error } = await this.supabase
                    //    .from('events')
                    //    .upsert(recordsToInsert, { onConflict: 'year,category,name,start_date,end_date', ignoreDuplicates: false });
                    //
                    // Şimdilik basit insert:
                });


            if (error) {
                // Hata kodlarını kontrol ederek duplikasyon hatalarını ayıklayabilirsiniz (örn: 23505 for unique_violation in PostgreSQL)
                if (error.code === '23505') { // PostgreSQL unique violation
                    console.warn("Bazı kayıtlar zaten mevcut olduğu için atlandı (unique constraint).", error.message);
                    // Bu durumda kısmi başarı olarak kabul edilebilir.
                    // Kaç tanesinin eklendiğini bilmek zor olabilir bu basit yaklaşımla.
                } else {
                    console.error("Kayıtlar Supabase'e eklenirken hata:", error.message);
                    throw error;
                }
            }
            
            // `count` insert işleminde eklenen satır sayısını vermeyebilir, bu yüzden log mesajını genel tutuyoruz.
            if (data || (!error || error.code === '23505')) {
                 console.log(`Kayıtlar Supabase'e gönderildi. Bazıları zaten mevcut olabilir.`);
            }

        } catch (e) {
            console.error("insertDates içinde beklenmedik hata:", e.message);
            // Hata yönetimi
        }
    }

    // Belirtilen yıla ait tüm kayıtları getirir
    async getEventsByYear(year) {
        if (!this.supabase) {
            console.error("Supabase client not available in getEventsByYear.");
            return []; // veya throw new Error(...)
        }
        try {
            const { data, error } = await this.supabase
                .from('events')
                .select('*')
                .eq('year', year)
                .order('start_date', { ascending: true });

            if (error) {
                console.error("Kayıtlar Supabase'den getirilirken hata:", error.message);
                throw error;
            }
            return data || [];
        } catch (e) {
            console.error("getEventsByYear içinde beklenmedik hata:", e.message);
            return []; // Hata durumunda boş dizi dön
        }
    }
    
    // Supabase client için close metodu genellikle gerekmez.
    // close() {
    // }
}

module.exports = Database;
