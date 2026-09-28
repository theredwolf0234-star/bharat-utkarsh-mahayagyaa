# भारत उत्कर्ष महायज्ञ 2026 — Full Stack

## चलाने का तरीका
1. Node.js 18+ या 20+ इंस्टॉल करें।
2. इस folder में CMD/PowerShell खोलें।
3. `npm install`
4. Windows PowerShell:
   `$env:ADMIN_PASSWORD="अपना-नया-पासवर्ड"`
   `npm start`
5. Browser में खोलें: http://localhost:3000

## मुख्य बातें
- 108 अग्नि कुंड
- कुंड 1–9 संरक्षित
- 10–108 सामान्य पंजीकरण
- 15 मिनट का temporary reservation
- JSON file database: data/db.json
- UPI QR generation
- UTR collection
- token generation + QR + print
- mobile/token/registration ID search
- admin dashboard
- backend API

## महत्वपूर्ण भुगतान नोट
यह package UTR को collect करता है; यह अपने-आप बैंक/UPI से payment सत्यापित नहीं करता। वास्तविक payment verification के लिए payment gateway/bank API integration और merchant credentials आवश्यक होंगे। Demo में paymentStatus "प्राप्त" और verification "मैनुअल सत्यापन लंबित" रखा गया है।

## JSON source
`source-json/project.json` में frontend/backend source code strings के रूप में भी रखा गया है।
