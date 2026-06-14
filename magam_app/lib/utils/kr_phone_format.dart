class KrPhoneFormat {
  static String digitsOnly(String phone) => phone.replaceAll(RegExp(r'\D'), '');

  /// 표시용 010-XXXX-XXXX
  static String display(String phone) {
    final digits = digitsOnly(phone);
    final d = digits.length > 11 ? digits.substring(0, 11) : digits;
    if (d.length <= 3) return d;
    if (d.length <= 7) return '${d.substring(0, 3)}-${d.substring(3)}';
    if (d.length <= 10) {
      return '${d.substring(0, 3)}-${d.substring(3, 6)}-${d.substring(6)}';
    }
    return '${d.substring(0, 3)}-${d.substring(3, 7)}-${d.substring(7)}';
  }

  /// 입력 중 포맷 (최대 11자리)
  static String formatInput(String value) {
    return display(value);
  }

  /// 저장용 (숫자만)
  static String normalize(String phone) => digitsOnly(phone);
}
