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
let baseAcademicPlan = []; 
let varsayilanAracGerec = [];
let draggedItemIndex = null; 

const TATIL_DONEMLERI = {
    ARA_TATIL_1: { duration: 1, afterAcademicWeek: 9, label: "1. Ara Tatil" },
    YARIYIL_TATILI: { duration: 2, afterAcademicWeek: 18, label: "Yarıyıl Tatili" },
    ARA_TATIL_2: { duration: 1, afterAcademicWeek: 27, label: "2. Ara Tatil" }
};
const TOPLAM_AKADEMIK_HAFTA = 36;

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
    if (header) { 
        container.appendChild(header);
    }

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
        if(haftaData.type === 'holiday') {
            haftaNum.style.fontWeight = 'bold';
        }
        haftaDiv.appendChild(haftaNum);
        
        const tarihDiv = document.createElement('div');
        tarihDiv.textContent = haftaData.tarih || ''; 
        tarihDiv.style.padding = '6px 0'; 
        tarihDiv.style.fontSize = '11px';
        tarihDiv.style.display = 'flex';
        tarihDiv.style.alignItems = 'center';
        haftaDiv.appendChild(tarihDiv);

        if (haftaData.type === 'academic') {
            // Ders Saati (Tarihten sonra)
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

            // Ünite
            const uniteInput = document.createElement('input');
            uniteInput.type = 'text';
            uniteInput.value = haftaData.unite || '';
            uniteInput.onchange = (e) => {
                haftaData.unite = e.target.value;
                const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === haftaData.originalAcademicWeek);
                if(baseEntry) baseEntry.unite = e.target.value;
            };
            haftaDiv.appendChild(uniteInput);
            
            // Konu
            const konuInput = document.createElement('input');
            konuInput.type = 'text';
            konuInput.value = haftaData.konu || '';
            konuInput.onchange = (e) => {
                haftaData.konu = e.target.value;
                const baseEntry = baseAcademicPlan.find(b => b.originalAcademicWeek === haftaData.originalAcademicWeek);
                if(baseEntry) baseEntry.konu = e.target.value;
            };
            haftaDiv.appendChild(konuInput);
            
            // Kazanım
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
            // Tatil haftası için Ders Saati hücresini boş bırak
            const emptyDersSaatiCell = document.createElement('div');
            haftaDiv.appendChild(emptyDersSaatiCell);
            
            const tatilAciklamaDiv = document.createElement('div');
            tatilAciklamaDiv.className = 'tatil-aciklama-hucre'; 
            tatilAciklamaDiv.textContent = haftaData.label || "Tatil";
             // Kalan sütunları kaplaması için gridColumn CSS'de ayarlanacak (.holiday-week .tatil-aciklama-hucre)
            // Bu durumda 6 sütun kaplayacak (Ünite, Konu, Kazanım, Araç-Gereç, Yöntem-Teknik, Düzenle Butonu)
            tatilAciklamaDiv.style.gridColumn = 'span 6'; 
            haftaDiv.appendChild(tatilAciklamaDiv);

            const emptyEditCell = document.createElement('div'); 
            haftaDiv.appendChild(emptyEditCell); // Bu aslında gereksiz çünkü tatilAciklamaDiv zaten son hücreye kadar uzanıyor.
                                                // Ancak grid yapısını korumak için eklenebilir veya CSS ile yönetilebilir.
                                                // Daha iyi bir yaklaşım, tatilAciklamaDiv'in span'ını doğru ayarlamak.
                                                // Toplam 10 sütun var. İlk 3'ü (checkbox, hafta no, tarih) dolu.
                                                // Ders saati için bir boşluk. Kalan 6 hücre birleşecek.
                                                // Dolayısıyla tatilAciklamaDiv span 6 olmalı.
                                                // Ve edit butonu için de bir boşluk.
        }
        
        container.appendChild(haftaDiv);
    });

    updateWeekSelectionCount();
}

function handleDragStart(event, index) {
    const draggedElement = yillikPlan[index];
    if (!draggedElement || draggedElement.type === 'holiday') {
        event.preventDefault(); 
        return;
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

    if (!targetElement || draggedItemIndex === null) {
        return;
    }

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

            baseAcademicPlan.forEach((item, newIndex) => {
                item.originalAcademicWeek = newIndex + 1;
            });
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

    if (startMonth === endMonth) {
        return `${startDay} - ${endDay} ${startMonth}`;
    } else {
        return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
}

function updateAllWeekDates() {
    const weekInput = document.getElementById('baslangicHaftasi').value;
    const planTarihAraligiDiv = document.getElementById('planTarihAraligi');
    planTarihAraligiDiv.textContent = ''; 

    if (baseAcademicPlan.length !== TOPLAM_AKADEMIK_HAFTA) {
        const existingDataMap = new Map(baseAcademicPlan.map(item => [item.originalAcademicWeek, item]));
        baseAcademicPlan = [];
        const defaultDersSaati = document.getElementById('dersSaati').value || '4';
        for (let i = 1; i <= TOPLAM_AKADEMIK_HAFTA; i++) {
            const existingItem = existingDataMap.get(i);
            baseAcademicPlan.push({
                originalAcademicWeek: i,
                unite: existingItem?.unite || '',
                konu: existingItem?.konu || '',
                kazanim: existingItem?.kazanim || '',
                dersSaati: existingItem?.dersSaati || defaultDersSaati,
                aracGerec: existingItem?.aracGerec || [],
                yontemTeknik: existingItem?.yontemTeknik || [],
                olcmeDeğerlendirme: existingItem?.olcmeDeğerlendirme || '',
                aciklama: existingItem?.aciklama || ''
            });
        }
    }

    if (!weekInput) {
        const newPlan = [];
        let academicPlanIndex = 0;
        let overallWeekCounter = 1;
        
        while(academicPlanIndex < TOPLAM_AKADEMIK_HAFTA) {
            Object.values(TATIL_DONEMLERI).forEach(tatil => {
                if (tatil.afterAcademicWeek === academicPlanIndex) {
                    for (let t = 0; t < tatil.duration; t++) {
                         if (t === 0) { // Sadece tatilin ilk haftası için birleştirilmiş satır
                            newPlan.push({
                                hafta: overallWeekCounter++,
                                tarih: '', 
                                type: 'holiday', 
                                label: tatil.label,
                                duration: tatil.duration, // Tatil süresini sakla
                                unite: '', konu: '', kazanim: '', dersSaati: '', aracGerec: [], yontemTeknik: []
                            });
                        }
                    }
                }
            });
            if (academicPlanIndex < TOPLAM_AKADEMIK_HAFTA) {
                 const academicData = baseAcademicPlan[academicPlanIndex];
                 newPlan.push({
                    ...academicData,
                    hafta: overallWeekCounter++,
                    tarih: '', type: 'academic',
                    originalAcademicWeek: academicData.originalAcademicWeek 
                });
                academicPlanIndex++;
            }
        }
         Object.values(TATIL_DONEMLERI).forEach(tatil => {
            if (tatil.afterAcademicWeek === TOPLAM_AKADEMIK_HAFTA) {
                for (let t = 0; t < tatil.duration; t++) {
                     if (t === 0) {
                        newPlan.push({
                            hafta: overallWeekCounter++,
                            tarih: '', type: 'holiday', label: tatil.label,
                            duration: tatil.duration,
                            unite: '', konu: '', kazanim: '', dersSaati: '', aracGerec: [], yontemTeknik: []
                        });
                    }
                }
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
    
    baseAcademicPlan.forEach((item, idx) => item.originalAcademicWeek = idx + 1);

    while(academicPlanIndex < TOPLAM_AKADEMIK_HAFTA) {
        Object.values(TATIL_DONEMLERI).forEach(tatil => {
            if (tatil.afterAcademicWeek === academicPlanIndex) {
                const holidayStartDate = new Date(currentMonday);
                newPlan.push({
                    hafta: overallWeekCounter++,
                    tarih: formatDateRange(holidayStartDate, tatil.duration),
                    type: 'holiday',
                    label: tatil.label,
                    duration: tatil.duration,
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
                type: 'holiday',
                label: tatil.label,
                duration: tatil.duration,
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
        if (!checkbox.disabled) { 
            checkbox.checked = checked;
        }
    });
    updateWeekSelectionCount();
}

function updateWeekSelectionCount() {
    const selectedWeeks = document.querySelectorAll('.week-selector:checked:not(:disabled)').length;
    const mainCheckbox = document.getElementById('selectAllWeeks');
    const totalSelectableWeeks = document.querySelectorAll('.week-selector:not(:disabled)').length;
    
    if (totalSelectableWeeks === 0) { 
        mainCheckbox.indeterminate = false;
        mainCheckbox.checked = false;
        return;
    }
    
    if (selectedWeeks === 0) {
        mainCheckbox.indeterminate = false;
        mainCheckbox.checked = false;
    } else if (selectedWeeks === totalSelectableWeeks) {
        mainCheckbox.indeterminate = false;
        mainCheckbox.checked = true;
    } else {
        mainCheckbox.indeterminate = true;
        mainCheckbox.checked = false;
    }
}

function selectWeeksWithAracGerec() {
    document.querySelectorAll('.week-selector:not(:disabled)').forEach((checkbox) => {
        const weekId = checkbox.id; 
        const idParts = weekId.split('-');
        if (idParts[0] === 'week' && idParts[1] !== 'holiday') {
            const academicWeekNum = parseInt(idParts[1]);
            const hafta = yillikPlan.find(h => h.type === 'academic' && h.originalAcademicWeek === academicWeekNum);
            if (hafta) {
                checkbox.checked = hafta.aracGerec && hafta.aracGerec.length > 0;
            }
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
            if (hafta) {
                checkbox.checked = !hafta.aracGerec || hafta.aracGerec.length === 0;
            }
        }
    });
    updateWeekSelectionCount();
}

function clearWeekSelection() {
    document.querySelectorAll('.week-selector:not(:disabled)').forEach(checkbox => {
        checkbox.checked = false;
    });
    updateWeekSelectionCount();
}

function applyDefaultAracGerec() {
    const checkboxes = document.querySelectorAll('#aracGerecGroup input[type="checkbox"]:checked');
    const selectedAracGerec = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedAracGerec.length === 0) {
        showApplyMessage('❌ Lütfen önce araç gereç seçiniz!', 'error');
        return;
    }

    const selectedWeekCheckboxes = document.querySelectorAll('.week-selector:checked:not(:disabled)');
    
    if (selectedWeekCheckboxes.length === 0) {
        showApplyMessage('❌ Lütfen önce hafta seçiniz!', 'error');
        return;
    }

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
    
    if (selectedAracGerec.length === 0) {
        showApplyMessage('❌ Lütfen önce araç gereç seçiniz!', 'error');
        return;
    }

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
    messageDiv.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
    messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';
    messageDiv.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

const tumAracGerec = [
    "Tahta", "Projeksiyon", "Hesap Makinesi", "Bilgisayar", "Akıllı Tahta",
    "Grafik Tablet", "Cetvel Seti", "Pergel", "Gönye", "Çalışma Yaprağı",
    "Model", "Poster", "Video", "Animasyon", "Oyun", "Deney Seti"
];

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

function createAracGerecSelector(academicWeekNum, selectedItems = []) { 
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

        let data;
        try {
            data = await response.json();
        } catch (jsonError) {
            console.error('JSON parse hatası:', jsonError);
            throw new Error('Demo verileri işlenirken bir hata oluştu (geçersiz format).');
        }

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
                element.value = data[field.dataKey] !== undefined ? data[field.dataKey] : ''; 
            } else {
                console.warn(`Form elemanı bulunamadı: #${field.id}`);
            }
        });

        if (Array.isArray(data.varsayilanAracGerec)) {
            varsayilanAracGerec = [...data.varsayilanAracGerec]; 
            varsayilanAracGerec.forEach(item => {
                const escapedItem = String(item).replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
                const checkbox = document.querySelector(`#aracGerecGroup input[value="${escapedItem}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                } else {
                    console.warn(`Araç gereç checkbox bulunamadı: input[value="${escapedItem}"]`);
                }
            });
        } else {
            varsayilanAracGerec = []; 
        }

        if (Array.isArray(data.haftalikPlan)) {
            baseAcademicPlan = data.haftalikPlan.map((hafta, index) => ({
                originalAcademicWeek: index + 1, 
                unite: hafta.unite || '',
                konu: hafta.konu || '',
                kazanim: hafta.kazanim || '',
                dersSaati: hafta.dersSaati || document.getElementById('dersSaati').value || '4',
                aracGerec: Array.isArray(hafta.aracGerec) ? [...hafta.aracGerec] : [],
                yontemTeknik: Array.isArray(hafta.yontemTeknik) ? [...hafta.yontemTeknik] : [],
                olcmeDeğerlendirme: hafta.olcmeDeğerlendirme || '',
                aciklama: hafta.aciklama || ''
            }));
        } else {
            baseAcademicPlan = []; 
        }
        
        updateAllWeekDates(); 
        showMessage('✅ Demo veriler başarıyla yüklendi! 36 haftalık Matematik planı hazır.', 'success');
        
    } catch (error) {
        console.error('Demo veri yükleme genel hatası:', error);
        showMessage(`❌ Demo veriler yüklenirken hata oluştu: ${error.message}`, 'error');
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
    const defaultDersSaati = document.getElementById('dersSaati').value || '4';
    if (baseAcademicPlan.length === 0) { 
        for (let i = 1; i <= TOPLAM_AKADEMIK_HAFTA; i++) {
            baseAcademicPlan.push({
                originalAcademicWeek: i,
                unite: '',
                konu: '',
                kazanim: '',
                dersSaati: defaultDersSaati,
                aracGerec: [],
                yontemTeknik: [],
                olcmeDeğerlendirme: '',
                aciklama: ''
            });
        }
    }
    updateAllWeekDates(); 

    document.getElementById('baslangicHaftasi').addEventListener('change', updateAllWeekDates);
    document.getElementById('dersSaati').addEventListener('change', updateDersSaati);
    document.querySelectorAll('#aracGerecGroup input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateVarsayilanAracGerec);
    });

    document.getElementById('planForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const generateBtn = document.getElementById('generateBtn');
        const loading = document.getElementById('loading');
        
        const planForWord = yillikPlan.map(h => ({
            ...h, 
        }));
        
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
});
