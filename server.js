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

const app = express();
const PORT = process.env.PORT || 8080; // Portu ortam değişkeninden veya varsayılan olarak 8080 al
const DB_PATH = path.join(__dirname, 'yillik_planlar.sqlite');

const TUM_ARAC_GEREC_LISTESI = [
    "Tahta", "Projeksiyon", "Hesap Makinesi", "Bilgisayar", "Akıllı Tahta"
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
          varsayilan_arac_gerec TEXT, -- JSON string
          plan_data_json TEXT, -- Tüm yillikPlan verisi (tatiller dahil)
          base_academic_plan_json TEXT, -- baseAcademicPlan verisi
          additional_teachers_json TEXT, -- Ek öğretmenler için JSON
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
          if (err) console.error("Plans tablosu oluşturma hatası:", err.message);
      });

      db.run(`CREATE TABLE IF NOT EXISTS academic_weeks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER,
        original_academic_week INTEGER,
        unite TEXT,
        konu TEXT,
        kazanim TEXT,
        ders_saati TEXT,
        yontem_teknik TEXT,
        olcme_degerlendirme TEXT,
        aciklama TEXT,
        FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE CASCADE
      )`, (err) => {
        if (err) console.error("Academic_weeks tablosu oluşturma hatası:", err.message);
      });

      db.run(`CREATE TABLE IF NOT EXISTS arac_gerec_tipleri (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, (err) => {
        if (err) console.error("arac_gerec_tipleri tablosu oluşturma hatası:", err.message);
        else {
          const stmt = db.prepare("INSERT OR IGNORE INTO arac_gerec_tipleri (name) VALUES (?)");
          TUM_ARAC_GEREC_LISTESI.forEach(name => stmt.run(name));
          stmt.finalize();
        }
      });

      db.run(`CREATE TABLE IF NOT EXISTS yontem_teknik_tipleri (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL)`, (err) => {
        if (err) console.error("yontem_teknik_tipleri tablosu oluşturma hatası:", err.message);
        else {
          const defaultYontemTeknik = ["Anlatım", "Soru-Cevap", "Problem Çözme", "Gösterip Yaptırma", "Grup Çalışması", "Proje", "Beyin Fırtınası", "Tartışma", "Örnek Olay", "Oyun", "Drama", "Deney"];
          const stmt = db.prepare("INSERT OR IGNORE INTO yontem_teknik_tipleri (name) VALUES (?)");
          defaultYontemTeknik.forEach(name => stmt.run(name));
          stmt.finalize();
        }
      });

      db.run(`CREATE TABLE IF NOT EXISTS plan_hafta_arac_gerec (
        academic_week_id INTEGER, arac_gerec_tip_id INTEGER,
        PRIMARY KEY (academic_week_id, arac_gerec_tip_id),
        FOREIGN KEY (academic_week_id) REFERENCES academic_weeks (id) ON DELETE CASCADE,
        FOREIGN KEY (arac_gerec_tip_id) REFERENCES arac_gerec_tipleri (id) ON DELETE CASCADE
      )`, (err) => {
        if (err) console.error("plan_hafta_arac_gerec tablosu oluşturma hatası:", err.message);
      });

      db.run(`CREATE TABLE IF NOT EXISTS ogretmenler (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ad_soyad TEXT UNIQUE NOT NULL,
        unvan TEXT NOT NULL
      )`, (err) => {
        if (err) console.error("Ogretmenler tablosu oluşturma hatası:", err.message);
        else {
          insertDemoDataIfNeeded();
        }
      });
    });
  }
});

function insertDemoDataIfNeeded() {
  const demoDataPath = path.join(__dirname, 'demo-data.json');
  fs.readFile(demoDataPath, 'utf8', (err, jsonData) => {
    if (err) { return; }
    try {
      const demoData = JSON.parse(jsonData);
      const insertOgretmenStmt = db.prepare("INSERT OR IGNORE INTO ogretmenler (ad_soyad, unvan) VALUES (?, ?)");
      if (demoData.ogretmen) {
        insertOgretmenStmt.run(demoData.ogretmen, "Öğretmen");
      }
      insertOgretmenStmt.finalize((err) => {
        if (err) console.error("Demo öğretmenleri ekleme hatası (finalize):", err.message);
      });

      db.get("SELECT id FROM plans WHERE plan_name = ?", ["demo_matematik_9"], (err, row) => {
        if (err) {
            console.error("Demo plan kontrol hatası:", err.message);
            return;
        }
        if (row) return; 

        db.serialize(() => {
            const demoBaseAcademicPlan = demoData.haftalikPlan.map((week, index) => ({
                originalAcademicWeek: index + 1, unite: week.unite || '', konu: week.konu || '', kazanim: week.kazanim || '',
                dersSaati: week.dersSaati || demoData.dersSaati || '4', aracGerec: week.aracGerec || [],
                yontemTeknik: week.yontemTeknik || [], olcmeDeğerlendirme: week.olcmeDeğerlendirme || '', aciklama: week.aciklama || ''
            }));
            const demoFullYillikPlan = [];
            let demoAcademicPlanIndex = 0;
            const TATIL_DONEMLERI_SERVER = { 
                ARA_TATIL_1: { duration: 1, afterAcademicWeek: 9, label: "1. Ara Tatil" },
                YARIYIL_TATILI: { duration: 2, afterAcademicWeek: 18, label: "Yarıyıl Tatili" },
                ARA_TATIL_2: { duration: 1, afterAcademicWeek: 27, label: "2. Ara Tatil" }
            };
            while(demoAcademicPlanIndex < demoBaseAcademicPlan.length) {
                for (const holidayKey in TATIL_DONEMLERI_SERVER) {
                    if (TATIL_DONEMLERI_SERVER[holidayKey].afterAcademicWeek === demoAcademicPlanIndex) {
                 const holiday = TATIL_DONEMLERI_SERVER[holidayKey];
                 demoFullYillikPlan.push({ type: 'holiday', label: holiday.label, duration: holiday.duration, tarih: `(${holiday.duration} Hafta)` });
                 break; 
            }
        }
        const academicWeekData = demoBaseAcademicPlan[demoAcademicPlanIndex];
        demoFullYillikPlan.push({ ...academicWeekData, type: 'academic', tarih: '' }); 
        demoAcademicPlanIndex++;
    }
    for (const holidayKey in TATIL_DONEMLERI_SERVER) {
        if (TATIL_DONEMLERI_SERVER[holidayKey].afterAcademicWeek === demoBaseAcademicPlan.length) {
             const holiday = TATIL_DONEMLERI_SERVER[holidayKey];
             demoFullYillikPlan.push({ type: 'holiday', label: holiday.label, duration: holiday.duration, tarih: `(${holiday.duration} Hafta)` });
             break;
        }
    }
    const stmtPlan = db.prepare("INSERT INTO plans (plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, base_academic_plan_json, plan_data_json, additional_teachers_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            stmtPlan.run("demo_matematik_9", demoData.okul, demoData.ogretmen, demoData.ders, demoData.sinif,
              demoData.egitimOgretimYili, demoData.dersSaati,
              JSON.stringify(demoData.varsayilanAracGerec),
              JSON.stringify(demoBaseAcademicPlan),
              JSON.stringify(demoFullYillikPlan), 
              JSON.stringify(demoData.additionalTeachers || [])); 
            stmtPlan.finalize();
        });
      });
    } catch (parseErr) { console.error("Demo veri JSON parse hatası:", parseErr); }
  });
}

app.use(cors());
app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Session ve Passport Başlangıcı
app.use(session({
  secret: process.env.SESSION_SECRET || 'your_very_secret_key_12345', 
  resave: false,
  saveUninitialized: false, 
  cookie: { secure: process.env.NODE_ENV === 'production' } 
}));

app.use(passport.initialize());
app.use(passport.session());

// Google OAuth 2.0 Stratejisi
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID, 
    clientSecret: process.env.GOOGLE_CLIENT_SECRET, 
    callbackURL: "/auth/google/callback" 
  },
  function(accessToken, refreshToken, profile, cb) {
    const userName = profile.displayName;
    if (userName) {
      db.get("SELECT id, ad_soyad, unvan FROM ogretmenler WHERE ad_soyad = ?", [userName], (err, row) => {
        if (err) {
          console.error("Google Auth - Öğretmen kontrol hatası:", err.message);
          return cb(err, profile); 
        }
        if (!row) {
          const stmt = db.prepare("INSERT INTO ogretmenler (ad_soyad, unvan) VALUES (?, ?)");
          stmt.run(userName, "Öğretmen", function(insertErr) {
            if (insertErr) {
              console.error("Google Auth - Yeni öğretmen ekleme hatası:", insertErr.message);
              return cb(null, profile);
            } else {
              console.log(`Google Auth ile yeni öğretmen eklendi: ${userName}, ID: ${this.lastID}`);
              return cb(null, profile);
            }
          });
          stmt.finalize(); 
        } else {
          console.log(`Google Auth - Öğretmen zaten mevcut: ${userName}`);
          return cb(null, profile); 
        }
      });
    } else {
      console.warn("Google Auth - Profilde displayName bulunamadı.");
      return cb(null, profile); 
    }
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

// Statik dosyalar ve ana rota (Passport başlatıldıktan SONRA olmalı)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

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
        if (err) {
            console.error("Oturum sonlandırma hatası:", err);
            return res.status(500).send("Çıkış yapılamadı.");
        }
        res.clearCookie('connect.sid'); 
        res.redirect('/'); 
    });
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Yetkisiz erişim. Lütfen giriş yapın." });
}

// API Rotaları (ensureAuthenticated ile korunabilir)
app.get('/api/profile', ensureAuthenticated, (req, res) => {
  res.json({ message: "Bu korumalı bir rota!", user: req.user });
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
        const basePlan = JSON.parse(planRow.base_academic_plan_json || "[]");
        const demoPlanData = {
          okul: planRow.okul, ogretmen: planRow.ogretmen, ders: planRow.ders, sinif: planRow.sinif,
          egitimOgretimYili: planRow.egitim_ogretim_yili, dersSaati: planRow.ders_saati,
          varsayilanAracGerec: JSON.parse(planRow.varsayilan_arac_gerec || "[]"), haftalikPlan: basePlan
        };
        res.json(demoPlanData);
    } catch (error) {
        res.status(500).json({ error: 'Demo veriler yüklenirken sunucu hatası oluştu' });
    }
});

app.get('/api/plans', (req, res) => {
    db.all("SELECT id, plan_name, ders, sinif, egitim_ogretim_yili, created_at FROM plans ORDER BY created_at DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Planlar listelenirken bir hata oluştu." });
        res.json(rows);
    });
});

app.get('/api/plans/:id', (req, res) => {
    const planId = req.params.id;
    db.get("SELECT * FROM plans WHERE id = ?", [planId], (err, row) => {
        if (err) return res.status(500).json({ error: "Plan yüklenirken bir hata oluştu." });
        if (!row) return res.status(404).json({ error: "Plan bulunamadı." });
        try {
            const planData = {
                ...row,
                plan_data_json: JSON.parse(row.plan_data_json || "null"),
                base_academic_plan_json: JSON.parse(row.base_academic_plan_json || "null"),
                varsayilan_arac_gerec: JSON.parse(row.varsayilan_arac_gerec || "[]"),
                additional_teachers_json: JSON.parse(row.additional_teachers_json || "[]")
            };
            res.json(planData);
        } catch(e) {
            res.status(500).json({ error: "Plan verisi okunurken bir hata oluştu." });
        }
    });
});

app.post('/api/plans', (req, res) => {
    const { plan_id, plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, plan_data_json, base_academic_plan_json, additional_teachers } = req.body;
    if (!plan_name) return res.status(400).json({ error: "Plan adı gereklidir." });
    const sVarsayilanAracGerec = JSON.stringify(varsayilan_arac_gerec || []);
    const sPlanDataJson = JSON.stringify(plan_data_json || null);
    const sBaseAcademicPlanJson = JSON.stringify(base_academic_plan_json || null);
    const sAdditionalTeachersJson = JSON.stringify(additional_teachers || []);
    if (plan_id) {
        const stmt = db.prepare(`UPDATE plans SET 
            plan_name = ?, okul = ?, ogretmen = ?, ders = ?, sinif = ?, 
            egitim_ogretim_yili = ?, ders_saati = ?, varsayilan_arac_gerec = ?, 
            plan_data_json = ?, base_academic_plan_json = ?, additional_teachers_json = ?
            WHERE id = ?`);
        stmt.run(
            plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati,
            sVarsayilanAracGerec, sPlanDataJson, sBaseAcademicPlanJson, sAdditionalTeachersJson,
            plan_id,
            function(err) {
                if (err) {
                    if (err.message.includes("UNIQUE constraint failed: plans.plan_name")) {
                        return res.status(409).json({ error: "Bu plan adı zaten mevcut. Lütfen farklı bir ad seçin." });
                    }
                    console.error("Plan güncelleme hatası:", err.message);
                    return res.status(500).json({ error: "Plan güncellenirken bir hata oluştu." });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ error: "Güncellenecek plan bulunamadı veya bilgiler aynı." });
                }
                res.status(200).json({ message: `"${plan_name}" başarıyla güncellendi.`, id: plan_id, plan_name: plan_name });
            }
        );
        stmt.finalize();
    } else {
        const stmt = db.prepare("INSERT INTO plans (plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, plan_data_json, base_academic_plan_json, additional_teachers_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run(
            plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati,
            sVarsayilanAracGerec, sPlanDataJson, sBaseAcademicPlanJson, sAdditionalTeachersJson,
            function(err) {
                if (err) {
                    if (err.message.includes("UNIQUE constraint failed: plans.plan_name")) {
                        return res.status(409).json({ error: "Bu plan adı zaten mevcut. Lütfen farklı bir ad seçin." });
                    }
                    console.error("Plan kaydetme hatası:", err.message);
                    return res.status(500).json({ error: "Plan kaydedilirken bir hata oluştu." });
                }
                res.status(201).json({ message: `"${plan_name}" başarıyla kaydedildi.`, id: this.lastID, plan_name: plan_name });
            }
        );
        stmt.finalize();
    }
});

app.delete('/api/plans/:id', (req, res) => {
    const planId = req.params.id;
    db.run("DELETE FROM plans WHERE id = ?", [planId], function(err) {
        if (err) return res.status(500).json({ error: "Plan silinirken bir hata oluştu." });
        if (this.changes === 0) return res.status(404).json({ error: "Silinecek plan bulunamadı." });
        res.status(200).json({ message: "Plan başarıyla silindi." });
    });
});

app.post('/api/arac-gerec-tipleri', (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: "Araç-gereç adı gereklidir ve geçerli bir metin olmalıdır." });
    }
    const trimmedName = name.trim();
    const stmt = db.prepare("INSERT OR IGNORE INTO arac_gerec_tipleri (name) VALUES (?)");
    stmt.run(trimmedName, function(err) {
        if (err) {
            console.error("Yeni araç-gereç tipi ekleme hatası:", err.message);
            return res.status(500).json({ error: "Araç-gereç tipi eklenirken bir sunucu hatası oluştu." });
        }
        if (this.changes > 0) {
            db.get("SELECT id, name FROM arac_gerec_tipleri WHERE name = ?", [trimmedName], (err, row) => {
                if (err || !row) return res.status(201).json({ message: `"${trimmedName}" başarıyla eklendi.`, name: trimmedName });
                res.status(201).json({ message: `"${trimmedName}" başarıyla eklendi.`, id: row.id, name: row.name });
            });
        } else {
             db.get("SELECT id, name FROM arac_gerec_tipleri WHERE name = ?", [trimmedName], (err, row) => {
                if (err || !row) return res.status(200).json({ message: `"${trimmedName}" zaten mevcut.`, name: trimmedName });
                res.status(200).json({ message: `"${trimmedName}" zaten mevcut.`, id: row.id, name: row.name });
            });
        }
    });
    stmt.finalize();
});

app.get('/api/arac-gerec-tipleri', (req, res) => {
    db.all("SELECT name FROM arac_gerec_tipleri ORDER BY name ASC", [], (err, rows) => {
        if (err) {
            console.error("Araç-gereç tipleri listeleme hatası:", err.message);
            return res.status(500).json({ error: "Araç-gereç tipleri listelenirken bir sunucu hatası oluştu." });
        }
        res.json(rows.map(row => row.name)); 
    });
});

app.delete('/api/arac-gerec-tipleri/:name', (req, res) => {
    const nameToDelete = req.params.name;
    if (!nameToDelete) {
        return res.status(400).json({ error: "Silinecek araç-gereç adı gereklidir." });
    }
    db.run("DELETE FROM arac_gerec_tipleri WHERE name = ?", [nameToDelete], function(err) {
        if (err) {
            console.error("Araç-gereç tipi silme hatası:", err.message);
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
    db.all("SELECT name FROM yontem_teknik_tipleri ORDER BY name ASC", [], (err, rows) => {
        if (err) {
            console.error("Yöntem/teknik tipleri listeleme hatası:", err.message);
            return res.status(500).json({ error: "Yöntem/teknik tipleri listelenirken bir sunucu hatası oluştu." });
        }
        res.json(rows.map(row => row.name));
    });
});

app.post('/api/yontem-teknik-tipleri', (req, res) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: "Yöntem/teknik adı gereklidir." });
    }
    const trimmedName = name.trim();
    const stmt = db.prepare("INSERT OR IGNORE INTO yontem_teknik_tipleri (name) VALUES (?)");
    stmt.run(trimmedName, function(err) {
        if (err) {
            console.error("Yeni yöntem/teknik tipi ekleme hatası:", err.message);
            return res.status(500).json({ error: "Yöntem/teknik tipi eklenirken bir sunucu hatası oluştu." });
        }
        res.status(201).json({ message: `"${trimmedName}" başarıyla eklendi.` });
    });
    stmt.finalize();
});

app.delete('/api/yontem-teknik-tipleri/:name', (req, res) => {
    const nameToDelete = req.params.name;
    if (!nameToDelete) {
        return res.status(400).json({ error: "Silinecek yöntem/teknik adı gereklidir." });
    }
    db.run("DELETE FROM yontem_teknik_tipleri WHERE name = ?", [nameToDelete], function(err) {
        if (err) {
            console.error("Yöntem/teknik tipi silme hatası:", err.message);
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
            console.error("Öğretmenler listelenirken hata:", err.message);
            return res.status(500).json({ error: "Öğretmenler listelenirken bir sunucu hatası oluştu." });
        }
        res.json(rows);
    });
});

app.post('/api/ogretmenler', (req, res) => {
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
            console.error("Yeni öğretmen ekleme hatası:", err.message);
            return res.status(500).json({ error: "Öğretmen eklenirken bir sunucu hatası oluştu." });
        }
        res.status(201).json({ message: `"${trimmedAdSoyad}" başarıyla eklendi.`, id: this.lastID, ad_soyad: trimmedAdSoyad, unvan: trimmedUnvan });
    });
    stmt.finalize();
});

app.delete('/api/ogretmenler/:id', (req, res) => {
    const ogretmenId = req.params.id;
    if (!ogretmenId || isNaN(parseInt(ogretmenId))) {
        return res.status(400).json({ error: "Geçerli bir öğretmen ID'si gereklidir." });
    }
    db.run("DELETE FROM ogretmenler WHERE id = ?", [ogretmenId], function(err) {
        if (err) {
            console.error("Öğretmen silme hatası:", err.message);
            return res.status(500).json({ error: "Öğretmen silinirken bir sunucu hatası oluştu." });
        }
        if (this.changes > 0) {
            res.status(200).json({ message: "Öğretmen başarıyla silindi." });
        } else {
            res.status(404).json({ error: "Silinecek öğretmen bulunamadı." });
        }
    });
});

app.post('/generate-plan', async (req, res) => {
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
    const signatureCells = [];
    signatureCells.push(new TableCell({
        children: [
            new Paragraph({ children: [new TextRun({ text: ogretmen, bold: false, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }), 
            new Paragraph({ children: [new TextRun({ text: "Öğretmen", bold: true, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }), 
            new Paragraph({ children: [new TextRun({ text: "\n\nİmza", size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }), 
        ],
    }));
    if (additionalTeachers && Array.isArray(additionalTeachers)) {
        additionalTeachers.forEach(ekOgretmen => {
            if (ekOgretmen.adSoyad && ekOgretmen.unvan) {
                signatureCells.push(new TableCell({
                    children: [
                        new Paragraph({ children: [new TextRun({ text: ekOgretmen.adSoyad, bold: false, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                        new Paragraph({ children: [new TextRun({ text: ekOgretmen.unvan, bold: true, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                        new Paragraph({ children: [new TextRun({ text: "\n\nİmza", size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                    ],
                }));
            }
        });
    }
    const signatureRows = [];
    const cellsPerRow = 3; 
    for (let i = 0; i < signatureCells.length; i += cellsPerRow) {
        signatureRows.push(new TableRow({ children: signatureCells.slice(i, i + cellsPerRow) }));
    }
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
                 page: {
                    margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 }, 
                },
            },
            children: [
                new Paragraph({ 
                    children: [
                        new TextRun({ 
                            text: `T.C. MİLLİ EĞİTİM BAKANLIĞI ${okul.toUpperCase()} ${egitimOgretimYili} EĞİTİM ÖĞRETİM YILI ${ders.toUpperCase()} ${sinif.toUpperCase()} DERSİ ÜNİTELENDİRİLMİŞ YILLIK PLANI`, 
                            bold: true, 
                            size: 24, 
                            font: "Times New Roman" 
                        })
                    ], 
                    alignment: AlignmentType.CENTER, 
                    spacing: { after: 400 } 
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "OKULU", style: "strong" })], width: { size: 20, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [new Paragraph(okul || '')], width: { size: 80, type: WidthType.PERCENTAGE } }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "DERSİ", style: "strong" })] }),
                                new TableCell({ children: [new Paragraph(ders || '')] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "SINIFI", style: "strong" })] }),
                                new TableCell({ children: [new Paragraph(sinif || '')] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "ÖĞRETMENİN ADI SOYADI", style: "strong" })] }),
                                new TableCell({ children: [new Paragraph(ogretmen || '')] }),
                            ],
                        }),
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "EĞİTİM ÖĞRETİM YILI", style: "strong" })] }),
                                new TableCell({ children: [new Paragraph(egitimOgretimYili || '')] }),
                            ],
                        }),
                         new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "HAFTALIK DERS SAATİ", style: "strong" })] }),
                                new TableCell({ children: [new Paragraph(String(dersSaati || ''))] }),
                            ],
                        }),
                    ],
                    columnWidths: [2500, 7500], 
                }),
                new Paragraph({ text: "", spacing: { after: 200 } }),
                new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
                new Paragraph({ text: "", spacing: { after: 800 } }),
                new Table({
                    rows: signatureRows,
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
