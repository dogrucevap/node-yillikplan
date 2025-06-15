require('dotenv').config(); // Ortam değişkenlerini .env dosyasından yükle
const express = require('express');
const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, TextRun, ShadingType, Borders } = require('docx');
const path = require('path');
const fs = require('fs'); 
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js'); 
const { generateAndStoreYear } = require('./holidayCalculator/holidayManager'); 

const app = express();
const PORT = process.env.PORT || 8080;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Hata: SUPABASE_URL ve SUPABASE_ANON_KEY ortam değişkenleri tanımlanmamış.");
  console.log("Lütfen .env dosyanıza bu değişkenleri ekleyin ve Supabase projenizden değerleri alın.");
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

if (supabase) {
  console.log("Supabase istemcisi başarıyla başlatıldı.");
} else if (process.env.NODE_ENV !== 'test') {
  console.warn("Supabase istemcisi başlatılamadı. Lütfen SUPABASE_URL ve SUPABASE_ANON_KEY değerlerini kontrol edin.");
}

app.use(cors());
app.set('trust proxy', 1); 
app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

async function ensureAuthenticatedSB(req, res, next) {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  
  const { data: { user }, error: userError } = await supabase.auth.getUser(); 

  if (userError || !user) {
    // Authorization header'ı da kontrol edebiliriz, ancak Supabase client-side genellikle cookie kullanır.
    // Bu örnekte, öncelikle cookie tabanlı session'a güveniyoruz.
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const { data: { user: tokenUser }, error: tokenErr } = await supabase.auth.getUser(token);
        if (tokenUser) {
            req.user = tokenUser;
            return next();
        }
        if (tokenErr) console.warn("Bearer token ile kullanıcı alınırken hata:", tokenErr.message);
    }
    return res.status(401).json({ error: "Yetkisiz erişim. Oturum bulunamadı veya geçersiz." });
  }
  req.user = user;
  next();
}

app.get('/api/auth/session', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session && session.user) {
      res.json({
        isAuthenticated: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          displayName: session.user.user_metadata?.full_name || session.user.email,
          photo: session.user.user_metadata?.avatar_url,
        }
      });
    } else {
      res.json({ isAuthenticated: false });
    }
  } catch (error) {
    console.error("/api/auth/session hatası:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ensure-holidays-for-year', ensureAuthenticatedSB, async (req, res) => {
  const { academicYearStart } = req.body;
  if (!academicYearStart || isNaN(parseInt(academicYearStart, 10))) {
    return res.status(400).json({ error: "Geçerli bir başlangıç yılı (academicYearStart) gereklidir." });
  }
  const targetYear = parseInt(academicYearStart, 10);
  try {
    const success = await generateAndStoreYear(targetYear, supabase);
    if (success) {
      res.status(200).json({ message: `${targetYear} yılı için tatiller başarıyla kontrol edildi/üretildi.` });
    } else {
      res.status(500).json({ error: `${targetYear} yılı için tatiller üretilirken bir sorun oluştu.` });
    }
  } catch (holidayError) {
    console.error("Tatil üretimi sırasında hata:", holidayError);
    res.status(500).json({ error: `Tatil üretimi sırasında hata: ${holidayError.message}` });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Araç-Gereç Tipleri API Endpointleri
app.get('/api/arac-gerec-tipleri', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  try {
    const { data, error } = await supabase
      .from('plan_standart_arac')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error("Araç-gereç tipleri listelenirken Supabase hatası:", e.message);
    res.status(500).json({ error: "Araç-gereç tipleri listelenirken bir sunucu hatası oluştu.", details: e.message });
  }
});

app.post('/api/arac-gerec-tipleri', ensureAuthenticatedSB, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: "Araç-gereç adı gereklidir ve geçerli bir metin olmalıdır." });
  }
  const trimmedName = name.trim();
  try {
    const { data: existing, error: selectError } = await supabase
      .from('plan_standart_arac')
      .select('id, name')
      .eq('name', trimmedName)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') { 
        console.error("Araç gereç kontrol hatası:", selectError);
        throw selectError;
    }
    if (existing) {
      return res.status(200).json({ message: `"${trimmedName}" zaten mevcut.`, id: existing.id, name: existing.name });
    }

    const { data, error: insertError } = await supabase
      .from('plan_standart_arac')
      .insert({ name: trimmedName, user_id: req.user.id })
      .select('id, name')
      .single();

    if (insertError) throw insertError;
    res.status(201).json({ message: `"${data.name}" başarıyla eklendi.`, id: data.id, name: data.name });
  } catch (e) {
    console.error("Araç-gereç tipi eklenirken Supabase hatası:", e.message);
    if (e.code === '23505') { 
        return res.status(409).json({ error: `"${trimmedName}" zaten mevcut (unique constraint).` });
    }
    res.status(500).json({ error: "Araç-gereç tipi eklenirken bir sunucu hatası oluştu.", details: e.message });
  }
});

app.delete('/api/arac-gerec-tipleri/:name', ensureAuthenticatedSB, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  const nameToDelete = req.params.name;
  if (!nameToDelete) {
    return res.status(400).json({ error: "Silinecek araç-gereç adı gereklidir." });
  }
  try {
    const { error, count } = await supabase
      .from('plan_standart_arac')
      .delete({ count: 'exact' })
      .eq('name', nameToDelete);

    if (error) throw error;
    if (count === 0) {
      return res.status(404).json({ error: `"${nameToDelete}" adında bir araç-gereç bulunamadı.` });
    }
    res.status(200).json({ message: `"${nameToDelete}" başarıyla silindi.` });
  } catch (e) {
    console.error("Araç-gereç tipi silinirken Supabase hatası:", e.message);
    res.status(500).json({ error: "Araç-gereç tipi silinirken bir sunucu hatası oluştu.", details: e.message });
  }
});

// Yöntem-Teknik Tipleri API Endpointleri
app.get('/api/yontem-teknik-tipleri', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  try {
    const { data, error } = await supabase
      .from('plan_standart_yontem')
      .select('id, name')
      .order('name', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error("Yöntem/teknik tipleri listelenirken Supabase hatası:", e.message);
    res.status(500).json({ error: "Yöntem/teknik tipleri listelenirken bir sunucu hatası oluştu.", details: e.message });
  }
});

app.post('/api/yontem-teknik-tipleri', ensureAuthenticatedSB, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  const { name } = req.body;
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: "Yöntem/teknik adı gereklidir ve geçerli bir metin olmalıdır." });
  }
  const trimmedName = name.trim();
  try {
    const { data: existing, error: selectError } = await supabase
      .from('plan_standart_yontem')
      .select('id, name')
      .eq('name', trimmedName)
      .maybeSingle();

    if (selectError && selectError.code !== 'PGRST116') {
        console.error("Yöntem/teknik kontrol hatası:", selectError);
        throw selectError;
    }
    if (existing) {
      return res.status(200).json({ message: `"${trimmedName}" zaten mevcut.`, id: existing.id, name: existing.name });
    }

    const { data, error: insertError } = await supabase
      .from('plan_standart_yontem')
      .insert({ name: trimmedName, user_id: req.user.id })
      .select('id, name')
      .single();

    if (insertError) throw insertError;
    res.status(201).json({ message: `"${data.name}" başarıyla eklendi.`, id: data.id, name: data.name });
  } catch (e) {
    console.error("Yöntem/teknik tipi eklenirken Supabase hatası:", e.message);
    if (e.code === '23505') {
        return res.status(409).json({ error: `"${trimmedName}" zaten mevcut (unique constraint).` });
    }
    res.status(500).json({ error: "Yöntem/teknik tipi eklenirken bir sunucu hatası oluştu.", details: e.message });
  }
});

app.delete('/api/yontem-teknik-tipleri/:name', ensureAuthenticatedSB, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  const nameToDelete = req.params.name;
  if (!nameToDelete) {
    return res.status(400).json({ error: "Silinecek yöntem/teknik adı gereklidir." });
  }
  try {
    const { error, count } = await supabase
      .from('plan_standart_yontem')
      .delete({ count: 'exact' })
      .eq('name', nameToDelete);

    if (error) throw error;
    if (count === 0) {
      return res.status(404).json({ error: `"${nameToDelete}" adında bir yöntem/teknik bulunamadı.` });
    }
    res.status(200).json({ message: `"${nameToDelete}" başarıyla silindi.` });
  } catch (e) {
    console.error("Yöntem/teknik tipi silinirken Supabase hatası:", e.message);
    res.status(500).json({ error: "Yöntem/teknik tipi silinirken bir sunucu hatası oluştu.", details: e.message });
  }
});

// Öğretmenler API Endpointleri
app.get('/api/ogretmenler', async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  try {
    const { data, error } = await supabase
      .from('ogretmenler')
      .select('id, ad_soyad, unvan')
      .order('ad_soyad', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error("Öğretmenler listelenirken Supabase hatası:", e.message);
    res.status(500).json({ error: "Öğretmenler listelenirken bir sunucu hatası oluştu.", details: e.message });
  }
});

app.post('/api/ogretmenler', ensureAuthenticatedSB, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  const { ad_soyad, unvan } = req.body;
  if (!ad_soyad || typeof ad_soyad !== 'string' || ad_soyad.trim() === '' ||
      !unvan || typeof unvan !== 'string' || unvan.trim() === '') {
    return res.status(400).json({ error: "Öğretmen adı soyadı ve unvanı gereklidir." });
  }
  const trimmedAdSoyad = ad_soyad.trim();
  const trimmedUnvan = unvan.trim();
  try {
    const { data, error } = await supabase
      .from('ogretmenler')
      .insert({ ad_soyad: trimmedAdSoyad, unvan: trimmedUnvan, user_id: req.user.id })
      .select('id, ad_soyad, unvan')
      .single();
    if (error) throw error;
    res.status(201).json({ message: `"${data.ad_soyad}" başarıyla eklendi.`, id: data.id, ad_soyad: data.ad_soyad, unvan: data.unvan });
  } catch (e) {
    console.error("Öğretmen eklenirken Supabase hatası:", e.message);
    if (e.code === '23505') { // Unique constraint violation for ad_soyad
        return res.status(409).json({ error: `"${trimmedAdSoyad}" adlı öğretmen zaten mevcut.` });
    }
    res.status(500).json({ error: "Öğretmen eklenirken bir sunucu hatası oluştu.", details: e.message });
  }
});

app.put('/api/ogretmenler/:id', ensureAuthenticatedSB, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  const ogretmenId = req.params.id;
  const { ad_soyad, unvan } = req.body;

  if (!ad_soyad || typeof ad_soyad !== 'string' || ad_soyad.trim() === '' ||
      !unvan || typeof unvan !== 'string' || unvan.trim() === '') {
    return res.status(400).json({ error: "Öğretmen adı soyadı ve unvanı gereklidir." });
  }
  const trimmedAdSoyad = ad_soyad.trim();
  const trimmedUnvan = unvan.trim();
  try {
    const { data, error } = await supabase
      .from('ogretmenler')
      .update({ ad_soyad: trimmedAdSoyad, unvan: trimmedUnvan, updated_at: new Date().toISOString() })
      .eq('id', ogretmenId)
      .select('id, ad_soyad, unvan')
      .single(); 

    if (error) throw error;
    if (!data) { 
        return res.status(404).json({ error: "Güncellenecek öğretmen bulunamadı." });
    }
    res.status(200).json({ message: `"${data.ad_soyad}" başarıyla güncellendi.`, id: data.id, ad_soyad: data.ad_soyad, unvan: data.unvan });
  } catch (e) {
    console.error("Öğretmen güncellenirken Supabase hatası:", e.message);
    if (e.code === '23505') { 
        return res.status(409).json({ error: `"${trimmedAdSoyad}" adlı öğretmen zaten mevcut.` });
    }
     if (e.code === 'PGRST116' || e.message.includes("JSON object requested, multiple (or no) rows returned")) { 
        return res.status(404).json({ error: "Güncellenecek öğretmen bulunamadı veya ID geçersiz." });
    }
    res.status(500).json({ error: "Öğretmen güncellenirken bir sunucu hatası oluştu.", details: e.message });
  }
});

app.delete('/api/ogretmenler/:id', ensureAuthenticatedSB, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  const ogretmenId = req.params.id;
  try {
    const { error, count } = await supabase
      .from('ogretmenler')
      .delete({ count: 'exact' })
      .eq('id', ogretmenId);

    if (error) throw error;
    if (count === 0) {
      return res.status(404).json({ error: "Silinecek öğretmen bulunamadı." });
    }
    res.status(200).json({ message: "Öğretmen başarıyla silindi." });
  } catch (e) {
    console.error("Öğretmen silinirken Supabase hatası:", e.message);
    res.status(500).json({ error: "Öğretmen silinirken bir sunucu hatası oluştu.", details: e.message });
  }
});

// Planlar API Endpointleri
app.get('/api/plans', ensureAuthenticatedSB, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('id, plan_name, ders, sinif, egitim_ogretim_yili, created_at')
      .eq('user_id', req.user.id) 
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error("Planlar listelenirken Supabase hatası:", e.message);
    res.status(500).json({ error: "Planlar listelenirken bir sunucu hatası oluştu.", details: e.message });
  }
});

async function getItemNamesByIdsSupabase(idsJson, tableName, columnName = 'name') {
    if (!supabase) throw new Error("Supabase client not available for getItemNamesByIdsSupabase");
    if (!idsJson) return [];
    let ids = [];
    try {
        ids = JSON.parse(idsJson);
    } catch (e) {
        console.error("Invalid JSON for IDs:", idsJson, e);
        return [];
    }
    if (!Array.isArray(ids) || ids.length === 0) return [];

    const { data, error } = await supabase
        .from(tableName)
        .select(`id, ${columnName}`)
        .in('id', ids);
    if (error) {
        console.error(`Error fetching from ${tableName} by IDs:`, error);
        return [];
    }
    const nameMap = new Map(data.map(item => [item.id, item[columnName]]));
    return ids.map(id => nameMap.get(id)).filter(name => name !== undefined);
}

app.get('/api/plans/:id', ensureAuthenticatedSB, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
    const planId = req.params.id;
    try {
        const { data: planRow, error: planError } = await supabase
            .from('plans')
            .select('*')
            .eq('id', planId)
            .eq('user_id', req.user.id) 
            .single();

        if (planError) {
            if (planError.code === 'PGRST116') return res.status(404).json({ error: "Plan bulunamadı." });
            throw planError;
        }
        if (!planRow) return res.status(404).json({ error: "Plan bulunamadı veya yetkiniz yok." });

        const { data: academicWeeksData, error: weeksError } = await supabase
            .from('academic_weeks')
            .select('*')
            .eq('plan_id', planId)
            .order('original_academic_week', { ascending: true });
        
        if (weeksError) throw weeksError;

        let baseAcademicPlanFromPlanTable = planRow.base_academic_plan_json || [];
        if (typeof baseAcademicPlanFromPlanTable === 'string') {
            try { baseAcademicPlanFromPlanTable = JSON.parse(baseAcademicPlanFromPlanTable); } 
            catch (e) { 
                console.error("base_academic_plan_json parse error:", e);
                baseAcademicPlanFromPlanTable = []; 
            }
        }
        
        const enrichedBaseAcademicPlan = await Promise.all(
            (baseAcademicPlanFromPlanTable || []).map(async week => {
                const weekDataFromDB = (academicWeeksData || []).find(aw => aw.original_academic_week === week.originalAcademicWeek);
                let aracGerecNames = [];
                let yontemTeknikNames = [];

                if (weekDataFromDB) {
                    aracGerecNames = await getItemNamesByIdsSupabase(weekDataFromDB.arac_gerec_ids, 'plan_standart_arac');
                    yontemTeknikNames = await getItemNamesByIdsSupabase(weekDataFromDB.yontem_teknik_ids, 'plan_standart_yontem');
                }
                
                return {
                    ...week,
                    aracGerec: aracGerecNames.length > 0 ? aracGerecNames : (week.aracGerec || []),
                    yontemTeknik: yontemTeknikNames.length > 0 ? yontemTeknikNames : (week.yontemTeknik || [])
                };
            })
        );
        
        const planData = {
            ...planRow,
            plan_data_json: planRow.plan_data_json, 
            base_academic_plan_json: enrichedBaseAcademicPlan, 
            varsayilan_arac_gerec: planRow.varsayilan_arac_gerec, 
            additional_teachers_json: planRow.additional_teachers_json, 
        };
        res.json(planData);

    } catch (e) {
        console.error("Plan yüklenirken Supabase hatası:", e.message, e.details);
        res.status(500).json({ error: "Plan verisi okunurken bir hata oluştu.", details: e.message });
    }
});

async function getItemIdsSupabase(itemNames, tableName) {
    if (!supabase) throw new Error("Supabase client not available for getItemIdsSupabase");
    if (!itemNames || !Array.isArray(itemNames) || itemNames.length === 0) return [];
    
    const { data, error } = await supabase
        .from(tableName)
        .select('id, name')
        .in('name', itemNames);
    if (error) {
        console.error(`Error fetching IDs from ${tableName} by names:`, error);
        return [];
    }
    const idMap = new Map(data.map(item => [item.name, item.id]));
    return itemNames.map(name => idMap.get(name)).filter(id => id !== undefined);
}

app.post('/api/plans', ensureAuthenticatedSB, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
    const { plan_id, plan_name, okul, ogretmen, ders, sinif, egitim_ogretim_yili, ders_saati, varsayilan_arac_gerec, plan_data_json, base_academic_plan_json, additional_teachers } = req.body;

    if (!plan_name) return res.status(400).json({ error: "Plan adı gereklidir." });
    
    let planOnayTarihi = null; 
    if (plan_data_json && Array.isArray(plan_data_json)) {
        const firstAcademicWeek = plan_data_json.find(w => w.type === 'academic' && w.tarih);
        if (firstAcademicWeek && typeof firstAcademicWeek.tarih === 'string') {
            const datePart = firstAcademicWeek.tarih.split(' - ')[0];
            // Bu kısım istemciden gelen tarihin formatına göre ayarlanmalı.
            // Şimdilik YYYY-MM-DD veya null kabul edilecek şekilde bırakıyoruz.
            // Eğer format farklıysa, burada parse edip Supabase'e uygun hale getirmek gerekir.
            // Örneğin: const parsedDate = new Date(datePart); planOnayTarihi = parsedDate.toISOString().split('T')[0];
            // Ancak bu, datePart'ın geçerli bir tarih string'i olmasını gerektirir.
            // Şimdilik, istemcinin doğru formatta göndereceğini varsayıyoruz veya null bırakıyoruz.
            // planOnayTarihi = datePart; // Bu satır sorunlu olabilir, format uyumsuzsa.
        }
    }
    
    const planRecord = {
        user_id: req.user.id,
        plan_name, okul, 
        ogretmen_ad_soyad: ogretmen, 
        ders, sinif, egitim_ogretim_yili, ders_saati,
        varsayilan_arac_gerec: varsayilan_arac_gerec || [], 
        plan_data_json: plan_data_json || null, 
        base_academic_plan_json: base_academic_plan_json || null, 
        additional_teachers_json: additional_teachers || [], 
        plan_onay_tarihi: planOnayTarihi, 
        updated_at: new Date().toISOString()
    };

    try {
        let currentPlanId = plan_id;
        let operationType = '';

        if (currentPlanId) { 
            const { data: updatedPlan, error: updateError } = await supabase
                .from('plans')
                .update(planRecord)
                .eq('id', currentPlanId)
                .eq('user_id', req.user.id) 
                .select('id, plan_name')
                .single();
            if (updateError) throw updateError;
            if (!updatedPlan) return res.status(404).json({ error: "Güncellenecek plan bulunamadı veya yetkiniz yok."});
            operationType = 'güncellendi';
        } else { 
            const { data: newPlan, error: insertError } = await supabase
                .from('plans')
                .insert({...planRecord, user_id: req.user.id, created_at: new Date().toISOString() })
                .select('id, plan_name')
                .single();
            if (insertError) {
                 if (insertError.code === '23505' && insertError.message.includes('plans_user_id_plan_name_key')) {
                    return res.status(409).json({ error: "Bu plan adı zaten mevcut. Lütfen farklı bir ad seçin." });
                }
                throw insertError;
            }
            currentPlanId = newPlan.id;
            operationType = 'kaydedildi';
        }

        if (base_academic_plan_json && Array.isArray(base_academic_plan_json)) {
            const { error: deleteWeeksError } = await supabase
                .from('academic_weeks')
                .delete()
                .eq('plan_id', currentPlanId);
            if (deleteWeeksError) throw deleteWeeksError;

            const weeksToInsert = await Promise.all(base_academic_plan_json.map(async weekData => {
                const aracGerecIds = await getItemIdsSupabase(weekData.aracGerec || [], 'plan_standart_arac');
                const yontemTeknikIds = await getItemIdsSupabase(weekData.yontemTeknik || [], 'plan_standart_yontem');
                return {
                    plan_id: currentPlanId,
                    original_academic_week: weekData.originalAcademicWeek,
                    unite: weekData.unite,
                    konu: weekData.konu,
                    kazanim: weekData.kazanim,
                    ders_saati: weekData.dersSaati,
                    olcme_degerlendirme: weekData.olcmeDeğerlendirme, 
                    aciklama: weekData.aciklama,
                    arac_gerec_ids: aracGerecIds, // JSONB doğrudan dizi kabul eder
                    yontem_teknik_ids: yontemTeknikIds // JSONB doğrudan dizi kabul eder
                };
            }));

            if (weeksToInsert.length > 0) {
                const { error: insertWeeksError } = await supabase
                    .from('academic_weeks')
                    .insert(weeksToInsert);
                if (insertWeeksError) throw insertWeeksError;
            }
        }
        
        res.status(plan_id ? 200 : 201).json({ message: `"${plan_name}" başarıyla ${operationType}.`, id: currentPlanId, plan_name: plan_name });

    } catch (err) {
        console.error(`Plan ${plan_id ? 'güncelleme' : 'kaydetme'} Supabase hatası:`, err.message, err.details, err.code);
        if (err.code === '23505' && err.message.includes('plans_user_id_plan_name_key')) {
             return res.status(409).json({ error: "Bu plan adı zaten mevcut. Lütfen farklı bir ad seçin." });
        }
        res.status(500).json({ error: `Plan ${plan_id ? 'güncellenirken' : 'kaydedilirken'} bir hata oluştu.`, details: err.message });
    }
});

app.delete('/api/plans/:id', ensureAuthenticatedSB, async (req, res) => {
    if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });
    const planId = req.params.id;
    try {
        const { error, count } = await supabase
            .from('plans')
            .delete({ count: 'exact' })
            .eq('id', planId)
            .eq('user_id', req.user.id); 

        if (error) throw error;
        if (count === 0) return res.status(404).json({ error: "Silinecek plan bulunamadı veya yetkiniz yok." });
        
        res.status(200).json({ message: "Plan başarıyla silindi." });
    } catch (e) {
        console.error("Plan silinirken Supabase hatası:", e.message);
        res.status(500).json({ error: "Plan silinirken bir hata oluştu.", details: e.message });
    }
});

app.post('/api/load-demo-plan', ensureAuthenticatedSB, async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Supabase istemcisi başlatılamadı." });

  const userId = req.user.id;

  try {
    const demoDataPath = path.join(__dirname, 'demo-data.json');
    const demoDataFile = fs.readFileSync(demoDataPath, 'utf-8');
    const demoPlanData = JSON.parse(demoDataFile);

    // 1. Ensure Demo Teacher exists for the user
    const demoTeacherName = demoPlanData.ogretmen;
    let { data: teacher, error: teacherError } = await supabase
      .from('ogretmenler')
      .select('id, ad_soyad')
      .eq('ad_soyad', demoTeacherName)
      .eq('user_id', userId)
      .single();

    if (teacherError && teacherError.code !== 'PGRST116') { // PGRST116: no rows found
      console.error("Demo öğretmen arama hatası:", teacherError);
      throw teacherError;
    }
    if (!teacher) {
      const { data: newTeacher, error: newTeacherError } = await supabase
        .from('ogretmenler')
        .insert({ ad_soyad: demoTeacherName, unvan: 'Öğretmen (Demo)', user_id: userId })
        .select('id, ad_soyad')
        .single();
      if (newTeacherError) {
        console.error("Demo öğretmen oluşturma hatası:", newTeacherError);
        throw newTeacherError;
      }
      teacher = newTeacher;
      console.log(`Demo öğretmen "${teacher.ad_soyad}" kullanıcı ${userId} için oluşturuldu.`);
    }

    // 2. Ensure Demo Standard Araç-Gereç exist for the user
    const allDemoAracGerecNames = new Set([
        ...(demoPlanData.varsayilanAracGerec || []),
        ...demoPlanData.haftalikPlan.flatMap(w => w.aracGerec || [])
    ]);

    for (const name of allDemoAracGerecNames) {
        if (!name) continue;
        let { data: ag, error: agError } = await supabase
            .from('plan_standart_arac')
            .select('id')
            .eq('name', name)
            .eq('user_id', userId)
            .single();
        if (agError && agError.code !== 'PGRST116') throw agError;
        if (!ag) {
            const { error: insertAgError } = await supabase
                .from('plan_standart_arac')
                .insert({ name: name, user_id: userId });
            if (insertAgError) throw insertAgError;
            console.log(`Demo araç-gereç "${name}" kullanıcı ${userId} için oluşturuldu.`);
        }
    }
    
    // 3. Ensure Demo Standard Yöntem-Teknik exist for the user
    const allDemoYontemTeknikNames = new Set(demoPlanData.haftalikPlan.flatMap(w => w.yontemTeknik || []));
    for (const name of allDemoYontemTeknikNames) {
        if (!name) continue;
        let { data: yt, error: ytError } = await supabase
            .from('plan_standart_yontem')
            .select('id')
            .eq('name', name)
            .eq('user_id', userId)
            .single();
        if (ytError && ytError.code !== 'PGRST116') throw ytError;
        if (!yt) {
            const { error: insertYtError } = await supabase
                .from('plan_standart_yontem')
                .insert({ name: name, user_id: userId });
            if (insertYtError) throw insertYtError;
            console.log(`Demo yöntem/teknik "${name}" kullanıcı ${userId} için oluşturuldu.`);
        }
    }

    // 4. Create the Plan
    const planName = `Demo Plan - ${new Date().toLocaleString('tr-TR')}`;
    const planRecord = {
      user_id: userId,
      plan_name: planName,
      okul: demoPlanData.okul,
      ogretmen_ad_soyad: demoTeacherName, // Use the ensured teacher's name
      ders: demoPlanData.ders,
      sinif: demoPlanData.sinif,
      egitim_ogretim_yili: demoPlanData.egitimOgretimYili,
      ders_saati: demoPlanData.dersSaati,
      varsayilan_arac_gerec: demoPlanData.varsayilanAracGerec || [],
      additional_teachers_json: [],
      plan_onay_tarihi: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const baseAcademicPlanForDemo = demoPlanData.haftalikPlan.map((week, index) => ({
        originalAcademicWeek: week.hafta || (index + 1),
        unite: week.unite,
        konu: week.konu,
        kazanim: week.kazanim,
        dersSaati: week.dersSaati || demoPlanData.dersSaati,
        aracGerec: week.aracGerec || [],
        yontemTeknik: week.yontemTeknik || [],
        olcmeDeğerlendirme: week.olcmeDeğerlendirme,
        aciklama: week.aciklama
    }));
    
    planRecord.base_academic_plan_json = baseAcademicPlanForDemo;
    planRecord.plan_data_json = baseAcademicPlanForDemo.map(week => ({...week, type: 'academic'}));

    const { data: newPlan, error: insertPlanError } = await supabase
      .from('plans')
      .insert(planRecord)
      .select('id, plan_name')
      .single();

    if (insertPlanError) {
      console.error("Demo plan kaydetme hatası (plans tablosu):", insertPlanError);
      throw insertPlanError;
    }

    const currentPlanId = newPlan.id;

    // 5. Create Academic Weeks
    if (demoPlanData.haftalikPlan && Array.isArray(demoPlanData.haftalikPlan)) {
      const weeksToInsert = await Promise.all(demoPlanData.haftalikPlan.map(async (weekData, index) => {
        // Now that standard items are ensured, getItemIdsSupabase should find them for the user
        const aracGerecIds = await getItemIdsSupabase(weekData.aracGerec || [], 'plan_standart_arac');
        const yontemTeknikIds = await getItemIdsSupabase(weekData.yontemTeknik || [], 'plan_standart_yontem');
        
        return {
          plan_id: currentPlanId,
          original_academic_week: weekData.hafta || (index + 1),
          unite: weekData.unite,
          konu: weekData.konu,
          kazanim: weekData.kazanim,
          ders_saati: weekData.dersSaati || demoPlanData.dersSaati,
          olcme_degerlendirme: weekData.olcmeDeğerlendirme,
          aciklama: weekData.aciklama,
          arac_gerec_ids: aracGerecIds,
          yontem_teknik_ids: yontemTeknikIds
        };
      }));

      if (weeksToInsert.length > 0) {
        const { error: insertWeeksError } = await supabase
          .from('academic_weeks')
          .insert(weeksToInsert);
        if (insertWeeksError) {
          console.error("Demo plan akademik hafta kaydetme hatası:", insertWeeksError);
          throw insertWeeksError; // This might require a transaction to rollback plan insert
        }
      }
    }

    res.status(201).json({ message: `"${newPlan.plan_name}" adlı demo plan başarıyla yüklendi.`, id: newPlan.id, plan_name: newPlan.plan_name });

  } catch (err) {
    console.error("Demo plan yükleme API hatası:", err.message, err.details, err.code);
    res.status(500).json({ error: "Demo plan yüklenirken bir sunucu hatası oluştu.", details: err.message });
  }
});

// app.get('/demo-data', async (req, res) => { /* ... */ }); 

app.post('/generate-plan', ensureAuthenticatedSB, async (req, res) => {
  try {
    const { okul, ogretmen, ders, sinif, egitimOgretimYili, dersSaati, haftalikPlan, additionalTeachers } = req.body;

    if (!okul || !ogretmen || !ders || !sinif || !egitimOgretimYili || !dersSaati || !haftalikPlan) {
        return res.status(400).json({ message: "Eksik plan verisi."});
    }

    const tableHeader = new TableRow({
        children: [
            new TableCell({ children: [new Paragraph({ text: "Hafta", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Tarih", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Saat", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Ünite Adı / Açıklama", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Konu", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Kazanımlar", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Araç-Gereçler", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
            new TableCell({ children: [new Paragraph({ text: "Yöntem ve Teknikler", alignment: AlignmentType.CENTER })], verticalAlign: "center" }),
        ],
        tableHeader: true,
    });
    const tableRows = [tableHeader];

    haftalikPlan.forEach(haftaData => {
        if (haftaData.type === 'holiday') {
            const labelText = haftaData.tarih ? `${haftaData.label} (${haftaData.tarih})` : haftaData.label;
            tableRows.push(new TableRow({
                children: [
                    new TableCell({
                        children: [new Paragraph({ text: labelText, alignment: AlignmentType.CENTER, style: "strong" })],
                        columnSpan: 8, 
                        shading: { type: ShadingType.SOLID, color: "D3D3D3", fill: "D3D3D3" },
                        verticalAlign: "center"
                    }),
                ],
            }));
        } else {
            const aracGerecText = Array.isArray(haftaData.aracGerec) ? haftaData.aracGerec.join(', ') : (haftaData.aracGerec || '');
            const yontemTeknikText = Array.isArray(haftaData.yontemTeknik) ? haftaData.yontemTeknik.join(', ') : (haftaData.yontemTeknik || '');

            tableRows.push(new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: String(haftaData.originalAcademicWeek || ''), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: haftaData.tarih || '', alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: String(haftaData.dersSaati || ''), alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph(haftaData.unite || '')] }),
                    new TableCell({ children: [new Paragraph(haftaData.konu || '')] }),
                    new TableCell({ children: [new Paragraph(haftaData.kazanim || '')] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun(aracGerecText)] })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun(yontemTeknikText)] })] }),
                ],
            }));
        }
    });

    let planOnayTarihiDoc = '';
    if (haftalikPlan && Array.isArray(haftalikPlan)) {
        const firstAcademicWeek = haftalikPlan.find(w => w.type === 'academic' && w.tarih);
        if (firstAcademicWeek && typeof firstAcademicWeek.tarih === 'string') {
            planOnayTarihiDoc = firstAcademicWeek.tarih.split(' - ')[0]; 
        }
    }

    const allSignatories = [];
    if (ogretmen) {
        allSignatories.push({ name: ogretmen, branch: "Öğretmen", isPrincipal: false });
    }

    let principalInfo = null;
    const otherTeachers = [];

    if (additionalTeachers && Array.isArray(additionalTeachers)) {
        additionalTeachers.forEach(ekOgretmen => {
            const name = ekOgretmen.name || ekOgretmen.adSoyad; 
            const branch = ekOgretmen.branch || ekOgretmen.unvan;
            if (name && branch) {
                if (branch.toLowerCase().includes("müdür")) { 
                    principalInfo = { name, branch: "Okul Müdürü", isPrincipal: true };
                } else {
                    otherTeachers.push({ name, branch, isPrincipal: false });
                }
            }
        });
    }
    
    const finalSignatoryList = [...allSignatories, ...otherTeachers];
    
    const signatureCells = finalSignatoryList.map(signatory => {
        return new TableCell({
            children: [
                new Paragraph({ children: [new TextRun({ text: signatory.name, bold: false, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: signatory.branch, bold: true, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: "\n\nİmza", size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
            ],
            verticalAlign: "center"
        });
    });

    if (principalInfo) {
        signatureCells.push(new TableCell({
            children: [
                new Paragraph({ children: [new TextRun({ text: principalInfo.name, bold: false, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: principalInfo.branch, bold: true, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: "Onay:", size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER, spacing: { before: 100 } }),
                new Paragraph({ children: [new TextRun({ text: `Tarih: ${planOnayTarihiDoc}`, size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
                new Paragraph({ children: [new TextRun({ text: "\n\nİmza", size: 20, font: "Times New Roman" })], alignment: AlignmentType.CENTER }),
            ],
            verticalAlign: "center"
        }));
    }
    
    const signatureTableRows = signatureCells.length > 0 ? [new TableRow({ children: signatureCells })] : [];

    const doc = new Document({
        creator: "Yillik Plan Oluşturucu",
        description: "Otomatik oluşturulmuş yıllık plan",
        styles: {
            paragraphStyles: [
                { id: "Normal", name: "Normal", run: { size: 20, font: "Times New Roman" }, paragraph: { spacing: { before: 0, after: 100 } } },
                { id: "strong", name: "Strong", basedOn: "Normal", run: { bold: true, font: "Times New Roman" } }, 
                { id: "tableHeader", name: "Table Header", basedOn: "Normal", run: { bold: true, size: 20, font: "Times New Roman" }, paragraph: { alignment: AlignmentType.CENTER } } 
            ]
        },
        sections: [{
            properties: {
                 page: { margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } },
            },
            children: [
                new Paragraph({ 
                    children: [ new TextRun({ text: `T.C. MİLLİ EĞİTİM BAKANLIĞI ${okul.toUpperCase()} ${egitimOgretimYili} EĞİTİM ÖĞRETİM YILI ${ders.toUpperCase()} ${sinif.toUpperCase()} DERSİ ÜNİTELENDİRİLMİŞ YILLIK PLANI`, bold: true, size: 24, font: "Times New Roman" })], 
                    alignment: AlignmentType.CENTER, 
                    spacing: { after: 400 } 
                }),
                new Paragraph({ text: "", spacing: { after: 200 } }),
                new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: tableRows }),
                new Paragraph({ text: "", spacing: { after: 800 } }),
                new Table({
                    rows: signatureTableRows,
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: { style: "none" }, bottom: { style: "none" }, left: { style: "none" }, right: { style: "none" }, insideHorizontal: { style: "none" }, insideVertical: { style: "none" } },
                }),
            ],
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    const safeDers = ders.replace(/[^a-zA-Z0-9]/g, '_');
    const safeSinif = sinif.replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `yillik_plan_${safeDers}_${safeSinif}_${Date.now()}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
    res.send(buffer);

  } catch (error) {
    console.error('Hata:', error);
    res.status(500).json({ message: 'Belge oluşturulurken bir sunucu hatası oluştu.', error: error.message });
  }
});

const isProduction = process.env.NODE_ENV === 'production';
const baseUrl = isProduction ? (process.env.BASE_URL || `http://localhost:${PORT}`) : `http://localhost:${PORT}`; 
console.log(`Environment: ${isProduction ? 'Production/Cloud Run' : 'Local'}`);


app.listen(PORT, '0.0.0.0', () => { 
  console.log(`Server running on port ${PORT}`);
  console.log(`Base URL: ${baseUrl}`);
});

module.exports = app;
