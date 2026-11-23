# Payroll System — Backend API

REST API for a small-business payroll system. It stores employees with two pay rates, records daily work logs with hours and deductions, and generates payroll runs with gross pay, deductions and net pay.

**Deployed API:** https://backend-payroll.vercel.app · **Frontend:** [frontend_payroll](https://github.com/Abdullahahmad666/frontend_payroll)

## Data model
| Collection | Fields |
| --- | --- |
| Employee | name, role, pay_rate1, pay_rate2, last_payroll_date |
| WorkLog | employeeId, date, hours_payrate1, hours_payrate2, deduction |
| Payroll | employeeId, totalHours, totalPay, deductions, netPay, payDate |

## Tech stack
Node.js · Express · MongoDB (Mongoose) · Vercel serverless

## Run locally
```bash
git clone https://github.com/Abdullahahmad666/backend_payroll.git
cd backend_payroll
npm install
```
Create a `.env` file (it is git-ignored, never commit it):
```
MONGO_URI=your_mongodb_connection_string
PORT=5000
```
```bash
node server.js      # http://localhost:5000
```
When deploying to Vercel, add `MONGO_URI` under Project → Settings → Environment Variables.

---

**Built by [Abdullah Ahmad](https://abdullah-ahmad-portfolio.vercel.app)**, Full Stack Software Engineer in Lahore, Pakistan · [GitHub](https://github.com/Abdullahahmad666) · [LinkedIn](https://www.linkedin.com/in/abdullah-ahmad-a00913259/)
