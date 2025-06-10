// Tab işlevselliği
function switchTab(tabId) {
    // Tüm tab butonlarından active sınıfını kaldır
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Tüm tab panellerini gizle
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Aktif tab butonunu işaretle
    event.target.classList.add('active');
    
    // İlgili tab panelini göster
    document.getElementById(tabId).classList.add('active');
}

let yillikPlan = [];
let varsayilanAracGerec = [];
let draggedItemIndex = null; // Sürüklenen öğenin indeksini tutar

function toggleDropdown(dropdown) {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function toggleAracGerec(hafta, item, selectedContainer) {
    const currentItems = yillikPlan[hafta - 1].aracGerec || [];
    const index = currentItems.indexOf(item);
    
    if (index > -1) {
        currentItems.splice(index, 1);
    } else {
        currentItems.push(item);
    }
    
    yillikPlan[hafta - 1].aracGerec = currentItems;
    updateAracGerecDisplay(selectedContainer, currentItems, hafta);
}

function updateAracGerecDisplay(container, items, hafta) {
    container.innerHTML = '';
    items.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'arac-gerec-tag';
        tag.innerHTML = `${item} <span class="remove" onclick="removeAracGerec(${hafta}, '${item}')">×</span>`;
        container.appendChild(tag);
    });
    
    if (items.length === 0) {
        container.innerHTML = '<span style="color: #999; font-size: 10px;">Araç gereç seçin</span>';
    }
}

function removeAracGerec(hafta, item) {
    const currentItems = yillikPlan[hafta - 1].aracGerec || [];
    const index = currentItems.indexOf(item);
    if (index > -1) {
        currentItems.splice(index, 1);
        yillikPlan[hafta - 1].aracGerec = currentItems;
        renderYillikPlan();
    }
}

function createYontemSelect(hafta, selectedItems = []) {
    const select = document.createElement('select');
    select.multiple = true;
    select.style.height = '24px';
    select.style.fontSize = '10px';
    
    yontemTeknikler.forEach(teknik => {
        const option = document.createElement('option');
        option.value = teknik;
        option.textContent = teknik;
        option.selected = selectedItems.includes(teknik);
        select.appendChild(option);
    });
    
    select.onchange = () => {
        const selectedValues = Array.from(select.selectedOptions).map(opt => opt.value);
        // yillikPlan dizisindeki doğru hafta nesnesini bulup güncelle
        // 'hafta' parametresi 1 tabanlı hafta numarasıdır.
        const planIndex = yillikPlan.findIndex(h => h.hafta === hafta);
        if (planIndex !== -1) {
            yillikPlan[planIndex].yontemTeknik = selectedValues;
        } else {
            console.error(`Hafta ${hafta} yillikPlan dizisinde bulunamadı.`);
        }
    };
    
    return select;
}

function renderYillikPlan() {
    const container = document.getElementById('haftaContainer');
    // Header'ı koru, diğerlerini temizle
    const header = container.querySelector('.hafta-header');
    container.innerHTML = ''; // Önce içeriği temizle
    if (header) { // Header varsa ekle
        container.appendChild(header);
    }

    // Sürükle bırak olay dinleyicilerini container'a ekle
    // Önce mevcut dinleyicileri kaldır (renderYillikPlan her çağrıldığında tekrar eklenmemesi için)
    // Bu yaklaşım yerine, dinleyicileri bir kez DOMContentLoaded'de ekleyip olay delegasyonu kullanmak daha performanslı olabilir,
    // ancak mevcut yapı için bu daha basit.
    container.removeEventListener('dragover', handleDragOver);
    container.addEventListener('dragover', handleDragOver);

    container.removeEventListener('drop', handleDrop);
    container.addEventListener('drop', handleDrop);
    
    yillikPlan.forEach((hafta, index) => {
        const haftaDiv = document.createElement('div');
        haftaDiv.className = 'hafta-item';
        haftaDiv.draggable = true; // Sürüklenebilir yap
        haftaDiv.dataset.index = index; // Mevcut indeksi sakla

        haftaDiv.addEventListener('dragstart', (event) => handleDragStart(event, index));
        haftaDiv.addEventListener('dragend', handleDragEnd);
        
        // Hafta seçim checkbox'ı
        const selectDiv = document.createElement('div');
        selectDiv.style.display = 'flex';
        selectDiv.style.alignItems = 'center';
        selectDiv.style.justifyContent = 'center';
        
        const selectCheckbox = document.createElement('input');
        selectCheckbox.type = 'checkbox';
        selectCheckbox.id = `week-${hafta.hafta}`;
        selectCheckbox.className = 'week-selector week-checkbox';
        selectCheckbox.onchange = updateWeekSelectionCount;
        
        selectDiv.appendChild(selectCheckbox);
        haftaDiv.appendChild(selectDiv);
        
        // Hafta numarası
        const haftaNum = document.createElement('div');
        haftaNum.textContent = hafta.hafta;
        haftaDiv.appendChild(haftaNum);
        
        // Tarih (Düzenlenemez - Düz Metin)
        const tarihDiv = document.createElement('div');
        tarihDiv.textContent = hafta.tarih || ''; // Tarih yoksa boş string
        tarihDiv.style.padding = '6px 0'; // Sadece dikey padding, input görünümünü kaldır
        tarihDiv.style.fontSize = '11px';
        tarihDiv.style.display = 'flex';
        tarihDiv.style.alignItems = 'center';
        haftaDiv.appendChild(tarihDiv);
        
        // Ünite
        const uniteInput = document.createElement('input');
        uniteInput.type = 'text';
        uniteInput.value = hafta.unite;
        uniteInput.onchange = (e) => hafta.unite = e.target.value; // Doğrudan hafta nesnesini güncelle
        haftaDiv.appendChild(uniteInput);
        
        // Konu
        const konuInput = document.createElement('input');
        konuInput.type = 'text';
        konuInput.value = hafta.konu;
        konuInput.onchange = (e) => hafta.konu = e.target.value; // Doğrudan hafta nesnesini güncelle
        haftaDiv.appendChild(konuInput);
        
        // Kazanım
        const kazanimInput = document.createElement('input');
        kazanimInput.type = 'text';
        kazanimInput.value = hafta.kazanim;
        kazanimInput.onchange = (e) => hafta.kazanim = e.target.value; // Doğrudan hafta nesnesini güncelle
        haftaDiv.appendChild(kazanimInput);
        
        // Ders Saati
        const dersSaatiInput = document.createElement('input');
        dersSaatiInput.type = 'number';
        dersSaatiInput.value = hafta.dersSaati;
        dersSaatiInput.min = '1';
        dersSaatiInput.max = '10';
        dersSaatiInput.onchange = (e) => hafta.dersSaati = e.target.value; // Doğrudan hafta nesnesini güncelle
        haftaDiv.appendChild(dersSaatiInput);
        
        // Araç Gereç
        const aracGerecContainer = createAracGerecSelector(hafta.hafta, hafta.aracGerec || []);
        haftaDiv.appendChild(aracGerecContainer);
        
        // Yöntem/Teknik
        const yontemContainer = document.createElement('div');
        yontemContainer.appendChild(createYontemSelect(hafta.hafta, hafta.yontemTeknik || []));
        haftaDiv.appendChild(yontemContainer);
        
        // Düzenle butonu
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.innerHTML = '✏️';
        editBtn.onclick = () => editHafta(index);
        haftaDiv.appendChild(editBtn);
        
        container.appendChild(haftaDiv);
    });

    updateWeekSelectionCount();
}


// Sürükle-Bırak Fonksiyonları
function handleDragStart(event, index) {
    draggedItemIndex = index;
    event.dataTransfer.effectAllowed = 'move';
    event.target.classList.add('dragging'); // Sürüklenen öğeye stil için sınıf
    // event.dataTransfer.setData('text/plain', index); // Gerekirse veri transferi
}

function handleDragEnd(event) {
    if (event.target.classList) { // event.target null değilse
      event.target.classList.remove('dragging');
    }
    // Bırakma hedefi üzerindeki vurguyu kaldır
    document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
    draggedItemIndex = null;
}

function handleDragOver(event) {
    event.preventDefault(); // Bırakmayı mümkün kıl
    event.dataTransfer.dropEffect = 'move';

    const targetElement = event.target.closest('.hafta-item');
    
    // Önce tüm vurguları kaldır
    document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));

    if (targetElement) {
        const targetIndex = parseInt(targetElement.dataset.index);
        if (draggedItemIndex !== null && draggedItemIndex !== targetIndex) {
            targetElement.classList.add('drag-over-target'); // Sadece geçerli bir hedefse vurgula
        }
    }
}

function handleDrop(event) {
    event.preventDefault();
    const targetElement = event.target.closest('.hafta-item');
    
    document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));

    if (!targetElement || draggedItemIndex === null) {
        // handleDragEnd çağrısı burada gereksiz olabilir çünkü zaten dragend'de çağrılıyor.
        return;
    }

    const targetIndex = parseInt(targetElement.dataset.index);

    if (draggedItemIndex !== targetIndex) {
        // yillikPlan dizisini güncelle
        const itemToMove = yillikPlan.splice(draggedItemIndex, 1)[0];
        yillikPlan.splice(targetIndex, 0, itemToMove);

        // Hafta numaralarını yeniden ata (1'den başlayarak)
        // ve diğer inputların onchange fonksiyonlarındaki index bağımlılığını düzeltmek için
        // renderYillikPlan'dan önce hafta.hafta değerlerini güncelle.
        yillikPlan.forEach((h, i) => {
            h.hafta = i + 1; // Hafta numarasını güncelle
        });
        
        // ID'leri de güncellemek gerekebilir, özellikle checkbox ID'leri `week-${hafta.hafta}` şeklinde ise.
        // renderYillikPlan bunu zaten halledecektir.

        renderYillikPlan(); // Listeyi yeniden çiz
        updateAllWeekDates(); // Tarihleri yeniden hesapla ve sırala
    }
    // handleDragEnd burada da çağrılabilir veya dragend olayına bırakılabilir.
    // Genellikle dragend olayı bu temizliği yapar.
}

// Tarih Hesaplama Fonksiyonları
function getMondayOfWeek(year, weekNumber) {
    // Yılın ilk gününü bul
    const firstDayOfYear = new Date(year, 0, 1);
    // İlk Pazartesi'yi bul (ISO 8601'e göre hafta Pazartesi başlar)
    // getDay() Pazar=0, Pazartesi=1, ..., Cumartesi=6
    let daysToAdd = (weekNumber - 1) * 7; // İstenen haftanın başlangıcına git
    
    // Yılın ilk gününün hangi gün olduğuna bağlı olarak düzeltme yap
    // Eğer yılın ilk günü Pazartesi değilse, ilk Pazartesi'ye ulaşmak için gün ekle/çıkar
    const firstDayOfWeekDay = firstDayOfYear.getDay(); // 0 (Pazar) - 6 (Cumartesi)
    let dayOffset = (firstDayOfWeekDay === 0) ? -6 : 1 - firstDayOfWeekDay; // Pazartesi'ye olan fark
    
    const targetDate = new Date(year, 0, 1 + dayOffset + daysToAdd);
    return targetDate;
}

function formatDateRange(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // 7 günlük periyot (Pazartesi'den Pazar'a)

    const startDay = startDate.getDate();
    const endDay = endDate.getDate();

    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    
    const startMonth = months[startDate.getMonth()];
    const endMonth = months[endDate.getMonth()];

    if (startMonth === endMonth) {
        return `${startDay} - ${endDay} ${startMonth}`;
    } else {
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
}

function updateAllWeekDates() {
    const weekInput = document.getElementById('baslangicHaftasi').value;
    if (!weekInput) {
        // Başlangıç haftası seçilmemişse, mevcut tarihleri koru veya temizle
        // Şimdilik, eğer tarihler zaten varsa koruyalım, yoksa boş bırakalım.
        // Eğer her zaman hesaplanması isteniyorsa, burada varsayılan bir başlangıç haftası belirlenebilir.
        yillikPlan.forEach(hafta => {
            if (!hafta.tarih) hafta.tarih = ''; // Eğer tarih yoksa boş kalsın
        });
        renderYillikPlan();
        return;
    }

    const [year, weekNumberStr] = weekInput.split('-W');
    const weekNumber = parseInt(weekNumberStr);

    if (isNaN(year) || isNaN(weekNumber)) {
        console.error("Geçersiz hafta formatı:", weekInput);
        // Hata durumunda tarihleri temizleyebilir veya mevcutları koruyabiliriz.
        yillikPlan.forEach(hafta => hafta.tarih = ''); // Hata durumunda tarihleri temizle
        renderYillikPlan();
        return;
    }
    
    let currentMonday = getMondayOfWeek(parseInt(year), weekNumber);

    yillikPlan.forEach((haftaPlanı, index) => {
        haftaPlanı.tarih = formatDateRange(currentMonday);
        currentMonday.setDate(currentMonday.getDate() + 7); // Bir sonraki haftanın Pazartesi'sine geç
    });

    renderYillikPlan();
}


function toggleAllWeeks(checked) {
    document.querySelectorAll('.week-selector').forEach(checkbox => {
        checkbox.checked = checked;
    });
    updateWeekSelectionCount();
}

function updateWeekSelectionCount() {
    const selectedWeeks = document.querySelectorAll('.week-selector:checked').length;
    const mainCheckbox = document.getElementById('selectAllWeeks');
    const totalWeeks = document.querySelectorAll('.week-selector').length;
    
    // Kısmi seçim durumunu göster
    if (selectedWeeks === 0) {
        mainCheckbox.indeterminate = false;
        mainCheckbox.checked = false;
    } else if (selectedWeeks === totalWeeks) {
        mainCheckbox.indeterminate = false;
        mainCheckbox.checked = true;
    } else {
        mainCheckbox.indeterminate = true;
        mainCheckbox.checked = false;
    }
}

function selectWeeksWithAracGerec() {
    document.querySelectorAll('.week-selector').forEach((checkbox, index) => {
        const hafta = yillikPlan[index];
        checkbox.checked = hafta.aracGerec && hafta.aracGerec.length > 0;
    });
    updateWeekSelectionCount();
}

function selectWeeksWithoutAracGerec() {
    document.querySelectorAll('.week-selector').forEach((checkbox, index) => {
        const hafta = yillikPlan[index];
        checkbox.checked = !hafta.aracGerec || hafta.aracGerec.length === 0;
    });
    updateWeekSelectionCount();
}

function clearWeekSelection() {
    document.querySelectorAll('.week-selector').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateWeekSelectionCount();
}

function applyDefaultAracGerec() {
    // Seçili araç gereçleri al
    const checkboxes = document.querySelectorAll('#aracGerecGroup input[type="checkbox"]:checked');
    const selectedAracGerec = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedAracGerec.length === 0) {
        showApplyMessage('❌ Lütfen önce araç gereç seçiniz!', 'error');
        return;
    }

    // Seçili haftalari al
    const selectedWeekCheckboxes = document.querySelectorAll('.week-selector:checked');
    
    if (selectedWeekCheckboxes.length === 0) {
        showApplyMessage('❌ Lütfen önce hafta seçiniz!', 'error');
        return;
    }

    let affectedWeeks = 0;
    
    selectedWeekCheckboxes.forEach(checkbox => {
        const weekNumber = parseInt(checkbox.id.replace('week-', ''));
        const haftaIndex = yillikPlan.findIndex(h => h.hafta === weekNumber);
        
        if (haftaIndex !== -1) {
            yillikPlan[haftaIndex].aracGerec = [...selectedAracGerec];
            affectedWeeks++;
        }
    });
    
    renderYillikPlan();
    showApplyMessage(`✅ ${affectedWeeks} hafta yeniden belirlendi`, 'success');
}

function applyToAllWeeks() {
    // Seçili araç gereçleri al
    const checkboxes = document.querySelectorAll('#aracGerecGroup input[type="checkbox"]:checked');
    const selectedAracGerec = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedAracGerec.length === 0) {
        showApplyMessage('❌ Lütfen önce araç gereç seçiniz!', 'error');
        return;
    }

    yillikPlan.forEach((hafta, index) => {
        yillikPlan[index].aracGerec = [...selectedAracGerec];
    });
    
    renderYillikPlan();
    showApplyMessage(`✅ Tüm 36 hafta yeniden belirlendi`, 'success');
}

function editHafta(index) {
    const hafta = yillikPlan[index];
    const yeniKonu = prompt(`${hafta.hafta}. Hafta - Konu:`, hafta.konu);
    if (yeniKonu !== null) {
        hafta.konu = yeniKonu;
        renderYillikPlan();
    }
}

function showApplyMessage(text, type) {
    const messageDiv = document.getElementById('applyMessage');
    messageDiv.textContent = text;
    messageDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
    messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';
    messageDiv.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Araç gereç seçenekleri
const tumAracGerec = [
    "Tahta", "Projeksiyon", "Hesap Makinesi", "Bilgisayar", "Akıllı Tahta",
    "Grafik Tablet", "Cetvel Seti", "Pergel", "Gönye", "Çalışma Yaprağı",
    "Model", "Poster", "Video", "Animasyon", "Oyun", "Deney Seti"
];

// Yöntem teknik seçenekleri
const yontemTeknikler = [
    "Anlatım", "Soru-Cevap", "Problem Çözme", "Gösterip Yaptırma", 
    "Grup Çalışması", "Proje", "Beyin Fırtınası", "Tartışma", 
    "Örnek Olay", "Oyun", "Drama", "Deney"
];

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

function createAracGerecSelector(hafta, selectedItems = []) {
    const container = document.createElement('div');
    container.className = 'arac-gerec-container';
    
    const selected = document.createElement('div');
    selected.className = 'arac-gerec-selected';
    selected.onclick = () => toggleDropdown(selected.nextElementSibling);
    
    const dropdown = document.createElement('div');
    dropdown.className = 'arac-gerec-dropdown';
    
    tumAracGerec.forEach(item => {
        const option = document.createElement('div');
        option.className = 'arac-gerec-option';
        option.textContent = item;
        option.onclick = () => toggleAracGerec(hafta, item, selected);
        dropdown.appendChild(option);
    });
    
    container.appendChild(selected);
    container.appendChild(dropdown);
    
    // Seçili öğeleri göster
    updateAracGerecDisplay(selected, selectedItems, hafta);
    
    return container;
}

async function loadDemoData() {
    try {
        const response = await fetch('/demo-data');
        if (!response.ok) {
            let errorText = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json(); // Hata mesajını JSON olarak almayı dene
                errorText = errorData.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
            } catch (e) {
                // JSON parse edilemezse veya mesaj yoksa, response text'ini kullan (varsa)
                const textResponse = await response.text();
                errorText = textResponse || errorText;
            }
            throw new Error(`Demo veri sunucusundan yanıt alınamadı: ${errorText}`);
        }

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('JSON parse hatası:', jsonError);
            throw new Error('Demo verileri işlenirken bir hata oluştu (geçersiz format).');
        }

        // Form alanlarını güvenli bir şekilde doldur
        const fieldsToUpdate = [
            { id: 'okul', dataKey: 'okul' },
            { id: 'ogretmen', dataKey: 'ogretmen' },
            { id: 'ders', dataKey: 'ders' },
            { id: 'sinif', dataKey: 'sinif' },
            { id: 'egitimOgretimYili', dataKey: 'egitimOgretimYili' },
            { id: 'dersSaati', dataKey: 'dersSaati' }
        ];

        fieldsToUpdate.forEach(field => {
            const element = document.getElementById(field.id);
            if (element) {
                element.value = data[field.dataKey] !== undefined ? data[field.dataKey] : ''; // undefined ise boş string
            } else {
                console.warn(`Form elemanı bulunamadı: #${field.id}`);
            }
        });

        // Varsayılan araç gereçleri güvenli bir şekilde seç
        if (Array.isArray(data.varsayilanAracGerec)) {
            varsayilanAracGerec = [...data.varsayilanAracGerec]; // Global değişkeni güncelle (kopya ile)
            varsayilanAracGerec.forEach(item => {
                // Değerdeki özel karakterleri escape etme (basit çözüm)
                // String() ile item'ın string olduğundan emin oluyoruz.
                const escapedItem = String(item).replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
                const checkbox = document.querySelector(`input[value="${escapedItem}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                } else {
                    console.warn(`Araç gereç checkbox bulunamadı: input[value="${escapedItem}"]`);
                }
            });
        } else {
            console.warn('`data.varsayilanAracGerec` bir dizi değil veya tanımsız. Araç gereçler yüklenemedi.');
            varsayilanAracGerec = []; // Hata durumunda boş bir diziye ayarla
        }

        // Haftalık planı güvenli bir şekilde ata
        if (Array.isArray(data.haftalikPlan)) {
            yillikPlan = data.haftalikPlan;
        } else {
            console.warn('`data.haftalikPlan` bir dizi değil veya tanımsız. Haftalık plan yüklenemedi.');
            // İsteğe bağlı: yillikPlan = []; // Eğer veri yoksa planı temizle
        }
        
        // renderYillikPlan(); // updateAllWeekDates zaten çağıracak
        updateAllWeekDates(); // Demo veriler yüklendikten sonra tarihleri hesapla
        showMessage('✅ Demo veriler başarıyla yüklendi! 36 haftalık Matematik planı hazır.', 'success');
        
    } catch (error) {
        console.error('Demo veri yükleme genel hatası:', error);
        showMessage(`❌ Demo veriler yüklenirken hata oluştu: ${error.message}`, 'error');
    }
}

function updateVarsayilanAracGerec() {
    // Bu fonksiyon artık otomatik uygulama yapmıyor
    // Sadece seçimi güncelliyoruz
    const checkboxes = document.querySelectorAll('#aracGerecGroup input[type="checkbox"]:checked');
    varsayilanAracGerec = Array.from(checkboxes).map(cb => cb.value);
}

function updateDersSaati() {
    const dersSaati = document.getElementById('dersSaati').value;
    yillikPlan.forEach(hafta => {
        hafta.dersSaati = dersSaati;
    });
    renderYillikPlan();
}

// Event listeners ve sayfa yüklenme olayları
document.addEventListener('DOMContentLoaded', function() {
    // Sayfa yüklendiğinde boş 36 hafta oluştur
    for (let i = 1; i <= 36; i++) {
        yillikPlan.push({
            hafta: i,
            tarih: '',
            unite: '',
            konu: '',
            kazanim: '',
            dersSaati: '4', // Varsayılan ders saati
            aracGerec: [],
            yontemTeknik: [],
            olcmeDeğerlendirme: '',
            aciklama: ''
        });
    }
    // renderYillikPlan(); // updateAllWeekDates zaten çağıracak
    updateAllWeekDates(); // Sayfa ilk yüklendiğinde tarihleri hesapla (eğer başlangıç haftası varsa)

    // Event listeners
    document.getElementById('baslangicHaftasi').addEventListener('change', updateAllWeekDates);
    document.getElementById('dersSaati').addEventListener('change', updateDersSaati);
    document.querySelectorAll('#aracGerecGroup input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateVarsayilanAracGerec);
    });

    // Form gönderimi
    document.getElementById('planForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const generateBtn = document.getElementById('generateBtn');
        const loading = document.getElementById('loading');
        
        const data = {
            okul: document.getElementById('okul').value,
            ogretmen: document.getElementById('ogretmen').value,
            ders: document.getElementById('ders').value,
            sinif: document.getElementById('sinif').value,
            egitimOgretimYili: document.getElementById('egitimOgretimYili').value,
            dersSaati: document.getElementById('dersSaati').value,
            varsayilanAracGerec: varsayilanAracGerec, // Güncellenmiş
            haftalikPlan: yillikPlan // Güncellenmiş
        };
        
        generateBtn.disabled = true;
        loading.style.display = 'block';
        
        try {
            const response = await fetch('/generate-plan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                // Dosya adını daha anlamlı hale getirelim
                a.download = `yillik_plan_${data.ders.replace(/\s+/g, '_')}_${data.sinif}_${new Date().toISOString().slice(0,10)}.docx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                showMessage('✅ Yıllık plan başarıyla oluşturuldu ve indirildi!', 'success');
            } else {
                // Sunucudan gelen hata mesajını göstermeye çalışalım
                const errorData = await response.json().catch(() => ({ message: 'Sunucu hatası' }));
                throw new Error(errorData.message || 'Sunucu hatası');
            }
        } catch (error) {
            console.error('Hata:', error);
            showMessage(`❌ Plan oluşturulurken hata: ${error.message}`, 'error');
        } finally {
            generateBtn.disabled = false;
            loading.style.display = 'none';
        }
    });

    // Dropdown'ları kapatmak için genel bir event listener
    document.addEventListener('click', function(e) {
        // Eğer tıklanan eleman veya onun bir üst elemanı .arac-gerec-container değilse
        // ve .arac-gerec-selected değilse tüm dropdown'ları kapat
        if (!e.target.closest('.arac-gerec-container') && !e.target.classList.contains('arac-gerec-selected')) {
            document.querySelectorAll('.arac-gerec-dropdown').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }
    });
});
