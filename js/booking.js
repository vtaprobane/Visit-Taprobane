// Booking flow: segmented service selector, conditional fields, live message
// preview, the WhatsApp deep link, and email submission via Web3Forms.

const WHATSAPP_NUMBER = '94767133441';

// Tied to the destination inbox registered at web3forms.com — no separate
// "to" address is needed here.
const WEB3FORMS_ACCESS_KEY = '20ddb54f-3b9b-4559-b90b-a782df6fab36';

const SERVICE_CONFIG = {
  vehicle: {
    label: 'Vehicle Rental',
    fieldGroupClass: 'field-group-vehicle',
    fields: [
      { name: 'vehicleDuration', label: 'Duration', suffix: ' days' },
      { name: 'vehicleTravellers', label: 'Travellers' },
      { name: 'vehicleType', label: 'Vehicle', weak: true },
      { name: 'pickupLocation', label: 'Pickup Location' },
      { name: 'date', label: 'Date', formatter: formatDate },
    ],
  },
  // Internal key stays "local" (matches field-group-local / data-service="local"
  // in index.html) — only the user-facing label changed to "Inbound Tour".
  local: {
    label: 'Inbound Tour',
    fieldGroupClass: 'field-group-local',
    fields: [
      { name: 'tourDuration', label: 'Duration', suffix: ' days' },
      { name: 'tourTravellers', label: 'Travellers' },
      { name: 'date', label: 'Date', formatter: formatDate },
      { name: 'interests', label: 'Places of Interest' },
    ],
  },
};

const ALL_GROUP_CLASSES = Object.values(SERVICE_CONFIG).map((c) => c.fieldGroupClass);

// Contact details, included in the message for both WhatsApp and email.
const CONTACT_FIELDS = [
  { name: 'name', label: 'Name' },
  { name: 'email', label: 'Email' },
  { name: 'phone', label: 'Phone' },
];

function formatDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function buildPreviewText(service, formData) {
  const config = SERVICE_CONFIG[service];
  const lines = [];
  let hasContent = false;

  config.fields.forEach((field) => {
    const raw = (formData.get(field.name) || '').toString().trim();
    if (!raw) return;
    // "weak" fields (selects with a sensible default, e.g. Vehicle Type)
    // shouldn't by themselves count as the visitor having entered a trip
    // detail — otherwise the message looks "ready" before anything is typed.
    if (!field.weak) hasContent = true;
    const value = field.formatter ? field.formatter(raw) : raw;
    lines.push(`${field.label}: ${value}${field.suffix || ''}`);
  });

  const notes = (formData.get('notes') || '').toString().trim();
  if (notes) {
    hasContent = true;
  }

  if (!hasContent) {
    return { text: 'Fill in your trip details to see your message here.', hasContent: false };
  }

  const output = [`${config.label} Request`, '', ...lines];
  if (notes) {
    output.push('', `Notes: ${notes}`);
  }

  const contactLines = CONTACT_FIELDS.map((field) => {
    const raw = (formData.get(field.name) || '').toString().trim();
    return raw ? `${field.label}: ${raw}` : null;
  }).filter(Boolean);
  if (contactLines.length) {
    output.push('', ...contactLines);
  }

  return { text: output.join('\n'), hasContent: true };
}

function updateFieldVisibility(service) {
  ALL_GROUP_CLASSES.forEach((cls) => {
    document.querySelectorAll(`.${cls}`).forEach((el) => el.classList.add('is-hidden'));
  });
  const activeClass = SERVICE_CONFIG[service].fieldGroupClass;
  document.querySelectorAll(`.${activeClass}`).forEach((el) => el.classList.remove('is-hidden'));
}

document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.service-tab');
  const form = document.getElementById('booking-form');
  const previewText = document.getElementById('preview-text');
  const whatsappBtn = document.getElementById('whatsapp-btn');
  const emailBtn = document.getElementById('email-submit-btn');
  const formStatus = document.getElementById('form-status');

  if (!tabs.length || !form || !previewText) return;

  let currentService = document.querySelector('.service-tab.is-active')?.dataset.service || 'vehicle';

  function updatePreview() {
    const formData = new FormData(form);
    const { text, hasContent } = buildPreviewText(currentService, formData);
    previewText.textContent = text;

    if (whatsappBtn) {
      whatsappBtn.href = hasContent
        ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`
        : '#';
      whatsappBtn.classList.toggle('is-disabled', !hasContent);
      whatsappBtn.setAttribute('aria-disabled', String(!hasContent));
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      currentService = tab.dataset.service;
      updateFieldVisibility(currentService);
      updatePreview();
    });
  });

  function setFormStatus(message, kind) {
    if (!formStatus) return;
    formStatus.textContent = message;
    formStatus.classList.remove('is-success', 'is-error');
    if (kind) formStatus.classList.add(kind);
  }

  form.addEventListener('input', () => {
    updatePreview();
    setFormStatus('', null);
  });

  if (whatsappBtn) {
    whatsappBtn.addEventListener('click', (e) => {
      if (whatsappBtn.classList.contains('is-disabled')) e.preventDefault();
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameValue = document.getElementById('field-name')?.value.trim() || '';
    const emailValue = document.getElementById('field-email')?.value.trim() || '';
    const { text, hasContent } = buildPreviewText(currentService, new FormData(form));

    if (!hasContent) {
      setFormStatus('Please fill in your trip details first.', 'is-error');
      return;
    }
    if (!nameValue || !emailValue) {
      setFormStatus('Please enter your name and email to send via email.', 'is-error');
      return;
    }

    const payload = new FormData();
    payload.append('access_key', WEB3FORMS_ACCESS_KEY);
    payload.append('subject', `New ${SERVICE_CONFIG[currentService].label} quote request — Visit Taprobane`);
    payload.append('from_name', nameValue);
    payload.append('email', emailValue);
    payload.append('message', text);
    payload.append('botcheck', document.querySelector('.honeypot-field')?.checked ? 'true' : '');

    if (emailBtn) {
      emailBtn.disabled = true;
      emailBtn.textContent = 'Sending…';
    }
    setFormStatus('', null);

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: payload,
      });
      const result = await response.json();

      if (result.success) {
        setFormStatus("Sent — we'll be in touch shortly.", 'is-success');
        form.reset();
        updateFieldVisibility(currentService);
        updatePreview();
      } else {
        throw new Error(result.message || 'Submission failed.');
      }
    } catch (err) {
      setFormStatus('Something went wrong sending your request — please try WhatsApp instead, or email us directly.', 'is-error');
    } finally {
      if (emailBtn) {
        emailBtn.disabled = false;
        emailBtn.textContent = 'Send via Email';
      }
    }
  });

  updateFieldVisibility(currentService);
  updatePreview();
});
