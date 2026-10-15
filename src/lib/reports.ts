// Reporting helpers for the work-assignment module (B3).
//
// Like `lib/tasks.ts`, this module is intentionally free of server-only imports
// so the same pure maths can run on the server (initial payload) and in the
// browser (re-computing when the date/department filters change) and power the
// CSV export.
import { isOverdue, rollupProgress, subTaskProgress, type WorkOrderStatus } from "@/lib/tasks";

/** Who is looking at the report — decides how much detail is exposed. */
export type ReportScope = "company" | "department" | "overview";

export type DepartmentOption = { id: string; name: string };

export type ReportWorkOrderRow = {
  id: string;
  code: string;
  title: string;
  status: WorkOrderStatus;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  progress: number;
  departmentIds: string[];
  departmentNames: string[];
};

export type ReportSubTaskRow = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  /** The board closed this department, so the item counts as complete. */
  closed: boolean;
  assigneeId: string | null;
  assigneeName: string | null;
  departmentId: string;
  departmentName: string;
  workOrderId: string;
  workOrderCode: string;
  workOrderTitle: string;
  workOrderCreatedAt: string;
};

export type KpiSummary = {
  workOrders: number;
  open: number;
  inProgress: number;
  done: number;
  cancelled: number;
  subTasks: number;
  subTasksDone: number;
  overdue: number;
  pendingReview: number;
  progress: number;
};

export type DepartmentReport = {
  id: string;
  name: string;
  total: number;
  done: number;
  progress: number;
  overdue: number;
  pendingReview: number;
  incomplete: ReportSubTaskRow[];
};

export type StaffReport = {
  id: string;
  name: string;
  departmentName: string | null;
  total: number;
  done: number;
  progress: number;
  overdue: number;
};

export type ReportTables = {
  kpi: KpiSummary;
  departments: DepartmentReport[];
  staff: StaffReport[];
  overdue: ReportSubTaskRow[];
};

export type ReportInput = {
  workOrders: ReportWorkOrderRow[];
  subTasks: ReportSubTaskRow[];
  /** Every department that has a target in scope, including empty ones. */
  departments: DepartmentOption[];
};

/** A sub-task's effective status once a closed department is counted as done. */
export function effectiveStatus(row: Pick<ReportSubTaskRow, "status" | "closed">): string {
  return row.closed ? "DONE" : row.status;
}

/** Progress contributed by one report row (derived from status, never typed). */
export function rowProgress(row: Pick<ReportSubTaskRow, "status" | "closed">): number {
  return row.closed ? 100 : subTaskProgress(row.status);
}

export function isRowOverdue(row: Pick<ReportSubTaskRow, "status" | "closed" | "dueDate">): boolean {
  return isOverdue(row.dueDate, effectiveStatus(row) === "DONE");
}

function statusesOf(rows: ReportSubTaskRow[]): string[] {
  return rows.map(effectiveStatus);
}

export function buildReport(input: ReportInput): ReportTables {
  const { workOrders, subTasks, departments } = input;

  const rollup = rollupProgress(statusesOf(subTasks));
  const active = workOrders.filter((order) => order.status !== "CANCELLED");
  const allDone = active.length > 0 && active.every((order) => order.status === "DONE");

  const kpi: KpiSummary = {
    workOrders: active.length,
    open: active.filter((order) => order.status === "OPEN").length,
    inProgress: active.filter((order) => order.status === "IN_PROGRESS").length,
    done: active.filter((order) => order.status === "DONE").length,
    cancelled: workOrders.length - active.length,
    subTasks: rollup.total,
    subTasksDone: rollup.done,
    overdue: subTasks.filter(isRowOverdue).length,
    pendingReview: subTasks.filter(
      (row) => effectiveStatus(row) === "PENDING_REVIEW",
    ).length,
    progress: rollup.total === 0 && allDone ? 100 : rollup.progress,
  };

  return {
    kpi,
    departments: buildDepartments(subTasks, departments),
    staff: buildStaff(subTasks),
    overdue: subTasks
      .filter(isRowOverdue)
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999")),
  };
}

/** Summaries per department, slowest first, with the outstanding items inside. */
function buildDepartments(
  subTasks: ReportSubTaskRow[],
  departments: DepartmentOption[],
): DepartmentReport[] {
  const grouped = new Map<string, { id: string; name: string; rows: ReportSubTaskRow[] }>();
  for (const department of departments) {
    grouped.set(department.id, { id: department.id, name: department.name, rows: [] });
  }
  for (const row of subTasks) {
    let entry = grouped.get(row.departmentId);
    if (!entry) {
      entry = { id: row.departmentId, name: row.departmentName, rows: [] };
      grouped.set(row.departmentId, entry);
    }
    entry.rows.push(row);
  }

  return [...grouped.values()]
    .map((entry) => {
      const rollup = rollupProgress(statusesOf(entry.rows));
      return {
        id: entry.id,
        name: entry.name,
        total: rollup.total,
        done: rollup.done,
        progress: rollup.progress,
        overdue: entry.rows.filter(isRowOverdue).length,
        pendingReview: entry.rows.filter(
          (row) => effectiveStatus(row) === "PENDING_REVIEW",
        ).length,
        incomplete: entry.rows.filter((row) => effectiveStatus(row) !== "DONE"),
      } satisfies DepartmentReport;
    })
    .sort((a, b) => (a.progress !== b.progress ? a.progress - b.progress : a.name.localeCompare(b.name)));
}

/** Ranking of main assignees (unassigned work is excluded — it has no owner). */
function buildStaff(subTasks: ReportSubTaskRow[]): StaffReport[] {
  const grouped = new Map<string, { id: string; name: string; departmentName: string | null; rows: ReportSubTaskRow[] }>();
  for (const row of subTasks) {
    if (!row.assigneeId) continue;
    let entry = grouped.get(row.assigneeId);
    if (!entry) {
      entry = {
        id: row.assigneeId,
        name: row.assigneeName ?? "",
        departmentName: row.departmentName,
        rows: [],
      };
      grouped.set(row.assigneeId, entry);
    }
    entry.rows.push(row);
  }

  return [...grouped.values()]
    .map((entry) => {
      const rollup = rollupProgress(statusesOf(entry.rows));
      return {
        id: entry.id,
        name: entry.name,
        departmentName: entry.departmentName,
        total: rollup.total,
        done: rollup.done,
        progress: rollup.progress,
        overdue: entry.rows.filter(isRowOverdue).length,
      } satisfies StaffReport;
    })
    .sort((a, b) => b.progress - a.progress || a.name.localeCompare(b.name));
}

/**
 * Encode rows as CSV. Callers pass already-localised cell values so this stays
 * a pure function; the browser prepends nothing, so a UTF-8 BOM is added by
 * `downloadCsv` to keep Excel happy with Vietnamese characters.
 */
export function toCsv(rows: (string | number)[][]): string {
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return rows.map((row) => row.map(escape).join(",")).join("\r\n");
}
