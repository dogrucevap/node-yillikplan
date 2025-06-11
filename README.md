# MEB Ünitelendirilmiş Yıllık Plan Oluşturucu

Bu proje, Milli Eğitim Bakanlığı (MEB) formatına uygun, ünitelendirilmiş yıllık ders planları oluşturmak için geliştirilmiş bir web uygulamasıdır. Kullanıcıların ders bilgilerini, haftalık içerikleri, kazanımları, kullanılacak araç-gereçleri ve yöntem-teknikleri girmesine olanak tanır ve sonuç olarak Word (.docx) formatında bir yıllık plan çıktısı üretir.

## ✨ Temel Özellikler

*   **Dinamik Yıllık Plan Tablosu:** 36 akademik haftayı ve resmi tatil dönemlerini içeren interaktif bir plan tablosu.
*   **Otomatik Tarih Hesaplama:** Seçilen bir başlangıç haftasına göre tüm akademik ve tatil haftalarının tarihlerini otomatik olarak hesaplar.
*   **Tatil Entegrasyonu:** Standart MEB takvimine uygun ara tatiller (1. ve 2. dönem) ve yarıyıl tatili otomatik olarak plana dahil edilir ve farklı renkte gösterilir.
*   **Sürükle-Bırak ile Yeniden Sıralama:** Akademik haftaların içerikleri (konu, kazanım vb.) sürükle-bırak yöntemiyle kolayca yeniden sıralanabilir. Bu işlem sırasında hafta numaraları ve tarihler otomatik olarak güncellenir.
*   **Detaylı Hafta İçeriği:** Her hafta için ünite, konu, kazanım, ders saati, araç-gereçler ve yöntem/teknikler gibi detaylar girilebilir.
*   **Araç-Gereç ve Yöntem/Teknik Seçimi:** Önceden tanımlanmış listelerden çoklu seçim yapılabilir.
*   **Word (.docx) Çıktısı:** Oluşturulan yıllık plan, MEB formatına uygun bir Word belgesi olarak indirilebilir. Tatil haftaları da çıktıda belirtilir.
*   **Veritabanı Entegrasyonu (SQLite):**
    *   Demo plan verileri ve kullanıcı tarafından kaydedilen planlar SQLite veritabanında saklanır.
    *   Araç-gereç tipleri ayrı bir tabloda yönetilir.
*   **Kaydedilen Planlar:** Kullanıcılar oluşturdukları planları isimlendirerek veritabanına kaydedebilir, daha sonra bu planları listeleyebilir, yükleyebilir ve silebilir.
*   **Kullanıcı Dostu Arayüz:** Sekmeli yapı ile kolay navigasyon ve veri girişi.

## 🛠️ Kullanılan Teknolojiler

*   **Frontend:**
    *   HTML5
    *   CSS3 (Flexbox, Grid)
    *   JavaScript (Vanilla JS, DOM Manipulation, Fetch API)
*   **Backend:**
    *   Node.js
    *   Express.js (Web sunucusu ve API yönetimi için)
    *   SQLite3 (Veritabanı için)
    *   `docx` (Word belgesi oluşturmak için)
    *   `cors` (Cross-Origin Resource Sharing için)
*   **Veri Formatı:** JSON (İstemci-sunucu iletişimi ve veritabanında bazı alanlar için)

## 🚀 Kurulum ve Çalıştırma

1.  **Proje Klonlama (Eğer GitHub'daysa):**
    ```bash
    git clone <repository_url>
    cd meb-yillik-plan-generator 
    ```
2.  **Bağımlılıkların Yüklenmesi:**
    Proje dizininde aşağıdaki komutu çalıştırın:
    ```bash
    npm install
    ```
3.  **Uygulamayı Başlatma:**
    ```bash
    npm start
    ```
    Bu komut `node server.js`'yi çalıştırarak web sunucusunu başlatacaktır. Sunucu varsayılan olarak `http://localhost:3000` adresinde çalışmaya başlayacaktır.

4.  **Kullanım:**
    *   Web tarayıcınızda `http://localhost:3000` adresini açın.
    *   Gerekli bilgileri (okul, öğretmen, ders vb.) girin.
    *   "Akademik Takvim Başlangıç Haftası" seçerek planın tarihlerini oluşturun.
    *   "Yıllık Plan" sekmesinde haftalık detayları düzenleyin.
    *   İsteğe bağlı olarak "Demo Veriyi Yükle" butonu ile örnek bir plan yükleyebilirsiniz.
    *   Planınızı "Kaydedilen Planlar" sekmesinden kaydedebilir veya daha önce kaydettiğiniz planları yükleyebilirsiniz.
    *   Son olarak, "36 Haftalık Word Belgesini Oluştur" butonu ile planınızı Word belgesi olarak indirin.

## ⚙️ Çalışma Prensibi

### Veritabanı Yapısı (`yillik_planlar.sqlite`)

*   `plans`: Kaydedilen her bir yıllık planın ana bilgilerini (plan adı, okul, öğretmen, ders, sınıf, eğitim yılı, genel ders saati, varsayılan araç-gereçler) ve planın tam verisini (`plan_data_json`, `base_academic_plan_json`) JSON olarak saklar.
*   `arac_gerec_tipleri`: Tüm olası araç-gereçlerin isimlerini ve ID'lerini tutar.
*   `academic_weeks` ve `plan_hafta_arac_gerec`: Bu tablolar demo planın ilk veritabanı entegrasyonunda kullanılmış olup, güncel yapıda demo planın akademik hafta detayları `plans` tablosundaki `base_academic_plan_json` içinde saklanmaktadır. Bu tablolar gelecekteki geliştirmeler için (örneğin, paylaşımlı ders içerikleri) kullanılabilir.

### Frontend (`public/`)

*   **`index.html`**: Uygulamanın ana HTML yapısını ve sekmelerini içerir.
*   **`styles.css`**: Uygulamanın görsel stillerini tanımlar.
*   **`app.js`**: Tüm istemci tarafı mantığını yönetir:
    *   DOM manipülasyonu ve olay dinleyicileri.
    *   `yillikPlan` (gösterilen tam plan, tatiller dahil) ve `baseAcademicPlan` (sadece 36 akademik haftanın sıralı verileri) dizilerinin yönetimi.
    *   `updateAllWeekDates` fonksiyonu ile seçilen başlangıç haftasına göre `yillikPlan`'ın (tatiller, tarihler, akademik hafta numaraları dahil) dinamik olarak oluşturulması.
    *   Sürükle-bırak (`handleDrop`) ile `baseAcademicPlan`'ın yeniden sıralanması ve `originalAcademicWeek` numaralarının güncellenmesi.
    *   Sunucu API'larına (`/demo-data`, `/api/plans`, `/generate-plan`) `fetch` istekleri gönderilmesi.
    *   Kullanıcı arayüzünün (plan tablosu, araç-gereç seçicileri vb.) dinamik olarak render edilmesi.

### Backend (`server.js`)

*   Express.js ile bir web sunucusu oluşturulur.
*   Statik dosyalar (`public` klasörü) sunulur.
*   **API Endpoint'leri:**
    *   `GET /demo-data`: Demo plana ait temel bilgileri ve `baseAcademicPlan` verisini veritabanından çeker.
    *   `POST /generate-plan`: İstemciden gelen plan verilerini (`yillikPlan`) alır ve `docx` kütüphanesini kullanarak bir Word belgesi oluşturur, kullanıcıya indirir. Tatil haftalarını ve doğru akademik hafta numaralarını içerir.
    *   `GET /api/plans`: Veritabanındaki tüm kayıtlı planların listesini döndürür.
    *   `POST /api/plans`: Yeni bir planı, tüm detaylarıyla (`plan_data_json` ve `base_academic_plan_json` olarak) veritabanına kaydeder.
    *   `GET /api/plans/:id`: Belirli bir ID'ye sahip planın tüm verilerini veritabanından çeker.
    *   `DELETE /api/plans/:id`: Belirli bir ID'ye sahip planı veritabanından siler.
*   **Veritabanı İşlemleri:**
    *   Sunucu başladığında SQLite veritabanı (`yillik_planlar.sqlite`) oluşturulur/bağlanılır.
    *   Gerekli tablolar (`plans`, `arac_gerec_tipleri` vb.) oluşturulur.
    *   `TUM_ARAC_GEREC_LISTESI`'ndeki araç-gereçler `arac_gerec_tipleri` tablosuna eklenir.
    *   Eğer veritabanında demo plan yoksa, `demo-data.json` dosyasındaki veriler kullanılarak bir demo plan şablonu (`baseAcademicPlan` olarak) `plans` tablosuna eklenir.

## 🗺️ Gelecekteki Olası Geliştirmeler

*   Kullanıcı kimlik doğrulama ve yetkilendirme.
*   Farklı kullanıcıların kendi planlarını saklaması.
*   Planları PDF olarak dışa aktarma seçeneği.
*   Daha gelişmiş şablon yönetimi.
*   Ortak ders içerikleri ve kazanım bankası.
*   Takvim entegrasyonu ile resmi tatillerin otomatik çekilmesi.
