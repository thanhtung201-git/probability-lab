// Dàn trang văn bản có công thức: phân số a/b hiện dạng phân số xếp chồng, danh sách "(a; b) → tổng" hiện thành lưới gọn.
import { Fragment, type ReactNode } from "react";

// "11/16" thành phân số; bỏ qua ngày tháng, đường dẫn và các cụm như "và/hoặc" (chỉ nhận hai số nguyên đứng riêng).
const PHAN_SO = /(?<![\w.,/])(\d+)\/(\d+)(?![\w/]|[.,]\d)/g;
// Một kết quả dạng "(1, 3) → 4"; từ hai kết quả trở lên coi là danh sách liệt kê.
const KET_QUA = /\(\s*\d+(?:\s*[,;]\s*\d+)+\s*\)\s*→\s*\d+/g;
const P_NGHIENG = /(?<![\p{L}\p{N}])P(?=\s*(?:=|\())/gu;

function dong(text: string, khoa: string): ReactNode[] {
  const ra: ReactNode[] = [];
  let cuoi = 0;
  const them = (s: string, k: string) => {
    let c = 0;
    for (const m of s.matchAll(P_NGHIENG)) {
      if (m.index > c) ra.push(s.slice(c, m.index));
      ra.push(<i key={`${k}p${m.index}`}>P</i>);
      c = m.index + 1;
    }
    if (c < s.length) ra.push(s.slice(c));
  };
  for (const m of text.matchAll(PHAN_SO)) {
    if (m.index > cuoi) them(text.slice(cuoi, m.index), `${khoa}t${cuoi}`);
    ra.push(
      <span key={`${khoa}f${m.index}`} className="phan-so">
        <span>{m[1]}</span>
        <span>{m[2]}</span>
      </span>,
    );
    cuoi = m.index + m[0].length;
  }
  if (cuoi < text.length) them(text.slice(cuoi), `${khoa}t${cuoi}`);
  return ra;
}

export function Toan({ children }: { children: string }) {
  const ds = [...children.matchAll(KET_QUA)];
  if (ds.length < 2) return <>{dong(children, "")}</>;
  const dau = children.slice(0, ds[0]!.index).trim();
  const cuoi = children.slice(ds[ds.length - 1]!.index + ds[ds.length - 1]![0].length).trim();
  return (
    <>
      {dau && <div>{dong(dau, "d")}</div>}
      <div className="luoi-ket-qua">
        {ds.map((m, i) => (
          <span key={i}>{m[0].replace(/\s*[,;]\s*/g, "; ").replace(/\(\s+/, "(").replace(/\s+\)/, ")").replace(/\s*→\s*/, " → ")}</span>
        ))}
      </div>
      {cuoi && <div>{dong(cuoi, "c")}</div>}
    </>
  );
}

/** Nhiều đoạn văn, mỗi đoạn một thẻ <p>. */
export const DoanToan = ({ ds }: { ds: string[] }) => (
  <>
    {ds.map((c, i) => (
      <Fragment key={i}>
        <p>
          <Toan>{c}</Toan>
        </p>
      </Fragment>
    ))}
  </>
);
