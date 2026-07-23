# Setup — XAMPP (Windows / macOS / Linux)

This guide walks you through running InternTrack Enterprise Edition entirely locally with **XAMPP** (Apache + MySQL) and Node.js.

## 1. Prerequisites
- [XAMPP](https://www.apachefriends.org/download.html) with **MySQL 8.0+**
- [Node.js 20 LTS](https://nodejs.org/)
- `npm` (bundled with Node)

> InternTrack does **not** need Apache/PHP — only the bundled **MySQL** server from XAMPP.
> If you already have MySQL 8 running, you may skip XAMPP.

## 2. Start MySQL
1. Open XAMPP Control Panel.
2. Click **Start** next to **MySQL** (default port `3306`, empty root password).
3. Click **Admin** to open phpMyAdmin.

## 3. Create the database
In phpMyAdmin (or MySQL Shell), run:

```sql
CREATE DATABASE interntrack_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

(Optional but recommended — create a dedicated user:)

```sql
CREATE USER 'interntrack'@'localhost' IDENTIFIED BY 'strong-password';
GRANT ALL PRIVILEGES ON interntrack_db.* TO 'interntrack'@'localhost';
FLUSH PRIVILEGES;
```

## 4. Configure the backend
```bash
cd backend
cp .env.example .env
```
Edit `.env` and confirm:
```
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USERNAME=root      # or "interntrack"
DB_PASSWORD=          # empty by default in XAMPP, or your strong password
DB_DATABASE=interntrack_db
```

## 5. Install dependencies, generate keys, migrate & seed
```bash
npm install
npm run keys:generate     # creates keys/jwt-private.pem + keys/jwt-public.pem
npm run migration:run     # creates all tables
npm run seed              # creates users + sample internship + 40 days attendance
```

## 6. Configure & run the frontend
```bash
cd ../frontend
cp .env.example .env.local
npm install
npm run dev
```

## 7. Start the backend
```bash
cd ../backend
npm run start:dev
```

## 8. Access
- Student / Mentor portal: **http://localhost:3001**
- Isolated Admin gateway: **http://localhost:3001/admin/login**
- Backend API root:       **http://localhost:4000/api/v1/health**

## 9. Seeded accounts
| Role    | Email                       | Password        | Attendance |
|---------|-----------------------------|-----------------|------------|
| Admin   | admin@interntrack.local     | Admin@12345     | —          |
| Mentor  | mentor@interntrack.local    | Mentor@12345    | —          |
| Student | student1@interntrack.local  | Student@12345   | **95.00%** (eligible for certificate) |
| Student | student2@interntrack.local  | Student@12345   | **87.50%** (blocked by 90.00% rule)   |

## 10. Common issues
- **`ER_ACCESS_DENIED_ERROR`** → confirm `DB_USERNAME` / `DB_PASSWORD` in `backend/.env` match phpMyAdmin.
- **`ER_NOT_SUPPORTED_AUTH_MODE`** → in MySQL Shell run:
  ```sql
  ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '';
  FLUSH PRIVILEGES;
  ```
- **`ECONNREFUSED 127.0.0.1:3306`** → MySQL isn't running. Start it from XAMPP.
- **Frontend can't reach API** → confirm `NEXT_PUBLIC_API_URL` matches the backend port (default `4000`).
