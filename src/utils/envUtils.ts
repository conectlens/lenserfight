
export interface EnvMetadata {
  detected_language: string;
  timezone: string;
  country: string;
}

export const getBrowserLanguage = (): string => {
  if (typeof navigator !== 'undefined') {
    return navigator.language || 'en-US';
  }
  return 'en-US';
};

export const getTimezone = (): string => {
  if (typeof Intl !== 'undefined') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  return 'UTC';
};

export const detectCountry = async (): Promise<string> => {
  // Mock function as requested.
  // In production, this would call: await fetch('/api/detect-country')...
  return Promise.resolve('Turkiye'); 
};

export const getEnvMetadata = async (): Promise<EnvMetadata> => {
  const country = await detectCountry();
  return {
    detected_language: getBrowserLanguage(),
    timezone: getTimezone(),
    country: country
  };
};
