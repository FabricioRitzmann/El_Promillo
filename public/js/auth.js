import { createSupabaseRestClient } from './supabaseClient.js';
import { redirectAfterLogin } from './guards.js';
import { validateOperatorEmail } from './emailValidation.js';
import { pageUrl } from './path.js';
import { byId, showMessage } from './ui.js';

const loginForm = byId('loginForm');
const registerForm = byId('registerForm');
const oneTimeLoginForm = byId('oneTimeLoginForm');
const authMessage = byId('authMessage');

function submitFormOnEnter(form) {
  form?.addEventListener('keydown', (event) => {
    if (
      event.key !== 'Enter'
      || event.defaultPrevented
      || event.isComposing
      || event.altKey
      || event.ctrlKey
      || event.metaKey
      || event.shiftKey
    ) {
      return;
    }

    const target = event.target;

    if (!target || String(target.tagName || '').toUpperCase() !== 'INPUT') {
      return;
    }

    event.preventDefault();

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
      return;
    }

    form.querySelector('button[type="submit"]')?.click();
  });
}

function setOneTimeLoginPanelVisible(visible) {
  if (oneTimeLoginForm) {
    oneTimeLoginForm.hidden = !visible;
  }

  if (registerForm) {
    registerForm.hidden = visible;
  }
}

async function initAuthPage() {
  const client = await createSupabaseRestClient();
  const existingSession = await client.ensureSession();

  if (existingSession) {
    await redirectAfterLogin(client, existingSession);
    return;
  }

  submitFormOnEnter(loginForm);
  submitFormOnEnter(registerForm);
  submitFormOnEnter(oneTimeLoginForm);

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(authMessage, 'Login wird geprüft ...');

    const formData = new FormData(loginForm);

    try {
      const emailCheck = validateOperatorEmail(formData.get('email'));

      if (!emailCheck.ok) {
        throw new Error(emailCheck.message);
      }

      const session = await client.signIn({
        email: emailCheck.email,
        password: formData.get('password')
      });

      await redirectAfterLogin(client, session);
    } catch (error) {
      const message = /email not confirmed/i.test(error.message)
        ? 'Dein Account ist noch nicht vollständig freigeschaltet. Bitte versuche es später erneut oder kontaktiere den Support.'
        : error.message;

      showMessage(authMessage, message, 'error');
    }
  });

  byId('showOneTimeLoginButton')?.addEventListener('click', () => {
    setOneTimeLoginPanelVisible(true);
    showMessage(authMessage, 'Trage deine E-Mail-Adresse ein, dann senden wir dir einen einmaligen Login-Link.', 'info');
    oneTimeLoginForm?.querySelector('input[name="email"]')?.focus();
  });

  byId('cancelOneTimeLoginButton')?.addEventListener('click', () => {
    setOneTimeLoginPanelVisible(false);
    showMessage(authMessage, '');
  });

  oneTimeLoginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(authMessage, 'Einmaliger Login-Link wird angefordert ...');

    const formData = new FormData(oneTimeLoginForm);

    try {
      const emailCheck = validateOperatorEmail(formData.get('email'));

      if (!emailCheck.ok) {
        throw new Error(emailCheck.message);
      }

      await client.requestOperatorMagicLink(emailCheck.email, pageUrl('account.html?magic_login=1'));
      oneTimeLoginForm.reset();
      showMessage(authMessage, 'Der einmalige Login-Link wurde an deine hinterlegte E-Mail-Adresse versendet.', 'success');
    } catch (error) {
      showMessage(authMessage, error.message, 'error');
      oneTimeLoginForm?.querySelector('input[name="email"]')?.focus();
    }
  });

  registerForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(authMessage, 'Account wird erstellt ...');

    const formData = new FormData(registerForm);

    try {
      const emailCheck = validateOperatorEmail(formData.get('email'));

      if (!emailCheck.ok) {
        throw new Error(emailCheck.message);
      }

      await client.registerOperator({
        email: emailCheck.email,
        password: formData.get('password'),
        displayName: formData.get('display_name')
      });

      showMessage(authMessage, 'Account erstellt. Sobald dein Account manuell freigeschaltet wurde, kannst du dich einloggen.', 'success');
      registerForm.reset();
    } catch (error) {
      showMessage(authMessage, error.message, 'error');
    }
  });
}

initAuthPage().catch((error) => {
  showMessage(authMessage, error.message, 'error');
});
