const STORAGE_KEYS = {
  LICENSE_KEY: 'nativelingo_license_key',
  LICENSE_PLAN: 'nativelingo_license_plan', // 'trial' | 'pro' | 'perpetual' | 'free'
  TRIAL_START: 'nativelingo_trial_start',
  ACTIVATED_AT: 'nativelingo_activated_at'
};

const TRIAL_DURATION_DAYS = 14;

export const licenseService = {
  /**
   * Initializes or fetches the current license state.
   */
  getLicenseState: () => {
    let licenseKey = localStorage.getItem(STORAGE_KEYS.LICENSE_KEY) || '';
    let plan = localStorage.getItem(STORAGE_KEYS.LICENSE_PLAN);
    let trialStart = localStorage.getItem(STORAGE_KEYS.TRIAL_START);

    // First run: Initialize 14-day Pro trial (Reverse Trial)
    if (!trialStart && !licenseKey) {
      trialStart = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.TRIAL_START, trialStart);
      localStorage.setItem(STORAGE_KEYS.LICENSE_PLAN, 'trial');
      plan = 'trial';
    }

    const now = Date.now();
    const startDate = trialStart ? new Date(trialStart).getTime() : now;
    const elapsedMs = now - startDate;
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);
    const trialDaysRemaining = Math.max(0, Math.ceil(TRIAL_DURATION_DAYS - elapsedDays));

    const isTrialActive = plan === 'trial' && trialDaysRemaining > 0;
    const isLicensed = Boolean(licenseKey && licenseKey.trim().length >= 8);
    const isPro = isLicensed || isTrialActive;

    const currentPlan = isLicensed ? (plan || 'pro') : (isTrialActive ? 'trial' : 'free');

    return {
      isPro,
      plan: currentPlan,
      licenseKey,
      isTrialActive,
      trialDaysRemaining,
      trialDurationDays: TRIAL_DURATION_DAYS
    };
  },

  /**
   * Validates and activates a license key.
   * Supports offline format verification and Lemon Squeezy / Gumroad license patterns.
   */
  activateLicense: async (key) => {
    const trimmed = (key || '').trim().toUpperCase();
    if (!trimmed) {
      return { success: false, error: 'Please enter a license key.' };
    }

    // Accepts keys like NL-PRO-XXXX-XXXX-XXXX, NL-PERP-XXXX-XXXX, or standard UUID keys
    const isValidFormat = /^[A-Z0-9]{4,}(-[A-Z0-9]{4,}){2,}$/i.test(trimmed) || trimmed.length >= 16;

    if (!isValidFormat) {
      return { success: false, error: 'Invalid license key format. Keys follow the format: NL-PRO-XXXX-XXXX' };
    }

    const isPerpetual = trimmed.includes('PERP') || trimmed.includes('LIFETIME');
    const planType = isPerpetual ? 'perpetual' : 'pro';

    localStorage.setItem(STORAGE_KEYS.LICENSE_KEY, trimmed);
    localStorage.setItem(STORAGE_KEYS.LICENSE_PLAN, planType);
    localStorage.setItem(STORAGE_KEYS.ACTIVATED_AT, new Date().toISOString());

    return { 
      success: true, 
      plan: planType, 
      message: isPerpetual ? 'NativeLingo Perpetual License activated!' : 'NativeLingo Pro License activated!' 
    };
  },

  /**
   * Clears the current license key and returns to Free or Trial.
   */
  deactivateLicense: () => {
    localStorage.removeItem(STORAGE_KEYS.LICENSE_KEY);
    localStorage.removeItem(STORAGE_KEYS.LICENSE_PLAN);
    localStorage.removeItem(STORAGE_KEYS.ACTIVATED_AT);
  },

  /**
   * Feature gate: Can the user use direct in-place auto paste-back?
   * In Free mode, text is displayed in the HUD preview for manual copying.
   */
  canUseAutoPaste: () => {
    return licenseService.getLicenseState().isPro;
  },

  /**
   * Feature gate: Can the user use all 3 in-place slots?
   * In Free mode, Slot 1 is available. Slots 2 and 3 require Pro or active trial.
   */
  canUseSlot: (slotId) => {
    if (slotId === 1) return true;
    return licenseService.getLicenseState().isPro;
  },

  /**
   * Feature gate: Can the user use advanced jargon & tone explanation?
   */
  canUseJargonExplainer: () => {
    return licenseService.getLicenseState().isPro;
  }
};
