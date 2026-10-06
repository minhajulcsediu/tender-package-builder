/* TenderPack - frontend-only tender document package builder.
 * All document processing happens in the browser.
 */
(() => {
  'use strict';

  const PDFJS_VERSION = '3.11.174';
  if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

  const state = {
    lang: 'en',
    tender: null,
    requirements: [],
    files: [], // { id, file, pages, size, hash, duplicate, error, matchId }
    expiry: {}, // requirement id -> yyyy-mm-dd
    includeIndex: true,
    lastPackageBlob: null,
    lastPackageName: null,
    filter: 'all',
    query: ''
  };

  const $ = (id) => document.getElementById(id);
  const els = {
    welcome: $('welcome'), workspace: $('workspace'), requirementsInput: $('requirementsInput'), requirementsCta: $('requirementsCta'), sampleCta: $('sampleCta'),
    importPackBtn: $('importPackBtn'), packInput: $('packInput'), languageBtn: $('languageBtn'),
    tenderTitle: $('tenderTitle'), tenderMeta: $('tenderMeta'), statTenderId: $('statTenderId'), statTenderTitle: $('statTenderTitle'), statDeadline: $('statDeadline'),
    statReqCount: $('statReqCount'), statRequiredCount: $('statRequiredCount'), readinessText: $('readinessText'), readinessSub: $('readinessSub'), readinessRing: $('readinessRing'), readinessRingValue: $('readinessRingValue'),
    reqSearch: $('reqSearch'), statusFilter: $('statusFilter'), requirementsBody: $('requirementsBody'), dropzone: $('dropzone'), browsePdfBtn: $('browsePdfBtn'), pdfInput: $('pdfInput'),
    uploadCounter: $('uploadCounter'), sizeText: $('sizeText'), sizeMeter: $('sizeMeter'), fileList: $('fileList'), duplicateHint: $('duplicateHint'), autoMatchBtn: $('autoMatchBtn'),
    includeIndex: $('includeIndex'), outputName: $('outputName'), outputPages: $('outputPages'), outputDocs: $('outputDocs'), outputBlocking: $('outputBlocking'), generateBtn: $('generateBtn'), blockingMessage: $('blockingMessage'),
    saveProjectBtn: $('saveProjectBtn'), openProjectBtn: $('openProjectBtn'), importCsvBtn: $('importCsvBtn'), exportCsvBtn: $('exportCsvBtn'), csvInput: $('csvInput'), buildStep: $('buildStep'), toastStack: $('toastStack'),
    previewModal: $('previewModal'), previewTitle: $('previewTitle'), previewCanvas: $('previewCanvas'), previewMeta: $('previewMeta'),
    progressModal: $('progressModal'), progressTitle: $('progressTitle'), progressText: $('progressText'), successModal: $('successModal'), successSummary: $('successSummary'), downloadAgainBtn: $('downloadAgainBtn')
  };

  const I18N = {
    en: {
      browserOnly:'Browser only', import:'Import', welcomeEyebrow:'READY TO ASSEMBLE', welcomeTitle:'Build a submission-ready tender package.', welcomeDesc:'Load tender requirements, add PDFs, resolve every blocking issue, then generate one correctly ordered package - entirely in your browser.', loadRequirements:'Load requirements.json', trySample:'Try sample pack', welcomeNote:'Up to 30 PDFs / 50 MB. Nothing is uploaded to a participant-controlled backend.',
      workspaceEyebrow:'TENDER WORKSPACE', stepRequirements:'Requirements', stepRequirementsSub:'Tender setup', stepDocuments:'Documents', stepDocumentsSub:'Upload & inspect', stepMatch:'Match & validate', stepMatchSub:'Resolve blockers', stepBuild:'Build package', stepBuildSub:'Generate PDF', tenderId:'Tender ID', submissionDeadline:'Submission deadline', deadlineHint:'Expiry is checked against this date.', requirements:'Requirements', requirementsHint:'Required documents', readiness:'Package readiness', checklistKicker:'CHECKLIST', requirementsTitle:'Tender requirements', inputKicker:'INPUT FILES', documentsTitle:'Uploaded documents', dropTitle:'Drop PDF files here', dropSub:'or browse from your computer', browseFiles:'Browse files', storageUsed:'Storage used', autoMatch:'Auto-match names', buildKicker:'FINAL STEP', packageTitle:'Create package', includeIndex:'Include index page', includeIndexSub:'Bonus: document start pages', outputPreview:'Output preview', pages:'Pages', includedDocs:'Included documents', blocking:'Blocking issues', generate:'Generate package', privacyNote:'PDFs are processed locally in the browser.', saveProject:'Save project', openProject:'Open project', importCsv:'Import CSV', downloadCsv:'Download CSV', searchDocuments:'Search documents', filterAll:'All', filterBlocking:'Blocking', filterOk:'OK', filterOptional:'Optional', document:'Document', requirement:'Requirement', matchedFile:'Matched file', expiry:'Expiry', status:'Status', previewKicker:'DOCUMENT PREVIEW', readyKicker:'PACKAGE READY', downloadPackage:'Download package', close:'Close'
    },
    bn: {
      browserOnly:'ব্রাউজারেই প্রসেস হবে', import:'ইমপোর্ট', welcomeEyebrow:'প্যাকেজ প্রস্তুত করুন', welcomeTitle:'সাবমিশনের জন্য টেন্ডার প্যাকেজ তৈরি করুন।', welcomeDesc:'requirements.json লোড করুন, PDF যোগ করুন, সব ব্লকিং সমস্যা ঠিক করুন এবং সঠিক ক্রমে একটিমাত্র PDF প্যাকেজ তৈরি করুন - পুরো প্রক্রিয়াই আপনার ব্রাউজারে।', loadRequirements:'requirements.json লোড করুন', trySample:'স্যাম্পল প্যাক চেষ্টা করুন', welcomeNote:'সর্বোচ্চ ৩০টি PDF / ৫০ MB। কোনো ডকুমেন্ট participant-controlled backend-এ আপলোড হয় না।',
      workspaceEyebrow:'টেন্ডার ওয়ার্কস্পেস', stepRequirements:'রিকোয়ারমেন্ট', stepRequirementsSub:'টেন্ডার সেটআপ', stepDocuments:'ডকুমেন্ট', stepDocumentsSub:'আপলোড ও পরিদর্শন', stepMatch:'ম্যাচ ও যাচাই', stepMatchSub:'ব্লকার ঠিক করুন', stepBuild:'প্যাকেজ তৈরি', stepBuildSub:'PDF জেনারেট', tenderId:'টেন্ডার আইডি', submissionDeadline:'সাবমিশন ডেডলাইন', deadlineHint:'এই তারিখ অনুযায়ী মেয়াদ যাচাই হয়।', requirements:'রিকোয়ারমেন্ট', requirementsHint:'বাধ্যতামূলক ডকুমেন্ট', readiness:'প্যাকেজ প্রস্তুতি', checklistKicker:'চেকলিস্ট', requirementsTitle:'টেন্ডার রিকোয়ারমেন্ট', inputKicker:'ইনপুট ফাইল', documentsTitle:'আপলোড করা ডকুমেন্ট', dropTitle:'এখানে PDF ফেলুন', dropSub:'অথবা কম্পিউটার থেকে বাছাই করুন', browseFiles:'ফাইল বাছাই করুন', storageUsed:'স্টোরেজ ব্যবহার', autoMatch:'ফাইল নাম দিয়ে অটো-ম্যাচ', buildKicker:'শেষ ধাপ', packageTitle:'প্যাকেজ তৈরি', includeIndex:'ইনডেক্স পেজ যুক্ত করুন', includeIndexSub:'বোনাস: ডকুমেন্ট শুরুর পেজ', outputPreview:'আউটপুট প্রিভিউ', pages:'পেজ', includedDocs:'যুক্ত ডকুমেন্ট', blocking:'ব্লকিং সমস্যা', generate:'প্যাকেজ জেনারেট করুন', privacyNote:'PDF ব্রাউজারের ভেতরেই প্রসেস হয়।', saveProject:'প্রজেক্ট সেভ', openProject:'প্রজেক্ট খুলুন', importCsv:'CSV ইমপোর্ট', downloadCsv:'CSV ডাউনলোড', searchDocuments:'ডকুমেন্ট খুঁজুন', filterAll:'সব', filterBlocking:'ব্লকিং', filterOk:'OK', filterOptional:'ঐচ্ছিক', document:'ডকুমেন্ট', requirement:'শর্ত', matchedFile:'ম্যাচ করা ফাইল', expiry:'মেয়াদ', status:'স্ট্যাটাস', previewKicker:'ডকুমেন্ট প্রিভিউ', readyKicker:'প্যাকেজ প্রস্তুত', downloadPackage:'প্যাকেজ ডাউনলোড', close:'বন্ধ করুন'
    }
  };

  function t(key){ return I18N[state.lang][key] ?? I18N.en[key] ?? key; }
  function esc(s){ return String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function formatBytes(bytes){
    if(bytes < 1024) return `${bytes} B`;
    if(bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1024/1024).toFixed(2)} MB`;
  }
  function formatDate(dateStr){
    if(!dateStr) return '-';
    const d = new Date(`${dateStr}T00:00:00`);
    if(Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString(state.lang === 'bn' ? 'bn-BD' : 'en-GB', { day:'2-digit', month:'short', year:'numeric' });
  }
  function normalizeTitle(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]+/g,' '); }
  function tokens(s){ return normalizeTitle(s).split(/\s+/).filter(Boolean); }
  function uid(){ return crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
  function showToast(message, type='ok'){
    const el=document.createElement('div'); el.className=`toast ${type==='error'?'error':type==='warn'?'warn':''}`;
    el.innerHTML=`<span class="toast-dot"></span><span>${esc(message)}</span>`; els.toastStack.appendChild(el);
    setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(-4px)';setTimeout(()=>el.remove(),180)},3300);
  }
  function hideModal(id){ $(id).classList.add('hidden'); }
  function showModal(id){ $(id).classList.remove('hidden'); }

  function localizeStatic(){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const k=el.getAttribute('data-i18n');
      if(I18N[state.lang][k]) el.textContent=I18N[state.lang][k];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
      const k=el.getAttribute('data-i18n-placeholder');
      if(I18N[state.lang][k]) el.placeholder=I18N[state.lang][k];
    });
    document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
    els.languageBtn.textContent = state.lang === 'en' ? 'বাংলা' : 'English';
    renderWorkspaceHeader(); renderRequirements(); renderFileList(); renderSummary();
  }

  async function hashBuffer(buffer){
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function inspectPdf(file){
    if(!window.pdfjsLib) throw new Error('PDF.js could not be loaded.');
    const bytes = new Uint8Array(await file.arrayBuffer());
    try{
      const pdf = await window.pdfjsLib.getDocument({data:bytes}).promise;
      return {pages:pdf.numPages, buffer:bytes.buffer};
    }catch(err){
      throw new Error(/password|encrypted/i.test(err?.message||'') ? 'Password-protected PDF.' : 'Damaged or unreadable PDF.');
    }
  }

  function validateRequirements(obj){
    if(!obj || typeof obj!=='object' || !obj.tender || !Array.isArray(obj.requirements)) throw new Error('Invalid requirements.json format.');
    const tender = obj.tender;
    const requiredTender = ['tender_id','title','procuring_entity','bidder','submission_deadline'];
    for(const k of requiredTender) if(!tender[k]) throw new Error(`Missing tender field: ${k}`);
    const reqs=obj.requirements.map(r=>({
      id:String(r.id), order:Number(r.order), title_en:String(r.title_en||''), title_bn:String(r.title_bn||r.title_en||''), mandatory:Boolean(r.mandatory), has_expiry:Boolean(r.has_expiry)
    }));
    if(reqs.some(r=>!r.id || !Number.isFinite(r.order) || !r.title_en)) throw new Error('One or more requirement entries are invalid.');
    reqs.sort((a,b)=>a.order-b.order);
    return {tender:{tender_id:String(tender.tender_id), title:String(tender.title), procuring_entity:String(tender.procuring_entity), bidder:String(tender.bidder), submission_deadline:String(tender.submission_deadline)}, requirements:reqs};
  }

  function resetWorkspace(){
    state.files=[]; state.expiry={}; state.lastPackageBlob=null; state.lastPackageName=null; state.query=''; state.filter='all';
    els.reqSearch.value=''; els.statusFilter.value='all'; els.includeIndex.checked=true; state.includeIndex=true;
  }

  function loadRequirementsObject(obj){
    const parsed=validateRequirements(obj); state.tender=parsed.tender; state.requirements=parsed.requirements; resetWorkspace();
    els.welcome.classList.add('hidden'); els.workspace.classList.remove('hidden');
    renderAll();
  }

  async function onRequirementsFile(file){
    try{ const text=await file.text(); loadRequirementsObject(JSON.parse(text)); showToast('requirements.json loaded.'); }
    catch(err){ showToast(err.message || 'Could not load requirements.json.', 'error'); }
  }

  async function addFiles(fileList){
    if(!state.tender){ showToast('Load requirements.json first.', 'warn'); return; }
    const list=[...fileList];
    let total=state.files.reduce((s,f)=>s+f.size,0);
    for(const file of list){
      if(state.files.length>=30){ showToast('Limit reached: maximum 30 PDF files.', 'warn'); break; }
      if(file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)){ showToast(`${file.name}: PDF files only.`, 'error'); continue; }
      if(total+file.size > 50*1024*1024){ showToast(`${file.name}: total upload limit is 50 MB.`, 'error'); continue; }
      if(state.files.some(f=>f.name===file.name && f.size===file.size && f.lastModified===file.lastModified)){ continue; }
      try{
        const info=await inspectPdf(file);
        const buffer=await file.arrayBuffer();
        const hash=await hashBuffer(buffer);
        state.files.push({id:uid(),file,pages:info.pages,size:file.size,hash,duplicate:false,error:null,matchId:null});
        total+=file.size;
      }catch(err){
        state.files.push({id:uid(),file,pages:null,size:file.size,hash:null,duplicate:false,error:err.message||'Unreadable PDF.',matchId:null});
        total+=file.size;
      }
    }
    recalcDuplicates(); renderAll();
  }

  function recalcDuplicates(){
    const groups=new Map();
    state.files.forEach(f=>{ if(f.hash){ if(!groups.has(f.hash)) groups.set(f.hash,[]); groups.get(f.hash).push(f); } });
    state.files.forEach(f=>{ f.duplicate=Boolean(f.hash && groups.get(f.hash)?.length>1); });
  }

  function blockingStatus(status){ return ['Missing','Expiry date needed','Expired'].includes(status); }
  function getRequirementStatus(req){
    const f=state.files.find(x=>x.matchId===req.id);
    if(!f) return req.mandatory ? 'Missing' : 'Not provided';
    if(f.error) return req.mandatory ? 'Missing' : 'Not provided';
    if(req.has_expiry){
      const exp=state.expiry[req.id];
      if(!exp) return 'Expiry date needed';
      if(exp < state.tender.submission_deadline) return 'Expired';
    }
    return 'OK';
  }
  function getStatusMeta(status){
    const map={
      'Missing':['status-block',state.lang==='bn'?'অনুপস্থিত':'Missing'],
      'Expiry date needed':['status-block',state.lang==='bn'?'মেয়াদ প্রয়োজন':'Expiry date needed'],
      'Expired':['status-block',state.lang==='bn'?'মেয়াদ শেষ':'Expired'],
      'Not provided':['status-neutral',state.lang==='bn'?'দেওয়া হয়নি':'Not provided'],
      'OK':['status-ok','OK']
    };
    const [cls,label]=map[status]||['status-neutral',status]; return {cls,label};
  }

  function filteredRequirements(){
    const q=normalizeTitle(state.query);
    return state.requirements.filter(req=>{
      const status=getRequirementStatus(req);
      const searchText=normalizeTitle(`${req.title_en} ${req.title_bn} ${req.id}`);
      const matchesQuery=!q||searchText.includes(q);
      const matchesFilter=state.filter==='all' || (state.filter==='blocking'&&blockingStatus(status)) || (state.filter==='ok'&&status==='OK') || (state.filter==='optional'&&!req.mandatory);
      return matchesQuery&&matchesFilter;
    });
  }

  function fileOptions(selectedId, currentReqId){
    const usedByOther = new Map();
    state.files.forEach(f=>{ if(f.matchId && f.matchId!==currentReqId) usedByOther.set(f.id,f.matchId); });
    const options=['<option value="">-</option>'];
    state.files.forEach(f=>{
      const duplicateBlocked = f.duplicate && state.files.some(other=>other.id!==f.id && other.hash===f.hash && other.matchId && other.matchId!==currentReqId);
      const used = usedByOther.has(f.id);
      const disabled = Boolean(f.error || used || duplicateBlocked);
      const selected = selectedId===f.id ? ' selected' : '';
      const label = `${f.name}${f.pages?` • ${f.pages}p`:''}${f.duplicate?' • DUPLICATE':''}${f.error?' • ERROR':''}`;
      options.push(`<option value="${esc(f.id)}"${selected}${disabled?' disabled':''}>${esc(label)}</option>`);
    });
    return options.join('');
  }

  function renderRequirements(){
    if(!state.tender) return;
    const rows=filteredRequirements();
    if(!rows.length){ els.requirementsBody.innerHTML='<tr><td colspan="7" class="req-empty">No matching requirements.</td></tr>'; return; }
    els.requirementsBody.innerHTML=rows.map(req=>{
      const selected=state.files.find(f=>f.matchId===req.id)?.id||'';
      const status=getRequirementStatus(req); const meta=getStatusMeta(status); const currentFile=state.files.find(f=>f.id===selected);
      const expiry=state.expiry[req.id]||'';
      return `<tr>
        <td class="col-order"><span class="mono" style="font-size:10px;color:#9aa2ad">${String(req.order).padStart(2,'0')}</span></td>
        <td><div class="req-title">${esc(state.lang==='bn'?req.title_bn:req.title_en)}</div><div class="req-id">${esc(req.id)}<span class="bar"></span>${req.mandatory?(state.lang==='bn'?'বাধ্যতামূলক':'Required'):(state.lang==='bn'?'ঐচ্ছিক':'Optional')}</div></td>
        <td><select class="req-file-select" data-req-id="${esc(req.id)}">${fileOptions(selected,req.id)}</select></td>
        <td>${req.has_expiry?`<input class="expiry-input" type="date" max="9999-12-31" data-expiry-id="${esc(req.id)}" value="${esc(expiry)}" ${selected?'':'disabled'} />`:'<span class="muted-small">-</span>'}</td>
        <td><span class="status-pill ${meta.cls}" title="${esc(status==='Expired'?'Expiry date is before the submission deadline.': status==='Missing'?'Required document has no matched file.': status==='Expiry date needed'?'Matched expiring document needs a date.':'')}">${esc(meta.label)}</span></td>
        <td>${currentFile?`<button class="row-action" type="button" data-preview-id="${esc(currentFile.id)}" title="Preview"><svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button>`:''}</td>
      </tr>`;
    }).join('');
  }

  function renderFileList(){
    const total=state.files.reduce((s,f)=>s+f.size,0); const dupeCount=state.files.filter(f=>f.duplicate).length;
    els.uploadCounter.textContent=`${state.files.length} / 30`; els.sizeText.textContent=`${formatBytes(total)} / 50 MB`; els.sizeMeter.style.width=`${Math.min(100,(total/(50*1024*1024))*100)}%`;
    els.duplicateHint.textContent=dupeCount ? `${dupeCount} duplicate file${dupeCount===1?'':'s'} detected.` : 'No duplicate files detected.';
    if(!state.files.length){ els.fileList.innerHTML='<div class="req-empty" style="padding:28px 18px">No PDF files uploaded yet.</div>'; return; }
    els.fileList.innerHTML=state.files.map(f=>{
      const match=state.requirements.find(r=>r.id===f.matchId); const error=Boolean(f.error);
      return `<div class="file-item ${f.duplicate?'duplicate':''}">
        <div class="file-icon">PDF</div>
        <div class="file-main"><div class="file-name" title="${esc(f.name)}">${esc(f.name)}</div><div class="file-meta"><span>${f.pages?`${f.pages} page${f.pages===1?'':'s'}`:'Page count unavailable'}</span><span>•</span><span>${formatBytes(f.size)}</span>${f.duplicate?'<span class="duplicate-badge">DUPLICATE</span>':''}${match?`<span>•</span><span>${esc(state.lang==='bn'?match.title_bn:match.title_en)}</span>`:''}${error?`<span class="duplicate-badge">${esc(f.error)}</span>`:''}</div></div>
        <div class="file-actions"><button type="button" data-preview-id="${esc(f.id)}" title="Preview" ${error?'disabled':''}><svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg></button><button type="button" data-remove-id="${esc(f.id)}" title="Remove"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 11v6M14 11v6M8 7l1-3h6l1 3m-9 0 1 14h8l1-14"/></svg></button></div>
      </div>`;
    }).join('');
  }

  function renderWorkspaceHeader(){
    if(!state.tender) return;
    els.tenderTitle.textContent=state.tender.title;
    els.tenderMeta.textContent=`${state.tender.tender_id} · ${state.tender.procuring_entity} · ${state.tender.bidder}`;
    els.statTenderId.textContent=state.tender.tender_id;
    els.statTenderTitle.textContent=state.tender.title;
    els.statDeadline.textContent=formatDate(state.tender.submission_deadline);
    els.statReqCount.textContent=state.requirements.length;
    els.statRequiredCount.textContent=state.requirements.filter(r=>r.mandatory).length;
    els.outputName.textContent=`${state.tender.tender_id}_Package.pdf`;
  }

  function renderSummary(){
    if(!state.tender) return;
    const statuses=state.requirements.map(getRequirementStatus); const blocking=statuses.filter(blockingStatus).length; const ok=statuses.filter(s=>s==='OK').length; const optionalNot=statuses.filter(s=>s==='Not provided').length;
    const progress=state.requirements.length?Math.round((ok/Math.max(1,state.requirements.length-optionalNot))*100):0;
    const included=state.files.filter(f=>f.matchId && !f.error).length; const docPages=state.files.filter(f=>f.matchId && !f.error).reduce((s,f)=>s+f.pages,0);
    const totalPages=1+(state.includeIndex?1:0)+docPages;
    els.readinessText.textContent=`${Math.min(100,progress)}%`; els.readinessRingValue.textContent=`${Math.min(100,progress)}%`; els.readinessRing.style.setProperty('--p',Math.min(100,progress));
    els.readinessSub.textContent=blocking?`${blocking} blocking issue${blocking===1?'':'s'} remaining.`:`${ok} document${ok===1?'':'s'} ready for package.`;
    els.outputPages.textContent=blocking?'-':totalPages; els.outputDocs.textContent=included; els.outputBlocking.textContent=blocking;
    els.generateBtn.disabled=blocking>0;
    els.blockingMessage.innerHTML=blocking?`<b>${state.lang==='bn'?'প্যাকেজ লক করা আছে':'Package locked'}</b><span>${blocking} ${state.lang==='bn'?'টি ব্লকিং সমস্যা ঠিক করুন।':'blocking issue(s) must be resolved first.'}</span>`:`<b>${state.lang==='bn'?'প্যাকেজ প্রস্তুত':'Package ready'}</b><span>${state.lang==='bn'?'সব ডকুমেন্ট যাচাই হয়েছে।':'All requirements pass the blocking checks.'}</span>`;
    if(!blocking){ els.blockingMessage.style.background='var(--success-soft)'; els.blockingMessage.style.color='var(--success)'; } else { els.blockingMessage.style.background='var(--danger-soft)'; els.blockingMessage.style.color='var(--danger)'; }
    els.buildStep.classList.toggle('active',blocking===0);
  }

  function renderAll(){ renderWorkspaceHeader(); renderRequirements(); renderFileList(); renderSummary(); }

  function autoMatch(){
    if(!state.requirements.length){showToast('No requirements loaded.','warn');return;}
    let assigned=0;
    const currentUsed=new Set(state.files.filter(f=>f.matchId).map(f=>f.id));
    for(const req of state.requirements){
      if(state.files.some(f=>f.matchId===req.id)) continue;
      const candidates=state.files.filter(f=>!f.error && !currentUsed.has(f.id));
      let best=null, bestScore=0;
      for(const f of candidates){
        if(f.duplicate && state.files.some(o=>o.id!==f.id && o.hash===f.hash && o.matchId && o.matchId!==req.id)) continue;
        const name=tokens(f.name.replace(/\.pdf$/i,''));
        const title=tokens(req.title_en);
        const aliases={
          'trade license':['trade','license'], 'tin certificate':['tin','taxpayer','certificate'], 'vat registration certificate':['vat','registration','certificate','bin'], 'bank solvency certificate':['bank','solvency'], 'experience certificate':['experience','certificate'], 'audited financial statement':['audited','financial','statement'], "manufacturer's authorization":['manufacturer','authorization'], 'technical proposal':['technical','proposal'], 'financial proposal':['financial','proposal'], 'signed declaration':['signed','declaration','scan']
        };
        const alias=aliases[req.title_en.toLowerCase()]||[];
        const target=new Set([...title,...alias]);
        let score=0; name.forEach(tok=>{if(target.has(tok))score+=2;if(title.includes(tok))score+=1});
        if(normalizeTitle(f.name).includes(normalizeTitle(req.title_en))) score+=4;
        const filenameYears=[...(f.name.match(/20\d{2}/g)||[])].map(Number);
        if(req.has_expiry && filenameYears.length){
          const targetYear=Number(String(state.tender.submission_deadline).slice(0,4));
          filenameYears.forEach(y=>{ if(y>=targetYear) score+=2; if(y<targetYear) score-=1; });
        }
        if(req.title_en==='Signed Declaration' && /scan|0042|declaration/i.test(f.name)) score+=3;
        if(score>bestScore){bestScore=score;best=f;}
      }
      if(best && bestScore>=2){ best.matchId=req.id; currentUsed.add(best.id); assigned++; }
    }
    recalcDuplicates(); renderAll();
    showToast(assigned?`${assigned} file${assigned===1?'':'s'} auto-matched.`:'No confident matches found.');
  }

  function setMatch(reqId,fileId){
    const req=state.requirements.find(r=>r.id===reqId); if(!req) return;
    state.files.forEach(f=>{ if(f.matchId===reqId) f.matchId=null; });
    if(!fileId){ delete state.expiry[reqId]; renderAll(); return; }
    const f=state.files.find(x=>x.id===fileId); if(!f) return;
    if(f.error){ showToast('This PDF could not be read.', 'error'); renderAll(); return; }
    const conflict=state.files.find(x=>x.id!==f.id && x.hash && f.hash && x.hash===f.hash && x.matchId && x.matchId!==reqId);
    if(conflict){ showToast('Duplicate content cannot be matched to different requirements.', 'error'); renderAll(); return; }
    if(f.matchId && f.matchId!==reqId){ showToast('Each file can match only one requirement.', 'warn'); renderAll(); return; }
    f.matchId=reqId;
    if(!req.has_expiry) delete state.expiry[reqId];
    renderAll();
  }

  async function previewFile(fileId){
    const f=state.files.find(x=>x.id===fileId); if(!f || f.error) return;
    try{
      showModal('previewModal'); els.previewTitle.textContent=f.name; els.previewMeta.textContent=`${f.pages} page${f.pages===1?'':'s'} · ${formatBytes(f.size)}${f.duplicate?' · Duplicate content':''}`;
      const data=new Uint8Array(await f.file.arrayBuffer()); const pdf=await pdfjsLib.getDocument({data}).promise; const page=await pdf.getPage(1);
      const viewport=page.getViewport({scale:1.25}); const canvas=els.previewCanvas; const ctx=canvas.getContext('2d'); canvas.width=viewport.width; canvas.height=viewport.height; await page.render({canvasContext:ctx,viewport}).promise;
    }catch(err){ hideModal('previewModal'); showToast('Could not preview this PDF.','error'); }
  }

  function csvEscape(v){
    const s=String(v??'');
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }

  function parseCSV(text){
    const rows=[]; let row=[]; let cell=''; let quoted=false;
    const src=String(text||'').replace(/^\uFEFF/,'');
    for(let i=0;i<src.length;i++){
      const ch=src[i];
      if(quoted){
        if(ch==='"'){
          if(src[i+1]==='"'){ cell+='"'; i++; }
          else quoted=false;
        }else cell+=ch;
      }else if(ch==='"') quoted=true;
      else if(ch===','){ row.push(cell); cell=''; }
      else if(ch==='\n' || ch==='\r'){
        if(ch==='\r' && src[i+1]==='\n') i++;
        row.push(cell); cell='';
        if(row.some(v=>String(v).trim()!=='')) rows.push(row);
        row=[];
      }else cell+=ch;
    }
    if(cell!=='' || row.length){ row.push(cell); if(row.some(v=>String(v).trim()!=='')) rows.push(row); }
    if(rows.length<2) return [];
    const headers=rows[0].map(h=>String(h).trim().toLowerCase());
    return rows.slice(1).map(values=>Object.fromEntries(headers.map((h,i)=>[h,String(values[i]??'').trim()])));
  }

  function findRequirementFromCsv(row){
    const id=row['requirement id']||row['requirement_id']||row['id'];
    if(id){ const exact=state.requirements.find(r=>r.id.toLowerCase()===id.toLowerCase()); if(exact) return exact; }
    const name=row['document']||row['document name']||row['title'];
    if(!name) return null;
    const normalized=normalizeTitle(name);
    return state.requirements.find(r=>normalizeTitle(r.title_en)===normalized || normalizeTitle(r.title_bn)===normalized || normalizeTitle(r.id)===normalized) || null;
  }

  function findFileByCsvName(name){
    if(!name) return null;
    const target=String(name).trim().toLowerCase();
    const matches=state.files.filter(f=>f.name.toLowerCase()===target || f.name.split('\\').pop().toLowerCase()===target);
    return matches.length===1?matches[0]:null;
  }

  function clearRequirementMatch(reqId){
    state.files.forEach(f=>{ if(f.matchId===reqId) f.matchId=null; });
    delete state.expiry[reqId];
  }

  function assignImportedMatch(reqId,file){
    const req=state.requirements.find(r=>r.id===reqId);
    if(!req || !file) return false;
    if(file.error) return false;
    const sameHashElsewhere=state.files.find(o=>o.id!==file.id && o.hash && file.hash && o.hash===file.hash && o.matchId && o.matchId!==reqId);
    if(sameHashElsewhere) return false;
    const otherReq=state.requirements.find(r=>r.id!==reqId && state.files.some(f=>f.id===file.id && f.matchId===r.id));
    if(otherReq) return false;
    file.matchId=reqId;
    return true;
  }

  function exportCSV(){
    if(!state.tender){showToast('Load a tender first.','warn');return;}
    const header=['Tender ID','Requirement ID','Document','File name','Pages','Expiry date','Status'];
    const lines=[header.map(csvEscape).join(',')];
    state.requirements.forEach(req=>{
      const f=state.files.find(x=>x.matchId===req.id);
      lines.push([
        state.tender.tender_id,
        req.id,
        req.title_en,
        f?.name||'',
        f?.pages||'',
        state.expiry[req.id]||'',
        getRequirementStatus(req)
      ].map(csvEscape).join(','));
    });
    const blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
    downloadBlob(blob,`${state.tender.tender_id}_Checklist.csv`);
    showToast('Checklist downloaded as CSV.');
  }

  async function importCSV(file){
    if(!state.tender){showToast('Load a tender first.','warn');return;}
    try{
      const text=await file.text();
      const rows=parseCSV(text);
      if(!rows.length) throw new Error('The CSV is empty or could not be parsed.');
      let applied=0, cleared=0, warnings=0;
      const touched=new Set();

      // First resolve all target requirements and clear their old assignment.
      for(const row of rows){
        const req=findRequirementFromCsv(row);
        if(req) touched.add(req.id);
      }
      touched.forEach(clearRequirementMatch);

      for(const row of rows){
        const req=findRequirementFromCsv(row);
        if(!req){ warnings++; continue; }
        const fileName=row['file name']||row['filename']||row['file'];
        if(!fileName){ cleared++; continue; }
        const f=findFileByCsvName(fileName);
        if(!f || !assignImportedMatch(req.id,f)) { warnings++; continue; }
        const expiry=row['expiry date']||row['expiry_date']||row['expiry'];
        if(expiry && req.has_expiry) state.expiry[req.id]=expiry;
        applied++;
      }
      recalcDuplicates(); renderAll();
      const note=warnings ? ` Imported ${applied}; ${warnings} row${warnings===1?'':'s'} could not be applied.` : `Imported ${applied} checklist row${applied===1?'':'s'}.`;
      showToast(note,warnings?'warn':'ok');
    }catch(err){ showToast(err.message||'Could not import CSV.','error'); }
  }

  async function saveProject(){
    if(!state.tender){showToast('Nothing to save yet.','warn');return;}
    try{
      const zip=new JSZip();
      const checklistRows=state.requirements.map(req=>{
        const f=state.files.find(x=>x.matchId===req.id);
        return [state.tender.tender_id,req.id,req.title_en,f?.name||'',f?.pages||'',state.expiry[req.id]||'',getRequirementStatus(req)];
      });
      const checklistCsv=[['Tender ID','Requirement ID','Document','File name','Pages','Expiry date','Status'],...checklistRows]
        .map(row=>row.map(csvEscape).join(',')).join('\n');
      zip.file('requirements.json',JSON.stringify({tender:state.tender,requirements:state.requirements},null,2));
      zip.file('project.json',JSON.stringify({
        version:2,
        saved_at:new Date().toISOString(),
        language:state.lang,
        expiry:state.expiry,
        includeIndex:state.includeIndex,
        matchesByName:Object.fromEntries(state.files.filter(f=>f.matchId).map(f=>[f.name,f.matchId]))
      },null,2));
      zip.file('checklist.csv','\ufeff'+checklistCsv);
      const folder=zip.folder('documents');
      for(const f of state.files) folder.file(f.file.name,await f.file.arrayBuffer());
      const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
      downloadBlob(blob,`${state.tender.tender_id}_TenderPack_Project.zip`);
      showToast('Project saved with PDFs, checklist, matches and expiry dates.');
    }catch(err){ showToast('Could not save the project.','error'); }
  }

  async function importZip(file){
    try{
      const zip=await JSZip.loadAsync(file); let reqEntry=null;
      zip.forEach((path,entry)=>{ if(!entry.dir && /(^|\/)requirements\.json$/i.test(path)) reqEntry=entry; });
      if(!reqEntry) throw new Error('requirements.json was not found in this ZIP.');
      const reqObj=JSON.parse(await reqEntry.async('text')); const projectEntry=Object.values(zip.files).find(e=>!e.dir && /(^|\/)project\.json$/i.test(e.name));
      const project=projectEntry?JSON.parse(await projectEntry.async('text')):null;
      loadRequirementsObject(reqObj);
      const pdfEntries=[]; zip.forEach((path,entry)=>{ if(!entry.dir && /\.pdf$/i.test(path) && !/requirements\.json$/i.test(path)) pdfEntries.push(entry); });
      await addFiles(await Promise.all(pdfEntries.map(async entry=>{
        const buf=await entry.async('arraybuffer'); return new File([buf],entry.name.split('/').pop(),{type:'application/pdf',lastModified:Date.now()});
      })));
      if(project){
        state.includeIndex=project.includeIndex!==false; els.includeIndex.checked=state.includeIndex;
        if(project.language==='bn' || project.language==='en') state.lang=project.language;
        if(project.matchesByName){
          for(const [name,matchId] of Object.entries(project.matchesByName)){ const f=state.files.find(x=>x.name===name); if(f) f.matchId=matchId; }
        }
        state.expiry=project.expiry||{};
        localizeStatic();
      }
      showToast(project?'Project reopened.':'Pack imported.');
    }catch(err){showToast(err.message||'Could not import ZIP.','error');}
  }

  async function loadSamplePack(){
    try{
      const response=await fetch('sample-pack/sample-pack.zip');
      if(response.ok){ await importZip(new File([await response.arrayBuffer()],'sample-pack.zip',{type:'application/zip'})); return; }
    }catch(_){ /* file:// and offline hosts cannot fetch local assets */ }
    showToast('Sample pack could not be loaded automatically here. Use Import and choose problem-pack.zip.','warn');
  }

  function updatePackageProgress(title,text){ els.progressTitle.textContent=title; els.progressText.textContent=text; }

  async function buildPackage(){
    if(!state.tender) return;
    const statuses=state.requirements.map(getRequirementStatus); const blocking=statuses.filter(blockingStatus).length;
    if(blocking){showToast('Resolve blocking issues before generating.','warn');return;}
    showModal('progressModal'); updatePackageProgress('Preparing your PDF…','Copying documents and calculating the final page count.');
    try{
      const { PDFDocument, StandardFonts, rgb } = PDFLib;
      const includedReqs=state.requirements.filter(r=>{ const f=state.files.find(x=>x.matchId===r.id); return f && !f.error; });
      const totalDocPages=includedReqs.reduce((s,r)=>s+state.files.find(f=>f.matchId===r.id).pages,0);
      const indexOn=state.includeIndex; const totalPages=1+(indexOn?1:0)+totalDocPages;
      const out=await PDFDocument.create(); const font=await out.embedFont(StandardFonts.Helvetica); const bold=await out.embedFont(StandardFonts.HelveticaBold);
      const width=595.28,height=841.89;
      const englishDate=(dateStr)=>{ const d=new Date(`${dateStr}T00:00:00`); return Number.isNaN(d.getTime())?dateStr:d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); };
      const primary=rgb(0.384,0.275,0.918), dark=rgb(0.08,0.11,0.17), muted=rgb(0.40,0.45,0.52), line=rgb(0.90,0.92,0.95), soft=rgb(0.96,0.95,1);
      const drawFooter=(page,n)=>{ page.drawLine({start:{x:44,y:29},end:{x:width-44,y:29},thickness:.6,color:line}); page.drawText(`${state.tender.tender_id} | Page ${n} of ${totalPages}`,{x:44,y:16,size:8,font,color:muted}); };
      const drawWrapped=(page,text,x,y,maxWidth,size,lineGap,fontObj,colorObj)=>{ const words=String(text).split(/\s+/); let lineText=''; let yy=y; for(const w of words){const test=lineText?`${lineText} ${w}`:w; if(fontObj.widthOfTextAtSize(test,size)>maxWidth && lineText){page.drawText(lineText,{x,y:yy,size,font:fontObj,color:colorObj});yy-=lineGap;lineText=w;}else lineText=test;} if(lineText){page.drawText(lineText,{x,y:yy,size,font:fontObj,color:colorObj});yy-=lineGap;} return yy; };

      // Cover page
      let page=out.addPage([width,height]);
      page.drawRectangle({x:0,y:0,width,height,color:dark});
      page.drawCircle({x:width+20,y:height-60,size:170,color:rgb(.15,.11,.34),opacity:.55});
      page.drawCircle({x:width-30,y:60,size:120,color:rgb(.08,.32,.27),opacity:.25});
      page.drawText('TENDER PACKAGE',{x:48,y:height-72,size:11,font:bold,color:rgb(.65,.61,1),characterSpacing:1.5});
      page.drawText(state.tender.tender_id,{x:48,y:height-122,size:28,font:bold,color:rgb(1,1,1)});
      let coverY=height-166;
      coverY=drawWrapped(page,state.tender.title,48,coverY,430,20,26,bold,rgb(1,1,1));
      page.drawText('Submission package', {x:48,y:coverY-8,size:10,font,color:rgb(.72,.76,.84)});
      const infoY=height-295;
      const info=[['Procuring entity',state.tender.procuring_entity],['Bidder',state.tender.bidder],['Submission deadline',englishDate(state.tender.submission_deadline)],['Package made',englishDate(new Date().toISOString().slice(0,10))]];
      info.forEach((it,i)=>{const y=infoY-i*46;page.drawText(it[0].toUpperCase(),{x:48,y,size:7,font:bold,color:rgb(.55,.59,.68),characterSpacing:.8});page.drawText(it[1],{x:48,y:y-15,size:10,font,color:rgb(.93,.95,.98)});});
      page.drawRectangle({x:48,y:160,width:499,height:175,color:rgb(.12,.15,.22),borderWidth:1,borderColor:rgb(.20,.24,.33),borderOpacity:1});
      page.drawText('DOCUMENTS INCLUDED IN ORDER',{x:66,y:310,size:8,font:bold,color:rgb(.67,.63,1),characterSpacing:1});
      includedReqs.forEach((r,i)=>{ const yy=284-i*22; page.drawText(`${String(r.order).padStart(2,'0')}`,{x:66,y:yy,size:8,font:bold,color:rgb(.56,.60,.68)}); page.drawText(r.title_en,{x:100,y:yy,size:9,font,color:rgb(.95,.96,.98)}); });
      drawFooter(page,1);

      let pageNumber=2;
      const pageStarts=[]; let cursor=3;
      includedReqs.forEach(r=>{ const f=state.files.find(x=>x.matchId===r.id); pageStarts.push({r,start:cursor,pages:f.pages}); cursor+=f.pages; });
      if(indexOn){
        page=out.addPage([width,height]);
        page.drawText('PACKAGE INDEX',{x:48,y:height-70,size:10,font:bold,color:primary,characterSpacing:1.4});
        page.drawText('Document start pages',{x:48,y:height-100,size:20,font:bold,color:dark});
        page.drawText('Use the page numbers below to jump directly to each document.',{x:48,y:height-122,size:9,font,color:muted});
        let y=height-165;
        pageStarts.forEach((it,i)=>{ page.drawLine({start:{x:48,y:y-9},end:{x:width-48,y:y-9},thickness:.5,color:line}); page.drawText(`${String(i+1).padStart(2,'0')}`,{x:48,y:y-1,size:8,font:bold,color:muted}); drawWrapped(page,it.r.title_en,86,y,360,10,13,font,dark); page.drawText(String(it.start),{x:width-75,y:y-1,size:11,font:bold,color:primary}); y-=38; });
        drawFooter(page,pageNumber); pageNumber++;
      }

      for(const [idx,r] of includedReqs.entries()){
        const f=state.files.find(x=>x.matchId===r.id); updatePackageProgress(`Adding ${r.title_en}…`,`Copying ${f.pages} page${f.pages===1?'':'s'} from ${f.name}`);
        const src=await PDFDocument.load(await f.file.arrayBuffer(),{ignoreEncryption:false});
        const copied=await out.copyPages(src,src.getPageIndices());
        copied.forEach(p=>{ out.addPage(p); });
      }
      const allPages=out.getPages(); allPages.forEach((p,i)=>drawFooter(p,i+1));
      const pdfBytes=await out.save({useObjectStreams:false}); const blob=new Blob([pdfBytes],{type:'application/pdf'});
      state.lastPackageBlob=blob; state.lastPackageName=`${state.tender.tender_id}_Package.pdf`;
      hideModal('progressModal'); els.successSummary.textContent=`${totalPages} pages · ${includedReqs.length} included documents · ${englishDate(new Date().toISOString().slice(0,10))}`; showModal('successModal');
      downloadBlob(blob,state.lastPackageName);
    }catch(err){ hideModal('progressModal'); console.error(err); showToast(`Package generation failed: ${err.message||'Unexpected PDF error.'}`,'error'); }
  }

  function downloadBlob(blob,name){ const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),5000); }

  // Events
  els.requirementsCta.addEventListener('click',()=>els.requirementsInput.click());
  els.requirementsInput.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)onRequirementsFile(f);e.target.value='';});
  els.browsePdfBtn.addEventListener('click',()=>els.pdfInput.click());
  els.pdfInput.addEventListener('change',e=>{addFiles(e.target.files);e.target.value='';});
  ['dragenter','dragover'].forEach(ev=>els.dropzone.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();els.dropzone.classList.add('drag');}));
  ['dragleave','drop'].forEach(ev=>els.dropzone.addEventListener(ev,e=>{e.preventDefault();e.stopPropagation();els.dropzone.classList.remove('drag');}));
  els.dropzone.addEventListener('drop',e=>addFiles(e.dataTransfer.files));
  els.dropzone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();els.pdfInput.click();}});
  els.reqSearch.addEventListener('input',e=>{state.query=e.target.value;renderRequirements();});
  els.statusFilter.addEventListener('change',e=>{state.filter=e.target.value;renderRequirements();});
  els.includeIndex.addEventListener('change',e=>{state.includeIndex=e.target.checked;renderSummary();});
  els.autoMatchBtn.addEventListener('click',autoMatch);
  els.generateBtn.addEventListener('click',buildPackage);
  els.importCsvBtn.addEventListener('click',()=>els.csvInput.click());
  els.csvInput.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importCSV(f);e.target.value='';});
  els.exportCsvBtn.addEventListener('click',exportCSV);
  els.saveProjectBtn.addEventListener('click',saveProject);
  els.openProjectBtn.addEventListener('click',()=>els.packInput.click());
  els.importPackBtn.addEventListener('click',()=>els.packInput.click());
  els.packInput.addEventListener('change',e=>{const f=e.target.files?.[0];if(f)importZip(f);e.target.value='';});
  els.sampleCta.addEventListener('click',loadSamplePack);
  els.languageBtn.addEventListener('click',()=>{state.lang=state.lang==='en'?'bn':'en';localizeStatic();});
  els.brandBtn.addEventListener('click',()=>{state.tender?window.scrollTo({top:0,behavior:'smooth'}):window.scrollTo({top:0,behavior:'smooth'});});
  els.downloadAgainBtn.addEventListener('click',()=>{if(state.lastPackageBlob&&state.lastPackageName)downloadBlob(state.lastPackageBlob,state.lastPackageName);});
  document.addEventListener('click',e=>{
    const close=e.target.closest('[data-close-modal]'); if(close){ hideModal('previewModal'); hideModal('successModal'); }
    const preview=e.target.closest('[data-preview-id]'); if(preview) previewFile(preview.getAttribute('data-preview-id'));
    const remove=e.target.closest('[data-remove-id]'); if(remove){ const id=remove.getAttribute('data-remove-id'); state.files=state.files.filter(f=>f.id!==id); recalcDuplicates(); renderAll(); }
  });

  // Also handle programmatic select changes.
  els.requirementsBody.addEventListener('change',e=>{
    if(e.target.matches('[data-req-id]')) setMatch(e.target.getAttribute('data-req-id'),e.target.value);
    if(e.target.matches('[data-expiry-id]')) { state.expiry[e.target.getAttribute('data-expiry-id')]=e.target.value; renderAll(); }
  });

  // Prevent accidental browser navigation on file drop outside the dropzone.
  window.addEventListener('dragover',e=>e.preventDefault()); window.addEventListener('drop',e=>{if(!els.dropzone.contains(e.target))e.preventDefault();});

  // Auto-load the workspace only when a supported pack is intentionally chosen.
  localizeStatic();
})();
