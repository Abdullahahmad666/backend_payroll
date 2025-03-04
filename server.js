/**
 * index.js (Node + Express + MongoDB)
 *
 * Run with:
 *   node index.js
 * or:
 *   nodemon index.js (if you have nodemon installed)
 *
 * Dependencies:
 *   npm install express mongoose cors
 * 
 * Make sure MongoDB is running locally on: mongodb://localhost:27017/payrollDB
 * or update the connection string if needed.
 */
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(cors());

// Connect to MongoDB (adjust if needed)
mongoose.connect("mongodb+srv://ahmadirfansethi360:arsenal360@cluster0.nbpmuxy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// ----------------- SCHEMAS & MODELS -----------------
const employeeSchema = new mongoose.Schema({
  name: String,
  role: String,
  pay_rate1: Number,
  pay_rate2: Number,
  last_payroll_date: Date,
});
const Employee = mongoose.model("Employee", employeeSchema);

const workLogSchema = new mongoose.Schema({
  employeeId: mongoose.Schema.Types.ObjectId,
  date: Date,
  hours_payrate1: Number,
  hours_payrate2: Number,
  deduction: Number,
});
const WorkLog = mongoose.model("WorkLog", workLogSchema);

const payrollSchema = new mongoose.Schema({
  employeeId: mongoose.Schema.Types.ObjectId,
  totalHours: Number,
  totalPay: Number,
  deductions: Number,
  netPay: Number,
  payDate: Date,
});
const Payroll = mongoose.model("Payroll", payrollSchema);

// ----------------- EMPLOYEE CRUD --------------------

// GET all employees
app.get("/employees", async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE an employee
app.post("/employees", async (req, res) => {
  try {
    const newEmployee = new Employee(req.body);
    await newEmployee.save();
    res.json(newEmployee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE an employee
app.put("/employees/:id", async (req, res) => {
  try {
    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    res.json(updatedEmployee);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE an employee
app.delete("/employees/:id", async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee Deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- WORK LOGS ------------------------

// CREATE a new work log
app.post("/worklogs", async (req, res) => {
  try {
    const workLog = new WorkLog(req.body);
    await workLog.save();
    res.json(workLog);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET all work logs for an employee
app.get("/worklogs/:employeeId", async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const logs = await WorkLog.find({ employeeId });
    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- PAYROLL (PREVIEW & FINALIZE) ------

// PREVIEW PAY (no DB update)
app.get("/preview-pay/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const lastPayDate = employee.last_payroll_date || new Date("2024-01-01");
    const logs = await WorkLog.find({
      employeeId: req.params.id,
      date: { $gt: lastPayDate },
    });

    let totalHours1 = 0;
    let totalHours2 = 0;
    let totalDeductions = 0;

    logs.forEach((log) => {
      totalHours1 += log.hours_payrate1;
      totalHours2 += log.hours_payrate2;
      totalDeductions += log.deduction;
    });

    const totalPay = totalHours1 * employee.pay_rate1 + totalHours2 * employee.pay_rate2;
    const netPay = totalPay - totalDeductions;

    res.json({
      totalHours: totalHours1 + totalHours2,
      totalPay,
      deductions: totalDeductions,
      netPay,
      lastPayDate,
      previewDate: new Date(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// FINALIZE PAY (creates payroll record, updates last_payroll_date)
app.post("/disburse-pay/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const lastPayDate = employee.last_payroll_date || new Date("2024-01-01");
    const logs = await WorkLog.find({
      employeeId: req.params.id,
      date: { $gt: lastPayDate },
    });

    let totalHours1 = 0;
    let totalHours2 = 0;
    let totalDeductions = 0;

    logs.forEach((log) => {
      totalHours1 += log.hours_payrate1;
      totalHours2 += log.hours_payrate2;
      totalDeductions += log.deduction;
    });

    const totalPay = totalHours1 * employee.pay_rate1 + totalHours2 * employee.pay_rate2;
    const netPay = totalPay - totalDeductions;

    // save payroll record
    const payroll = new Payroll({
      employeeId: req.params.id,
      totalHours: totalHours1 + totalHours2,
      totalPay,
      deductions: totalDeductions,
      netPay,
      payDate: new Date(),
    });
    await payroll.save();

    // update last_payroll_date
    employee.last_payroll_date = new Date();
    await employee.save();

    res.json(payroll);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- MONTHLY REPORTS -------------------
/**
 * GET /reports/monthly?month=3&year=2025&employeeId=<someId>
 * If employeeId=all (or not given), returns data for all employees
 * Returns { results: [...], totalExpense }
 */
app.get("/reports/monthly", async (req, res) => {
  try {
    let { month, year, employeeId } = req.query;
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // fallback to current if none
    const finalMonth = parseInt(month) || currentMonth;
    const finalYear = parseInt(year) || currentYear;

    // build date range for that month
    const startDate = new Date(finalYear, finalMonth - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(finalYear, finalMonth, 0, 23, 59, 59, 999);

    let employees = [];
    if (employeeId && employeeId !== "all") {
      const oneEmp = await Employee.findById(employeeId);
      if (!oneEmp) return res.json({ results: [], totalExpense: 0 });
      employees = [oneEmp];
    } else {
      employees = await Employee.find();
    }

    let totalExpense = 0;
    const results = [];

    for (const emp of employees) {
      const logs = await WorkLog.find({
        employeeId: emp._id,
        date: { $gte: startDate, $lte: endDate },
      });

      let totalHours1 = 0;
      let totalHours2 = 0;
      let totalDeductions = 0;

      logs.forEach((log) => {
        totalHours1 += log.hours_payrate1;
        totalHours2 += log.hours_payrate2;
        totalDeductions += log.deduction;
      });

      const totalPay = totalHours1 * emp.pay_rate1 + totalHours2 * emp.pay_rate2;
      const netPay = totalPay - totalDeductions;

      // accumulate netPay for the entire group
      totalExpense += netPay;

      results.push({
        employeeId: emp._id,
        name: emp.name,
        role: emp.role,
        month: finalMonth,
        year: finalYear,
        totalHours: totalHours1 + totalHours2,
        totalPay,
        totalDeductions,
        netPay,
      });
    }

    res.json({ results, totalExpense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ----------------- START SERVER ----------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
