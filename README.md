# AntreanX

A lightweight and efficient queue management system built with **Next.js**, **Tailwind CSS**, and **Prisma (SQLite)**. Designed for front desk service operations such as complaint intake and queue tracking, this project is well-suited for local service centers, including use at **PT Telkom Indonesia (IndiHome/IndiBiz Sulbagsel)**.

---

## 🚀 Features

* 🎫 Auto-generated queue numbers (e.g., `A001`)
* 📝 Public complaint form with:

  * Category dropdown
  * Device type dropdown (Modem, AP, STB)
  * No Internet input
* 🔐 Admin authentication using **NextAuth (Credentials Provider)**
* 📊 Admin dashboard with:

  * Real-time complaint listing
  * Status transitions: `Menunggu` → `Diproses` → `Selesai`
  * Metrics: total, waiting, processing, done
  * Pagination (5 items per page)
  * Completed complaints list
* 🖨️ Printable queue ticket (struk antrian)
* 📁 Export complaints to CSV
* 📌 Modal confirmation with queue details after submission

---

## 🛠️ Tech Stack

* **Next.js** (App Router disabled)
* **Tailwind CSS** for styling
* **TypeScript**
* **Prisma ORM** with SQLite
* **NextAuth.js** for session-based auth
* **FileSaver.js** for CSV export

---

## 🖥️ Screenshots

*(Insert your own screenshots here)*

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/your-username/AntreanX.git
cd antreanx

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migration
npx prisma migrate dev --name init

# Start the development server
npm run dev
```

---

## 🔐 Environment Variables

Create a `.env` file and add:

```env
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
```

---

## 💡 Ideas for Future Improvement

* Live queue updates with WebSockets or polling
* Multi-admin support
* Search/filter capabilities
* Print preview customization

---

## 📄 License

MIT License. Feel free to use and modify for your own purposes.

---

> Made with ❤️ by [AlDev](mailto:mhdalif.id@gmail.com)
