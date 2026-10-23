import { RUBRIC } from "@plab/core";

/** "1" → "Nhóm 1", còn "Nhóm 1" giữ nguyên. */
export const tenNhom = (ma: string) => (/^nh[oóòọ]m\b/i.test(ma) ? ma : `Nhóm ${ma}`);

/** Tên mức rubric để hiển thị, ví dụ "Mức 3 – Hiểu đúng nhưng giải thích chưa đầy đủ". */
export const tenMuc = (m: number | null) => (m ? `Mức ${m} – ${RUBRIC[m - 1]!.ten}` : "Chưa chấm");
