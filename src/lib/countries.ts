import worldCountries from 'world-countries';

const DISTRICTS: Record<string, string[]> = {
  LK: ['Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya'],
  US: ['Alabama', 'California', 'Florida', 'Illinois', 'New York', 'Texas', 'Washington'],
  GB: ['England', 'Northern Ireland', 'Scotland', 'Wales'],
  AU: ['Australian Capital Territory', 'New South Wales', 'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia'],
};

const SUBDIVISION_LABELS: Record<string, string> = {
  LK: 'District',
  US: 'State',
  GB: 'Country / region',
  AU: 'State / territory',
  CA: 'Province / territory',
  IN: 'State / union territory',
};

const ORGAN_DONATION_URLS: Record<string, string> = {
  LK: 'https://reg.odtfsrilanka.com/register',
  US: 'https://www.organdonor.gov/sign-up',
  GB: 'https://www.organdonation.nhs.uk/register-your-decision/',
  AU: 'https://www.servicesaustralia.gov.au/how-to-register-australian-organ-donor?context=22331',
};

export interface CountryOption {
  code: string;
  name: string;
  flag: string;
  callingCode: string;
  districts: string[];
  organDonationUrl: string;
  hasOfficialOrganDonationUrl: boolean;
}

export const COUNTRIES: CountryOption[] = worldCountries
  .filter((country) => country.cca2 && country.name.common)
  .map((country) => ({
    code: country.cca2,
    name: country.name.common,
    flag: country.flag,
    callingCode: `${country.idd.root || ''}${country.idd.suffixes?.[0] || ''}`.replace(/-$/, '') || '—',
    districts: DISTRICTS[country.cca2] || [],
    organDonationUrl: ORGAN_DONATION_URLS[country.cca2] || `https://www.google.com/search?q=${encodeURIComponent(`official organ donation registry registration ${country.name.common}`)}`,
    hasOfficialOrganDonationUrl: Boolean(ORGAN_DONATION_URLS[country.cca2]),
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_COUNTRY = COUNTRIES.find((country) => country.code === 'LK') || COUNTRIES[0];
export const getCountry = (code: string) => COUNTRIES.find((country) => country.code === code) || DEFAULT_COUNTRY;
export const getSubdivisionLabel = (countryCode: string) => SUBDIVISION_LABELS[countryCode] || 'District / State / Province';
