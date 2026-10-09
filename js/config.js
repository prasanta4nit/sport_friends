/* ==========================================================================
   SPORTS FRIENDS — shop details
   This is the only file you need to edit to update contact info and timings.
   ========================================================================== */

window.SHOP = {
  name: "SPORTS FRIENDS",

  // WhatsApp number WITH country code, digits only. Example: "919876543210"
  // Until this is filled in, the site shows a yellow setup notice and the
  // WhatsApp buttons open WhatsApp without a pre-selected contact.
  whatsapp: "919304750120",

  // Phone number for the "Call" buttons. Example: "+91 98765 43210"
  // Leave empty ("") to hide the call buttons.
  phone: "+91 93047 50120",

  address: {
    en: "NH-218, Chandankiyari, Bokaro, Jharkhand",
    hi: "NH-218, चंदनकियारी, बोकारो, झारखंड"
  },
  streetAddress: "NH-218",
  locality: "Chandankiyari",
  region: "Jharkhand",
  country: "IN",

  // From the shop's Google Maps listing.
  geo: { lat: 23.576291, lng: 86.3588978 },
  mapsUrl: "https://maps.app.goo.gl/oXZheRw9FufzH9it6",

  // Opening hours, 24-hour "HH:MM" in Indian Standard Time. Use null for a closed day.
  // Leave `hours: null` until the timings are confirmed — the site then asks
  // visitors to check today's timings on WhatsApp instead of guessing.
  //
  // Example:
  // hours: {
  //   mon: ["09:30", "20:30"], tue: ["09:30", "20:30"], wed: ["09:30", "20:30"],
  //   thu: ["09:30", "20:30"], fri: ["09:30", "20:30"], sat: ["09:30", "20:30"],
  //   sun: ["10:00", "14:00"]
  // },
  hours: {
    mon: ["10:00", "20:00"], tue: ["10:00", "20:00"], wed: ["10:00", "20:00"],
    thu: ["10:00", "20:00"], fri: ["10:00", "20:00"], sat: ["10:00", "20:00"],
    sun: ["10:00", "20:00"]
  },

  // Optional social links. Leave empty to hide.
  instagram: "",
  facebook: ""
};
