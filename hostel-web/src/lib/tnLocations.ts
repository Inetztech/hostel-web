import api from "./api";

export interface LocationOption {
  value: string;
  label: string;
}

export const STATES: LocationOption[] = [
  { value: "TN", label: "Tamil Nadu" },
];

export const TN_DISTRICTS: LocationOption[] = [
  "Ariyalur", "Chengalpattu", "Chennai", "Coimbatore", "Cuddalore", "Dharmapuri",
  "Dindigul", "Erode", "Kallakurichi", "Kanchipuram", "Kanyakumari", "Karur",
  "Krishnagiri", "Madurai", "Mayiladuthurai", "Nagapattinam", "Namakkal",
  "The Nilgiris", "Perambalur", "Pudukkottai", "Ramanathapuram", "Ranipet",
  "Salem", "Sivaganga", "Tenkasi", "Thanjavur", "Theni", "Thoothukudi",
  "Tiruchirappalli", "Tirunelveli", "Tirupathur", "Tiruppur", "Tiruvallur",
  "Tiruvannamalai", "Tiruvarur", "Vellore", "Viluppuram", "Virudhunagar",
].map((d) => ({ value: d, label: d }));

export interface LocationSuggestion {
  placeId: string;
  text: string;   
  short: string;  
}

let debounceTimer: ReturnType<typeof setTimeout>;
let latestRequestId = 0;

export const searchLocations = (
  input: string,
  district: string,
  stateLabel: string = "Tamil Nadu"
): Promise<LocationSuggestion[]> => {
  clearTimeout(debounceTimer);
  const requestId = ++latestRequestId;

  return new Promise((resolve) => {
    if (!input || input.trim().length < 2) {
      resolve([]);
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const context = [district, stateLabel].filter(Boolean).join(", ");
        const res = await api.get("/locations/autocomplete", {
          params: { input, context },
        });
        const raw: { placeId: string; text: string }[] = res.data?.data ?? res.data ?? [];

        if (requestId !== latestRequestId) {
          resolve([]);
          return;
        }

        const suggestions: LocationSuggestion[] = raw.map((r) => ({
          placeId: r.placeId,
          text: r.text,
          short: r.text?.split(",")[0]?.trim() ?? r.text,
        }));
        resolve(suggestions);
      } catch (err) {
        console.error("Location search failed:", err);
        resolve([]);
      }
    }, 400); 
  });
};