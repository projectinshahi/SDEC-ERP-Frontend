/**
 * FRONTEND MIRROR of the backend payroll money formula
 * (SDEC-ERP-backend/src/services/payroll.service.ts).
 *
 * Purpose: INSTANT live preview inside the Generate/Edit modal only. The backend
 * remains the single source of truth — frontend results are never trusted on save.
 * Keep this byte-for-byte equivalent to computePayroll on the backend; if the
 * backend formula or config changes, update both.
 */

/** Mirror of backend PAYROLL_CONFIG (percentages: 75 = 75%, 0.75 = 0.75%). */
export const PAYROLL_CALC_CONFIG = {
  basicSalaryPct: 75,
  dearnessAllowancePct: 25,
  esiRatePct: 0.75,
  monthlyPaidLeaveQuota: 3,
};

export interface PayrollComputeInput {
  basicSalary: number;
  dearnessAllowance: number;
  officeWorkingDays: number;
  employeeWorkedDays: number;
  fine: number;
  specialAllowance: number;
  providentFund: number;
  bonus: number;
  incentive: number;
  arrears: number;
}

export interface PayrollComputeResult {
  payableBasicSalary: number;
  payableDearnessAllowance: number;
  grossSalary: number;
  employeeStateInsurance: number;
  totalDeductions: number;
  netSalary: number;
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function computePayroll(
  input: PayrollComputeInput,
  cfg = PAYROLL_CALC_CONFIG,
): PayrollComputeResult {
  const owd = n(input.officeWorkingDays);
  const workedRatio = owd > 0 ? n(input.employeeWorkedDays) / owd : 0;

  const payableBasicSalary = n(input.basicSalary) * workedRatio;
  const payableDearnessAllowance = n(input.dearnessAllowance) * workedRatio;
  const grossSalary = payableBasicSalary + payableDearnessAllowance;
  const employeeStateInsurance = grossSalary * (cfg.esiRatePct / 100);
  const totalDeductions =
    n(input.fine) + n(input.specialAllowance) + employeeStateInsurance + n(input.providentFund);
  const netSalary =
    grossSalary - totalDeductions + n(input.bonus) + n(input.incentive) + n(input.arrears);

  return {
    payableBasicSalary,
    payableDearnessAllowance,
    grossSalary,
    employeeStateInsurance,
    totalDeductions,
    netSalary,
  };
}
