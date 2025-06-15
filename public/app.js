// app.js - v2 İÇİN GÜNCELLENMİŞ KOD

const SUPABASE_URL = 'https://qireaxrpyecqgymuhkxy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpcmVheHJweWVjcWd5bXVoa3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5ODc5NTUsImV4cCI6MjA2NTU2Mzk1NX0.jMYJdd04qPI2boTWulTgNYMYfJYOcYs_Vz_rj7HC-Ww';

// Global 'supabase' nesnesi ile çakışmaması için kendi istemci değişkenimize farklı bir isim verelim.
let supabaseClient = null; 

try {
  // Kontrol etmemiz gereken global nesne 'supabase', 'supabaseJs' değil.
  if (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_ANON_KEY) {
    // Global 'supabase' nesnesindeki 'createClient' fonksiyonunu kullan.
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase client (app.js) başarıyla başlatıldı.');
  } else {
    console.error('Supabase istemcisi yüklenemedi. Global "supabase" nesnesi bulunamadı veya anahtarlar eksik.');
  }
} catch (e) {
  console.error('Supabase client (app.js) başlatılırken hata:', e);
}


const settingsSidebar = document.getElementById('settingsSidebar');
const sidebarMainTitle = document.getElementById('sidebarMainTitle');
const sidebarGlobalBackBtn = document.getElementById('sidebarGlobalBackBtn');
const settingsBtn = document.getElementById('settingsBtn');
let currentSidebarView = 'mainMenuView';
let isSidebarOpen = false;

function updateSidebarActionButtonsState() {
    const selectedWeeks = document.querySelectorAll('#haftaContainer .week-checkbox:checked:not(:disabled)');
    const agEkleSeciliBtn = document.getElementById('agEkleSeciliHaftalaraBtn');
    if (agEkleSeciliBtn) agEkleSeciliBtn.disabled = selectedWeeks.length === 0;
    const agEsitleSeciliBtn = document.getElementById('agEsitleSeciliHaftalarBtn');
    if (agEsitleSeciliBtn) agEsitleSeciliBtn.disabled = selectedWeeks.length === 0;
    const ytEkleSeciliBtn = document.getElementById('ytEkleSeciliHaftalaraBtn');
    if (ytEkleSeciliBtn) ytEkleSeciliBtn.disabled = selectedWeeks.length === 0;
    const ytEsitleSeciliBtn = document.getElementById('ytEsitleSeciliHaftalarBtn');
    if (ytEsitleSeciliBtn) ytEsitleSeciliBtn.disabled = selectedWeeks.length === 0;
}

function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    if (settingsSidebar) settingsSidebar.classList.toggle('open', isSidebarOpen);
    document.body.classList.toggle('sidebar-active', isSidebarOpen);
    if (settingsBtn) {
        settingsBtn.innerHTML = isSidebarOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
        settingsBtn.style.display = isSidebarOpen ? 'none' : 'flex';
    }
    if (isSidebarOpen) {
        const activeViewElement = document.querySelector('.sidebar-view.active-view');
        let targetViewToShow = 'mainMenuView';
        if (document.getElementById(currentSidebarView)) targetViewToShow = currentSidebarView;
        if (!activeViewElement || activeViewElement.id !== targetViewToShow) navigateToView(targetViewToShow);
        else if (activeViewElement.id === targetViewToShow && !activeViewElement.classList.contains('active-view')) navigateToView(targetViewToShow);
    }
}

function updateYillikPlanBasligi() {
    const okulAdi = document.getElementById('okulSidebar')?.value || "[Okul Adı]";
    const egitimYili = document.getElementById('egitimOgretimYiliSidebar')?.value || "[Eğitim Öğretim Yılı]";
    const dersAdi = document.getElementById('dersSidebar')?.value || "[Ders Adı]";
    const sinif = document.getElementById('sinifSidebar')?.value || "[Sınıf]";
    const baslikElement = document.getElementById('yillikPlanBasligi');
    if (baslikElement) baslikElement.textContent = `T.C. MİLLİ EĞİTİM BAKANLIĞI ${okulAdi.toUpperCase()} ${egitimYili} EĞİTİM ÖĞRETİM YILI ${dersAdi.toUpperCase()} ${sinif.toUpperCase()} DERSİ ÜNİTELENDİRİLMİŞ YILLIK PLANI`;
}

async function handleGoogleLogin() {
    try {
        // ÇÖZÜM: signInWithOAuth fonksiyonu .auth üzerinden çağrılmalı
        const { data, error } = await supabaseClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin // Google'dan sonra geri dönülecek adres
            }
        });

        if (error) {
            console.error('Google ile giriş sırasında hata:', error);
            // Kullanıcıya bir hata mesajı gösterebilirsiniz.
        } else {
            console.log('Google ile giriş için yönlendiriliyor...', data);
        }
    } catch (error) {
        console.error('handleGoogleLogin içinde beklenmedik hata:', error);
    }
}

async function handleLogout() {
    if (!supabase) {
        showMessage("Supabase yapılandırılmamış, çıkış yapılamıyor.", "error");
        console.warn("Supabase client başlatılmamış. Çıkış yapılamıyor.");
        return;
    }
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Çıkış hatası:', error);
            showMessage(`Çıkış yapılamadı: ${error.message}`, "error");
        } else {
            showMessage('Başarıyla çıkış yapıldı.', 'success');
            // UI güncellemesi onAuthStateChange tarafından tetiklenecek
        }
    } catch (e) {
        console.error('handleLogout içinde beklenmedik hata:', e);
        showMessage(`Çıkış sırasında bir hata oluştu. Lütfen konsolu kontrol edin.`, "error");
    }
}

async function checkAuthStatus() {
    const userAuthSection = document.getElementById('userAuthSection');
    if (!userAuthSection) return;

    if (!supabase) {
        userAuthSection.innerHTML = '<span style="color:red;">Supabase istemcisi yüklenemedi. Lütfen app.js dosyasındaki SUPABASE_URL ve SUPABASE_ANON_KEY değerlerini ve index.html dosyasındaki Supabase SDK scriptini kontrol edin.</span>';
        return;
    }

    try {
        // Sunucu tarafındaki /api/auth/session endpoint'inden oturum bilgisini al
        const response = await fetch('/api/auth/session'); 
        const authData = await response.json();

        if (response.ok && authData.isAuthenticated && authData.user) {
            let userInfoHTML = '';
            if (authData.user.photo) userInfoHTML += `<img src="${authData.user.photo}" alt="${authData.user.displayName}" class="user-avatar"> `;
            userInfoHTML += `<span class="user-name">${authData.user.displayName || 'Kullanıcı'}</span>`;
            if (authData.user.email) userInfoHTML += ` <span class="user-email">(${authData.user.email})</span>`;
            userInfoHTML += ` | <button id="logoutBtn" class="auth-link logout-link">Çıkış Yap</button>`;
            userAuthSection.innerHTML = userInfoHTML;
            document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

            window.currentUser = authData.user;
            // Öğretmen atama mantığı, loadAllPersonal Supabase'e göre güncellendikten sonra ele alınacak
            // if (authData.user.displayName) {
            //     await loadAllPersonal(); 
            //     const loggedInUserName = authData.user.displayName;
            //     const foundTeacher = tumPersonalListesi.find(p => p.name === loggedInUserName && (p.branch === "Öğretmen" || !p.isMudur));
            //     if (foundTeacher && !planaEklenenPersonal.some(p => p.id === foundTeacher.id && !p.isMudur)) {
            //         planaEklenenPersonal = planaEklenenPersonal.filter(p => p.isMudur);
            //         planaEklenenPersonal.push({ ...foundTeacher, isMudur: false });
            //         sortAndRenderImzaAlani();
            //         showMessage(`Hoş geldiniz ${loggedInUserName}! Planda varsayılan öğretmen olarak ayarlandınız.`, "success");
            //     }
            // }
        } else {
            userAuthSection.innerHTML = '<button id="googleLoginBtn" class="auth-link login-link">Google ile Giriş Yap</button>';
            document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogleLogin);
            window.currentUser = null;
        }
    } catch (error) {
        console.error('Kimlik doğrulama durumu alınırken hata:', error);
        userAuthSection.innerHTML = '<button id="googleLoginBtn" class="auth-link login-link">Google ile Giriş Yap (Hata)</button>';
        document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogleLogin);
        window.currentUser = null;
    }
}

// Supabase auth state değişikliklerini dinle
if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        console.log('Supabase Auth Event:', event, session);
        // Oturum durumu değiştiğinde UI'ı yeniden kontrol et ve güncelle
        await checkAuthStatus(); 
        
        if (event === 'SIGNED_IN' && session) {
            console.log('Kullanıcı giriş yaptı:', session.user.email);
        } else if (event === 'SIGNED_OUT') {
            console.log('Kullanıcı çıkış yaptı.');
        }
    });
}


async function navigateToView(targetViewId) { 
    const views = document.querySelectorAll('.sidebar-view');
    const targetView = document.getElementById(targetViewId);
    const currentActiveViewElement = document.getElementById(currentSidebarView);
    if (!targetView) { console.error(`Hedef görünüm bulunamadı: ${targetViewId}`); return; }
    if (currentActiveViewElement === targetView && targetView.classList.contains('active-view')) return;
    const isNavigatingBack = targetViewId === 'mainMenuView' || (currentSidebarView === 'ogretmenEkleView' && targetViewId === 'ogretmenYonetimiView') || (currentSidebarView === 'ogretmenDuzenleView' && targetViewId === 'ogretmenYonetimiView');
    if (currentActiveViewElement && currentActiveViewElement !== targetView) {
        currentActiveViewElement.classList.remove('active-view');
        if (!isNavigatingBack) currentActiveViewElement.classList.add('prev-view');
    }
    targetView.classList.remove('prev-view');
    targetView.classList.add('active-view');
    views.forEach(view => {
        if (view !== targetView) {
            view.classList.remove('active-view');
            if (view !== currentActiveViewElement || isNavigatingBack) view.classList.remove('prev-view');
        }
    });
    currentSidebarView = targetViewId;
    if (sidebarMainTitle && sidebarGlobalBackBtn) {
        let newTitleText = sidebarMainTitle.textContent;
        let showBackBtn = true;
        let newBackTarget = 'mainMenuView';
        switch (targetViewId) {
            case 'mainMenuView': newTitleText = 'Ayarlar'; showBackBtn = false; break;
            case 'aracGerecView': 
                newTitleText = 'Araç-Gereç Yönetimi'; 
                await loadAllAracGerecTipleri(); 
                break;
            case 'dersSaatiView': newTitleText = 'Ders Saati Yönetimi'; break;
            case 'yontemTeknikView': 
                newTitleText = 'Yöntem ve Teknik Yönetimi'; 
                await loadAllYontemTeknikTipleri(); 
                break;
            case 'okulMuduruView': newTitleText = 'Okul Müdürü Yönetimi'; break;
            case 'ogretmenYonetimiView': newTitleText = 'Öğretmen Yönetimi'; break;
            case 'ogretmenEkleView': newTitleText = 'Yeni Öğretmen Ekle'; newBackTarget = 'ogretmenYonetimiView'; break;
            case 'ogretmenDuzenleView': newTitleText = 'Öğretmen Düzenle'; newBackTarget = 'ogretmenYonetimiView'; break;
            case 'ogretmenDetayView': newBackTarget = 'ogretmenYonetimiView'; showBackBtn = true; break;
            case 'genelPlanBilgileriView':
                newTitleText = 'Genel Plan Bilgileri';
                if (currentEditingPlanId) loadPlanOnayTarihi(currentEditingPlanId);
                else {
                    const planOnayTarihiInput = document.getElementById('planOnayTarihiSidebar');
                    if (planOnayTarihiInput) {
                        if (yillikPlan && yillikPlan.length > 0) {
                            const firstAcademicWeek = yillikPlan.find(w => w.type === 'academic' && w.tarih);
                            planOnayTarihiInput.value = (firstAcademicWeek && typeof firstAcademicWeek.tarih === 'string') ? firstAcademicWeek.tarih.split(' - ')[0] : '';
                        } else planOnayTarihiInput.value = '';
                    }
                }
                break;
            default: showBackBtn = true; break;
        }
        if (targetViewId !== 'ogretmenDetayView' && sidebarMainTitle.textContent !== newTitleText) sidebarMainTitle.textContent = newTitleText;
        sidebarGlobalBackBtn.dataset.viewTarget = newBackTarget;
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
    if (!selectElement) return;
    selectElement.innerHTML = '';
    const currentDate = new Date(); let currentYear = currentDate.getFullYear();
    let activeStartYear = (currentDate.getMonth() >= 7) ? currentYear : currentYear - 1;
    for (let i = 0; i < 4; i++) {
        const year1 = activeStartYear + i; const optionValue = `${year1}-${year1 + 1}`;
        selectElement.appendChild(new Option(optionValue, optionValue, i === 0, i === 0));
    }
}

let seciliDersSaati = null;
function selectDersSaati(saat) { 
    seciliDersSaati = saat; 
    document.querySelectorAll('.ders-saati-btn').forEach(btn => btn.classList.toggle('selected', btn.dataset.saat === saat));
    applyDersSaatiToAll(); 
}

function createDersSaatiButton(saat, isCustom = false, containerId = 'dersSaatiBtnContainer') {
    const container = document.getElementById(containerId);
    if (!container) return null;
    if (container.querySelector(`.ders-saati-btn[data-saat="${saat}"]`)) return container.querySelector(`.ders-saati-btn[data-saat="${saat}"]`);
    const button = document.createElement('button');
    button.className = 'ders-saati-btn';
    button.dataset.saat = saat.toString();
    button.textContent = `${saat} Saat`;
    button.addEventListener('click', () => selectDersSaati(saat.toString()));
    container.appendChild(button);
    return button;
}

async function addCustomDersSaati() {
    const inputElement = document.getElementById('customDersSaatiInput');
    if (!inputElement) return;
    const saatValueStr = inputElement.value.trim();
    if (!saatValueStr) { showMessage("Lütfen bir ders saati girin.", "error"); return; }
    const saatValue = parseInt(saatValueStr, 10);
    if (isNaN(saatValue) || saatValue <= 0 || !Number.isInteger(saatValue)) { showMessage("Lütfen geçerli bir pozitif tam sayı girin.", "error"); return; }
    if (document.querySelector(`#dersSaatiBtnContainer .ders-saati-btn[data-saat="${saatValue}"]`)) {
        showMessage(`${saatValue} saat zaten listede mevcut.`, "info");
        inputElement.value = ''; 
        selectDersSaati(saatValue.toString());
        return;
    }
    if (createDersSaatiButton(saatValue.toString(), true)) {
        inputElement.value = '';
        showMessage(`${saatValue} saat eklendi ve tüm haftalara uygulandı.`, "success");
        selectDersSaati(saatValue.toString());
    }
}

function applyDersSaatiToAll() { 
    if (seciliDersSaati === null) return; 
    baseAcademicPlan.forEach(h => h.dersSaati = seciliDersSaati); 
    updateAllWeekDates(); 
    showMessage(`${seciliDersSaati} ders saati tüm haftalara uygulandı.`, "success"); 
}

let yillikPlan = []; let baseAcademicPlan = []; let currentEditingPlanId = null;
let tumAracGerecListesi = []; let tumYontemTeknikListesi = []; let tumPersonalListesi = [];
let planaEklenenPersonal = [];
const TATIL_DONEMLERI = { ARA_TATIL_1: { duration: 1, afterAcademicWeek: 9, label: "1. Ara Tatil" }, YARIYIL_TATILI: { duration: 2, afterAcademicWeek: 18, label: "Yarıyıl Tatili" }, ARA_TATIL_2: { duration: 1, afterAcademicWeek: 27, label: "2. Ara Tatil" }};
const TOPLAM_AKADEMIK_HAFTA = 36; let draggedItemIndex = null;

// Bu fonksiyonlar artık Supabase SDK'sını kullanacak şekilde güncellenmeli
// veya server.js'deki API'lar Supabase'i kullanacak ve bu fonksiyonlar o API'ları çağıracak.
async function loadResourceList(apiUrl, listVarName, populateFn, defaultList = []) {
    console.log(`[loadResourceList] Fetching ${listVarName} from ${apiUrl}... (Supabase'e güncellenecek)`);
    // Örnek: if (supabase) { const { data, error } = await supabase.from('tablo_adi').select('*'); ... }
    try {
        const r = await fetch(apiUrl); // Bu fetch'ler Supabase çağrıları ile değişecek
        if (!r.ok) {
            const errorText = await r.text();
            console.error(`[loadResourceList] API call to ${apiUrl} FAILED with status ${r.status}. Response: ${errorText}`);
            throw new Error(`API call to ${apiUrl} failed with status ${r.status}. Response: ${errorText}`);
        }
        window[listVarName] = await r.json(); 
        console.log(`[loadResourceList] Successfully fetched ${window[listVarName].length} items for ${listVarName}.`);
    } catch (e) {
        console.error(`[loadResourceList] Error loading or parsing ${listVarName} from ${apiUrl}:`, e);
        showMessage(`"${listVarName.replace('tum', '').replace('Listesi', '')}" listesi yüklenemedi. Hata: ${e.message}`, 'error');
        window[listVarName] = []; 
    }
    try {
        populateFn();
    } catch (e) {
        console.error(`[loadResourceList] Error in populateFn for ${listVarName} (data source: ${apiUrl}):`, e);
        showMessage(`"${listVarName.replace('tum', '').replace('Listesi', '')}" listesi gösterilirken hata oluştu.`, 'error');
    }
}

function populateSidebarGenericList(containerId, items, selectedGetter, clickHandler, deleteHandler, nameField = 'name', valueField = 'name', deleteSuffix = '') {
    const cont = document.getElementById(containerId);
    if (!cont) {
        console.error(`[populateSidebarGenericList] Container not found: ${containerId}`);
        return;
    }
    cont.innerHTML = '';
    const selItems = selectedGetter ? selectedGetter() : [];
    if (!Array.isArray(items)) {
        items = [];
    }
    items.sort((a, b) => ((a && a[nameField]) || '').localeCompare((b && b[nameField]) || '')).forEach(item => {
        if (!item || typeof item[nameField] === 'undefined') {
            console.warn(`populateSidebarGenericList: Skipping invalid item for ${containerId}:`, item);
            return;
        }
        const w = document.createElement('div'); w.className = 'item-button-wrapper';
        const b = document.createElement('button'); b.className = 'item-button';
        b.textContent = item[nameField]; 
        b.dataset.value = item[valueField]; 
        if (selItems.includes(item[valueField])) b.classList.add('selected');
        b.onclick = () => clickHandler(b, item);
        const del = document.createElement('button'); del.className = 'ikon-kare-buton';
        del.innerHTML = '<i class="fas fa-minus"></i>';
        del.title = `"${item[nameField]}" ${deleteSuffix} sil`;
        del.onclick = (e) => { e.stopPropagation(); deleteHandler(item); };
        w.appendChild(b); w.appendChild(del); cont.appendChild(w);
    });
}

async function addCustomGenericItem(inputId, apiUrl, listVarName, loadFn, itemTypeTR) {
    // Bu fonksiyon Supabase'e göre güncellenmeli
    const input = document.getElementById(inputId); if (!input) return;
    const name = input.value.trim();
    if (!name) { showMessage(`Lütfen ${itemTypeTR} adı girin.`, "error"); return; }
    // if (window[listVarName].some(i => i.name === name)) { showMessage(`"${name}" zaten listede.`, 'error'); return; }
    try {
        const fetchHeaders = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) {
                console.error(`[${itemTypeTR}] Oturum alınırken hata:`, sessionError);
                showMessage("Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.", "error");
                return;
            }
            if (session && session.access_token) {
                fetchHeaders['Authorization'] = `Bearer ${session.access_token}`;
            } else {
                console.warn(`[${itemTypeTR}] Oturum veya erişim token'ı bulunamadı.`);
                showMessage("Giriş yapılmamış veya oturum süresi dolmuş. Lütfen giriş yapın.", "error");
                return;
            }
        } else {
            console.error(`[${itemTypeTR}] Supabase client bulunamadı.`);
            showMessage("Supabase istemcisi yüklenemedi.", "error");
            return;
        }
        const r = await fetch(apiUrl, { method: 'POST', headers: fetchHeaders, body: JSON.stringify({ name }) });
        const res = await r.json();
        if (!r.ok) {
            console.error(`[${itemTypeTR}] API Hatası ${r.status}:`, res);
            throw new Error(res.error || `Sunucu ${r.status} koduyla yanıt verdi.`);
        }
        await loadFn(); 
        input.value = '';
        showMessage(`"${res.name || name}" eklendi. ID: ${res.id}`, 'success');
    } catch (e) {
        console.error(`Yeni ${itemTypeTR} ekleme hatası:`, e);
        showMessage(`❌ ${itemTypeTR} eklenemedi: ${e.message}`, 'error');
    }
}

async function deleteGenericItem(item, apiUrl, confirmMsg, successMsg, errorMsgPrefix, loadFn, nameField = 'name') {
    // Bu fonksiyon Supabase'e göre güncellenmeli
    const name = typeof item === 'object' ? item[nameField] : item;
    if (!confirm(confirmMsg.replace('%s', name))) return;
    try {
        const fetchHeaders = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) {
                console.error(`[${errorMsgPrefix}] Oturum alınırken hata:`, sessionError);
                showMessage("Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.", "error");
                return;
            }
            if (session && session.access_token) {
                fetchHeaders['Authorization'] = `Bearer ${session.access_token}`;
            } else {
                console.warn(`[${errorMsgPrefix}] Oturum veya erişim token'ı bulunamadı.`);
                showMessage("Giriş yapılmamış veya oturum süresi dolmuş. Lütfen giriş yapın.", "error");
                return;
            }
        } else {
            console.error(`[${errorMsgPrefix}] Supabase client bulunamadı.`);
            showMessage("Supabase istemcisi yüklenemedi.", "error");
            return;
        }
        const r = await fetch(`${apiUrl}/${encodeURIComponent(name)}`, { method: 'DELETE', headers: fetchHeaders });
        const res = await r.json();
        if (!r.ok) {
            console.error(`[${errorMsgPrefix}] API Hatası ${r.status}:`, res);
            throw new Error(res.error || `Sunucu ${r.status} koduyla yanıt verdi.`);
        }
        showMessage(successMsg.replace('%s', name), 'success');
        await loadFn();
    } catch (e) {
        console.error(`${errorMsgPrefix} silme hatası:`, e);
        showMessage(`❌ ${errorMsgPrefix} silinemedi: ${e.message}`, 'error');
    }
}

function populateSidebarAracGerec() { populateSidebarGenericList('sidebarAracGerecList', window.tumAracGerecListesi, getSelectedSidebarAracGerec, (b, item) => b.classList.toggle('selected'), (item) => deleteAracGerecTipi(item.name), 'name', 'name', 'adlı aracı'); }
async function loadAllAracGerecTipleri() { await loadResourceList('/api/arac-gerec-tipleri', 'tumAracGerecListesi', populateSidebarAracGerec, [{id: 'default-ag-0', name:"Tahta"},{id: 'default-ag-1', name:"Projeksiyon"}]); }
async function addCustomAracGerec() { await addCustomGenericItem('customAracGerecInput', '/api/arac-gerec-tipleri', 'tumAracGerecListesi', loadAllAracGerecTipleri, 'araç-gereç'); }
async function deleteAracGerecTipi(name) { await deleteGenericItem({name: name}, '/api/arac-gerec-tipleri', '"%s" adlı aracı sil?', '"%s" silindi.', 'Araç-gereç', loadAllAracGerecTipleri); }
function getSelectedSidebarAracGerec() { const s = []; document.querySelectorAll('#sidebarAracGerecList .item-button.selected').forEach(b => s.push(b.dataset.value)); return s; }

function populateSidebarYontemTeknik() { populateSidebarGenericList('sidebarYontemTeknikList', window.tumYontemTeknikListesi, getSelectedSidebarYontemTeknik, (b, item) => b.classList.toggle('selected'), (item) => deleteYontemTeknikTipi(item.name), 'name', 'name', 'adlı yöntemi/tekniği'); }
async function loadAllYontemTeknikTipleri() { await loadResourceList('/api/yontem-teknik-tipleri', 'tumYontemTeknikListesi', populateSidebarYontemTeknik, [{id: 'default-yt-0', name:"Anlatım"},{id: 'default-yt-1', name:"Soru-Cevap"}]); }
async function addCustomYontemTeknik() { await addCustomGenericItem('customYontemTeknikInput', '/api/yontem-teknik-tipleri', 'tumYontemTeknikListesi', loadAllYontemTeknikTipleri, 'yöntem/teknik'); }
async function deleteYontemTeknikTipi(name) { await deleteGenericItem({name: name}, '/api/yontem-teknik-tipleri', '"%s" adlı yöntemi/tekniği sil?', '"%s" silindi.', 'Yöntem/teknik', loadAllYontemTeknikTipleri); }
function getSelectedSidebarYontemTeknik() { const s = []; document.querySelectorAll('#sidebarYontemTeknikList .item-button.selected').forEach(b => s.push(b.dataset.value)); return s; }

function applySidebarSelectionToAction(actionType, getter, itemTR, field) {
    const items = getter();
    if (items.length === 0 && (actionType.includes('esitle') || actionType.includes('ekle'))) {
        showMessage(`Kenar çubuğundan ${itemTR} seçin.`, "error");
        return;
    }
    const weekChecks = document.querySelectorAll('#haftaContainer .week-checkbox:checked:not(:disabled)');
    const weekNums = Array.from(weekChecks).map(cb => parseInt(cb.id.split('-')[1])).filter(id => !isNaN(id));
    if (actionType.includes('Secili') && weekNums.length === 0) {
        showMessage("Yıllık plandan hafta seçin.", "error");
        return;
    }
    let changed = false;
    baseAcademicPlan.forEach(bh => {
        const target = actionType.includes('Tum') || (actionType.includes('Secili') && weekNums.includes(bh.originalAcademicWeek));
        if (target) {
            changed = true;
            if (actionType.startsWith('esitle')) {
                bh[field] = [...items];
            } else if (actionType.startsWith('ekle')) {
                bh[field] = bh[field] || [];
                items.forEach(i => { if (!bh[field].includes(i)) bh[field].push(i); });
            }
        }
    });
    yillikPlan.forEach(ph => {
        if (ph.type === 'academic') {
            const base = baseAcademicPlan.find(b => b.originalAcademicWeek === ph.originalAcademicWeek);
            if (base) ph[field] = [...(base[field] || [])];
        }
    });
    if (changed) {
        renderYillikPlan();
        showMessage(`${itemTR.charAt(0).toUpperCase() + itemTR.slice(1)} güncellendi.`, "success");
    } else {
        showMessage("Değişiklik yapılmadı.", "info");
    }
}
function applyAracGerecAction(type){applySidebarSelectionToAction(type,getSelectedSidebarAracGerec,'araç-gereç','aracGerec');}
function applyYontemTeknikAction(type){applySidebarSelectionToAction(type,getSelectedSidebarYontemTeknik,'yöntem/teknik','yontemTeknik');}

async function loadAllPersonal(){
    // Bu fonksiyon Supabase'den veri çekecek şekilde güncellenmeli
    try{
        // Örnek: if(supabase) { const { data, error } = await supabase.from('ogretmenler').select('*'); ... }
        const r=await fetch('/api/ogretmenler'); // Bu API endpoint'i Supabase'e göre güncellenmeli
        if(!r.ok)throw new Error('Personel yüklenemedi.');
        const d=await r.json();
        tumPersonalListesi=Array.isArray(d)?d.map(o=>({id:o.id,name:o.ad_soyad,branch:o.unvan,isMudur:o.unvan?.toLowerCase().includes('müdür')||false})):[];
    }catch(e){console.error("Personel yükleme hatası:",e); tumPersonalListesi=[];}
    try { populateSidebarMudurList(); } catch (e) { console.error("Error in populateSidebarMudurList:", e); }
    try { populateSidebarOgretmenList(); } catch (e) { console.error("Error in populateSidebarOgretmenList:", e); }
}

function populateSidebarMudurList() {
    const mudurler = tumPersonalListesi.filter(p => p.isMudur);
    const container = document.getElementById('sidebarMudurList'); if (!container) return;
    container.innerHTML = '';
    mudurler.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(mudur => {
        const wrapper = document.createElement('div'); wrapper.className = 'item-button-wrapper';
        const button = document.createElement('button'); button.className = 'item-button mudur-item-button';
        button.textContent = mudur.name; button.dataset.id = mudur.id;
        if (planaEklenenPersonal.some(p => p.isMudur && p.id === mudur.id)) button.classList.add('selected');
        button.onclick = () => {
            const isCurrentlySelected = button.classList.contains('selected');
            document.querySelectorAll('#sidebarMudurList .mudur-item-button').forEach(btn => btn.classList.remove('selected'));
            planaEklenenPersonal = planaEklenenPersonal.filter(p => !p.isMudur);
            if (!isCurrentlySelected) {
                button.classList.add('selected');
                if (mudur && mudur.isMudur) {
                    planaEklenenPersonal.push({ ...mudur, isMudur: true });
                    showMessage(`"${mudur.name}" müdür olarak plana eklendi.`, "success"); 
                } else showMessage(`"${mudur.name || 'Bilinmeyen müdür'}" için geçerli müdür verisi bulunamadı.`, "error");
            } else showMessage(`"${mudur.name}" (Müdür) plandan kaldırıldı.`, "info");
            sortAndRenderImzaAlani(); updateSidebarActionButtonsState();
        };
        const deleteBtn = document.createElement('button'); deleteBtn.className = 'ikon-kare-buton';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; deleteBtn.title = `"${mudur.name}" adlı müdürü sil`;
        deleteBtn.onclick = (e) => { e.stopPropagation(); deletePersonal(mudur.id, mudur.name, true); };
        wrapper.appendChild(button); wrapper.appendChild(deleteBtn); container.appendChild(wrapper);
    });
    updateSidebarActionButtonsState();
}

async function addCustomMudur() {
    // Bu fonksiyon Supabase'e göre güncellenmeli
    const input = document.getElementById('customMudurInput'); if (!input) return;
    const name = input.value.trim(); if (!name) { showMessage("Lütfen müdürün adını ve soyadını girin.", "error"); return; }
    try {
        const fetchHeaders = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) {
                console.error("[Müdür Ekleme] Oturum alınırken hata:", sessionError);
                showMessage("Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.", "error");
                return;
            }
            if (session && session.access_token) {
                fetchHeaders['Authorization'] = `Bearer ${session.access_token}`;
            } else {
                console.warn("[Müdür Ekleme] Oturum veya erişim token'ı bulunamadı.");
                showMessage("Giriş yapılmamış veya oturum süresi dolmuş. Lütfen giriş yapın.", "error");
                return;
            }
        } else {
            console.error("[Müdür Ekleme] Supabase client bulunamadı.");
            showMessage("Supabase istemcisi yüklenemedi.", "error");
            return;
        }
        const response = await fetch('/api/ogretmenler', { method: 'POST', headers: fetchHeaders, body: JSON.stringify({ ad_soyad: name, unvan: "Okul Müdürü" }) });
        const result = await response.json(); 
        if (!response.ok) {
            console.error(`[Müdür Ekleme] API Hatası ${response.status}:`, result);
            throw new Error(result.error || `Sunucu ${response.status} koduyla yanıt verdi.`);
        }
        await loadAllPersonal(); input.value = ''; showMessage(`"${name}" (Okul Müdürü) başarıyla eklendi.`, 'success');
        const newMudur = tumPersonalListesi.find(p => p.name === name && p.isMudur);
        if (newMudur) {
            document.querySelectorAll('#sidebarMudurList .mudur-item-button').forEach(btn => btn.classList.remove('selected'));
            planaEklenenPersonal = planaEklenenPersonal.filter(p => !p.isMudur);
            const newMudurButton = document.querySelector(`#sidebarMudurList .mudur-item-button[data-id="${newMudur.id}"]`); 
            if (newMudurButton) newMudurButton.classList.add('selected');
            planaEklenenPersonal.push({ ...newMudur, isMudur: true });
            sortAndRenderImzaAlani(); showMessage(`"${newMudur.name}" otomatik olarak plana eklendi.`, "info");
        }
    } catch (error) { console.error("Yeni müdür ekleme hatası:", error); showMessage(`❌ Müdür eklenemedi: ${error.message}`, 'error'); }
}

function populateSidebarOgretmenList() {
    const ogretmenler = tumPersonalListesi.filter(p => !p.isMudur);
    const container = document.getElementById('sidebarOgretmenList'); if (!container) return;
    container.innerHTML = '';
    ogretmenler.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(ogretmen => {
        const wrapper = document.createElement('div'); wrapper.className = 'item-button-wrapper';
        const selectBtn = document.createElement('button'); selectBtn.className = 'item-button ogretmen-select-btn';
        selectBtn.textContent = ogretmen.name; selectBtn.dataset.id = ogretmen.id;
        if (planaEklenenPersonal.some(p => p.id === ogretmen.id && !p.isMudur)) selectBtn.classList.add('selected');
        selectBtn.onclick = () => toggleOgretmenSecimi(ogretmen, selectBtn);
        const editBransBtn = document.createElement('button'); editBransBtn.className = 'ikon-kare-buton';
        editBransBtn.innerHTML = '<i class="fas fa-chevron-right"></i>'; editBransBtn.title = `"${ogretmen.name}" adlı öğretmenin branşını düzenle/görüntüle`;
        editBransBtn.dataset.id = ogretmen.id;
        editBransBtn.onclick = (e) => { e.stopPropagation(); navigateToOgretmenDetayView(ogretmen.id, ogretmen.name, ogretmen.branch); };
        const deleteBtn = document.createElement('button'); deleteBtn.className = 'ikon-kare-buton dikkat';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>'; deleteBtn.title = `"${ogretmen.name}" adlı öğretmeni sil`;
        deleteBtn.dataset.id = ogretmen.id;
        deleteBtn.onclick = (e) => { e.stopPropagation(); deletePersonal(ogretmen.id, ogretmen.name, false); };
        wrapper.appendChild(selectBtn); wrapper.appendChild(editBransBtn); wrapper.appendChild(deleteBtn); container.appendChild(wrapper);
    });
}

function toggleOgretmenSecimi(ogretmen, buttonElement) {
    const ogretmenId = ogretmen.id;
    const index = planaEklenenPersonal.findIndex(p => p.id === ogretmenId && !p.isMudur);
    if (index > -1) {
        planaEklenenPersonal.splice(index, 1); buttonElement.classList.remove('selected');
        showMessage(`"${ogretmen.name}" plandan kaldırıldı.`, "info");
    } else {
        planaEklenenPersonal.push({ ...ogretmen, isMudur: false }); buttonElement.classList.add('selected');
        showMessage(`"${ogretmen.name}" plana eklendi.`, "success");
    }
    sortAndRenderImzaAlani();
}

function navigateToOgretmenDetayView(ogretmenId, ogretmenAdi, mevcutBrans = '') {
    const viewTitle = ogretmenAdi || "Branş Düzenle"; 
    const mainTitleEl = document.getElementById('sidebarMainTitle'); if (mainTitleEl) mainTitleEl.textContent = viewTitle;
    document.getElementById('currentEditingOgretmenId').value = ogretmenId || '';
    document.getElementById('currentEditingOgretmenNameForTitle').value = ogretmenAdi || ''; 
    document.getElementById('editingOgretmenBransInput').value = mevcutBrans || '';
    navigateToView('ogretmenDetayView');
    document.getElementById('sidebarGlobalBackBtn').dataset.viewTarget = 'ogretmenYonetimiView';
}

async function saveOgretmenDetay() {
    // Bu fonksiyon Supabase'e göre güncellenmeli
    const ogretmenId = document.getElementById('currentEditingOgretmenId').value;
    const adSoyad = document.getElementById('currentEditingOgretmenNameForTitle').value; 
    const brans = document.getElementById('editingOgretmenBransInput').value.trim();
    if (!adSoyad && !ogretmenId) { showMessage("Öğretmen adı alınamadı.", "error"); return; }
    if (!brans) { showMessage("Lütfen öğretmenin branşını girin.", "error"); return; }
    if (brans.toLowerCase().includes("müdür")) { showMessage("Öğretmen branşı 'müdür' içeremez.", "warning"); return; }
    const apiUrl = ogretmenId ? `/api/ogretmenler/${ogretmenId}` : '/api/ogretmenler'; // Bu API endpoint'i Supabase'e göre güncellenmeli
    const method = ogretmenId ? 'PUT' : 'POST';
    try {
        const fetchHeaders = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) {
                console.error("[Öğretmen Kaydet/Güncelle] Oturum alınırken hata:", sessionError);
                showMessage("Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.", "error");
                return;
            }
            if (session && session.access_token) {
                fetchHeaders['Authorization'] = `Bearer ${session.access_token}`;
            } else {
                console.warn("[Öğretmen Kaydet/Güncelle] Oturum veya erişim token'ı bulunamadı.");
                showMessage("Giriş yapılmamış veya oturum süresi dolmuş. Lütfen giriş yapın.", "error");
                return;
            }
        } else {
            console.error("[Öğretmen Kaydet/Güncelle] Supabase client bulunamadı.");
            showMessage("Supabase istemcisi yüklenemedi.", "error");
            return;
        }
        const response = await fetch(apiUrl, { method: method, headers: fetchHeaders, body: JSON.stringify({ ad_soyad: adSoyad, unvan: brans }) });
        const result = await response.json(); 
        if (!response.ok) {
            console.error(`[Öğretmen Kaydet/Güncelle] API Hatası ${response.status}:`, result);
            throw new Error(result.error || `Sunucu ${response.status} koduyla yanıt verdi.`);
        }
        showMessage(result.message || `Öğretmen başarıyla ${ogretmenId ? 'güncellendi' : 'eklendi'}.`, 'success');
        await loadAllPersonal(); navigateToView('ogretmenYonetimiView');
    } catch (error) { console.error("Öğretmen kaydetme/güncelleme hatası:", error); showMessage(`❌ Öğretmen kaydedilemedi/güncellenemedi: ${error.message}`, 'error'); }
}

async function deletePersonal(id,name,isMudur){
    // Bu fonksiyon Supabase'e göre güncellenmeli
    const type=isMudur?"müdürü":"öğretmeni";
    if(!confirm(`"${name}" adlı ${type} silinsin mi? Bu işlem geri alınamaz.`))return;
    try{
        const fetchHeaders = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) {
                console.error("[Personel Silme] Oturum alınırken hata:", sessionError);
                showMessage("Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.", "error");
                return;
            }
            if (session && session.access_token) {
                fetchHeaders['Authorization'] = `Bearer ${session.access_token}`;
            } else {
                console.warn("[Personel Silme] Oturum veya erişim token'ı bulunamadı.");
                showMessage("Giriş yapılmamış veya oturum süresi dolmuş. Lütfen giriş yapın.", "error");
                return;
            }
        } else {
            console.error("[Personel Silme] Supabase client bulunamadı.");
            showMessage("Supabase istemcisi yüklenemedi.", "error");
            return;
        }
        const r=await fetch(`/api/ogretmenler/${id}`,{method:'DELETE', headers: fetchHeaders}); // Bu API endpoint'i Supabase'e göre güncellenmeli
        const res=await r.json();
        if (!r.ok) {
            console.error(`[Personel Silme] API Hatası ${r.status}:`, res);
            throw new Error(res.error || `Sunucu ${r.status} koduyla yanıt verdi.`);
        }
        showMessage(`"${name}" silindi.`,"success");
        await loadAllPersonal();
        planaEklenenPersonal=planaEklenenPersonal.filter(p=>p.id!==id);
        sortAndRenderImzaAlani();
    }catch(e){showMessage(`❌ ${type} silinemedi: ${e.message}`,"error");}
}
function sortAndRenderImzaAlani(){planaEklenenPersonal.sort((a,b)=>(a.isMudur-b.isMudur)||(a.name||'').localeCompare(b.name||''));renderPlanImzalari();} 
function getAdditionalTeachers(){return planaEklenenPersonal.map(p=>({name:p.name,branch:p.isMudur?"Okul Müdürü":p.branch,isPrincipal:p.isMudur}));}
function renderPlanImzalari(){const cont=document.getElementById('planImzalariContainer');if(!cont)return;cont.innerHTML='';const ogretmenler=planaEklenenPersonal.filter(p=>!p.isMudur);const mudur=planaEklenenPersonal.find(p=>p.isMudur);ogretmenler.forEach(o=>addImzaAlaniToContainer(cont,o.name,o.branch));if(mudur)addImzaAlaniToContainer(cont,mudur.name,"Okul Müdürü");}
function addImzaAlaniToContainer(cont,name,branch){const div=document.createElement('div');div.className='imza-alani';const pName=document.createElement('p');pName.textContent=name;const pBranch=document.createElement('p');pBranch.className='unvan';pBranch.textContent=branch;const line=document.createElement('div');line.className='imza-cizgisi';div.appendChild(pName);div.appendChild(pBranch);div.appendChild(line);cont.appendChild(div);}

function toggleDropdown(dd){dd.style.display=dd.style.display==='block'?'none':'block';}
function createDynamicSelector(weekNum,listName,field,selItems=[],typeTR){const cont=document.createElement('div');cont.className='arac-gerec-container';const selDisp=document.createElement('div');selDisp.className='arac-gerec-selected';const drop=document.createElement('div');drop.className='arac-gerec-dropdown';selDisp.onclick=()=>{toggleDropdown(drop);if(typeTR==='araç-gereç')updateSidebarAracGerecSelectionFromPlan(yillikPlan.find(h=>h.originalAcademicWeek===weekNum)?.[field]||[]);if(typeTR==='yöntem/teknik')updateSidebarYontemTeknikSelectionFromPlan(yillikPlan.find(h=>h.originalAcademicWeek===weekNum)?.[field]||[]);};(window[listName]||[]).forEach(itemObj=>{const opt=document.createElement('div');opt.className='arac-gerec-option';opt.textContent=itemObj.name;opt.onclick=()=>togglePlanItemSelection(weekNum,itemObj.name,selDisp,field);drop.appendChild(opt);});cont.appendChild(selDisp);cont.appendChild(drop);updatePlanItemDisplay(selDisp,selItems||[],weekNum,field,typeTR);return cont;}
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
    if (existingNotification) existingNotification.remove();
    const notification = document.createElement('div');
    notification.classList.add('notification-toast');
    let title = 'Bilgi'; let iconContent = 'ℹ️';
    if (type === 'success') { title = 'Başarılı'; iconContent = '✔️'; notification.classList.add('success'); }
    else if (type === 'error') { title = 'Hata'; iconContent = '✖️'; notification.classList.add('error'); }
    else if (type === 'warning') { title = 'Uyarı'; iconContent = '⚠️'; notification.classList.add('warning'); }
    else notification.classList.add('info');
    notification.innerHTML = `<div class="notification-icon">${iconContent}</div><div class="notification-content"><div class="notification-title">${title}</div><div class="notification-text">${text}</div></div><button class="notification-close">✕</button>`;
    document.body.appendChild(notification);
    requestAnimationFrame(() => { requestAnimationFrame(() => { notification.classList.add('show'); }); });
    const closeButton = notification.querySelector('.notification-close');
    const hideNotification = () => {
        notification.classList.remove('show');
        notification.addEventListener('transitionend', () => { if (notification.parentNode) notification.remove(); }, { once: true });
        setTimeout(() => { if (notification.parentNode) notification.remove(); }, 500);
    };
    closeButton.addEventListener('click', hideNotification);
    if (duration > 0) setTimeout(hideNotification, duration);
    const oldMessageElement = document.getElementById('message');
    if (oldMessageElement) oldMessageElement.style.display = 'none';
}

async function loadSavedPlans(){
    // Bu fonksiyon Supabase'den veri çekecek şekilde güncellenmeli
    try{
        const headers = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) {
                console.error('Oturum alınırken hata:', sessionError);
            } else if (session && session.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
        }
        
        const r=await fetch('/api/plans', { headers }); // Bu API endpoint'i Supabase'e göre güncellenmeli
        if (r.status === 401) {
            showMessage('Kaydedilmiş planları yüklemek için lütfen giriş yapın.', 'warning');
            // Kullanıcıyı giriş yapmaya yönlendirebilir veya giriş butonunu gösterebilirsiniz.
            // Örneğin, checkAuthStatus() çağrılabilir veya özel bir UI güncellemesi yapılabilir.
            const cont=document.getElementById('savedPlansListContainer');
            if(cont) cont.innerHTML='<p>Kaydedilmiş planları görmek için lütfen giriş yapın.</p>';
            return; 
        }
        if(!r.ok) {
            const errorText = await r.text();
            console.error(`Kaydedilmiş planlar yüklenemedi. Status: ${r.status}, Hata: ${errorText}`);
            throw new Error(`Kaydedilmiş planlar yüklenemedi. Sunucu ${r.status} durum kodu ile yanıt verdi.`);
        }
        const plans=await r.json();
        const cont=document.getElementById('savedPlansListContainer');
        if(!cont)return;
        cont.innerHTML='';
        if(plans.length===0){cont.innerHTML='<p>Kaydedilmiş plan bulunmuyor.</p>';return;}
        const ul=document.createElement('ul');
        ul.className='saved-plan-items-list';
        plans.forEach(p=>{
            const li=document.createElement('li');li.className='saved-plan-item';
            const info=document.createElement('span');info.textContent=`${p.plan_name} (${p.ders||'Bilinmeyen'} - ${p.sinif||'Bilinmeyen'})`;
            const btns=document.createElement('div');btns.className='saved-plan-buttons';
            const loadBtn=document.createElement('button');loadBtn.type='button';loadBtn.textContent='Yükle';loadBtn.onclick=()=>loadSpecificPlan(p.id);
            const dlBtn=document.createElement('button');dlBtn.type='button';dlBtn.textContent='İndir';dlBtn.className='download-saved-btn';dlBtn.onclick=()=>generatePlanForSaved(p.id);
            const delBtn=document.createElement('button');delBtn.type='button';delBtn.textContent='Sil';delBtn.className='delete-btn';delBtn.onclick=()=>deletePlan(p.id);
            btns.appendChild(loadBtn);btns.appendChild(dlBtn);btns.appendChild(delBtn);
            li.appendChild(info);li.appendChild(btns);ul.appendChild(li);
        });
        cont.appendChild(ul);
    }catch(e){showMessage(`❌ Kayıtlı planlar yüklenemedi: ${e.message}`,'error');}
}
async function deletePlan(id){
    // Bu fonksiyon Supabase'e göre güncellenmeli
    if(!confirm("Bu planı sil?"))return;
    try{
        const headers = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
        }
        const r=await fetch(`/api/plans/${id}`,{method:'DELETE', headers}); // Bu API endpoint'i Supabase'e göre güncellenmeli
        if(!r.ok){const res=await r.json();throw new Error(res.error||'Silinemedi.');}
        showMessage('Plan silindi.','success');
        loadSavedPlans();
    }catch(e){showMessage(`❌ Plan silinemedi: ${e.message}`,'error');}
}
async function generatePlanForSaved(id){
    // Bu fonksiyon Supabase'den veri çekecek şekilde güncellenmeli
    showMessage('Kaydedilmiş plan hazırlanıyor...','success');
    const loadEl=document.getElementById('loading');if(loadEl)loadEl.style.display='block';
    try{
        const headers = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
        }
        const planR=await fetch(`/api/plans/${id}`, { headers }); // Bu API endpoint'i Supabase'e göre güncellenmeli
        if(!planR.ok)throw new Error('Plan verisi alınamadı.');
        const planData=await planR.json();
        const docData={okul:planData.okul,ogretmen:planData.ogretmen,ders:planData.ders,sinif:planData.sinif,egitimOgretimYili:planData.egitim_ogretim_yili,dersSaati:planData.ders_saati,haftalikPlan:planData.plan_data_json||[],additionalTeachers:planData.additional_teachers_json||[]};
        
        const generatePlanHeaders = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.access_token) {
                generatePlanHeaders['Authorization'] = `Bearer ${session.access_token}`;
            }
        }
        const docR=await fetch('/generate-plan',{method:'POST',headers: generatePlanHeaders,body:JSON.stringify(docData)});
        if(docR.ok){
            const blob=await docR.blob();const url=window.URL.createObjectURL(blob);
            const a=document.createElement('a');a.href=url;a.download=`yillik_plan_${planData.plan_name.replace(/[^a-zA-Z0-9]/g,'_')}.docx`;a.click();
            window.URL.revokeObjectURL(url);showMessage('Plan indirildi!','success');
        }else{const errD=await docR.json().catch(()=>({message:'Word oluşturulamadı'}));throw new Error(errD.error||errD.message);}
    }catch(e){showMessage(`❌ Plan indirilemedi: ${e.message}`,'error');}
    finally{if(loadEl)loadEl.style.display='none';}
}

async function saveCurrentPlan(){
    // Bu fonksiyon Supabase'e göre güncellenmeli
    let name=document.getElementById('currentPlanNameInput').value.trim();
    if(!name){currentEditingPlanId=null;const d=new Date();name=`Plan-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;document.getElementById('currentPlanNameInput').value=name;showMessage(`Plan adı: "${name}"`,'info');}
    let ogretmen=planaEklenenPersonal.find(p=>!p.isMudur&&p.branch)||planaEklenenPersonal.find(p=>!p.isMudur)||planaEklenenPersonal[0];
    if(!ogretmen&&!currentEditingPlanId){showMessage("İmza alanına öğretmen/müdür ekleyin.","error");return;}
    const data={plan_name:name,okul:document.getElementById('okulSidebar')?.value,ogretmen:ogretmen?ogretmen.name:"",ders:document.getElementById('dersSidebar')?.value,sinif:document.getElementById('sinifSidebar')?.value,egitim_ogretim_yili:document.getElementById('egitimOgretimYiliSidebar')?.value,ders_saati:seciliDersSaati||baseAcademicPlan[0]?.dersSaati||'1',varsayilan_arac_gerec:getSelectedSidebarAracGerec(),baslangic_haftasi:document.getElementById('baslangicHaftasiSidebar')?.value,plan_data_json:yillikPlan,base_academic_plan_json:baseAcademicPlan,additional_teachers:getAdditionalTeachers(),plan_id:currentEditingPlanId};
    try{
        const headers = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
        }
        const r=await fetch('/api/plans',{method:'POST',headers: headers,body:JSON.stringify(data)}); // Bu API endpoint'i Supabase'e göre güncellenmeli
        const res=await r.json();
        if(!r.ok)throw new Error(res.error||'Kaydedilemedi.');
        showMessage(`"${name}" kaydedildi.`,'success');
        if(res.id&&!currentEditingPlanId)currentEditingPlanId=res.id;
        loadSavedPlans();
    }catch(e){showMessage(`❌ Plan kaydedilemedi: ${e.message}`,'error');}
}

async function loadSpecificPlan(id) {
    // Bu fonksiyon Supabase'den veri çekecek şekilde güncellenmeli
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
        }
        const r = await fetch(`/api/plans/${id}`, { headers }); // Bu API endpoint'i Supabase'e göre güncellenmeli
        if (!r.ok) throw new Error('Plan yüklenemedi.');
        const data = await r.json();
        ['okulSidebar', 'dersSidebar', 'sinifSidebar', 'egitimOgretimYiliSidebar', 'baslangicHaftasiSidebar'].forEach(elId => {
            const el = document.getElementById(elId);
            if (el) {
                const key = elId.replace('Sidebar', '').replace(/([A-Z])/g, '_$1').toLowerCase();
                el.value = data[key] || data[elId.replace('Sidebar', '')] || '';
                if (elId === 'egitimOgretimYiliSidebar' && data.egitim_ogretim_yili && !Array.from(el.options).some(o => o.value === data.egitim_ogretim_yili)) {
                    el.add(new Option(data.egitim_ogretim_yili, data.egitim_ogretim_yili, true, true));
                }
            }
        });
        if (data.ders_saati) selectDersSaati(data.ders_saati.toString());
        document.getElementById('currentPlanNameInput').value = data.plan_name || '';
        currentEditingPlanId = data.id;

        const varsayilanAGIsimleri = Array.isArray(data.varsayilan_arac_gerec) ? data.varsayilan_arac_gerec : [];
        varsayilanAGIsimleri.forEach(name => {
            if (name && !tumAracGerecListesi.some(item => item.name === name)) {
                tumAracGerecListesi.push({ id: `loaded-ag-${name}-${Date.now()}`, name: name });
            }
        });

        const basePlanItems = Array.isArray(data.base_academic_plan_json) ? data.base_academic_plan_json : [];
        const allYTIsimleri = basePlanItems.flatMap(h => h.yontemTeknik || []).filter((v, i, a) => v && a.indexOf(v) === i);
        allYTIsimleri.forEach(name => {
            if (name && !tumYontemTeknikListesi.some(item => item.name === name)) {
                tumYontemTeknikListesi.push({ id: `loaded-yt-${name}-${Date.now()}`, name: name });
            }
        });
        const allAGIsimleri = basePlanItems.flatMap(h => h.aracGerec || []).filter((v, i, a) => v && a.indexOf(v) === i);
        allAGIsimleri.forEach(name => {
            if (name && !tumAracGerecListesi.some(item => item.name === name)) {
                tumAracGerecListesi.push({ id: `loaded-ag-${name}-${Date.now()}`, name: name });
            }
        });

        populateSidebarAracGerec();
        document.querySelectorAll('#sidebarAracGerecList .item-button').forEach(b => b.classList.toggle('selected', varsayilanAGIsimleri.includes(b.dataset.value)));
        populateSidebarYontemTeknik();

        planaEklenenPersonal = [];
        if (data.additional_teachers_json && Array.isArray(data.additional_teachers_json)) {
            data.additional_teachers_json.forEach(p => {
                const found = tumPersonalListesi.find(gp => gp.name === p.name && gp.branch === p.branch);
                planaEklenenPersonal.push(found || { ...p, id: `temp-${Date.now()}` });
            });
        }
        sortAndRenderImzaAlani();
        populateSidebarMudurList();
        populateSidebarOgretmenList();

        baseAcademicPlan = basePlanItems.map(h => ({ ...h }));
        yillikPlan = Array.isArray(data.plan_data_json) ? data.plan_data_json.map(h => ({ ...h })) : [];

        if (yillikPlan.length > 0) {
            updateYillikPlanBasligi();
            renderYillikPlan();
        } else {
            setDefaultBaslangicHaftasi();
        }
        const planOnayTarihiInput = document.getElementById('planOnayTarihiSidebar');
        if (planOnayTarihiInput) planOnayTarihiInput.value = data.plan_onay_tarihi || '';
        showMessage(`"${data.plan_name}" yüklendi.`, 'success');
    } catch (e) {
        showMessage(`❌ Plan yüklenemedi: ${e.message}`, 'error');
        console.error(e);
    }
}

async function loadPlanOnayTarihi(planId) {
    // Bu fonksiyon Supabase'den veri çekecek şekilde güncellenmeli
    const planOnayTarihiInput = document.getElementById('planOnayTarihiSidebar');
    if (!planOnayTarihiInput) return;
    try {
        const headers = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (session && session.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }
        }
        const response = await fetch(`/api/plans/${planId}`, { headers }); // Bu API endpoint'i Supabase'e göre güncellenmeli
        if (!response.ok) { planOnayTarihiInput.value = ''; return; }
        const planData = await response.json();
        planOnayTarihiInput.value = planData.plan_onay_tarihi || '';
    } catch (error) { console.error('Plan onay tarihi yüklenirken hata:', error); planOnayTarihiInput.value = ''; }
}

document.addEventListener('DOMContentLoaded',async function(){
    const closeSettingsSidebarBtnElement = document.getElementById('closeSettingsSidebarBtn');
    if(settingsBtn) settingsBtn.addEventListener('click', toggleSidebar); 
    if(closeSettingsSidebarBtnElement) closeSettingsSidebarBtnElement.addEventListener('click', toggleSidebar);
    populateEgitimOgretimYiliOptions('egitimOgretimYiliSidebar');
    
    // Bu API çağrıları Supabase'e göre güncellenecek
    await Promise.all([loadAllAracGerecTipleri(),loadAllYontemTeknikTipleri(),loadAllPersonal()]);
    
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        // Special handling for the demo data button is done later with its specific ID.
        // This generic listener should only apply to items that are meant for view navigation.
        if (item.id !== 'loadDemoDataBtn' && item.dataset.viewTarget) {
            item.addEventListener('click', async (e) => {
                e.preventDefault();
                await navigateToView(item.dataset.viewTarget);
            });
        }
        // If it's the loadDemoDataBtn, its specific listener (added later) will handle the click.
    });

    document.getElementById('sidebarGlobalBackBtn')?.addEventListener('click',async (e)=>{ 
        e.preventDefault(); const targetView = e.currentTarget.dataset.viewTarget; 
        if (currentSidebarView === 'ogretmenDetayView') {
            const currentBransValue = document.getElementById('editingOgretmenBransInput').value.trim();
            const ogretmenId = document.getElementById('currentEditingOgretmenId').value;
            let originalBransValue = '';
            if (ogretmenId) { const ogretmen = tumPersonalListesi.find(p => p.id.toString() === ogretmenId); if (ogretmen) originalBransValue = ogretmen.branch || '';}
            if ((ogretmenId && currentBransValue !== originalBransValue && currentBransValue) || (!ogretmenId && currentBransValue)) {
                await saveOgretmenDetay(); return; 
            }
        }
        if (currentSidebarView === 'ogretmenDetayView' && targetView === 'ogretmenYonetimiView') await loadAllPersonal();
        navigateToView(targetView);
    });
    document.querySelectorAll('#dersSaatiBtnContainer .ders-saati-btn').forEach(b=>b.addEventListener('click',()=>selectDersSaati(b.dataset.saat)));
    document.getElementById('addCustomDersSaatiBtn')?.addEventListener('click', addCustomDersSaati);
    document.getElementById('addCustomAracGerecBtn')?.addEventListener('click',addCustomAracGerec);
    ['agEsitleTumHaftalarBtn','agEsitleSeciliHaftalarBtn','agEkleTumHaftalaraBtn','agEkleSeciliHaftalaraBtn'].forEach((id,i)=>{
        document.getElementById(id)?.addEventListener('click',()=>{
            const actionPrefix = i % 2 === 0 ? 'esitle' : 'ekle';
            const actionScope = i < 2 ? 'Tum' : 'Secili';
            applyAracGerecAction(actionPrefix + actionScope);
        });
    });
    document.getElementById('addCustomYontemTeknikBtn')?.addEventListener('click',addCustomYontemTeknik);
    ['ytEsitleTumHaftalarBtn','ytEsitleSeciliHaftalarBtn','ytEkleTumHaftalaraBtn','ytEkleSeciliHaftalaraBtn'].forEach((id,i)=>{
        document.getElementById(id)?.addEventListener('click',()=>{
            const actionPrefix = i % 2 === 0 ? 'esitle' : 'ekle';
            const actionScope = i < 2 ? 'Tum' : 'Secili';
            applyYontemTeknikAction(actionPrefix + actionScope);
        });
    });
    document.getElementById('addCustomMudurBtn')?.addEventListener('click',addCustomMudur);
    document.getElementById('addNewOgretmenGoToDetailBtn')?.addEventListener('click', () => {
        const newNameInput = document.getElementById('newOgretmenNameInput'); const name = newNameInput.value.trim();
        if (!name) { showMessage("Lütfen yeni öğretmen için bir ad girin.", "error"); newNameInput.focus(); return; }
        navigateToOgretmenDetayView(null, name, ''); newNameInput.value = '';
    });
    document.getElementById('saveOgretmenBransBtn')?.addEventListener('click', saveOgretmenDetay);
    if(baseAcademicPlan.length===0){for(let i=1;i<=TOPLAM_AKADEMIK_HAFTA;i++)baseAcademicPlan.push({originalAcademicWeek:i,dersSaati:'4',aracGerec:[],yontemTeknik:[]});}
    setDefaultBaslangicHaftasi(); 
    
    // loadSavedPlans Supabase'e göre güncellenecek
    loadSavedPlans();
    
    ['okulSidebar','egitimOgretimYiliSidebar','dersSidebar','sinifSidebar','baslangicHaftasiSidebar'].forEach(id=>{
        const el=document.getElementById(id);
        if(el){
            const eventType=el.tagName==='SELECT'?'change':'input';
            el.addEventListener(eventType, async ()=>{ 
                updateYillikPlanBasligi();
                if(id==='egitimOgretimYiliSidebar'||id==='baslangicHaftasiSidebar') {
                    setDefaultBaslangicHaftasi();
                    if (id === 'egitimOgretimYiliSidebar') {
                        const selectedEgitimYili = el.value;
                        if (selectedEgitimYili && typeof selectedEgitimYili === 'string') {
                            const yearParts = selectedEgitimYili.split('-');
                            if (yearParts.length > 0 && !isNaN(parseInt(yearParts[0], 10))) {
                                const academicYearStart = parseInt(yearParts[0], 10);
                                try {
                                    // Bu API çağrısı server.js'de Supabase'e göre güncellendi
                                    const fetchHeaders = { 'Content-Type': 'application/json' };
                                    if (supabaseClient) { // supabaseClient global değişkenini kullanıyoruz
                                        const { data: { session } } = await supabaseClient.auth.getSession();
                                        if (session && session.access_token) {
                                           fetchHeaders['Authorization'] = `Bearer ${session.access_token}`;
                                        }
                                    }
                                    const response = await fetch('/api/ensure-holidays-for-year', { 
                                        method: 'POST', 
                                        headers: fetchHeaders, 
                                        body: JSON.stringify({ academicYearStart }) 
                                    });
                                    if (response.ok) { const result = await response.json(); console.log(result.message); }
                                    else { const errorResult = await response.json().catch(() => ({ error: "Sunucu hatası" })); console.error(`Tatil kontrolü/üretimi hatası (${response.status}):`, errorResult.error); }
                                } catch (error) { console.error('Tatil kontrolü/üretimi sırasında ağ hatası:', error); }
                            }
                        }
                    }
                } else updateAllWeekDates();
            });
        }
    });
    selectDersSaati(baseAcademicPlan[0]?.dersSaati||'4');
    document.getElementById('planForm').addEventListener('submit',async function(e){
        e.preventDefault(); const genBtn=document.getElementById('generateBtn'); const loadEl=document.getElementById('loading');
        let ogretmen=planaEklenenPersonal.find(p=>!p.isMudur&&p.branch)||planaEklenenPersonal.find(p=>!p.isMudur)||planaEklenenPersonal[0];
        if(!ogretmen){showMessage("İmza için öğretmen/müdür ekleyin.","error");return;}
        const data={okul:document.getElementById('okulSidebar')?.value, ogretmen:ogretmen.name, ders:document.getElementById('dersSidebar')?.value, sinif:document.getElementById('sinifSidebar')?.value, egitimOgretimYili:document.getElementById('egitimOgretimYiliSidebar')?.value, dersSaati:seciliDersSaati||baseAcademicPlan[0]?.dersSaati||'1', haftalikPlan:yillikPlan, additionalTeachers:getAdditionalTeachers().filter(t=>t.name!==ogretmen.name||(t.name===ogretmen.name&&!t.isPrincipal))};
        genBtn.disabled=true; loadEl.style.display='block';
        try{
            const fetchHeaders = { 'Content-Type': 'application/json' };
            if (supabaseClient) { // supabaseClient global değişkenini kullanıyoruz
                const { data: { session } } = await supabaseClient.auth.getSession();
                if (session && session.access_token) {
                   fetchHeaders['Authorization'] = `Bearer ${session.access_token}`;
                }
            }
            const r=await fetch('/generate-plan',{
                method:'POST',
                headers: fetchHeaders,
                body:JSON.stringify(data)
            });
            if(r.ok){const blob=await r.blob();const url=window.URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`yillik_plan_${data.ders?.replace(/\s+/g,'_')}_${data.sinif}.docx`;a.click();window.URL.revokeObjectURL(url);showMessage('Plan indirildi!','success');}
            else{const errD=await r.json().catch(()=>({message:'Word oluşturulamadı'}));throw new Error(errD.error||'Sunucu hatası');}
        }catch(e){showMessage(`Plan oluşturulamadı: ${e.message}`,'error');}
        finally{genBtn.disabled=false;loadEl.style.display='none';}
    });
    document.getElementById('saveGenelBilgilerBtn')?.addEventListener('click',()=>{ updateYillikPlanBasligi(); updateAllWeekDates(); showMessage("Genel bilgiler güncellendi.","success"); });
    
    // Sayfa yüklendiğinde oturum durumunu kontrol et
    await checkAuthStatus();

    const loadDemoDataBtn = document.getElementById('loadDemoDataBtn');
    if (loadDemoDataBtn) {
        loadDemoDataBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!confirm("Mevcut planınızın üzerine yazılmadan, örnek bir demo planı veritabanınıza eklenecektir. Devam etmek istiyor musunuz?")) {
                return;
            }
            await loadDemoData();
        });
    }
});

async function loadDemoData() {
    showMessage("Demo veriler yükleniyor...", "info", 0); // 0 duration for persistent message until success/error
    try {
        const fetchHeaders = { 'Content-Type': 'application/json' };
        if (supabaseClient) {
            const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
            if (sessionError) {
                console.error("[Demo Veri Yükle] Oturum alınırken hata:", sessionError);
                showMessage("Oturum bilgisi alınamadı. Lütfen tekrar giriş yapın.", "error");
                return;
            }
            if (session && session.access_token) {
                fetchHeaders['Authorization'] = `Bearer ${session.access_token}`;
            } else {
                console.warn("[Demo Veri Yükle] Oturum veya erişim token'ı bulunamadı.");
                showMessage("Bu işlem için giriş yapmanız gerekmektedir. Lütfen giriş yapın.", "error");
                return;
            }
        } else {
            console.error("[Demo Veri Yükle] Supabase client bulunamadı.");
            showMessage("Supabase istemcisi yüklenemedi. Lütfen sayfayı yenileyin.", "error");
            return;
        }

        const response = await fetch('/api/load-demo-plan', {
            method: 'POST',
            headers: fetchHeaders
        });

        const result = await response.json();

        if (!response.ok) {
            console.error(`[Demo Veri Yükle] API Hatası ${response.status}:`, result);
            throw new Error(result.error || `Sunucu ${response.status} koduyla yanıt verdi.`);
        }

        showMessage(`"${result.plan_name}" adlı demo plan başarıyla yüklendi. ID: ${result.id}`, 'success');
        await loadSavedPlans(); // Kayıtlı planlar listesini yenile
        if (result.id) {
            await loadSpecificPlan(result.id); // Yüklenen demo planı aktif et
            toggleSidebar(); // Kenar çubuğunu kapat
        }

    } catch (error) {
        console.error("Demo veri yükleme hatası:", error);
        showMessage(`❌ Demo veri yüklenemedi: ${error.message}`, 'error');
    }
}
