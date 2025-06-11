// Tab işlevselliği
function switchTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    const buttonForTab = Array.from(document.querySelectorAll('.tab-button')).find(btn => btn.getAttribute('onclick').includes(tabId));
    if (buttonForTab) buttonForTab.classList.add('active');
}

let yillikPlan = []; 
let baseAcademicPlan = []; 
let varsayilanAracGerec = [];
let draggedItemIndex = null; 

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

function populateAracGerecCheckboxes() {
    const group = document.getElementById('aracGerecGroup');
    group.innerHTML = ''; // Önce temizle
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
        option.selected = selectedItems.includes(teknik);
        select.appendChild(option);
    });
    
    select.onchange = () => {
        const selectedValues = Array.from(select.selectedOptions).map(opt => opt.value);
        const planEntry = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
        if (planEntry) {
            planEntry.yontemTeknik = selectedValues;
            const basePlanEntry = baseAcademicPlan.find(h => h.originalAcademicWeek === academicWeekNum);
            if(basePlanEntry) basePlanEntry.yontemTeknik = [...selectedValues]; 
        } else {
            console.error(`Akademik Hafta ${academicWeekNum} yillikPlan dizisinde bulunamadı.`);
        }
    };
    return select;
}

function renderYillikPlan() {
    const container = document.getElementById('haftaContainer');
    const header = container.querySelector('.hafta-header');
    container.innerHTML = ''; 
    if (header) container.appendChild(header);

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
        selectCheckbox.onchange = updateWeekSelectionCount;
        selectCheckbox.disabled = haftaData.type === 'holiday';
        
        selectDiv.appendChild(selectCheckbox);
        haftaDiv.appendChild(selectDiv);
        
        const haftaNum = document.createElement('div');
        haftaNum.textContent = haftaData.type === 'academic' ? haftaData.originalAcademicWeek : haftaData.label;
        if(haftaData.type === 'holiday') haftaNum.style.fontWeight = 'bold';
        haftaDiv.appendChild(haftaNum);
        
        const tarihDiv = document.createElement('div');
        tarihDiv.textContent = haftaData.tarih || ''; 
        tarihDiv.style.padding = '6px 0'; 
        tarihDiv.style.fontSize = '11px';
        tarihDiv.style.display = 'flex';
        tarihDiv.style.alignItems = 'center';
        haftaDiv.appendChild(tarihDiv);

        if (haftaData.type === 'academic') {
            const dersSaatiInput = document.createElement('input');
            dersSaatiInput.type = 'number';
            dersSaatiInput.value = haftaData.dersSaati || '';
            dersSaatiInput.min = '1';
            dersSaatiInput.max = '10';
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
            editBtn.onclick = () => editHafta(haftaData.originalAcademicWeek); 
            haftaDiv.appendChild(editBtn);

        } else { 
            const emptyDersSaatiCell = document.createElement('div'); // Ders saati için boş
            haftaDiv.appendChild(emptyDersSaatiCell);
            
            const tatilAciklamaDiv = document.createElement('div');
            tatilAciklamaDiv.className = 'tatil-aciklama-hucre'; 
            tatilAciklamaDiv.textContent = ""; // Etiket zaten haftaNum'da gösteriliyor, burası birleşmiş hücre
            // CSS'deki .holiday-week .tatil-aciklama-hucre { grid-column: 5 / span 5; } olmalı (Ünite, Konu, Kazanım, AraçGereç, YöntemTeknik)
            // Düzenle butonu için de ayrı bir boş hücre
            haftaDiv.appendChild(tatilAciklamaDiv);

            const emptyEditCell = document.createElement('div'); 
            haftaDiv.appendChild(emptyEditCell);
        }
        container.appendChild(haftaDiv);
    });
    updateWeekSelectionCount();
}

function handleDragStart(event, index) {
    const draggedElement = yillikPlan[index];
    if (!draggedElement || draggedElement.type === 'holiday') {
        event.preventDefault(); return;
    }
    draggedItemIndex = index; 
    event.dataTransfer.effectAllowed = 'move';
    event.target.classList.add('dragging');
    document.body.classList.add('dragging-active'); 
}

function handleDragEnd(event) {
    if (event.target && event.target.classList) { 
      event.target.classList.remove('dragging');
    }
    document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
    document.body.classList.remove('dragging-active'); 
    draggedItemIndex = null;
}

function handleDragOver(event) {
    event.preventDefault(); 
    event.dataTransfer.dropEffect = 'move';
    const targetElement = event.target.closest('.hafta-item');
    if (draggedItemIndex === null) return; 
    const draggedItem = yillikPlan[draggedItemIndex];
    document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
    if (targetElement && draggedItem && draggedItem.type === 'academic') { 
        const targetItem = yillikPlan[parseInt(targetElement.dataset.index)];
        if (targetItem && targetItem.type === 'academic' && draggedItemIndex !== parseInt(targetElement.dataset.index)) {
            targetElement.classList.add('drag-over-target');
        }
    }
}

function handleDrop(event) {
    event.preventDefault();
    const targetElement = event.target.closest('.hafta-item');
    document.querySelectorAll('.drag-over-target').forEach(el => el.classList.remove('drag-over-target'));
    if (!targetElement || draggedItemIndex === null) return;

    const targetItemIndexInYillikPlan = parseInt(targetElement.dataset.index);
    const draggedItemDataFromYillikPlan = yillikPlan[draggedItemIndex]; 
    const targetItemDataFromYillikPlan = yillikPlan[targetItemIndexInYillikPlan];

    if (draggedItemDataFromYillikPlan && draggedItemDataFromYillikPlan.type === 'academic' && 
        targetItemDataFromYillikPlan && targetItemDataFromYillikPlan.type === 'academic' && 
        draggedItemIndex !== targetItemIndexInYillikPlan) {

        const currentDraggedAcademicOrderIndex = baseAcademicPlan.findIndex(h => h.originalAcademicWeek === draggedItemDataFromYillikPlan.originalAcademicWeek);
        const currentTargetAcademicOrderIndex = baseAcademicPlan.findIndex(h => h.originalAcademicWeek === targetItemDataFromYillikPlan.originalAcademicWeek);

        if (currentDraggedAcademicOrderIndex !== -1 && currentTargetAcademicOrderIndex !== -1 && currentDraggedAcademicOrderIndex !== currentTargetAcademicOrderIndex) {
            const [movedAcademicItem] = baseAcademicPlan.splice(currentDraggedAcademicOrderIndex, 1);
            baseAcademicPlan.splice(currentTargetAcademicOrderIndex, 0, movedAcademicItem);
            baseAcademicPlan.forEach((item, newIndex) => item.originalAcademicWeek = newIndex + 1);
        }
        updateAllWeekDates(); 
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
    endDate.setDate(startDate.getDate() + (durationInWeeks * 7) - 1); 
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const months = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const startMonth = months[startDate.getMonth()];
    const endMonth = months[endDate.getMonth()];
    return startMonth === endMonth ? `${startDay} - ${endDay} ${startMonth}` : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
}

function updateAllWeekDates() {
    const weekInput = document.getElementById('baslangicHaftasi').value;
    const planTarihAraligiDiv = document.getElementById('planTarihAraligi');
    planTarihAraligiDiv.textContent = ''; 

    if (baseAcademicPlan.length !== TOPLAM_AKADEMIK_HAFTA && baseAcademicPlan.length > 0) { // Demo yüklendi ama tam değilse
         // Bu durum demo verisi yüklenirken baseAcademicPlan'ın zaten doğru sayıda öğe ile dolmasıyla çözülmeli.
    } else if (baseAcademicPlan.length === 0) { // İlk defa veya sıfırlanmışsa
        const defaultDersSaati = document.getElementById('dersSaati').value || '4';
        for (let i = 1; i <= TOPLAM_AKADEMIK_HAFTA; i++) {
            baseAcademicPlan.push({
                originalAcademicWeek: i, unite: '', konu: '', kazanim: '', dersSaati: defaultDersSaati,
                aracGerec: [], yontemTeknik: [], olcmeDeğerlendirme: '', aciklama: ''
            });
        }
    }
    
    // baseAcademicPlan'daki originalAcademicWeek'lerin sıralı olduğundan emin ol
    baseAcademicPlan.sort((a,b) => a.originalAcademicWeek - b.originalAcademicWeek);
    baseAcademicPlan.forEach((item, idx) => item.originalAcademicWeek = idx + 1);


    if (!weekInput) {
        const newPlan = [];
        let academicPlanIndex = 0;
        let overallWeekCounter = 1;
        
        while(academicPlanIndex < TOPLAM_AKADEMIK_HAFTA) {
            Object.values(TATIL_DONEMLERI).forEach(tatil => {
                if (tatil.afterAcademicWeek === academicPlanIndex) {
                    newPlan.push({
                        hafta: overallWeekCounter++, tarih: '', type: 'holiday', label: tatil.label,
                        duration: tatil.duration, unite: '', konu: '', kazanim: '', dersSaati: '', aracGerec: [], yontemTeknik: []
                    });
                }
            });
            if (academicPlanIndex < TOPLAM_AKADEMIK_HAFTA) {
                 const academicData = baseAcademicPlan[academicPlanIndex];
                 newPlan.push({ ...academicData, hafta: overallWeekCounter++, tarih: '', type: 'academic' });
                academicPlanIndex++;
            }
        }
         Object.values(TATIL_DONEMLERI).forEach(tatil => {
            if (tatil.afterAcademicWeek === TOPLAM_AKADEMIK_HAFTA) {
                 newPlan.push({
                    hafta: overallWeekCounter++, tarih: '', type: 'holiday', label: tatil.label,
                    duration: tatil.duration, unite: '', konu: '', kazanim: '', dersSaati: '', aracGerec: [], yontemTeknik: []
                });
            }
        });
        yillikPlan = newPlan;
        renderYillikPlan();
        return;
    }

    const [yearStr, weekNumberStr] = weekInput.split('-W');
    const year = parseInt(yearStr);
    const weekNumber = parseInt(weekNumberStr);

    if (isNaN(year) || isNaN(weekNumber)) {
        console.error("Geçersiz hafta formatı:", weekInput);
        yillikPlan.forEach(h => h.tarih = '');
        renderYillikPlan();
        return;
    }
    
    let currentMonday = getMondayOfWeek(year, weekNumber);
    const newPlan = [];
    let academicPlanIndex = 0; 
    let overallWeekCounter = 1; 
    
    const planStartDate = new Date(currentMonday);

    while(academicPlanIndex < TOPLAM_AKADEMIK_HAFTA) {
        Object.values(TATIL_DONEMLERI).forEach(tatil => {
            if (tatil.afterAcademicWeek === academicPlanIndex) {
                const holidayStartDate = new Date(currentMonday);
                newPlan.push({
                    hafta: overallWeekCounter++,
                    tarih: formatDateRange(holidayStartDate, tatil.duration),
                    type: 'holiday', label: tatil.label, duration: tatil.duration,
                    unite: '', konu: '', kazanim: '', dersSaati: '', aracGerec: [], yontemTeknik: []
                });
                for (let i = 0; i < tatil.duration; i++) {
                    currentMonday.setDate(currentMonday.getDate() + 7); 
                }
            }
        });

        if (academicPlanIndex < TOPLAM_AKADEMIK_HAFTA) {
            const academicWeekData = baseAcademicPlan[academicPlanIndex];
            newPlan.push({
                ...academicWeekData,
                hafta: overallWeekCounter++,
                tarih: formatDateRange(currentMonday, 1), 
                type: 'academic',
            });
            currentMonday.setDate(currentMonday.getDate() + 7);
            academicPlanIndex++;
        }
    }
    Object.values(TATIL_DONEMLERI).forEach(tatil => {
        if (tatil.afterAcademicWeek === TOPLAM_AKADEMIK_HAFTA) {
             const holidayStartDate = new Date(currentMonday);
            newPlan.push({
                hafta: overallWeekCounter++,
                tarih: formatDateRange(holidayStartDate, tatil.duration),
                type: 'holiday', label: tatil.label, duration: tatil.duration,
                unite: '', konu: '', kazanim: '', dersSaati: '', aracGerec: [], yontemTeknik: []
            });
            for (let i = 0; i < tatil.duration; i++) {
                 currentMonday.setDate(currentMonday.getDate() + 7);
            }
        }
    });
    yillikPlan = newPlan;

    if (yillikPlan.length > 0) {
        const genelBaslangic = yillikPlan[0].tarih.split(' - ')[0];
        const sonHafta = yillikPlan[yillikPlan.length - 1];
        const genelBitis = sonHafta.tarih.split(' - ')[1];
        planTarihAraligiDiv.textContent = `Plan Tarih Aralığı: ${genelBaslangic} - ${genelBitis}`;
    }
    renderYillikPlan();
}

function toggleAllWeeks(checked) {
    document.querySelectorAll('.week-selector').forEach(checkbox => {
        if (!checkbox.disabled) checkbox.checked = checked;
    });
    updateWeekSelectionCount();
}

function updateWeekSelectionCount() {
    const selectedWeeks = document.querySelectorAll('.week-selector:checked:not(:disabled)').length;
    const mainCheckbox = document.getElementById('selectAllWeeks');
    const totalSelectableWeeks = document.querySelectorAll('.week-selector:not(:disabled)').length;
    
    if (totalSelectableWeeks === 0) { 
        mainCheckbox.indeterminate = false; mainCheckbox.checked = false; return;
    }
    if (selectedWeeks === 0) {
        mainCheckbox.indeterminate = false; mainCheckbox.checked = false;
    } else if (selectedWeeks === totalSelectableWeeks) {
        mainCheckbox.indeterminate = false; mainCheckbox.checked = true;
    } else {
        mainCheckbox.indeterminate = true; mainCheckbox.checked = false;
    }
}

function selectWeeksWithAracGerec() {
    document.querySelectorAll('.week-selector:not(:disabled)').forEach((checkbox) => {
        const weekId = checkbox.id; 
        const idParts = weekId.split('-');
        if (idParts[0] === 'week' && idParts[1] !== 'holiday') {
            const academicWeekNum = parseInt(idParts[1]);
            const hafta = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
            if (hafta) checkbox.checked = hafta.aracGerec && hafta.aracGerec.length > 0;
        }
    });
    updateWeekSelectionCount();
}

function selectWeeksWithoutAracGerec() {
    document.querySelectorAll('.week-selector:not(:disabled)').forEach((checkbox) => {
        const weekId = checkbox.id;
        const idParts = weekId.split('-');
         if (idParts[0] === 'week' && idParts[1] !== 'holiday') {
            const academicWeekNum = parseInt(idParts[1]);
            const hafta = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
            if (hafta) checkbox.checked = !hafta.aracGerec || hafta.aracGerec.length === 0;
        }
    });
    updateWeekSelectionCount();
}

function clearWeekSelection() {
    document.querySelectorAll('.week-selector:not(:disabled)').forEach(checkbox => checkbox.checked = false);
    updateWeekSelectionCount();
}

function applyDefaultAracGerec() {
    const checkboxes = document.querySelectorAll('#aracGerecGroup input[type="checkbox"]:checked');
    const selectedAracGerec = Array.from(checkboxes).map(cb => cb.value);
    if (selectedAracGerec.length === 0) { showApplyMessage('❌ Lütfen önce araç gereç seçiniz!', 'error'); return; }
    const selectedWeekCheckboxes = document.querySelectorAll('.week-selector:checked:not(:disabled)');
    if (selectedWeekCheckboxes.length === 0) { showApplyMessage('❌ Lütfen önce hafta seçiniz!', 'error'); return; }
    let affectedWeeks = 0;
    selectedWeekCheckboxes.forEach(checkbox => {
        const weekId = checkbox.id;
        const academicWeekNum = parseInt(weekId.split('-')[1]); 
        const planEntry = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
        if (planEntry) {
            planEntry.aracGerec = [...selectedAracGerec];
            const basePlanEntry = baseAcademicPlan.find(h => h.originalAcademicWeek === academicWeekNum);
            if(basePlanEntry) basePlanEntry.aracGerec = [...selectedAracGerec];
            affectedWeeks++;
        }
    });
    renderYillikPlan();
    showApplyMessage(`✅ ${affectedWeeks} hafta yeniden belirlendi`, 'success');
}

function applyToAllWeeks() {
    const checkboxes = document.querySelectorAll('#aracGerecGroup input[type="checkbox"]:checked');
    const selectedAracGerec = Array.from(checkboxes).map(cb => cb.value);
    if (selectedAracGerec.length === 0) { showApplyMessage('❌ Lütfen önce araç gereç seçiniz!', 'error'); return; }
    let affectedCount = 0;
    yillikPlan.forEach((haftaData) => {
        if (haftaData.type === 'academic') {
            haftaData.aracGerec = [...selectedAracGerec];
            const basePlanEntry = baseAcademicPlan.find(h => h.originalAcademicWeek === haftaData.originalAcademicWeek);
            if(basePlanEntry) basePlanEntry.aracGerec = [...selectedAracGerec];
            affectedCount++;
        }
    });
    renderYillikPlan();
    showApplyMessage(`✅ Tüm ${affectedCount} akademik hafta yeniden belirlendi`, 'success');
}

function editHafta(originalAcademicWeek) { 
    const haftaData = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === originalAcademicWeek);
    if (!haftaData) return;
    const yeniKonu = prompt(`${haftaData.originalAcademicWeek}. Akademik Hafta - Konu:`, haftaData.konu);
    if (yeniKonu !== null) {
        haftaData.konu = yeniKonu;
        const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === originalAcademicWeek);
        if(baseEntry) baseEntry.konu = yeniKonu;
        renderYillikPlan();
    }
}

function showApplyMessage(text, type) {
    const messageDiv = document.getElementById('applyMessage');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`; // Class ile stil vermek daha iyi
    messageDiv.style.display = 'block';
    setTimeout(() => { messageDiv.style.display = 'none'; }, 3000);
}

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
    setTimeout(() => { messageDiv.style.display = 'none'; }, 5000);
}

function createAracGerecSelector(academicWeekNum, selectedItems = []) { 
    const container = document.createElement('div');
    container.className = 'arac-gerec-container';
    const selected = document.createElement('div');
    selected.className = 'arac-gerec-selected';
    selected.onclick = () => toggleDropdown(selected.nextElementSibling);
    const dropdown = document.createElement('div');
    dropdown.className = 'arac-gerec-dropdown';
    TUM_ARAC_GEREC_LISTESI.forEach(item => { // Global listeyi kullan
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

async function loadDemoData() {
    try {
        const response = await fetch('/demo-data');
        if (!response.ok) {
            let errorText = `HTTP error! status: ${response.status}`;
            try {
                const errorData = await response.json(); 
                errorText = errorData.message || (typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
            } catch (e) {
                const textResponse = await response.text();
                errorText = textResponse || errorText;
            }
            throw new Error(`Demo veri sunucusundan yanıt alınamadı: ${errorText}`);
        }
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
        console.error('Demo veri yükleme genel hatası:', error);
        showMessage(`❌ Demo veriler yüklenirken hata oluştu: ${error.message}`, 'error');
    }
}

async function loadSavedPlans() {
    try {
        const response = await fetch('/api/plans');
        if (!response.ok) throw new Error('Kaydedilmiş planlar yüklenemedi.');
        const plans = await response.json();
        const listDiv = document.getElementById('savedPlansList');
        listDiv.innerHTML = '';
        if (plans.length === 0) {
            listDiv.innerHTML = '<p>Kaydedilmiş plan bulunmuyor.</p>';
            return;
        }
        const ul = document.createElement('ul');
        ul.className = 'saved-plans-list';
        plans.forEach(plan => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${plan.plan_name} (${plan.ders} - ${plan.sinif})</span>
                <div>
                    <button onclick="loadSpecificPlan(${plan.id})" class="small-btn">Yükle</button>
                    <button onclick="deletePlan(${plan.id})" class="small-btn-delete">Sil</button>
                </div>
            `;
            ul.appendChild(li);
        });
        listDiv.appendChild(ul);
    } catch (error) {
        showMessage(`❌ Kayıtlı planlar yüklenirken hata: ${error.message}`, 'error');
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
        document.getElementById('newPlanName').value = data.plan_name || ''; // Kayıtlı plan adını input'a yaz

        varsayilanAracGerec = Array.isArray(data.varsayilan_arac_gerec) ? [...data.varsayilan_arac_gerec] : [];
        document.querySelectorAll('#aracGerecGroup input[type="checkbox"]').forEach(cb => {
            cb.checked = varsayilanAracGerec.includes(cb.value);
        });
        
        baseAcademicPlan = Array.isArray(data.base_academic_plan_json) ? data.base_academic_plan_json.map(h => ({...h})) : [];
        yillikPlan = Array.isArray(data.plan_data_json) ? data.plan_data_json.map(h => ({...h})) : [];

        // Eğer yillikPlan yüklendiyse, updateAllWeekDates'i çağırmak yerine doğrudan render et
        // çünkü tarihler ve tatiller zaten plan_data_json içinde olmalı.
        if (yillikPlan.length > 0) {
            renderYillikPlan();
             // Başlangıç haftasını da ayarla (eğer varsa)
            const firstWeekDate = yillikPlan[0]?.tarih.split(' - ')[0];
            if(firstWeekDate) {
                // Bu kısım başlangıç haftası input'unu ayarlamak için daha karmaşık olabilir, şimdilik atlıyoruz.
            }
            const planTarihAraligiDiv = document.getElementById('planTarihAraligi');
            if (yillikPlan.length > 0) {
                const genelBaslangic = yillikPlan[0].tarih.split(' - ')[0];
                const sonHafta = yillikPlan[yillikPlan.length - 1];
                const genelBitis = sonHafta.tarih.split(' - ')[1];
                planTarihAraligiDiv.textContent = `Plan Tarih Aralığı: ${genelBaslangic} - ${genelBitis}`;
            } else {
                 planTarihAraligiDiv.textContent = '';
            }

        } else { // Eğer plan_data_json yoksa (eski kayıtlar için), base'den oluştur
            updateAllWeekDates();
        }
        
        switchTab('temel-bilgiler'); // Kullanıcıyı ilk taba yönlendir
        showMessage(`✅ "${data.plan_name}" planı yüklendi.`, 'success');

    } catch (error) {
        showMessage(`❌ Plan yüklenirken hata: ${error.message}`, 'error');
    }
}

async function saveCurrentPlan() {
    const planName = document.getElementById('newPlanName').value.trim();
    if (!planName) {
        showMessage('❌ Kaydetmek için bir plan adı giriniz.', 'error');
        return;
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
        plan_data_json: yillikPlan, // Tüm yillikPlan (tatiller dahil)
        base_academic_plan_json: baseAcademicPlan // Sadece akademik haftaların sıralı verileri
    };

    try {
        const response = await fetch('/api/plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToSave)
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Plan kaydedilemedi.');
        }
        showMessage(`✅ "${planName}" başarıyla kaydedildi.`, 'success');
        loadSavedPlans(); // Listeyi güncelle
    } catch (error) {
        showMessage(`❌ Plan kaydedilirken hata: ${error.message}`, 'error');
    }
}

async function deletePlan(planId) {
    if (!confirm("Bu planı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
        return;
    }
    try {
        const response = await fetch(`/api/plans/${planId}`, { method: 'DELETE' });
        if (!response.ok) {
            const result = await response.json();
            throw new Error(result.error || 'Plan silinemedi.');
        }
        showMessage('🗑️ Plan başarıyla silindi.', 'success');
        loadSavedPlans(); // Listeyi güncelle
    } catch (error) {
        showMessage(`❌ Plan silinirken hata: ${error.message}`, 'error');
    }
}


function updateVarsayilanAracGerec() {
    const checkboxes = document.querySelectorAll('#aracGerecGroup input[type="checkbox"]:checked');
    varsayilanAracGerec = Array.from(checkboxes).map(cb => cb.value);
}

function updateDersSaati() {
    const newDersSaati = document.getElementById('dersSaati').value;
    yillikPlan.forEach(hafta => {
        if(hafta.type === 'academic') hafta.dersSaati = newDersSaati;
    });
    baseAcademicPlan.forEach(hafta => {
        hafta.dersSaati = newDersSaati;
    });
    renderYillikPlan(); 
}

document.addEventListener('DOMContentLoaded', function() {
    populateAracGerecCheckboxes(); // Araç gereç checkbox'larını oluştur
    
    const defaultDersSaati = document.getElementById('dersSaati').value || '4';
    if (baseAcademicPlan.length === 0) { 
        for (let i = 1; i <= TOPLAM_AKADEMIK_HAFTA; i++) {
            baseAcademicPlan.push({
                originalAcademicWeek: i, unite: '', konu: '', kazanim: '', dersSaati: defaultDersSaati,
                aracGerec: [], yontemTeknik: [], olcmeDeğerlendirme: '', aciklama: ''
            });
        }
    }
    updateAllWeekDates(); 

    document.getElementById('baslangicHaftasi').addEventListener('change', updateAllWeekDates);
    document.getElementById('dersSaati').addEventListener('change', updateDersSaati);
    
    document.getElementById('planForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const generateBtn = document.getElementById('generateBtn');
        const loading = document.getElementById('loading');
        const planForWord = yillikPlan.map(h => ({ ...h, }));
        const data = {
            okul: document.getElementById('okul').value,
            ogretmen: document.getElementById('ogretmen').value,
            ders: document.getElementById('ders').value,
            sinif: document.getElementById('sinif').value,
            egitimOgretimYili: document.getElementById('egitimOgretimYili').value,
            dersSaati: document.getElementById('dersSaati').value,
            varsayilanAracGerec: varsayilanAracGerec, 
            haftalikPlan: planForWord 
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

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.arac-gerec-container') && !e.target.classList.contains('arac-gerec-selected')) {
            document.querySelectorAll('.arac-gerec-dropdown').forEach(dropdown => {
                dropdown.style.display = 'none';
            });
        }
    });
    // İlk yüklemede kayıtlı planları da yükle (eğer sekme aktifse diye, ama switchTab'e de eklendi)
    if(document.getElementById('kaydedilen-planlar').classList.contains('active')) {
        loadSavedPlans();
    }
});
