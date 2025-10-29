import { GetCountries, GetState, GetCity } from "react-country-state-city";

//------------------------------------------------
// 1) Helper functions: map countries/states/cities by ID
//------------------------------------------------
export const mapAllCountries = async () => {
  const countries = await GetCountries();
  return countries.map((country) => ({
    value: country.id,
    label: country.name
  }));
};

// Find India in the countries list
export const findIndiaOption = async () => {
  const countries = await GetCountries();
  const countriesOptions = countries.map((country) => ({
    value: country.id,
    label: country.name
  }));
  const india = countriesOptions.find(country => country.label === "India");
  return india || null;
};

export const mapStatesOfCountry = async (countryId) => {
  if (!countryId) return [];
  const states = await GetState(countryId);
  return states.map((state) => ({
    value: state.id,
    label: state.name
  }));
};

export const mapCitiesOfState = async (countryId, stateId) => {
  if (!countryId || !stateId) return [];
  const cities = await GetCity(countryId, stateId);
  return cities.map((city) => ({
    value: city.name,
    label: city.name
  }));
};

//------------------------------------------------
// 2) Custom styles for React-Select to fix overlap
//------------------------------------------------
export const selectMenuPortalStyles = {
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999 // ensure the dropdown is above map controls
  })
};

//-------------- Year/Month Options --------------
export const yearOptions = Array.from({ length: 13 }, (_, i) => {
  const text = `${i} year${i !== 1 ? "s" : ""}`;
  return { value: text, label: text };
});

export const monthOptions = Array.from({ length: 12 }, (_, i) => {
  const text = `${i} month${i !== 1 ? "s" : ""}`;
  return { value: text, label: text };
});

//-------------- Multi-Select Options --------------
export const multiSelectOptions = {
  job_shifts: [
  { value: 'Week days', label: 'Week days' },
  { value: 'All days', label: 'All days' },
  { value: 'week ends', label: 'Week ends' },
  { value: 'Vacations', label: 'Vacations' }
  ],
  job_process: [
  { value: 'Regular', label: 'Regular (Offline)' },
  { value: 'Online', label: 'Online' },
  { value: 'Hybrid', label: 'Hybrid' }
  ],
  job_sub_category: [
  { value: 'Online', label: 'Online' },
  { value: 'tuition Center', label: 'Tuition Center' },
  { value: 'Group tuition', label: 'Group tuition' },
  { value: 'Private tuitions', label: 'Private tuitions' },
  { value: 'Home Tuitions', label: 'Home Tuitions' }
  ],
  selection_process: [
    { value: 'Demo', label: 'Demo' },
    { value: 'Written test', label: 'Written test' },
    { value: 'Personal Interview', label: 'Personal Interview' },
    { value: 'Subject Interview', label: 'Subject Interview' },
    { value: 'HR interview', label: 'HR interview' },
    { value: 'Management Interview', label: 'Management Interview' },
    { value: 'Online', label: 'Online' },
    { value: 'Offline', label: 'Offline' },
    { value: 'Hybrid', label: 'Hybrid' }
  ],
  tution_types: [
    { value: "Home Tuitions Offline (One-One at students home)", label: "Home Tuitions Offline (One-One at students home)" },
    { value: "Private Tuitions Offline (One-One at teachers home)", label: "Private Tuitions Offline (One-One at teachers home)" },
    { value: "Group Tuitions Offline (at teachers home)", label: "Group Tuitions Offline (at teachers home)" },
    { value: "Private Tuitions Online (One-One)", label: "Private Tuitions Online (One-One)" },
    { value: "Group Tuitions Online (from teacher as tuitions)", label: "Group Tuitions Online (from teacher as tuitions)" }
  ],
 
  computer_skills: [
  { value: 'basic', label: 'Basic Knowledge' },
  { value: 'word', label: 'Word' },
  { value: 'excel', label: 'Excel' },
  { value: 'ppt', label: 'PPT' },
  { value: 'erp', label: 'ERP' },
  { value: 'tally', label: 'Tally' },
  ]
};

//-------------- Radio jobCategory --------------
export const jobCategoryOptions = [
  { value: 'fullTime', label: 'Full Time' },
  { value: 'fullPart', label: 'Full Time / Part Time' },
  { value: 'partTime', label: 'Part Time' },
  { value: 'tuitions', label: 'Tuitions' }
]; 