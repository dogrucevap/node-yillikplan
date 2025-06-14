// holidayCalculator/database.js
const sqlite3 = require('sqlite3').verbose();

class Database {
    constructor(dbFilePath) {
        this.dbFilePath = dbFilePath;
        this.db = null; // Bağlantı initDB çağrıldığında kurulacak
    }

    // Veritabanı bağlantısını başlatır ve tabloyu oluşturur (eğer yoksa)
    async initDB() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbFilePath, (err) => {
                if (err) {
                    console.error("Veritabanı bağlantı hatası:", err.message);
                    return reject(err);
                }
                console.log(`SQLite veritabanına (${this.dbFilePath}) başarıyla bağlanıldı.`);

                const sql = `
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    year INTEGER NOT NULL,
                    category TEXT NOT NULL,
                    name TEXT NOT NULL,
                    start_date TEXT NOT NULL,
                    end_date TEXT NOT NULL,
                    UNIQUE(year, category, name, start_date, end_date)
                );`;
                this.db.run(sql, (err) => {
                    if (err) {
                        console.error("'events' tablosu oluşturulurken hata:", err.message);
                        return reject(err);
                    }
                    console.log("'events' tablosu hazır.");
                    resolve(); // user_custom_ders_saatleri tablosu kaldırıldığı için doğrudan resolve ediyoruz.
                });
            });
        });
    }

    // async addUserCustomDersSaati(userGoogleId, dersSaati) { ... } // Fonksiyon kaldırıldı
    // async getUserCustomDersSaatleri(userGoogleId) { ... } // Fonksiyon kaldırıldı

    // Belirtilen yılın veritabanında olup olmadığını kontrol eder
    async yearExists(year) {
        if (!this.db) await this.initDB(); // Bağlantı yoksa başlat
        return new Promise((resolve, reject) => {
            const sql = 'SELECT COUNT(id) as count FROM events WHERE year = ?';
            this.db.get(sql, [year], (err, row) => {
                if (err) {
                    console.error("Yıl kontrolü sırasında hata:", err.message);
                    return reject(err);
                }
                resolve(row ? row.count > 0 : false);
            });
        });
    }

    // Hesaplanan tarihleri toplu olarak veritabanına ekler
    async insertDates(dates) {
        if (!this.db) await this.initDB();
        return new Promise((resolve, reject) => {
            if (!dates || dates.length === 0) {
                console.log("Eklenecek yeni kayıt bulunamadı.");
                return resolve();
            }

            const sql = 'INSERT OR IGNORE INTO events (year, category, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)';
            const stmt = this.db.prepare(sql, (prepareErr) => {
                if (prepareErr) {
                    console.error("SQL statement hazırlama hatası:", prepareErr.message);
                    return reject(prepareErr);
                }
            });

            let insertedCount = 0;
            let firstErrorDuringInsert = null;

            this.db.run('BEGIN TRANSACTION', (beginErr) => {
                if (beginErr) {
                    console.error("BEGIN TRANSACTION sırasında hata:", beginErr.message);
                    if (stmt) stmt.finalize(); 
                    return reject(beginErr);
                }

                let pendingOperations = dates.length;

                if (pendingOperations === 0) { 
                    this.db.run('COMMIT', (commitErr) => {
                        if (stmt) stmt.finalize();
                        if (commitErr) {
                            console.error("Boş işlem için COMMIT sırasında hata:", commitErr.message);
                            return reject(commitErr);
                        }
                        resolve();
                    });
                    return;
                }

                dates.forEach(dateInfo => {
                    if (!dateInfo || typeof dateInfo.year === 'undefined' || typeof dateInfo.category === 'undefined' || 
                        typeof dateInfo.name === 'undefined' || typeof dateInfo.startDate === 'undefined' || typeof dateInfo.endDate === 'undefined') {
                        console.warn("Geçersiz dateInfo objesi atlandı:", dateInfo);
                        pendingOperations--;
                        if (pendingOperations === 0) checkCompletion.call(this); // .call(this) for context
                        return;
                    }

                    stmt.run(dateInfo.year, dateInfo.category, dateInfo.name, dateInfo.startDate, dateInfo.endDate, function(runErr) { // Use function for this.changes
                        if (runErr) {
                            console.error("Kayıt eklenirken hata:", runErr.message, dateInfo);
                            if (!firstErrorDuringInsert) {
                                firstErrorDuringInsert = runErr;
                            }
                        } else {
                            if (this.changes > 0) {
                                insertedCount++;
                            }
                        }
                        
                        pendingOperations--;
                        if (pendingOperations === 0) {
                            checkCompletion.call(this); // .call(this) for context
                        }
                    }.bind(this)); // Bind context for this.changes
                });

                function checkCompletion() { // This function is now defined within the scope that has `this.db`
                    if (stmt) { // stmt.finalize() çağrılmadan önce stmt'nin varlığını kontrol et
                        stmt.finalize((finalizeErr) => { 
                            if (finalizeErr) {
                                console.error("Statement finalize edilirken hata:", finalizeErr.message);
                                if (!firstErrorDuringInsert) firstErrorDuringInsert = finalizeErr; 
                            }

                            if (firstErrorDuringInsert) {
                                this.db.run('ROLLBACK', (rbErr) => {
                                    if (rbErr) console.error("ROLLBACK sırasında hata:", rbErr.message);
                                    reject(firstErrorDuringInsert);
                                });
                            } else {
                                this.db.run('COMMIT', (commitErr) => {
                                    if (commitErr) {
                                        console.error("COMMIT sırasında hata:", commitErr.message);
                                        this.db.run('ROLLBACK', (rbErrOnCommitFail) => { 
                                            if (rbErrOnCommitFail) console.error("COMMIT sonrası ROLLBACK hatası:", rbErrOnCommitFail.message);
                                            reject(commitErr);
                                        });
                                    } else {
                                        if (insertedCount > 0) {
                                           console.log(`${insertedCount} adet yeni kayıt başarıyla eklendi.`);
                                        } else {
                                           console.log("Tüm kayıtlar zaten mevcuttu veya hiçbir kayıt eklenmedi.");
                                        }
                                        resolve();
                                    }
                                });
                            }
                        });
                    } else { // stmt null ise (prepare hatası gibi bir durumda)
                         if (firstErrorDuringInsert) { // Eğer bir hata varsa rollback yapmayı dene
                            this.db.run('ROLLBACK', (rbErr) => {
                                if (rbErr) console.error("ROLLBACK sırasında hata (stmt null):", rbErr.message);
                                reject(firstErrorDuringInsert);
                            });
                        } else { // Hata yoksa ve stmt null ise, bu beklenmedik bir durum, ama yine de resolve et.
                            console.warn("checkCompletion çağrıldı ancak stmt null ve hata yok.");
                            resolve();
                        }
                    }
                }
            }); 
        }); 
    }

    // Belirtilen yıla ait tüm kayıtları getirir
    async getEventsByYear(year) {
        if (!this.db) await this.initDB(); 
        return new Promise((resolve, reject) => {
            const sql = 'SELECT * FROM events WHERE year = ? ORDER BY start_date';
            this.db.all(sql, [year], (err, rows) => {
                if (err) {
                    console.error("Kayıtlar getirilirken hata:", err.message);
                    return reject(err);
                }
                resolve(rows);
            });
        });
    }
    
    // Veritabanı bağlantısını kapatır
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error("Veritabanı kapatma hatası:", err.message);
                } else {
                    console.log(`Veritabanı bağlantısı (${this.dbFilePath}) kapatıldı.`);
                    this.db = null; 
                }
            });
        }
    }
}

module.exports = Database;
