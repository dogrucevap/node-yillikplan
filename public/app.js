// Tab işlevselliği
function switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    const buttonForTab = Array.from(document.querySelectorAll('.tab-button')).find(btn => {
        const onclickAttr = btn.getAttribute('onclick');
        return onclickAttr && onclickAttr.includes(`switchTab('${tabId}')`);
    });
    if (buttonForTab) {
        buttonForTab.classList.add('active');
    }

    // Yıllık Plan sekmesine geçildiğinde kayıtlı planları yükle
    if (tabId === 'yillik-plan') {
        loadSavedPlans();
    }
}

// Yardımcı Fonksiyon: Belirli bir yılın Eylül ayının 3. Pazartesi gününü içeren haftayı bulur
function getThirdMondayWeekInSeptember(year) {
    let mondayCount = 0;
    let thirdMondayDate = null;

    for (let day = 1; day <= 30; day++) { // Eylül ayı için günleri döngüye al
        const date = new Date(year, 8, day); // Ay 0-indeksli olduğu için Eylül = 8
        if (date.getDay() === 1) { // 1 = Pazartesi
            mondayCount++;
            if (mondayCount === 3) {
                thirdMondayDate = date;
                break;
            }
        }
    }

    if (thirdMondayDate) {
        // Haftanın numarasını bul (ISO 8601 standardına yakın bir mantık)
        const firstDayOfYear = new Date(thirdMondayDate.getFullYear(), 0, 1);
        const pastDaysOfYear = (thirdMondayDate - firstDayOfYear) / 86400000;
        const weekNumber = Math.ceil((pastDaysOfYear + 1 + firstDayOfYear.getDay() -1 ) / 7); // getDay() Pazar=0, Cts=6
        
        // YYYY-Www formatına dönüştür
        return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    }
    return null; // Eğer bulunamazsa
}

// Varsayılan başlangıç haftasını ayarla
function setDefaultBaslangicHaftasi() {
    const egitimOgretimYiliSelect = document.getElementById('egitimOgretimYili'); // Artık bir select
    const baslangicHaftasiInput = document.getElementById('baslangicHaftasi');

    if (egitimOgretimYiliSelect && baslangicHaftasiInput) {
        const egitimYiliValue = egitimOgretimYiliSelect.value; // Değer select'ten alınır
        if (egitimYiliValue && egitimYiliValue.includes('-')) {
            const startYear = parseInt(egitimYiliValue.split('-')[0], 10);
            if (!isNaN(startYear)) {
                const defaultWeek = getThirdMondayWeekInSeptember(startYear);
                if (defaultWeek) {
                    baslangicHaftasiInput.value = defaultWeek;
                    updateAllWeekDates(); // Planı güncelle
                } else {
                    // Eğer defaultWeek null ise (örneğin Eylül 3. Pazartesi bulunamadıysa)
                    // baslangicHaftasiInput'u temizleyebilir veya bir hata mesajı gösterebiliriz.
                    // Şimdilik boş bırakıyoruz, updateAllWeekDates() zaten boş inputu handle ediyor.
                    baslangicHaftasiInput.value = ''; 
                    updateAllWeekDates();
                }
            }
        } else {
             baslangicHaftasiInput.value = ''; // Geçerli bir eğitim yılı seçilmemişse temizle
             updateAllWeekDates();
        }
    }
}

// Eğitim-Öğretim Yılı seçeneklerini doldur
function populateEgitimOgretimYiliOptions() {
    const selectElement = document.getElementById('egitimOgretimYili');
    if (!selectElement) return;

    selectElement.innerHTML = ''; // Önceki seçenekleri temizle

    const currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0 (Ocak) - 11 (Aralık)

    // Eğer ay Eylül (8) veya sonrası ise, aktif eğitim yılı mevcut yıldır (örn. 2024-2025 için 2024).
    // Değilse (Ağustos veya öncesi), aktif eğitim yılı bir önceki yıldır (örn. Haziran 2024 için 2023-2024 yani 2023).
    let activeStartYear = (currentMonth >= 8) ? currentYear : currentYear - 1;

    for (let i = 0; i < 4; i++) { // Aktif yıl + sonraki 3 yıl
        const year1 = activeStartYear + i;
        const year2 = year1 + 1;
        const optionValue = `${year1}-${year2}`;
        
        const optionElement = document.createElement('option');
        optionElement.value = optionValue;
        optionElement.textContent = optionValue;
        
        if (i === 0) { // İlk yılı (aktif yılı) varsayılan olarak seç
            optionElement.selected = true;
        }
        
        selectElement.appendChild(optionElement);
    }
}

// Global Değişkenler
let yillikPlan = [];
let baseAcademicPlan = [];
let varsayilanAracGerec = [];
let draggedItemIndex = null;
let currentEditingPlanId = null; // Yüklenmiş ve düzenlenmekte olan planın ID'si

// Sabitler
const TATIL_DONEMLERI = {
    ARA_TATIL_1: { duration: 1, afterAcademicWeek: 9, label: "1. Ara Tatil" },
    YARIYIL_TATILI: { duration: 2, afterAcademicWeek: 18, label: "Yarıyıl Tatili" },
    ARA_TATIL_2: { duration: 1, afterAcademicWeek: 27, label: "2. Ara Tatil" }
};
const TOPLAM_AKADEMIK_HAFTA = 36;
const TUM_ARAC_GEREC_LISTESI = [
    "Tahta", "Projeksiyon", "Hesap Makinesi", "Bilgisayar", "Akıllı Tahta",
    "Grafik Tablet", "Cetvel Seti", "Pergel", "Gönye", "Çalışma Yaprağı",
    "Model", "Poster", "Video", "Animasyon", "Oyun", "Deney Seti",
    "Venn Şemaları", "Grafik Kağıdı", "Sayı Doğrusu", "Kesir Modelleri", "Cetvel",
    "Nesneler", "Zar", "Para", "Kart Destesi", "Grafik Programı", "Cebirsel İfadeler"
];
const yontemTeknikler = [
    "Anlatım", "Soru-Cevap", "Problem Çözme", "Gösterip Yaptırma",
    "Grup Çalışması", "Proje", "Beyin Fırtınası", "Tartışma",
    "Örnek Olay", "Oyun", "Drama", "Deney"
];

// --- YENİ ÖĞRETMEN EKLEME FONKSİYONLARI ---
function addTeacherRow(teacher = { name: '', branch: '' }) {
    const container = document.getElementById('additionalTeachersContainer');
    const teacherDiv = document.createElement('div');
    teacherDiv.className = 'form-row-3';
    teacherDiv.style.marginBottom = '10px';
    teacherDiv.style.alignItems = 'center';
    teacherDiv.innerHTML = `
        <div class="form-group" style="margin-bottom: 0;">
            <input type="text" class="additional-teacher-name" placeholder="Öğretmen Adı Soyadı" value="${teacher.name || ''}" required>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
            <input type="text" class="additional-teacher-branch" placeholder="Branşı / Görevi" value="${teacher.branch || ''}" required>
        </div>
        <button type="button" class="demo-btn" style="background: #c0392b; padding: 8px;" onclick="this.parentElement.remove()">Kaldır</button>
    `;
    container.appendChild(teacherDiv);
}

function getAdditionalTeachers() {
    const teachers = [];
    
    // Okul Müdürü bilgilerini al
    const mudurAdiInput = document.getElementById('okulMudurAdi');
    const mudurUnvaniInput = document.getElementById('okulMudurUnvani'); // Gerçi bu readonly ve değeri sabit

    if (mudurAdiInput && mudurAdiInput.value.trim() !== '') {
        teachers.push({
            name: mudurAdiInput.value.trim(),
            branch: mudurUnvaniInput.value, // "Okul Müdürü"
            isPrincipal: true // Okul Müdürü olduğunu belirtmek için
        });
    }

    // Diğer ek öğretmenleri al
    const teacherRows = document.querySelectorAll('#additionalTeachersContainer > div');
    teacherRows.forEach(row => {
        const nameInput = row.querySelector('.additional-teacher-name');
        const branchInput = row.querySelector('.additional-teacher-branch');
        if (nameInput && branchInput && nameInput.value.trim() !== '' && branchInput.value.trim() !== '') {
            teachers.push({
                name: nameInput.value.trim(),
                branch: branchInput.value.trim(),
                isPrincipal: false // Bunlar normal öğretmen
            });
        }
    });
    return teachers;
}
// --- BİTTİ: YENİ ÖĞRETMEN EKLEME FONKSİYONLARI ---

function populateAracGerecCheckboxes() {
    const group = document.getElementById('aracGerecGroup');
    if (!group) {
        console.error("Hata: 'aracGerecGroup' ID'li element bulunamadı.");
        return;
    }
    group.innerHTML = '';
    TUM_ARAC_GEREC_LISTESI.forEach((item, index) => {
        const id = `ag${index + 1}`;
        const checkboxItem = document.createElement('div');
        checkboxItem.className = 'checkbox-item';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = id;
        checkbox.value = item;
        checkbox.addEventListener('change', updateVarsayilanAracGerec);
        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = item;
        checkboxItem.appendChild(checkbox);
        checkboxItem.appendChild(label);
        group.appendChild(checkboxItem);
    });
}

function toggleDropdown(dropdown) {
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

function toggleAracGerec(academicWeekNum, item, selectedContainer) {
    const planEntry = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
    if (!planEntry) return;

    const currentItems = planEntry.aracGerec || [];
    const index = currentItems.indexOf(item);
    
    if (index > -1) {
        currentItems.splice(index, 1);
    } else {
        currentItems.push(item);
    }
    planEntry.aracGerec = currentItems;

    const basePlanEntry = baseAcademicPlan.find(h => h.originalAcademicWeek === academicWeekNum);
    if(basePlanEntry) basePlanEntry.aracGerec = [...currentItems]; 

    updateAracGerecDisplay(selectedContainer, currentItems, academicWeekNum);
}

function updateAracGerecDisplay(container, items, academicWeekNum) {
    container.innerHTML = '';
    items.forEach(item => {
        const tag = document.createElement('span');
        tag.className = 'arac-gerec-tag';
        tag.innerHTML = `${item} <span class="remove" onclick="removeAracGerec(${academicWeekNum}, '${item}')">×</span>`;
        container.appendChild(tag);
    });
    
    if (items.length === 0) {
        container.innerHTML = '<span style="color: #999; font-size: 10px;">Araç gereç seçin</span>';
    }
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

function createYontemSelect(academicWeekNum, selectedItems = []) {
    const select = document.createElement('select');
    select.multiple = true;
    select.style.height = '24px';
    select.style.fontSize = '10px';
    
    yontemTeknikler.forEach(teknik => {
        const option = document.createElement('option');
        option.value = teknik;
        option.textContent = teknik;
        if(Array.isArray(selectedItems)) {
           option.selected = selectedItems.includes(teknik);
        }
        select.appendChild(option);
    });
    
    select.onchange = () => {
        const selectedValues = Array.from(select.selectedOptions).map(opt => opt.value);
        const planEntry = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
        if (planEntry) {
            planEntry.yontemTeknik = selectedValues;
            const basePlanEntry = baseAcademicPlan.find(h => h.originalAcademicWeek === academicWeekNum);
            if(basePlanEntry) basePlanEntry.yontemTeknik = [...selectedValues]; 
        }
    };
    return select;
}

function createAracGerecSelector(academicWeekNum, selectedItems = []) { 
    const container = document.createElement('div');
    container.className = 'arac-gerec-container';
    const selected = document.createElement('div');
    selected.className = 'arac-gerec-selected';
    selected.onclick = () => toggleDropdown(selected.nextElementSibling);
    const dropdown = document.createElement('div');
    dropdown.className = 'arac-gerec-dropdown';
    TUM_ARAC_GEREC_LISTESI.forEach(item => {
        const option = document.createElement('div');
        option.className = 'arac-gerec-option';
        option.textContent = item;
        option.onclick = () => toggleAracGerec(academicWeekNum, item, selected);
        dropdown.appendChild(option);
    });
    container.appendChild(selected);
    container.appendChild(dropdown);
    updateAracGerecDisplay(selected, selectedItems, academicWeekNum);
    return container;
}

function renderYillikPlan() {
    const container = document.getElementById('haftaContainer');
    if (!container) {
        console.error("Hata: 'haftaContainer' ID'li element bulunamadı.");
        showMessage("❌ Yıllık plan gösterim alanı yüklenemedi. Sayfayı yenileyin.", "error");
        return;
    }
    // Başlık ('.hafta-header') index.html'de statik olarak bulunduğu için
    // burada JavaScript ile yeniden eklenmesine veya manipüle edilmesine gerek yok.
    // Sadece satırları içeren container'ı temizliyoruz.
    container.innerHTML = '';

    container.removeEventListener('dragover', handleDragOver);
    container.addEventListener('dragover', handleDragOver);
    container.removeEventListener('drop', handleDrop);
    container.addEventListener('drop', handleDrop);
    
    yillikPlan.forEach((haftaData, index) => {
        const haftaDiv = document.createElement('div');
        haftaDiv.className = 'hafta-item';
        haftaDiv.dataset.index = index; 

        if (haftaData.type === 'holiday') {
            haftaDiv.classList.add('holiday-week');
            haftaDiv.draggable = false;
        } else { 
            haftaDiv.draggable = true; 
            haftaDiv.addEventListener('dragstart', (event) => handleDragStart(event, index));
            haftaDiv.addEventListener('dragend', handleDragEnd);
        }
        
        const selectDiv = document.createElement('div');
        selectDiv.style.display = 'flex';
        selectDiv.style.alignItems = 'center';
        selectDiv.style.justifyContent = 'center';
        
        const selectCheckbox = document.createElement('input');
        selectCheckbox.type = 'checkbox';
        selectCheckbox.id = `week-${haftaData.type === 'academic' ? haftaData.originalAcademicWeek : 'holiday-' + index}`;
        selectCheckbox.className = 'week-selector week-checkbox';
        selectCheckbox.disabled = haftaData.type === 'holiday';
        
        selectDiv.appendChild(selectCheckbox);
        haftaDiv.appendChild(selectDiv);
        
        const haftaNum = document.createElement('div');
        haftaNum.textContent = haftaData.type === 'academic' ? haftaData.originalAcademicWeek : haftaData.label;
        if(haftaData.type === 'holiday') haftaNum.style.fontWeight = 'bold';
        haftaDiv.appendChild(haftaNum);
        
        const tarihDiv = document.createElement('div');
        tarihDiv.textContent = haftaData.tarih || ''; 
        haftaDiv.appendChild(tarihDiv);

        if (haftaData.type === 'academic') {
            const dersSaatiInput = document.createElement('input');
            dersSaatiInput.type = 'number';
            dersSaatiInput.value = haftaData.dersSaati || '';
            dersSaatiInput.min = '1';
            dersSaatiInput.onchange = (e) => {
                haftaData.dersSaati = e.target.value;
                const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === haftaData.originalAcademicWeek);
                if(baseEntry) baseEntry.dersSaati = e.target.value;
            };
            haftaDiv.appendChild(dersSaatiInput);

            const uniteInput = document.createElement('input');
            uniteInput.type = 'text';
            uniteInput.value = haftaData.unite || '';
            uniteInput.onchange = (e) => {
                haftaData.unite = e.target.value;
                const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === haftaData.originalAcademicWeek);
                if(baseEntry) baseEntry.unite = e.target.value;
            };
            haftaDiv.appendChild(uniteInput);
            
            const konuInput = document.createElement('input');
            konuInput.type = 'text';
            konuInput.value = haftaData.konu || '';
            konuInput.onchange = (e) => {
                haftaData.konu = e.target.value;
                const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === haftaData.originalAcademicWeek);
                if(baseEntry) baseEntry.konu = e.target.value;
            };
            haftaDiv.appendChild(konuInput);
            
            const kazanimInput = document.createElement('input');
            kazanimInput.type = 'text';
            kazanimInput.value = haftaData.kazanim || '';
            kazanimInput.onchange = (e) => {
                haftaData.kazanim = e.target.value;
                const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === haftaData.originalAcademicWeek);
                if(baseEntry) baseEntry.kazanim = e.target.value;
            };
            haftaDiv.appendChild(kazanimInput);
            
            const aracGerecContainer = createAracGerecSelector(haftaData.originalAcademicWeek, haftaData.aracGerec || []);
            haftaDiv.appendChild(aracGerecContainer);
            
            const yontemContainer = document.createElement('div');
            yontemContainer.appendChild(createYontemSelect(haftaData.originalAcademicWeek, haftaData.yontemTeknik || []));
            haftaDiv.appendChild(yontemContainer);
            
            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.innerHTML = '✏️';
            editBtn.onclick = () => alert("Bu özellik yapım aşamasındadır.");
            haftaDiv.appendChild(editBtn);

        } else { 
            const emptyDersSaatiCell = document.createElement('div');
            haftaDiv.appendChild(emptyDersSaatiCell);
            
            const tatilAciklamaDiv = document.createElement('div');
            tatilAciklamaDiv.className = 'tatil-aciklama-hucre';
            tatilAciklamaDiv.textContent = haftaData.label || "Tatil";
            haftaDiv.appendChild(tatilAciklamaDiv);

            const emptyEditCell = document.createElement('div'); 
            haftaDiv.appendChild(emptyEditCell);
        }
        container.appendChild(haftaDiv);
    });
}

function handleDragStart(event, index) {
    const draggedElement = yillikPlan[index];
    if (!draggedElement || draggedElement.type === 'holiday') {
        event.preventDefault(); return;
    }
    draggedItemIndex = index;
    event.dataTransfer.effectAllowed = 'move';
    event.target.classList.add('dragging');
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
        if (yillikPlan[targetIndex].type === 'academic' && draggedItemIndex !== targetIndex) {
            targetElement.classList.add('drag-over-target');
        }
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
    endDate.setDate(startDate.getDate() + (durationInWeeks * 7) - 3); // Cuma gününü bulmak için
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
        let temporaryAcademicWeeks = [...baseAcademicPlan];
        for (let i = 1; i <= TOPLAM_AKADEMIK_HAFTA + Object.keys(TATIL_DONEMLERI).length; i++) {
            let isHoliday = false;
            let holidayDetails = {};
            for(const key in TATIL_DONEMLERI) {
                if (TATIL_DONEMLERI[key].afterAcademicWeek === academicPlanIndex) {
                    isHoliday = true;
                    holidayDetails = TATIL_DONEMLERI[key];
                    break;
                }
            }
            if(isHoliday) {
                newPlan.push({ 
                    type: 'holiday', 
                    label: holidayDetails.label, 
                    tarih: '', // Başlangıç haftası seçilmediğinde tarih boş
                    duration: holidayDetails.duration 
                });
                i += holidayDetails.duration -1; // i'yi doğru şekilde artır
            } else if (temporaryAcademicWeeks.length > 0) {
                newPlan.push({ ...temporaryAcademicWeeks.shift(), type: 'academic', tarih: '' });
                academicPlanIndex++;
            }
        }
        yillikPlan = newPlan;
        renderYillikPlan();
        return;
    }

    const [yearStr, weekNumberStr] = weekInput.split('-W');
    const year = parseInt(yearStr);
    const weekNumber = parseInt(weekNumberStr);
    let currentMonday = getMondayOfWeek(year, weekNumber);
    
    let current_bp_idx = 0; // baseAcademicPlan için mevcut indeks
                            // Bu aynı zamanda, bu indeksteki akademik hafta eklenmeden ÖNCE
                            // eklenmiş olan akademik haftaların sayısını temsil eder.

    while(current_bp_idx < baseAcademicPlan.length) {
        // Mevcut akademik haftadan (baseAcademicPlan[current_bp_idx]) ÖNCE
        // eklenmesi gereken tatilleri kontrol et.
        // Tatil tanımındaki 'afterAcademicWeek', kaç tane akademik hafta GEÇTİKTEN SONRA tatilin başlayacağını belirtir.
        // Bu, 'current_bp_idx' ile eşleşir.
        for (const holidayKey in TATIL_DONEMLERI) {
            if (TATIL_DONEMLERI[holidayKey].afterAcademicWeek === current_bp_idx) {
                 const holiday = TATIL_DONEMLERI[holidayKey];
                 const holidayStartDate = new Date(currentMonday);
                 // Çok haftalı tatiller için tek bir giriş oluştur, tarih aralığını tam süreyi kapsayacak şekilde ayarla
                 newPlan.push({ 
                    type: 'holiday', 
                    label: holiday.label, 
                    tarih: formatDateRange(holidayStartDate, holiday.duration), // Tam süreyi kapsayan tarih aralığı
                    duration: holiday.duration // Tatil süresini ekle
                 });
                 currentMonday.setDate(currentMonday.getDate() + (7 * holiday.duration)); // currentMonday'i tatil süresi kadar ilerlet
                 // Bu 'afterAcademicWeek' değeri için bir tatil periyodu işlendi.
                 // Aynı noktada başka bir tatil periyodunun başlamadığını varsayarak döngüden çık.
                 break; 
            }
        }

        // Şimdi mevcut akademik haftayı (baseAcademicPlan[current_bp_idx]) ekle.
        // While döngüsü koşulu zaten current_bp_idx < baseAcademicPlan.length olmasını sağlar.
        const academicWeekData = baseAcademicPlan[current_bp_idx];
        newPlan.push({ 
            // Yayılacak verinin label veya type içermediğinden emin olmak için açıkça listeleme
            originalAcademicWeek: academicWeekData.originalAcademicWeek,
            unite: academicWeekData.unite,
            konu: academicWeekData.konu,
            kazanim: academicWeekData.kazanim,
            dersSaati: academicWeekData.dersSaati,
            aracGerec: Array.isArray(academicWeekData.aracGerec) ? [...academicWeekData.aracGerec] : [],
            yontemTeknik: Array.isArray(academicWeekData.yontemTeknik) ? [...academicWeekData.yontemTeknik] : [],
            olcmeDeğerlendirme: academicWeekData.olcmeDeğerlendirme,
            aciklama: academicWeekData.aciklama,
            type: 'academic', // Türü açıkça 'academic' olarak ayarla
            tarih: formatDateRange(new Date(currentMonday)) 
        });
        currentMonday.setDate(currentMonday.getDate() + 7); // currentMonday'i akademik hafta için ilerlet
        current_bp_idx++; // Bir sonraki akademik haftaya geç
    }

    // Tüm akademik haftalar eklendikten sonra, planın en sonuna gelebilecek tatilleri kontrol et.
    // Bu noktada current_bp_idx == baseAcademicPlan.length olmalı.
    for (const holidayKey in TATIL_DONEMLERI) {
        if (TATIL_DONEMLERI[holidayKey].afterAcademicWeek === baseAcademicPlan.length) {
             const holiday = TATIL_DONEMLERI[holidayKey];
             const holidayStartDate = new Date(currentMonday);
             newPlan.push({ 
                type: 'holiday', 
                label: holiday.label, 
                tarih: formatDateRange(holidayStartDate, holiday.duration),
                duration: holiday.duration
             });
             currentMonday.setDate(currentMonday.getDate() + (7 * holiday.duration));
             // Bu afterAcademicWeek değeri için bir tatil periyodu işlendi.
             break;
        }
    }
    yillikPlan = newPlan;
    renderYillikPlan();
}

function updateDersSaati() {
    const newDersSaati = document.getElementById('dersSaati').value;
    baseAcademicPlan.forEach(hafta => {
        hafta.dersSaati = newDersSaati;
    });
    renderYillikPlan(); 
}

function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 5000);
}

function updateVarsayilanAracGerec() {
    const checkboxes = document.querySelectorAll('#aracGerecGroup input[type="checkbox"]:checked');
    varsayilanAracGerec = Array.from(checkboxes).map(cb => cb.value);
}

async function loadSavedPlans() {
    try {
        const response = await fetch('/api/plans');
        if (!response.ok) throw new Error('Kaydedilmiş planlar yüklenemedi.');
        const plans = await response.json();
        const listContainer = document.getElementById('savedPlansListContainer');
        if (!listContainer) {
            console.error("Kaydedilmiş planlar listesi için container bulunamadı: savedPlansListContainer");
            return;
        }
        listContainer.innerHTML = '';
        if (plans.length === 0) {
            listContainer.innerHTML = '<p>Kaydedilmiş plan bulunmuyor.</p>';
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'saved-plan-items-list'; // Stil için sınıf
        plans.forEach(plan => {
            const li = document.createElement('li');
            li.className = 'saved-plan-item'; // Stil için sınıf
            
            const planInfo = document.createElement('span');
            planInfo.textContent = `${plan.plan_name} (${plan.ders || 'Bilinmeyen Ders'} - ${plan.sinif || 'Bilinmeyen Sınıf'})`;
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'saved-plan-buttons'; // Stil için sınıf

            const loadButton = document.createElement('button');
            loadButton.type = 'button';
            loadButton.textContent = 'Yükle'; // "Edit" yerine "Yükle" kullanıyoruz, işlevi aynı.
            loadButton.onclick = () => loadSpecificPlan(plan.id);
            
            const downloadButton = document.createElement('button');
            downloadButton.type = 'button';
            downloadButton.textContent = 'İndir (Word)';
            downloadButton.className = 'download-saved-btn'; // Stil için sınıf
            downloadButton.onclick = () => generatePlanForSaved(plan.id);

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.textContent = 'Sil';
            deleteButton.className = 'delete-btn'; // Stil için sınıf
            deleteButton.onclick = () => deletePlan(plan.id);

            buttonsDiv.appendChild(loadButton);
            buttonsDiv.appendChild(downloadButton);
            buttonsDiv.appendChild(deleteButton);
            
            li.appendChild(planInfo);
            li.appendChild(buttonsDiv);
            ul.appendChild(li);
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
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Plan silinemedi.');
        }
        showMessage('🗑️ Plan başarıyla silindi.', 'success');
        loadSavedPlans();
    } catch (error) {
        showMessage(`❌ Plan silinirken hata: ${error.message}`, 'error');
    }
}

async function generatePlanForSaved(planId) {
    showMessage('⏳ Kaydedilmiş plan Word olarak hazırlanıyor...', 'success');
    const loading = document.getElementById('loading');
    if(loading) loading.style.display = 'block';

    try {
        // 1. Plan verilerini al
        const planResponse = await fetch(`/api/plans/${planId}`);
        if (!planResponse.ok) {
            const errorData = await planResponse.json().catch(() => ({ message: 'Kaydedilmiş plan verisi alınamadı.' }));
            throw new Error(errorData.error || errorData.message || 'Kaydedilmiş plan verisi alınamadı.');
        }
        const planData = await planResponse.json();


        // 2. /generate-plan endpoint'ine göndermek için veriyi hazırla
        const dataForDoc = {
            okul: planData.okul,
            ogretmen: planData.ogretmen,
            ders: planData.ders,
            sinif: planData.sinif,
            egitimOgretimYili: planData.egitim_ogretim_yili,
            dersSaati: planData.ders_saati,
            haftalikPlan: planData.plan_data_json || [], // Kayıtlı tam planı kullan
            additionalTeachers: planData.additional_teachers_json || []
        };

        // 3. Word belgesi oluşturma isteği gönder
        const docResponse = await fetch('/generate-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataForDoc)
        });

        if (docResponse.ok) {
            const blob = await docResponse.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safePlanName = planData.plan_name.replace(/[^a-zA-Z0-9]/g, '_');
            a.download = `yillik_plan_${safePlanName}_${new Date().toISOString().slice(0,10)}.docx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showMessage('✅ Kaydedilmiş plan başarıyla indirildi!', 'success');
        } else {
            const errorData = await docResponse.json().catch(() => ({ message: 'Sunucu hatası (Word oluşturma)' }));
            throw new Error(errorData.error || errorData.message || 'Kaydedilmiş plan için Word belgesi oluşturulamadı.');
        }

    } catch (error) {
        console.error('Kaydedilmiş plan indirme hatası:', error);
        showMessage(`❌ Kaydedilmiş plan indirilirken hata: ${error.message}`, 'error');
    } finally {
        if(loading) loading.style.display = 'none';
    }
}


async function loadDemoData() {
    try {
        const response = await fetch('/demo-data');
        if (!response.ok) throw new Error('Demo veri sunucusundan yanıt alınamadı.');
        const data = await response.json();

        document.getElementById('okul').value = data.okul || '';
        document.getElementById('ogretmen').value = data.ogretmen || '';
        document.getElementById('ders').value = data.ders || '';
        document.getElementById('sinif').value = data.sinif || '';
        document.getElementById('egitimOgretimYili').value = data.egitimOgretimYili || '';
        document.getElementById('dersSaati').value = data.dersSaati || '4';

        varsayilanAracGerec = Array.isArray(data.varsayilanAracGerec) ? [...data.varsayilanAracGerec] : [];
        document.querySelectorAll('#aracGerecGroup input[type="checkbox"]').forEach(cb => {
            cb.checked = varsayilanAracGerec.includes(cb.value);
        });

        baseAcademicPlan = Array.isArray(data.haftalikPlan) ? data.haftalikPlan.map(h => ({...h})) : [];
        updateAllWeekDates();
        showMessage('✅ Demo veriler başarıyla yüklendi!', 'success');
    } catch (error) {
        console.error('Demo veri yükleme hatası:', error);
        showMessage(`❌ Demo veriler yüklenirken hata oluştu: ${error.message}`, 'error');
    }
}

async function saveCurrentPlan() {
    let planName = document.getElementById('currentPlanNameInput').value.trim();
    
    if (!planName) {
        // Yeni plan kaydediliyorsa, mevcut düzenleme ID'sini sıfırla
        currentEditingPlanId = null; 
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        planName = `Plan-${year}${month}${day}-${hours}${minutes}`;
        document.getElementById('currentPlanNameInput').value = planName; // Otomatik adı input'a yaz
        showMessage(`ℹ️ Plan adı otomatik olarak "${planName}" şeklinde belirlendi.`, 'success');
    }

    const dataToSave = {
        plan_name: planName,
        okul: document.getElementById('okul').value,
        ogretmen: document.getElementById('ogretmen').value,
        ders: document.getElementById('ders').value,
        sinif: document.getElementById('sinif').value,
        egitim_ogretim_yili: document.getElementById('egitimOgretimYili').value,
        ders_saati: document.getElementById('dersSaati').value,
        varsayilan_arac_gerec: varsayilanAracGerec,
        plan_data_json: yillikPlan, // Güncel yillikPlan (tatiller dahil)
        base_academic_plan_json: baseAcademicPlan, // Güncel baseAcademicPlan
        additional_teachers: getAdditionalTeachers(),
        plan_id: currentEditingPlanId // Var olan bir planı güncelliyorsak ID'sini gönder
    };

    try {
        const response = await fetch('/api/plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave)
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Plan kaydedilemedi.');
        
        showMessage(`✅ "${planName}" başarıyla kaydedildi.`, 'success');
        loadSavedPlans();
    } catch (error) {
        showMessage(`❌ Plan kaydedilirken hata: ${error.message}`, 'error');
    }
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
        currentEditingPlanId = data.id; // Yüklenen planın ID'sini sakla

        varsayilanAracGerec = Array.isArray(data.varsayilan_arac_gerec) ? [...data.varsayilan_arac_gerec] : [];
        document.querySelectorAll('#aracGerecGroup input[type="checkbox"]').forEach(cb => {
            cb.checked = varsayilanAracGerec.includes(cb.value);
        });

        const teachersContainer = document.getElementById('additionalTeachersContainer');
        teachersContainer.innerHTML = ''; // Önce temizle

        const okulMudurAdiInput = document.getElementById('okulMudurAdi');
        // okulMudurUnvaniInput zaten readonly ve değeri "Okul Müdürü"

        let principalProcessed = false;
        if (data.additional_teachers_json && Array.isArray(data.additional_teachers_json)) {
            data.additional_teachers_json.forEach(teacher => {
                if (teacher.isPrincipal && okulMudurAdiInput) {
                    okulMudurAdiInput.value = teacher.name || '';
                    principalProcessed = true;
                } else {
                    addTeacherRow(teacher); // Diğer öğretmenleri normal şekilde ekle
                }
            });
        }
        // Eğer DB'den gelen veride okul müdürü yoksa ve input boş değilse, input'u temizle
        if (!principalProcessed && okulMudurAdiInput) {
            // okulMudurAdiInput.value = ''; // Yüklenen planda müdür yoksa boşaltılabilir, veya mevcut değer korunabilir. Şimdilik koruyalım.
        }
        
        baseAcademicPlan = Array.isArray(data.base_academic_plan_json) ? data.base_academic_plan_json.map(h => ({...h})) : [];
        yillikPlan = Array.isArray(data.plan_data_json) ? data.plan_data_json.map(h => ({...h})) : [];

        if (yillikPlan.length > 0) {
            renderYillikPlan();
        } else {
            updateAllWeekDates();
        }
        
        switchTab('yillik-plan'); // Yıllık Plan sekmesine geç
        loadSavedPlans(); // Kayıtlı planları da yükle (opsiyonel, zaten Yıllık Plan sekmesine geçince yükleniyor)
        showMessage(`✅ "${data.plan_name}" planı yüklendi.`, 'success');

    } catch (error) {
        showMessage(`❌ Plan yüklenirken hata: ${error.message}`, 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    populateAracGerecCheckboxes();
    populateEgitimOgretimYiliOptions(); // Eğitim yılı seçeneklerini doldur
    
    document.getElementById('addTeacherBtn').addEventListener('click', () => addTeacherRow());
    
    const egitimOgretimYiliSelect = document.getElementById('egitimOgretimYili'); // Artık bir select
    if (egitimOgretimYiliSelect) {
        egitimOgretimYiliSelect.addEventListener('change', setDefaultBaslangicHaftasi);
    }

    const defaultDersSaati = document.getElementById('dersSaati').value || '4';
    if (baseAcademicPlan.length === 0) {
        for (let i = 1; i <= TOPLAM_AKADEMIK_HAFTA; i++) {
            baseAcademicPlan.push({
                originalAcademicWeek: i, unite: '', konu: '', kazanim: '', dersSaati: defaultDersSaati,
                aracGerec: [], yontemTeknik: [], olcmeDeğerlendirme: '', aciklama: ''
            });
        }
    }
    // updateAllWeekDates(); // Bu satır setDefaultBaslangicHaftasi içinde çağrılacak
    setDefaultBaslangicHaftasi(); // Sayfa yüklendiğinde de çalıştır
    loadSavedPlans(); // Sayfa ilk yüklendiğinde kayıtlı planları yükle

    document.getElementById('baslangicHaftasi').addEventListener('change', updateAllWeekDates);
    document.getElementById('dersSaati').addEventListener('change', updateDersSaati);
    
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
            haftalikPlan: yillikPlan,
            additionalTeachers: getAdditionalTeachers()
        };

        generateBtn.disabled = true;
        loading.style.display = 'block';

        try {
            const response = await fetch('/generate-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `yillik_plan_${data.ders.replace(/\s+/g, '_')}_${data.sinif}_${new Date().toISOString().slice(0,10)}.docx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showMessage('✅ Yıllık plan başarıyla oluşturuldu ve indirildi!', 'success');
            } else {
                const errorData = await response.json().catch(() => ({ message: 'Sunucu hatası' }));
                throw new Error(errorData.error || 'Sunucu hatası');
            }
        } catch (error) {
            showMessage(`❌ Plan oluşturulurken hata: ${error.message}`, 'error');
        } finally {
            generateBtn.disabled = false;
            loading.style.display = 'none';
        }
    });
});
