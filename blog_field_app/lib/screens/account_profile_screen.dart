import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../services/worker_profile.dart";

class AccountProfileScreen extends StatefulWidget {
  const AccountProfileScreen({super.key});

  @override
  State<AccountProfileScreen> createState() => _AccountProfileScreenState();
}

class _AccountProfileScreenState extends State<AccountProfileScreen> {
  final _nickname = TextEditingController();
  final _birthDate = TextEditingController();
  final _bio = TextEditingController();
  final _phone = TextEditingController();
  String _gender = "";
  var _loading = true;
  var _saving = false;
  var _saved = false;
  String? _error;
  String? _loadError;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _nickname.dispose();
    _birthDate.dispose();
    _bio.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) {
      if (mounted) setState(() => _loading = false);
      return;
    }
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final profile = await loadWorkerProfile(Supabase.instance.client, user.id);
      if (!mounted) return;
      _nickname.text = profile.nickname ?? "";
      _birthDate.text = profile.birthDate ?? "";
      _gender = profile.gender ?? "";
      _bio.text = profile.bio ?? "";
      _phone.text = profile.contactPhone ?? "";
      setState(() => _loading = false);
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _loadError = "프로필을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.";
      });
    }
  }

  Future<void> _save() async {
    final user = Supabase.instance.client.auth.currentUser;
    if (user == null) return;
    setState(() {
      _saving = true;
      _error = null;
      _saved = false;
    });
    final err = await saveWorkerProfile(
      Supabase.instance.client,
      userId: user.id,
      nickname: _nickname.text,
      birthDate: _birthDate.text,
      gender: _gender,
      bio: _bio.text,
      contactPhone: _phone.text,
    );
    if (!mounted) return;
    setState(() {
      _saving = false;
      if (err != null) {
        _error = err;
      } else {
        _saved = true;
      }
    });
  }

  Future<void> _pickBirthDate() async {
    final now = DateTime.now();
    final initial = DateTime.tryParse(_birthDate.text) ?? DateTime(1990, 1, 1);
    final picked = await showDatePicker(
      context: context,
      initialDate: initial.isAfter(now) ? now : initial,
      firstDate: DateTime(1900),
      lastDate: now,
      locale: const Locale("ko", "KR"),
    );
    if (picked == null) return;
    final month = picked.month.toString().padLeft(2, "0");
    final day = picked.day.toString().padLeft(2, "0");
    setState(() {
      _saved = false;
      _birthDate.text = "${picked.year}-$month-$day";
    });
  }

  @override
  Widget build(BuildContext context) {
    final email = Supabase.instance.client.auth.currentUser?.email ?? "";

    return Scaffold(
      appBar: AppBar(title: const Text("계정")),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (email.isNotEmpty)
                  Text(email, style: const TextStyle(color: Color(0xFF71717A))),
                const SizedBox(height: 8),
                const Text(
                  "웹 마이페이지와 같은 계정 정보입니다.",
                  style: TextStyle(fontSize: 13, color: Color(0xFF71717A)),
                ),
                if (_loadError != null) ...[
                  const SizedBox(height: 8),
                  Text(_loadError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                  TextButton(onPressed: _load, child: const Text("다시 불러오기")),
                ],
                if (_saved) ...[
                  const SizedBox(height: 12),
                  _SavedBanner(message: "저장이 완료되었습니다."),
                ],
                const SizedBox(height: 12),
                const Text("별명", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                TextField(
                  controller: _nickname,
                  readOnly: true,
                  decoration: const InputDecoration(
                    filled: true,
                    fillColor: Color(0xFFF4F4F5),
                    border: OutlineInputBorder(),
                    hintText: "가입 시 설정한 별명",
                  ),
                ),
                const SizedBox(height: 4),
                const Text("별명은 가입 시 설정한 후 변경할 수 없습니다.", style: TextStyle(fontSize: 12, color: Color(0xFFA1A1AA))),
                const SizedBox(height: 14),
                const Text("생일 *", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                TextField(
                  controller: _birthDate,
                  readOnly: true,
                  onTap: _pickBirthDate,
                  decoration: const InputDecoration(
                    border: OutlineInputBorder(),
                    hintText: "1990-01-01",
                    suffixIcon: Icon(Icons.calendar_today_outlined, size: 18),
                  ),
                ),
                const SizedBox(height: 14),
                const Text("성별 *", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Row(
                  children: [
                    ChoiceChip(
                      label: const Text("남"),
                      selected: _gender == "M",
                      onSelected: (_) => setState(() {
                        _saved = false;
                        _gender = "M";
                      }),
                    ),
                    const SizedBox(width: 8),
                    ChoiceChip(
                      label: const Text("여"),
                      selected: _gender == "F",
                      onSelected: (_) => setState(() {
                        _saved = false;
                        _gender = "F";
                      }),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                const Text("한줄 소개", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                TextField(
                  controller: _bio,
                  minLines: 2,
                  maxLines: 4,
                  onChanged: (_) => setState(() => _saved = false),
                  decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "간단한 소개"),
                ),
                const SizedBox(height: 14),
                const Text("연락처", style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                TextField(
                  controller: _phone,
                  keyboardType: TextInputType.phone,
                  onChanged: (value) {
                    final formatted = formatPhoneInput(value);
                    if (formatted != value) {
                      _phone.value = TextEditingValue(
                        text: formatted,
                        selection: TextSelection.collapsed(offset: formatted.length),
                      );
                    }
                    setState(() => _saved = false);
                  },
                  decoration: const InputDecoration(border: OutlineInputBorder(), hintText: "010-0000-0000"),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  child: Text(_saving ? "저장 중…" : "저장"),
                ),
              ],
            ),
    );
  }
}

class _SavedBanner extends StatelessWidget {
  const _SavedBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFFECFDF5),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFA7F3D0)),
      ),
      child: Text(message, style: const TextStyle(color: Color(0xFF065F46))),
    );
  }
}
