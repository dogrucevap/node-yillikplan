const express = require('express');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, ShadingType } = require('docx');
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
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error("Plans tablosu oluşturma hatası:", err.message);
      });

      db.run(`CREATE TABLE IF NOT EXISTS academic_weeks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER, -- Bu artık genel plan şablonu için kullanılabilir veya kaldırılabilir
        original_academic_week INTEGER,
        unite TEXT,
        konu TEXT,
        kazanim TEXT,
        ders_saati TEXT,
        yontem_teknik TEXT, -- JSON string
        olcme_degerlendirme TEXT,
        aciklama TEXT,
        FOREIGN KEY (plan_id) REFERENCES plans (id) ON DELETE CASCADE 
      )`, (err) => {
        if (err) console.error("Academic_weeks tablosu oluşturma hatası:", err.message);
      });

      db.run(`CREATE TABLE IF NOT EXISTS arac_gerec_tipleri (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
      )`, (err) => {
        if (err) console.error("arac_gerec_tipleri tablosu oluşturma hatası:", err.message);
        else {
          const stmt = db.prepare("INSERT OR IGNORE INTO arac_gerec_tipleri (name) VALUES (?)");
          TUM_ARAC_GEREC_LISTESI.forEach(name => stmt.run(name));
          stmt.finalize();
        }
      });
      
      db.run(`CREATE TABLE IF NOT EXISTS plan_hafta_arac_gerec (
        academic_week_id INTEGER, -- academic_weeks.id'ye referans
        arac_gerec_tip_id INTEGER,
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
    if (err) {
      console.error("Demo veri dosyası okunamadı:", err); return;
    }
    try {
      const demoData = JSON.parse(jsonData);
      db.get("SELECT id FROM plans WHERE plan_name = ?", ["demo_matematik_9"], (err, row) => {
        if (err) { console.error("Demo plan sorgulama hatası:", err.message); return; }
        if (!row) {
          db.serialize(() => {
            // Demo plan için baseAcademicPlan'ı oluştur (app.js'deki gibi)
            const demoBaseAcademicPlan = demoData.haftalikPlan.map((week, index) => ({
                originalAcademicWeek: index + 1,
                unite: week.unite || '',
                konu: week.konu || '',
                kazanim: week.kazanim || '',
                dersSaati: week.dersSaati || demoData.dersSaati || '4',
                aracGerec: week.aracGerec || [], // Bu, isim dizisi olacak
                yontemTeknik: week.yontemTeknik || [],
                olcmeDeğerlendirme: week.olcmeDeğerlendirme || '',
                aciklama: week.aciklama || ''
            }));

            const stmtPlan = db.prepare("INSERT INTO plans (plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, base_academic_plan_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            stmtPlan.run(
              "demo_matematik_9",
              demoData.okul, demoData.ogretmen, demoData.ders, demoData.sinif,
              demoData.egitimOgretimYili, demoData.dersSaati,
              JSON.stringify(demoData.varsayilanAracGerec),
              JSON.stringify(demoBaseAcademicPlan), // baseAcademicPlan'ı JSON olarak kaydet
              function(err) {
                if (err) { console.error("Demo plan ekleme hatası:", err.message); return; }
                const planId = this.lastID;
                console.log(`Demo plan ID ${planId} (template) ile eklendi.`);
                // academic_weeks ve plan_hafta_arac_gerec tablolarına demo veriyi eklemeye gerek yok,
                // çünkü artık planlar doğrudan plans.base_academic_plan_json'dan yüklenecek.
                // Bu tablolar gelecekte daha detaylı şablonlar için kullanılabilir.
              }
            );
            stmtPlan.finalize();
          });
        } else {
          console.log("Demo plan (template) zaten veritabanında mevcut.");
        }
      });
    } catch (parseErr) {
      console.error("Demo veri JSON parse hatası:", parseErr);
    }
  });
}

app.use(cors());
app.use(express.json({limit: '5mb'})); // JSON payload limitini artır
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Demo veri endpoint'i (Artık base_academic_plan_json'dan çekecek)
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
      okul: planRow.okul,
      ogretmen: planRow.ogretmen,
      ders: planRow.ders,
      sinif: planRow.sinif,
      egitimOgretimYili: planRow.egitim_ogretim_yili,
      dersSaati: planRow.ders_saati,
      varsayilanAracGerec: JSON.parse(planRow.varsayilan_arac_gerec || "[]"),
      haftalikPlan: basePlan // Bu artık baseAcademicPlan içeriği
    };
    res.json(demoPlanData);
  } catch (error) {
    console.error("Demo veri getirme hatası:", error.message);
    res.status(500).json({ error: 'Demo veriler yüklenirken sunucu hatası oluştu' });
  }
});

// Kayıtlı planları listeleme
app.get('/api/plans', (req, res) => {
  db.all("SELECT id, plan_name, ders, sinif, egitim_ogretim_yili, created_at FROM plans ORDER BY created_at DESC", [], (err, rows) => {
    if (err) {
      console.error("Kayıtlı planları listeleme hatası:", err.message);
      return res.status(500).json({ error: "Planlar listelenirken bir hata oluştu." });
    }
    res.json(rows);
  });
});

// Belirli bir planı yükleme
app.get('/api/plans/:id', (req, res) => {
  const planId = req.params.id;
  db.get("SELECT * FROM plans WHERE id = ?", [planId], (err, row) => {
    if (err) {
      console.error(`Plan ID ${planId} yükleme hatası:`, err.message);
      return res.status(500).json({ error: "Plan yüklenirken bir hata oluştu." });
    }
    if (!row) {
      return res.status(404).json({ error: "Plan bulunamadı." });
    }
    // plan_data_json ve base_academic_plan_json'ı parse et
    try {
        const planData = {
            ...row,
            plan_data_json: JSON.parse(row.plan_data_json || "null"),
            base_academic_plan_json: JSON.parse(row.base_academic_plan_json || "null"),
            varsayilan_arac_gerec: JSON.parse(row.varsayilan_arac_gerec || "[]")
        };
        res.json(planData);
    } catch(e) {
        console.error(`Plan ID ${planId} JSON parse hatası:`, e.message);
        return res.status(500).json({ error: "Plan verisi okunurken bir hata oluştu." });
    }
  });
});

// Yeni plan kaydetme
app.post('/api/plans', (req, res) => {
  const { plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, plan_data_json, base_academic_plan_json } = req.body;

  if (!plan_name) {
    return res.status(400).json({ error: "Plan adı gereklidir." });
  }

  const stmt = db.prepare("INSERT INTO plans (plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, plan_data_json, base_academic_plan_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  stmt.run(
    plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati,
    JSON.stringify(varsayilan_arac_gerec || []),
    JSON.stringify(plan_data_json || null),
    JSON.stringify(base_academic_plan_json || null),
    function(err) {
      if (err) {
        console.error("Yeni plan kaydetme hatası:", err.message);
        // UNIQUE constraint hatası olabilir
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

// Plan silme endpoint'i
app.delete('/api/plans/:id', (req, res) => {
  const planId = req.params.id;
  // Önce ilişkili academic_weeks ve plan_hafta_arac_gerec kayıtlarını silmek gerekebilir
  // veya ON DELETE CASCADE kullanılabilir (şu anki şemada var).
  db.run("DELETE FROM plans WHERE id = ?", [planId], function(err) {
    if (err) {
      console.error(`Plan ID ${planId} silme hatası:`, err.message);
      return res.status(500).json({ error: "Plan silinirken bir hata oluştu." });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Silinecek plan bulunamadı." });
    }
    res.status(200).json({ message: "Plan başarıyla silindi." });
  });
});


app.post('/generate-plan', async (req, res) => {
  try {
    const {
      okul, ogretmen, ders, sinif, egitimOgretimYili,
      dersSaati, varsayilanAracGerec, haftalikPlan 
    } = req.body;

    const doc = new Document({
      creator: "Yillik Plan Oluşturucu",
      description: "Otomatik oluşturulmuş yıllık plan",
      styles: {
        paragraphStyles: [
          { id: "tableHeader", name: "Table Header", basedOn: "Normal", next: "Normal", quickFormat: true, run: { bold: true, size: 20 }, paragraph: { alignment: AlignmentType.CENTER } },
          { id: "holidayCell", name: "Holiday Cell", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 20 }, paragraph: { alignment: AlignmentType.CENTER } }
        ]
      }
    });

    const tableHeader = new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ text: "HAFTA", style: "tableHeader" })], width: { size: 8, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "TARİH", style: "tableHeader" })], width: { size: 12, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "DERS SAATİ", style: "tableHeader" })], width: { size: 8, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "ÜNİTE", style: "tableHeader" })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "KONU", style: "tableHeader" })], width: { size: 20, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "KAZANIM", style: "tableHeader" })], width: { size: 15, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "ARAÇ GEREÇ", style: "tableHeader" })], width: { size: 12, type: WidthType.PERCENTAGE } }),
        new TableCell({ children: [new Paragraph({ text: "YÖNTEM TEKNİK", style: "tableHeader" })], width: { size: 10, type: WidthType.PERCENTAGE } })
      ],
      tableHeader: true,
    });

    const tableRows = [tableHeader];

    haftalikPlan.forEach(haftaData => {
      const isHoliday = haftaData.type === 'holiday';
      const weekDisplayValue = isHoliday ? (haftaData.label || "Tatil") : (haftaData.originalAcademicWeek ? haftaData.originalAcademicWeek.toString() : (haftaData.hafta || '').toString());
      
      let cells;
      if (isHoliday) {
        cells = [
          new TableCell({ children: [new Paragraph({ text: weekDisplayValue, style: "holidayCell" })], shading: { fill: "E0E0E0", type: ShadingType.CLEAR, color: "auto" } }),
          new TableCell({ children: [new Paragraph({ text: haftaData.tarih || "", style: "holidayCell" })], shading: { fill: "E0E0E0", type: ShadingType.CLEAR, color: "auto" } }),
          new TableCell({ children: [new Paragraph({text: "", style: "holidayCell"})], shading: { fill: "E0E0E0", type: ShadingType.CLEAR, color: "auto" } }),
          new TableCell({ children: [new Paragraph({ text: haftaData.label || "Tatil", style: "holidayCell" })], columnSpan: 5, shading: { fill: "E0E0E0", type: ShadingType.CLEAR, color: "auto" } })
        ];
      } else {
        cells = [
          new TableCell({ children: [new Paragraph(weekDisplayValue)] }),
          new TableCell({ children: [new Paragraph(haftaData.tarih || "")] }),
          new TableCell({ children: [new Paragraph(haftaData.dersSaati || "")] }),
          new TableCell({ children: [new Paragraph(haftaData.unite || "")] }),
          new TableCell({ children: [new Paragraph(haftaData.konu || "")] }),
          new TableCell({ children: [new Paragraph(haftaData.kazanim || "")] }),
          new TableCell({ children: [new Paragraph(Array.isArray(haftaData.aracGerec) ? haftaData.aracGerec.join(", ") : (haftaData.aracGerec || ""))] }),
          new TableCell({ children: [new Paragraph(Array.isArray(haftaData.yontemTeknik) ? haftaData.yontemTeknik.join(", ") : (haftaData.yontemTeknik || ""))] })
        ];
      }
      tableRows.push(new TableRow({ children: cells }));
    });

    doc.addSection({
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: "T.C. MİLLÎ EĞİTİM BAKANLIĞI", bold: true, size: 24 })], alignment: AlignmentType.CENTER }),
        new Paragraph({ children: [new TextRun({ text: "ÜNİTELENDİRİLMİŞ YILLIK PLAN", bold: true, size: 20 })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 400 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [ new TableCell({ children: [new Paragraph("OKUL ADI")], width: { size: 20, type: WidthType.PERCENTAGE } }), new TableCell({ children: [new Paragraph(okul)], width: { size: 30, type: WidthType.PERCENTAGE } }), new TableCell({ children: [new Paragraph("ÖĞRETMEN ADI")], width: { size: 20, type: WidthType.PERCENTAGE } }), new TableCell({ children: [new Paragraph(ogretmen)], width: { size: 30, type: WidthType.PERCENTAGE } }) ] }),
            new TableRow({ children: [ new TableCell({ children: [new Paragraph("DERS ADI")] }), new TableCell({ children: [new Paragraph(ders)] }), new TableCell({ children: [new Paragraph("SINIF")] }), new TableCell({ children: [new Paragraph(sinif)] }) ] }),
            new TableRow({ children: [ new TableCell({ children: [new Paragraph("EĞİTİM-ÖĞRETİM YILI")] }), new TableCell({ children: [new Paragraph(egitimOgretimYili)] }), new TableCell({ children: [new Paragraph("HAFTALIK DERS SAATİ")] }), new TableCell({ children: [new Paragraph(dersSaati)] }) ] })
          ]
        }),
        new Paragraph({ text: "", spacing: { before: 400, after: 200 } }),
        new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
        new Paragraph({ text: "", spacing: { before: 800 } }),
        new Paragraph({ children: [new TextRun({ text: "ÖĞRETMEN ADI SOYADI: " + ogretmen, bold: true })], spacing: { before: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "İMZA: ________________", bold: true })], spacing: { before: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "TARİH: " + new Date().toLocaleDateString('tr-TR'), bold: true })], spacing: { before: 200 } })
      ]
    });

    const buffer = await Packer.toBuffer(doc);
    const safeDers = ders.replace(/[^a-zA-Z0-9]/g, '_');
    const safeSinif = sinif.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `yillik_plan_${safeDers}_${safeSinif}_${Date.now()}.docx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    console.error('Hata:', error);
    res.status(500).json({ error: 'Belge oluşturulurken hata oluştu' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});

module.exports = app;
