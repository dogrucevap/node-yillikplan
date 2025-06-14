const settingsSidebar = document.getElementById('settingsSidebar');
const sidebarTitle = document.getElementById('sidebarTitle');
const sidebarGlobalBackBtn = document.getElementById('sidebarGlobalBackBtn');
const settingsBtn = document.getElementById('settingsBtn'); // floating button
let currentSidebarView = 'mainMenuView';
let isSidebarOpen = false; // Yan menünün durumunu takip etmek için

function updateSidebarActionButtonsState() {
    // Bu fonksiyon, kenar çubuğundaki eylem düğmelerinin durumunu
    // mevcut seçimlere veya genel duruma göre günceller (örn. haftalar seçiliyse ilgili butonları aktif et).
    // console.log('updateSidebarActionButtonsState çağrıldı');

    const selectedWeeks = document.querySelectorAll('#haftaContainer .week-checkbox:checked:not(:disabled)');
    // const mudurSelected = document.querySelector('#sidebarMudurList .mudur-item-button.selected'); // Gerekirse kullanılabilir

    // Örnek: Seçili haftalara araç-gereç/yöntem-teknik uygulama butonları
    const agEkleSeciliBtn = document.getElementById('agEkleSeciliHaftalaraBtn');
    if (agEkleSeciliBtn) agEkleSeciliBtn.disabled = selectedWeeks.length === 0;
    
    const agEsitleSeciliBtn = document.getElementById('agEsitleSeciliHaftalarBtn');
    if (agEsitleSeciliBtn) agEsitleSeciliBtn.disabled = selectedWeeks.length === 0;

    const ytEkleSeciliBtn = document.getElementById('ytEkleSeciliHaftalaraBtn');
    if (ytEkleSeciliBtn) ytEkleSeciliBtn.disabled = selectedWeeks.length === 0;

    const ytEsitleSeciliBtn = document.getElementById('ytEsitleSeciliHaftalarBtn');
    if (ytEsitleSeciliBtn) ytEsitleSeciliBtn.disabled = selectedWeeks.length === 0;

    // Diğer butonlar için benzer mantıklar eklenebilir.
    // Örneğin, "Seçili Öğretmenleri Plana Ekle" butonu:
    // const updateOgretmenlerBtn = document.getElementById('updateOgretmenlerInPlanBtn');
    // if (updateOgretmenlerBtn) {
    //    const selectedOgretmenler = document.querySelectorAll('#sidebarOgretmenList .ogretmen-item-button.selected');
    //    updateOgretmenlerBtn.disabled = selectedOgretmenler.length === 0;
    // }
}

// toggleSidebar fonksiyon tanımı
function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    if (settingsSidebar) {
        settingsSidebar.classList.toggle('open', isSidebarOpen);
    }
    document.body.classList.toggle('sidebar-active', isSidebarOpen);
    if (settingsBtn) {
        settingsBtn.innerHTML = isSidebarOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        settingsBtn.style.display = isSidebarOpen ? 'none' : 'flex'; // Veya 'block'
    }
    
    if (isSidebarOpen) {
        const activeViewElement = document.querySelector('.sidebar-view.active-view');
        // Menü ilk açıldığında veya aktif görünüm ana menü değilse ana menüye git
        // Veya currentSidebarView geçerli bir ID ise ve o görünüm aktif değilse ona git
        let targetViewToShow = 'mainMenuView';
        if (document.getElementById(currentSidebarView)) { // currentSidebarView'in geçerli bir ID olup olmadığını kontrol et
            targetViewToShow = currentSidebarView;
        }

        if (!activeViewElement || activeViewElement.id !== targetViewToShow) {
            navigateToView(targetViewToShow);
        } else if (activeViewElement.id === targetViewToShow && !activeViewElement.classList.contains('active-view')){
             // Eğer bir şekilde mainMenuView aktif değilse tekrar yükle (bu durum nadir olmalı)
             navigateToView(targetViewToShow);
        }
    }
}

function updateYillikPlanBasligi() {
    const okulAdi = document.getElementById('okulSidebar')?.value || "[Okul Adı]";
    const egitimYili = document.getElementById('egitimOgretimYiliSidebar')?.value || "[Eğitim Öğretim Yılı]";
    const dersAdi = document.getElementById('dersSidebar')?.value || "[Ders Adı]";
    const sinif = document.getElementById('sinifSidebar')?.value || "[Sınıf]";
    const baslikElement = document.getElementById('yillikPlanBasligi');
    if (baslikElement) {
        baslikElement.textContent = `T.C. MİLLİ EĞİTİM BAKANLIĞI ${okulAdi.toUpperCase()} ${egitimYili} EĞİTİM ÖĞRETİM YILI ${dersAdi.toUpperCase()} ${sinif.toUpperCase()} DERSİ ÜNİTELENDİRİLMİŞ YILLIK PLANI`;
    }
}

async function checkAuthStatus() {
    const userAuthSection = document.getElementById('userAuthSection');
    if (!userAuthSection) return;
    try {
        const response = await fetch('/api/auth/status');
        if (!response.ok) {
            userAuthSection.innerHTML = '<a href="/auth/google" class="auth-link login-link">Google ile Giriş Yap</a>';
            return;
        }
        const authData = await response.json();
        if (authData.isAuthenticated && authData.user) {
            let userInfoHTML = '';
            if (authData.user.photo) userInfoHTML += `<img src="${authData.user.photo}" alt="${authData.user.displayName}" class="user-avatar"> `;
            userInfoHTML += `<span class="user-name">${authData.user.displayName || 'Kullanıcı'}</span>`;
            if (authData.user.email) userInfoHTML += ` <span class="user-email">(${authData.user.email})</span>`;
            userInfoHTML += ` | <a href="/auth/logout" class="auth-link logout-link">Çıkış Yap</a>`;
            userAuthSection.innerHTML = userInfoHTML;
            if (authData.user.displayName) {
                await loadAllPersonal();
                const loggedInUserName = authData.user.displayName;
                const foundTeacher = tumPersonalListesi.find(p => p.name === loggedInUserName && (p.branch === "Öğretmen" || !p.isMudur));
                if (foundTeacher && !planaEklenenPersonal.some(p => p.id === foundTeacher.id && !p.isMudur)) {
                    planaEklenenPersonal = planaEklenenPersonal.filter(p => p.isMudur);
                    planaEklenenPersonal.push({ ...foundTeacher, isMudur: false });
                    sortAndRenderImzaAlani();
                    showMessage(`Hoş geldiniz ${loggedInUserName}! Planda varsayılan öğretmen olarak ayarlandınız.`, "success");
                }
            }
        } else {
            userAuthSection.innerHTML = '<a href="/auth/google" class="auth-link login-link">Google ile Giriş Yap</a>';
        }
    } catch (error) {
        console.error('Kimlik doğrulama hatası:', error);
        userAuthSection.innerHTML = '<a href="/auth/google" class="auth-link login-link">Google ile Giriş Yap (Hata)</a>';
    }
}

function navigateToView(targetViewId) {
    const views = document.querySelectorAll('.sidebar-view');
    const targetView = document.getElementById(targetViewId);
    const currentActiveViewElement = document.getElementById(currentSidebarView); // Renamed for clarity

    if (!targetView) { console.error(`Hedef görünüm bulunamadı: ${targetViewId}`); return; }
    
    // If already on the target view and it's active, do nothing.
    if (currentActiveViewElement === targetView && targetView.classList.contains('active-view')) {
        return;
    }

    const isNavigatingBack = targetViewId === 'mainMenuView' || 
                           (currentSidebarView === 'ogretmenEkleView' && targetViewId === 'ogretmenYonetimiView') ||
                           (currentSidebarView === 'ogretmenDuzenleView' && targetViewId === 'ogretmenYonetimiView');

    // Handle the view that is currently active and will be navigated away from
    if (currentActiveViewElement && currentActiveViewElement !== targetView) {
        currentActiveViewElement.classList.remove('active-view');
        if (!isNavigatingBack) {
            // Forward navigation: current view slides out to the left
            currentActiveViewElement.classList.add('prev-view');
        }
        // If isNavigatingBack, currentActiveViewElement simply loses 'active-view'.
        // Its CSS transition should take it to its default translateX(100%) style.
    }

    // Handle the target view that will become active
    // Ensure it's not 'prev-view' before making it active, so it slides in from the correct direction.
    targetView.classList.remove('prev-view'); 
    
    // Force a reflow if needed before adding active-view, to ensure transition starts correctly
    // void targetView.offsetWidth; // This can sometimes help if transitions are not smooth

    targetView.classList.add('active-view');
    
    // Clean up: Ensure other views that are not the target or the one just navigated from (if forward)
    // are reset to their default state (not active, not prev).
    views.forEach(view => {
        if (view !== targetView) {
            view.classList.remove('active-view');
            // Only keep 'prev-view' on the element that just slid out left (currentActiveViewElement in forward nav)
            if (view !== currentActiveViewElement || isNavigatingBack) {
                view.classList.remove('prev-view');
            }
        }
    });

    currentSidebarView = targetViewId;

    if (sidebarTitle && sidebarGlobalBackBtn) {
        sidebarGlobalBackBtn.style.display = 'inline-block';
        sidebarGlobalBackBtn.dataset.viewTarget = 'mainMenuView';
        let newTitle = 'Ayarlar';
        let showBackBtn = true;
        switch (targetViewId) {
            case 'mainMenuView': newTitle = 'Ayarlar'; showBackBtn = false; break;
            case 'aracGerecView': newTitle = 'Araç-Gereç Yönetimi'; break;
            case 'dersSaatiView': newTitle = 'Ders Saati Yönetimi'; break;
            case 'yontemTeknikView': newTitle = 'Yöntem ve Teknik Yönetimi'; break;
            case 'okulMuduruView': newTitle = 'Okul Müdürü Yönetimi'; break;
            case 'ogretmenYonetimiView': newTitle = 'Öğretmen Yönetimi'; break;
            case 'ogretmenEkleView': newTitle = 'Yeni Öğretmen Ekle'; sidebarGlobalBackBtn.dataset.viewTarget = 'ogretmenYonetimiView'; break;
            case 'ogretmenDuzenleView': newTitle = 'Öğretmen Düzenle'; sidebarGlobalBackBtn.dataset.viewTarget = 'ogretmenYonetimiView'; break;
            case 'genelPlanBilgileriView': newTitle = 'Genel Plan Bilgileri'; break;
            default: showBackBtn = false; break;
        }
        sidebarTitle.textContent = newTitle;
        sidebarGlobalBackBtn.style.display = showBackBtn ? 'inline-block' : 'none';
    }
}

function getThirdMondayWeekInSeptember(year) {
    let mondayCount = 0; let thirdMondayDate = null;
    for (let day = 1; day <= 30; day++) {
        const date = new Date(year, 8, day);
        if (date.getDay() === 1) { mondayCount++; if (mondayCount === 3) { thirdMondayDate = date; break; } }
    }
    if (thirdMondayDate) {
        const firstDayOfYear = new Date(thirdMondayDate.getFullYear(), 0, 1);
        const pastDaysOfYear = (thirdMondayDate - firstDayOfYear) / 86400000;
        const dayOfWeekOffset = (firstDayOfYear.getDay() === 0) ? 6 : firstDayOfYear.getDay() - 1;
        return `${year}-W${String(Math.ceil((pastDaysOfYear + 1 + dayOfWeekOffset) / 7)).padStart(2, '0')}`;
    }
    return null;
}

function setDefaultBaslangicHaftasi() {
    const egitimOgretimYiliSelect = document.getElementById('egitimOgretimYiliSidebar');
    const baslangicHaftasiInput = document.getElementById('baslangicHaftasiSidebar');
    if (egitimOgretimYiliSelect && baslangicHaftasiInput) {
        const egitimYiliValue = egitimOgretimYiliSelect.value;
        if (egitimYiliValue && egitimYiliValue.includes('-')) {
            const startYear = parseInt(egitimYiliValue.split('-')[0], 10);
            if (!isNaN(startYear)) baslangicHaftasiInput.value = getThirdMondayWeekInSeptember(startYear) || '';
        } else baslangicHaftasiInput.value = '';
        updateAllWeekDates();
    }
}

function populateEgitimOgretimYiliOptions(targetElementId = 'egitimOgretimYiliSidebar') {
    const selectElement = document.getElementById(targetElementId);
    if (!selectElement) { console.error(`Eğitim yılı select bulunamadı: ${targetElementId}`); return; }
    selectElement.innerHTML = '';
    const currentDate = new Date(); let currentYear = currentDate.getFullYear();
    let activeStartYear = (currentDate.getMonth() >= 7) ? currentYear : currentYear - 1;
    for (let i = 0; i < 4; i++) {
        const year1 = activeStartYear + i; const optionValue = `${year1}-${year1 + 1}`;
        const optionElement = new Option(optionValue, optionValue, i === 0, i === 0);
        selectElement.appendChild(optionElement);
    }
}

let seciliDersSaati = null;
function selectDersSaati(saat) { seciliDersSaati = saat; document.querySelectorAll('.ders-saati-btn').forEach(btn => btn.classList.toggle('selected', btn.dataset.saat === saat)); }
function applyDersSaatiToAll() { if (seciliDersSaati === null) { showMessage("Lütfen önce bir ders saati seçin.", "error"); return; } baseAcademicPlan.forEach(h => h.dersSaati = seciliDersSaati); updateAllWeekDates(); showMessage(`${seciliDersSaati} ders saati tüm haftalara uygulandı.`, "success"); }

let yillikPlan = []; let baseAcademicPlan = []; let currentEditingPlanId = null;
let tumAracGerecListesi = []; let tumYontemTeknikListesi = []; let tumPersonalListesi = [];
let planaEklenenPersonal = [];
const TATIL_DONEMLERI = { ARA_TATIL_1: { duration: 1, afterAcademicWeek: 9, label: "1. Ara Tatil" }, YARIYIL_TATILI: { duration: 2, afterAcademicWeek: 18, label: "Yarıyıl Tatili" }, ARA_TATIL_2: { duration: 1, afterAcademicWeek: 27, label: "2. Ara Tatil" }};
const TOPLAM_AKADEMIK_HAFTA = 36; let draggedItemIndex = null;

async function loadResourceList(apiUrl, listVarName, populateFn, defaultList = []) {
    try {
        const r = await fetch(apiUrl);
        if (!r.ok) throw new Error(`API call to ${apiUrl} failed with status ${r.status}`);
        window[listVarName] = await r.json();
    } catch (e) {
        console.error(`Error loading or parsing ${listVarName} from ${apiUrl}:`, e);
        window[listVarName] = defaultList;
    }
    try {
        populateFn();
    } catch (e) {
        console.error(`Error in populateFn for ${listVarName} (data source: ${apiUrl}):`, e);
    }
}
function populateSidebarGenericList(containerId, items, selectedGetter, clickHandler, deleteHandler, nameField = 'name', valueField = 'name', deleteSuffix = '') { const cont = document.getElementById(containerId); if (!cont) return; cont.innerHTML = ''; const selItems = selectedGetter ? selectedGetter() : []; items.sort((a,b) => (a[nameField]||'').localeCompare(b[nameField]||'')).forEach(item => { const w = document.createElement('div'); w.className='item-button-wrapper'; const b = document.createElement('button'); b.className='item-button'; b.textContent=item[nameField]; b.dataset.value=item[valueField]; if(selItems.includes(item[valueField]))b.classList.add('selected'); b.onclick=()=>clickHandler(b,item); const del=document.createElement('button'); del.className='item-delete-btn'; del.innerHTML='<i class="fas fa-minus"></i>'; del.title=`"${item[nameField]}" ${deleteSuffix} sil`; del.onclick=(e)=>{e.stopPropagation();deleteHandler(item);}; w.appendChild(b);w.appendChild(del);cont.appendChild(w); }); }
async function addCustomGenericItem(inputId, apiUrl, listVarName, loadFn, itemTypeTR) { const input = document.getElementById(inputId); if(!input)return; const name = input.value.trim(); if(!name){showMessage(`Lütfen ${itemTypeTR} adı girin.`,"error");return;} if(window[listVarName].some(i=>i.name===name||i===name)){showMessage(`"${name}" zaten listede.`,'error');return;} try {const r=await fetch(apiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})}); const res=await r.json();if(!r.ok)throw new Error(res.error||'Sunucu hatası'); await loadFn();input.value='';showMessage(`"${name}" eklendi.`,'success');}catch(e){console.error(`Yeni ${itemTypeTR} ekleme hatası:`,e);showMessage(`❌ ${itemTypeTR} eklenemedi: ${e.message}`,'error');}}
async function deleteGenericItem(item, apiUrl, confirmMsg, successMsg, errorMsgPrefix, loadFn, nameField='name') { const name = typeof item === 'object' ? item[nameField] : item; if(!confirm(confirmMsg.replace('%s',name)))return; try {const r=await fetch(`${apiUrl}/${encodeURIComponent(name)}`,{method:'DELETE'}); const res=await r.json();if(!r.ok)throw new Error(res.error||'Silinemedi'); showMessage(successMsg.replace('%s',name),'success');await loadFn();}catch(e){console.error(`${errorMsgPrefix} silme hatası:`,e);showMessage(`❌ ${errorMsgPrefix} silinemedi: ${e.message}`,'error');}}

function populateSidebarAracGerec(){populateSidebarGenericList('sidebarAracGerecList',tumAracGerecListesi,getSelectedSidebarAracGerec,(b)=>b.classList.toggle('selected'),(i)=>deleteAracGerecTipi(i.name||i),'name','name','adlı aracı');}
async function loadAllAracGerecTipleri(){await loadResourceList('/api/arac-gerec-tipleri','tumAracGerecListesi',populateSidebarAracGerec,["Tahta","Projeksiyon"]);}
async function addCustomAracGerec(){await addCustomGenericItem('customAracGerecInput','/api/arac-gerec-tipleri','tumAracGerecListesi',loadAllAracGerecTipleri,'araç-gereç');}
async function deleteAracGerecTipi(name){await deleteGenericItem(name,'/api/arac-gerec-tipleri','"%s" adlı aracı sil?','"%s" silindi.','Araç-gereç',loadAllAracGerecTipleri);}
function getSelectedSidebarAracGerec(){const s=[];document.querySelectorAll('#sidebarAracGerecList .item-button.selected').forEach(b=>s.push(b.dataset.value));return s;}

function populateSidebarYontemTeknik(){populateSidebarGenericList('sidebarYontemTeknikList',tumYontemTeknikListesi,getSelectedSidebarYontemTeknik,(b)=>b.classList.toggle('selected'),(i)=>deleteYontemTeknikTipi(i.name||i),'name','name','adlı yöntemi/tekniği');}
async function loadAllYontemTeknikTipleri(){await loadResourceList('/api/yontem-teknik-tipleri','tumYontemTeknikListesi',populateSidebarYontemTeknik,["Anlatım","Soru-Cevap"]);}
async function addCustomYontemTeknik(){await addCustomGenericItem('customYontemTeknikInput','/api/yontem-teknik-tipleri','tumYontemTeknikListesi',loadAllYontemTeknikTipleri,'yöntem/teknik');}
async function deleteYontemTeknikTipi(name){await deleteGenericItem(name,'/api/yontem-teknik-tipleri','"%s" adlı yöntemi/tekniği sil?','"%s" silindi.','Yöntem/teknik',loadAllYontemTeknikTipleri);}
function getSelectedSidebarYontemTeknik(){const s=[];document.querySelectorAll('#sidebarYontemTeknikList .item-button.selected').forEach(b=>s.push(b.dataset.value));return s;}

function applySidebarSelectionToAction(actionType,getter,itemTR,field){const items=getter();if(items.length===0&&(actionType.includes('esitle')||actionType.includes('ekle'))){showMessage(`Kenar çubuğundan ${itemTR} seçin.`,"error");return;} const weekChecks=document.querySelectorAll('#haftaContainer .week-checkbox:checked:not(:disabled)'); const weekNums=Array.from(weekChecks).map(cb=>parseInt(cb.id.split('-')[1])).filter(id=>!isNaN(id)); if(actionType.includes('Secili')&&weekNums.length===0){showMessage("Yıllık plandan hafta seçin.","error");return;} let changed=false;baseAcademicPlan.forEach(bh=>{const target=actionType.includes('Tum')||(actionType.includes('Secili')&&weekNums.includes(bh.originalAcademicWeek)); if(target){changed=true;if(actionType.startsWith('esitle'))bh[field]=[...items];else if(actionType.startsWith('ekle')){bh[field]=bh[field]||[];items.forEach(i=>{if(!bh[field].includes(i))bh[field].push(i);});}}}); yillikPlan.forEach(ph=>{if(ph.type==='academic'){const base=baseAcademicPlan.find(b=>b.originalAcademicWeek===ph.originalAcademicWeek);if(base)ph[field]=[...(base[field]||[])];}}); if(changed){renderYillikPlan();showMessage(`${itemTR.charAt(0).toUpperCase()+itemTR.slice(1)} güncellendi.`,"success");}else showMessage("Değişiklik yapılmadı.","info");}
function applyAracGerecAction(type){applySidebarSelectionToAction(type,getSelectedSidebarAracGerec,'araç-gereç','aracGerec');}
function applyYontemTeknikAction(type){applySidebarSelectionToAction(type,getSelectedSidebarYontemTeknik,'yöntem/teknik','yontemTeknik');}

async function loadAllPersonal(){
    try{
        const r=await fetch('/api/ogretmenler');
        if(!r.ok)throw new Error('Personel yüklenemedi.');
        const d=await r.json();
        tumPersonalListesi=Array.isArray(d)?d.map(o=>({id:o.id,name:o.ad_soyad,branch:o.unvan,isMudur:o.unvan?.toLowerCase().includes('müdür')||false})):[];
    }catch(e){
        console.error("Personel yükleme hatası:",e);
        tumPersonalListesi=[];
    }
    try {
        populateSidebarMudurList();
    } catch (e) {
        console.error("Error in populateSidebarMudurList:", e);
    }
    try {
        populateSidebarOgretmenList();
    } catch (e) {
        console.error("Error in populateSidebarOgretmenList:", e);
    }
}
function populateSidebarMudurList(){const mudurler=tumPersonalListesi.filter(p=>p.isMudur);const cont=document.getElementById('sidebarMudurList');if(!cont)return;cont.innerHTML='';mudurler.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).forEach(m=>{const w=document.createElement('div');w.className='item-button-wrapper';const b=document.createElement('button');b.className='item-button mudur-item-button';b.textContent=m.name;b.dataset.id=m.id;if(planaEklenenPersonal.some(p=>p.isMudur&&p.id===m.id))b.classList.add('selected');b.onclick=()=>{const currentSel=b.classList.contains('selected');document.querySelectorAll('#sidebarMudurList .mudur-item-button').forEach(btn=>btn.classList.remove('selected'));if(!currentSel)b.classList.add('selected');updateSidebarActionButtonsState();};const del=document.createElement('button');del.className='item-delete-btn';del.innerHTML='<i class="fas fa-trash-alt"></i>';del.title=`"${m.name}" sil`;del.onclick=(e)=>{e.stopPropagation();deletePersonal(m.id,m.name,true);};w.appendChild(b);w.appendChild(del);cont.appendChild(w);});updateSidebarActionButtonsState();}
async function addCustomMudur(){const input=document.getElementById('customMudurInput');if(!input)return;const name=input.value.trim();if(!name){showMessage("Müdür adı girin.","error");return;}try{const r=await fetch('/api/ogretmenler',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ad_soyad:name,unvan:"Okul Müdürü"})});const res=await r.json();if(!r.ok)throw new Error(res.error||'Sunucu hatası');await loadAllPersonal();input.value='';showMessage(`"${name}" (Okul Müdürü) eklendi.`,'success');}catch(e){console.error("Müdür ekleme hatası:",e);showMessage(`❌ Müdür eklenemedi: ${e.message}`,'error');}}
function updateMudurInPlan(){planaEklenenPersonal=planaEklenenPersonal.filter(p=>!p.isMudur);const selMudurBtn=document.querySelector('#sidebarMudurList .mudur-item-button.selected');if(selMudurBtn){const mudurId=selMudurBtn.dataset.id;const mudurData=tumPersonalListesi.find(p=>p.id.toString()===mudurId&&p.isMudur);if(mudurData){planaEklenenPersonal.push({...mudurData,isMudur:true});showMessage(`"${mudurData.name}" plana eklendi.`,"success");}else showMessage("Seçilen müdür bulunamadı.","error");}else showMessage("Plandaki müdür kaldırıldı.","success");sortAndRenderImzaAlani();}
function populateSidebarOgretmenList(){const ogretmenler=tumPersonalListesi.filter(p=>!p.isMudur);const cont=document.getElementById('sidebarOgretmenList');if(!cont)return;cont.innerHTML='';ogretmenler.sort((a,b)=>(a.name||'').localeCompare(b.name||'')).forEach(o=>{const w=document.createElement('div');w.className='ogretmen-item-wrapper';const b=document.createElement('button');b.className='ogretmen-item-button';b.dataset.id=o.id;if(planaEklenenPersonal.some(p=>p.id===o.id&&!p.isMudur))b.classList.add('selected');b.onclick=()=>{b.classList.toggle('selected');updateAddSelectedOgretmenlerToPlanBtnState();};const info=document.createElement('div');info.className='ogretmen-info';const nameS=document.createElement('span');nameS.className='ogretmen-name';nameS.textContent=o.name;const branchS=document.createElement('span');branchS.className='ogretmen-branch';branchS.textContent=o.branch||'Branş Yok';info.appendChild(nameS);info.appendChild(document.createElement('br'));info.appendChild(branchS);b.appendChild(info);const actions=document.createElement('div');actions.className='ogretmen-item-actions';const edit=document.createElement('button');edit.className='ogretmen-edit-btn icon-btn';edit.innerHTML='<i class="fas fa-chevron-right"></i>';edit.title=`"${o.name}" düzenle`;edit.onclick=(e)=>{e.stopPropagation();navigateToOgretmenDuzenleView(o.id);};const del=document.createElement('button');del.className='ogretmen-delete-db-btn icon-btn';del.innerHTML='<i class="fas fa-trash-alt"></i>';del.title=`"${o.name}" sil`;del.onclick=(e)=>{e.stopPropagation();deletePersonal(o.id,o.name,false);};actions.appendChild(edit);actions.appendChild(del);w.appendChild(b);w.appendChild(actions);cont.appendChild(w);});updateAddSelectedOgretmenlerToPlanBtnState();}
function navigateToOgretmenDuzenleView(id){const o=tumPersonalListesi.find(p=>p.id===id&&!p.isMudur);if(o){document.getElementById('duzenlenenOgretmenIdInput').value=o.id;document.getElementById('duzenlenenOgretmenAdiSoyadiInput').value=o.name;document.getElementById('duzenlenenOgretmenBransInput').value=o.branch;navigateToView('ogretmenDuzenleView');}else showMessage("Öğretmen bulunamadı.","error");}
async function saveYeniOgretmen(){const adInput=document.getElementById('yeniOgretmenAdiSoyadiInput');const bransInput=document.getElementById('yeniOgretmenBransInput');const ad=adInput.value.trim();const unvan=bransInput.value.trim();if(!ad||!unvan){showMessage("Ad ve branş girin.","error");return;}if(unvan.toLowerCase().includes("müdür")){showMessage("Müdür için ayrı menü.","warning");return;}try{const r=await fetch('/api/ogretmenler',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ad_soyad:ad,unvan})});const res=await r.json();if(!r.ok)throw new Error(res.error||'Kaydedilemedi.');await loadAllPersonal();adInput.value='';bransInput.value='';showMessage(`"${ad}" (${unvan}) eklendi.`,'success');navigateToView('ogretmenYonetimiView');}catch(e){showMessage(`❌ Öğretmen eklenemedi: ${e.message}`,'error');}}
async function saveDuzenlenenOgretmen(){const id=document.getElementById('duzenlenenOgretmenIdInput').value;const adInput=document.getElementById('duzenlenenOgretmenAdiSoyadiInput');const bransInput=document.getElementById('duzenlenenOgretmenBransInput');const ad=adInput.value.trim();const unvan=bransInput.value.trim();if(!ad||!unvan){showMessage("Ad ve branş girin.","error");return;}if(unvan.toLowerCase().includes("müdür")){showMessage("Unvan 'müdür' içeremez.","warning");return;}try{const r=await fetch(`/api/ogretmenler/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({ad_soyad:ad,unvan})});const res=await r.json();if(!r.ok)throw new Error(res.error||'Güncellenemedi.');showMessage(`"${ad}" güncellendi.`,'success');await loadAllPersonal();navigateToView('ogretmenYonetimiView');}catch(e){showMessage(`❌ Öğretmen güncellenemedi: ${e.message}`,'error');}}
function updateAddSelectedOgretmenlerToPlanBtnState(){const b=document.getElementById('updateOgretmenlerInPlanBtn');if(b)b.disabled=false;}
function getSelectedSidebarOgretmenler(){const s=[];document.querySelectorAll('#sidebarOgretmenList .ogretmen-item-button.selected').forEach(b=>{const o=tumPersonalListesi.find(p=>p.id.toString()===b.dataset.id&&!p.isMudur);if(o)s.push(o);});return s;}
function updateOgretmenlerInPlan(){const selOgretmenler=getSelectedSidebarOgretmenler();const mudur=planaEklenenPersonal.find(p=>p.isMudur);planaEklenenPersonal=mudur?[mudur]:[];selOgretmenler.forEach(o=>planaEklenenPersonal.push({...o,isMudur:false}));sortAndRenderImzaAlani();showMessage(selOgretmenler.length>0?"Öğretmenler güncellendi.":"Tüm öğretmenler kaldırıldı.","success");}
async function deletePersonal(id,name,isMudur){const type=isMudur?"müdürü":"öğretmeni";if(!confirm(`"${name}" adlı ${type} sil?`))return;try{const r=await fetch(`/api/ogretmenler/${id}`,{method:'DELETE'});const res=await r.json();if(!r.ok)throw new Error(res.error||'Silinemedi');showMessage(`"${name}" silindi.`,"success");await loadAllPersonal();planaEklenenPersonal=planaEklenenPersonal.filter(p=>p.id!==id);if(isMudur&&selectedMudurId===id)selectedMudurId=null;sortAndRenderImzaAlani();}catch(e){showMessage(`❌ ${type} silinemedi: ${e.message}`,"error");}}
function sortAndRenderImzaAlani(){planaEklenenPersonal.sort((a,b)=>(a.isMudur-b.isMudur)||(a.name||'').localeCompare(b.name||''));renderPlanImzalari();} 
function getAdditionalTeachers(){return planaEklenenPersonal.map(p=>({name:p.name,branch:p.isMudur?"Okul Müdürü":p.branch,isPrincipal:p.isMudur}));}
function renderPlanImzalari(){const cont=document.getElementById('planImzalariContainer');if(!cont)return;cont.innerHTML='';const ogretmenler=planaEklenenPersonal.filter(p=>!p.isMudur);const mudur=planaEklenenPersonal.find(p=>p.isMudur);ogretmenler.forEach(o=>addImzaAlaniToContainer(cont,o.name,o.branch));if(mudur)addImzaAlaniToContainer(cont,mudur.name,"Okul Müdürü");}
function addImzaAlaniToContainer(cont,name,branch){const div=document.createElement('div');div.className='imza-alani';const pName=document.createElement('p');pName.textContent=name;const pBranch=document.createElement('p');pBranch.className='unvan';pBranch.textContent=branch;const line=document.createElement('div');line.className='imza-cizgisi';div.appendChild(pName);div.appendChild(pBranch);div.appendChild(line);cont.appendChild(div);}

function toggleDropdown(dd){dd.style.display=dd.style.display==='block'?'none':'block';}
function createDynamicSelector(weekNum,listName,field,selItems=[],typeTR){const cont=document.createElement('div');cont.className='arac-gerec-container';const selDisp=document.createElement('div');selDisp.className='arac-gerec-selected';const drop=document.createElement('div');drop.className='arac-gerec-dropdown';selDisp.onclick=()=>{toggleDropdown(drop);if(typeTR==='araç-gereç')updateSidebarAracGerecSelectionFromPlan(yillikPlan.find(h=>h.originalAcademicWeek===weekNum)?.[field]||[]);if(typeTR==='yöntem/teknik')updateSidebarYontemTeknikSelectionFromPlan(yillikPlan.find(h=>h.originalAcademicWeek===weekNum)?.[field]||[]);};(window[listName]||[]).forEach(item=>{const opt=document.createElement('div');opt.className='arac-gerec-option';opt.textContent=item.name||item;opt.onclick=()=>togglePlanItemSelection(weekNum,item.name||item,selDisp,field);drop.appendChild(opt);});cont.appendChild(selDisp);cont.appendChild(drop);updatePlanItemDisplay(selDisp,selItems||[],weekNum,field,typeTR);return cont;}
function togglePlanItemSelection(weekNum,val,dispCont,field){const entry=yillikPlan.find(h=>h.type==='academic'&&h.originalAcademicWeek===weekNum);if(!entry)return;entry[field]=entry[field]||[];const idx=entry[field].indexOf(val);if(idx>-1)entry[field].splice(idx,1);else entry[field].push(val);const base=baseAcademicPlan.find(h=>h.originalAcademicWeek===weekNum);if(base)base[field]=[...(entry[field])];updatePlanItemDisplay(dispCont,entry[field],weekNum,field,field==='aracGerec'?'araç-gereç':'yöntem/teknik');}
function updatePlanItemDisplay(cont,items,weekNum,field,typeTR){cont.innerHTML='';(items||[]).forEach(item=>{const tag=document.createElement('span');tag.className='arac-gerec-tag';tag.innerHTML=`${item} <span class="remove" onclick="removePlanItem(${weekNum},'${item}','${field}')">×</span>`;cont.appendChild(tag);});if(!items||items.length===0)cont.innerHTML=`<span style="color:#999;font-size:10px;">${typeTR} seçin</span>`;}
function removePlanItem(weekNum,val,field){const entry=yillikPlan.find(h=>h.type==='academic'&&h.originalAcademicWeek===weekNum);if(!entry||!entry[field])return;const idx=entry[field].indexOf(val);if(idx>-1){entry[field].splice(idx,1);const base=baseAcademicPlan.find(h=>h.originalAcademicWeek===weekNum);if(base&&base[field]){const baseIdx=base[field].indexOf(val);if(baseIdx>-1)base[field].splice(baseIdx,1);}renderYillikPlan();}}
function updateSidebarAracGerecSelectionFromPlan(items=[]){document.querySelectorAll('#sidebarAracGerecList .item-button').forEach(b=>b.classList.toggle('selected',items.includes(b.dataset.value)));}
function updateSidebarYontemTeknikSelectionFromPlan(items=[]){document.querySelectorAll('#sidebarYontemTeknikList .item-button').forEach(b=>b.classList.toggle('selected',items.includes(b.dataset.value)));}

function renderYillikPlan(){const cont=document.getElementById('haftaContainer');if(!cont){console.error("Hafta container bulunamadı.");return;}cont.innerHTML='';cont.addEventListener('dragover',handleDragOver);cont.addEventListener('drop',handleDrop);yillikPlan.forEach((hafta,idx)=>{const div=document.createElement('div');div.className='hafta-item';div.dataset.index=idx;if(hafta.type==='holiday'){div.classList.add('holiday-week');div.draggable=false;}else{div.draggable=true;div.addEventListener('dragstart',(e)=>handleDragStart(e,idx));div.addEventListener('dragend',handleDragEnd);}const selDiv=document.createElement('div');selDiv.style.cssText='display:flex;align-items:center;justify-content:center;';const selCb=document.createElement('input');selCb.type='checkbox';selCb.id=`week-${hafta.type==='holiday'?`holiday-${idx}`:hafta.originalAcademicWeek}`;selCb.className='week-selector week-checkbox';selCb.disabled=hafta.type==='holiday';selCb.addEventListener('change',updateSidebarActionButtonsState);selDiv.appendChild(selCb);div.appendChild(selDiv);['originalAcademicWeek','tarih'].forEach(k=>{const cell=document.createElement('div');cell.textContent=k==='originalAcademicWeek'?(hafta.type==='academic'?hafta.originalAcademicWeek:hafta.label):(hafta.tarih||'');if(k==='originalAcademicWeek'&&hafta.type==='holiday')cell.style.fontWeight='bold';div.appendChild(cell);});if(hafta.type==='academic'){['dersSaati','unite','konu','kazanim'].forEach(k=>{const inp=document.createElement('input');inp.type=k==='dersSaati'?'number':'text';inp.value=hafta[k]||'';if(k==='dersSaati')inp.min='1';inp.onchange=(e)=>{hafta[k]=e.target.value;const base=baseAcademicPlan.find(b=>b.originalAcademicWeek===hafta.originalAcademicWeek);if(base)base[k]=e.target.value;};div.appendChild(inp);});div.appendChild(createDynamicSelector(hafta.originalAcademicWeek,'tumAracGerecListesi','aracGerec',hafta.aracGerec,'araç-gereç'));div.appendChild(createDynamicSelector(hafta.originalAcademicWeek,'tumYontemTeknikListesi','yontemTeknik',hafta.yontemTeknik,'yöntem/teknik'));}else{div.appendChild(document.createElement('div'));const tatilDesc=document.createElement('div');tatilDesc.className='tatil-aciklama-hucre';tatilDesc.textContent=hafta.label||"Tatil";tatilDesc.colSpan=5;div.appendChild(tatilDesc);for(let i=0;i<4;i++)div.appendChild(document.createElement('div'));}cont.appendChild(div);});updateSidebarActionButtonsState();}
function handleDragStart(e,idx){if(yillikPlan[idx].type==='holiday'){e.preventDefault();return;}draggedItemIndex=idx;e.dataTransfer.effectAllowed='move';e.target.classList.add('dragging');}
function handleDragEnd(e){e.target.classList.remove('dragging');document.querySelectorAll('.drag-over-target').forEach(el=>el.classList.remove('drag-over-target'));draggedItemIndex=null;}
function handleDragOver(e){e.preventDefault();const t=e.target.closest('.hafta-item');document.querySelectorAll('.drag-over-target').forEach(el=>el.classList.remove('drag-over-target'));if(t&&draggedItemIndex!==null&&yillikPlan[parseInt(t.dataset.index)].type==='academic')t.classList.add('drag-over-target');}
function handleDrop(e){e.preventDefault();const t=e.target.closest('.hafta-item');document.querySelectorAll('.drag-over-target').forEach(el=>el.classList.remove('drag-over-target'));if(!t||draggedItemIndex===null)return;const toIdx=parseInt(t.dataset.index);if(yillikPlan[draggedItemIndex].type==='academic'&&yillikPlan[toIdx].type==='academic'){const fromAIdx=baseAcademicPlan.findIndex(h=>h.originalAcademicWeek===yillikPlan[draggedItemIndex].originalAcademicWeek);const toAIdx=baseAcademicPlan.findIndex(h=>h.originalAcademicWeek===yillikPlan[toIdx].originalAcademicWeek);if(fromAIdx!==-1&&toAIdx!==-1&&fromAIdx!==toAIdx){const[moved]=baseAcademicPlan.splice(fromAIdx,1);baseAcademicPlan.splice(toAIdx,0,moved);updateAllWeekDates();}}}

function getMondayOfWeek(year,weekNum){const d=new Date(year,0,1+(weekNum-1)*7);const day=d.getDay();const diff=d.getDate()-day+(day===0?-6:1);return new Date(d.setDate(diff));}
function formatDateRange(start,dur=1){const end=new Date(start);end.setDate(start.getDate()+(dur*7)-3);const months=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];return`${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}`;}

function updateAllWeekDates(){const weekIn=document.getElementById('baslangicHaftasiSidebar')?.value;const tarihRangeEl=document.getElementById('planTarihAraligiSidebar');baseAcademicPlan.forEach((item,idx)=>item.originalAcademicWeek=idx+1);const newPlan=[];let acadCursor=0;let currentMon;if(weekIn){const[year,weekNum]=weekIn.split('-W').map(Number);currentMon=getMondayOfWeek(year,weekNum);}let planWeekCnt=0;while(acadCursor<baseAcademicPlan.length){let holidayAdded=false;for(const k in TATIL_DONEMLERI){if(TATIL_DONEMLERI[k].afterAcademicWeek===acadCursor){const hol=TATIL_DONEMLERI[k];const holData={type:'holiday',label:hol.label,duration:hol.duration,planWeekNum:++planWeekCnt};if(currentMon){holData.tarih=formatDateRange(new Date(currentMon),hol.duration);currentMon.setDate(currentMon.getDate()+(7*hol.duration));}newPlan.push(holData);holidayAdded=true;break;}}if(acadCursor<baseAcademicPlan.length){const acadWeekData={...baseAcademicPlan[acadCursor],type:'academic',planWeekNum:++planWeekCnt};if(currentMon){acadWeekData.tarih=formatDateRange(new Date(currentMon));currentMon.setDate(currentMon.getDate()+7);}newPlan.push(acadWeekData);acadCursor++;}else if(!holidayAdded)break;}for(const k in TATIL_DONEMLERI){if(TATIL_DONEMLERI[k].afterAcademicWeek===baseAcademicPlan.length&&!newPlan.find(p=>p.label===TATIL_DONEMLERI[k].label)){const hol=TATIL_DONEMLERI[k];const holData={type:'holiday',label:hol.label,duration:hol.duration,planWeekNum:++planWeekCnt};if(currentMon)holData.tarih=formatDateRange(new Date(currentMon),hol.duration);newPlan.push(holData);break;}}yillikPlan=newPlan;renderYillikPlan();if(tarihRangeEl){if(yillikPlan.length>0&&yillikPlan[0].tarih&&yillikPlan[yillikPlan.length-1].tarih){const firstDate=yillikPlan[0].tarih.split(' - ')[0];const lastWeek=yillikPlan[yillikPlan.length-1];const lastDate=lastWeek.tarih.split(' - ')[1]||lastWeek.tarih.split(' - ')[0];tarihRangeEl.textContent=`Plan Tarih Aralığı: ${firstDate} - ${lastDate}`;}else tarihRangeEl.textContent='Başlangıç haftası seçilmedi.';}}

function showMessage(text, type = 'info', duration = 5000) {
    const existingNotification = document.querySelector('.notification-toast');
    if (existingNotification) {
        existingNotification.remove(); // Önceki bildirimi kaldır
    }

    const notification = document.createElement('div');
    notification.classList.add('notification-toast');

    let title = 'Bilgi';
    let iconContent = 'ℹ️'; // Default icon for info

    if (type === 'success') {
        title = 'Başarılı';
        iconContent = '✔️';
        notification.classList.add('success');
    } else if (type === 'error') {
        title = 'Hata';
        iconContent = '✖️';
        notification.classList.add('error');
    } else if (type === 'warning') {
        title = 'Uyarı';
        iconContent = '⚠️';
        notification.classList.add('warning');
    } else { // Default to info type
        notification.classList.add('info');
    }

    notification.innerHTML = `
        <div class="notification-icon">${iconContent}</div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-text">${text}</div>
        </div>
        <button class="notification-close">✕</button>
    `;

    document.body.appendChild(notification);

    // Show animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
    });

    const closeButton = notification.querySelector('.notification-close');
    
    const hideNotification = () => {
        notification.classList.remove('show');
        // Wait for animation to finish before removing
        notification.addEventListener('transitionend', () => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, { once: true });
        // Fallback if transitionend doesn't fire
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 500); // CSS transition süresiyle eşleşmeli (0.3s) + biraz pay
    };

    closeButton.addEventListener('click', hideNotification);

    if (duration > 0) {
        setTimeout(hideNotification, duration);
    }

    // Eski #message elementini gizle (artık kullanılmıyor)
    const oldMessageElement = document.getElementById('message');
    if (oldMessageElement) {
        oldMessageElement.style.display = 'none';
    }
}

async function loadSavedPlans(){try{const r=await fetch('/api/plans');if(!r.ok)throw new Error('Kaydedilmiş planlar yüklenemedi.');const plans=await r.json();const cont=document.getElementById('savedPlansListContainer');if(!cont)return;cont.innerHTML='';if(plans.length===0){cont.innerHTML='<p>Kaydedilmiş plan bulunmuyor.</p>';return;}const ul=document.createElement('ul');ul.className='saved-plan-items-list';plans.forEach(p=>{const li=document.createElement('li');li.className='saved-plan-item';const info=document.createElement('span');info.textContent=`${p.plan_name} (${p.ders||'Bilinmeyen'} - ${p.sinif||'Bilinmeyen'})`;const btns=document.createElement('div');btns.className='saved-plan-buttons';const loadBtn=document.createElement('button');loadBtn.type='button';loadBtn.textContent='Yükle';loadBtn.onclick=()=>loadSpecificPlan(p.id);const dlBtn=document.createElement('button');dlBtn.type='button';dlBtn.textContent='İndir';dlBtn.className='download-saved-btn';dlBtn.onclick=()=>generatePlanForSaved(p.id);const delBtn=document.createElement('button');delBtn.type='button';delBtn.textContent='Sil';delBtn.className='delete-btn';delBtn.onclick=()=>deletePlan(p.id);btns.appendChild(loadBtn);btns.appendChild(dlBtn);btns.appendChild(delBtn);li.appendChild(info);li.appendChild(btns);ul.appendChild(li);});cont.appendChild(ul);}catch(e){showMessage(`❌ Kayıtlı planlar yüklenemedi: ${e.message}`,'error');}}
async function deletePlan(id){if(!confirm("Bu planı sil?"))return;try{const r=await fetch(`/api/plans/${id}`,{method:'DELETE'});if(!r.ok){const res=await r.json();throw new Error(res.error||'Silinemedi.');}showMessage('Plan silindi.','success');loadSavedPlans();}catch(e){showMessage(`❌ Plan silinemedi: ${e.message}`,'error');}}
async function generatePlanForSaved(id){showMessage('Kaydedilmiş plan hazırlanıyor...','success');const loadEl=document.getElementById('loading');if(loadEl)loadEl.style.display='block';try{const planR=await fetch(`/api/plans/${id}`);if(!planR.ok)throw new Error('Plan verisi alınamadı.');const planData=await planR.json();const docData={okul:planData.okul,ogretmen:planData.ogretmen,ders:planData.ders,sinif:planData.sinif,egitimOgretimYili:planData.egitim_ogretim_yili,dersSaati:planData.ders_saati,haftalikPlan:planData.plan_data_json||[],additionalTeachers:planData.additional_teachers_json||[]};const docR=await fetch('/generate-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(docData)});if(docR.ok){const blob=await docR.blob();const url=window.URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`yillik_plan_${planData.plan_name.replace(/[^a-zA-Z0-9]/g,'_')}.docx`;a.click();window.URL.revokeObjectURL(url);showMessage('Plan indirildi!','success');}else{const errD=await docR.json().catch(()=>({message:'Word oluşturulamadı'}));throw new Error(errD.error||errD.message);}}catch(e){showMessage(`❌ Plan indirilemedi: ${e.message}`,'error');}finally{if(loadEl)loadEl.style.display='none';}}

async function saveCurrentPlan(){let name=document.getElementById('currentPlanNameInput').value.trim();if(!name){currentEditingPlanId=null;const d=new Date();name=`Plan-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;document.getElementById('currentPlanNameInput').value=name;showMessage(`Plan adı: "${name}"`,'info');}let ogretmen=planaEklenenPersonal.find(p=>!p.isMudur&&p.branch)||planaEklenenPersonal.find(p=>!p.isMudur)||planaEklenenPersonal[0];if(!ogretmen&&!currentEditingPlanId){showMessage("İmza alanına öğretmen/müdür ekleyin.","error");return;}const data={plan_name:name,okul:document.getElementById('okulSidebar')?.value,ogretmen:ogretmen?ogretmen.name:"",ders:document.getElementById('dersSidebar')?.value,sinif:document.getElementById('sinifSidebar')?.value,egitim_ogretim_yili:document.getElementById('egitimOgretimYiliSidebar')?.value,ders_saati:seciliDersSaati||baseAcademicPlan[0]?.dersSaati||'1',varsayilan_arac_gerec:getSelectedSidebarAracGerec(),baslangic_haftasi:document.getElementById('baslangicHaftasiSidebar')?.value,plan_data_json:yillikPlan,base_academic_plan_json:baseAcademicPlan,additional_teachers:getAdditionalTeachers(),plan_id:currentEditingPlanId};try{const r=await fetch('/api/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const res=await r.json();if(!r.ok)throw new Error(res.error||'Kaydedilemedi.');showMessage(`"${name}" kaydedildi.`,'success');if(res.id&&!currentEditingPlanId)currentEditingPlanId=res.id;loadSavedPlans();}catch(e){showMessage(`❌ Plan kaydedilemedi: ${e.message}`,'error');}}

async function loadSpecificPlan(id){try{const r=await fetch(`/api/plans/${id}`);if(!r.ok)throw new Error('Plan yüklenemedi.');const data=await r.json();['okulSidebar','dersSidebar','sinifSidebar','egitimOgretimYiliSidebar','baslangicHaftasiSidebar'].forEach(elId=>{const el=document.getElementById(elId);if(el){const key=elId.replace('Sidebar','').replace(/([A-Z])/g,'_$1').toLowerCase();el.value=data[key]||data[elId.replace('Sidebar','')]||'';if(elId==='egitimOgretimYiliSidebar'&&data.egitim_ogretim_yili&&!Array.from(el.options).some(o=>o.value===data.egitim_ogretim_yili))el.add(new Option(data.egitim_ogretim_yili,data.egitim_ogretim_yili,true,true));}});if(data.ders_saati)selectDersSaati(data.ders_saati.toString());document.getElementById('currentPlanNameInput').value=data.plan_name||'';currentEditingPlanId=data.id;const savedAG=Array.isArray(data.varsayilan_arac_gerec)?data.varsayilan_arac_gerec:[];savedAG.forEach(i=>{if(!tumAracGerecListesi.includes(i))tumAracGerecListesi.push(i);});populateSidebarAracGerec();document.querySelectorAll('#sidebarAracGerecList .item-button').forEach(b=>b.classList.toggle('selected',savedAG.includes(b.dataset.value)));let allYT=(Array.isArray(data.base_academic_plan_json)?data.base_academic_plan_json:yillikPlan.filter(h=>h.type==='academic')).flatMap(h=>h.yontemTeknik||[]).filter((v,i,a)=>v&&a.indexOf(v)===i);allYT.forEach(yt=>{if(yt&&!tumYontemTeknikListesi.includes(yt))tumYontemTeknikListesi.push(yt);});populateSidebarYontemTeknik();document.querySelectorAll('#sidebarYontemTeknikList .item-button').forEach(b=>b.classList.toggle('selected',allYT.includes(b.dataset.value)));planaEklenenPersonal=[];if(data.additional_teachers_json&&Array.isArray(data.additional_teachers_json)){data.additional_teachers_json.forEach(p=>{const found=tumPersonalListesi.find(gp=>gp.name===p.name&&gp.branch===p.branch);planaEklenenPersonal.push(found||{...p,id:`temp-${Date.now()}`});});}sortAndRenderImzaAlani();populateSidebarMudurList();populateSidebarOgretmenList();baseAcademicPlan=Array.isArray(data.base_academic_plan_json)?data.base_academic_plan_json.map(h=>({...h})):[];yillikPlan=Array.isArray(data.plan_data_json)?data.plan_data_json.map(h=>({...h})):[];if(yillikPlan.length>0){updateYillikPlanBasligi();renderYillikPlan();}else setDefaultBaslangicHaftasi();showMessage(`"${data.plan_name}" yüklendi.`,'success');}catch(e){showMessage(`❌ Plan yüklenemedi: ${e.message}`,'error');console.error(e);}}

document.addEventListener('DOMContentLoaded',async function(){
    // const settingsBtnElement = document.getElementById('settingsBtn'); // settingsBtn globalde zaten tanımlı
    const closeSettingsSidebarBtnElement = document.getElementById('closeSettingsSidebarBtn');

    if(settingsBtn) settingsBtn.addEventListener('click', toggleSidebar); 
    if(closeSettingsSidebarBtnElement) closeSettingsSidebarBtnElement.addEventListener('click', toggleSidebar);
    
    populateEgitimOgretimYiliOptions('egitimOgretimYiliSidebar');
    await Promise.all([loadAllAracGerecTipleri(),loadAllYontemTeknikTipleri(),loadAllPersonal()]);
    
    document.querySelectorAll('.sidebar-menu-item').forEach(i=>i.addEventListener('click',(e)=>{e.preventDefault();navigateToView(i.dataset.viewTarget);}));
    document.getElementById('sidebarGlobalBackBtn')?.addEventListener('click',(e)=>{e.preventDefault();navigateToView(e.target.closest('a').dataset.viewTarget);});
    document.querySelectorAll('.ders-saati-btn').forEach(b=>b.addEventListener('click',()=>selectDersSaati(b.dataset.saat)));
    document.getElementById('applyDersSaatiToAllBtn')?.addEventListener('click',applyDersSaatiToAll);
    document.getElementById('addCustomAracGerecBtn')?.addEventListener('click',addCustomAracGerec);
    ['agEsitleTumHaftalarBtn','agEsitleSeciliHaftalarBtn','agEkleTumHaftalaraBtn','agEkleSeciliHaftalaraBtn'].forEach((id,i)=>{document.getElementById(id)?.addEventListener('click',()=>applyAracGerecAction(i%2===0?'esitle':'ekle'+(i<2?'Tum':'Secili')));});
    document.getElementById('addCustomYontemTeknikBtn')?.addEventListener('click',addCustomYontemTeknik);
    ['ytEsitleTumHaftalarBtn','ytEsitleSeciliHaftalarBtn','ytEkleTumHaftalaraBtn','ytEkleSeciliHaftalaraBtn'].forEach((id,i)=>{document.getElementById(id)?.addEventListener('click',()=>applyYontemTeknikAction(i%2===0?'esitle':'ekle'+(i<2?'Tum':'Secili')));});
    document.getElementById('addCustomMudurBtn')?.addEventListener('click',addCustomMudur);
    document.getElementById('updateMudurInPlanBtn')?.addEventListener('click',updateMudurInPlan);
    document.getElementById('navigateToOgretmenEkleBtn')?.addEventListener('click',()=>{document.getElementById('yeniOgretmenAdiSoyadiInput').value='';document.getElementById('yeniOgretmenBransInput').value='';navigateToView('ogretmenEkleView');});
    document.getElementById('saveYeniOgretmenBtn')?.addEventListener('click',saveYeniOgretmen);
    document.getElementById('saveDuzenlenenOgretmenBtn')?.addEventListener('click',saveDuzenlenenOgretmen);
    document.getElementById('updateOgretmenlerInPlanBtn')?.addEventListener('click',updateOgretmenlerInPlan);
    if(baseAcademicPlan.length===0){for(let i=1;i<=TOPLAM_AKADEMIK_HAFTA;i++)baseAcademicPlan.push({originalAcademicWeek:i,dersSaati:'4',aracGerec:[],yontemTeknik:[]});}
    
    setDefaultBaslangicHaftasi();
    loadSavedPlans();
    
    ['okulSidebar','egitimOgretimYiliSidebar','dersSidebar','sinifSidebar','baslangicHaftasiSidebar'].forEach(id=>{
        const el=document.getElementById(id);
        if(el){
            const eventType=el.tagName==='SELECT'?'change':'input';
            el.addEventListener(eventType, async ()=>{ // async eklendi
                updateYillikPlanBasligi();
                if(id==='egitimOgretimYiliSidebar'||id==='baslangicHaftasiSidebar') {
                    setDefaultBaslangicHaftasi();
                    // Eğitim öğretim yılı değiştiğinde tatilleri kontrol et/üret
                    if (id === 'egitimOgretimYiliSidebar') {
                        const selectedEgitimYili = el.value;
                        if (selectedEgitimYili && typeof selectedEgitimYili === 'string') {
                            const yearParts = selectedEgitimYili.split('-');
                            if (yearParts.length > 0 && !isNaN(parseInt(yearParts[0], 10))) {
                                const academicYearStart = parseInt(yearParts[0], 10);
                                console.log(`Eğitim yılı değişti, ${academicYearStart} için tatil kontrolü yapılacak.`);
                                try {
                                    const response = await fetch('/api/ensure-holidays-for-year', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ academicYearStart })
                                    });
                                    if (response.ok) {
                                        const result = await response.json();
                                        console.log(result.message);
                                        // İsteğe bağlı: Kullanıcıya başarılı bir mesaj gösterilebilir
                                        // showMessage(result.message, "info");
                                    } else {
                                        const errorResult = await response.json().catch(() => ({ error: "Sunucu hatası" }));
                                        console.error(`Tatil kontrolü/üretimi hatası (${response.status}):`, errorResult.error);
                                        // İsteğe bağlı: Kullanıcıya bir hata mesajı gösterilebilir
                                        // showMessage(`Tatil üretimi hatası: ${errorResult.error}`, "error");
                                    }
                                } catch (error) {
                                    console.error('Tatil kontrolü/üretimi sırasında ağ hatası:', error);
                                    // showMessage("Tatil üretimi sırasında ağ hatası.", "error");
                                }
                            }
                        }
                    }
                } else {
                    updateAllWeekDates();
                }
            });
        }
    });
    selectDersSaati(baseAcademicPlan[0]?.dersSaati||'4');
    document.getElementById('planForm').addEventListener('submit',async function(e){
        e.preventDefault();
        const genBtn=document.getElementById('generateBtn');
        const loadEl=document.getElementById('loading');
        let ogretmen=planaEklenenPersonal.find(p=>!p.isMudur&&p.branch)||planaEklenenPersonal.find(p=>!p.isMudur)||planaEklenenPersonal[0];
        if(!ogretmen){showMessage("İmza için öğretmen/müdür ekleyin.","error");return;}
        const data={
            okul:document.getElementById('okulSidebar')?.value, 
            ogretmen:ogretmen.name, 
            ders:document.getElementById('dersSidebar')?.value, 
            sinif:document.getElementById('sinifSidebar')?.value, 
            egitimOgretimYili:document.getElementById('egitimOgretimYiliSidebar')?.value, 
            dersSaati:seciliDersSaati||baseAcademicPlan[0]?.dersSaati||'1', 
            haftalikPlan:yillikPlan, 
            additionalTeachers:getAdditionalTeachers().filter(t=>t.name!==ogretmen.name||(t.name===ogretmen.name&&!t.isPrincipal))
        };
        genBtn.disabled=true; loadEl.style.display='block';
        try{
            const r=await fetch('/generate-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
            if(r.ok){
                const blob=await r.blob();
                const url=window.URL.createObjectURL(blob);
                const a=document.createElement('a');a.href=url;
                a.download=`yillik_plan_${data.ders?.replace(/\s+/g,'_')}_${data.sinif}.docx`;
                a.click();window.URL.revokeObjectURL(url);
                showMessage('Plan indirildi!','success');
            }else{
                const errD=await r.json().catch(()=>({message:'Sunucu hatası'}));
                throw new Error(errD.error||'Sunucu hatası');
            }
        }catch(e){
            showMessage(`Plan oluşturulamadı: ${e.message}`,'error');
        }finally{
            genBtn.disabled=false;loadEl.style.display='none';
        }
    });
    document.getElementById('saveGenelBilgilerBtn')?.addEventListener('click',()=>{
        updateYillikPlanBasligi();
        updateAllWeekDates();
        showMessage("Genel bilgiler güncellendi.","success");
    });
    checkAuthStatus();
    
    // Yan menüyü varsayılan olarak açık başlat
    toggleSidebar(); 
});
