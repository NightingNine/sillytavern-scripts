// 正式发布构建不额外弹出 Windows 控制台窗口。
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    auto_card_studio_lib::run()
}
