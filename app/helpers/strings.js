export const WORKSHOP_MAP = {
  ucenicie_doruCirdei: "Ucenicie - Doru Cîrdei",
  inchinare_adiKovaci: "Închinare - Adi Kovaci",
  voluntarvsslujitor_otiTipei: "Voluntar vs Slujitor - Oti Țipei",
  conducereBisericeasca_mihaiDumitrascu:
    "Conducere bisericească - Mihai Dumitrașcu"
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
