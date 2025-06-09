const express = require('express');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, AlignmentType, TextRun } = require('docx');
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
    // JSON dosyasından demo verileri oku
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
      dersSaati,
      varsayilanAracGerec,
      haftalikPlan
    } = req.body;

    // Word belgesi oluştur
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Başlık
          new Paragraph({
            children: [
              new TextRun({
                text: "T.C. MİLLÎ EĞİTİM BAKANLIĞI",
                bold: true,
                size: 24
              })
            ],
            alignment: AlignmentType.CENTER
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: "ÜNİTELENDİRİLMİŞ YILLIK PLAN",
                bold: true,
                size: 20
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 400 }
          }),

          // Bilgi tablosu
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph("OKUL ADI")],
                    width: { size: 20, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph(okul)],
                    width: { size: 30, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph("ÖĞRETMEN ADI")],
                    width: { size: 20, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph(ogretmen)],
                    width: { size: 30, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph("DERS ADI")]
                  }),
                  new TableCell({
                    children: [new Paragraph(ders)]
                  }),
                  new TableCell({
                    children: [new Paragraph("SINIF")]
                  }),
                  new TableCell({
                    children: [new Paragraph(sinif)]
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph("EĞİTİM-ÖĞRETİM YILI")]
                  }),
                  new TableCell({
                    children: [new Paragraph(egitimOgretimYili)]
                  }),
                  new TableCell({
                    children: [new Paragraph("HAFTALIK DERS SAATİ")]
                  }),
                  new TableCell({
                    children: [new Paragraph(dersSaati)]
                  })
                ]
              })
            ]
          }),

          new Paragraph({
            text: "",
            spacing: { before: 400, after: 200 }
          }),

          // Haftalık plan tablosu
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            rows: [
              // Başlık satırı
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: "HAFTA",
                        bold: true
                      })]
                    })],
                    width: { size: 8, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: "TARİH",
                        bold: true
                      })]
                    })],
                    width: { size: 12, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: "ÜNİTE",
                        bold: true
                      })]
                    })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: "KONU",
                        bold: true
                      })]
                    })],
                    width: { size: 20, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: "KAZANIM",
                        bold: true
                      })]
                    })],
                    width: { size: 15, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: "DERS SAATİ",
                        bold: true
                      })]
                    })],
                    width: { size: 8, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: "ARAÇ GEREÇ",
                        bold: true
                      })]
                    })],
                    width: { size: 12, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({
                      children: [new TextRun({
                        text: "YÖNTEM TEKNİK",
                        bold: true
                      })]
                    })],
                    width: { size: 10, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              // Haftalık plan satırları
              ...haftalikPlan.map(hafta => 
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph(hafta.hafta.toString())]
                    }),
                    new TableCell({
                      children: [new Paragraph(hafta.tarih)]
                    }),
                    new TableCell({
                      children: [new Paragraph(hafta.unite)]
                    }),
                    new TableCell({
                      children: [new Paragraph(hafta.konu)]
                    }),
                    new TableCell({
                      children: [new Paragraph(hafta.kazanim)]
                    }),
                    new TableCell({
                      children: [new Paragraph(hafta.dersSaati)]
                    }),
                    new TableCell({
                      children: [new Paragraph(Array.isArray(hafta.aracGerec) ? hafta.aracGerec.join(", ") : hafta.aracGerec)]
                    }),
                    new TableCell({
                      children: [new Paragraph(Array.isArray(hafta.yontemTeknik) ? hafta.yontemTeknik.join(", ") : hafta.yontemTeknik)]
                    })
                  ]
                })
              )
            ]
          }),

          // İmza alanı
          new Paragraph({
            text: "",
            spacing: { before: 800 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: "ÖĞRETMEN ADI SOYADI: " + ogretmen,
                bold: true
              })
            ],
            spacing: { before: 200 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: "İMZA: ________________",
                bold: true
              })
            ],
            spacing: { before: 200 }
          }),
          
          new Paragraph({
            children: [
              new TextRun({
                text: "TARİH: " + new Date().toLocaleDateString('tr-TR'),
                bold: true
              })
            ],
            spacing: { before: 200 }
          })
        ]
      }]
    });

    // Word belgesini buffer'a çevir
    const buffer = await Packer.toBuffer(doc);
    
    // Dosya adı oluştur (URL-safe)
    const safeDers = ders.replace(/[^a-zA-Z0-9]/g, '_');
    const safeSinif = sinif.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `yillik_plan_${safeDers}_${safeSinif}_${Date.now()}.docx`;
    
    // Response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.setHeader('Content-Length', buffer.length);
    
    // Buffer'ı gönder
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