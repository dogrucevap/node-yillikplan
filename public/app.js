// Tab işlevselliği
function switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    const targetTab = document.getElementById(tabId);
    if (targetTab) targetTab.classList.add('active');
    const buttonForTab = Array.from(document.querySelectorAll('.tab-button')).find(btn => btn.getAttribute('onclick')?.includes(`switchTab('${tabId}')`));
    if (buttonForTab) buttonForTab.classList.add('active');
    if (tabId === 'yillik-plan') {
        loadSavedPlans(); 
        updateSidebarActionButtonsState(); 
    }
}

// Sidebar Kontrolleri
const settingsSidebar = document.getElementById('settingsSidebar');
const sidebarTitle = document.getElementById('sidebarTitle');
const sidebarGlobalBackBtn = document.getElementById('sidebarGlobalBackBtn');
let currentSidebarView = 'mainMenuView';

function openSidebar() {
    if (settingsSidebar) {
        settingsSidebar.classList.add('open');
    }
    navigateToView('mainMenuView'); 
}

function closeSidebar() {
    if (settingsSidebar) {
        settingsSidebar.classList.remove('open');
    }
}

function navigateToView(targetViewId) {
    const views = document.querySelectorAll('.sidebar-view');
    const targetView = document.getElementById(targetViewId);
    const currentActiveView = document.getElementById(currentSidebarView);

    if (!targetView || targetViewId === currentSidebarView) return;

    // Geriye gidiliyorsa animasyon yönünü tersine çevir (isteğe bağlı)
    const isNavigatingBack = targetViewId === 'mainMenuView';

    views.forEach(view => {
        view.classList.remove('prev-view', 'active-view');
    });

    if (currentActiveView) {
        currentActiveView.classList.add('prev-view');
    }
    
    targetView.classList.add('active-view');
    
    // Ana menüye dönerken prev-view'i hemen kaldır
    if (isNavigatingBack && currentActiveView) {
         setTimeout(() => {
            currentActiveView.classList.remove('prev-view');
         }, 300); // transition süresiyle eşleşmeli
    }
    
    currentSidebarView = targetViewId;

    // Başlığı ve geri butonunu güncelle
    if (sidebarTitle && sidebarGlobalBackBtn) {
        if (targetViewId === 'mainMenuView') {
            sidebarTitle.textContent = 'Ayarlar';
            sidebarGlobalBackBtn.style.display = 'none';
        } else if (targetViewId === 'aracGerecView') {
            sidebarTitle.textContent = 'Araç-Gereç Yönetimi';
            sidebarGlobalBackBtn.style.display = 'inline-block';
        } else if (targetViewId === 'dersSaatiView') {
            sidebarTitle.textContent = 'Ders Saati Yönetimi';
            sidebarGlobalBackBtn.style.display = 'inline-block';
        } else if (targetViewId === 'yontemTeknikView') {
            sidebarTitle.textContent = 'Yöntem ve Teknik Yönetimi';
            sidebarGlobalBackBtn.style.display = 'inline-block';
        } else if (targetViewId === 'ogretmenYonetimiView') {
            sidebarTitle.textContent = 'Müdür ve Öğretmenler';
            sidebarGlobalBackBtn.style.display = 'inline-block';
            sidebarGlobalBackBtn.dataset.viewTarget = 'mainMenuView'; // Geri dönüş ana menüye
        } else if (targetViewId === 'ogretmenEkleView') {
            sidebarTitle.textContent = 'Yeni Müdür/Öğretmen Ekle';
            sidebarGlobalBackBtn.style.display = 'inline-block';
            sidebarGlobalBackBtn.dataset.viewTarget = 'ogretmenYonetimiView'; // Geri dönüş öğretmen yönetimine
        }
    }
}

// Yardımcı Fonksiyonlar
function getThirdMondayWeekInSeptember(year) {
    let mondayCount = 0;
    let thirdMondayDate = null;
    for (let day = 1; day <= 30; day++) {
        const date = new Date(year, 8, day); 
        if (date.getDay() === 1) { 
            mondayCount++;
            if (mondayCount === 3) {
                thirdMondayDate = date;
                break;
            }
        }
    }
    if (thirdMondayDate) {
        const firstDayOfYear = new Date(thirdMondayDate.getFullYear(), 0, 1);
        const pastDaysOfYear = (thirdMondayDate - firstDayOfYear) / 86400000;
        const dayOfWeekOffset = (firstDayOfYear.getDay() === 0) ? 6 : firstDayOfYear.getDay() - 1;
        const weekNumber = Math.ceil((pastDaysOfYear + 1 + dayOfWeekOffset) / 7);
        return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    }
    return null;
}

function setDefaultBaslangicHaftasi() {
    const egitimOgretimYiliSelect = document.getElementById('egitimOgretimYili');
    const baslangicHaftasiInput = document.getElementById('baslangicHaftasi');
    if (egitimOgretimYiliSelect && baslangicHaftasiInput) {
        const egitimYiliValue = egitimOgretimYiliSelect.value;
        if (egitimYiliValue && egitimYiliValue.includes('-')) {
            const startYear = parseInt(egitimYiliValue.split('-')[0], 10);
            if (!isNaN(startYear)) {
                const defaultWeek = getThirdMondayWeekInSeptember(startYear);
                baslangicHaftasiInput.value = defaultWeek || '';
                updateAllWeekDates();
            }
        } else {
            baslangicHaftasiInput.value = '';
            updateAllWeekDates();
        }
    }
}

function populateEgitimOgretimYiliOptions() {
    const selectElement = document.getElementById('egitimOgretimYili');
    if (!selectElement) return;
    selectElement.innerHTML = '';
    const currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); 
    let activeStartYear = (currentMonth >= 8) ? currentYear : currentYear - 1; 
    for (let i = 0; i < 4; i++) {
        const year1 = activeStartYear + i;
        const year2 = year1 + 1;
        const optionValue = `${year1}-${year2}`;
        const optionElement = document.createElement('option');
        optionElement.value = optionValue;
        optionElement.textContent = optionValue;
        if (i === 0) optionElement.selected = true;
        selectElement.appendChild(optionElement);
    }
}

// --- DERS SAATİ YÖNETİMİ ---
let seciliDersSaati = null;

function selectDersSaati(saat) {
    seciliDersSaati = saat;
    const buttons = document.querySelectorAll('.ders-saati-btn');
    buttons.forEach(btn => {
        if (btn.dataset.saat === saat) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });
}

function applyDersSaatiToAll() {
    if (seciliDersSaati === null) {
        showMessage("Lütfen önce bir ders saati seçin.", "error");
        return;
    }
    const newDersSaati = seciliDersSaati;
    document.getElementById('dersSaati').value = newDersSaati; // Ana formdaki inputu da güncelle
    baseAcademicPlan.forEach(hafta => {
        hafta.dersSaati = newDersSaati;
    });
    updateAllWeekDates(); // Bu fonksiyon renderYillikPlan'ı çağırarak tabloyu günceller
    showMessage(`${newDersSaati} ders saati tüm haftalara uygulandı.`, "success");
}


// Global Değişkenler
let yillikPlan = [];
let baseAcademicPlan = [];
let currentEditingPlanId = null;
let tumAracGerecListesi = [];
let tumYontemTeknikListesi = [];
let tumOgretmenlerListesi = []; // Yeni global değişken
let planaEklenenOgretmenler = []; // Yeni global değişken
const TATIL_DONEMLERI = { ARA_TATIL_1: { duration: 1, afterAcademicWeek: 9, label: "1. Ara Tatil" }, YARIYIL_TATILI: { duration: 2, afterAcademicWeek: 18, label: "Yarıyıl Tatili" }, ARA_TATIL_2: { duration: 1, afterAcademicWeek: 27, label: "2. Ara Tatil" }};
const TOPLAM_AKADEMIK_HAFTA = 36;
let draggedItemIndex = null;

// --- ARAÇ-GEREÇ SIDEBAR FONKSİYONLARI ---
async function loadAllAracGerecTipleri() {
    try {
        const response = await fetch('/api/arac-gerec-tipleri');
        if (!response.ok) throw new Error('Araç-gereç tipleri sunucudan yüklenemedi.');
        const data = await response.json();
        tumAracGerecListesi = Array.isArray(data) ? data : [];
        populateSidebarAracGerec();
    } catch (error) {
        console.error("Araç-gereç tipleri yükleme hatası:", error);
        showMessage(`❌ Araç-gereç listesi yüklenemedi: ${error.message}`, 'error');
        tumAracGerecListesi = ["Tahta", "Projeksiyon", "Hesap Makinesi", "Bilgisayar", "Akıllı Tahta"];
        populateSidebarAracGerec();
    }
}

function populateSidebarAracGerec() {
    const listContainer = document.getElementById('sidebarAracGerecList');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    const selectedItems = getSelectedSidebarAracGerec(); // Mevcut seçili olanları al

    tumAracGerecListesi.sort().forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'item-button-wrapper';

        const button = document.createElement('button');
        button.className = 'item-button';
        button.textContent = item;
        button.dataset.value = item;
        if (selectedItems.includes(item)) {
            button.classList.add('selected');
        }
        button.onclick = () => { // Tıklama olayı zaten toggle yapıyor, bu kısım doğru.
            button.classList.toggle('selected');
            // İsteğe bağlı: Seçim değiştiğinde bir eylem tetiklenebilir.
            // Örneğin, seçili araç-gereçleri bir yerde göstermek veya
            // ilgili haftalara uygulama butonlarını aktif/pasif etmek.
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'item-delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-minus"></i>';
        deleteBtn.title = `"${item}" adlı aracı sil`;
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteAracGerecTipi(item);
        };
        
        wrapper.appendChild(button);
        wrapper.appendChild(deleteBtn);
        listContainer.appendChild(wrapper);
    });
}

async function addCustomAracGerec() {
    const inputElement = document.getElementById('customAracGerecInput');
    if (!inputElement) return;
    const newItemName = inputElement.value.trim();
    if (!newItemName) {
        showMessage("Lütfen eklenecek araç-gereç adını girin.", "error"); return;
    }
    if (tumAracGerecListesi.includes(newItemName)) {
        showMessage(`"${newItemName}" zaten listede mevcut.`, 'error'); return;
    }
    try {
        const response = await fetch('/api/arac-gerec-tipleri', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newItemName })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Sunucu hatası: ${response.status}`);
        await loadAllAracGerecTipleri(); 
        inputElement.value = ''; 
        showMessage(`"${newItemName}" başarıyla eklendi.`, 'success');
    } catch (error) {
        console.error("Yeni araç-gereç ekleme hatası:", error);
        showMessage(`❌ Araç-gereç eklenirken hata: ${error.message}`, 'error');
    }
}

async function deleteAracGerecTipi(itemName) {
    if (!confirm(`"${itemName}" adlı araç-gereci silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
        const response = await fetch(`/api/arac-gerec-tipleri/${encodeURIComponent(itemName)}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Sunucu hatası: ${response.status}`);
        showMessage(result.message, 'success');
        await loadAllAracGerecTipleri(); 
    } catch (error) {
        console.error("Araç-gereç silme hatası:", error);
        showMessage(`❌ Araç-gereç silinirken hata: ${error.message}`, 'error');
    }
}

function getSelectedSidebarAracGerec() {
    const selected = [];
    const buttons = document.querySelectorAll('#sidebarAracGerecList .item-button.selected');
    buttons.forEach(btn => selected.push(btn.dataset.value));
    return selected;
}

// --- YÖNTEM-TEKNİK SIDEBAR FONKSİYONLARI ---
async function loadAllYontemTeknikTipleri() {
    try {
        const response = await fetch('/api/yontem-teknik-tipleri');
        if (!response.ok) throw new Error('Yöntem ve teknik tipleri sunucudan yüklenemedi.');
        const data = await response.json();
        tumYontemTeknikListesi = Array.isArray(data) ? data : [];
        populateSidebarYontemTeknik();
    } catch (error) {
        console.error("Yöntem ve teknik tipleri yükleme hatası:", error);
        showMessage(`❌ Yöntem/teknik listesi yüklenemedi: ${error.message}`, 'error');
        tumYontemTeknikListesi = ["Anlatım", "Soru-Cevap", "Problem Çözme", "Grup Çalışması"];
        populateSidebarYontemTeknik();
    }
}

function populateSidebarYontemTeknik() {
    const listContainer = document.getElementById('sidebarYontemTeknikList');
    if (!listContainer) return;
    listContainer.innerHTML = '';
    const selectedItems = getSelectedSidebarYontemTeknik(); // Mevcut seçili olanları al

    tumYontemTeknikListesi.sort().forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'item-button-wrapper';

        const button = document.createElement('button');
        button.className = 'item-button';
        button.textContent = item;
        button.dataset.value = item;
        if (selectedItems.includes(item)) {
            button.classList.add('selected');
        }
        button.onclick = () => { // Tıklama olayı zaten toggle yapıyor, bu kısım doğru.
            button.classList.toggle('selected');
            // İsteğe bağlı: Seçim değiştiğinde bir eylem tetiklenebilir.
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'item-delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-minus"></i>';
        deleteBtn.title = `"${item}" adlı yöntemi/tekniği sil`;
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteYontemTeknikTipi(item);
        };
        
        wrapper.appendChild(button);
        wrapper.appendChild(deleteBtn);
        listContainer.appendChild(wrapper);
    });
}

async function addCustomYontemTeknik() {
    const inputElement = document.getElementById('customYontemTeknikInput');
    if (!inputElement) return;
    const newItemName = inputElement.value.trim();
    if (!newItemName) {
        showMessage("Lütfen eklenecek yöntem/teknik adını girin.", "error"); return;
    }
    if (tumYontemTeknikListesi.includes(newItemName)) {
        showMessage(`"${newItemName}" zaten listede mevcut.`, 'error'); return;
    }
    try {
        const response = await fetch('/api/yontem-teknik-tipleri', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newItemName })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Sunucu hatası: ${response.status}`);
        await loadAllYontemTeknikTipleri(); 
        inputElement.value = ''; 
        showMessage(`"${newItemName}" başarıyla eklendi.`, 'success');
    } catch (error) {
        console.error("Yeni yöntem/teknik ekleme hatası:", error);
        showMessage(`❌ Yöntem/teknik eklenirken hata: ${error.message}`, 'error');
    }
}

async function deleteYontemTeknikTipi(itemName) {
    if (!confirm(`"${itemName}" adlı yöntemi/tekniği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
    try {
        const response = await fetch(`/api/yontem-teknik-tipleri/${encodeURIComponent(itemName)}`, { method: 'DELETE' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Sunucu hatası: ${response.status}`);
        showMessage(result.message, 'success');
        await loadAllYontemTeknikTipleri(); 
    } catch (error) {
        console.error("Yöntem/teknik silme hatası:", error);
        showMessage(`❌ Yöntem/teknik silinirken hata: ${error.message}`, 'error');
    }
}

function getSelectedSidebarYontemTeknik() {
    const selected = [];
    const buttons = document.querySelectorAll('#sidebarYontemTeknikList .item-button.selected');
    buttons.forEach(btn => selected.push(btn.dataset.value));
    return selected;
}

function applyYontemTeknikAction(actionType) {
    const selectedItems = getSelectedSidebarYontemTeknik();
    if (selectedItems.length === 0 && (actionType.includes('esitle') || actionType.includes('ekle'))) {
        showMessage("Lütfen kenar çubuğundan en az bir yöntem/teknik seçin.", "error"); return;
    }
    const seciliHaftaElements = document.querySelectorAll('#haftaContainer .week-checkbox:checked:not(:disabled)');
    const seciliHaftaOriginalWeeks = Array.from(seciliHaftaElements).map(cb => {
        const idParts = cb.id.split('-');
        if (idParts.length === 2 && idParts[0] === 'week') return parseInt(idParts[1]);
        return null;
    }).filter(id => id !== null);

    if ((actionType.includes('Secili')) && seciliHaftaOriginalWeeks.length === 0) {
        showMessage("Lütfen yıllık plandan en az bir akademik hafta seçin.", "error"); return;
    }
    let changed = false;
    baseAcademicPlan.forEach(baseHafta => {
        const isTargetWeek = actionType.includes('Tum') || (actionType.includes('Secili') && seciliHaftaOriginalWeeks.includes(baseHafta.originalAcademicWeek));
        if (isTargetWeek) {
            changed = true;
            if (actionType.startsWith('esitle')) baseHafta.yontemTeknik = [...selectedItems];
            else if (actionType.startsWith('ekle')) {
                baseHafta.yontemTeknik = baseHafta.yontemTeknik || [];
                selectedItems.forEach(item => { if (!baseHafta.yontemTeknik.includes(item)) baseHafta.yontemTeknik.push(item); });
            }
        }
    });
    yillikPlan.forEach(planHafta => {
        if (planHafta.type === 'academic') {
            const correspondingBase = baseAcademicPlan.find(bh => bh.originalAcademicWeek === planHafta.originalAcademicWeek);
            if (correspondingBase) planHafta.yontemTeknik = [...(correspondingBase.yontemTeknik || [])];
        }
    });
    if (changed) { renderYillikPlan(); showMessage("Yöntem ve teknikler güncellendi.", "success"); }
    else showMessage("İşlem yapılacak uygun hafta bulunamadı veya değişiklik yapılmadı.", "error");
}


function applyAracGerecAction(actionType) {
    const selectedAracGerecInSidebar = getSelectedSidebarAracGerec();
    if (selectedAracGerecInSidebar.length === 0 && (actionType.includes('esitle') || actionType.includes('ekle'))) {
        showMessage("Lütfen kenar çubuğundan en az bir araç-gereç seçin.", "error"); return;
    }
    const seciliHaftaElements = document.querySelectorAll('#haftaContainer .week-checkbox:checked:not(:disabled)');
    const seciliHaftaOriginalWeeks = Array.from(seciliHaftaElements).map(cb => {
        const idParts = cb.id.split('-');
        if (idParts.length === 2 && idParts[0] === 'week') return parseInt(idParts[1]);
        return null;
    }).filter(id => id !== null);

    if ((actionType.includes('Secili')) && seciliHaftaOriginalWeeks.length === 0) {
        showMessage("Lütfen yıllık plandan en az bir akademik hafta seçin.", "error"); return;
    }
    let changed = false;
    baseAcademicPlan.forEach(baseHafta => {
        const isTargetWeek = actionType.includes('Tum') || (actionType.includes('Secili') && seciliHaftaOriginalWeeks.includes(baseHafta.originalAcademicWeek));
        if (isTargetWeek) {
            changed = true;
            if (actionType.startsWith('esitle')) baseHafta.aracGerec = [...selectedAracGerecInSidebar];
            else if (actionType.startsWith('ekle')) {
                baseHafta.aracGerec = baseHafta.aracGerec || [];
                selectedAracGerecInSidebar.forEach(item => { if (!baseHafta.aracGerec.includes(item)) baseHafta.aracGerec.push(item); });
            }
        }
    });
    yillikPlan.forEach(planHafta => {
        if (planHafta.type === 'academic') {
            const correspondingBase = baseAcademicPlan.find(bh => bh.originalAcademicWeek === planHafta.originalAcademicWeek);
            if (correspondingBase) planHafta.aracGerec = [...(correspondingBase.aracGerec || [])];
        }
    });
    if (changed) { renderYillikPlan(); showMessage("Araç-gereçler güncellendi.", "success"); }
    else showMessage("İşlem yapılacak uygun hafta bulunamadı veya değişiklik yapılmadı.", "error");
}

function updateSidebarActionButtonsState() {
    const seciliHaftaElements = document.querySelectorAll('#haftaContainer .week-checkbox:checked:not(:disabled)');
    const hasSelectedWeeks = seciliHaftaElements.length > 0;
    const esitleSeciliBtn = document.getElementById('esitleSeciliHaftalarBtn');
    const ekleSeciliBtn = document.getElementById('ekleSeciliHaftalaraBtn');
    if(esitleSeciliBtn) esitleSeciliBtn.disabled = !hasSelectedWeeks;
    if(ekleSeciliBtn) ekleSeciliBtn.disabled = !hasSelectedWeeks;

    // Müdür ve Öğretmenler için buton durumu
    const addSelectedOgretmenToPlanBtn = document.getElementById('addSelectedOgretmenToPlanBtn');
    if (addSelectedOgretmenToPlanBtn) {
        const selectedOgretmenler = document.querySelectorAll('#sidebarOgretmenList .ogretmen-item-button.selected');
        addSelectedOgretmenToPlanBtn.disabled = selectedOgretmenler.length === 0;
    }
}

// --- MÜDÜR VE ÖĞRETMEN YÖNETİMİ ---
let currentEditingOgretmenId = null; // Düzenleme için

async function loadAllOgretmenler() {
    try {
        const response = await fetch('/api/ogretmenler');
        if (!response.ok) throw new Error('Öğretmen listesi sunucudan yüklenemedi.');
        const data = await response.json();
        // Gelen veri: [{id, ad_soyad, unvan}, ...]
        // İstemci tarafında kullanılan format: {id, name, branch, isMudur}
        tumOgretmenlerListesi = Array.isArray(data) ? data.map(o => ({
            id: o.id,
            name: o.ad_soyad,
            branch: o.unvan,
            isMudur: o.unvan ? o.unvan.toLowerCase().includes('müdür') : false
        })) : [];
        populateSidebarOgretmenList();
    } catch (error) {
        console.error("Öğretmen listesi yükleme hatası:", error);
        showMessage(`❌ Öğretmen listesi yüklenemedi: ${error.message}`, 'error');
        tumOgretmenlerListesi = []; // Hata durumunda boş liste
        populateSidebarOgretmenList();
    }
}

function populateSidebarOgretmenList() {
    const listContainer = document.getElementById('sidebarOgretmenList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    // Silme butonu için bir fonksiyon (sunucuya istek gönderecek)
    async function deleteOgretmenFromDb(ogretmenId, ogretmenAdi) {
        if (!confirm(`"${ogretmenAdi}" adlı kişiyi veritabanından kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) return;
        try {
            const response = await fetch(`/api/ogretmenler/${ogretmenId}`, { method: 'DELETE' });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Silme başarısız');
            
            showMessage(`"${ogretmenAdi}" başarıyla veritabanından silindi.`, "success");
            await loadAllOgretmenler(); // Listeyi yeniden yükle
            // Plana eklenmişse plandan da çıkar
            removeOgretmenFromPlan(ogretmenId); // Bu fonksiyon zaten renderPlanImzaAlanlari ve sidebar seçimini günceller
        } catch (error) {
            showMessage(`❌ Veritabanından silme hatası: ${error.message}`, "error");
        }
    }


    tumOgretmenlerListesi.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(ogretmen => {
        const wrapper = document.createElement('div'); // Her öğretmen için bir sarmalayıcı
        wrapper.className = 'ogretmen-item-wrapper';


        const button = document.createElement('button');
        button.className = 'ogretmen-item-button';
        button.dataset.id = ogretmen.id;
        // Plana eklenen öğretmenler listesinde bu ID varsa seçili yap
        if (planaEklenenOgretmenler.some(p => p.id === ogretmen.id)) {
            button.classList.add('selected');
        }
        button.onclick = () => {
            button.classList.toggle('selected');
            updateSidebarActionButtonsState();
        };

        const infoDiv = document.createElement('div');
        infoDiv.className = 'ogretmen-info';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'ogretmen-name';
        nameSpan.textContent = ogretmen.name; // `ad_soyad` yerine `name`
        const branchSpan = document.createElement('span');
        branchSpan.className = 'ogretmen-branch';
        branchSpan.textContent = `${ogretmen.branch}${ogretmen.isMudur ? ' (Müdür)' : ''}`; // `unvan` yerine `branch`
        infoDiv.appendChild(nameSpan);
        infoDiv.appendChild(document.createElement('br'));
        infoDiv.appendChild(branchSpan);

        button.appendChild(infoDiv);
        // wrapper.appendChild(button); // Butonu sarmalayıcıya ekle

        // Düzenleme ve Silme butonları için ayrı bir div
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'ogretmen-item-actions';

        const editBtn = document.createElement('button');
        editBtn.className = 'ogretmen-edit-btn icon-btn'; // icon-btn sınıfı eklendi
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i>'; // Kalem ikonu
        editBtn.title = `"${ogretmen.name}" kişisini düzenle`;
        editBtn.onclick = (e) => {
            e.stopPropagation(); 
            currentEditingOgretmenId = ogretmen.id;
            document.getElementById('ogretmenAdiSoyadiInput').value = ogretmen.name;
            document.getElementById('ogretmenUnvanInput').value = ogretmen.branch; // unvan input'u olmalı
            // isMudurCheckbox'ı unvana göre ayarla (Müdür/Müdür Yrd. vs)
            const unvanLower = (ogretmen.branch || "").toLowerCase();
            document.getElementById('isMudurCheckbox').checked = unvanLower.includes('müdür');
            navigateToView('ogretmenEkleView');
        };
        
        const deleteDbBtn = document.createElement('button');
        deleteDbBtn.className = 'ogretmen-delete-db-btn icon-btn'; // icon-btn sınıfı eklendi
        deleteDbBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; // Çöp kutusu ikonu
        deleteDbBtn.title = `"${ogretmen.name}" kişisini veritabanından sil`;
        deleteDbBtn.onclick = (e) => {
            e.stopPropagation();
            deleteOgretmenFromDb(ogretmen.id, ogretmen.name);
        };

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteDbBtn);
        
        // button.appendChild(actionsDiv); // Butonun içine değil, sarmalayıcıya
        wrapper.appendChild(button); // Önce ana tıklanabilir alanı ekle
        wrapper.appendChild(actionsDiv); // Sonra aksiyon butonlarını ekle

        listContainer.appendChild(wrapper);
    });
    updateSidebarActionButtonsState();
}

async function saveOgretmen() {
    const adiSoyadiInput = document.getElementById('ogretmenAdiSoyadiInput');
    const unvanInput = document.getElementById('ogretmenUnvanInput'); // ID 'ogretmenBransInput' yerine 'ogretmenUnvanInput' olmalı (HTML'de de)

    const ad_soyad = adiSoyadiInput.value.trim();
    const unvan = unvanInput.value.trim();
    // isMudurCheckbox artık doğrudan sunucuya gönderilmiyor, unvan üzerinden belirleniyor.
    // Ancak istemci tarafında `planaEklenenOgretmenler` için kullanılabilir.

    if (!ad_soyad || !unvan) {
        showMessage("Lütfen ad soyad ve unvan alanlarını doldurun.", "error");
        return;
    }

    // Sunucuya gönderilecek veri
    const dataToSend = { ad_soyad, unvan };
    let url = '/api/ogretmenler';
    let method = 'POST';

    // NOT: Sunucu şu anda öğretmen güncelleme (PUT /api/ogretmenler/:id) desteklemiyor.
    // Bu yüzden currentEditingOgretmenId olsa bile, bu ID'yi kullanarak bir güncelleme
    // API çağrısı yapamayız. Bu özellik eklenene kadar, "düzenleme" aslında
    // mevcut bir öğretmenin bilgilerini forma yükler ve kullanıcı "Kaydet"e bastığında
    // YENİ bir öğretmen olarak eklemeye çalışır (eğer ad_soyad UNIQUE ise).
    // Bu ideal değil, ancak sunucu tarafı güncellenene kadar geçici bir durum.
    if (currentEditingOgretmenId) {
        // Burada PUT isteği olmalıydı ama sunucu desteklemiyor.
        // Kullanıcıyı bilgilendirebilir veya yeni kayıt olarak devam edebiliriz.
        // Şimdilik, her zaman POST ile yeni ekleme yapıyoruz.
        // Eğer aynı ad_soyad ile biri varsa, sunucu UNIQUE constraint hatası verecektir.
        console.warn(`Düzenleme modu aktif (ID: ${currentEditingOgretmenId}), ancak sunucu PUT desteklemiyor. Yeni kayıt olarak POST edilecek.`);
    }

    try {
        const response = await fetch(url, { // Her zaman POST
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSend)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Sunucu hatası: ${response.status}`);
        
        await loadAllOgretmenler(); // Listeyi ve dropdown'ı günceller
        adiSoyadiInput.value = '';
        unvanInput.value = '';
        document.getElementById('isMudurCheckbox').checked = false; // Bu checkbox hala UI'da varsa sıfırla
        currentEditingOgretmenId = null;
        showMessage(`"${ad_soyad}" (${unvan}) başarıyla eklendi.`, 'success');
        navigateToView('ogretmenYonetimiView');
    } catch (error) {
        console.error("Öğretmen kaydetme hatası:", error);
        showMessage(`❌ Öğretmen kaydedilirken hata: ${error.message}`, 'error');
    }
}

// async function deleteOgretmen(ogretmenId) { // Şimdilik silme butonu yok, düzenleme var.
//     if (!confirm("Bu kişiyi silmek istediğinizden emin misiniz?")) return;
//     try {
//         const response = await fetch(`/api/ogretmenler/${ogretmenId}`, { method: 'DELETE' });
//         if (!response.ok) { const res = await response.json(); throw new Error(res.error || 'Silme başarısız'); }
//         await loadAllOgretmenler();
//         // Plana eklenmişse plandan da çıkar
//         planaEklenenOgretmenler = planaEklenenOgretmenler.filter(o => o.id !== ogretmenId);
//         renderPlanImzaAlanlari();
//         showMessage("Kişi başarıyla silindi.", "success");
//     } catch (error) {
//         showMessage(`❌ Silme hatası: ${error.message}`, "error");
//     }
// }

function getSelectedSidebarOgretmenler() {
    const selected = [];
    document.querySelectorAll('#sidebarOgretmenList .ogretmen-item-button.selected').forEach(btn => {
        const ogretmen = tumOgretmenlerListesi.find(o => o.id === btn.dataset.id);
        if (ogretmen) selected.push(ogretmen);
    });
    return selected;
}

function addSelectedOgretmenToPlan() {
    const secilenler = getSelectedSidebarOgretmenler();
    if (secilenler.length === 0) {
        showMessage("Lütfen plandaki imza alanına eklemek için en az bir müdür/öğretmen seçin.", "error");
        return;
    }
    secilenler.forEach(secilen => {
        if (!planaEklenenOgretmenler.find(p => p.id === secilen.id)) {
            planaEklenenOgretmenler.push({...secilen});
        }
    });
    // Müdür her zaman listenin başında olsun (eğer varsa)
    planaEklenenOgretmenler.sort((a, b) => {
        if (a.isMudur && !b.isMudur) return -1;
        if (!a.isMudur && b.isMudur) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });
    renderPlanImzaAlanlari();
    showMessage("Seçilen kişiler imza alanına eklendi.", "success");
}

function removeOgretmenFromPlan(ogretmenId) {
    planaEklenenOgretmenler = planaEklenenOgretmenler.filter(o => o.id !== ogretmenId);
    renderPlanImzaAlanlari();
    // Sidebar'daki seçimi de kaldır
    const sidebarButton = document.querySelector(`#sidebarOgretmenList .ogretmen-item-button[data-id="${ogretmenId}"]`);
    if (sidebarButton) sidebarButton.classList.remove('selected');
    updateSidebarActionButtonsState();
}

function renderPlanImzaAlanlari() {
    const container = document.getElementById('planImzaAlanlariContainer');
    if (!container) return;
    container.innerHTML = '';
    if (planaEklenenOgretmenler.length === 0) {
        container.innerHTML = '<p style="padding: 10px; color: #777; text-align: center;">İmza alanına eklenmiş kimse yok.</p>';
        return;
    }
    planaEklenenOgretmenler.forEach(ogretmen => {
        const wrapper = document.createElement('div');
        wrapper.className = 'item-button-wrapper'; // Mevcut stili kullanabiliriz

        const button = document.createElement('button');
        button.className = 'item-button'; // Mevcut stili kullanabiliriz
        button.textContent = `${ogretmen.name} (${ogretmen.branch}${ogretmen.isMudur ? ', Müdür' : ''})`;
        button.disabled = true; // Sadece gösterim amaçlı

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'item-delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-minus"></i>';
        deleteBtn.title = `"${ogretmen.name}" kişisini plandan kaldır`;
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            removeOgretmenFromPlan(ogretmen.id);
        };
        
        wrapper.appendChild(button);
        wrapper.appendChild(deleteBtn);
        container.appendChild(wrapper);
    });
}

function getAdditionalTeachers() {
    // planaEklenenOgretmenler listesi {id, name, branch, isMudur} formatında
    // Sunucuya gönderilecek format {name, branch, isPrincipal}
    return planaEklenenOgretmenler.map(o => ({
        name: o.name,       // Bu, istemcideki ad_soyad'a karşılık gelir
        branch: o.branch,   // Bu, istemcideki unvan'a karşılık gelir
        isPrincipal: o.isMudur // isMudur, unvanın "müdür" içerip içermediğine göre belirlenir
    }));
}


// --- YÖNTEM/TEKNİK GÖRSELLEŞTİRME ---
function toggleYontemTeknik(academicWeekNum, item, selectedContainer) {
    const planEntry = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
    if (!planEntry) return;
    planEntry.yontemTeknik = planEntry.yontemTeknik || [];
    const index = planEntry.yontemTeknik.indexOf(item);
    if (index > -1) planEntry.yontemTeknik.splice(index, 1); else planEntry.yontemTeknik.push(item);
    const basePlanEntry = baseAcademicPlan.find(h => h.originalAcademicWeek === academicWeekNum);
    if(basePlanEntry) basePlanEntry.yontemTeknik = [...planEntry.yontemTeknik];
    updateYontemTeknikDisplay(selectedContainer, planEntry.yontemTeknik, academicWeekNum);
}

function updateYontemTeknikDisplay(container, items, academicWeekNum) {
    container.innerHTML = '';
    (items || []).forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'arac-gerec-tag'; // Stili yeniden kullan
        tag.innerHTML = `${item} <span class="remove" onclick="removeYontemTeknik(${academicWeekNum}, '${item}')">×</span>`;
        container.appendChild(tag);
    });
    if (!items || items.length === 0) container.innerHTML = '<span style="color: #999; font-size: 10px;">Yöntem/teknik seçin</span>';
}

function removeYontemTeknik(academicWeekNum, item) {
    const planEntry = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
    if (!planEntry || !planEntry.yontemTeknik) return;
    const index = planEntry.yontemTeknik.indexOf(item);
    if (index > -1) {
        planEntry.yontemTeknik.splice(index, 1);
        const basePlanEntry = baseAcademicPlan.find(h => h.originalAcademicWeek === academicWeekNum);
        if(basePlanEntry && basePlanEntry.yontemTeknik) {
            const baseIndex = basePlanEntry.yontemTeknik.indexOf(item);
            if (baseIndex > -1) basePlanEntry.yontemTeknik.splice(baseIndex, 1);
        }
        renderYillikPlan();
    }
}

function createYontemTeknikSelector(academicWeekNum, selectedItems = []) { 
    const container = document.createElement('div'); container.className = 'arac-gerec-container';
    const selected = document.createElement('div'); selected.className = 'arac-gerec-selected';
    selected.onclick = () => toggleDropdown(selected.nextElementSibling);
    const dropdown = document.createElement('div'); dropdown.className = 'arac-gerec-dropdown';
    tumYontemTeknikListesi.forEach(item => {
        const option = document.createElement('div'); option.className = 'arac-gerec-option';
        option.textContent = item;
        option.onclick = () => toggleYontemTeknik(academicWeekNum, item, selected);
        dropdown.appendChild(option);
    });
    container.appendChild(selected); container.appendChild(dropdown);
    updateYontemTeknikDisplay(selected, selectedItems || [], academicWeekNum);
    return container;
}


// --- HAFTALIK PLAN GÖRSELLEŞTİRME VE DÜZENLEME ---
function toggleDropdown(dropdown) { dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block'; }
function toggleAracGerec(academicWeekNum, item, selectedContainer) {
    const planEntry = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
    if (!planEntry) return;
    planEntry.aracGerec = planEntry.aracGerec || [];
    const index = planEntry.aracGerec.indexOf(item);
    if (index > -1) planEntry.aracGerec.splice(index, 1); else planEntry.aracGerec.push(item);
    const basePlanEntry = baseAcademicPlan.find(h => h.originalAcademicWeek === academicWeekNum);
    if(basePlanEntry) basePlanEntry.aracGerec = [...planEntry.aracGerec];
    updateAracGerecDisplay(selectedContainer, planEntry.aracGerec, academicWeekNum);
}
function updateAracGerecDisplay(container, items, academicWeekNum) {
    container.innerHTML = '';
    (items || []).forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'arac-gerec-tag';
        tag.innerHTML = `${item} <span class="remove" onclick="removeAracGerec(${academicWeekNum}, '${item}')">×</span>`;
        container.appendChild(tag);
    });
    if (!items || items.length === 0) container.innerHTML = '<span style="color: #999; font-size: 10px;">Araç gereç seçin</span>';
}
function removeAracGerec(academicWeekNum, item) {
    const planEntry = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
    if (!planEntry || !planEntry.aracGerec) return;
    const index = planEntry.aracGerec.indexOf(item);
    if (index > -1) {
        planEntry.aracGerec.splice(index, 1);
        const basePlanEntry = baseAcademicPlan.find(h => h.originalAcademicWeek === academicWeekNum);
        if(basePlanEntry && basePlanEntry.aracGerec) {
            const baseIndex = basePlanEntry.aracGerec.indexOf(item);
            if (baseIndex > -1) basePlanEntry.aracGerec.splice(baseIndex, 1);
        }
        renderYillikPlan();
    }
}
function createAracGerecSelector(academicWeekNum, selectedItems = []) { 
    const container = document.createElement('div'); container.className = 'arac-gerec-container';
    const selected = document.createElement('div'); selected.className = 'arac-gerec-selected';
    selected.onclick = () => toggleDropdown(selected.nextElementSibling);
    const dropdown = document.createElement('div'); dropdown.className = 'arac-gerec-dropdown';
    tumAracGerecListesi.forEach(item => {
        const option = document.createElement('div'); option.className = 'arac-gerec-option';
        option.textContent = item;
        option.onclick = () => toggleAracGerec(academicWeekNum, item, selected);
        dropdown.appendChild(option);
    });
    container.appendChild(selected); container.appendChild(dropdown);
    updateAracGerecDisplay(selected, selectedItems || [], academicWeekNum);
    return container;
}
function renderYillikPlan() {
    const container = document.getElementById('haftaContainer');
    if (!container) { console.error("Hata: 'haftaContainer' ID'li element bulunamadı."); showMessage("❌ Yıllık plan gösterim alanı yüklenemedi. Sayfayı yenileyin.", "error"); return; }
    container.innerHTML = '';
    container.removeEventListener('dragover', handleDragOver); container.addEventListener('dragover', handleDragOver);
    container.removeEventListener('drop', handleDrop); container.addEventListener('drop', handleDrop);
    yillikPlan.forEach((haftaData, index) => {
        const haftaDiv = document.createElement('div'); haftaDiv.className = 'hafta-item'; haftaDiv.dataset.index = index;
        if (haftaData.type === 'holiday') { haftaDiv.classList.add('holiday-week'); haftaDiv.draggable = false; }
        else { haftaDiv.draggable = true; haftaDiv.addEventListener('dragstart', (event) => handleDragStart(event, index)); haftaDiv.addEventListener('dragend', handleDragEnd); }
        const selectDiv = document.createElement('div'); selectDiv.style.display = 'flex'; selectDiv.style.alignItems = 'center'; selectDiv.style.justifyContent = 'center';
        const selectCheckbox = document.createElement('input'); selectCheckbox.type = 'checkbox';
        const holidayIdSuffix = haftaData.type === 'holiday' ? `holiday-${index}-${(haftaData.label || 'tatil').replace(/\s+/g, '').toLowerCase()}` : haftaData.originalAcademicWeek;
        selectCheckbox.id = `week-${holidayIdSuffix}`;
        selectCheckbox.className = 'week-selector week-checkbox'; 
        selectCheckbox.disabled = haftaData.type === 'holiday';
        selectCheckbox.addEventListener('change', updateSidebarActionButtonsState);
        selectDiv.appendChild(selectCheckbox); haftaDiv.appendChild(selectDiv);
        const haftaNum = document.createElement('div');
        haftaNum.textContent = haftaData.type === 'academic' ? haftaData.originalAcademicWeek : haftaData.label;
        if(haftaData.type === 'holiday') haftaNum.style.fontWeight = 'bold';
        haftaDiv.appendChild(haftaNum);
        const tarihDiv = document.createElement('div'); tarihDiv.textContent = haftaData.tarih || ''; haftaDiv.appendChild(tarihDiv);
        if (haftaData.type === 'academic') {
            const dersSaatiInput = document.createElement('input'); dersSaatiInput.type = 'number'; dersSaatiInput.value = haftaData.dersSaati || ''; dersSaatiInput.min = '1';
            dersSaatiInput.onchange = (e) => { haftaData.dersSaati = e.target.value; const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === haftaData.originalAcademicWeek); if(baseEntry) baseEntry.dersSaati = e.target.value; };
            haftaDiv.appendChild(dersSaatiInput);
            const uniteInput = document.createElement('input'); uniteInput.type = 'text'; uniteInput.value = haftaData.unite || '';
            uniteInput.onchange = (e) => { haftaData.unite = e.target.value; const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === haftaData.originalAcademicWeek); if(baseEntry) baseEntry.unite = e.target.value; };
            haftaDiv.appendChild(uniteInput);
            const konuInput = document.createElement('input'); konuInput.type = 'text'; konuInput.value = haftaData.konu || '';
            konuInput.onchange = (e) => { haftaData.konu = e.target.value; const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === haftaData.originalAcademicWeek); if(baseEntry) baseEntry.konu = e.target.value; };
            haftaDiv.appendChild(konuInput);
            const kazanimInput = document.createElement('input'); kazanimInput.type = 'text'; kazanimInput.value = haftaData.kazanim || '';
            kazanimInput.onchange = (e) => { haftaData.kazanim = e.target.value; const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === haftaData.originalAcademicWeek); if(baseEntry) baseEntry.kazanim = e.target.value; };
            haftaDiv.appendChild(kazanimInput);
            const aracGerecContainer = createAracGerecSelector(haftaData.originalAcademicWeek, haftaData.aracGerec || []);
            haftaDiv.appendChild(aracGerecContainer);
            const yontemContainer = createYontemTeknikSelector(haftaData.originalAcademicWeek, haftaData.yontemTeknik || []);
            haftaDiv.appendChild(yontemContainer);
            const editBtn = document.createElement('button'); editBtn.type = 'button'; editBtn.innerHTML = '✏️'; editBtn.onclick = () => alert("Bu özellik yapım aşamasındadır.");
            haftaDiv.appendChild(editBtn);
        } else { 
            const emptyDersSaatiCell = document.createElement('div'); haftaDiv.appendChild(emptyDersSaatiCell);
            const tatilAciklamaDiv = document.createElement('div'); tatilAciklamaDiv.className = 'tatil-aciklama-hucre';
            tatilAciklamaDiv.textContent = haftaData.label || "Tatil";
            haftaDiv.appendChild(tatilAciklamaDiv);
            const emptyEditCell = document.createElement('div'); haftaDiv.appendChild(emptyEditCell);
        }
        container.appendChild(haftaDiv);
    });
    updateSidebarActionButtonsState();
}
function handleDragStart(event, index) {
    const draggedElement = yillikPlan[index];
    if (!draggedElement || draggedElement.type === 'holiday') { event.preventDefault(); return; }
    draggedItemIndex = index; event.dataTransfer.effectAllowed = 'move'; event.target.classList.add('dragging');
}
function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
    draggedItemIndex = null;
}
function handleDragOver(event) {
    event.preventDefault();
    const targetElement = event.target.closest('.hafta-item');
    document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
    if (targetElement && draggedItemIndex !== null) {
        const targetIndex = parseInt(targetElement.dataset.index);
        if (yillikPlan[targetIndex].type === 'academic' && draggedItemIndex !== targetIndex) targetElement.classList.add('drag-over-target');
    }
}
function handleDrop(event) {
    event.preventDefault();
    const targetElement = event.target.closest('.hafta-item');
    document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
    if (!targetElement || draggedItemIndex === null) return;
    const toIndex = parseInt(targetElement.dataset.index);
    const draggedItem = yillikPlan[draggedItemIndex];
    const targetItem = yillikPlan[toIndex];
    if (draggedItem.type === 'academic' && targetItem.type === 'academic') {
        const fromAcademicIndex = baseAcademicPlan.findIndex(h => h.originalAcademicWeek === draggedItem.originalAcademicWeek);
        const toAcademicIndex = baseAcademicPlan.findIndex(h => h.originalAcademicWeek === targetItem.originalAcademicWeek);
        if (fromAcademicIndex !== toAcademicIndex) {
            const [movedItem] = baseAcademicPlan.splice(fromAcademicIndex, 1);
            baseAcademicPlan.splice(toAcademicIndex, 0, movedItem);
            updateAllWeekDates();
        }
    }
}
function getMondayOfWeek(year, weekNumber) {
    const firstDayOfYear = new Date(year, 0, 1);
    let daysToAdd = (weekNumber - 1) * 7;
    const firstDayOfWeekDay = firstDayOfYear.getDay(); 
    let dayOffset = (firstDayOfWeekDay === 0) ? -6 : 1 - firstDayOfWeekDay; 
    const targetDate = new Date(year, 0, 1 + dayOffset + daysToAdd);
    return targetDate;
}
function formatDateRange(startDate, durationInWeeks = 1) {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (durationInWeeks * 7) - 3); 
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const startMonth = months[startDate.getMonth()];
    const endMonth = months[endDate.getMonth()];
    return startMonth === endMonth ? `${startDay}-${endDay} ${startMonth}` : `${startDay} ${startMonth}-${endDay} ${endMonth}`;
}
function updateAllWeekDates() {
    const weekInput = document.getElementById('baslangicHaftasi').value;
    baseAcademicPlan.forEach((item, idx) => item.originalAcademicWeek = idx + 1);
    const newPlan = [];
    let academicPlanIndex = 0; 
    if (!weekInput) {
        let currentPlanIndex = 0;
        while(currentPlanIndex < baseAcademicPlan.length || Object.values(TATIL_DONEMLERI).some(t => t.afterAcademicWeek >= academicPlanIndex)) {
            let holidayInserted = false;
            for (const key in TATIL_DONEMLERI) {
                if (TATIL_DONEMLERI[key].afterAcademicWeek === academicPlanIndex) {
                    const holiday = TATIL_DONEMLERI[key];
                    newPlan.push({ type: 'holiday', label: holiday.label, tarih: '', duration: holiday.duration });
                    holidayInserted = true; break; 
                }
            }
            if (academicPlanIndex < baseAcademicPlan.length) {
                 newPlan.push({ ...baseAcademicPlan[academicPlanIndex], type: 'academic', tarih: '' });
                 academicPlanIndex++;
            } else if (!holidayInserted) break;
            if (newPlan.length > (TOPLAM_AKADEMIK_HAFTA + 10)) { console.error("Sonsuz döngü ihtimali updateAllWeekDates (tarihsiz)."); break;}
        }
        yillikPlan = newPlan; renderYillikPlan(); return;
    }
    const [yearStr, weekNumberStr] = weekInput.split('-W');
    const year = parseInt(yearStr);
    const weekNumber = parseInt(weekNumberStr);
    let currentMonday = getMondayOfWeek(year, weekNumber);
    academicPlanIndex = 0; 
    while(academicPlanIndex < baseAcademicPlan.length) {
        for (const holidayKey in TATIL_DONEMLERI) {
            if (TATIL_DONEMLERI[holidayKey].afterAcademicWeek === academicPlanIndex) {
                 const holiday = TATIL_DONEMLERI[holidayKey];
                 const holidayStartDate = new Date(currentMonday);
                 newPlan.push({ type: 'holiday', label: holiday.label, tarih: formatDateRange(holidayStartDate, holiday.duration), duration: holiday.duration });
                 currentMonday.setDate(currentMonday.getDate() + (7 * holiday.duration)); break; 
            }
        }
        if (academicPlanIndex < baseAcademicPlan.length) { 
            const academicWeekData = baseAcademicPlan[academicPlanIndex];
            newPlan.push({ ...academicWeekData, type: 'academic', tarih: formatDateRange(new Date(currentMonday)) });
            currentMonday.setDate(currentMonday.getDate() + 7);
            academicPlanIndex++;
        } else break; 
    }
    for (const holidayKey in TATIL_DONEMLERI) {
        if (TATIL_DONEMLERI[holidayKey].afterAcademicWeek === baseAcademicPlan.length) {
             const holiday = TATIL_DONEMLERI[holidayKey];
             const holidayStartDate = new Date(currentMonday);
             newPlan.push({ type: 'holiday', label: holiday.label, tarih: formatDateRange(holidayStartDate, holiday.duration), duration: holiday.duration });
             currentMonday.setDate(currentMonday.getDate() + (7 * holiday.duration)); break;
        }
    }
    yillikPlan = newPlan; renderYillikPlan();
}
function updateDersSaati() {
    const newDersSaati = document.getElementById('dersSaati').value;
    baseAcademicPlan.forEach(hafta => { hafta.dersSaati = newDersSaati; });
    renderYillikPlan(); 
}
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text; messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 5000);
}
async function loadSavedPlans() {
    try {
        const response = await fetch('/api/plans');
        if (!response.ok) throw new Error('Kaydedilmiş planlar yüklenemedi.');
        const plans = await response.json();
        const listContainer = document.getElementById('savedPlansListContainer');
        if (!listContainer) { console.error("Container bulunamadı: savedPlansListContainer"); return; }
        listContainer.innerHTML = '';
        if (plans.length === 0) { listContainer.innerHTML = '<p>Kaydedilmiş plan bulunmuyor.</p>'; return; }
        const ul = document.createElement('ul'); ul.className = 'saved-plan-items-list';
        plans.forEach(plan => {
            const li = document.createElement('li'); li.className = 'saved-plan-item';
            const planInfo = document.createElement('span');
            planInfo.textContent = `${plan.plan_name} (${plan.ders || 'Bilinmeyen Ders'} - ${plan.sinif || 'Bilinmeyen Sınıf'})`;
            const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'saved-plan-buttons';
            const loadButton = document.createElement('button'); loadButton.type = 'button'; loadButton.textContent = 'Yükle';
            loadButton.onclick = () => loadSpecificPlan(plan.id);
            const downloadButton = document.createElement('button'); downloadButton.type = 'button'; downloadButton.textContent = 'İndir (Word)';
            downloadButton.className = 'download-saved-btn'; downloadButton.onclick = () => generatePlanForSaved(plan.id);
            const deleteButton = document.createElement('button'); deleteButton.type = 'button'; deleteButton.textContent = 'Sil';
            deleteButton.className = 'delete-btn'; deleteButton.onclick = () => deletePlan(plan.id);
            buttonsDiv.appendChild(loadButton); buttonsDiv.appendChild(downloadButton); buttonsDiv.appendChild(deleteButton);
            li.appendChild(planInfo); li.appendChild(buttonsDiv); ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    } catch (error) {
        showMessage(`❌ Kayıtlı planlar yüklenirken hata: ${error.message}`, 'error');
        const listContainer = document.getElementById('savedPlansListContainer');
        if (listContainer) listContainer.innerHTML = '<p style="color:red;">Kayıtlı planlar yüklenemedi.</p>';
    }
}
async function deletePlan(planId) {
    if (!confirm("Bu planı silmek istediğinizden emin misiniz?")) return;
    try {
        const response = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
        if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Plan silinemedi.'); }
        showMessage('🗑️ Plan başarıyla silindi.', 'success'); loadSavedPlans();
    } catch (error) { showMessage(`❌ Plan silinirken hata: ${error.message}`, 'error'); }
}
async function generatePlanForSaved(planId) {
    showMessage('⏳ Kaydedilmiş plan Word olarak hazırlanıyor...', 'success');
    const loading = document.getElementById('loading'); if(loading) loading.style.display = 'block';
    try {
        const planResponse = await fetch(`/api/plans/${planId}`);
        if (!planResponse.ok) { const errorData = await planResponse.json().catch(() => ({ message: 'Kaydedilmiş plan verisi alınamadı.' })); throw new Error(errorData.error || errorData.message || 'Kaydedilmiş plan verisi alınamadı.');}
        const planData = await planResponse.json(); // planData.ogretmen burada ad_soyad içerir
        const dataForDoc = { 
            okul: planData.okul, 
            ogretmen: planData.ogretmen, // Dersi veren öğretmenin ad_soyad'ı
            ders: planData.ders, 
            sinif: planData.sinif, 
            egitimOgretimYili: planData.egitim_ogretim_yili, 
            dersSaati: planData.ders_saati, 
            haftalikPlan: planData.plan_data_json || [], 
            additionalTeachers: planData.additional_teachers_json || [] // Sunucudan gelen additional_teachers_json
        };
        const docResponse = await fetch('/generate-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataForDoc) });
        if (docResponse.ok) {
            const blob = await docResponse.blob(); const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            const safePlanName = planData.plan_name.replace(/[^a-zA-Z0-9]/g, '_');
            a.download = `yillik_plan_${safePlanName}_${new Date().toISOString().slice(0,10)}.docx`;
            document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
            showMessage('✅ Kaydedilmiş plan başarıyla indirildi!', 'success');
        } else { const errorData = await docResponse.json().catch(() => ({ message: 'Sunucu hatası (Word oluşturma)' })); throw new Error(errorData.error || errorData.message || 'Kaydedilmiş plan için Word belgesi oluşturulamadı.');}
    } catch (error) { console.error('Kaydedilmiş plan indirme hatası:', error); showMessage(`❌ Kaydedilmiş plan indirilirken hata: ${error.message}`, 'error');
    } finally { if(loading) loading.style.display = 'none'; }
}
async function saveCurrentPlan() {
    let planName = document.getElementById('currentPlanNameInput').value.trim();
    if (!planName) {
        currentEditingPlanId = null; 
        const now = new Date(); const year = now.getFullYear(); const month = String(now.getMonth() + 1).padStart(2, '0'); const day = String(now.getDate()).padStart(2, '0'); const hours = String(now.getHours()).padStart(2, '0'); const minutes = String(now.getMinutes()).padStart(2, '0');
        planName = `Plan-${year}${month}${day}-${hours}${minutes}`;
        document.getElementById('currentPlanNameInput').value = planName;
        showMessage(`ℹ️ Plan adı otomatik olarak "${planName}" şeklinde belirlendi.`, 'success');
    }

    // Dersi veren öğretmeni `planaEklenenOgretmenler` listesinden al
    let dersiVerenOgretmenKayit = planaEklenenOgretmenler.find(o => o.branch && !o.branch.toLowerCase().includes('müdür'));
     if (!dersiVerenOgretmenKayit && planaEklenenOgretmenler.length > 0) {
        dersiVerenOgretmenKayit = planaEklenenOgretmenler[0];
    }

    if (!dersiVerenOgretmenKayit && !currentEditingPlanId) { // Yeni plan kaydediliyorsa en az bir öğretmen/müdür imza alanında olmalı
        showMessage("Lütfen imza alanına en az bir öğretmen/müdür ekleyin. Dersi veren öğretmen bu listeden seçilecektir.", "error");
        return;
    }
    const dersiVerenOgretmenAdiKayit = dersiVerenOgretmenKayit ? dersiVerenOgretmenKayit.name : "";


    const dataToSave = {
        plan_name: planName, 
        okul: document.getElementById('okul').value, 
        ogretmen: dersiVerenOgretmenAdiKayit, 
        ders: document.getElementById('ders').value, 
        sinif: document.getElementById('sinif').value,
        egitim_ogretim_yili: document.getElementById('egitimOgretimYili').value, 
        ders_saati: document.getElementById('dersSaati').value,
        varsayilan_arac_gerec: getSelectedSidebarAracGerec(), 
        plan_data_json: yillikPlan, 
        base_academic_plan_json: baseAcademicPlan, 
        additional_teachers_json: getAdditionalTeachers(), // Sunucu `additional_teachers_json` bekliyor olabilir, kontrol et. server.js `additional_teachers` bekliyor.
                                                       // server.js'deki POST /api/plans endpoint'i `additional_teachers` bekliyor.
                                                       // Bu yüzden `additional_teachers: getAdditionalTeachers()` olmalı.
        plan_id: currentEditingPlanId 
    };
    // Düzeltme: Sunucu `additional_teachers` bekliyor.
    dataToSave.additional_teachers = getAdditionalTeachers();
    delete dataToSave.additional_teachers_json; // Yanlış anahtarı sil


    try {
        const response = await fetch('/api/plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSave) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Plan kaydedilemedi.');
        showMessage(`✅ "${planName}" başarıyla kaydedildi/güncellendi.`, 'success');
        if (result.id && !currentEditingPlanId) currentEditingPlanId = result.id;
        loadSavedPlans();
    } catch (error) { showMessage(`❌ Plan kaydedilirken hata: ${error.message}`, 'error'); }
}
async function loadSpecificPlan(planId) {
    try {
        const response = await fetch(`/api/plans/${planId}`);
        if (!response.ok) throw new Error('Plan yüklenemedi.');
        const data = await response.json();
        document.getElementById('okul').value = data.okul || '';
        // Dersi veren öğretmen bilgisi artık `additionalTeachers` (planaEklenenOgretmenler) içinde yönetilecek.
        // `data.ogretmen` (kayıtlı plandaki ana öğretmen adı) `planaEklenenOgretmenler` listesine eklenirken dikkate alınacak.
        document.getElementById('ders').value = data.ders || '';
        document.getElementById('sinif').value = data.sinif || '';
        document.getElementById('egitimOgretimYili').value = data.egitim_ogretim_yili || '';
        document.getElementById('dersSaati').value = data.ders_saati || '4';
        document.getElementById('currentPlanNameInput').value = data.plan_name || ''; 
        currentEditingPlanId = data.id; 
        const savedAracGerec = Array.isArray(data.varsayilan_arac_gerec) ? data.varsayilan_arac_gerec : [];
        savedAracGerec.forEach(item => { if (!tumAracGerecListesi.includes(item)) tumAracGerecListesi.push(item); });
        populateSidebarAracGerec(); 
        document.querySelectorAll('#sidebarAracGerecList .item-button').forEach(btn => { // Checkbox değil buton
            if (savedAracGerec.includes(btn.dataset.value)) btn.classList.add('selected');
            else btn.classList.remove('selected');
        });
        
        // Kayıtlı öğretmenleri yükle ve plana eklenenleri ayarla
        planaEklenenOgretmenler = []; // Önce temizle
        if (data.additional_teachers_json && Array.isArray(data.additional_teachers_json)) {
            // Backend'den gelen additional_teachers_json: [{name, branch, isPrincipal}, ...]
            // tumOgretmenlerListesi: [{id, name, branch, isMudur}, ...]
            data.additional_teachers_json.forEach(savedTeacherInfo => {
                // `name` (ad_soyad) ve `branch` (unvan) üzerinden eşleştirme yapıyoruz.
                // ID olmadığı için bu %100 güvenilir olmayabilir ama mevcut yapıda en iyisi bu.
                const foundInGlobalList = tumOgretmenlerListesi.find(globalO => 
                    globalO.name === savedTeacherInfo.name && globalO.branch === savedTeacherInfo.branch
                );
                if (foundInGlobalList) {
                    // Eğer dersi veren öğretmen değilse ekle (çünkü o ayrı yönetiliyor)
                    const dersiVerenOgretmenAdi = document.getElementById('dersiVerenOgretmenSelect')?.selectedOptions[0]?.text;
                    if (foundInGlobalList.name !== dersiVerenOgretmenAdi) {
                         if (!planaEklenenOgretmenler.find(p => p.id === foundInGlobalList.id)) {
                            planaEklenenOgretmenler.push({...foundInGlobalList});
                         }
                    }
                } else { 
                    // Eğer global listede yoksa, bu bir sorun olabilir.
                    // Kullanıcıyı bilgilendirebilir veya geçici olarak ekleyebiliriz.
                    // Şimdilik, plana eklemiyoruz ve konsola uyarı yazıyoruz.
                    console.warn(`Kaydedilmiş ek öğretmen "${savedTeacherInfo.name} (${savedTeacherInfo.branch})" genel öğretmen listesinde bulunamadı.`);
                }
            });
        }
        planaEklenenOgretmenler.sort((a, b) => { // Müdür başta olacak şekilde sırala
            if (a.isMudur && !b.isMudur) return -1;
            if (!a.isMudur && b.isMudur) return 1;
            return (a.name || '').localeCompare(b.name || '');
        });
        renderPlanImzaAlanlari();
        populateSidebarOgretmenList(); // Sidebar'daki öğretmen listesini de güncelle (seçili olanları göstermek için)

        baseAcademicPlan = Array.isArray(data.base_academic_plan_json) ? data.base_academic_plan_json.map(h => ({...h})) : [];
        yillikPlan = Array.isArray(data.plan_data_json) ? data.plan_data_json.map(h => ({...h})) : [];
        if (yillikPlan.length > 0) renderYillikPlan();
        else setDefaultBaslangicHaftasi(); 
        switchTab('yillik-plan'); 
        showMessage(`✅ "${data.plan_name}" planı yüklendi.`, 'success');
    } catch (error) { showMessage(`❌ Plan yüklenirken hata: ${error.message}`, 'error'); }
}
async function loadDemoData() { 
    try { showMessage("Demo planını 'Kaydedilmiş Planlar' listesinden yükleyebilirsiniz.", "success"); }
    catch (error) { console.error('Demo veri yükleme (eski) hatası:', error); showMessage(`❌ Demo veriler yüklenirken hata oluştu: ${error.message}`, 'error'); }
}

// Kritik UI olaylarını diğerlerinden ayırarak hemen ata
document.addEventListener('DOMContentLoaded', function() {
    const settingsBtn = document.getElementById('settingsBtn');
    const closeSettingsSidebarBtn = document.getElementById('closeSettingsSidebarBtn');
    
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSidebar);
    }
    if (closeSettingsSidebarBtn) {
        closeSettingsSidebarBtn.addEventListener('click', closeSidebar);
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    populateEgitimOgretimYiliOptions();
    await Promise.all([loadAllAracGerecTipleri(), loadAllYontemTeknikTipleri(), loadAllOgretmenler()]); // Öğretmenleri de yükle
    // document.getElementById('addTeacherBtn').addEventListener('click', () => addTeacherRow()); // Bu satır zaten kaldırılmıştı
    const egitimOgretimYiliSelect = document.getElementById('egitimOgretimYili');
    if (egitimOgretimYiliSelect) egitimOgretimYiliSelect.addEventListener('change', setDefaultBaslangicHaftasi);
    
    // "Yeni Müdür/Öğretmen Ekle" formundaki unvan inputunun ID'si 'ogretmenUnvanInput' olarak güncellendi.
    // "Müdür mü?" checkbox'ının unvana göre otomatik işaretlenmesi (Yeni Ekle formunda)
    const unvanInputForCheckbox = document.getElementById('ogretmenUnvanInput'); 
    const isMudurCheckboxForNew = document.getElementById('isMudurCheckbox');
    if (unvanInputForCheckbox && isMudurCheckboxForNew) {
        unvanInputForCheckbox.addEventListener('input', function() {
            const unvanText = this.value.toLowerCase();
            isMudurCheckboxForNew.checked = unvanText.includes('müdür');
        });
    }
    
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.addEventListener('click', function(e) { e.preventDefault(); navigateToView(this.dataset.viewTarget); });
    });
    // Global geri butonu için event listener
    const globalBackBtn = document.getElementById('sidebarGlobalBackBtn');
    if(globalBackBtn) globalBackBtn.addEventListener('click', function(e) { e.preventDefault(); navigateToView(this.dataset.viewTarget); });

    // Ders Saati Yönetimi Butonları
    document.querySelectorAll('.ders-saati-btn').forEach(button => {
        button.addEventListener('click', function() {
            selectDersSaati(this.dataset.saat);
        });
    });
    document.getElementById('applyDersSaatiToAllBtn')?.addEventListener('click', applyDersSaatiToAll);

    // Araç-Gereç Butonları
    const addCustomAracGerecBtn = document.getElementById('addCustomAracGerecBtn');
    if(addCustomAracGerecBtn) addCustomAracGerecBtn.addEventListener('click', addCustomAracGerec);
    document.getElementById('agEsitleTumHaftalarBtn')?.addEventListener('click', () => applyAracGerecAction('esitleTum'));
    document.getElementById('agEsitleSeciliHaftalarBtn')?.addEventListener('click', () => applyAracGerecAction('esitleSecili'));
    document.getElementById('agEkleTumHaftalaraBtn')?.addEventListener('click', () => applyAracGerecAction('ekleTum'));
    document.getElementById('agEkleSeciliHaftalaraBtn')?.addEventListener('click', () => applyAracGerecAction('ekleSecili'));

    // Yöntem-Teknik Butonları
    const addCustomYontemTeknikBtn = document.getElementById('addCustomYontemTeknikBtn');
    if(addCustomYontemTeknikBtn) addCustomYontemTeknikBtn.addEventListener('click', addCustomYontemTeknik);
    document.getElementById('ytEsitleTumHaftalarBtn')?.addEventListener('click', () => applyYontemTeknikAction('esitleTum'));
    document.getElementById('ytEsitleSeciliHaftalarBtn')?.addEventListener('click', () => applyYontemTeknikAction('esitleSecili'));
    document.getElementById('ytEkleTumHaftalaraBtn')?.addEventListener('click', () => applyYontemTeknikAction('ekleTum'));
    document.getElementById('ytEkleSeciliHaftalaraBtn')?.addEventListener('click', () => applyYontemTeknikAction('ekleSecili'));

    // Müdür ve Öğretmen Yönetimi Butonları
    document.getElementById('navigateToOgretmenEkleBtn')?.addEventListener('click', () => {
        currentEditingOgretmenId = null; // Yeni ekleme modunda olduğumuzu belirt
        document.getElementById('ogretmenAdiSoyadiInput').value = '';
        document.getElementById('ogretmenBransInput').value = '';
        document.getElementById('isMudurCheckbox').checked = false;
        navigateToView('ogretmenEkleView');
    });
    document.getElementById('saveOgretmenBtn')?.addEventListener('click', saveOgretmen);
    document.getElementById('addSelectedOgretmenToPlanBtn')?.addEventListener('click', addSelectedOgretmenToPlan);

    const defaultDersSaati = document.getElementById('dersSaati').value || '4';
    if (baseAcademicPlan.length === 0) {
        for (let i = 1; i <= TOPLAM_AKADEMIK_HAFTA; i++) {
            baseAcademicPlan.push({ originalAcademicWeek: i, unite: '', konu: '', kazanim: '', dersSaati: defaultDersSaati, aracGerec: [], yontemTeknik: [], olcmeDeğerlendirme: '', aciklama: '' });
        }
    }
    setDefaultBaslangicHaftasi(); 
    loadSavedPlans(); 
    document.getElementById('baslangicHaftasi').addEventListener('change', updateAllWeekDates);
    document.getElementById('dersSaati').addEventListener('change', updateDersSaati);
    document.getElementById('planForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const generateBtn = document.getElementById('generateBtn');
        const loading = document.getElementById('loading');
        
        // Dersi veren öğretmeni `planaEklenenOgretmenler` listesinden al
        // Genellikle "Öğretmen" unvanlı ilk kişi veya müdür olmayan ilk kişi.
        // Ya da kullanıcıya birincil öğretmen seçtirme mekanizması eklenebilir.
        // Şimdilik, müdür olmayan ilk kişiyi dersi veren öğretmen olarak kabul edelim.
        // Eğer hiç öğretmen yoksa veya hepsi müdürse, kullanıcı uyarılmalı.
        let dersiVerenOgretmen = planaEklenenOgretmenler.find(o => o.branch && !o.branch.toLowerCase().includes('müdür'));
        if (!dersiVerenOgretmen && planaEklenenOgretmenler.length > 0) {
            // Eğer hepsi müdürse veya branşı olmayan varsa, ilk kişiyi alalım (geçici çözüm)
            dersiVerenOgretmen = planaEklenenOgretmenler[0];
             showMessage("Uyarı: Dersi veren öğretmen olarak atanacak uygun bir öğretmen bulunamadı. İmza listesindeki ilk kişi kullanılacak. Lütfen öğretmenlerin unvanlarını kontrol edin.", "warning");
        }

        if (!dersiVerenOgretmen) {
            showMessage("Lütfen imza alanına en az bir öğretmen (veya müdür) ekleyin. Dersi veren öğretmen bu listeden seçilecektir.", "error");
            return;
        }
        const dersiVerenOgretmenAdi = dersiVerenOgretmen.name;


        const data = { 
            okul: document.getElementById('okul').value, 
            ogretmen: dersiVerenOgretmenAdi, 
            ders: document.getElementById('ders').value, 
            sinif: document.getElementById('sinif').value, 
            egitimOgretimYili: document.getElementById('egitimOgretimYili').value, 
            dersSaati: document.getElementById('dersSaati').value, 
            haftalikPlan: yillikPlan, 
            additionalTeachers: getAdditionalTeachers().filter(t => t.name !== dersiVerenOgretmenAdi) // Dersi veren öğretmeni additionalTeachers'dan çıkar
        };
        generateBtn.disabled = true; loading.style.display = 'block';
        try {
            const response = await fetch('/generate-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
            if (response.ok) {
                const blob = await response.blob(); const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = url;
                a.download = `yillik_plan_${data.ders.replace(/\s+/g, '_')}_${data.sinif}_${new Date().toISOString().slice(0,10)}.docx`;
                document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
                showMessage('✅ Yıllık plan başarıyla oluşturuldu ve indirildi!', 'success');
            } else { const errorData = await response.json().catch(() => ({ message: 'Sunucu hatası' })); throw new Error(errorData.error || 'Sunucu hatası'); }
        } catch (error) { showMessage(`❌ Plan oluşturulurken hata: ${error.message}`, 'error');
        } finally { generateBtn.disabled = false; loading.style.display = 'none'; }
    });
});
