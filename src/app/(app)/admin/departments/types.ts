export type DepartmentRow = {
  id: string;
  name: string;
  nameEn: string | null;
  code: string;
  description: string | null;
  headId: string | null;
  headName: string | null;
  memberCount: number;
};

export type UserOption = {
  id: string;
  name: string;
};
