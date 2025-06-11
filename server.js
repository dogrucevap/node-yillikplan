const express = require('express');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, ShadingType } = require('docx');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'yillik_planlar.sqlite');

// Veritabanı bağlantısını başlat ve tabloları oluştur (eğer yoksa)
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Veritabanı bağlantı hatası:", err.message);
  } else {
    console.log("SQLite veritabanına başarıyla bağlanıldı.");
    db.serialize(() => {
      // Planlar için ana tablo
      db.run(`CREATE TABLE IF NOT EXISTS plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_name TEXT UNIQUE, -- Demo plan gibi özel isimler için
        okul TEXT,
        ogretmen TEXT,
        ders TEXT,
        sinif TEXT,
        egitim_ogretim_yili TEXT,
        ders_saati TEXT,
        varsayilan_arac_gerec TEXT, -- JSON string
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error("Plans tablosu oluşturma hatası:", err.message);
      });

      // Haftalık plan detayları için ayrı bir tablo (plan_id ile ana tabloya bağlı)
      // Bu, baseAcademicPlan'ı saklayacak
      db.run(`CREATE TABLE IF NOT EXISTS academic_weeks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER,
        original_academic_week INTEGER,
        unite TEXT,
        konu TEXT,
        kazanim TEXT,
        ders_saati TEXT,
        arac_gerec TEXT, -- JSON string
        yontem_teknik TEXT, -- JSON string
        olcme_degerlendirme TEXT,
        aciklama TEXT,
        FOREIGN KEY (plan_id) REFERENCES plans (id)
      )`, (err) => {
        if (err) console.error("Academic_weeks tablosu oluşturma hatası:", err.message);
        else {
          // Tablolar oluşturulduktan veya zaten var olduktan sonra demo veriyi yükle
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
      console.error("Demo veri dosyası okunamadı:", err);
      return;
    }
    try {
      const demoData = JSON.parse(jsonData);
      
      db.get("SELECT id FROM plans WHERE plan_name = ?", ["demo_matematik_9"], (err, row) => {
        if (err) {
          console.error("Demo plan sorgulama hatası:", err.message);
          return;
        }
        if (!row) { // Demo plan henüz eklenmemişse ekle
          db.serialize(() => {
            const stmtPlan = db.prepare("INSERT INTO plans (plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
            stmtPlan.run(
              "demo_matematik_9",
              demoData.okul,
              demoData.ogretmen,
              demoData.ders,
              demoData.sinif,
              demoData.egitimOgretimYili,
              demoData.dersSaati,
              JSON.stringify(demoData.varsayilanAracGerec),
              function(err) { // Burası önemli: this.lastID için normal fonksiyon
                if (err) {
                  console.error("Demo plan ekleme hatası:", err.message);
                } else {
                  const planId = this.lastID;
                  console.log(`Demo plan ID ${planId} ile eklendi.`);
                  const stmtWeek = db.prepare("INSERT INTO academic_weeks (plan_id, original_academic_week, unite, konu, kazanim, ders_saati, arac_gerec, yontem_teknik, olcme_degerlendirme, aciklama) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                  demoData.haftalikPlan.forEach((week, index) => {
                    stmtWeek.run(
                      planId,
                      index + 1, // original_academic_week
                      week.unite,
                      week.konu,
                      week.kazanim,
                      week.dersSaati,
                      JSON.stringify(week.aracGerec || []),
                      JSON.stringify(week.yontemTeknik || []),
                      week.olcmeDeğerlendirme || '',
                      week.aciklama || ''
                    );
                  });
                  stmtWeek.finalize((err) => {
                    if(err) console.error("Demo haftalık planları ekleme hatası:", err.message);
                    else console.log("Demo haftalık plan detayları başarıyla eklendi.");
                  });
                }
              }
            );
            stmtPlan.finalize();
          });
        } else {
          console.log("Demo plan zaten veritabanında mevcut.");
        }
      });
    } catch (parseErr) {
      console.error("Demo veri JSON parse hatası:", parseErr);
    }
  });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Demo veri endpoint'i (Artık veritabanından çekecek)
app.get('/demo-data', (req, res) => {
  db.get("SELECT * FROM plans WHERE plan_name = ?", ["demo_matematik_9"], (err, planRow) => {
    if (err) {
      console.error("Demo plan getirme hatası:", err.message);
      return res.status(500).json({ error: 'Demo veriler yüklenirken sunucu hatası oluştu' });
    }
    if (!planRow) {
      return res.status(404).json({ error: 'Demo plan bulunamadı' });
    }

    db.all("SELECT * FROM academic_weeks WHERE plan_id = ? ORDER BY original_academic_week ASC", [planRow.id], (err, weekRows) => {
      if (err) {
        console.error("Demo haftalık plan detayları getirme hatası:", err.message);
        return res.status(500).json({ error: 'Demo verilerin detayları yüklenirken sunucu hatası oluştu' });
      }
      
      const demoData = {
        okul: planRow.okul,
        ogretmen: planRow.ogretmen,
        ders: planRow.ders,
        sinif: planRow.sinif,
        egitimOgretimYili: planRow.egitim_ogretim_yili,
        dersSaati: planRow.ders_saati,
        varsayilanAracGerec: JSON.parse(planRow.varsayilan_arac_gerec || "[]"),
        haftalikPlan: weekRows.map(w => ({
          // originalAcademicWeek: w.original_academic_week, // Bu zaten app.js'de atanıyor
          unite: w.unite,
          konu: w.konu,
          kazanim: w.kazanim,
          dersSaati: w.ders_saati,
          aracGerec: JSON.parse(w.arac_gerec || "[]"),
          yontemTeknik: JSON.parse(w.yontem_teknik || "[]"),
          olcmeDeğerlendirme: w.olcme_degerlendirme,
          aciklama: w.aciklama
        }))
      };
      res.json(demoData);
    });
  });
});

// Word belgesi oluşturma endpoint'i
app.post('/generate-plan', async (req, res) => {
  try {
    const {
      okul,
      ogretmen,
      ders,
      sinif,
      egitimOgretimYili,
      dersSaati,
      varsayilanAracGerec,
      haftalikPlan 
    } = req.body;

    const doc = new Document({
      creator: "Yillik Plan Oluşturucu",
      description: "Otomatik oluşturulmuş yıllık plan",
      styles: {
        paragraphStyles: [
          {
            id: "tableHeader",
            name: "Table Header",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { bold: true, size: 20 }, 
            paragraph: { alignment: AlignmentType.CENTER },
          },
          {
            id: "holidayCell",
            name: "Holiday Cell",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 20 }, 
            paragraph: { alignment: AlignmentType.CENTER },
          }
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
          new TableCell({ 
            children: [new Paragraph({ text: weekDisplayValue, style: "holidayCell" })],
            shading: { fill: "E0E0E0", type: ShadingType.CLEAR, color: "auto" }
          }),
          new TableCell({ 
            children: [new Paragraph({ text: haftaData.tarih || "", style: "holidayCell" })],
            shading: { fill: "E0E0E0", type: ShadingType.CLEAR, color: "auto" }
          }),
          new TableCell({ 
            children: [new Paragraph({text: "", style: "holidayCell"})],
            shading: { fill: "E0E0E0", type: ShadingType.CLEAR, color: "auto" }
          }),
          new TableCell({ 
            children: [new Paragraph({ text: haftaData.label || "Tatil", style: "holidayCell" })],
            columnSpan: 5,
            shading: { fill: "E0E0E0", type: ShadingType.CLEAR, color: "auto" }
          })
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
        new Paragraph({
          children: [new TextRun({ text: "T.C. MİLLÎ EĞİTİM BAKANLIĞI", bold: true, size: 24 })],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [new TextRun({ text: "ÜNİTELENDİRİLMİŞ YILLIK PLAN", bold: true, size: 20 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 400 }
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("OKUL ADI")], width: { size: 20, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph(okul)], width: { size: 30, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph("ÖĞRETMEN ADI")], width: { size: 20, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph(ogretmen)], width: { size: 30, type: WidthType.PERCENTAGE } })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("DERS ADI")] }),
                new TableCell({ children: [new Paragraph(ders)] }),
                new TableCell({ children: [new Paragraph("SINIF")] }),
                new TableCell({ children: [new Paragraph(sinif)] })
              ]
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph("EĞİTİM-ÖĞRETİM YILI")] }),
                new TableCell({ children: [new Paragraph(egitimOgretimYili)] }),
                new TableCell({ children: [new Paragraph("HAFTALIK DERS SAATİ")] }),
                new TableCell({ children: [new Paragraph(dersSaati)] }) 
              ]
            })
          ]
        }),
        new Paragraph({ text: "", spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ text: "", spacing: { before: 800 } }),
        new Paragraph({
          children: [new TextRun({ text: "ÖĞRETMEN ADI SOYADI: " + ogretmen, bold: true })],
          spacing: { before: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "İMZA: ________________", bold: true })],
          spacing: { before: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "TARİH: " + new Date().toLocaleDateString('tr-TR'), bold: true })],
          spacing: { before: 200 }
        })
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

app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT} adresinde çalışıyor`);
});

module.exports = app;
