const express = require('express');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, ShadingType } = require('docx');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Demo veri endpoint'i
app.get('/demo-data', (req, res) => {
  try {
    const demoDataPath = path.join(__dirname, 'demo-data.json');
    const demoData = JSON.parse(fs.readFileSync(demoDataPath, 'utf8'));
    res.json(demoData);
  } catch (error) {
    console.error('Demo veri okuma hatası:', error);
    res.status(500).json({ error: 'Demo veriler yüklenirken hata oluştu' });
  }
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
      dersSaati, // Bu genel ders saati, haftalık plandaki bireysel ders saatleri de var
      varsayilanAracGerec,
      haftalikPlan // Bu artık type, label, originalAcademicWeek gibi alanları içeriyor
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
            run: { bold: true, size: 20 }, // 10pt
            paragraph: { alignment: AlignmentType.CENTER },
          },
          {
            id: "holidayCell",
            name: "Holiday Cell",
            basedOn: "Normal",
            next: "Normal",
            quickFormat: true,
            run: { size: 20 }, // 10pt
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
            shading: { fill: "EFEFEF", type: ShadingType.CLEAR, color: "auto" }
          }),
          new TableCell({ 
            children: [new Paragraph({ text: haftaData.tarih || "", style: "holidayCell" })],
            shading: { fill: "EFEFEF", type: ShadingType.CLEAR, color: "auto" }
          }),
          new TableCell({ // Ders Saati (Tatil için boş)
            children: [new Paragraph({text: "", style: "holidayCell"})],
            shading: { fill: "EFEFEF", type: ShadingType.CLEAR, color: "auto" }
          }),
          new TableCell({ // Kalan 5 sütunu birleştir (Ünite, Konu, Kazanım, AraçGereç, YöntemTeknik)
            children: [new Paragraph({ text: haftaData.label || "Tatil", style: "holidayCell" })],
            columnSpan: 5,
            shading: { fill: "EFEFEF", type: ShadingType.CLEAR, color: "auto" }
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
                new TableCell({ children: [new Paragraph(dersSaati)] }) // Genel haftalık ders saati
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
