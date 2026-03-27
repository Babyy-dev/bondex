export type Lang = "en" | "ja";

export const translations = {
  en: {
    // Login
    login: {
      title: "BondEx Staff",
      facilityId: "Facility ID",
      facilityIdPlaceholder: "e.g. HOTEL-001",
      password: "Password",
      passwordPlaceholder: "Enter password",
      loginButton: "Log in",
      loggingIn: "Logging in...",
      invalidCredentials: "Invalid facility ID or password",
      networkError: "Network error. Please try again.",
    },
    // Order list
    orderList: {
      title: "Today's Orders",
      searchPlaceholder: "Search by booking ID or guest name...",
      all: "All",
      waitingArrival: "Waiting",
      readyPickup: "Ready",
      flagged: "Flagged",
      noOrders: "No orders for today",
      scanQr: "Scan QR",
      guestName: "Guest",
      status: "Status",
      items: "Items",
      date: "Date",
      statusPaid: "Waiting for arrival",
      statusCheckedIn: "Ready for pickup",
      statusFlagged: "Flagged",
      statusInTransit: "In transit",
      statusDelivered: "Delivered",
      statusCancelled: "Cancelled",
    },
    // Order detail
    orderDetail: {
      title: "Order Details",
      viewOnly: "View only. No editing.",
      guestName: "Guest name",
      size: "Size",
      items: "Items",
      checkIn: "Check-in date",
      deliveryDate: "Delivery date",
      trackingNumber: "Tracking number",
      carrier: "Carrier",
      reissueLabel: "Reissue label",
      reissueConfirm: "Reissue shipping label?",
      reissueConfirmYes: "Reissue",
      cancel: "Cancel",
      back: "Back",
    },
    // Check-in / QR scan
    checkIn: {
      title: "Check In",
      scanPrompt: "Scan order QR code",
      guestPhotos: "Guest photos (reference)",
      noGuestPhotos: "No photos provided by guest",
      hotelPhotos: "Luggage photos (official record)",
      hotelPhotosMax: "Max 3 photos",
      captureButton: "Capture luggage photo",
      flagButton: "Flag issue",
      photoTaken: "Photo captured",
      scanSuccess: "QR code scanned",
      guestName: "Guest",
      size: "Size",
      checkInDate: "Check-in date",
      alreadyCheckedIn: "Already checked in",
    },
    // Accept success
    acceptSuccess: {
      title: "Luggage Recorded",
      message: "Check-in complete",
      labelPrinting: "Printing label...",
      selfLabel: "Hand the sticker to the guest and have them apply it themselves.",
      backToList: "Back to list",
    },
    // Exception
    exception: {
      title: "Exception",
      damaged: "Damaged / unreadable QR code?",
      manualSearch: "Search by booking ID or guest name",
      searchPlaceholder: "e.g. BDX-001 or Smith John",
      searchButton: "Search",
      notFound: "No order found",
    },
    // Common
    common: {
      back: "Back",
      save: "Save",
      cancel: "Cancel",
      loading: "Loading...",
      error: "An error occurred",
      tryAgain: "Try again",
    },
  },
  ja: {
    // Login
    login: {
      title: "BondEx スタッフ",
      facilityId: "施設ID",
      facilityIdPlaceholder: "例: HOTEL-001",
      password: "パスワード",
      passwordPlaceholder: "パスワードを入力",
      loginButton: "ログイン",
      loggingIn: "ログイン中...",
      invalidCredentials: "施設IDまたはパスワードが正しくありません",
      networkError: "ネットワークエラーが発生しました。もう一度お試しください。",
    },
    // Order list
    orderList: {
      title: "本日の受付リスト",
      searchPlaceholder: "予約IDまたはゲスト名で検索...",
      all: "すべて",
      waitingArrival: "到着待ち",
      readyPickup: "集荷待ち",
      flagged: "要対応",
      noOrders: "本日のご予約はありません",
      scanQr: "QRスキャン",
      guestName: "ゲスト名",
      status: "ステータス",
      items: "荷物",
      date: "日付",
      statusPaid: "到着待ち",
      statusCheckedIn: "集荷待ち",
      statusFlagged: "要対応",
      statusInTransit: "配送中",
      statusDelivered: "配達完了",
      statusCancelled: "キャンセル",
    },
    // Order detail
    orderDetail: {
      title: "注文詳細",
      viewOnly: "閲覧のみ。編集不可。",
      guestName: "ゲスト名",
      size: "サイズ",
      items: "荷物数",
      checkIn: "チェックイン日",
      deliveryDate: "配達日",
      trackingNumber: "追跡番号",
      carrier: "配送会社",
      reissueLabel: "ラベル再発行",
      reissueConfirm: "配送ラベルを再発行しますか？",
      reissueConfirmYes: "再発行する",
      cancel: "キャンセル",
      back: "戻る",
    },
    // Check-in / QR scan
    checkIn: {
      title: "受付処理",
      scanPrompt: "注文のQRコードをスキャン",
      guestPhotos: "ゲスト写真（参考）",
      noGuestPhotos: "ゲストによる写真なし",
      hotelPhotos: "荷物写真（公式記録）",
      hotelPhotosMax: "最大3枚",
      captureButton: "荷物を撮影する",
      flagButton: "問題を報告",
      photoTaken: "写真を撮影しました",
      scanSuccess: "QRコードを読み取りました",
      guestName: "ゲスト名",
      size: "サイズ",
      checkInDate: "チェックイン日",
      alreadyCheckedIn: "受付済み",
    },
    // Accept success
    acceptSuccess: {
      title: "荷物を記録しました",
      message: "受付が完了しました",
      labelPrinting: "ラベル印刷中...",
      selfLabel: "シールをゲストに渡し、ご自身で貼付していただいてください。",
      backToList: "リストに戻る",
    },
    // Exception
    exception: {
      title: "例外処理",
      damaged: "QRコードが破損・読み取り不可の場合",
      manualSearch: "予約IDまたはゲスト名で検索",
      searchPlaceholder: "例: BDX-001 または 山田太郎",
      searchButton: "検索",
      notFound: "注文が見つかりません",
    },
    // Common
    common: {
      back: "戻る",
      save: "保存",
      cancel: "キャンセル",
      loading: "読み込み中...",
      error: "エラーが発生しました",
      tryAgain: "再試行",
    },
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
export type T = typeof translations.en;

export function t(lang: Lang, section: keyof T, key: string): string {
  return ((translations[lang] as T)[section] as Record<string, string>)[key] ?? key;
}
