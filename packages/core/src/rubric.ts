// Rubric 4 mức đánh giá lời giải thích, và chỉ số chuyển đổi nhận thức.

export const RUBRIC = [
  { muc: 1, ten: "Chưa hiểu đúng" },
  { muc: 2, ten: "Hiểu một phần" },
  { muc: 3, ten: "Hiểu đúng nhưng giải thích chưa đầy đủ" },
  { muc: 4, ten: "Hiểu đúng và có lập luận phù hợp" },
] as const;

export type MucRubric = 1 | 2 | 3 | 4;

/** Tỷ lệ nhóm tăng mức rubric từ lần 1 đến lần 3 (bỏ qua nhóm chưa đủ dữ liệu). */
export function chiSoChuyenDoi(ds: { lan1: MucRubric | null; lan3: MucRubric | null }[]): {
  so_nhom: number;
  so_tang: number;
  ty_le: number;
} {
  const du = ds.filter((d) => d.lan1 !== null && d.lan3 !== null);
  const tang = du.filter((d) => d.lan3! > d.lan1!).length;
  return { so_nhom: du.length, so_tang: tang, ty_le: du.length ? tang / du.length : 0 };
}
