export const WORKSHOP_MAP = {
  ucenicie_doruCirdei: "Ucenicie - Doru Cîrdei",
  inchinare_adiKovaci: "Închinare - Adi Kovaci",
  voluntarvsslujitor_otiTipei: "Voluntar vs Slujitor - Oti Țipei",
  conducereBisericeasca_mihaiDumitrascu:
    "Conducere bisericească - Mihai Dumitrașcu",
};

export function displayWorkshop(value) {
  return WORKSHOP_MAP[value] || value;
}

export function displaySource(value) {
  const map = {
    facebook: "Facebook",
    instagram: "Instagram",
    whatsapp: "WhatsApp / Grup",
    grup_de_casa: "Grup de casă",
    church: "Din biserică",
    poster: "Afiș / anunț",
    friend: "De la un prieten",
    other: "Altfel",
  };

  return map[value] || value;
}

export const AGE_OPTIONS = [
  { value: "", label: "Alege o varianta" },
  { value: "-18", label: "-18" },
  { value: "18-24", label: "18–24" },
  { value: "25-34", label: "25–34" },
  { value: "35-44", label: "35–44" },
  { value: "45-54", label: "45–54" },
  { value: "55+", label: "55+" },
];

export const SOURCE_OPTIONS = [
  { value: "", label: "Alege o varianta" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp / Grup" },
  { value: "grup_de_casa", label: "Grup de casa" },
  { value: "church", label: "Din biserica" },
  { value: "poster", label: "Afis / anunt" },
  { value: "other", label: "Altfel" },
];

export const COUNTY_OPTIONS = [
  { value: "", label: "Alege judetul" },
  { value: "Diaspora", label: "Diaspora" },
  { value: "Alba", label: "Alba" },
  { value: "Arad", label: "Arad" },
  { value: "Arges", label: "Arges" },
  { value: "Bacau", label: "Bacau" },
  { value: "Bihor", label: "Bihor" },
  { value: "Bistrita-Nasaud", label: "Bistrita-Nasaud" },
  { value: "Botosani", label: "Botosani" },
  { value: "Braila", label: "Braila" },
  { value: "Brasov", label: "Brasov" },
  { value: "Bucuresti", label: "Bucuresti" },
  { value: "Buzau", label: "Buzau" },
  { value: "Calarasi", label: "Calarasi" },
  { value: "Caras-Severin", label: "Caras-Severin" },
  { value: "Cluj", label: "Cluj" },
  { value: "Constanta", label: "Constanta" },
  { value: "Covasna", label: "Covasna" },
  { value: "Dambovita", label: "Dambovita" },
  { value: "Dolj", label: "Dolj" },
  { value: "Galati", label: "Galati" },
  { value: "Giurgiu", label: "Giurgiu" },
  { value: "Gorj", label: "Gorj" },
  { value: "Harghita", label: "Harghita" },
  { value: "Hunedoara", label: "Hunedoara" },
  { value: "Ialomita", label: "Ialomita" },
  { value: "Iasi", label: "Iasi" },
  { value: "Ilfov", label: "Ilfov" },
  { value: "Maramures", label: "Maramures" },
  { value: "Mehedinti", label: "Mehedinti" },
  { value: "Mures", label: "Mures" },
  { value: "Neamt", label: "Neamt" },
  { value: "Olt", label: "Olt" },
  { value: "Prahova", label: "Prahova" },
  { value: "Satu Mare", label: "Satu Mare" },
  { value: "Salaj", label: "Salaj" },
  { value: "Sibiu", label: "Sibiu" },
  { value: "Suceava", label: "Suceava" },
  { value: "Teleorman", label: "Teleorman" },
  { value: "Timis", label: "Timis" },
  { value: "Tulcea", label: "Tulcea" },
  { value: "Vaslui", label: "Vaslui" },
  { value: "Valcea", label: "Valcea" },
  { value: "Vrancea", label: "Vrancea" },
];

export const STATUS_OPTIONS = [
  { value: "completed", label: "CASH (Inregistrat! Plata la welcome)" },
  { value: "processing", label: "PAID (Inregistrat! Bilet Platit)" },
  { value: "on-hold", label: "PAID (Inregistrat! Bilet Redus | STAFF)" },
  { value: "pending", label: "PENDING (Participantul NU este inregistrat)" },
  { value: "cancelled", label: "CANCELLED (Plata neefectuata)" },
  { value: "failed", label: "FAILED (Eroare la plata)" },
];

export const ATTENDANCE = [
  { value: "absent", label: "ABSENT" },
  { value: "prezent", label: "PREZENT" },
];
