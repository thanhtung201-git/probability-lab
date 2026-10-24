import { laSuKienBi, moTaBienCo, moTaBienCoBaiToan, moTaSuKienBi, nhanVat, type CauHinhVat } from "@plab/core";

const tenMat = (m: string) => (m === "N" ? "ngửa" : "sấp");

/** Mô tả ngắn thí nghiệm đã chọn, để giáo viên biết phòng thí nghiệm đang làm gì. */
export function moTaCheDo(c: CauHinhVat): string {
  if (c.loai === "dong_xu") {
    switch (c.che_do) {
      case "phan_phoi":
        return c.so_dong_xu === 1
          ? `Tung 1 đồng xu, theo dõi mặt ${c.theo_doi.map(tenMat).join(", ")}`
          : `Tung ${c.so_dong_xu} đồng xu cùng lúc, đếm số mặt ngửa (theo dõi ${c.theo_doi.join(", ")} ngửa)`;
      case "dieu_kien":
        return `Sau ${c.so_lan_truoc} lần liên tiếp cùng ra ${tenMat(c.mat)}, xem lần kế tiếp ra mặt nào`;
      case "day":
        return `Tung ${c.day_a.length} lần liên tiếp, so sánh số lần ra dãy ${c.day_a} với dãy ${c.day_b}`;
    }
  }
  if (c.loai === "bai_toan") {
    // Đồng xu / xúc xắc quy về bài toán tổng quát: mỗi mặt là một vật, mỗi lần tung / gieo là một lần lấy có hoàn lại.
    if (c.ten_vat === "mặt đồng xu" || c.ten_vat === "mặt xúc xắc") {
      const xu = c.ten_vat === "mặt đồng xu";
      return `${xu ? "Tung đồng xu" : "Gieo xúc xắc"} ${c.so_lan} lần (mỗi lần ra ${xu ? "ngửa hoặc sấp" : "một trong 6 mặt"}), xem có phải kết quả thuận lợi cho “${moTaBienCoBaiToan(c)}” không`;
    }
    return `Có ${c.vat.length} ${c.ten_vat ?? "vật"} (${c.vat.map(nhanVat).join(", ")}). Lấy lần lượt ${c.so_lan} ${c.hoan_lai ? "có" : "không"} hoàn lại, xem có phải kết quả thuận lợi cho “${moTaBienCoBaiToan(c)}” không`;
  }
  if (c.loai === "bi") {
    const hop = c.hop.map((g) => `${g.so} ${g.ten}`).join(", ");
    if (c.che_do === "dieu_kien") {
      return `Hộp ${hop}. Lấy có hoàn lại: sau ${c.so_lan_truoc} lần liên tiếp bi ${c.mau_lap}, xem lần kế tiếp lấy được bi màu nào`;
    }
    if (laSuKienBi(c)) return `Hộp ${hop}. Lấy ${c.so_lay} bi ${c.hoan_lai ? "có" : "không"} hoàn lại, xem có phải kết quả thuận lợi cho “${moTaSuKienBi(c)}” không`;
    return c.so_lay === 1
      ? `Hộp ${hop}. Lấy 1 bi, theo dõi bi ${c.theo_doi.join(", ")}`
      : `Hộp ${hop}. Lấy ${c.so_lay} bi ${c.hoan_lai ? "có" : "không"} hoàn lại, đếm số bi ${c.mau_muc_tieu} (theo dõi ${c.theo_doi.join(", ")} bi)`;
  }
  if (c.loai === "the") {
    const bo = `${c.so_the} thẻ ghi số từ 1 đến ${c.so_the}`;
    switch (c.che_do) {
      case "tung_so":
        return `${bo}. Rút 1 thẻ, theo dõi thẻ số ${c.theo_doi.join(", ")}`;
      case "bien_co":
        return `${bo}. Rút 1 thẻ, xem có thuận lợi cho biến cố “${moTaBienCo(c.bien_co)}” không`;
      case "hai_the":
        return `${bo}. Rút 2 thẻ ${c.hoan_lai ? "có" : "không"} hoàn lại, đếm số thẻ “${moTaBienCo(c.bien_co)}” (theo dõi ${c.theo_doi.join(", ")} thẻ)`;
    }
  }
  if (c.loai === "xuc_xac") {
    switch (c.che_do) {
      case "phan_phoi":
        return c.so_xuc_xac === 1
          ? `Gieo 1 con xúc xắc, theo dõi mặt ${c.theo_doi.join(", ")}`
          : `Gieo ${c.so_xuc_xac} con xúc xắc và tính tổng, theo dõi tổng ${c.theo_doi.join(", ")}`;
      case "dieu_kien":
        return `Sau ${c.so_lan_truoc} lần liên tiếp không ra mặt ${c.mat}, xem lần kế tiếp có ra mặt ${c.mat} không`;
      case "day":
        return `Gieo ${c.day_a.length} lần liên tiếp, so sánh số lần ra dãy ${c.day_a.join("-")} với dãy ${c.day_b.join("-")}`;
    }
  }
  return "";
}

const KHOA = "plab.ghi_chu_phien.";

export interface GhiChuPhien {
  nguon: "giao_vien" | "ai" | "mac_dinh";
  ly_do: string;
  canh_bao: string | null;
}

/** Lưu tạm thông tin cách chọn thí nghiệm để màn hình phiên hiện một lần sau khi tạo. */
export function luuGhiChuPhien(ma: string, g: GhiChuPhien) {
  try {
    sessionStorage.setItem(KHOA + ma, JSON.stringify(g));
  } catch {
    /* trình duyệt chặn lưu trữ: bỏ qua, chỉ mất dòng ghi chú */
  }
}

export function docGhiChuPhien(ma: string): GhiChuPhien | null {
  try {
    return JSON.parse(sessionStorage.getItem(KHOA + ma) ?? "null");
  } catch {
    return null;
  }
}
