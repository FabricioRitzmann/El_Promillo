import { requireLogin } from './guards.js';
import {
  businessDisplayName,
  businessInitials,
  businessLogoUrl,
  byId,
  escapeHtml,
  renderBusinessHeader,
  showMessage
} from './ui.js';

const state = {
  client: null,
  session: null,
  profile: null,
  business: null
};

const businessAccountSelect = [
  'id',
  'owner_id',
  'name',
  'description',
  'address',
  'location_lat',
  'location_lng',
  'phone',
  'website',
  'logo_url',
  'company_logo_path',
  'company_logo_updated_at',
  'created_at',
  'updated_at'
].join(',');

const accountMessage = byId('accountMessage');
const loginDataList = byId('loginDataList');
const businessForm = byId('accountBusinessForm');
const companyLogoPreview = byId('companyLogoPreview');
const companyLogoUpload = byId('companyLogoUpload');
const uploadCompanyLogoButton = byId('uploadCompanyLogoButton');
const removeCompanyLogoButton = byId('removeCompanyLogoButton');
const businessLogoBucket = 'business-logos';
const maxLogoFileBytes = 2 * 1024 * 1024;
const allowedLogoMimeTypes = new Map([
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp']
]);

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('de-CH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function detailRow(label, value) {
  return `
    <div>
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value || '-')}</dd>
    </div>
  `;
}

function renderLoginData() {
  if (!loginDataList) {
    return;
  }

  const user = state.session?.user || {};
  const displayName = state.profile?.display_name || user.user_metadata?.display_name || '';

  loginDataList.innerHTML = [
    detailRow('Login-E-Mail', user.email || state.profile?.email),
    detailRow('Anzeigename', displayName),
    detailRow('Account-ID', user.id || state.profile?.id),
    detailRow('Freischaltung', state.profile?.unlock ? 'Freigeschaltet' : 'Wartet auf Freischaltung'),
    detailRow('Account erstellt', formatDate(state.profile?.created_at || user.created_at)),
    detailRow('Letzter Login', formatDate(user.last_sign_in_at)),
    detailRow('Profil aktualisiert', formatDate(state.profile?.updated_at || user.updated_at))
  ].join('');
}

function numberOrNull(value) {
  const text = String(value ?? '').trim();

  if (!text) {
    return null;
  }

  const numberValue = Number(text);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function fillBusinessForm() {
  if (!businessForm) {
    return;
  }

  businessForm.name.value = state.business?.name || '';
  businessForm.description.value = state.business?.description || '';
  businessForm.address.value = state.business?.address || '';
  businessForm.location_lat.value = state.business?.location_lat ?? '';
  businessForm.location_lng.value = state.business?.location_lng ?? '';
  businessForm.phone.value = state.business?.phone || '';
  businessForm.website.value = state.business?.website || '';
  businessForm.logo_url.value = state.business?.logo_url || '';
  businessForm.company_logo_path.value = state.business?.company_logo_path || '';
  renderCompanyLogoPreview();
  renderBusinessHeader(state.business || {});
}

async function loadBusiness() {
  state.business = await state.client.selectRows('businesses', {
    select: businessAccountSelect,
    filters: [
      { column: 'owner_id', op: 'eq', value: state.session.user.id }
    ],
    maybeSingle: true
  });

  fillBusinessForm();
}

function businessPayloadFromForm() {
  const formData = new FormData(businessForm);

  return {
    name: String(formData.get('name') || '').trim(),
    description: String(formData.get('description') || '').trim(),
    address: String(formData.get('address') || '').trim(),
    location_lat: numberOrNull(formData.get('location_lat')),
    location_lng: numberOrNull(formData.get('location_lng')),
    phone: String(formData.get('phone') || '').trim(),
    website: String(formData.get('website') || '').trim(),
    logo_url: String(formData.get('logo_url') || state.business?.logo_url || '').trim(),
    company_logo_path: String(formData.get('company_logo_path') || state.business?.company_logo_path || '').trim() || null
  };
}

function validateBusinessPayload(payload) {
  if (!payload.name) {
    throw new Error('Bitte einen Firmennamen eintragen.');
  }

  if (payload.location_lat != null && (payload.location_lat < -90 || payload.location_lat > 90)) {
    throw new Error('Latitude muss zwischen -90 und 90 liegen.');
  }

  if (payload.location_lng != null && (payload.location_lng < -180 || payload.location_lng > 180)) {
    throw new Error('Longitude muss zwischen -180 und 180 liegen.');
  }
}

async function persistBusiness(extraPayload = {}) {
  const payload = {
    ...businessPayloadFromForm(),
    ...extraPayload
  };

  validateBusinessPayload(payload);

  const rows = state.business?.id
    ? await state.client.updateRows('businesses', payload, [
      { column: 'id', op: 'eq', value: state.business.id },
      { column: 'owner_id', op: 'eq', value: state.session.user.id }
    ], { select: businessAccountSelect })
    : await state.client.insertRows('businesses', {
      ...payload,
      owner_id: state.session.user.id
    }, { select: businessAccountSelect });

  state.business = rows[0];
  fillBusinessForm();
  return state.business;
}

async function saveBusiness(event) {
  event.preventDefault();
  showMessage(accountMessage, 'Kontodaten werden gespeichert ...');

  await persistBusiness();
  showMessage(accountMessage, 'Kontodaten gespeichert.', 'success');
}

function renderCompanyLogoPreview() {
  if (!companyLogoPreview || !businessForm) {
    return;
  }

  const name = businessDisplayName({
    ...state.business,
    name: businessForm.name.value || state.business?.name
  });
  const logoUrl = businessLogoUrl(state.business || {});

  companyLogoPreview.textContent = '';
  companyLogoPreview.classList.toggle('has-image', Boolean(logoUrl));

  if (logoUrl) {
    const image = document.createElement('img');
    image.src = logoUrl;
    image.alt = name;
    image.addEventListener('error', () => {
      companyLogoPreview.classList.remove('has-image');
      companyLogoPreview.textContent = businessInitials(name);
    }, { once: true });
    companyLogoPreview.append(image);
    return;
  }

  companyLogoPreview.textContent = businessInitials(name);
}

function logoExtension(file) {
  const fromName = String(file?.name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  const normalized = fromName === 'jpeg' ? 'jpg' : fromName;

  if (['png', 'jpg', 'webp'].includes(normalized)) {
    return normalized;
  }

  return allowedLogoMimeTypes.get(String(file?.type || '').toLowerCase()) || 'png';
}

function validateLogoFile(file) {
  if (!file) {
    throw new Error('Bitte eine Logo-Datei auswählen.');
  }

  const mimeType = String(file.type || '').toLowerCase();

  if (!allowedLogoMimeTypes.has(mimeType)) {
    throw new Error('Bitte PNG, JPG, JPEG oder WEBP verwenden.');
  }

  if (file.size > maxLogoFileBytes) {
    throw new Error('Logo ist zu gross. Maximal 2 MB erlaubt.');
  }
}

async function uploadCompanyLogo(file) {
  validateLogoFile(file);
  showMessage(accountMessage, 'Firmenlogo wird hochgeladen ...');

  if (uploadCompanyLogoButton) {
    uploadCompanyLogoButton.disabled = true;
    uploadCompanyLogoButton.textContent = 'Wird hochgeladen ...';
  }

  try {
    const business = await persistBusiness();
    const previousPath = business.company_logo_path;
    const objectPath = `${business.id}/${Date.now()}-logo.${logoExtension(file)}`;
    const uploadResult = await state.client.uploadStorageObject(businessLogoBucket, objectPath, file);

    state.business = (await state.client.updateRows('businesses', {
      logo_url: uploadResult.publicUrl,
      company_logo_path: objectPath,
      company_logo_updated_at: new Date().toISOString()
    }, [
      { column: 'id', op: 'eq', value: business.id },
      { column: 'owner_id', op: 'eq', value: state.session.user.id }
    ], { select: businessAccountSelect }))[0];

    if (previousPath && previousPath !== objectPath) {
      state.client.deleteStorageObjects(businessLogoBucket, [previousPath]).catch(() => {});
    }

    fillBusinessForm();
    showMessage(accountMessage, 'Firmenlogo gespeichert.', 'success');
  } finally {
    if (companyLogoUpload) {
      companyLogoUpload.value = '';
    }

    if (uploadCompanyLogoButton) {
      uploadCompanyLogoButton.disabled = false;
      uploadCompanyLogoButton.textContent = 'Logo hochladen';
    }
  }
}

async function removeCompanyLogo() {
  if (!state.business?.id) {
    showMessage(accountMessage, 'Es ist noch kein Business gespeichert.', 'info');
    return;
  }

  showMessage(accountMessage, 'Firmenlogo wird entfernt ...');
  const previousPath = state.business.company_logo_path;

  state.business = (await state.client.updateRows('businesses', {
    logo_url: '',
    company_logo_path: null,
    company_logo_updated_at: new Date().toISOString()
  }, [
    { column: 'id', op: 'eq', value: state.business.id },
    { column: 'owner_id', op: 'eq', value: state.session.user.id }
  ], { select: businessAccountSelect }))[0];

  fillBusinessForm();

  if (previousPath) {
    state.client.deleteStorageObjects(businessLogoBucket, [previousPath]).catch(() => {});
  }

  showMessage(accountMessage, 'Firmenlogo entfernt.', 'success');
}

async function initAccount() {
  const context = await requireLogin({ requireUnlock: true });

  if (!context) {
    return;
  }

  state.client = context.client;
  state.session = context.session;
  state.profile = context.profile;

  renderLoginData();
  await loadBusiness();

  businessForm?.addEventListener('submit', (event) => {
    saveBusiness(event).catch((error) => showMessage(accountMessage, error.message, 'error'));
  });

  businessForm?.addEventListener('input', () => {
    renderCompanyLogoPreview();
    renderBusinessHeader({
      ...state.business,
      name: businessForm.name.value
    });
  });

  uploadCompanyLogoButton?.addEventListener('click', () => {
    companyLogoUpload?.click();
  });

  companyLogoUpload?.addEventListener('change', (event) => {
    uploadCompanyLogo(event.target.files?.[0]).catch((error) => showMessage(accountMessage, error.message, 'error'));
  });

  removeCompanyLogoButton?.addEventListener('click', () => {
    removeCompanyLogo().catch((error) => showMessage(accountMessage, error.message, 'error'));
  });

  byId('logoutButton')?.addEventListener('click', async () => {
    await state.client.signOut();
    window.location.replace('/index.html');
  });
}

initAccount().catch((error) => {
  showMessage(accountMessage, error.message, 'error');
});
