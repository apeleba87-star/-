import "package:flutter/material.dart";
import "package:supabase_flutter/supabase_flutter.dart";

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  var _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await Supabase.instance.client.auth.signInWithPassword(
        email: _email.text.trim(),
        password: _password.text,
      );
    } on AuthException catch (e) {
      setState(() => _error = e.message);
    } catch (e) {
      setState(() => _error = "로그인하지 못했습니다.");
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("로그인")),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Text("클린아이덱스에 쓰는 이메일과 비밀번호입니다."),
          const SizedBox(height: 16),
          TextField(
            controller: _email,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(labelText: "이메일", border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _password,
            obscureText: true,
            decoration: const InputDecoration(labelText: "비밀번호", border: OutlineInputBorder()),
          ),
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
          ],
          const SizedBox(height: 16),
          FilledButton(
            onPressed: _busy ? null : _submit,
            child: Text(_busy ? "들어가는 중…" : "로그인"),
          ),
        ],
      ),
    );
  }
}
