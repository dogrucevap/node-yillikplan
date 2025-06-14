require('dotenv').config(); // Ortam değişkenlerini .env dosyasından yükle
const express = require('express');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, ShadingType, Borders } = require('docx');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { generateAndStoreYear } = require('./holidayCalculator/holidayManager'); // Tatil hesaplama modülü

const app = express();
const PORT = process.env.PORT || 8080; // Portu ortam değişkeninden veya varsayılan olarak 8080 al
const DB_PATH = path.join(__dirname, 'yillik_planlar.sqlite');

const TUM_ARAC_GEREC_LISTESI = [
    "Tahta", 
    "Akıllı Tahta", 
    "Projeksiyon", 
    "Bilgisayar", 
    "Ders Kitabı", 
    "Çalışma Yaprağı", 
    "Hesap Makinesi", 
    "Cetvel", 
    "Harita", 
    "Modeller"
];

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Veritabanı bağlantı hatası:", err.message);
  } else {
    console.log("SQLite veritabanına başarıyla bağlanıldı.");
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS plans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          plan_name TEXT UNIQUE NOT NULL,
          okul TEXT,
          ogretmen TEXT,
          ders TEXT,
          sinif TEXT,
          egitim_ogretim_yili TEXT,
          ders_saati TEXT,
          varsayilan_arac_gerec TEXT, -- JSON string for names
          plan_data_json TEXT, -- Tüm yillikPlan verisi (tatiller dahil, AG/YT isimleri ile)
          base_academic_plan_json TEXT, -- baseAcademicPlan verisi (AG/YT isimleri ile, DB'ye kaydedilirken ID'ye dönüşecek)
          additional_teachers_json TEXT, -- Ek öğretmenler için JSON
          plan_onay_tarihi TEXT, -- Planın onay tarihi (ilk akademik haftanın ilk günü)
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
          if (err) console.error("Plans tablosu oluşturma hatası:", err.message);
      });

      db.run("ALTER TABLE plans ADD COLUMN plan_onay_tarihi TEXT", (err) => {
        if (err && !err.message.includes("duplicate column name")) {
          console.error("Plan onay tarihi kolonu eklenirken hata:", err.message);
        } else if (!err) {
          console.log("plan_onay_tarihi kolonu plans tablosuna (mevcutsa) eklendi/güncellendi.");
        }
      });

      db.run(`CREATE TABLE IF NOT EXISTS academic_weeks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER,
        original_academic_week INTEGER,
        unite TEXT,
        konu TEXT,
        kazanim TEXT,
        ders_saati TEXT,
        olcme_degerlendirme TEXT,
        aciklama TEXT,
        arac_gerec_ids TEXT, -- JSON array of IDs from plan_standart_arac
        yontem_teknik_ids TEXT, -- JSON array of IDs from plan_standart_yontem
        FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE CASCADE
      )`, (err) => {
        if (err) console.error("Academic_weeks tablosu oluşturma hatası:", err.message);
      });

      db.run(`CREATE TABLE IF NOT EXISTS plan_standart_arac (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, (err) => {
        if (err) console.error("plan_standart_arac tablosu oluşturma hatası:", err.message);
        else {
          const stmt = db.prepare("INSERT OR IGNORE INTO plan_standart_arac (name) VALUES (?)");
          TUM_ARAC_GEREC_LISTESI.forEach(name => stmt.run(name));
          stmt.finalize();
        }
      });

      db.run(`CREATE TABLE IF NOT EXISTS plan_standart_yontem (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, (err) => {
        if (err) console.error("plan_standart_yontem tablosu oluşturma hatası:", err.message);
        else {
          const defaultYontemTeknik = [
            "Anlatım", 
            "Soru-Cevap", 
            "Problem Çözme", 
            "Gösterip Yaptırma", 
            "Grup Çalışması", 
            "Tartışma", 
            "Beyin Fırtınası", 
            "Proje Tabanlı Öğrenme", 
            "Örnek Olay İncelemesi", 
            "Deney"
          ];
          const stmt = db.prepare("INSERT OR IGNORE INTO plan_standart_yontem (name) VALUES (?)");
          defaultYontemTeknik.forEach(name => stmt.run(name));
          stmt.finalize();
        }
      });

      // plan_hafta_arac_gerec ve plan_hafta_yontem_teknik tabloları kaldırıldı.
      // Bu bilgiler artık academic_weeks tablosunda JSON olarak tutulacak.

      db.run(`CREATE TABLE IF NOT EXISTS ogretmenler (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_soyad TEXT UNIQUE NOT NULL,
        unvan TEXT NOT NULL
      )`, (err) => {
        if (err) console.error("Ogretmenler tablosu oluşturma hatası:", err.message);
        // insertDemoDataIfNeeded buradaydı, users tablosu oluşturulduktan sonra çağrılacak
      });

      db.run(`CREATE TABLE IF NOT EXISTS users (
        google_id TEXT PRIMARY KEY,
        display_name TEXT,
        email TEXT UNIQUE,
        profile_photo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error("Users tablosu oluşturma hatası:", err.message);
        else {
          // ogretmenler ve users tabloları oluşturulduktan sonra demo veriyi yükle
          insertDemoDataIfNeeded(); 
        }
      });
    });
  }
});

function insertDemoDataIfNeeded() {
  const demoDataPath = path.join(__dirname, 'demo-data.json');
  fs.readFile(demoDataPath, 'utf8', (err, jsonData) => {
    if (err) { 
      console.error("Demo veri dosyası okuma hatası:", err.message);
      return; 
    }
    try {
      const demoData = JSON.parse(jsonData);

      const insertOgretmenStmt = db.prepare("INSERT OR IGNORE INTO ogretmenler (ad_soyad, unvan) VALUES (?, ?)");
      if (demoData.ogretmen) {
        insertOgretmenStmt.run(demoData.ogretmen, "Öğretmen");
      }
      if (demoData.additionalTeachers && Array.isArray(demoData.additionalTeachers)) {
        demoData.additionalTeachers.forEach(teacher => {
          if (teacher.name && teacher.branch) {
            insertOgretmenStmt.run(teacher.name, teacher.branch);
          }
        });
      }
      insertOgretmenStmt.finalize();

      // Demo planı ve ilişkili verileri ekleme/güncelleme
      // Bu kısım /api/plans endpoint'indeki mantığa benzer şekilde güncellenmeli
      // Şimdilik, base_academic_plan_json'daki aracGerec ve yontemTeknik'in isimler olduğunu varsayıyoruz.
      // Gerçek ID tabanlı ekleme için /api/plans'taki gibi bir mantık buraya da entegre edilmeli.
      // Bu güncelleme demo-data.json'ın yapısı netleştikten sonra yapılacaktır.
      db.serialize(async () => {
        try {
            db.run("BEGIN TRANSACTION");
            
            // Önce mevcut demo planını ve ilişkili haftalarını sil
            const demoPlanRow = await new Promise((resolve, reject) => {
                db.get("SELECT id FROM plans WHERE plan_name = ?", ["demo_matematik_9"], (err, row) => err ? reject(err) : resolve(row));
            });

            if (demoPlanRow) {
                const demoPlanId = demoPlanRow.id;
                // plan_hafta_arac_gerec ve plan_hafta_yontem_teknik tabloları kaldırıldığı için bu satırlar silindi.
                await new Promise((resolve, reject) => db.run("DELETE FROM academic_weeks WHERE plan_id = ?", [demoPlanId], err => err ? reject(err) : resolve()));
                await new Promise((resolve, reject) => db.run("DELETE FROM plans WHERE id = ?", [demoPlanId], err => err ? reject(err) : resolve()));
                console.log("Mevcut demo_matematik_9 planı ve ilişkili verileri silindi.");
            }

            // Demo planını ekle
            const baseAcademicPlanForDB = demoData.haftalikPlan.map((week, index) => ({
                originalAcademicWeek: index + 1,
                unite: week.unite || '',
                konu: week.konu || '',
                kazanim: week.kazanim || '',
                dersSaati: week.dersSaati || demoData.dersSaati || '4',
                // aracGerec ve yontemTeknik isimleri burada kalacak, /api/plans gibi ID'ye dönüşecek
                aracGerec: week.aracGerec || [], 
                yontemTeknik: week.yontemTeknik || [],
                olcmeDeğerlendirme: week.olcmeDeğerlendirme || '',
                aciklama: week.aciklama || ''
            }));
            
            // plan_data_json için tam haftalık planı oluştur (tatiller dahil)
            // Bu kısım istemcideki updateAllWeekDates benzeri bir mantıkla oluşturulabilir veya demoData'dan direkt alınabilir.
            // Şimdilik demoData'daki plan_data_json'ı (varsa) veya base'i kullanıyoruz.
            // İdealde, bu da baseAcademicPlanForDB'den ve tatil mantığından üretilmeli.
            const fullYillikPlanForJson = demoData.plan_data_json || demoData.haftalikPlan.map((week, index) => ({
                ...week,
                originalAcademicWeek: index + 1,
                type: 'academic' // Tatiller ayrıca eklenecek
            }));


            const planStmt = db.prepare("INSERT INTO plans (plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, base_academic_plan_json, plan_data_json, additional_teachers_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            const newPlanId = await new Promise((resolve, reject) => {
                planStmt.run(
                    "demo_matematik_9", demoData.okul, demoData.ogretmen, demoData.ders, demoData.sinif,
                    demoData.egitimOgretimYili, demoData.dersSaati, JSON.stringify(demoData.varsayilanAracGerec || []),
                    JSON.stringify(baseAcademicPlanForDB), // AG/YT isimleri ile
                    JSON.stringify(fullYillikPlanForJson), // Bu da AG/YT isimleri ile
                    JSON.stringify(demoData.additionalTeachers || []),
                    function(err) { if (err) reject(err); else resolve(this.lastID); }
                );
                planStmt.finalize();
            });

            // academic_weeks ve ara tabloları doldur
            const getItemIds = async (itemNames, tableName) => {
                if (!itemNames || itemNames.length === 0) return [];
                const placeholders = itemNames.map(() => '?').join(',');
                const sql = `SELECT id FROM ${tableName} WHERE name IN (${placeholders})`;
                return new Promise((resolve, reject) => {
                    db.all(sql, itemNames, (err, rows) => {
                        if (err) return reject(err);
                        resolve(rows.map(row => row.id));
                    });
                });
            };

            const stmtWeek = db.prepare("INSERT INTO academic_weeks (plan_id, original_academic_week, unite, konu, kazanim, ders_saati, olcme_degerlendirme, aciklama, arac_gerec_ids, yontem_teknik_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

            for (const weekData of baseAcademicPlanForDB) {
                const aracGerecIds = weekData.aracGerec && weekData.aracGerec.length > 0 ? await getItemIds(weekData.aracGerec, 'plan_standart_arac') : [];
                const yontemTeknikIds = weekData.yontemTeknik && weekData.yontemTeknik.length > 0 ? await getItemIds(weekData.yontemTeknik, 'plan_standart_yontem') : [];

                await new Promise((resolve, reject) => {
                    stmtWeek.run(
                        newPlanId, weekData.originalAcademicWeek, weekData.unite, weekData.konu, weekData.kazanim,
                        weekData.dersSaati, weekData.olcmeDeğerlendirme, weekData.aciklama,
                        JSON.stringify(aracGerecIds), JSON.stringify(yontemTeknikIds),
                        function(err) {
                            if (err) return reject(err);
                            resolve(this.lastID);
                        }
                    );
                });
            }
            stmtWeek.finalize();

            db.run("COMMIT");
            console.log("demo_matematik_9 planı ve ilişkili verileri başarıyla eklendi/güncellendi.");
        } catch (e) {
            db.run("ROLLBACK");
            console.error("Demo plan ve ilişkili verileri eklenirken/güncellenirken hata:", e.message);
        }
      });
    } catch (parseErr) { 
      console.error("Demo veri JSON parse hatası:", parseErr.message); 
    }
  });
}

app.use(cors());
app.set('trust proxy', 1);
app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your_very_secret_key_12345', 
  resave: false,
  saveUninitialized: false, 
  cookie: { secure: process.env.NODE_ENV === 'production' } 
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, 
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, 
    callbackURL: "/auth/google/callback" 
  },
  function(accessToken, refreshToken, profile, cb) {
    const googleId = profile.id;
    const displayName = profile.displayName;
    const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
    const photoUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

    // 1. Users tablosuna ekle/güncelle
    db.run(`INSERT INTO users (google_id, display_name, email, profile_photo_url, updated_at) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(google_id) DO UPDATE SET
            display_name = excluded.display_name,
            email = excluded.email,
            profile_photo_url = excluded.profile_photo_url,
            updated_at = CURRENT_TIMESTAMP`,
      [googleId, displayName, email, photoUrl],
      function(err) {
        if (err) {
          console.error("Users tablosuna ekleme/güncelleme hatası:", err.message);
          // Hata olsa bile öğretmen ekleme adımına devam et ve profili döndür
        }
        
        // 2. Mevcut ogretmenler tablosuna ekleme mantığı (displayName varsa)
        if (displayName) {
          db.get("SELECT id FROM ogretmenler WHERE ad_soyad = ?", [displayName], (errOgretmen, rowOgretmen) => {
            if (errOgretmen) {
              console.error("Ogretmenler tablosu okuma hatası:", errOgretmen.message);
              return cb(errOgretmen, profile); // Hata varsa passport'a bildir
            }
            if (!rowOgretmen) {
              const stmtOgretmen = db.prepare("INSERT INTO ogretmenler (ad_soyad, unvan) VALUES (?, ?)");
              stmtOgretmen.run(displayName, "Öğretmen", function(insertErrOgretmen) {
                if (insertErrOgretmen) {
                  console.error("Ogretmenler tablosuna ekleme hatası:", insertErrOgretmen.message);
                  // Hata olsa bile profili döndür, kullanıcı girişi engellenmesin
                }
                stmtOgretmen.finalize();
                return cb(null, profile); // Her durumda profili döndür
              });
            } else {
              return cb(null, profile); // Öğretmen zaten var, profili döndür
            }
          });
        } else {
          // displayName yoksa öğretmen ekleme adımını atla, sadece profili döndür
          return cb(null, profile);
        }
      }
    );
  }
));

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { id: user.id, displayName: user.displayName, emails: user.emails, photos: user.photos });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] })); 

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failed.html' }), 
  function(req, res) {
    res.redirect('/');
  });

app.get('/api/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: {
        displayName: req.user.displayName,
        email: req.user.emails && req.user.emails.length > 0 ? req.user.emails[0].value : null,
        photo: req.user.photos && req.user.photos.length > 0 ? req.user.photos[0].value : null
      }
    });
  } else {
    res.json({ isAuthenticated: false });
  }
});

app.get('/auth/logout', (req, res, next) => {
  req.logout(function(err) {
    if (err) { return next(err); }
    req.session.destroy((err) => { 
        if (err) return res.status(500).send("Çıkış yapılamadı.");
        res.clearCookie('connect.sid'); 
        res.redirect('/'); 
    });
  });
});

app.get('/api/profile', ensureAuthenticated, (req, res) => {
  res.json({ message: "Bu korumalı bir rota!", user: req.user });
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ error: "Yetkisiz erişim. Lütfen giriş yapın." });
}

app.post('/api/ensure-holidays-for-year', ensureAuthenticated, async (req, res) => {
  const { academicYearStart } = req.body;
  if (!academicYearStart || isNaN(parseInt(academicYearStart, 10))) {
    return res.status(400).json({ error: "Geçerli bir başlangıç yılı (academicYearStart) gereklidir." });
  }
  const targetYear = parseInt(academicYearStart, 10);
  try {
    const success = await generateAndStoreYear(targetYear, DB_PATH);
    if (success) {
      res.status(200).json({ message: `${targetYear} yılı için tatiller başarıyla kontrol edildi/üretildi.` });
    } else {
      res.status(500).json({ error: `${targetYear} yılı için tatiller üretilirken bir sorun oluştu.` });
    }
  } catch (holidayError) {
    res.status(500).json({ error: `Tatil üretimi sırasında hata: ${holidayError.message}` });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/demo-data', async (req, res) => {
    try {
        const planRow = await new Promise((resolve, reject) => {
          db.get("SELECT * FROM plans WHERE plan_name = ?", ["demo_matematik_9"], (err, row) => {
            if (err) reject(err); else resolve(row);
          });
        });

        if (!planRow) return res.status(404).json({ error: 'Demo plan bulunamadı' });

        // base_academic_plan_json'ı DB'den gelen AG/YT isimleriyle zenginleştir
        let basePlanFromDB = JSON.parse(planRow.base_academic_plan_json || "[]");
        
        const academicWeeksData = await new Promise((resolve, reject) => {
            db.all("SELECT original_academic_week, arac_gerec_ids, yontem_teknik_ids FROM academic_weeks WHERE plan_id = ? ORDER BY original_academic_week", [planRow.id], (err, rows) => err ? reject(err) : resolve(rows));
        });

        const getItemNamesByIds = async (idsJson, tableName) => {
            if (!idsJson) return [];
            const ids = JSON.parse(idsJson);
            if (!ids || ids.length === 0) return [];
            const placeholders = ids.map(() => '?').join(',');
            const sql = `SELECT name FROM ${tableName} WHERE id IN (${placeholders})`;
            return new Promise((resolve, reject) => {
                db.all(sql, ids, (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows.map(row => row.name));
                });
            });
        };

        const enrichedBasePlan = await Promise.all(basePlanFromDB.map(async week => {
            const weekDataFromDB = academicWeeksData.find(aw => aw.original_academic_week === week.originalAcademicWeek);
            let aracGerecNames = [];
            let yontemTeknikNames = [];

            if (weekDataFromDB) {
                aracGerecNames = await getItemNamesByIds(weekDataFromDB.arac_gerec_ids, 'plan_standart_arac');
                yontemTeknikNames = await getItemNamesByIds(weekDataFromDB.yontem_teknik_ids, 'plan_standart_yontem');
            }
            
            return {
                ...week,
                aracGerec: aracGerecNames.length > 0 ? aracGerecNames : (week.aracGerec || []),
                yontemTeknik: yontemTeknikNames.length > 0 ? yontemTeknikNames : (week.yontemTeknik || []),
            };
        }));

        const demoPlanData = {
          okul: planRow.okul, ogretmen: planRow.ogretmen, ders: planRow.ders, sinif: planRow.sinif,
          egitimOgretimYili: planRow.egitim_ogretim_yili, dersSaati: planRow.ders_saati,
          varsayilanAracGerec: JSON.parse(planRow.varsayilan_arac_gerec || "[]"), // Bunlar isimler
          haftalikPlan: enrichedBasePlan, // Bu artık AG/YT isimlerini içermeli
          additional_teachers_json: JSON.parse(planRow.additional_teachers_json || "[]"),
          plan_data_json: JSON.parse(planRow.plan_data_json || "null") // Bu da AG/YT isimlerini içermeli
        };
        res.json(demoPlanData);
    } catch (error) {
        console.error("Demo veri yükleme hatası:", error.message);
        res.status(500).json({ error: 'Demo veriler yüklenirken sunucu hatası oluştu' });
    }
});

app.get('/api/plans', (req, res) => {
    db.all("SELECT id, plan_name, ders, sinif, egitim_ogretim_yili, created_at FROM plans ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Planlar listelenirken bir hata oluştu." });
        res.json(rows);
    });
});

app.get('/api/plans/:id', async (req, res) => {
    const planId = req.params.id;
    try {
        const planRow = await new Promise((resolve, reject) => {
            db.get("SELECT * FROM plans WHERE id = ?", [planId], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });

        if (!planRow) return res.status(404).json({ error: "Plan bulunamadı." });

        let baseAcademicPlanFromPlanTable = JSON.parse(planRow.base_academic_plan_json || "[]");

        const academicWeeksData = await new Promise((resolve, reject) => {
            db.all("SELECT original_academic_week, arac_gerec_ids, yontem_teknik_ids FROM academic_weeks WHERE plan_id = ? ORDER BY original_academic_week", [planId], (err, rows) => err ? reject(err) : resolve(rows));
        });
        
        const getItemNamesByIds = async (idsJson, tableName) => {
            if (!idsJson) return [];
            const ids = JSON.parse(idsJson);
            if (!ids || ids.length === 0) return [];
            const placeholders = ids.map(() => '?').join(',');
            const sql = `SELECT name FROM ${tableName} WHERE id IN (${placeholders})`;
            return new Promise((resolve, reject) => {
                db.all(sql, ids, (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows.map(row => row.name));
                });
            });
        };

        const enrichedBaseAcademicPlan = await Promise.all(baseAcademicPlanFromPlanTable.map(async week => {
            const weekDataFromDB = academicWeeksData.find(aw => aw.original_academic_week === week.originalAcademicWeek);
            let aracGerecNames = [];
            let yontemTeknikNames = [];

            if (weekDataFromDB) {
                aracGerecNames = await getItemNamesByIds(weekDataFromDB.arac_gerec_ids, 'plan_standart_arac');
                yontemTeknikNames = await getItemNamesByIds(weekDataFromDB.yontem_teknik_ids, 'plan_standart_yontem');
            }
            
            return {
                ...week,
                aracGerec: aracGerecNames.length > 0 ? aracGerecNames : (week.aracGerec || []),
                yontemTeknik: yontemTeknikNames.length > 0 ? yontemTeknikNames : (week.yontemTeknik || [])
            };
        }));
        
        const planData = {
            ...planRow,
            plan_data_json: JSON.parse(planRow.plan_data_json || "null"), 
            base_academic_plan_json: enrichedBaseAcademicPlan, 
            varsayilan_arac_gerec: JSON.parse(planRow.varsayilan_arac_gerec || "[]"), // These are names
            additional_teachers_json: JSON.parse(planRow.additional_teachers_json || "[]"),
            plan_onay_tarihi: planRow.plan_onay_tarihi
        };
        res.json(planData);

    } catch (e) {
        console.error("Plan yüklenirken hata:", e.message);
        res.status(500).json({ error: "Plan verisi okunurken bir hata oluştu." });
    }
});

app.post('/api/plans', ensureAuthenticated, async (req, res) => {
    const { plan_id, plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, plan_data_json, base_academic_plan_json, additional_teachers } = req.body;

    if (!plan_name) return res.status(400).json({ error: "Plan adı gereklidir." });
    
    const getItemIds = async (itemNames, tableName) => {
        if (!itemNames || itemNames.length === 0) return [];
        const placeholders = itemNames.map(() => '?').join(',');
        const sql = `SELECT id FROM ${tableName} WHERE name IN (${placeholders})`;
        return new Promise((resolve, reject) => {
            db.all(sql, itemNames, (err, rows) => {
                if (err) return reject(err);
                resolve(rows.map(row => row.id));
            });
        });
    };

    let planOnayTarihi = '';
    if (plan_data_json && Array.isArray(plan_data_json)) {
        const firstAcademicWeek = plan_data_json.find(w => w.type === 'academic' && w.tarih);
        if (firstAcademicWeek && typeof firstAcademicWeek.tarih === 'string') {
            planOnayTarihi = firstAcademicWeek.tarih.split(' - ')[0];
        }
    }

    const sVarsayilanAracGerec = JSON.stringify(varsayilan_arac_gerec || []); // Names
    const sPlanDataJson = JSON.stringify(plan_data_json || null); // Full plan with names for AG/YT
    
    // base_academic_plan_json for storage in 'plans' table should also contain names,
    // as the ID-based relations are stored in separate junction tables.
    const sBaseAcademicPlanJsonForPlansTable = JSON.stringify(base_academic_plan_json || null); 
    const sAdditionalTeachersJson = JSON.stringify(additional_teachers || []);

    db.serialize(async () => {
        try {
            await new Promise((resolve, reject) => db.run("BEGIN TRANSACTION", err => err ? reject(err) : resolve()));

            let currentPlanId = plan_id;

            if (currentPlanId) { // Güncelleme
                const stmt = db.prepare(`UPDATE plans SET 
                    plan_name = ?, okul = ?, ogretmen = ?, ders = ?, sinif = ?, 
                    egitim_ogretim_yili = ?, ders_saati = ?, varsayilan_arac_gerec = ?, 
                    plan_data_json = ?, base_academic_plan_json = ?, additional_teachers_json = ?,
                    plan_onay_tarihi = ?
                    WHERE id = ?`);
                await new Promise((resolve, reject) => {
                    stmt.run(
                        plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati,
                        sVarsayilanAracGerec, sPlanDataJson, sBaseAcademicPlanJsonForPlansTable, sAdditionalTeachersJson,
                        planOnayTarihi, currentPlanId,
                        function(err) {
                            if (err) return reject(err);
                            if (this.changes === 0) console.warn("Plan güncellenirken plans tablosunda değişiklik olmadı (belki bilgiler aynıydı)."); // Hata değil, uyarı
                            resolve();
                        }
                    );
                    stmt.finalize(err => { if(err) console.error("Finalize update plans error:", err.message)});
                });
                
                // Eski academic_weeks kayıtlarını sil (ilişkili ara tablolar zaten kaldırıldı)
                await new Promise((resolve, reject) => db.run("DELETE FROM academic_weeks WHERE plan_id = ?", [currentPlanId], err => err ? reject(err) : resolve()));

            } else { // Yeni plan ekleme
                const stmt = db.prepare("INSERT INTO plans (plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, plan_data_json, base_academic_plan_json, additional_teachers_json, plan_onay_tarihi) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                currentPlanId = await new Promise((resolve, reject) => {
                    stmt.run(
                        plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati,
                        sVarsayilanAracGerec, sPlanDataJson, sBaseAcademicPlanJsonForPlansTable, sAdditionalTeachersJson,
                        planOnayTarihi,
                        function(err) {
                            if (err) return reject(err);
                            resolve(this.lastID);
                        }
                    );
                    stmt.finalize(err => { if(err) console.error("Finalize insert plans error:", err.message)});
                });
            }

            if (base_academic_plan_json && Array.isArray(base_academic_plan_json)) {
                const stmtWeek = db.prepare("INSERT INTO academic_weeks (plan_id, original_academic_week, unite, konu, kazanim, ders_saati, olcme_degerlendirme, aciklama, arac_gerec_ids, yontem_teknik_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

                for (const weekData of base_academic_plan_json) {
                    const aracGerecIds = weekData.aracGerec && weekData.aracGerec.length > 0 ? await getItemIds(weekData.aracGerec, 'plan_standart_arac') : [];
                    const yontemTeknikIds = weekData.yontemTeknik && weekData.yontemTeknik.length > 0 ? await getItemIds(weekData.yontemTeknik, 'plan_standart_yontem') : [];
                    
                    await new Promise((resolve, reject) => {
                        stmtWeek.run(
                            currentPlanId, weekData.originalAcademicWeek, weekData.unite, weekData.konu, weekData.kazanim,
                            weekData.dersSaati, weekData.olcmeDeğerlendirme, weekData.aciklama,
                            JSON.stringify(aracGerecIds), JSON.stringify(yontemTeknikIds),
                            function(err) {
                                if (err) return reject(err);
                                resolve(this.lastID);
                            }
                        );
                    });
                }
                await new Promise((resolve, reject) => stmtWeek.finalize(err => err ? reject(err) : resolve()));
            }

            await new Promise((resolve, reject) => db.run("COMMIT", err => err ? reject(err) : resolve()));
            res.status(plan_id ? 200 : 201).json({ message: `"${plan_name}" başarıyla ${plan_id ? 'güncellendi' : 'kaydedildi'}.`, id: currentPlanId, plan_name: plan_name });

        } catch (err) {
            await new Promise((resolve, reject) => db.run("ROLLBACK", rbErr => {
                if (rbErr) console.error("Rollback error:", rbErr.message);
                resolve(); // Rollback hatası olsa bile orijinal hatayı döndür
            }));
            if (err.message.includes("UNIQUE constraint failed: plans.plan_name")) {
                return res.status(409).json({ error: "Bu plan adı zaten mevcut. Lütfen farklı bir ad seçin." });
            }
            console.error(`Plan ${plan_id ? 'güncelleme' : 'kaydetme'} hatası:`, err.message);
            return res.status(500).json({ error: `Plan ${plan_id ? 'güncellenirken' : 'kaydedilirken'} bir hata oluştu.` });
        }
    });
});

app.delete('/api/plans/:id', ensureAuthenticated, (req, res) => {
    const planId = req.params.id;
    // Plan silinirken ilişkili academic_weeks ve ara tablo kayıtları da CASCADE ile silinmeli.
    // Ekstra bir silme işlemi gerekmiyor.
    db.run("DELETE FROM plans WHERE id = ?", [planId], function(err) {
        if (err) return res.status(500).json({ error: "Plan silinirken bir hata oluştu." });
        if (this.changes === 0) return res.status(404).json({ error: "Silinecek plan bulunamadı." });
        res.status(200).json({ message: "Plan başarıyla silindi." });
    });
});

app.post('/api/arac-gerec-tipleri', ensureAuthenticated, (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: "Araç-gereç adı gereklidir ve geçerli bir metin olmalıdır." });
    }
    const trimmedName = name.trim();
    const stmt = db.prepare("INSERT OR IGNORE INTO plan_standart_arac (name) VALUES (?)");
    stmt.run(trimmedName, function(err) {
        if (err) {
            return res.status(500).json({ error: "Araç-gereç tipi eklenirken bir sunucu hatası oluştu." });
        }
        if (this.changes > 0) {
            db.get("SELECT id, name FROM plan_standart_arac WHERE name = ?", [trimmedName], (err, row) => {
                if (err || !row) return res.status(201).json({ message: `"${trimmedName}" başarıyla eklendi.`, name: trimmedName }); // ID olmadan dönebilir
                res.status(201).json({ message: `"${trimmedName}" başarıyla eklendi.`, id: row.id, name: row.name });
            });
        } else {
             db.get("SELECT id, name FROM plan_standart_arac WHERE name = ?", [trimmedName], (err, row) => {
                if (err || !row) return res.status(200).json({ message: `"${trimmedName}" zaten mevcut.`, name: trimmedName }); // ID olmadan dönebilir
                res.status(200).json({ message: `"${trimmedName}" zaten mevcut.`, id: row.id, name: row.name });
            });
        }
    });
    stmt.finalize();
});

app.get('/api/arac-gerec-tipleri', (req, res) => {
    db.all("SELECT id, name FROM plan_standart_arac ORDER BY name ASC", [], (err, rows) => { // ID'yi de gönder
        if (err) {
            return res.status(500).json({ error: "Araç-gereç tipleri listelenirken bir sunucu hatası oluştu." });
        }
        res.json(rows); 
    });
});

app.delete('/api/arac-gerec-tipleri/:name', ensureAuthenticated, (req, res) => {
    const nameToDelete = req.params.name;
    if (!nameToDelete) {
        return res.status(400).json({ error: "Silinecek araç-gereç adı gereklidir." });
    }
    db.run("DELETE FROM plan_standart_arac WHERE name = ?", [nameToDelete], function(err) {
        if (err) {
            return res.status(500).json({ error: "Araç-gereç tipi silinirken bir sunucu hatası oluştu." });
        }
        if (this.changes > 0) {
            res.status(200).json({ message: `"${nameToDelete}" başarıyla silindi.` });
        } else {
            res.status(404).json({ error: `"${nameToDelete}" adında bir araç-gereç bulunamadı.` });
        }
    });
});

app.get('/api/yontem-teknik-tipleri', (req, res) => {
    db.all("SELECT id, name FROM plan_standart_yontem ORDER BY name ASC", [], (err, rows) => { // ID'yi de gönder
        if (err) {
            return res.status(500).json({ error: "Yöntem/teknik tipleri listelenirken bir sunucu hatası oluştu." });
        }
        res.json(rows);
    });
});

app.post('/api/yontem-teknik-tipleri', ensureAuthenticated, (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: "Yöntem/teknik adı gereklidir." });
    }
    const trimmedName = name.trim();
    const stmt = db.prepare("INSERT OR IGNORE INTO plan_standart_yontem (name) VALUES (?)");
    stmt.run(trimmedName, function(err) {
        if (err) {
            return res.status(500).json({ error: "Yöntem/teknik tipi eklenirken bir sunucu hatası oluştu." });
        }
        if (this.changes > 0) {
            db.get("SELECT id, name FROM plan_standart_yontem WHERE name = ?", [trimmedName], (err, row) => {
                if (err || !row) return res.status(201).json({ message: `"${trimmedName}" başarıyla eklendi.`, name: trimmedName });
                res.status(201).json({ message: `"${trimmedName}" başarıyla eklendi.`, id: row.id, name: row.name });
            });
        } else {
            db.get("SELECT id, name FROM plan_standart_yontem WHERE name = ?", [trimmedName], (err, row) => {
                if (err || !row) return res.status(200).json({ message: `"${trimmedName}" zaten mevcut.`, name: trimmedName });
                res.status(200).json({ message: `"${trimmedName}" zaten mevcut.`, id: row.id, name: row.name });
            });
        }
    });
    stmt.finalize();
});

app.delete('/api/yontem-teknik-tipleri/:name', ensureAuthenticated, (req, res) => {
    const nameToDelete = req.params.name;
    if (!nameToDelete) {
        return res.status(400).json({ error: "Silinecek yöntem/teknik adı gereklidir." });
    }
    db.run("DELETE FROM plan_standart_yontem WHERE name = ?", [nameToDelete], function(err) {
        if (err) {
            return res.status(500).json({ error: "Yöntem/teknik tipi silinirken bir sunucu hatası oluştu." });
        }
        if (this.changes > 0) {
            res.status(200).json({ message: `"${nameToDelete}" başarıyla silindi.` });
        } else {
            res.status(404).json({ error: `"${nameToDelete}" adında bir yöntem/teknik bulunamadı.` });
        }
    });
});

app.get('/api/ogretmenler', (req, res) => {
    db.all("SELECT id, ad_soyad, unvan FROM ogretmenler ORDER BY ad_soyad ASC", [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Öğretmenler listelenirken bir sunucu hatası oluştu." });
        }
        res.json(rows);
    });
});

app.post('/api/ogretmenler', ensureAuthenticated, (req, res) => {
    const { ad_soyad, unvan } = req.body;
    if (!ad_soyad || typeof ad_soyad !== 'string' || ad_soyad.trim() === '' ||
        !unvan || typeof unvan !== 'string' || unvan.trim() === '') {
        return res.status(400).json({ error: "Öğretmen adı soyadı ve unvanı gereklidir." });
    }
    const trimmedAdSoyad = ad_soyad.trim();
    const trimmedUnvan = unvan.trim();

    const stmt = db.prepare("INSERT INTO ogretmenler (ad_soyad, unvan) VALUES (?, ?)");
    stmt.run(trimmedAdSoyad, trimmedUnvan, function(err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed: ogretmenler.ad_soyad")) {
                return res.status(409).json({ error: `"${trimmedAdSoyad}" adlı öğretmen zaten mevcut.` });
            }
            return res.status(500).json({ error: "Öğretmen eklenirken bir sunucu hatası oluştu." });
        }
        res.status(201).json({ message: `"${trimmedAdSoyad}" başarıyla eklendi.`, id: this.lastID, ad_soyad: trimmedAdSoyad, unvan: trimmedUnvan });
    });
    stmt.finalize();
});

app.put('/api/ogretmenler/:id', ensureAuthenticated, (req, res) => {
    const ogretmenId = req.params.id;
    const { ad_soyad, unvan } = req.body;

    if (!ogretmenId || isNaN(parseInt(ogretmenId))) {
        return res.status(400).json({ error: "Geçerli bir öğretmen ID'si gereklidir." });
    }
    if (!ad_soyad || typeof ad_soyad !== 'string' || ad_soyad.trim() === '' ||
        !unvan || typeof unvan !== 'string' || unvan.trim() === '') {
        return res.status(400).json({ error: "Öğretmen adı soyadı ve unvanı gereklidir." });
    }
    const trimmedAdSoyad = ad_soyad.trim();
    const trimmedUnvan = unvan.trim();

    const stmt = db.prepare("UPDATE ogretmenler SET ad_soyad = ?, unvan = ? WHERE id = ?");
    stmt.run(trimmedAdSoyad, trimmedUnvan, ogretmenId, function(err) {
        if (err) {
            if (err.message.includes("UNIQUE constraint failed: ogretmenler.ad_soyad")) {
                return res.status(409).json({ error: `"${trimmedAdSoyad}" adlı öğretmen zaten mevcut.` });
            }
            return res.status(500).json({ error: "Öğretmen güncellenirken bir sunucu hatası oluştu." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "Güncellenecek öğretmen bulunamadı veya bilgiler aynı." });
        }
        res.status(200).json({ message: `"${trimmedAdSoyad}" başarıyla güncellendi.`, id: ogretmenId, ad_soyad: trimmedAdSoyad, unvan: trimmedUnvan });
    });
    stmt.finalize();
});

app.delete('/api/ogretmenler/:id', ensureAuthenticated, (req, res) => {
    const ogretmenId = req.params.id;
    if (!ogretmenId || isNaN(parseInt(ogretmenId))) {
        return res.status(400).json({ error: "Geçerli bir öğretmen ID'si gereklidir." });
    }
    db.run("DELETE FROM ogretmenler WHERE id = ?", [ogretmenId], function(err) {
        if (err) {
            return res.status(500).json({ error: "Öğretmen silinirken bir sunucu hatası oluştu." });
        }
        if (this.changes > 0) {
            res.status(200).json({ message: "Öğretmen başarıyla silindi." });
        } else {
            res.status(404).json({ error: "Silinecek öğretmen bulunamadı." });
        }
    });
});


app.post('/generate-plan', ensureAuthenticated, async (req, res) => {
  try {
    const { okul, ogretmen, ders, sinif, egitimOgretimYili, dersSaati, haftalikPlan, additionalTeachers } = req.body;

    const tableHeader = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: "Hafta", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Tarih", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Saat", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Ünite Adı / Açıklama", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Konu", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Kazanımlar", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Araç-Gereçler", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Yöntem ve Teknikler", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
        ],
        tableHeader: true,
    });
    const tableRows = [tableHeader];

    haftalikPlan.forEach(haftaData => {
        if (haftaData.type === 'holiday') {
            const labelText = haftaData.tarih ? `${haftaData.label} (${haftaData.tarih})` : haftaData.label;
            tableRows.push(new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ text: labelText, alignment: AlignmentType.CENTER, style: "strong" })],
                        columnSpan: 8, 
                        shading: { type: ShadingType.SOLID, color: "D3D3D3", fill: "D3D3D3" },
                        verticalAlign: "center"
                    }),
                ],
            }));
        } else {
            const aracGerecText = Array.isArray(haftaData.aracGerec) ? haftaData.aracGerec.join(', ') : (haftaData.aracGerec || '');
            const yontemTeknikText = Array.isArray(haftaData.yontemTeknik) ? haftaData.yontemTeknik.join(', ') : (haftaData.yontemTeknik || '');

            tableRows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: String(haftaData.originalAcademicWeek || ''), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: haftaData.tarih || '', alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: String(haftaData.dersSaati || ''), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph(haftaData.unite || '')] }),
                    new TableCell({ children: [new Paragraph(haftaData.konu || '')] }),
                    new TableCell({ children: [new Paragraph(haftaData.kazanim || '')] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun(aracGerecText)] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun(yontemTeknikText)] })] }),
                ],
            }));
        }
    });

    let planOnayTarihiDoc = '';
    if (haftalikPlan && Array.isArray(haftalikPlan)) {
        const firstAcademicWeek = haftalikPlan.find(w => w.type === 'academic' && w.tarih);
        if (firstAcademicWeek && typeof firstAcademicWeek.tarih === 'string') {
            planOnayTarihiDoc = firstAcademicWeek.tarih.split(' - ')[0]; 
        }
    }

    const allSignatories = [];
    if (ogretmen) {
        allSignatories.push({ name: ogretmen, branch: "Öğretmen", isPrincipal: false });
    }

    let principalInfo = null;
    const otherTeachers = [];

    if (additionalTeachers && Array.isArray(additionalTeachers)) {
        additionalTeachers.forEach(ekOgretmen => {
            const name = ekOgretmen.name || ekOgretmen.adSoyad;
            const branch = ekOgretmen.branch || ekOgretmen.unvan;
            if (name && branch) {
                if (branch.toLowerCase() === "okul müdürü" || branch.toLowerCase() === "müdür") {
                    principalInfo = { name, branch: "Okul Müdürü", isPrincipal: true };
                } else {
                    otherTeachers.push({ name, branch, isPrincipal: false });
                }
            }
        });
    }
    
    const finalSignatoryList = [...allSignatories, ...otherTeachers];
    
    const signatureCells = finalSignatoryList.map(signatory => {
        return new TableCell({
            children: [
                new Paragraph({ children: [new TextRun({ text: signatory.name, bold: false, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: signatory.branch, bold: true, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: "\n\nİmza", size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
            ],
            verticalAlign: "center"
        });
    });

    if (principalInfo) {
        signatureCells.push(new TableCell({
            children: [
                new Paragraph({ children: [new TextRun({ text: principalInfo.name, bold: false, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: principalInfo.branch, bold: true, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: "Onay:", size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER, spacing: { before: 100 } }),
                new Paragraph({ children: [new TextRun({ text: `Tarih: ${planOnayTarihiDoc}`, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: "\n\nİmza", size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
            ],
            verticalAlign: "center"
        }));
    }
    
    const signatureTableRows = signatureCells.length > 0 ? [new TableRow({ children: signatureCells })] : [];

    const doc = new Document({
        creator: "Yillik Plan Oluşturucu",
        description: "Otomatik oluşturulmuş yıllık plan",
        styles: {
            paragraphStyles: [
                { id: "Normal", name: "Normal", run: { size: 20, font: "Times New Roman" }, paragraph: { spacing: { before: 0, after: 100 } } },
                { id: "strong", name: "Strong", basedOn: "Normal", run: { bold: true, font: "Times New Roman" } }, 
                { id: "tableHeader", name: "Table Header", basedOn: "Normal", run: { bold: true, size: 20, font: "Times New Roman" }, paragraph: { alignment: AlignmentType.CENTER } } 
            ]
        },
        sections: [{
            properties: {
                 page: { margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } },
            },
            children: [
                new Paragraph({ 
                    children: [ new TextRun({ text: `T.C. MİLLİ EĞİTİM BAKANLIĞI ${okul.toUpperCase()} ${egitimOgretimYili} EĞİTİM ÖĞRETİM YILI ${ders.toUpperCase()} ${sinif.toUpperCase()} DERSİ ÜNİTELENDİRİLMİŞ YILLIK PLANI`, bold: true, size: 24, font: "Times New Roman" })], 
                    alignment: AlignmentType.CENTER, 
                    spacing: { after: 400 } 
                }),
                new Paragraph({ text: "", spacing: { after: 200 } }),
                new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
                new Paragraph({ text: "", spacing: { after: 800 } }),
                new Table({
                    rows: signatureTableRows,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" }, insideHorizontal: { style: "none" }, insideVertical: { style: "none" } },
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeDers = ders.replace(/[^a-zA-Z0-9]/g, '_');
    const safeSinif = sinif.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `yillik_plan_${safeDers}_${safeSinif}_${Date.now()}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(buffer);

  } catch (error) {
    console.error('Hata:', error);
    res.status(500).json({ message: 'Belge oluşturulurken bir sunucu hatası oluştu.', error: error.message });
  }
});

const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = isProduction ? 'https://node-yillikplan-1074807643813.europe-west3.run.app' : `http://localhost:${PORT}`; 
console.log(`Environment: ${isProduction ? 'Cloud Run' : 'Local'}`);

app.listen(PORT, '0.0.0.0', () => { 
  console.log(`Server running on port ${PORT}`);
  console.log(`Base URL: ${baseUrl}`);
});

module.exports = app;
