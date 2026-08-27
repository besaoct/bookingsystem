import { dbService } from '@/db/sqlite-service';
import {
  parseLicenseInput,
  verifyLicense,
  LicenseVerificationResult,
  LicensePayload,
  LicenseDocument,
} from '@/lib/license-crypto';

const LOCAL_STORAGE_LICENSE_KEY = 'booking_system_software_license';
const LOCAL_STORAGE_MACHINE_ID_KEY = 'booking_system_machine_id';

/**
 * Generates a stable browser-based fallback Machine ID when running in web preview.
 */
function getWebFallbackMachineId(): string {
  if (typeof window === 'undefined') return 'BS-WEB-DEV-0000-0000';
  let savedId = localStorage.getItem(LOCAL_STORAGE_MACHINE_ID_KEY);
  if (!savedId) {
    const raw = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(16, '0').toUpperCase();
    savedId = `BS-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
    localStorage.setItem(LOCAL_STORAGE_MACHINE_ID_KEY, savedId);
  }
  return savedId;
}

export const isLicenseDisabled = import.meta.env.VITE_DISABLE_LICENSE === 'true';

export const licenseService = {
  /**
   * Whether software licensing is disabled in this build (e.g. Mac App Store build).
   */
  isLicenseDisabled(): boolean {
    return isLicenseDisabled;
  },

  /**
   * Retrieves the host PC's unique hardware Machine ID.
   */
  async getMachineId(): Promise<string> {
    if (typeof window !== 'undefined' && window.electronAPI?.getMachineId) {
      try {
        const id = await window.electronAPI.getMachineId();
        if (id && id.trim()) return id.trim().toUpperCase();
      } catch (err) {
        console.warn('Failed to retrieve native machine ID via Electron, falling back:', err);
      }
    }
    return getWebFallbackMachineId();
  },

  /**
   * Retrieves the raw stored license document string from SQLite or localStorage.
   */
  async getStoredLicense(): Promise<string | null> {
    try {
      await dbService.init();
      const rows = await dbService.query<{ license_key: string }>(
        'SELECT license_key FROM software_license ORDER BY id DESC LIMIT 1'
      );
      if (rows && rows.length > 0 && rows[0].license_key) {
        return rows[0].license_key;
      }
    } catch (err) {
      console.warn('Failed to read software_license table from SQLite:', err);
    }

    if (typeof window !== 'undefined') {
      return localStorage.getItem(LOCAL_STORAGE_LICENSE_KEY);
    }
    return null;
  },

  /**
   * Checks and cryptographically validates the currently installed software license.
   */
  async checkLicenseStatus(): Promise<LicenseVerificationResult> {
    // If built for Mac App Store (with upfront pricing / no license verification)
    if (isLicenseDisabled) {
      return {
        status: 'VALID',
        isValid: true,
        message: 'Mac App Store Edition (Purchased via App Store)',
        payload: {
          version: 1,
          product: 'Booking System Desktop Suite',
          licenseType: 'lifetime',
          machineId: '*',
          clientName: 'Mac App Store Licensed',
          licensee: 'App Store Purchase',
          issuedAt: new Date().toISOString(),
          expiresAt: null,
        },
        daysRemaining: null,
      };
    }

    const machineId = await this.getMachineId();
    const rawLicense = await this.getStoredLicense();

    if (!rawLicense || !rawLicense.trim()) {
      return {
        status: 'UNLICENSED',
        isValid: false,
        message: 'No active software license found. Please enter or upload your license key.',
      };
    }

    const doc = parseLicenseInput(rawLicense);
    if (!doc) {
      return {
        status: 'CORRUPTED_DOCUMENT',
        isValid: false,
        message: 'Stored license format is corrupted. Please re-activate with a valid license file.',
      };
    }

    // Get last verified timestamp for anti-clock-tamper detection
    let lastTimestamp: number | undefined = undefined;
    try {
      await dbService.init();
      const rows = await dbService.query<{ last_verified_at: string }>(
        'SELECT last_verified_at FROM software_license ORDER BY id DESC LIMIT 1'
      );
      if (rows && rows.length > 0 && rows[0].last_verified_at) {
        lastTimestamp = new Date(rows[0].last_verified_at).getTime();
      }
    } catch {
      // ignore
    }

    const result = await verifyLicense(doc, machineId, lastTimestamp);

    if (result.isValid) {
      // Update last_verified_at in SQLite
      try {
        const nowIso = new Date().toISOString();
        dbService.run('UPDATE software_license SET last_verified_at = ?', [nowIso]);
      } catch {
        // ignore
      }
    }

    return result;
  },

  /**
   * Activates a new license provided via .lic file content or base64 key string.
   */
  async activateLicense(rawInput: string): Promise<LicenseVerificationResult> {
    if (!rawInput || !rawInput.trim()) {
      return {
        status: 'CORRUPTED_DOCUMENT',
        isValid: false,
        message: 'License key or file cannot be empty.',
      };
    }

    const doc = parseLicenseInput(rawInput);
    if (!doc) {
      return {
        status: 'CORRUPTED_DOCUMENT',
        isValid: false,
        message: 'Invalid license file format. Please load a valid .lic file or paste an activation key.',
      };
    }

    const machineId = await this.getMachineId();
    const result = await verifyLicense(doc, machineId);

    if (!result.isValid) {
      return result;
    }

    // Persist verified license into SQLite and localStorage
    const cleanRaw = JSON.stringify(doc);
    const nowIso = new Date().toISOString();

    try {
      await dbService.init();
      // Clear previous license records
      dbService.run('DELETE FROM software_license');
      // Insert new verified license
      dbService.run(
        `INSERT INTO software_license (
          license_key, machine_id, client_name, licensee, license_type, issued_at, expires_at, signature, last_verified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cleanRaw,
          doc.payload.machineId,
          doc.payload.clientName,
          doc.payload.licensee || '',
          doc.payload.licenseType,
          doc.payload.issuedAt,
          doc.payload.expiresAt || null,
          doc.signature,
          nowIso,
        ]
      );
    } catch (err) {
      console.error('Failed to save software_license in SQLite:', err);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_LICENSE_KEY, cleanRaw);
    }

    return result;
  },

  /**
   * Deactivates / removes the current software license.
   */
  async deactivateLicense(): Promise<void> {
    try {
      await dbService.init();
      dbService.run('DELETE FROM software_license');
    } catch (err) {
      console.warn('Failed to delete software_license table rows:', err);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_LICENSE_KEY);
    }
  },

  /**
   * Native file picker to load a .lic file.
   */
  async openLicenseFileDialog(): Promise<string | null> {
    if (typeof window !== 'undefined' && window.electronAPI?.loadLicenseFile) {
      return window.electronAPI.loadLicenseFile();
    }
    return null;
  },
};
