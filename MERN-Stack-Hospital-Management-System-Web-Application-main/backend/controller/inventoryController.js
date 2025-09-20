import InventoryItem from "../models/InventoryItem.js";

/** Lấy danh sách vật tư */
export const getAllInventory = async (req, res) => {
  try {
    const items = await InventoryItem.find();
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

/** Lấy 1 vật tư theo ID */
export const getInventoryById = async (req, res) => {
  try {
    const item = await InventoryItem.findById(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy vật tư" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

/** Tạo mới vật tư */
export const createInventory = async (req, res) => {
  try {
    const item = await InventoryItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

/** Cập nhật vật tư */
export const updateInventory = async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy vật tư" });
    res.json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

/** Xóa vật tư */
export const deleteInventory = async (req, res) => {
  try {
    const item = await InventoryItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy vật tư" });
    res.json({ success: true, message: "Đã xóa vật tư" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};

/** ✅ Quét QR → cập nhật nhanh số lượng
 * Body: { delta: number }  // âm để trừ, dương để cộng
 * Ví dụ: PUT /inventory/OBJECT_ID/qr-update  { "delta": -1 }
 */
export const updateQuantityByQR = async (req, res) => {
  try {
    const { id } = req.params;
    const delta = Number(req.body?.delta);
    if (Number.isNaN(delta)) {
      return res.status(400).json({ success: false, message: "Thiếu hoặc sai 'delta'" });
    }

    const item = await InventoryItem.findById(id);
    if (!item) return res.status(404).json({ success: false, message: "Không tìm thấy vật tư" });

    const nextQty = (item.quantity || 0) + delta;
    item.quantity = nextQty < 0 ? 0 : nextQty; // không cho âm
    await item.save();

    return res.json({ success: true, message: "Cập nhật số lượng thành công", data: item });
  } catch (err) {
    res.status(500).json({ success: false, message: "Lỗi server", error: err.message });
  }
};
