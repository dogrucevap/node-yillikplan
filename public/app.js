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
    tumAracGerecListesi.sort().forEach((item, index) => {
        const id = `sidebar-ag-${index}`;
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item sidebar-arac-gerec-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox'; checkbox.id = id; checkbox.value = item;
        const label = document.createElement('label');
        label.htmlFor = id; label.textContent = item;
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-arac-gerec-btn';
        deleteBtn.innerHTML = '<i class="fas fa-minus-circle"></i>';
        deleteBtn.title = `"${item}" adlı araç-gereci sil`;
        deleteBtn.onclick = () => deleteAracGerecTipi(item);
        checkboxItem.appendChild(checkbox);
        checkboxItem.appendChild(label);
        checkboxItem.appendChild(deleteBtn);
        listContainer.appendChild(checkboxItem);
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
    const checkboxes = document.querySelectorAll('#sidebarAracGerecList input[type="checkbox"]:checked');
    checkboxes.forEach(cb => selected.push(cb.value));
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
    tumYontemTeknikListesi.sort().forEach((item, index) => {
        const id = `sidebar-yt-${index}`;
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item sidebar-arac-gerec-item'; // Stil aynı kalabilir
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox'; checkbox.id = id; checkbox.value = item;
        const label = document.createElement('label');
        label.htmlFor = id; label.textContent = item;
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-arac-gerec-btn'; // Stil aynı kalabilir
        deleteBtn.innerHTML = '<i class="fas fa-minus-circle"></i>';
        deleteBtn.title = `"${item}" adlı yöntemi/tekniği sil`;
        deleteBtn.onclick = () => deleteYontemTeknikTipi(item);
        checkboxItem.appendChild(checkbox);
        checkboxItem.appendChild(label);
        checkboxItem.appendChild(deleteBtn);
        listContainer.appendChild(checkboxItem);
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
    const checkboxes = document.querySelectorAll('#sidebarYontemTeknikList input[type="checkbox"]:checked');
    checkboxes.forEach(cb => selected.push(cb.value));
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
}

// --- ÖĞRETMEN EKLEME ---
function addTeacherRow(teacher = { name: '', branch: '' }) {
    const container = document.getElementById('additionalTeachersContainer');
    const teacherDiv = document.createElement('div');
    teacherDiv.className = 'form-row-3'; teacherDiv.style.marginBottom = '10px'; teacherDiv.style.alignItems = 'center';
    teacherDiv.innerHTML = `
        <div class="form-group" style="margin-bottom: 0;"><input type="text" class="additional-teacher-name" placeholder="Öğretmen Adı Soyadı" value="${teacher.name || ''}" required></div>
        <div class="form-group" style="margin-bottom: 0;"><input type="text" class="additional-teacher-branch" placeholder="Branşı / Görevi" value="${teacher.branch || ''}" required></div>
        <button type="button" class="demo-btn" style="background: #c0392b; padding: 8px;" onclick="this.parentElement.remove()">Kaldır</button>`;
    container.appendChild(teacherDiv);
}
function getAdditionalTeachers() {
    const teachers = [];
    const mudurAdiInput = document.getElementById('okulMudurAdi');
    const mudurUnvaniInput = document.getElementById('okulMudurUnvani');
    if (mudurAdiInput && mudurAdiInput.value.trim() !== '') teachers.push({ name: mudurAdiInput.value.trim(), branch: mudurUnvaniInput.value, isPrincipal: true });
    document.querySelectorAll('#additionalTeachersContainer > div').forEach(row => {
        const nameInput = row.querySelector('.additional-teacher-name');
        const branchInput = row.querySelector('.additional-teacher-branch');
        if (nameInput && branchInput && nameInput.value.trim() !== '' && branchInput.value.trim() !== '') teachers.push({ name: nameInput.value.trim(), branch: branchInput.value.trim(), isPrincipal: false });
    });
    return teachers;
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
        const planData = await planResponse.json();
        const dataForDoc = { okul: planData.okul, ogretmen: planData.ogretmen, ders: planData.ders, sinif: planData.sinif, egitimOgretimYili: planData.egitim_ogretim_yili, dersSaati: planData.ders_saati, haftalikPlan: planData.plan_data_json || [], additionalTeachers: planData.additional_teachers_json || [] };
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
    const dataToSave = {
        plan_name: planName, okul: document.getElementById('okul').value, ogretmen: document.getElementById('ogretmen').value, ders: document.getElementById('ders').value, sinif: document.getElementById('sinif').value,
        egitim_ogretim_yili: document.getElementById('egitimOgretimYili').value, ders_saati: document.getElementById('dersSaati').value,
        varsayilan_arac_gerec: getSelectedSidebarAracGerec(), plan_data_json: yillikPlan, base_academic_plan_json: baseAcademicPlan, 
        additional_teachers: getAdditionalTeachers(), plan_id: currentEditingPlanId 
    };
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
        document.getElementById('ogretmen').value = data.ogretmen || '';
        document.getElementById('ders').value = data.ders || '';
        document.getElementById('sinif').value = data.sinif || '';
        document.getElementById('egitimOgretimYili').value = data.egitim_ogretim_yili || '';
        document.getElementById('dersSaati').value = data.ders_saati || '4';
        document.getElementById('currentPlanNameInput').value = data.plan_name || ''; 
        currentEditingPlanId = data.id; 
        const savedAracGerec = Array.isArray(data.varsayilan_arac_gerec) ? data.varsayilan_arac_gerec : [];
        savedAracGerec.forEach(item => { if (!tumAracGerecListesi.includes(item)) tumAracGerecListesi.push(item); });
        populateSidebarAracGerec(); 
        document.querySelectorAll('#sidebarAracGerecList input[type="checkbox"]').forEach(cb => { cb.checked = savedAracGerec.includes(cb.value); });
        const teachersContainer = document.getElementById('additionalTeachersContainer');
        teachersContainer.innerHTML = ''; 
        const okulMudurAdiInput = document.getElementById('okulMudurAdi');
        let principalProcessed = false;
        if (data.additional_teachers_json && Array.isArray(data.additional_teachers_json)) {
            data.additional_teachers_json.forEach(teacher => {
                if (teacher.isPrincipal && okulMudurAdiInput) { okulMudurAdiInput.value = teacher.name || ''; principalProcessed = true; }
                else addTeacherRow(teacher); 
            });
        }
        if (!principalProcessed && okulMudurAdiInput) okulMudurAdiInput.value = ''; 
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
    await Promise.all([loadAllAracGerecTipleri(), loadAllYontemTeknikTipleri()]);
    document.getElementById('addTeacherBtn').addEventListener('click', () => addTeacherRow());
    const egitimOgretimYiliSelect = document.getElementById('egitimOgretimYili');
    if (egitimOgretimYiliSelect) egitimOgretimYiliSelect.addEventListener('change', setDefaultBaslangicHaftasi);
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
        const data = { okul: document.getElementById('okul').value, ogretmen: document.getElementById('ogretmen').value, ders: document.getElementById('ders').value, sinif: document.getElementById('sinif').value, egitimOgretimYili: document.getElementById('egitimOgretimYili').value, dersSaati: document.getElementById('dersSaati').value, haftalikPlan: yillikPlan, additionalTeachers: getAdditionalTeachers() };
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
