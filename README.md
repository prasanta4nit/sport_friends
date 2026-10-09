# SPORTS FRIENDS — shop website

A fast, mobile-first website for **SPORTS FRIENDS**, the sports shop on Jharia Road, Chandankiyari (Bokaro, Jharkhand), near Ravi Pathology & Vishal Hotel.
Customers browse products, then contact the shop on WhatsApp with a ready-written message.

- Plain HTML/CSS/JavaScript. No build step and no framework, so it loads quickly on mobile data.
- English and Hindi (toggle in the header; the choice is remembered).
- Every product has an **Ask price** button that opens WhatsApp with the product name filled in.
- An **enquiry list**: customers add several products and send them all in one WhatsApp message.
- A **team / bulk order** form (schools, clubs, tournaments) that also sends to WhatsApp.
- A Google map, directions, opening hours with an "Open now" badge, and a bottom action bar on phones.
- Search accepts Hindi words typed in English (e.g. *balla*, *joota*, *chidiya*).

## Before going live

| What | Where |
|---|---|
| **WhatsApp number** (required; a yellow notice shows until it is set) | `js/config.js` → `whatsapp: "91XXXXXXXXXX"` |
| Phone number for the Call buttons (optional) | `js/config.js` → `phone` |
| Opening hours (optional; until set, the site asks visitors to check on WhatsApp) | `js/config.js` → `hours` |
| Check the product list matches what the shop actually sells | `js/products.js` |
| Make the WhatsApp link preview show the picture | `index.html` → change `og:image` to the full `https://…/assets/og-image.png` address and add `og:url` |

## Preview on your computer

```bash
cd sportfriends
python -m http.server 8000
```

Open http://localhost:8000. To test on a phone on the same Wi-Fi, use your computer's IP address, e.g. `http://192.168.1.5:8000`.

## Editing products

Each product in `js/products.js` looks like this:

```js
{ id: "kashmir-willow-bat", cat: "cricket", icon: "bat", featured: true,
  name: { en: "Kashmir willow cricket bat", hi: "कश्मीर विलो क्रिकेट बैट" },
  desc: { en: "Sturdy all-rounder for leather and tennis-ball games.", hi: "…" },
  tags: ["bat", "balla", "willow"],
  price: "From ₹650",                          // optional
  image: "images/products/kashmir-bat.jpg" }  // optional
```

- `id` must be unique; keep it lowercase with dashes.
- `featured: true` items show first. The rest appear after **Show all**. Eight works well.
- With no `image`, a sport drawing is shown (icon names are in `js/icons.js`). For real photos, create `images/products/`, add square-ish JPGs around 600px wide, and set `image`.
- Without a `price`, customers just tap **Ask price**.
- Categories (the sport tiles and their colours) are defined at the top of the same file.

Interface text in both languages lives in `js/i18n.js`.

## Putting it online (free options)

- **Netlify Drop:** go to https://app.netlify.com/drop and drag the `sportfriends` folder in. You get a link in seconds.
- **GitHub Pages:** push this folder to a GitHub repository, then enable Pages under *Settings → Pages* (branch `main`, folder `/`).

Then add the site link to the shop's Google Business Profile, WhatsApp Business profile and Instagram bio.

## Files

```
index.html          page structure
css/styles.css      all styling (mobile-first)
js/config.js        shop details: WhatsApp, phone, hours, address, map
js/products.js      categories and products
js/i18n.js          English + Hindi text
js/icons.js         sport drawings and interface icons
js/app.js           behaviour: filters, search, list, WhatsApp links, hours
assets/             favicon and link-preview image
```
