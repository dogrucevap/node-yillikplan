const express = require('express');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, ShadingType, Borders } = require('docx');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'yillik_planlar.sqlite');

const TUM_ARAC_GEREC_LISTESI = [
    "Tahta", "Projeksiyon", "Hesap Makinesi", "Bilgisayar", "Akıllı Tahta",
    "Grafik Tablet", "Cetvel Seti", "Pergel", "Gönye", "Çalışma Yaprağı",
    "Model", "Poster", "Video", "Animasyon", "Oyun", "Deney Seti",
    "Venn Şemaları", "Grafik Kağıdı", "Sayı Doğrusu", "Kesir Modelleri", "Cetvel",
    "Nesneler", "Zar", "Para", "Kart Destesi", "Grafik Programı", "Cebirsel İfadeler"
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

      // Diğer tablolar... (değişiklik yok)
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

      db.run(`CREATE TABLE IF NOT EXISTS plan_hafta_arac_gerec (
        academic_week_id INTEGER, arac_gerec_tip_id INTEGER,
        PRIMARY KEY (academic_week_id, arac_gerec_tip_id),
        FOREIGN KEY (academic_week_id) REFERENCES academic_weeks (id) ON DELETE CASCADE,
        FOREIGN KEY (arac_gerec_tip_id) REFERENCES arac_gerec_tipleri (id) ON DELETE CASCADE
      )`, (err) => {
        if (err) console.error("plan_hafta_arac_gerec tablosu oluşturma hatası:", err.message);
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
      db.get("SELECT id FROM plans WHERE plan_name = ?", ["demo_matematik_9"], (err, row) => {
        if (err || row) return;
        db.serialize(() => {
            const demoBaseAcademicPlan = demoData.haftalikPlan.map((week, index) => ({
                originalAcademicWeek: index + 1, unite: week.unite || '', konu: week.konu || '', kazanim: week.kazanim || '',
                dersSaati: week.dersSaati || demoData.dersSaati || '4', aracGerec: week.aracGerec || [],
                yontemTeknik: week.yontemTeknik || [], olcmeDeğerlendirme: week.olcmeDeğerlendirme || '', aciklama: week.aciklama || ''
            }));
            const stmtPlan = db.prepare("INSERT INTO plans (plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, base_academic_plan_json, additional_teachers_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            stmtPlan.run("demo_matematik_9", demoData.okul, demoData.ogretmen, demoData.ders, demoData.sinif,
              demoData.egitimOgretimYili, demoData.dersSaati, JSON.stringify(demoData.varsayilanAracGerec), JSON.stringify(demoBaseAcademicPlan), JSON.stringify([]));
            stmtPlan.finalize();
        });
      });
    } catch (parseErr) { console.error("Demo veri JSON parse hatası:", parseErr); }
  });
}

app.use(cors());
app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/demo-data', async (req, res) => {
    // Bu endpoint'te değişiklik yok
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
    const { plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, plan_data_json, base_academic_plan_json, additional_teachers } = req.body;
    if (!plan_name) return res.status(400).json({ error: "Plan adı gereklidir." });

    const stmt = db.prepare("INSERT INTO plans (plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, plan_data_json, base_academic_plan_json, additional_teachers_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    stmt.run( plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, JSON.stringify(varsayilan_arac_gerec || []),
        JSON.stringify(plan_data_json || null), JSON.stringify(base_academic_plan_json || null), JSON.stringify(additional_teachers || []),
        function(err) {
            if (err) {
                if (err.message.includes("UNIQUE constraint failed: plans.plan_name")) {
                    return res.status(409).json({ error: "Bu plan adı zaten mevcut. Lütfen farklı bir ad seçin." });
                }
                return res.status(500).json({ error: "Plan kaydedilirken bir hata oluştu." });
            }
            res.status(201).json({ message: "Plan başarıyla kaydedildi.", id: this.lastID, plan_name: plan_name });
        }
    );
    stmt.finalize();
});

app.delete('/api/plans/:id', (req, res) => {
    const planId = req.params.id;
    db.run("DELETE FROM plans WHERE id = ?", [planId], function(err) {
        if (err) return res.status(500).json({ error: "Plan silinirken bir hata oluştu." });
        if (this.changes === 0) return res.status(404).json({ error: "Silinecek plan bulunamadı." });
        res.status(200).json({ message: "Plan başarıyla silindi." });
    });
});

app.post('/generate-plan', async (req, res) => {
  try {
    const { okul, ogretmen, ders, sinif, egitimOgretimYili, dersSaati, haftalikPlan, additionalTeachers } = req.body;

    const tableHeader = new TableRow({ /* ... (header içeriği aynı) ... */ });
    const tableRows = [tableHeader];

    haftalikPlan.forEach(haftaData => {
        // ... (haftalık plan satırlarını oluşturma mantığı aynı)
    });

    // --- İMZA ALANI OLUŞTURMA (DÖNGÜNÜN DIŞINDA) ---
    const signatureCells = [];
    signatureCells.push(new TableCell({
        children: [
            new Paragraph({ children: [new TextRun({ text: ogretmen, bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
            new Paragraph({ children: [new TextRun({ text: "Öğretmen", size: 20 })], alignment: AlignmentType.CENTER }),
            new Paragraph({ text: "\n\nİmza", alignment: AlignmentType.CENTER }),
        ],
    }));

    if (additionalTeachers && Array.isArray(additionalTeachers)) {
        additionalTeachers.forEach(teacher => {
            signatureCells.push(new TableCell({
                children: [
                    new Paragraph({ children: [new TextRun({ text: teacher.name, bold: true, size: 22 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ children: [new TextRun({ text: teacher.branch, size: 20 })], alignment: AlignmentType.CENTER }),
                    new Paragraph({ text: "\n\nİmza", alignment: AlignmentType.CENTER }),
                ],
            }));
        });
    }
    const signatureRows = [];
    for (let i = 0; i < signatureCells.length; i += 3) { // Her satırda 3 imza alanı olacak
        signatureRows.push(new TableRow({ children: signatureCells.slice(i, i + 3) }));
    }
    // --- BİTTİ: İMZA ALANI OLUŞTURMA ---

    const doc = new Document({
        creator: "Yillik Plan Oluşturucu",
        description: "Otomatik oluşturulmuş yıllık plan",
        styles: { /* ... (stiller aynı) ... */ },
        sections: [{
            properties: {},
            children: [
                new Paragraph({ children: [new TextRun({ text: "T.C. MİLLÎ EĞİTİM BAKANLIĞI", bold: true, size: 24 })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: "ÜNİTELENDİRİLMİŞ YILLIK PLAN", bold: true, size: 20 })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
                new Table({ /* ... (üst bilgi tablosu aynı) ... */ }),
                new Paragraph({ text: "", spacing: { after: 200 } }),
                new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
                new Paragraph({ text: "", spacing: { after: 800 } }),

                // YENİ İMZA BÖLÜMÜ
                new Table({
                    rows: signatureRows,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" }, insideHorizontal: { style: "none" }, insideVertical: { style: "none" } },
                }),
                new Paragraph({
                    alignment: AlignmentType.CENTER,
                    spacing: { before: 600 },
                    children: [
                        new TextRun({ text: `${new Date().toLocaleDateString('tr-TR')}\nUygundur\n\n[Okul Müdürü Adı Soyadı]\nOkul Müdürü`, size: 22, bold: true })
                    ]
                })
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
const baseUrl = isProduction ? 'https://node-yillikplan-1074807643813.europe-west3.run.app' : 'http://localhost:8080';
console.log(`Environment: ${isProduction ? 'Cloud Run' : 'Local'}`);

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`Base URL: ${baseUrl}`);
});

module.exports = app;