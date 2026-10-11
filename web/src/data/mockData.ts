import { PayOSTransaction, GarageApplicant, FloodPoint, DisputeCase, PayoutItem } from '../types';

export const INITIAL_PAYOS_TRANSACTIONS: PayOSTransaction[] = [
  {
    id: 'PAYOS-8947291',
    orderCode: '8947291',
    rescueCode: '#RESCUE-4921',
    rescueType: 'Hút nước bugi tại chỗ',
    customerName: 'Nguyễn Văn An',
    customerPhone: '0903.118.291',
    garageName: 'Gara An Phú (Q.8)',
    mechanicName: 'Lê Tuấn',
    totalAmount: 350000,
    platformFee: 43750,
    netPayout: 306250,
    checksumStatus: 'OK',
    status: 'RECONCILED',
    bankName: 'Vietcombank',
    accountNumber: '1012****99',
    accountHolder: 'NGUYEN VAN A',
    payosContent: 'RESCUE 4921 Q8',
    timestamp: '2023-11-04 15:32:10',
    evidenceImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDvkGaXJHjm6K8TRJ0sNnLw6mEx45C9k7p0Z7MeNQVvoh5_0wM2oA-t1r0HAP4mLvKtP89etCXZjRiL-jjq-7q6MWv1Hj6PC0Me7Tst-XWxs9h68NNK_8a9H6DLVsH29JVM9fsxnL3fR1-MHSVCHQSLchwbT8fColD-Ax2c5qMNKe32wsnJfW2rWD3x6aejMLO8zmVAbk7dZFw54lEP-hT_HSnxQ17vpD59RKDHmJIljHALe3-YFAnx',
    evidenceLocation: 'Tọa độ: 10.7381° N, 106.6631° E (Mễ Cốc, Q.8)',
    rawPayload: {
      code: '00',
      desc: 'success',
      data: {
        orderCode: 8947291,
        amount: 350000,
        description: 'RESCUE 4921 Q8',
        accountNumber: '1012****99',
        reference: 'FT232910384812',
        transactionDateTime: '2023-11-04 15:32:10',
        signature: 'a8f94d284bc7102e9a...3b9e71'
      }
    }
  },
  {
    id: 'PAYOS-8947292',
    orderCode: '8947292',
    rescueCode: '#RESCUE-4922',
    rescueType: 'Vận chuyển xe lội nước',
    customerName: 'Trần Thị Bích',
    customerPhone: '0918.420.771',
    garageName: 'Đội Cứu Hộ Bình Tân',
    mechanicName: 'Hoàng Sơn',
    totalAmount: 150000,
    platformFee: 18750,
    netPayout: 131250,
    checksumStatus: 'OK',
    status: 'PAID',
    bankName: 'MBBank',
    accountNumber: '0918****71',
    accountHolder: 'TRAN THI BICH',
    payosContent: 'RESCUE 4922 BT',
    timestamp: '2023-11-04 15:28:15',
    evidenceImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJkUyqj1CpxbaA2oxSTBSk9frWHR1S9qyf9BPzwFXbI5d0bp-9RzM2RTqIuEXsYBgRN6MDujzYHDBGTpAPBmnySk0ITnsS5kfsz9OzxUdXyrD0SPCLUKhkwxgag80sF5grcortsPyIwJUqhQRFj9p1bMxaJYSOCWTp1lzP2ciueNPG34k8dxg6dBq_pvWkrjBGmYSWE8iit2XCeuIsJbfiOBP4FLGuZcZ8GGAbBvr9NTc4NpmjsxsS',
    evidenceLocation: 'Tọa độ: 10.7511° N, 106.6023° E (Tên Lửa, Bình Tân)',
    rawPayload: {
      code: '00',
      desc: 'success',
      data: {
        orderCode: 8947292,
        amount: 150000,
        description: 'RESCUE 4922 BT',
        accountNumber: '0918****71',
        reference: 'FT232910384813',
        transactionDateTime: '2023-11-04 15:28:15',
        signature: 'f4b238dc8104...7798ab'
      }
    }
  },
  {
    id: 'PAYOS-8947293',
    orderCode: '8947293',
    rescueCode: '#RESCUE-4923',
    rescueType: 'Thay dầu nhớt & súc lốc máy',
    customerName: 'Đỗ Quốc Thắng',
    customerPhone: '0977.821.004',
    garageName: 'Gara Tân Hưng (Q.7)',
    mechanicName: 'Trương Hòa',
    totalAmount: 780000,
    platformFee: 97500,
    netPayout: 682500,
    checksumStatus: 'OK',
    status: 'RECONCILED',
    bankName: 'Techcombank',
    accountNumber: '1903****04',
    accountHolder: 'DO QUOC THANG',
    payosContent: 'RESCUE 4923 Q7',
    timestamp: '2023-11-04 15:20:05',
    evidenceImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8_kLWs7OnNcnuCQnvo3p-csyvFnBRI-U49OZpCtSB98Gj54huVaJz-H8Bz9q2tralTej9Sz58yKVn_JOJx11VJmRH5hBUh_vQkWaf893jhykzBC6y4UgWnONHkizTzlO1tRdfxFUEmzz8SSxnonDX-D75zoOQL7zVgKL49Ewc4XZLzTi-gjC_thlcHkh3Qw7ZH1WliCaOGtKktSmc7Ut2Kaj2XtUEnkBSZxpP0jsI-Fw5jomPxd6r',
    evidenceLocation: 'Tọa độ: 10.7429° N, 106.7029° E (Nguyễn Thị Thập, Q.7)',
    rawPayload: {
      code: '00',
      desc: 'success',
      data: {
        orderCode: 8947293,
        amount: 780000,
        description: 'RESCUE 4923 Q7',
        accountNumber: '1903****04',
        reference: 'FT232910384814',
        transactionDateTime: '2023-11-04 15:20:05',
        signature: 'c901e18...ba124d'
      }
    }
  },
  {
    id: 'PAYOS-8947294',
    orderCode: '8947294',
    rescueCode: '#RESCUE-4924',
    rescueType: 'Cứu hộ ghép (2 xe chết máy)',
    customerName: 'Võ Hoàng Khang',
    customerPhone: '0932.091.884',
    garageName: 'Gara Hưng Phú Xanh',
    mechanicName: 'Nguyễn Duy',
    totalAmount: 480000,
    platformFee: 60000,
    netPayout: 420000,
    checksumStatus: 'OK',
    status: 'RECONCILED',
    bankName: 'ACB',
    accountNumber: '2849****84',
    accountHolder: 'VO HOANG KHANG',
    payosContent: 'RESCUE 4924 HP',
    timestamp: '2023-11-04 15:15:42',
    evidenceImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAa0F93T5iVNGNu4tQ9ARbP9OOFjGJxKWWPiyrMz5tI069__iyz6MAtE6zgfOlxtzgApoCWsVidsmECG2l1qGVb56Ir5JRKIjvrnfZmzjCAE-OlPXz3zsGGW1kjYZrHifryB4UF-eG7wZdJFOkbv8dayyPkoXvHR5YbZdwB5HZXMCjE79yG4o_9Vmhvw6E5qPIErrqTH3HYfwj5hhBOAJKEcPbZQ7aBoXKKSg-uSgbVyG7_X6fUgQ6c',
    evidenceLocation: 'Tọa độ: 10.7588° N, 106.6711° E (Hưng Phú, Q.8)',
    rawPayload: {
      code: '00',
      desc: 'success',
      data: {
        orderCode: 8947294,
        amount: 480000,
        description: 'RESCUE 4924 HP',
        accountNumber: '2849****84',
        reference: 'FT232910384815',
        transactionDateTime: '2023-11-04 15:15:42',
        signature: '12d8a01...aa3409'
      }
    }
  },
  {
    id: 'PAYOS-8947295',
    orderCode: '8947295',
    rescueCode: '#RESCUE-4925',
    rescueType: 'Kéo xe ngập nước mặn Cần Giờ',
    customerName: 'Phạm Thị Lan',
    customerPhone: '0909.112.943',
    garageName: 'Cứu Hộ Hải Nam (Nhà Bè)',
    mechanicName: 'Vũ Mạnh',
    totalAmount: 620000,
    platformFee: 77500,
    netPayout: 542500,
    checksumStatus: 'REV',
    status: 'DISPUTED',
    bankName: 'VietinBank',
    accountNumber: '1088****43',
    accountHolder: 'PHAM THI LAN',
    payosContent: 'RESCUE 4925 CG',
    timestamp: '2023-11-04 15:10:11',
    evidenceImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAp4dE9XACebFNhokIWiZWuFqsnHxQys-3xZi-BoTgetviTfuz2zZqsX38Yx92hsK9dTFqDda9V74j3Jmbs8dSxH0SXkb7wtmAKpLnIAWkRPWWrk348rAu0ylHJHba9w_6Ri471lIkiHmVH4KCM0Y9VGSgY06RozKZEPwEDzCuj6qTtncGxcgagBudRzkFGaRc8ilPII33FR9XR77wzlWn4xWJSIX2-UymHUK3RLhjaKkEhCnT8yTWj',
    evidenceLocation: 'Tọa độ: 10.6512° N, 106.7580° E (Phà Bình Khánh)',
    rawPayload: {
      code: '00',
      desc: 'success',
      data: {
        orderCode: 8947295,
        amount: 620000,
        description: 'RESCUE 4925 CG',
        accountNumber: '1088****43',
        reference: 'FT232910384816',
        transactionDateTime: '2023-11-04 15:10:11',
        signature: 'ff34b...89c01'
      }
    }
  },
  {
    id: 'PAYOS-8947296',
    orderCode: '8947296',
    rescueCode: '#RESCUE-4926',
    rescueType: 'Xả bình xăng & khô cuộn điện',
    customerName: 'Lê Hoàng Long',
    customerPhone: '0982.551.490',
    garageName: 'Gara Thành Công (Thủ Đức)',
    mechanicName: 'Mai Vinh',
    totalAmount: 220000,
    platformFee: 27500,
    netPayout: 192500,
    checksumStatus: 'OK',
    status: 'RECONCILED',
    bankName: 'BIDV',
    accountNumber: '6501****90',
    accountHolder: 'LE HOANG LONG',
    payosContent: 'RESCUE 4926 TD',
    timestamp: '2023-11-04 15:02:50',
    evidenceImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAWM9Le3DFpJGryPyvhe1q4xl-nJEPjlF4svMZMhMLQcH5gLHLkoWVdNtj7E89ZK_-ZInzvBuNep0TWzg7S2RfwHOVMQKtCYTTilu_aHhGE1vk8iQihtDR92dN3zMQrrSS8Tp-txJJNDnZSBoWWvXeHfS2W149b-EaHICoBDsvq3-wHeHIn45XNrHr4bP85GF4VAtIJeWN7rv6wk9bWSX7tYNyxC7k3EDLL1nLjcFmGraAJDCoStXQX',
    evidenceLocation: 'Tọa độ: 10.8521° N, 106.7582° E (Võ Văn Ngân, Thủ Đức)',
    rawPayload: {
      code: '00',
      desc: 'success',
      data: {
        orderCode: 8947296,
        amount: 220000,
        description: 'RESCUE 4926 TD',
        accountNumber: '6501****90',
        reference: 'FT232910384817',
        transactionDateTime: '2023-11-04 15:02:50',
        signature: '883491...12ef09'
      }
    }
  }
];

export const INITIAL_GARAGE_APPLICANTS: GarageApplicant[] = [
  {
    id: 'GAR-2024-0891',
    name: 'Gara Sửa Xe 24/7 Sài Gòn Cứu Hộ',
    area: 'Chi nhánh Quận 8 & Vệ tinh Nam Sài Gòn',
    ownerName: 'Lê Hoàng Nam',
    phone: '0908 123 456',
    branchesCount: 3,
    mechanicsCount: 6,
    timeAgo: 'Nộp 15 phút trước',
    status: 'PENDING',
    badge: 'Ưu tiên khu vực ngập nặng',
    taxCode: '8392019482-001',
    idCardNumber: '079088019284',
    address: '142 Bến Bình Đông, P.14, Q.8',
    ekycMatchRate: 99.4,
    branches: [
      {
        name: 'CHI NHÁNH 1 (TRỤ SỞ)',
        address: '142 Bến Bình Đông, P.14, Quận 8',
        warning: 'Điểm đen ngập triều cường: 0.8m',
        coords: '10.7412° N, 106.6491° E',
        capacity: 25,
        activeMechanics: 2,
        mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAk7WCGEPWMui9CaBbsPVd05PdN0B2gCpc9SXyKJTHUoK3qUrKUcoVUmlytjB7wJ3b_Zwd3Rf0Dm-jW3Q-L5nd14LszaObp5ncAVvkQbBaBueNsrtvyym5iWHtaJvDzC10tvBfNwnBl4W214RDSUnL4P6SgO6h2PTROXTnb_IpWPbOYsGGxCiGRb4hw2DyXkAeV8bZgO0KW0RL7pi9YgBLw866UsJeC3_B3aOzcixy2_MqNhg_d-CJK'
      },
      {
        name: 'CHI NHÁNH 2 (ĐÔNG SÀI GÒN)',
        address: '78 Nguyễn Hữu Cảnh, Bình Thạnh',
        warning: 'Khu vực trũng ngập mưa lớn: 0.5m',
        coords: '10.7891° N, 106.7134° E',
        capacity: 18,
        activeMechanics: 2,
        mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAXSHHMy8Taqd74XkQdPz5Zfr_rWRgem2LXid-caCw_XFi_h61W98OXOKjeVFN8_o2SgPj9SzbWhLzJ7C_1C8ObDoqvew-DmCPfY3BZYJDp93ea9h58xJYA1oN4DidFJw37T-HIyD_JaVllgDNQci3ZNSgZb2mmSNUYlWCs4KQ8oqnZ0c-ABX2v_SGX34raL4MJKYtETIVqEzFX2tpWIQAe0l5P9cpCMfe3DFUMDjIKJJ7YaTqDo561'
      },
      {
        name: 'CHI NHÁNH 3 (NAM SÀI GÒN)',
        address: '45 Huỳnh Tấn Phát, Nhà Bè',
        warning: 'Vùng ngập sâu thủy triều: 0.7m',
        coords: '10.7104° N, 106.7380° E',
        capacity: 30,
        activeMechanics: 2,
        mapImage: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAp4dE9XACebFNhokIWiZWuFqsnHxQys-3xZi-BoTgetviTfuz2zZqsX38Yx92hsK9dTFqDda9V74j3Jmbs8dSxH0SXkb7wtmAKpLnIAWkRPWWrk348rAu0ylHJHba9w_6Ri471lIkiHmVH4KCM0Y9VGSgY06RozKZEPwEDzCuj6qTtncGxcgagBudRzkFGaRc8ilPII33FR9XR77wzlWn4xWJSIX2-UymHUK3RLhjaKkEhCnT8yTWj'
      }
    ],
    equipment: [
      {
        name: 'Xe Bán Tải Chở Xe Máy',
        specs: 'Tải trọng nâng 850kg • 01 Chiếc',
        plate: '51C-928.11',
        statusNote: 'Đạt tiêu chuẩn kéo xe',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_F9WLmCl-0AtkD0h-5vCX6fVYA5ZIjTvsuiwdaqd-lFGCKjrQqZvfOMPncJ425ansa9qm2gMABiPIhsa2VYsj8wdjrVu54nDFFX65pyV5ids33CPD3K7iRzEVa2ezgpoEmWaTtixUcSoaAhYCKpvf_A_DvnmcFdWI7bLBjbzmdA1SrG7dlplm5bbFyLmPCIozzIpiUjceShEbRgU7AnOrQ8obojHuvW15_NORN7LLj6aO6hds0rAj'
      },
      {
        name: 'Xe Ba Gác Kéo Chuyên Dụng',
        specs: 'Hẻm nhỏ ngập sâu • 02 Chiếc',
        plate: '59G1-0982',
        statusNote: 'Đạt chuẩn cơ động hẻm',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAa0F93T5iVNGNu4tQ9ARbP9OOFjGJxKWWPiyrMz5tI069__iyz6MAtE6zgfOlxtzgApoCWsVidsmECG2l1qGVb56Ir5JRKIjvrnfZmzjCAE-OlPXz3zsGGW1kjYZrHifryB4UF-eG7wZdJFOkbv8dayyPkoXvHR5YbZdwB5HZXMCjE79yG4o_9Vmhvw6E5qPIErrqTH3HYfwj5hhBOAJKEcPbZQ7aBoXKKSg-uSgbVyG7_X6fUgQ6c'
      },
      {
        name: 'Máy Xịt Rửa Phốt Nước',
        specs: 'Vệ sinh lốc máy cát bùn • 03 Bộ',
        plate: 'Karcher HD 5/11',
        statusNote: 'Áp lực 150 Bar',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDtXXBwHWiW9atSd8fjU-0lY3LLCgZPoEHPLaQJkG9cFaO1hrnXH5U9jcDfEvnxkHlZYnUTV2b0x1siDzZNMpTQ9Rt5wKeGB3v7rM-_3voRHz-9X4pY1ShgytFF6t2ItW5u04JUDBtI8zWKUEM-0l2mWHY9ocn3OVHYyveT92eEZ_CP3lxLRdONHKHODji1HhoIFpiyL_m9nN2ui4WG8LBB3g9EU1oIStLB6cisCbnuuCfr1Lx7CPVB'
      },
      {
        name: 'Máy Hút Nhớt Thủy Kích',
        specs: 'Bình gom nước buồng đốt • 04 Bộ',
        plate: 'Vaccum Ext-90',
        statusNote: 'Chống cong tay dên',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAznzg-rsUDBlxFF9-yFzzEBlwBOYlxS6jennZpPnBAh5dx0PoOA-HQrs11n6SY7tTZFguEY6AjMIbPrudPIkTlW5zc6xLGMLmYVwZxuLPGy7wANjI9ISRqzv2lcHGcXo1jjM35ljuzlk53wUTqq-O_WkI1VsDsH0llraFZBT9RaRr4Eq-eb6_3PIvctCGB6JGXhCvWh4NiqhYtaB9EMpQHMcLmzntsNSIsT8Az-vclmCoxpLDTlaOZ'
      }
    ]
  },
  {
    id: 'GAR-2024-0890',
    name: 'Trung Tâm Cứu Hộ Xe Máy An Phát',
    area: 'Trụ sở Thủ Đức - Kha Vạn Cân',
    ownerName: 'Nguyễn Văn Bình',
    phone: '0912 884 991',
    branchesCount: 2,
    mechanicsCount: 4,
    timeAgo: 'Nộp 42 phút trước',
    status: 'PENDING',
    badge: 'Điểm ngập L2',
    taxCode: '8392019483-002',
    idCardNumber: '079088019333',
    address: 'Kha Vạn Cân, TP. Thủ Đức',
    ekycMatchRate: 98.7,
    branches: [],
    equipment: []
  },
  {
    id: 'GAR-2024-0888',
    name: 'Tiệm Sửa Xe Chuyên Nghiệp Tân Định',
    area: 'Trần Quang Khải, Quận 1',
    ownerName: 'Trần Anh Dũng',
    phone: '0938 776 220',
    branchesCount: 1,
    mechanicsCount: 3,
    timeAgo: 'Nộp 2 giờ trước',
    status: 'PENDING',
    badge: 'Nội Đô',
    taxCode: '8392019480-001',
    idCardNumber: '079088019555',
    address: 'Trần Quang Khải, Q.1',
    ekycMatchRate: 99.1,
    branches: [],
    equipment: []
  },
  {
    id: 'GAR-2024-0885',
    name: 'Gara Cơ Khí & Sửa Chữa Minh Long',
    area: 'Tân Hòa Đông, Bình Tân',
    ownerName: 'Lý Minh Long',
    phone: '0903 881 229',
    branchesCount: 2,
    mechanicsCount: 5,
    timeAgo: 'Nộp 3 giờ trước',
    status: 'PENDING',
    taxCode: '8392019477-001',
    idCardNumber: '079088019777',
    address: 'Tân Hòa Đông, Bình Tân',
    ekycMatchRate: 97.9,
    branches: [],
    equipment: []
  }
];

export const INITIAL_FLOOD_POINTS: FloodPoint[] = [
  {
    id: 'FL-402',
    name: 'Bến Bình Đông',
    district: 'Quận 8',
    address: 'Giao lộ Cầu Chà Và, Phường 13, Quận 8, TP.HCM',
    waterLevel: 'NGẬP LÚT YÊN XE (> 60CM)',
    depthCm: 68,
    level: 3,
    severity: 'RED',
    reportsCount: 9,
    confidenceScore: 96,
    coords: { lat: 10.7482, lng: 106.6547 },
    photos: [
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAvVp5FDoPzjT_9DhWzwUJuEV0AXaoIkRom8tIK0cIZHX55rtG77Q7ao_yu6OVnmLLd8MZ_j4J-Jn1AHA0mzO2d45lF6uwwwHYv9BcKPLoWnw_vXZn-eI8nnHM6ard6Mq0U3_MDiCaq_9A9lz_mOLs1YwiOTTMeDZIYAjKUuLRmu8cruDOM9QDBKvn9EHTT0L7Lj6rKbhYqkQYuejqFQqYWEMI-E9MKbwXBpsd4VPmCip-OjMFc_561',
        time: '4 phút trước',
        caption: 'Nước dâng lút yên xe đoạn cầu Chà Và'
      },
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBXhUpx39_gZbfjmrSws2fZoZsisTRQ2_gKhkZPxkJ8Y_HXpb5Cmt7awsODLH0BaQjKT0TWCH5PiICjeAan1RIIblQY_gxnMvysmHW_LeF1VPc1f0xZsyIIWS-EEYKir_EAKetzwME5PC9XIbGbz1GjYTsp7gU9Pv5tTqZyj_pd9ZEugPjY69sVWiCUJebTpp-zq8_zE6F7p4FrZg6WWRuXhZ3Y7D1AS4eFUT0oVzaTeNMYgenQMZCO',
        time: '8 phút trước',
        caption: 'Hàng chục xe chết máy đẩy bộ'
      },
      {
        url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJfhTX3vBcHHXAzK7vlS2-6rdSV-g6VRE5zeIJmkTAgySh1s-LP_-TA4du44Rgez2hD7pPmVwXWwTLQaYsGiPluAMhXQ63Zobdc8sl7eG_xCyQPuIzPMx35QpkVC-SRQj2nyT4nB9OCNX6IRJiKSDeoeSxmj9v9DaigL5Kz7A06aKWqJ8QWTNEwodhKd33D4-GwW8nEOngCWj4jTNKkerCVhYk2W7jNnG2bbplkr5_sQEmt9XulD47',
        time: '12 phút trước',
        caption: 'Kỹ thuật viên đang hỗ trợ đẩy xe'
      }
    ],
    recentReports: [
      {
        author: 'Nguyễn Văn An (Tài xế Grab)',
        role: 'Tài xế',
        text: 'Xe Wave chết máy ngay dốc cầu Chà Và, nước dâng lên qua lốc máy nửa bánh rồi, đừng ai đi vào!',
        time: '4 phút trước'
      },
      {
        author: 'Trần Thu Hà (Cư dân P.13)',
        role: 'Cư dân',
        text: 'Nước ngập lút bô xe cả đoạn 200 mét Bến Bình Đông, nhiều xe tay ga bị cuốn trôi ngã đổ, cần xe kéo cứu hộ gấp!',
        time: '8 phút trước'
      },
      {
        author: 'Lê Hoàng Quân',
        role: 'Người đi đường',
        text: 'Nước từ kênh Tàu Hủ tràn ngược vào đường, dâng rất nhanh theo triều cường rằm tháng 8.',
        time: '14 phút trước'
      }
    ]
  },
  {
    id: 'FL-398',
    name: 'Nguyễn Hữu Cảnh',
    district: 'Bình Thạnh',
    address: 'Đoạn chân cầu vượt Nguyễn Hữu Cảnh, P.22, Bình Thạnh',
    waterLevel: 'NGẬP NỬA BÁNH (30 - 50CM)',
    depthCm: 48,
    level: 2,
    severity: 'ORANGE',
    reportsCount: 15,
    confidenceScore: 92,
    coords: { lat: 10.7891, lng: 106.7134 },
    photos: [],
    recentReports: []
  },
  {
    id: 'FL-391',
    name: 'Kha Vạn Cân',
    district: 'Thủ Đức',
    address: 'Giao lộ Kha Vạn Cân - Phạm Văn Đồng, Linh Đông, Thủ Đức',
    waterLevel: 'NGẬP NỬA BÁNH (25 - 40CM)',
    depthCm: 35,
    level: 1,
    severity: 'YELLOW',
    reportsCount: 6,
    confidenceScore: 88,
    coords: { lat: 10.8521, lng: 106.7582 },
    photos: [],
    recentReports: []
  }
];

export const INITIAL_DISPUTES: DisputeCase[] = [
  {
    id: 'DISP-9021',
    rescueCode: '#RC-98419',
    payosCode: 'POS-8831085',
    customerName: 'Lê Thị Mai Thảo',
    customerPhone: '0908 123 456',
    garageName: 'TT Cứu Hộ Nam Sài Gòn',
    garageId: 'GAR-088',
    time: '28/10 14:28 (42p trước)',
    type: 'L3 • THU VƯỢT KHUNG',
    originalPrice: 340000,
    requestedRefund: 150000,
    inspectorNote: 'Kỹ thuật viên Vũ Minh (ID: 88 - Gara Nam Sài Gòn) tự ý viết hóa đơn tay thu thêm 150.000 ₫ với 2 phụ phí ngoài danh mục niêm yết mà không có sự đồng ý trước của khách qua ứng dụng. Vi phạm nghiêm trọng Quy chế Vận hành Cứu hộ Ngập nước Điều 4.2 (Chống tiêu cực hiện trường).',
    evidenceReceiptUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuACihKrDMKX83Ir9orec02g9MN6J6MAvtmaatHawTqArAsY73X77zvDSZhEgEoSO2-8G9l1iwD5O9KN3XUU1AcWpTZsiOzmSuegbh8LhwjT6n5mGyKozfoXHa1AVEweSlEhTyq9TTHGIlQHIiBs-3IFy1B61ej_4TWhjr89ukjAbA-SEYJGOSkuOoAj9jlOAMg8VjVRbZMMwuiy4ZwM9sWhnJeyXxHbSGM4fOBq4D9Aa95CZ-Hj4stT',
    evidenceAppScreenUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJI8kvNensEcXFs7ABZgM5rnNT3fpZDgfwiDd52AezUpAAUa9Z1tb_f3ERkdY0Z_E5aq9OqmMkDSbeSHbhqQ6y983YFihLK9-VlSBM0YdxHlEfy3mARq6ZV1cNwg8lqRwPuw5-tAPTM4_ru4C-kLM1jxFsCcPqO6gMg2Re7OrvADB0bBrijnojyEZKLxdmByxVNIy90uEDTzqpX7XvapvFUjNfnrKAisXxDrh2M3K5Jp5FmvTzUPp6',
    audioDuration: '03:42',
    diffItems: [
      {
        name: 'Xả nhớt xe máy ngập nước',
        desc: 'Nhớt Castrol Power1 10W-40 (0.8L)',
        priceV1: 120000,
        priceV2: 120000,
        diff: 0
      },
      {
        name: 'Tháo sấy bugi & kiểm tra đánh lửa',
        desc: 'Đo thông mạch chụp bugi chống nước',
        priceV1: 40000,
        priceV2: 40000,
        diff: 0
      },
      {
        name: 'Sấy cụm rắc cắm điện & lọc gió',
        desc: 'Khí nén bình gas mini + xịt RP7 chống ẩm',
        priceV1: 30000,
        priceV2: 30000,
        diff: 0
      },
      {
        name: 'Súc bình xăng con đặc biệt (Tự ý thêm)',
        desc: 'Mã vi phạm: #FEE-09 Không có trong thỏa thuận cứu hộ nhanh',
        priceV1: null,
        priceV2: 100000,
        diff: 100000,
        violationCode: '#FEE-09'
      },
      {
        name: 'Công ép nổ máy phụ trội ngập sâu (Tự ý thêm)',
        desc: 'Mã vi phạm: #SUR-12 Ép giá khách do điểm ngập sâu 40cm',
        priceV1: null,
        priceV2: 50000,
        diff: 50000,
        violationCode: '#SUR-12'
      }
    ],
    status: 'STAFF_REVIEW'
  },
  {
    id: 'DISP-9018',
    rescueCode: '#RC-98392',
    payosCode: 'POS-8829911',
    customerName: 'Nguyễn Tuấn Hưng',
    customerPhone: '0913 882 119',
    garageName: 'Gara Minh Phát Q. Bình Thạnh',
    garageId: 'GAR-042',
    time: '28/10 13:10',
    type: 'L2 • HỦY GIỮA CHỪNG',
    originalPrice: 340000,
    requestedRefund: 340000,
    inspectorNote: 'KTV nhận kéo xe được 1km thì yêu cầu khách trả thêm tiền công do đường ngập sâu, sau đó tự bỏ về.',
    evidenceReceiptUrl: '',
    evidenceAppScreenUrl: '',
    audioDuration: '01:50',
    diffItems: [],
    status: 'ADMIN_APPROVAL'
  },
  {
    id: 'DISP-9015',
    rescueCode: '#RC-98270',
    payosCode: 'POS-8827552',
    customerName: 'Trần Hoàng Bảo Yến',
    customerPhone: '0977 444 892',
    garageName: 'Đội Cứu Hộ Cơ Động Q8',
    garageId: 'GAR-081',
    time: '28/10 11:45',
    type: 'L1 • THIỆT HẠI TÀI SẢN',
    originalPrice: 200000,
    requestedRefund: 200000,
    inspectorNote: 'Trầy xước bửng dàn áo xe SH 160i khi thợ chằng dây dù vào thùng xe ba gác, yêu cầu bồi hoàn công sơn.',
    evidenceReceiptUrl: '',
    evidenceAppScreenUrl: '',
    audioDuration: '02:15',
    diffItems: [],
    status: 'ADMIN_APPROVAL'
  }
];

export const INITIAL_PAYOUTS: PayoutItem[] = [
  {
    id: 'PO-2024-8891',
    garageName: 'Gara Khang Điền Q.Bình Thạnh',
    repName: 'Đỗ Văn Tuấn',
    time: '14:28 • Hôm nay',
    bankCode: 'MB',
    bankName: 'Ngân hàng Quân Đội (MBBank)',
    bankAccount: '0918420771',
    accountHolder: 'ĐỖ VĂN TUẤN',
    requestedAmount: 15000000,
    walletBalance: 58200000,
    holdbackAmount: 5000000,
    availableBalance: 53200000,
    riskStatus: 'SAFE',
    ekycVerified: true,
    status: 'PENDING'
  },
  {
    id: 'PO-2024-8890',
    garageName: 'Gara Sài Gòn Cứu Hộ 247',
    repName: 'Nguyễn Hoàng Hải',
    time: '14:15 • Hôm nay',
    bankCode: 'VCB',
    bankName: 'Vietcombank',
    bankAccount: '1029482991',
    accountHolder: 'NGUYEN HOANG HAI',
    requestedAmount: 8500000,
    walletBalance: 27400000,
    holdbackAmount: 5000000,
    availableBalance: 22400000,
    riskStatus: 'SAFE',
    ekycVerified: true,
    status: 'PENDING'
  },
  {
    id: 'PO-2024-8889',
    garageName: 'Cơ Sở Sửa Xe Thành Lợi',
    repName: 'Trần Văn Lợi',
    time: '13:50 • Hôm nay',
    bankCode: 'TCB',
    bankName: 'Techcombank',
    bankAccount: '1903488201',
    accountHolder: 'TRAN THI HOA',
    requestedAmount: 6200000,
    walletBalance: 11800000,
    holdbackAmount: 5000000,
    availableBalance: 6800000,
    riskStatus: 'DISPUTED',
    ekycVerified: false,
    status: 'PENDING'
  },
  {
    id: 'PO-2024-8888',
    garageName: 'Gara Moto An Phú Q2',
    repName: 'Phạm Minh Quân',
    time: '13:12 • Hôm nay',
    bankCode: 'ACB',
    bankName: 'ACB - Á Châu',
    bankAccount: '28491029',
    accountHolder: 'PHAM MINH QUAN',
    requestedAmount: 4100000,
    walletBalance: 23900000,
    holdbackAmount: 5000000,
    availableBalance: 18900000,
    riskStatus: 'SAFE',
    ekycVerified: true,
    status: 'PENDING'
  },
  {
    id: 'PO-2024-8887',
    garageName: 'Đội Cứu Hộ Thủy Triều Q7',
    repName: 'Lê Văn Trọng',
    time: '12:40 • Hôm nay',
    bankCode: 'BIDV',
    bankName: 'BIDV',
    bankAccount: '6501000349182',
    accountHolder: 'LE VAN TRONG',
    requestedAmount: 3500000,
    walletBalance: 14200000,
    holdbackAmount: 5000000,
    availableBalance: 9200000,
    riskStatus: 'SAFE',
    ekycVerified: true,
    status: 'PENDING'
  },
  {
    id: 'PO-2024-8886',
    garageName: 'Gara Hiệp Phát Tân Bình',
    repName: 'Vũ Đức Hiệp',
    time: '11:20 • Hôm nay',
    bankCode: 'MB',
    bankName: 'MBBank',
    bankAccount: '0389182390',
    accountHolder: 'VU DUC HIEP',
    requestedAmount: 3000000,
    walletBalance: 16500000,
    holdbackAmount: 5000000,
    availableBalance: 11500000,
    riskStatus: 'SAFE',
    ekycVerified: true,
    status: 'PENDING'
  },
  {
    id: 'PO-2024-8885',
    garageName: 'Trạm Cứu Hộ Xe Máy Gò Vấp',
    repName: 'Bùi Quốc Cường',
    time: '10:05 • Hôm nay',
    bankCode: 'VCB',
    bankName: 'Vietcombank',
    bankAccount: '0071001928371',
    accountHolder: 'BUI QUOC CUONG',
    requestedAmount: 2500000,
    walletBalance: 12150000,
    holdbackAmount: 5000000,
    availableBalance: 7150000,
    riskStatus: 'SAFE',
    ekycVerified: true,
    status: 'PENDING'
  }
];
