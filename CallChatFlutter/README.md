# CallChat Flutter

Ứng dụng mobile Flutter sử dụng trực tiếp REST API và Socket.IO `/presence` của `BackEnd_CallChat`.

## Chạy ứng dụng

Backend local trên Android emulator được nhận tự động tại `http://10.0.2.2:3000`. iOS simulator dùng `http://localhost:3000`.

Với backend đã deploy hoặc điện thoại thật:

```bash
flutter run --dart-define=API_URL=https://api.example.com
```

Build Android release:

```bash
flutter build apk --release --dart-define=API_URL=https://api.example.com
```

Không thêm dấu `/` cuối URL. Backend cần cho phép origin của app và hỗ trợ WebSocket. Cuộc gọi dùng WebRTC với STUN công cộng; production nên cấu hình thêm TURN server để hoạt động ổn định qua NAT/mạng di động.

## Chức năng

- Đăng nhập, đăng ký, khôi phục phiên bằng secure storage
- Danh sách hội thoại, chat Socket.IO, typing/read events, upload tệp
- Tìm người dùng, gửi/nhận lời mời kết bạn
- Lịch sử cuộc gọi và WebRTC audio/video
- Hồ sơ và đăng xuất
